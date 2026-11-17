// Requires the loopback review preview, two fictional operations with payment
// proofs, and a successful payment-upload notice in its fake mailbox.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { salePaymentProofTarget } from '../../src/utils/salePaymentProofLink.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/avisos-pago-documentacion');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let page, releaseMockRefresh = () => {};
async function localJson(route, token) {
    assert.ok(route.startsWith('/'));
    const response = await fetch(base + route, { headers: token ? { Authorization: 'Bearer ' + token } : {}, signal: AbortSignal.timeout(45000) });
    assert.equal(response.status, 200, 'local fixture setup must be ready');
    return response.json();
}
function responseFor(route) {
    const pending = page.waitForResponse(response => new URL(response.url()).pathname === route && response.request().method() === 'POST');
    pending.catch(() => {}); return pending;
}
try {
    const fixture = await localJson('/__test-fixtures.json');
    assert.ok(fixture.buyerPortal?.adminSessionToken, 'start scripts/start-review-preview.js');
    const admin = fixture.users.find(user => user.email === 'admin@example.test');
    assert.equal(admin?.name, 'Administrador ficticio');
    const operations = await Promise.all([fixture.buyerPortal.withTradeIn, fixture.buyerPortal.withoutTradeIn].map(async saleId => {
        const data = await localJson('/api/admin/buyer-portal/sales/' + saleId + '/payment-proofs', fixture.buyerPortal.adminSessionToken);
        assert.ok(data.proofs?.length, 'prepare a fictional payment proof in each operation before running this test');
        return { saleId, proofs: data.proofs };
    }));
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    // Suppress only the fixture admin tour. No login token/cookie is installed.
    await context.addInitScript(id => localStorage.setItem('autosporting_tour_seen_' + id, 'true'), admin.id);
    context.setDefaultTimeout(45000);
    page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const mailbox = await localJson('/__test-mail.json');
    let selected;
    for (const message of [...mailbox].reverse()) {
        if (message.to !== 'administrador@example.test' || !/^AutoSporting \| Nuevo comprobante/.test(message.subject || '')) continue;
        const links = await page.evaluate(html => [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('a[href]')].map(link => link.getAttribute('href')), message.html);
        for (const link of links) {
            const url = new URL(link, base);
            if (url.origin !== base || url.username || url.password) continue;
            const target = salePaymentProofTarget(url.pathname + url.search + url.hash);
            if (!target) continue;
            const canonical = new URL(target, base), proofId = canonical.searchParams.get('comprobante');
            const operation = operations.find(item => canonical.pathname === '/admin/ventas/' + item.saleId && item.proofs.some(proof => proof.id === proofId));
            if (operation) { selected = { target, saleId: operation.saleId, proofId }; break; }
        }
        if (selected) break;
    }
    assert.ok(selected, 'a successful fictional payment-upload email with its operation/proof review link is required');
    const other = operations.find(operation => operation.saleId !== selected.saleId);
    const foreignProofId = other.proofs[0].id;
    assert.notEqual(foreignProofId, selected.proofId);
    assert.equal(salePaymentProofTarget('https://untrusted.example' + selected.target), null);
    assert.equal(salePaymentProofTarget('//untrusted.example' + selected.target), null);

    await page.goto(base + selected.target, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForURL(url => url.pathname === '/login', { timeout: 90000 });
    assert.equal(new URL(page.url()).searchParams.get('next'), selected.target, 'the exact email destination must survive the unauthenticated redirect');
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
    assert.equal((await page.request.get(base + '/api/admin/buyer-portal/sales/' + selected.saleId + '/payment-proofs')).status(), 401);
    const beforeMail = (await localJson('/__test-mail.json')).length;
    await page.locator('input[type="email"]').fill('admin@example.test');
    await page.locator('input[type="password"]').fill('Ficticia-Local-2026!');
    const pendingLogin = responseFor('/api/login');
    await page.getByRole('button', { name: 'INICIAR SESIÓN // LOGIN', exact: true }).click();
    const loginResponse = await pendingLogin;
    assert.equal(loginResponse.status(), 200, 'normal local OTP quotas apply; use a fresh preview or wait for its usual cooldown');
    const challenge = await loginResponse.json();
    assert.equal(challenge.requireEmailVerification, true);
    await page.getByRole('heading', { name: 'Ingresá el código de 6 dígitos enviado al administrador', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null, 'credentials alone must not grant a CRM session');
    assert.equal(await page.locator('[data-admin-payment-proofs]').count(), 0);
    const proofApi = base + '/api/admin/buyer-portal/sales/' + selected.saleId + '/payment-proofs';
    assert.equal((await page.request.get(proofApi)).status(), 401);
    assert.equal((await page.request.get(proofApi, { headers: { Authorization: 'Bearer ' + challenge.challengeId } })).status(), 401);

    const loginMail = (await localJson('/__test-mail.json')).slice(beforeMail).filter(message => message.to === 'administrador@example.test' && message.subject === 'AutoSporting | Solicitud de ingreso de Administrador ficticio').at(-1);
    assert.ok(loginMail, 'use only the newly generated administrator login email');
    const code = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/(?:^|\D)(\d{6})(?!\d)/)?.[1], loginMail.html);
    assert.ok(code, 'the fictitious login email contains a six digit code');
    await page.getByLabel('Código de verificación', { exact: true }).fill(code);
    const verified = responseFor('/api/login/email/verify');
    await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
    assert.equal((await verified).status(), 200);
    await page.waitForURL(url => url.pathname + url.search === selected.target, { timeout: 120000 });
    assert.equal(new URL(page.url()).origin, base);
    const verifiedToken = await page.evaluate(() => localStorage.getItem('token'));
    assert.ok(verifiedToken);
    assert.equal((await page.request.get(proofApi, { headers: { Authorization: 'Bearer ' + verifiedToken } })).status(), 200);
    await page.locator('#sale-section-tab-collections[aria-selected="true"]').waitFor();
    const selectedCard = page.locator(`[data-admin-payment-proof="${selected.proofId}"][data-highlighted="true"]`);
    await selectedCard.waitFor();
    await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-payment-proof') === id, selected.proofId);
    await selectedCard.getByText('Comprobante seleccionado desde el aviso por correo', { exact: true }).waitFor();
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true);
    await selectedCard.screenshot({ path: path.join(output, 'enlace-comprobante-movil.png') });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#sale-section-tab-collections[aria-selected="true"]').waitFor();
    await selectedCard.waitFor();
    await page.waitForFunction(id => document.activeElement?.getAttribute('data-admin-payment-proof') === id, selected.proofId);
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, selected.target);

    // UI-only concurrency simulation: an old list says delivery failed; another
    // sender owns the retry and its immediate response is pending. The following
    // real GET already reports sent, which must replace the temporary override.
    const listUrl = base + '/api/admin/buyer-portal/sales/' + selected.saleId + '/payment-proofs';
    const liveData = await localJson('/api/admin/buyer-portal/sales/' + selected.saleId + '/payment-proofs', fixture.buyerPortal.adminSessionToken);
    const liveNotice = liveData.proofs.find(proof => proof.id === selected.proofId)?.emailNotification;
    assert.equal(liveNotice?.status, 'sent', 'the actual fixture notification must already be sent');
    const failedData = { ...liveData, proofs: liveData.proofs.map(proof => proof.id !== selected.proofId ? proof : {
        ...proof, emailNotification: { ...liveNotice, status: 'failed', reason: 'delivery_failed', sentAt: null, retryable: true }
    }) };
    await page.route(listUrl, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(failedData) }), { times: 1 });
    await page.getByRole('button', { name: 'Actualizar comprobantes del cliente', exact: true }).click();
    const retryButton = selectedCard.getByRole('button', { name: 'Reintentar aviso al administrador', exact: true });
    await retryButton.waitFor();
    const retryUrl = base + '/api/admin/buyer-portal/payment-proofs/' + selected.proofId + '/notification/retry';
    await page.route(retryUrl, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ...liveNotice, status: 'pending', sentAt: null, reason: null, retryable: false
    }) }), { times: 1 });
    const refreshGate = new Promise(resolve => { releaseMockRefresh = resolve; });
    await page.route(listUrl, async route => {
        const response = await route.fetch();
        assert.equal((await response.json()).proofs.find(proof => proof.id === selected.proofId)?.emailNotification?.status, 'sent');
        await refreshGate;
        await route.fulfill({ response });
    }, { times: 1 });
    const refreshedRequest = page.waitForRequest(request => request.url() === listUrl && request.method() === 'GET');
    refreshedRequest.catch(() => {});
    try {
        await retryButton.click();
        await refreshedRequest;
        await selectedCard.locator('[data-portal-email-notification][data-email-status="pending"]').waitFor();
    } finally { releaseMockRefresh(); }
    await selectedCard.locator('[data-portal-email-notification][data-email-status="sent"]').waitFor();

    const foreignTarget = `/admin/ventas/${selected.saleId}?section=collections&comprobante=${foreignProofId}`;
    const foreignAccessRequests = [];
    page.on('request', request => { if (new URL(request.url()).pathname.includes('/payment-proofs/' + foreignProofId)) foreignAccessRequests.push(request.url()); });
    await page.goto(base + foreignTarget, { waitUntil: 'domcontentloaded' });
    await page.locator('#sale-section-tab-collections[aria-selected="true"]').waitFor();
    const warning = page.locator('[data-payment-proof-link-warning]');
    await warning.waitFor();
    assert.match(await warning.innerText(), /Este comprobante no está disponible en esta operación\./);
    assert.equal(await page.locator(`[data-admin-payment-proof="${foreignProofId}"]`).count(), 0);
    assert.equal(foreignAccessRequests.length, 0, 'a mismatched link must not attempt to open the other operation proof');
    await warning.screenshot({ path: path.join(output, 'enlace-otra-operacion-bloqueado.png') });
    assert.deepEqual(pageErrors, []);
    fs.writeFileSync(path.join(output, 'enlace-comprobante-resultado.json'), JSON.stringify({ passed: true, emailButtonUsed: true,
        freshAdministratorOtp: true, credentialsOnlyDenied: true, exactDestinationPreserved: true, selectedTab: 'collections',
        proofHighlightedAndFocused: true, reloadPreservesDestination: true, crossOperationLinkNotOpened: true,
        retryWidgetPendingReplacedByRealSent: true, retryWidgetResponsesMocked: true,
        productionAccess: false, realEmailsSent: false, mobileWidth: 390 }, null, 2));
    console.log('PASS: email link + real fictional OTP, focused payment proof/reload, rejected cross-operation link and mocked retry pending replaced by the real sent status.');
} catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'enlace-comprobante-fallo.png'), fullPage: true }).catch(() => {});
    throw error;
} finally { releaseMockRefresh(); await browser.close(); }
