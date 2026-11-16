// Disposable local buyers, documents and mailbox only. Never uses production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/portal-ajustes-cliente');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const contexts = [];
let lastPage;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
function fixturePdf() {
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>', '<< /Length 0 >>\nstream\n\nendstream'];
    let source = '%PDF-1.4\n'; const offsets = [];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(source);
    source += 'xref\n0 5\n0000000000 65535 f \n' + offsets.map(value => String(value).padStart(10, '0') + ' 00000 n \n').join('')
        + `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(source);
}
const pdf = fixturePdf();
async function newPage(viewport = { width: 390, height: 844 }) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' }); contexts.push(context);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage(); lastPage = page;
    return page;
}
const open = (page, route) => page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
const pendingResponse = (page, suffix, method) => {
    const promise = page.waitForResponse(response => response.url().endsWith(suffix) && response.request().method() === method);
    promise.catch(() => {}); return promise;
};
async function centeredLogo(page) {
    const logo = page.getByRole('img', { name: 'AutoSporting', exact: true });
    await logo.waitFor();
    const box = await logo.boundingBox();
    assert.ok(box);
    assert.ok(Math.abs(box.x + box.width / 2 - page.viewportSize().width / 2) <= 2, 'the agency logo must be centered on the mobile viewport');
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    const portal = fixture.buyerPortal;
    assert.ok(portal?.adminSessionToken, 'requires the isolated portal fixture runner');
    const enabled = await fetch(base + '/api/admin/buyer-portal/sales/' + portal.withTradeIn, { method: 'PUT',
        headers: { Authorization: 'Bearer ' + portal.adminSessionToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 30 }) });
    assert.equal(enabled.status, 200);
    const configuration = await enabled.json();
    const buyer = await newPage();
    await open(buyer, configuration.url);
    await buyer.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    await centeredLogo(buyer);
    assert.equal(await buyer.getByRole('heading', { level: 1 }).evaluate(node => getComputedStyle(node).textTransform), 'uppercase');
    const send = async () => {
        const response = pendingResponse(buyer, '/challenge', 'POST');
        await buyer.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
        return response;
    };
    let sent = await send();
    if (sent.status() === 429) { assert.match((await sent.json()).message, /60 segundos/); await buyer.waitForTimeout(60000); sent = await send(); }
    assert.equal(sent.status(), 200);
    await buyer.getByLabel('Código de 6 dígitos', { exact: true }).waitFor();
    const mailbox = await (await fetch(base + '/__test-mail.json')).json();
    const message = mailbox.filter(item => item.to === portal.buyerOneEmail).at(-1);
    assert.ok(message);
    const code = await buyer.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], message.html);
    await buyer.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    await buyer.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    await buyer.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    for (const width of [320, 390]) {
        await buyer.setViewportSize({ width, height: 844 });
        await centeredLogo(buyer);
        const photo = buyer.locator('[data-portal-vehicle-photo] img');
        await photo.waitFor();
        assert.equal(await photo.evaluate(node => getComputedStyle(node).objectFit), 'contain');
        await buyer.waitForFunction(() => [...document.querySelectorAll('[data-portal-vehicle-photo] img')].some(img => img.complete && img.naturalWidth > 0));
        assert.equal(await buyer.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
        assert.equal(await buyer.locator('[data-buyer-portal-view] h1').evaluate(node => getComputedStyle(node).textTransform), 'uppercase');
        assert.equal(await buyer.locator('[data-requirement="title"] h4').evaluate(node => getComputedStyle(node).textTransform), 'uppercase');
        assert.equal(await buyer.getByRole('heading', { name: 'CAT o título del automotor', exact: true }).count(), 1);
        const visibleText = await buyer.locator('body').innerText();
        assert.equal((visibleText.match(/CAT O TÍTULO DEL AUTOMOTOR/gi) || []).length, 1, 'the document title appears once, without repeated instructions/captions');
        assert.doesNotMatch(visibleText, /registramos cuándo|ubicación aproximada|tipo de navegador|Acceso guardado en este navegador|datos se conservan|información se conserva/i);
        await buyer.screenshot({ path: path.join(output, `01-portal-${width}px.png`) });
    }
    console.log('ok - logo centrado, foto completa, mayúsculas y sin información interna en 320/390 px');
    const uploaded = [];
    async function upload(key, buffer, name, mimeType) {
        const form = buyer.locator(`[data-upload-requirement="${key}"]`);
        await form.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles({ name, mimeType, buffer });
        await form.getByLabel('Número de página o PDF', { exact: true }).fill('99');
        assert.equal(await form.getByLabel('Descripción de esta foto o PDF', { exact: true }).count(), 0);
        assert.equal(await buyer.locator('input[type="date"]').count(), 0);
        const response = pendingResponse(buyer, '/documents', 'POST');
        await form.getByRole('button', { name: 'Guardar este archivo', exact: true }).click();
        const saved = await response; assert.ok([200, 201].includes(saved.status()));
        const body = await saved.json();
        assert.ok(body.entry.description, 'internal file labels remain automatically generated');
        assert.equal(Boolean(body.entry.issuedAt), false);
        uploaded.push(body.entry);
        await form.getByRole('status').filter({ hasText: 'Carga guardada:' }).waitFor();
    }
    await upload('title', png, 'titulo-ficticio.png', 'image/png');
    await upload('domain_report', pdf, 'dominio-ficticio.pdf', 'application/pdf');
    assert.equal((await buyer.locator('body').innerText()).match(/CAT O TÍTULO DEL AUTOMOTOR/gi).length, 1);
    console.log('ok - foto y PDF guardados sin descripción manual ni fecha de emisión');

    const admin = await newPage();
    await admin.addInitScript(({ token, userId }) => {
        localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + userId, 'true');
    }, { token: portal.adminSessionToken, userId: fixture.users[0].id });
    await open(admin, '/admin/gestoria');
    const documentsButton = admin.getByRole('button', { name: 'Ver documentación del cliente', exact: true }).first();
    await documentsButton.waitFor({ timeout: 60000 }); await documentsButton.click();
    const viewer = admin.locator('[data-gestoria-buyer-documents]');
    await viewer.waitFor();
    for (const entry of uploaded) await viewer.locator(`[data-admin-document="${entry.id}"]`).waitFor();
    const documentImage = viewer.locator(`[data-admin-document="${uploaded[0].id}"] img`);
    const documentPdf = viewer.locator(`[data-admin-document="${uploaded[1].id}"] iframe`);
    await documentImage.waitFor(); await documentPdf.waitFor();
    assert.equal((await admin.request.get(new URL(await documentImage.getAttribute('src'), base).href)).status(), 200);
    const pdfResponse = await admin.request.get(new URL(await documentPdf.getAttribute('src'), base).href);
    assert.equal(pdfResponse.status(), 200); assert.deepEqual(await pdfResponse.body(), pdf);
    await viewer.screenshot({ path: path.join(output, '02-documentacion-en-gestoria.png') });
    const unsigned = await buyer.request.get(base + '/api/buyer-portal/files/' + uploaded[0].id);
    assert.equal(unsigned.status(), 401);
    console.log('ok - fotos y PDF privados visibles directamente desde Gestoría');
    // Close the document overlay, then verify the contextual expediente return.
    const closeViewer = admin.getByRole('button', { name: 'Cerrar documentación del cliente', exact: true });
    if (await closeViewer.count()) await closeViewer.click();
    const expediente = admin.getByRole('link', { name: 'Ir al Expediente', exact: true }).first();
    assert.equal(new URL(await expediente.getAttribute('href'), base).searchParams.get('returnTo'), '/admin/gestoria');
    await expediente.click();
    await admin.waitForURL(url => url.pathname === '/admin/ventas/' + portal.withTradeIn, { timeout: 60000 });
    const back = admin.getByRole('link', { name: 'Volver a Gestoría', exact: true });
    await back.waitFor(); assert.equal(await back.getAttribute('href'), '/admin/gestoria');
    await back.click();
    await admin.waitForURL(url => url.pathname === '/admin/gestoria');
    await admin.getByRole('link', { name: 'Ir al Expediente', exact: true }).first().click();
    await admin.waitForURL(url => url.pathname === '/admin/ventas/' + portal.withTradeIn);
    const linkedVehicle = admin.locator('a[href^="/admin/stock/"][href*="returnTo"]').first();
    await linkedVehicle.waitFor();
    assert.equal(new URL(await linkedVehicle.getAttribute('href'), base).searchParams.get('returnTo'), '/admin/gestoria');
    await linkedVehicle.click();
    await admin.waitForURL(url => url.pathname.startsWith('/admin/stock/'));
    const stockBack = admin.getByRole('link', { name: 'Volver a Gestoría', exact: true }).first();
    await stockBack.waitFor(); assert.equal(await stockBack.getAttribute('href'), '/admin/gestoria');
    await stockBack.click();
    await admin.waitForURL(url => url.pathname === '/admin/gestoria');
    console.log('ok - la flecha del expediente vuelve a Gestoría');
    const report = { passed: true, viewports: [320, 390], logoCentered: true, vehiclePhotoUncropped: true,
        uppercasePresentation: true, repeatedTitleRemoved: true, noManualDescriptionOrDate: true,
        imageAndPdfUploadsWithoutExtraFields: true, noInternalDataFooter: true,
        gestoriaShowsBuyerFiles: true, signedFileAccessProtected: true, expedienteReturnsToGestoria: true, linkedStockReturnsToGestoria: true,
        productionAccess: false };
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(report, null, 2));
    console.log('PASS: ajustes móviles y documentación privada accesible desde Gestoría.');
} catch (error) {
    if (lastPage) await lastPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally { await Promise.all(contexts.map(context => context.close().catch(() => {}))); await browser.close(); }
