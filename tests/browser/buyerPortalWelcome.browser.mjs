// start-review-preview.js only: real disposable Client/Sale/Car data and fake mailbox.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/portal-bienvenida');
fs.mkdirSync(output, { recursive: true });
const reuseSessions = process.env.WELCOME_REUSE_SESSIONS === '1';
const reuseVariants = new Set((process.env.WELCOME_REUSE_VARIANTS || '').split(',').filter(Boolean));
const reuseFor = item => reuseSessions || reuseVariants.has(item.variant);
const photosOnly = process.env.WELCOME_PHOTOS_ONLY === '1';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const brandingHashes = new Set(['hero-autosporting.jpg', 'agencia-autosporting.jpg', 'agencia-autosporting.png', 'autosporting-hero.jpg',
    'autosporting-hero-v2.jpg', 'logo-header-final-user.png', 'autosporting-logo-white.png'].map(file => path.join('public', file))
    .filter(file => fs.existsSync(file)).map(file => sha256(fs.readFileSync(file))));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const contexts = [], cases = [], errors = [];
let lastPage, adminToken, changedClient;
function localUrl(value) { const url = new URL(value, base); assert.equal(url.origin, base); return url.href; }
async function adminRequest(method, endpoint, body) {
    const response = await fetch(localUrl(endpoint), { method, headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(response.status, 200, `${method} ${endpoint} must succeed in the disposable CRM`); return response.json();
}
function responseFor(page, suffix, method) {
    const pending = page.waitForResponse(response => response.url().endsWith(suffix) && response.request().method() === method);
    pending.catch(() => {}); return pending;
}
async function sessionData(item) {
    const response = await item.page.request.get(localUrl(item.api + '/session'));
    assert.equal(response.status(), 200); return response.json();
}
async function login(item) {
    const stateFile = path.join(output, `sesion-${item.variant}-exclusivamente-ficticia.json`);
    const reuse = reuseFor(item);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce',
        ...(reuse ? { storageState: stateFile } : {}) });
    contexts.push(context); context.setDefaultTimeout(30000);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage(); item.page = page; item.context = context; item.challengeCount = 0; lastPage = page;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === item.api + '/challenge') item.challengeCount++; });
    await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    if (!reuse) {
        const challenge = responseFor(page, '/challenge', 'POST');
        await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
        assert.equal((await challenge).status(), 200, 'start with a fresh disposable preview; never bypass code quotas');
        const mailbox = await (await page.request.get(base + '/__test-mail.json')).json();
        const mail = mailbox.filter(message => message.to === item.email && /Código para tu portal/.test(message.subject)).at(-1); assert.ok(mail);
        const code = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], mail.html);
        await page.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
        await page.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    }
    await page.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    await context.storageState({ path: stateFile });
    // Hide the development indicator in presentation captures only.
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
}
const welcomeCopy = vehicle => `Gracias por elegir AutoSporting. Acá podés seguir la compra de tu ${[vehicle.brand, vehicle.model].filter(Boolean).join(' ')} y ver cuál es el próximo paso para la entrega.`;
async function assertPurchasedPhoto(item, data) {
    const sale = await adminRequest('GET', '/api/admin/sales/' + item.saleId);
    const carId = typeof sale.vehicleId === 'object' ? sale.vehicleId?._id : sale.vehicleId;
    assert.ok(carId, 'the photo must be bound through Sale.vehicleId');
    const car = await adminRequest('GET', '/api/admin/cars/' + carId);
    assert.equal(String(car._id), String(carId));
    assert.equal(data.purchasedVehicle.brand, car.brand); assert.equal(data.purchasedVehicle.model, car.name);
    assert.equal(car.coverImage, item.expectedPhoto); assert.equal(data.purchasedVehicle.image, item.expectedPhoto);
    assert.equal(/hero|agencia|logo/i.test(data.purchasedVehicle.image), false, 'agency branding cannot stand in for a vehicle photo');
    const image = item.page.locator('[data-portal-vehicle-photo] img');
    assert.equal(await image.getAttribute('src'), item.expectedPhoto);
    const response = await item.page.request.get(localUrl(item.expectedPhoto));
    assert.equal(response.status(), 200); assert.match(response.headers()['content-type'], /^image\/jpeg/);
    const bytes = await response.body(), bytesHash = sha256(bytes);
    assert.ok(bytes.length > 4096, 'the fixture must contain a real photograph rather than a tiny placeholder');
    assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8');
    assert.equal(brandingHashes.has(bytesHash), false, 'the fixture bytes cannot be any known agency hero or logo asset');
    const rendered = await image.evaluate(async image => {
        await image.decode();
        const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
        const response = await fetch(image.currentSrc, { cache: 'no-store' }), bytes = await response.arrayBuffer();
        const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
        const renderedPixels = await hash(context.getImageData(0, 0, canvas.width, canvas.height).data);
        // Use the same HTMLImage decoder/color pipeline as the actual portal.
        const source = URL.createObjectURL(new Blob([bytes], { type: response.headers.get('content-type') }));
        const decoded = new Image(); decoded.src = source;
        try {
            await decoded.decode();
            if (decoded.naturalWidth !== canvas.width || decoded.naturalHeight !== canvas.height) throw new Error('Decoded photo dimensions do not match rendered image.');
            context.clearRect(0, 0, canvas.width, canvas.height); context.drawImage(decoded, 0, 0);
        } finally { URL.revokeObjectURL(source); }
        return { path: new URL(image.currentSrc).pathname, width: image.naturalWidth, height: image.naturalHeight,
            bytesHash: await hash(bytes), renderedPixels, fetchedPixels: await hash(context.getImageData(0, 0, canvas.width, canvas.height).data) };
    });
    assert.equal(rendered.path, item.expectedPhoto); assert.equal(rendered.bytesHash, bytesHash);
    assert.equal(rendered.renderedPixels, rendered.fetchedPixels, 'the pixels rendered in the portal must decode from the expected vehicle photograph');
    assert.ok(rendered.width >= 300 && rendered.height >= 200);
    item.photoEvidence = { carId: String(carId), image: item.expectedPhoto, byteLength: bytes.length, ...rendered };
}
async function assertWelcome(item, expectedFirstName) {
    const data = await sessionData(item), intro = item.page.locator('[data-portal-intro]');
    assert.equal(data.buyerFirstName, expectedFirstName, 'the authenticated DTO must use Client.firstName including compound names');
    await intro.getByRole('heading', { name: `¡Hola, ${expectedFirstName}!`, exact: true }).waitFor();
    const copy = intro.getByText(welcomeCopy(data.purchasedVehicle), { exact: true }); await copy.waitFor();
    const text = await intro.innerText();
    assert.equal(text.includes(item.lastName), false, 'the welcome must use firstName instead of the full client name');
    assert.equal(text.includes(String(data.purchasedVehicle.year)), false, 'the welcome vehicle label must omit year');
    for (const tradeIn of data.tradeIns || []) assert.equal(text.includes([tradeIn.brand, tradeIn.model].filter(Boolean).join(' ')), false, 'the welcome must refer to the purchased vehicle');
    assert.equal(await intro.getByRole('heading').evaluate(node => getComputedStyle(node).textTransform), 'none');
    assert.equal(await copy.evaluate(node => getComputedStyle(node).textTransform), 'none');
    const photo = item.page.locator('[data-portal-vehicle-photo] img');
    await photo.waitFor(); await photo.evaluate(image => image.decode());
    assert.equal(await photo.evaluate(image => getComputedStyle(image).objectFit), 'contain');
    await assertPurchasedPhoto(item, data);
    assert.equal(await item.page.getByText('Estado de la operación', { exact: true }).count(), 1);
    assert.equal(await item.page.getByText('Estado del trámite', { exact: true }).count(), 1);
    assert.ok(await item.page.locator('[data-procedure-timeline]').count() > 0);
    assert.equal(await item.page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).count(), 0);
    item.data = data;
    return data;
}
async function capture(item, viewport, suffix = '') {
    const page = item.page; lastPage = page;
    await page.setViewportSize(viewport);
    await page.evaluate(() => { location.hash && history.replaceState(null, '', location.pathname + location.search); scrollTo(0, 0); });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'welcome must fit small screens without horizontal overflow');
    const intro = page.locator('[data-portal-intro]'), logo = intro.locator('img[alt="AutoSporting"]');
    await logo.evaluate(image => image.decode());
    const introBox = await intro.boundingBox(), logoBox = await logo.boundingBox();
    assert.ok(Math.abs(logoBox.x + logoBox.width / 2 - introBox.x - introBox.width / 2) < 2, 'the agency logo stays centered');
    await page.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-${item.variant}${suffix}.png`), animations: 'disabled' });
    await intro.screenshot({ path: path.join(output, `${viewport.width}x${viewport.height}-${item.variant}${suffix}-bienvenida.png`), animations: 'disabled' });
}
async function documentCta(item, label) {
    const control = item.page.locator('[data-portal-intro]').getByText(label, { exact: true });
    await control.waitFor(); assert.ok(await control.evaluate(node => ['A', 'BUTTON'].includes(node.tagName)));
    await control.click();
    await item.page.waitForFunction(() => {
        const target = document.getElementById('documentacion-vehiculo-entregado');
        const rect = target?.getBoundingClientRect(); return rect && rect.top >= -1 && rect.top < innerHeight;
    }, null, { timeout: 5000 });
    assert.equal(item.context.pages().length, 1);
}
async function uploadFixtureAndCheckCta(item) {
    const page = item.page, form = page.locator('[data-upload-requirement="title"]');
    const buffer = await page.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = 500; canvas.height = 300;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#eef2ff'; ctx.fillRect(0, 0, 500, 300);
        ctx.fillStyle = '#d52c24'; ctx.font = '26px Arial'; ctx.fillText('DOCUMENTO FICTICIO', 80, 160);
        return canvas.toDataURL('image/png').split(',')[1];
    });
    await form.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles({ name: 'documento-bienvenida-ficticio.png', mimeType: 'image/png', buffer: Buffer.from(buffer, 'base64') });
    const saved = responseFor(page, '/documents', 'POST');
    await form.getByRole('button', { name: 'Guardar este archivo', exact: true }).click();
    const response = await saved; assert.equal(response.status(), 200); const entry = (await response.json()).entry;
    await documentCta(item, 'Ver documentación cargada');
    await capture(item, { width: 390, height: 844 }, '-con-archivo');
    const row = page.locator(`[data-document-entry="${entry.id}"][data-document-current="true"]`);
    await row.getByRole('button', { name: 'Quitar archivo', exact: true }).click();
    const removed = responseFor(page, '/documents/' + entry.id, 'DELETE');
    await row.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
    assert.equal((await removed).status(), 200);
    await item.page.locator('[data-portal-intro]').getByText('Cargá la documentación del vehículo que entregás', { exact: true }).waitFor();
    return entry.id;
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json(), portal = fixture.buyerPortal;
    assert.ok(portal?.buyerOneId && portal?.buyerTwoId && portal?.buyerOneFirstName && portal?.buyerTwoFirstName);
    adminToken = portal.adminSessionToken;
    for (const item of [
        { variant: 'con-toma', saleId: portal.withTradeIn, clientId: portal.buyerOneId, email: portal.buyerOneEmail, firstName: portal.buyerOneFirstName, lastName: 'Pérez', expectedPhoto: '/__fixture-media/buyer-duster.jpg' },
        { variant: 'sin-toma', saleId: portal.withoutTradeIn, clientId: portal.buyerTwoId, email: portal.buyerTwoEmail, firstName: portal.buyerTwoFirstName, lastName: 'Gómez', expectedPhoto: '/__fixture-media/buyer-cronos.jpg' }
    ]) {
        assert.match(item.email, /@example\.test$/);
        const reuse = reuseFor(item);
        const config = await adminRequest(reuse ? 'GET' : 'PUT', '/api/admin/buyer-portal/sales/' + item.saleId, reuse ? undefined : { days: 30 });
        item.url = localUrl(config.url); item.api = '/api/buyer-portal/' + new URL(item.url).pathname.split('/').at(-1);
        cases.push(item); await login(item); await assertWelcome(item, item.firstName);
        if (item.variant === 'con-toma') {
            assert.equal(item.data.mode, 'with_trade_in');
            assert.equal(item.data.tradeIns.flatMap(vehicle => vehicle.groups).flatMap(group => group.entries).filter(entry => entry.isCurrent !== false).length, 0);
            await documentCta(item, 'Cargá la documentación del vehículo que entregás');
        } else {
            assert.equal(item.data.mode, 'without_trade_in');
            assert.equal(await item.page.locator('#documentacion-vehiculo-entregado').count(), 0);
            assert.equal(await item.page.locator('[data-upload-requirement]').count(), 0);
            assert.equal(await item.page.locator('[data-portal-intro]').getByText(/Cargá la documentación|Ver documentación cargada/).count(), 0);
        }
        for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }]) await capture(item, viewport);
        console.log(`ok - ${item.variant}: nombre compuesto de su ficha, vehículo comprado, logo/foto/estados y capturas390/320`);
    }
    assert.notEqual(cases[0].data.buyerFirstName, cases[1].data.buyerFirstName);
    assert.notEqual(welcomeCopy(cases[0].data.purchasedVehicle), welcomeCopy(cases[1].data.purchasedVehicle));
    assert.notEqual(cases[0].photoEvidence.carId, cases[1].photoEvidence.carId);
    assert.notEqual(cases[0].photoEvidence.bytesHash, cases[1].photoEvidence.bytesHash, 'different purchased vehicles need distinct actual photograph bytes');
    assert.notEqual(cases[0].photoEvidence.renderedPixels, cases[1].photoEvidence.renderedPixels, 'Duster and Cronos cannot render the same image under different URLs');
    if (photosOnly) {
        assert.equal(errors.length, 0, errors.join('; '));
        fs.writeFileSync(path.join(output, 'resultado-fotos.json'), JSON.stringify({ passed: true, realPurchasedCarBinding: true,
            expectedSourceAndBytesRendered: true, photographsAreDistinct: true, noHeroOrAgencyBranding: true,
            mobileViewports: ['390x844', '320x740'], noHorizontalOverflow: true, sessionJsonMocked: false,
            documentsUploadedOrRemoved: false, clientNamesChanged: false, productionAccess: false, realEmailsSent: false,
            changesPushed: false, photos: cases.map(item => ({ variant: item.variant, ...item.photoEvidence })) }, null, 2));
        console.log('PASS: Duster y Cronos reales, src/bytes/píxeles distintos según compra; capturas390/320 sin cambiar texto/diseño ni documentos/nombres.');
    } else {
    await uploadFixtureAndCheckCta(cases[0]);
    const item = cases[0], before = await adminRequest('GET', '/api/admin/clients/' + item.clientId);
    changedClient = { id: item.clientId, firstName: before.firstName, lastName: before.lastName, fullName: before.fullName };
    const updated = 'María Fernanda';
    await adminRequest('PATCH', '/api/admin/clients/' + item.clientId, { firstName: updated, lastName: before.lastName, fullName: `${updated} ${before.lastName}` });
    const challengeCount = item.challengeCount;
    await item.page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
    await assertWelcome(item, updated);
    assert.equal(item.challengeCount, challengeCount, 'editing firstName must not require a new verification code');
    assert.equal(localUrl((await adminRequest('GET', '/api/admin/buyer-portal/sales/' + item.saleId)).url), item.url, 'the original private link stays valid after the CRM correction');
    await item.page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await capture(item, { width: 390, height: 844 }, '-nombre-corregido');
    await assertWelcome(cases[1], cases[1].firstName);
    await adminRequest('PATCH', '/api/admin/clients/' + changedClient.id, { firstName: changedClient.firstName, lastName: changedClient.lastName, fullName: changedClient.fullName });
    changedClient = null;
    for (const buyer of cases) {
        const restored = await adminRequest('GET', '/api/admin/clients/' + buyer.clientId);
        assert.equal(restored.firstName, buyer.firstName, 'leave both disposable client records with their original names');
    }
    const finalData = await sessionData(cases[0]);
    assert.equal(finalData.tradeIns.flatMap(vehicle => vehicle.groups).flatMap(group => group.entries).filter(entry => entry.isCurrent !== false).length, 0, 'leave the main preview without uploaded documents');
    assert.equal(errors.length, 0, errors.join('; '));
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify({ passed: true, realClientSaleCarRelationship: true, realVerifiedBuyerSessions: true,
        compoundFirstNamesPreserved: true, distinctPurchasedVehicles: true, purchasedVehicleYearOmittedFromWelcome: true,
        noTradeInHasNoDocumentSectionOrCta: true, ctaFollowsCurrentDocuments: true, ctaScrollsWithoutNewTab: true,
        crmFirstNameEditUpdatesSameLinkOnReload: true, anotherBuyerUnaffected: true, correctionNeedsNoNewCode: true,
        originalClientNamesRestored: true, previewHasNoCurrentDocuments: true,
        mobileViewports: ['390x844', '320x740'], noHorizontalOverflow: true, sessionJsonMocked: false,
        productionAccess: false, realEmailsSent: false, employeesUsed: false, changesPushed: false }, null, 2));
    console.log('PASS: bienvenida real por cliente, dos compras distintas, CTA y corrección CRM sin regenerar enlace.');
    }
} catch (error) {
    console.error('FAIL:', error);
    if (lastPage) await lastPage.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
} finally {
    if (changedClient) await adminRequest('PATCH', '/api/admin/clients/' + changedClient.id, { firstName: changedClient.firstName, lastName: changedClient.lastName, fullName: changedClient.fullName }).catch(() => {});
    await browser.close();
}
