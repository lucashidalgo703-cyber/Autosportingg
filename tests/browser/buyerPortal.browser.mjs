// Start LOCAL_BUYER_PORTAL_FIXTURES=true npm run dev:mobile-preview first.
// Every sale, email, document and account in this check is a disposable fixture.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/inventario-portal');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const contexts = [];
let lastPage;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
async function newPage(viewport) {
    const context = await browser.newContext({ viewport }); contexts.push(context);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage(); lastPage = page;
    page.on('pageerror', error => console.error('Browser error:', error.message));
    return page;
}
const goto = (page, url) => page.goto(url.startsWith('http') ? url : base + url, { waitUntil: 'domcontentloaded', timeout: 180000 });
async function mailCode(page, recipient) {
    const messages = await (await page.request.get(base + '/__test-mail.json')).json();
    const latest = messages.filter(message => message.to === recipient).at(-1);
    assert.ok(latest, 'expected a message in the fake local mailbox');
    return page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], latest.html);
}
async function buyerLogin(page, url, email, installWorker = false) {
    await goto(page, url);
    if (installWorker) {
        await page.evaluate(async () => {
            const old = await caches.open('autosporting-offline-shell-v2');
            await old.put('/api/buyer-portal/old/session', new Response('{}'));
            await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            await navigator.serviceWorker.ready;
            if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
        });
        assert.equal(await page.evaluate(async () => (await caches.keys()).includes('autosporting-offline-shell-v2')), false, 'activation must discard the old broad cache');
    }
    await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
    await page.getByLabel('Código de 6 dígitos', { exact: true }).waitFor();
    await page.getByLabel('Código de 6 dígitos', { exact: true }).fill(await mailCode(page, email));
    await page.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    await page.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
}
function responseFor(page, predicate) {
    const pending = page.waitForResponse(predicate);
    pending.catch(() => {});
    return pending;
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    assert.ok(fixture.buyerPortal, 'requires the buyer portal fixture flag');
    const { withTradeIn, withoutTradeIn, tradeInId, buyerOneEmail, buyerTwoEmail } = fixture.buyerPortal;
    const admin = await newPage({ width: 1440, height: 1050 });
    // The opt-in loopback runner seeds a normal, already verified CRM session.
    // Reuse it for browser retries without weakening the real email login quotas.
    const seededToken = fixture.buyerPortal.adminSessionToken;
    assert.equal(typeof seededToken, 'string', 'requires the latest opt-in loopback fixture runner');
    await admin.addInitScript(({ session, userId }) => { localStorage.setItem('token', session); localStorage.setItem(`autosporting_tour_seen_${userId}`, 'true'); }, { session: seededToken, userId: fixture.users[0].id });
    await goto(admin, '/admin/ventas/' + withTradeIn);
    const auth = await admin.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + seededToken } });
    assert.equal(auth.status(), 200);
    const token = seededToken;
    console.log('ok - administrador ficticio verificado');
    const api = async (method, route, body) => {
        const response = await admin.request.fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token }, ...(body ? { data: body } : {}) });
        assert.ok(response.ok(), `${response.status()} ${await response.text()}`);
        return response.json();
    };
    await admin.getByRole('tab', { name: /Portal del cliente/ }).click();
    await admin.getByLabel('Con toma', { exact: true }).waitFor();
    assert.equal(await admin.getByLabel('Con toma', { exact: true }).isChecked(), true);
    const enabled = responseFor(admin, response => response.url().endsWith('/buyer-portal/sales/' + withTradeIn) && response.request().method() === 'PUT');
    await admin.getByRole('button', { name: /^(Habilitar enlace privado|Actualizar acceso)$/ }).click();
    assert.equal((await enabled).status(), 200);
    await admin.getByRole('button', { name: 'Ver como cliente', exact: true }).click();
    const preview = admin.getByRole('dialog', { name: 'Vista previa del portal del cliente' });
    await preview.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    assert.equal(await preview.locator('[data-upload-requirement]').count(), 6);
    for (const control of await preview.getByRole('button', { name: /^(Sacar foto|Galería o PDF)$/ }).all()) assert.equal(await control.isDisabled(), true);
    await admin.screenshot({ path: path.join(output, 'portal-vista-previa.png') });
    await preview.getByRole('button', { name: 'Cerrar vista previa del portal', exact: true }).click();
    const withConfig = await api('GET', '/api/admin/buyer-portal/sales/' + withTradeIn);
    assert.ok(new URL(withConfig.url, base).origin === base, 'invitation must point only at the local fixture server');
    const buyer = await newPage({ width: 390, height: 844 });
    await buyerLogin(buyer, withConfig.url, buyerOneEmail, true);
    console.log('ok - comprador con toma verificado y worker privado activo');
    assert.equal(await buyer.locator('meta[name=robots]').getAttribute('content').then(value => value.includes('noindex')), true);
    assert.equal(await buyer.locator('script[src*="/_vercel/insights"]').count(), 0);
    assert.equal(await buyer.getByText(/NOTA.*INTERNA PRIVADA/).count(), 0);
    await buyer.getByText('Presentado', { exact: true }).waitFor();
    await buyer.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    assert.equal(await buyer.locator('[data-upload-requirement]').count(), 6);
    for (const key of ['title', 'domain_report', 'traffic_report', 'police_check', 'registration_cards', 'municipal_clearance']) {
        const requirementForm = buyer.locator(`[data-upload-requirement="${key}"]`);
        assert.equal(await requirementForm.getByRole('button', { name: 'Sacar foto', exact: true }).isEnabled(), true);
        assert.equal(await requirementForm.getByRole('button', { name: 'Galería o PDF', exact: true }).isEnabled(), true);
        assert.equal(await requirementForm.getByLabel('Foto con la cámara', { exact: true }).getAttribute('capture'), 'environment');
        assert.match(await requirementForm.getByLabel('Elegir foto o PDF', { exact: true }).getAttribute('accept'), /application\/pdf/);
    }
    await buyer.screenshot({ path: path.join(output, 'portal-carga-por-requisito.png'), fullPage: true });
    async function upload(requirementKey, description, number, side) {
        const form = buyer.locator(`[data-upload-requirement="${requirementKey}"]`);
        await form.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles({ name: 'documento-ficticio.png', mimeType: 'image/png', buffer: png });
        if (requirementKey === 'registration_cards') { await form.getByLabel('Número de cédula', { exact: true }).fill(String(number)); await form.getByLabel('Lado', { exact: true }).selectOption(side); }
        else { await form.getByLabel('Número de página o PDF', { exact: true }).fill(String(number)); await form.getByLabel('Fecha de emisión', { exact: true }).fill(new Date().toISOString().slice(0, 10)); }
        await form.getByLabel('Descripción de esta foto o PDF', { exact: true }).fill(description);
        const saved = responseFor(buyer, response => response.url().endsWith('/documents') && response.request().method() === 'POST');
        await form.getByRole('button', { name: 'Guardar este archivo', exact: true }).click();
        assert.ok([200, 201].includes((await saved).status()));
        await form.getByRole('status').filter({ hasText: 'Carga guardada:' }).waitFor();
    }
    await upload('registration_cards', 'Cédula 1 · Frente', 1, 'front');
    await upload('registration_cards', 'Cédula 1 · Dorso', 1, 'back');
    await upload('police_check', 'Formulario 12 · Página 1', 1);
    await upload('police_check', 'Formulario 12 · Página 2', 2);
    console.log('ok - cuatro fotos individuales guardadas');
    assert.equal(await buyer.locator('[data-document-entry]').count(), 4);
    await buyer.waitForFunction(() => {
        const images = [...document.querySelectorAll('[data-document-entry][data-document-current="true"] img')];
        return images.length === 4 && images.every(image => image.complete && image.naturalWidth > 0);
    });
    await buyer.getByText('2 de 6 requisitos con copia digital completa', { exact: true }).waitFor();
    assert.equal(await buyer.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
    await buyer.reload({ waitUntil: 'domcontentloaded' });
    await buyer.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    assert.equal(await buyer.locator('[data-document-entry]').count(), 4);
    await buyer.screenshot({ path: path.join(output, 'portal-cuatro-imagenes.png'), fullPage: true });

    await admin.getByRole('tab', { name: /^Operación/ }).click();
    const legajo = admin.locator('details').filter({ has: admin.getByText('Documentación entregada por el cliente', { exact: true }) }).first();
    await legajo.locator('summary').click();
    await legajo.locator('[data-admin-document]').first().waitFor();
    assert.equal(await legajo.locator('[data-admin-document]').count(), 4);
    await admin.waitForFunction(() => {
        const images = [...document.querySelectorAll('[data-admin-document][data-document-current="true"] img')];
        return images.length === 4 && images.every(image => image.complete && image.naturalWidth > 0);
    });
    assert.equal(await legajo.locator('[data-admin-requirement="registration_cards"] [data-admin-document]').count(), 2);
    assert.equal(await legajo.locator('[data-admin-requirement="police_check"] [data-admin-document]').count(), 2);
    const front = legajo.locator('[data-admin-document]').filter({ has: admin.getByRole('heading', { name: 'Cédula 1 · Frente', exact: true }) });
    await front.getByRole('button', { name: 'Pedir corrección de esta imagen', exact: true }).click();
    await front.getByLabel('Motivo para corregir Cédula 1 · Frente', { exact: true }).fill('La esquina superior está cortada; repetí solo el frente.');
    await front.getByRole('button', { name: 'Guardar pedido de corrección', exact: true }).click();
    await front.getByText('Corrección solicitada', { exact: true }).waitFor();
    assert.equal(await legajo.getByText('Corrección solicitada', { exact: true }).count(), 1);
    assert.equal(await legajo.locator('[data-admin-document]').count(), 4);
    await admin.screenshot({ path: path.join(output, 'legajo-correccion-individual.png'), fullPage: true });
    const frontId = await front.getAttribute('data-admin-document');
    await buyer.reload({ waitUntil: 'domcontentloaded' });
    await buyer.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).waitFor();
    const replacementForm = buyer.locator('[data-upload-requirement="registration_cards"]');
    await replacementForm.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles({ name: 'frente-corregido.png', mimeType: 'image/png', buffer: png });
    await replacementForm.getByLabel('Nueva foto o reemplazo', { exact: true }).selectOption(frontId);
    await replacementForm.getByLabel('Descripción de esta foto o PDF', { exact: true }).fill('Cédula 1 · Frente corregido');
    const replaced = responseFor(buyer, response => response.url().endsWith('/documents') && response.request().method() === 'POST');
    await replacementForm.getByRole('button', { name: 'Guardar este archivo', exact: true }).click();
    assert.ok([200, 201].includes((await replaced).status()));
    await replacementForm.getByRole('status').filter({ hasText: 'Carga guardada:' }).waitFor();
    assert.equal(await buyer.locator('[data-document-entry][data-document-current="true"]').count(), 4);
    assert.equal(await buyer.locator('[data-document-entry][data-document-current="false"]').count(), 1);
    const beforeStock = await api('GET', '/api/admin/sales/' + withTradeIn);
    assert.equal(Boolean(beforeStock.tradeIns[0].linkedStockCarId), false, 'document uploads cannot enter stock');
    const entered = await api('POST', '/api/admin/sales/' + withTradeIn + '/trade-ins/0/create-stock-car', {});
    const afterStock = await api('GET', '/api/admin/sales/' + withTradeIn);
    const carId = String(afterStock.tradeIns[0].linkedStockCarId?._id || afterStock.tradeIns[0].linkedStockCarId || entered._id || entered.car?._id);
    assert.match(carId, /^[a-f0-9]{24}$/);
    assert.notEqual((await api('GET', '/api/admin/cars/' + carId)).status, 'Disponible', 'document reception must not decide operational availability');
    const afterDocs = await api('GET', '/api/admin/buyer-portal/documents?carId=' + carId);
    assert.equal(afterDocs.groups.flatMap(group => group.entries).filter(entry => entry.isCurrent !== false).length, 4);
    await goto(admin, '/admin/stock/' + carId);
    const stockLegajo = admin.locator('details').filter({ has: admin.getByText('Documentación entregada por el cliente', { exact: true }) }).first();
    await stockLegajo.locator('summary').click();
    await stockLegajo.locator('[data-admin-document]').first().waitFor();
    assert.equal(await stockLegajo.locator('[data-admin-document][data-document-current="true"]').count(), 4);
    assert.equal(await stockLegajo.locator('[data-admin-document][data-document-current="false"]').count(), 1);

    const withoutConfig = await api('PUT', '/api/admin/buyer-portal/sales/' + withoutTradeIn, { mode: 'without_trade_in', days: 30 });
    const withoutCurrent = withoutConfig.url ? withoutConfig : await api('GET', '/api/admin/buyer-portal/sales/' + withoutTradeIn);
    const buyerTwo = await newPage({ width: 390, height: 844 });
    await buyerLogin(buyerTwo, withoutCurrent.url, buyerTwoEmail);
    assert.equal(await buyerTwo.getByRole('heading', { name: 'El vehículo que entrego', exact: true }).count(), 0);
    assert.equal(await buyerTwo.getByRole('button', { name: 'Guardar este archivo', exact: true }).count(), 0);
    assert.equal(await buyerTwo.locator('[data-document-entry]').count(), 0);
    assert.equal(await buyerTwo.getByText('PT001AA', { exact: true }).count(), 0);
    await buyerTwo.screenshot({ path: path.join(output, 'portal-sin-toma.png'), fullPage: true });
    assert.equal(await buyer.evaluate(async () => {
        let privateEntries = 0;
        for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) {
            if (/^\/portal(?:\/|$)|^\/api\/(?:admin\/)?buyer-portal(?:\/|$)/.test(new URL(request.url).pathname)) privateEntries++;
        }
        return privateEntries;
    }), 0, 'neither private invitations, sessions nor signed documents may enter CacheStorage');
    const privateImage = await buyer.locator('[data-document-entry][data-document-current="true"] img').first().getAttribute('src');
    await buyer.context().setOffline(true);
    assert.equal(await buyer.evaluate(async url => { try { await fetch(url, { cache: 'no-store' }); return 'cached'; } catch { return 'blocked'; } }, privateImage), 'blocked', 'offline must not bypass document expiration or revocation');
    await buyer.context().setOffline(false);
    console.log('Portal comprador móvil OK: verificación por correo, vista previa idéntica, cuatro imágenes en dos requisitos, corrección individual, legajo conservado al pasar a Stock y comprador sin toma aislado.');
} catch (error) {
    // Avoid writing the private invitation URL to output.
    console.error('Portal browser failed:', error.message);
    if (lastPage) await lastPage.screenshot({ path: path.join(output, 'portal-failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally { await Promise.all(contexts.map(context => context.close())); await browser.close(); }
