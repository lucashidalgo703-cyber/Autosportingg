// Disposable local buyer, administrator and mailbox; never accesses production.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/documentacion-avisos');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const contexts = [];
let lastPage;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const mailbox = async () => (await fetch(base + '/__test-mail.json')).json();
const adminMails = async () => (await mailbox()).filter(mail => /Nueva documentación/i.test(mail.subject));
async function newPage() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    contexts.push(context);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage(); lastPage = page; return page;
}
const open = (page, target) => page.goto(new URL(target, base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
function responseFor(page, suffix, method) {
    const response = page.waitForResponse(value => value.url().endsWith(suffix) && value.request().method() === method);
    response.catch(() => {}); return response;
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    const portal = fixture.buyerPortal;
    assert.ok(portal?.adminSessionToken, 'requires the isolated buyer portal fixture runner');
    const enabled = await fetch(base + '/api/admin/buyer-portal/sales/' + portal.withTradeIn, { method: 'PUT',
        headers: { Authorization: 'Bearer ' + portal.adminSessionToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 30 }) });
    assert.equal(enabled.status, 200);
    const configuration = await enabled.json();
    const buyer = await newPage();
    await open(buyer, configuration.url);
    await buyer.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    const sendCode = async () => {
        const response = responseFor(buyer, '/challenge', 'POST');
        await buyer.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
        return response;
    };
    let sent = await sendCode();
    if (sent.status() === 429) { assert.match((await sent.json()).message, /60 segundos/); await buyer.waitForTimeout(60000); sent = await sendCode(); }
    assert.equal(sent.status(), 200);
    const codeMail = (await mailbox()).filter(mail => mail.to === portal.buyerOneEmail).at(-1);
    const code = await buyer.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], codeMail.html);
    await buyer.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    await buyer.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    await buyer.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    const before = (await adminMails()).length;
    const form = buyer.locator('[data-upload-requirement="title"]');
    await form.getByLabel('Elegir foto o PDF', { exact: true }).setInputFiles({ name: 'titulo-aviso-ficticio.png', mimeType: 'image/png', buffer: png });
    await form.getByLabel('Número de página o PDF', { exact: true }).fill('71');
    const response = responseFor(buyer, '/documents', 'POST');
    await form.getByRole('button', { name: 'Guardar este archivo', exact: true }).click();
    const uploaded = await response;
    assert.equal(uploaded.status(), 200);
    const body = await uploaded.json();
    await form.getByRole('status').filter({ hasText: 'Carga guardada:' }).waitFor();
    const notices = await adminMails();
    assert.equal(notices.length, before + 1);
    const notice = notices.at(-1);
    assert.equal(notice.to, 'administrador@example.test');
    assert.notEqual(notice.to, portal.buyerOneEmail);
    assert.doesNotMatch(notice.html, /\?access=|\/portal\/[A-Za-z0-9_-]{43}|encryptedFile/);
    const reviewUrl = await buyer.evaluate(html => new DOMParser().parseFromString(html, 'text/html').querySelector('a[href]')?.href, notice.html);
    assert.equal(reviewUrl, base + '/admin/gestoria?documentos=' + portal.withTradeIn);
    // Replay exactly the same multipart attempt using this browser's private
    // cookie. A network retry must not produce a second notification.
    const request = uploaded.request();
    const replay = await buyer.request.post(request.url(), { data: request.postDataBuffer(),
        headers: { 'Content-Type': request.headers()['content-type'], Origin: base } });
    assert.equal(replay.status(), 200);
    assert.equal((await replay.json()).duplicate, true);
    assert.equal((await adminMails()).length, before + 1);
    console.log('ok - carga real y reintento de red generan un solo aviso al administrador');

    const anonymous = await newPage();
    await open(anonymous, reviewUrl);
    await anonymous.waitForURL(url => url.pathname === '/login', { timeout: 60000 });
    assert.equal(new URL(anonymous.url()).searchParams.get('next'), '/admin/gestoria?documentos=' + portal.withTradeIn);
    assert.equal(await anonymous.locator('[data-gestoria-buyer-documents]').count(), 0);
    const admin = await newPage();
    await admin.addInitScript(({ token, userId }) => {
        localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + userId, 'true');
    }, { token: portal.adminSessionToken, userId: fixture.users[0].id });
    await open(admin, reviewUrl);
    const viewer = admin.locator('[data-gestoria-buyer-documents]');
    await viewer.waitFor({ timeout: 90000 });
    const image = viewer.locator(`[data-admin-document="${body.entry.id}"] img`);
    await image.waitFor();
    const privateResponse = await admin.request.get(new URL(await image.getAttribute('src'), base).href);
    assert.equal(privateResponse.status(), 200);
    const documentCard = viewer.locator(`[data-admin-document="${body.entry.id}"]`);
    const statusResponse = responseFor(admin, '/documents/' + body.entry.id + '/notification', 'GET');
    await documentCard.getByText('Aviso por correo al administrador', { exact: true }).click();
    assert.equal((await statusResponse).status(), 200);
    await documentCard.getByText('Aviso de carga enviado al administrador.', { exact: true }).waitFor();
    await viewer.screenshot({ path: path.join(output, '01-enlace-del-correo-en-gestoria.png') });
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
    const result = { passed: true, uploadNotifiesConfiguredAdministrator: true, networkReplayDoesNotDuplicate: true,
        emailContainsProtectedGestoriaReviewLink: true, anonymousReviewRequiresCrmLogin: true,
        loginPreservesDocumentDestination: true, authenticatedLinkOpensCorrectPrivateViewer: true,
        uploadedImageReadable: true, administratorCanInspectDeliveryStatus: true,
        employeeAccountsUsed: false, productionAccess: false, realEmailsSent: false };
    fs.writeFileSync(path.join(output, 'resultado-browser.json'), JSON.stringify(result, null, 2));
    console.log('PASS: correo al administrador con enlace a Gestoría; acceso protegido y documento correcto.');
} catch (error) {
    if (lastPage) await lastPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
} finally { await Promise.all(contexts.map(context => context.close().catch(() => {}))); await browser.close(); }
