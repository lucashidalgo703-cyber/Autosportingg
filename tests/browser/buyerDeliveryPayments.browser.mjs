// Loopback-only disposable CRM: real UI/API/database, fake buyers and files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200', output = path.resolve('../../outputs/documentacion-pagos');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const errors = [], contexts = [], buyers = [];
let page, adminToken, adminUserId;
const responseFor = (p, suffix, method) => { const promise = p.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && r.request().method() === method); promise.catch(() => {}); return promise; };
async function api(method, url, body, expected = 200) {
    assert.ok(url.startsWith('/api'), 'local API only');
    const response = await fetch(base + url, { method, headers: { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json(); assert.equal(response.status, expected, JSON.stringify(data)); return data;
}
async function newContext(admin = false, storageState) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', ...(storageState ? { storageState } : {}) });
    contexts.push(context); context.setDefaultTimeout(45000);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    if (admin) await context.addInitScript(({ token, id }) => { localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true'); }, { token: adminToken, id: adminUserId });
    const p = await context.newPage(); p.on('pageerror', error => errors.push(error.message));
    return { context, page: p };
}
async function loginBuyer(item) {
    const config = await api('PUT', '/api/admin/buyer-portal/sales/' + item.saleId, { days: 30 });
    const stateFile = path.join(output, 'sesion-ficticia-' + item.saleId + '.json');
    Object.assign(item, await newContext(false, fs.existsSync(stateFile) ? stateFile : undefined)); item.url = new URL(config.url, base).href; item.api = '/api/buyer-portal/' + new URL(item.url).pathname.split('/').at(-1);
    item.challengeCount = 0;
    item.page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === item.api + '/challenge') item.challengeCount++; });
    await item.page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    const restored = await item.page.request.get(base + item.api + '/session');
    if (restored.status() !== 200) {
    const sent = responseFor(item.page, '/challenge', 'POST'); await item.page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
    assert.equal((await sent).status(), 200, 'fresh fixture login');
    const mail = (await (await fetch(base + '/__test-mail.json')).json()).filter(message => message.to === item.email && /Código para tu portal/.test(message.subject)).at(-1);
    assert.ok(mail);
    const code = await item.page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], mail.html);
    await item.page.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    await item.page.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    }
    await item.page.getByRole('heading', { name: 'Mis pagos', exact: true }).waitFor();
    await item.page.locator('[data-buyer-delivered-documents] [data-delivery-state]').waitFor();
    item.initialChallengeCount = item.challengeCount;
    await item.context.storageState({ path: stateFile });
    await item.page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
}
async function screenshot(p, locator, filename) {
    page = p;
    await p.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await p.evaluate(() => document.fonts.ready);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'no horizontal mobile overflow');
    await locator.scrollIntoViewIfNeeded();
    await locator.screenshot({ path: path.join(output, filename) });
}
async function publish(panel, id) {
    const card = panel.locator(`[data-delivery-document="${id}"]`);
    await card.getByRole('button', { name: 'Publicar en el portal del cliente', exact: true }).click();
    const confirmation = card.getByRole('group', { name: 'Confirmar destinatario de documentación' });
    assert.match(await confirmation.innerText(), /Comprador:[^\n]+\s+Vehículo:[^\n]+\s+Patente:/);
    await confirmation.getByRole('checkbox').check();
    const saved = responseFor(page, '/publish', 'POST');
    await confirmation.getByRole('button', { name: 'Publicar en el portal del cliente', exact: true }).click(); assert.equal((await saved).status(), 200);
    await card.getByText('Disponible para descargar', { exact: true }).waitFor(); return card;
}
async function uploadAgency(panel, file, type = 'title', description = '') {
    const form = panel.getByRole('form', { name: 'Cargar documentación para el comprador' });
    await form.getByRole('combobox').selectOption(type);
    if (description) await form.getByRole('textbox').fill(description);
    await form.getByLabel('Archivo de documentación para comprador', { exact: true }).setInputFiles(file);
    const sent = responseFor(page, '/delivery-documents', 'POST'); await form.getByRole('button', { name: 'Guardar en preparación', exact: true }).click();
    const response = await sent; assert.equal(response.status(), 200); const data = await response.json(); return data.entry.id;
}
async function refreshBuyer(item) {
    await item.page.getByRole('button', { name: 'Actualizar documentación de tu vehículo', exact: true }).click();
    await item.page.getByRole('button', { name: 'Actualizar mis pagos', exact: true }).click();
    await item.page.locator('[data-buyer-payments]').getByRole('button', { name: 'Enviar comprobante', exact: true }).waitFor();
}
async function payment(item, amount, concept, file, loseResponse = false) {
    const p = item.page, form = p.getByRole('form', { name: 'Enviar comprobante de pago' });
    await form.getByLabel('Importe', { exact: true }).fill(String(amount)); await form.getByLabel('Concepto', { exact: true }).fill(concept);
    await form.getByLabel('Elegir comprobante en foto o PDF', { exact: true }).setInputFiles(file);
    if (loseResponse) await p.route(base + item.api + '/payments', async route => { await route.fetch(); await route.abort('connectionreset'); }, { times: 1 });
    await form.getByRole('button', { name: 'Enviar comprobante', exact: true }).click();
    if (loseResponse) { await form.getByRole('button', { name: 'Reintentar envío', exact: true }).click(); }
    await form.getByText('Comprobante recibido · Pendiente de verificación', { exact: true }).waitFor();
    const data = await (await p.request.get(base + item.api + '/payments')).json(); return data.proofs.find(proof => proof.concept === concept);
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json(), portal = fixture.buyerPortal;
    assert.ok(portal?.adminSessionToken); adminToken = portal.adminSessionToken; adminUserId = fixture.users[0].id;
    for (const saleId of [portal.withTradeIn, portal.withoutTradeIn]) {
        const existing = await api('GET', '/api/admin/buyer-portal/sales/' + saleId + '/delivery-documents');
        for (const doc of existing.documents.filter(doc => doc.state === 'published')) await api('POST', '/api/admin/buyer-portal/delivery-documents/' + doc.id + '/withdraw', { revision: doc.revision });
    }
    const admin = await newContext(true); page = admin.page;
    // Generate fictional preview documents in the browser; no employee/customer files.
    await page.goto(base + '/login', { waitUntil: 'domcontentloaded', timeout: 180000 });
    const image = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 660; c.height = 420; const x = c.getContext('2d'); x.fillStyle = '#f5f5f5'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#d52228'; x.font = 'bold 30px Arial'; x.fillText('AUTOSPORTING · PRUEBA', 35, 70); x.fillStyle = '#222'; x.font = '24px Arial'; x.fillText('DOCUMENTO FICTICIO', 35, 140); x.fillText('SIN VALIDEZ', 35, 190); return c.toDataURL('image/png').split(',')[1]; }), 'base64');
    const imageFile = { name: 'documento-ficticio.png', mimeType: 'image/png', buffer: image };
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>', '<< /Length 0 >>\nstream\n\nendstream'];
    let source = '%PDF-1.4\n'; const offsets = [];
    objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = Buffer.byteLength(source);
    source += 'xref\n0 5\n0000000000 65535 f \n' + offsets.map(value => String(value).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const pdfFile = { name: 'constancia-ficticia.pdf', mimeType: 'application/pdf', buffer: Buffer.from(source) };
    for (const item of [{ variant: 'con-toma', saleId: portal.withTradeIn, email: portal.buyerOneEmail }, { variant: 'sin-toma', saleId: portal.withoutTradeIn, email: portal.buyerTwoEmail }]) { buyers.push(item); await loginBuyer(item); }
    const [a, b] = buyers;
    await page.goto(base + '/admin/gestoria', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByRole('button', { name: 'Documentación para el comprador', exact: true }).click();
    let panel = page.locator('[data-buyer-delivery-admin]');
    await panel.locator('[data-delivery-recipient]').waitFor();
    const docA = await uploadAgency(panel, imageFile); await publish(panel, docA);
    await refreshBuyer(a);
    const delivery = a.page.locator(`[data-delivered-document="${docA}"]`); await delivery.waitFor();
    const accessA = await (await a.page.request.post(base + a.api + '/delivery-documents/' + docA + '/access', { data: {}, headers: { Origin: base } })).json();
    const canonicalImage = Buffer.from(await (await fetch(base + accessA.url)).arrayBuffer());
    assert.equal(canonicalImage.subarray(0, 2).toString('hex'), 'ffd8', 'client prepares the image as JPEG');
    assert.equal((await b.page.request.post(base + b.api + '/delivery-documents/' + docA + '/access', { data: {}, headers: { Origin: base } })).status(), 404);
    await delivery.getByRole('button', { name: 'Ver documento', exact: true }).click();
    const viewer = a.page.getByRole('dialog', { name: 'Visor de documento', exact: true });
    await viewer.locator('[data-private-document-image]').evaluate(image => image.decode());
    assert.equal(a.context.pages().length, 1);
    await screenshot(a.page, viewer, 'visor-documento-movil.png');
    await viewer.getByRole('button', { name: 'Cerrar documento', exact: true }).click();
    const downloaded = a.page.waitForEvent('download'); await delivery.getByRole('button', { name: 'Descargar', exact: true }).click();
    const download = await downloaded; await download.saveAs(path.join(output, 'descarga-ficticia.jpg'));
    assert.deepEqual(fs.readFileSync(path.join(output, 'descarga-ficticia.jpg')), canonicalImage);
    // Replacement retires the previous document immediately; new version is draft.
    page = admin.page; panel = page.locator('[data-buyer-delivery-admin]');
    const chooser = page.waitForEvent('filechooser'); await panel.locator(`[data-delivery-document="${docA}"]`).getByRole('button', { name: 'Reemplazar archivo', exact: true }).click(); await (await chooser).setFiles(pdfFile);
    const replaced = responseFor(page, '/delivery-documents', 'POST'); await panel.getByRole('button', { name: 'Guardar en preparación', exact: true }).click();
    const replacementResponse = await replaced; assert.equal(replacementResponse.status(), 200); const docA2 = (await replacementResponse.json()).entry.id;
    assert.equal((await fetch(base + accessA.url)).status, 404);
    await refreshBuyer(a); await a.page.locator('[data-delivery-state="preparing"]').waitFor();
    await publish(panel, docA2);
    const accessA2 = await (await a.page.request.post(base + a.api + '/delivery-documents/' + docA2 + '/access', { data: {}, headers: { Origin: base } })).json();
    const withdrawn = responseFor(page, '/withdraw', 'POST'); await panel.locator(`[data-delivery-document="${docA2}"]`).getByRole('button', { name: 'Retirar del portal', exact: true }).click(); assert.equal((await withdrawn).status(), 200);
    assert.equal((await fetch(base + accessA2.url)).status, 404); await publish(panel, docA2);
    await page.getByRole('button', { name: 'Cerrar documentación para el comprador', exact: true }).click();
    await page.goto(base + '/admin/ventas/' + b.saleId, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByRole('tab', { name: /Documentación y entrega/ }).click(); panel = page.locator('[data-buyer-delivery-admin]'); await panel.locator('[data-delivery-recipient]').waitFor();
    const docB = await uploadAgency(panel, imageFile, 'other', 'Constancia ficticia para Juan Ignacio'); await publish(panel, docB);
    await screenshot(page, panel, 'crm-documentos-comprador-movil.png');
    const runId = crypto.randomUUID().slice(0, 8);
    const proofA = await payment(a, 250, 'Saldo de compra ficticio ' + runId, imageFile, true); assert.ok(proofA); a.proofId = proofA.id;
    const dataA = await (await a.page.request.get(base + a.api + '/payments')).json(); assert.equal(dataA.proofs.filter(proof => proof.concept === proofA.concept).length, 1, 'lost response retry stores one file');
    const proofB = await payment(b, 300, 'Pago ficticio para vincular ' + runId, pdfFile); assert.ok(proofB); b.proofId = proofB.id;
    const bTxsBefore = (await api('GET', '/api/admin/transactions?saleId=' + b.saleId)).length;
    await page.goto(base + '/admin/ventas/' + a.saleId, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.getByRole('tab', { name: /Cobros y cuotas/ }).click();
    let proofCard = page.locator(`[data-admin-payment-proof="${proofA.id}"]`); await proofCard.getByRole('button', { name: 'Confirmar acreditación', exact: true }).click();
    const paymentData = await api('GET', '/api/admin/buyer-portal/sales/' + a.saleId + '/payment-proofs'); const account = paymentData.accounts.find(item => item.currency === 'ARS'); assert.ok(account);
    await proofCard.getByLabel('Cuenta para acreditar el comprobante', { exact: true }).selectOption(account.id);
    await proofCard.getByRole('button', { name: 'Confirmar acreditación y registrar cobro', exact: true }).click(); await proofCard.getByText('Acreditado · Cobro registrado', { exact: true }).waitFor();
    await api('POST', '/api/admin/buyer-portal/payment-proofs/' + proofA.id + '/review', { action: 'confirm', accountId: account.id });
    const txs = await api('GET', '/api/admin/transactions?saleId=' + a.saleId); assert.equal(txs.filter(tx => tx.buyerPaymentProofId === proofA.id).length, 1);
    await screenshot(page, page.locator('[data-admin-payment-proofs]'), 'crm-revision-comprobantes-movil.png');
    await page.goto(base + '/admin/ventas/' + b.saleId, { waitUntil: 'domcontentloaded', timeout: 180000 }); await page.getByRole('tab', { name: /Cobros y cuotas/ }).click();
    proofCard = page.locator(`[data-admin-payment-proof="${proofB.id}"]`); await proofCard.getByRole('button', { name: 'Solicitar corrección', exact: true }).click();
    await proofCard.getByLabel('Corrección solicitada al cliente', { exact: true }).fill('Necesitamos ver el comprobante completo.');
    await proofCard.getByRole('button', { name: 'Enviar pedido de corrección', exact: true }).click(); await proofCard.getByText('Corrección solicitada', { exact: true }).waitFor();
    await refreshBuyer(b); await b.page.getByText('Necesitamos ver el comprobante completo.', { exact: true }).waitFor();
    const existing = await api('POST', '/api/admin/transactions', { type: 'ingreso', amount: 300, currency: 'ARS', category: 'Cobro venta', concept: 'Cobro existente ficticio', saleId: b.saleId, accountId: account.id, paymentDestination: 'purchase', idempotencyKey: crypto.randomUUID() }, 201);
    // Linking a proof requiring correction remains an explicit staff decision.
    await page.getByRole('button', { name: 'Actualizar comprobantes del cliente', exact: true }).click();
    await proofCard.getByRole('button', { name: 'Vincular a cobro existente', exact: true }).click();
    await proofCard.getByLabel('Cobro existente para vincular', { exact: true }).selectOption(existing._id);
    await proofCard.getByRole('button', { name: 'Vincular comprobante a este cobro', exact: true }).click(); await proofCard.getByText('Vinculado a un cobro existente', { exact: true }).waitFor();
    assert.equal((await api('GET', '/api/admin/transactions?saleId=' + b.saleId)).length, bTxsBefore + 1);
    for (const item of buyers) {
        await refreshBuyer(item); await item.page.reload({ waitUntil: 'domcontentloaded' }); await item.page.getByRole('heading', { name: 'Mis pagos', exact: true }).waitFor(); assert.equal(item.challengeCount, item.initialChallengeCount, 'remembered session remains valid');
        await item.page.locator('[data-delivery-state="available"]').waitFor(); await item.page.locator(`[data-buyer-payment-proof="${item.proofId}"]`).getByText('Pago acreditado', { exact: true }).waitFor();
        await screenshot(item.page, item.page.locator('[data-buyer-delivered-documents]'), `portal-${item.variant}-documentos-movil.png`);
        await screenshot(item.page, item.page.locator('[data-buyer-payments]'), `portal-${item.variant}-pagos-movil.png`);
        await item.page.setViewportSize({ width: 320, height: 740 }); assert.equal(await item.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true); await item.page.setViewportSize({ width: 390, height: 844 });
    }
    assert.equal((await fetch(base + a.api + '/payments')).status, 401);
    assert.equal((await fetch(base + a.api + '/delivery-documents')).status, 401);
    assert.equal((await b.page.request.post(base + b.api + '/payments/' + proofA.id + '/access', { data: {}, headers: { Origin: base } })).status(), 404);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify({ passed: true, fictionalOperations: 2, realEmails: false, productionAccess: false, publication: true, signedDownload: true, replacement: true, withdrawal: true, crossOperationDenied: true, paymentLostResponseRetry: true, singleAccreditation: true, linkReusesCollection: true, correctionVisible: true, mobileWidths: [390, 320] }, null, 2));
    console.log('PASS: mobile delivery documents and payments, two real isolated operations, retry/isolation checks and screenshots.');
} catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'fallo.png'), fullPage: true }).catch(() => {});
    throw error;
} finally { await browser.close(); }
