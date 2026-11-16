// Run against scripts/start-review-preview.js. Uses only fake local buyers/mail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/portal-dispositivo');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
const contexts = [];
let lastPage;
const makeContext = async storageState => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...(storageState ? { storageState } : {}) });
    contexts.push(context);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    return context;
};
const open = async (context, url) => {
    const page = await context.newPage(); lastPage = page;
    await page.goto(new URL(url, base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
    return page;
};
const mailbox = async () => (await fetch(base + '/__test-mail.json')).json();
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    assert.ok(fixture.buyerPortal?.adminSessionToken, 'requires isolated buyer portal fixtures');
    // Use the other fake buyer so upload-suite cooldowns and document counts
    // do not affect this independent browser persistence check.
    const saleId = fixture.buyerPortal.withoutTradeIn;
    const configured = await fetch(base + '/api/admin/buyer-portal/sales/' + saleId, { method: 'PUT',
        headers: { Authorization: 'Bearer ' + fixture.buyerPortal.adminSessionToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ days: 30 }) });
    assert.equal(configured.status, 200);
    const configuration = await configured.json();
    const token = configuration.url.split('/').at(-1);
    const firstContext = await makeContext();
    let page = await open(firstContext, configuration.url);
    await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    const send = async () => {
        const pending = page.waitForResponse(response => response.url().endsWith('/challenge') && response.request().method() === 'POST');
        pending.catch(() => {});
        await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).click();
        return pending;
    };
    let sent = await send();
    if (sent.status() === 429) {
        assert.match((await sent.json()).message, /60 segundos/);
        await page.waitForTimeout(60050);
        sent = await send();
    }
    assert.equal(sent.status(), 200);
    const messages = await mailbox();
    const email = messages.filter(item => item.to === fixture.buyerPortal.buyerTwoEmail).at(-1);
    const code = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)[1], email.html);
    await page.getByLabel('Código de 6 dígitos', { exact: true }).fill(code);
    const verifiedResponse = page.waitForResponse(response => response.url().endsWith('/verify') && response.request().method() === 'POST');
    verifiedResponse.catch(() => {});
    await page.getByRole('button', { name: 'Verificar y abrir mi portal', exact: true }).click();
    assert.equal((await (await verifiedResponse).json()).sessionToken, undefined);
    await page.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    const cookies = await firstContext.cookies();
    const remembered = cookies.find(cookie => cookie.name === 'autosporting_buyer_session');
    assert.ok(remembered, 'the server should remember this browser with a persistent cookie');
    assert.equal(remembered.httpOnly, true);
    assert.equal(remembered.path, '/api/buyer-portal/' + token);
    assert.ok(remembered.expires > Date.now() / 1000 + 86400);
    const browserStorage = await page.evaluate(() => ({ cookie: document.cookie, local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) }));
    assert.equal(JSON.stringify(browserStorage).includes(remembered.value), false, 'no browser JS storage may contain the session secret');
    const mailsAfterVerification = (await mailbox()).length;
    await page.screenshot({ path: path.join(output, '01-portal-verificado.png') });
    await firstContext.close();

    // A brand new context with only persisted cookies models reopening the browser.
    const reopened = await makeContext({ cookies, origins: [] });
    page = await open(reopened, configuration.url);
    await page.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).count(), 0);
    assert.equal((await mailbox()).length, mailsAfterVerification, 'reopening cannot send a new code');
    assert.equal(await page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith('autosporting:buyer-portal:'))), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
    const privateApi = await page.request.get(base + '/api/admin/cars');
    assert.equal(privateApi.status(), 401, 'a remembered customer still has no CRM session');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, '02-reabierto-sin-codigo.png') });

    const newDevice = await makeContext();
    const anonymous = await open(newDevice, configuration.url);
    await anonymous.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    assert.equal(await anonymous.getByRole('heading', { name: 'Mi próximo vehículo', exact: true }).count(), 0);
    assert.equal((await mailbox()).length, mailsAfterVerification, 'a fresh device must wait for its owner to request a code');

    const logout = page.waitForResponse(response => response.url().endsWith('/logout') && response.request().method() === 'POST');
    logout.catch(() => {});
    await page.getByRole('button', { name: 'Salir y olvidar este dispositivo', exact: true }).click();
    assert.equal((await logout).status(), 200);
    await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    assert.equal((await reopened.cookies()).some(cookie => cookie.name === 'autosporting_buyer_session'), false);
    const cookieApi = await page.request.get(base + '/api/buyer-portal/' + token + '/session');
    assert.equal(cookieApi.status(), 401);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();

    const cleared = await makeContext({ cookies, origins: [] });
    await cleared.clearCookies();
    const clearedPage = await open(cleared, configuration.url);
    await clearedPage.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    const legacy = await makeContext();
    await legacy.addInitScript(linkToken => sessionStorage.setItem('autosporting:buyer-portal:' + linkToken, 'legacy-js-token'), token);
    const legacyPage = await open(legacy, configuration.url);
    await legacyPage.getByRole('button', { name: 'Enviar código a mi correo', exact: true }).waitFor();
    assert.equal(await legacyPage.evaluate(linkToken => sessionStorage.getItem('autosporting:buyer-portal:' + linkToken), token), null, 'retired browser JS credentials must be discarded');
    const result = { passed: true, browserReopenedWithCookiesOnly: true, secondCodeRequestedOnReopen: false,
        httpOnlyPersistentCookie: true, jsSessionSecretsStored: false, crmSessionGranted: false,
        newDeviceRequiresCode: true, clearedCookiesRequireCode: true, explicitLogoutRequiresCode: true,
        oldJsStorageDiscarded: true, productionAccess: false };
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify(result, null, 2));
    console.log('PASS: el mismo dispositivo reabre sin otro código; navegador nuevo, cookies eliminadas y cierre de acceso requieren verificar de nuevo.');
} catch (error) {
    if (lastPage) await lastPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
} finally { await Promise.all(contexts.map(context => context.close().catch(() => {}))); await browser.close(); }
