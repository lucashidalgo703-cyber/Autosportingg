// Owner inventory loading regression. Real loopback app, synthetic accounts only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { bootIsolatedReplica } from '../integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = Number(process.env.STOCK_LOADING_QA_PORT || 3205), base = `http://${host}:${port}`;
const output = path.resolve('../../outputs/stock-loading'); fs.mkdirSync(output, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const env = await bootIsolatedReplica({ listen: false }), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/(?:127\.0\.0\.1|localhost):/);
    return originalFetch(input, options);
};
let nextApp, server, browser, failure;
const events = [], errors = [], contexts = [], pendingBodies = new Set();
try {
    const { seedCapitalHistory } = await import('../fixtures/capitalHistoryFixtures.js');
    const f = await seedCapitalHistory(env.models);
    process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_API_URL = base; delete process.env.TURBOPACK;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, conf: { distDir: '.next-stock-loading-qa' } });
    await nextApp.prepare(); const nextHandler = nextApp.getRequestHandler();
    server = http.createServer((request, response) => {
        if (new URL(request.url, base).pathname === '/__test/pending-stock-body') {
            response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            response.write('{"cars":');
            pendingBodies.add(response); response.on('close', () => pendingBodies.delete(response));
            return;
        }
        if (new URL(request.url, base).pathname.startsWith('/api/')) return env.app(request, response);
        void nextHandler(request, response).catch(() => { if (!response.headersSent) response.writeHead(500); response.end('Error de prueba'); });
    });
    await new Promise(resolve => server.listen(port, host, resolve));
    const warm = await fetch(base + '/admin/stock', { signal: AbortSignal.timeout(180000) }); assert.equal(warm.status, 200);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
    for (const width of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 } }); contexts.push(context);
        await context.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
        await context.addInitScript(({ token, id }) => { localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true'); }, { token: f.sessions[1].token, id: String(f.users[1]._id) });
        const page = await context.newPage(); page.setDefaultTimeout(45000);
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api/')) events.push({ width, path: new URL(response.url()).pathname, status: response.status() }); });
        const loaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/cars', { timeout: 180000 });
        await page.goto(base + '/admin/stock', { waitUntil: 'domcontentloaded', timeout: 180000 });
        assert.equal((await loaded).status(), 200);
        await page.locator('[data-stock-heading]').waitFor();
        await page.getByRole('region', { name: 'Capital invertido a costo', exact: true }).waitFor();
        assert.equal(await page.getByText('Cargando stock real...', { exact: true }).count(), 0);
        const count = events.filter(row => row.width === width && row.path === '/api/admin/cars').length;
        await page.waitForTimeout(2000);
        assert.ok(events.filter(row => row.width === width && row.path === '/api/admin/cars').length <= count + 1, 'No continuous inventory reload');
        assert.equal(await page.evaluate(() => localStorage.getItem('token')), f.sessions[1].token);
        assert.equal((await page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + f.sessions[1].token } })).status(), 200);
        await page.screenshot({ path: path.join(output, width < 768 ? 'stock-celular.png' : 'stock-escritorio.png') });
        console.log(`PASS owner Stock loaded at ${width}px; inventory requests=${count}`);
        await context.close();
    }
    const recovery = await browser.newContext({ viewport: { width: 390, height: 844 } }); contexts.push(recovery);
    await recovery.addInitScript(({ token, id }) => { localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true'); }, { token: f.sessions[1].token, id: String(f.users[1]._id) });
    await recovery.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
    let pending = true;
    await recovery.route('**/api/admin/cars?*', route => pending ? route.continue({ url: base + '/__test/pending-stock-body' }) : route.continue());
    const page = await recovery.newPage(); page.setDefaultTimeout(45000); page.on('pageerror', error => errors.push(error.message));
    const startedAt = Date.now();
    await page.goto(base + '/admin/stock', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByText('La consulta de stock demoró demasiado. Reintentá.', { exact: true }).waitFor({ timeout: 45000 });
    assert.ok(Date.now() - startedAt >= 28000, 'Exercise the real production timeout, including a JSON body that never finishes');
    assert.equal(await page.getByText('Cargando stock real...', { exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), f.sessions[1].token);
    assert.equal((await page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + f.sessions[1].token } })).status(), 200);
    await page.screenshot({ path: path.join(output, 'stock-error-reintentar-celular.png') });
    pending = false;
    const recovered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/cars' && response.status() === 200);
    await page.getByRole('button', { name: /Reintentar/i }).click(); await recovered;
    await page.locator('[data-stock-heading]').waitFor();
    assert.equal(await page.getByText('La consulta de stock demoró demasiado. Reintentá.', { exact: true }).count(), 0);
    await page.screenshot({ path: path.join(output, 'stock-recuperado-celular.png') });
    console.log('PASS incomplete JSON response times out at 30 seconds, preserves owner session and retries successfully');

    let oldStarted, releaseOld;
    const oldStartedPromise = new Promise(resolve => { oldStarted = resolve; });
    const oldReleasePromise = new Promise(resolve => { releaseOld = resolve; });
    await page.route('**/api/admin/cars?*', async route => {
        if (new URL(route.request().url()).searchParams.get('search') !== 'QACAP01') return route.continue();
        const response = await route.fetch(); oldStarted(); await oldReleasePromise;
        await route.fulfill({ response }).catch(() => {}); // An aborted obsolete request cannot overwrite the newer result.
    });
    await page.getByLabel('Buscar en el inventario disponible', { exact: true }).fill('QACAP01'); await oldStartedPromise;
    const newest = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/cars'
        && new URL(response.url()).searchParams.get('search') === 'QACAP02' && response.status() === 200);
    await page.getByLabel('Buscar en el inventario disponible', { exact: true }).fill('QACAP02'); await newest;
    await page.locator(`article[data-stock-vehicle="${f.cars[1]._id}"]`).waitFor();
    releaseOld(); await page.waitForTimeout(500);
    assert.equal(await page.locator(`article[data-stock-vehicle="${f.cars[0]._id}"]`).count(), 0);
    assert.equal(await page.locator(`article[data-stock-vehicle="${f.cars[1]._id}"]`).count(), 1);
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), f.sessions[1].token);
    console.log('PASS newer inventory filter remains visible after the obsolete query is released');
    await recovery.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify({ passed: true, loopbackOnly: true, employeeAccountsUsed: false,
        timeoutIncludesIncompleteBody: true, actualTimeoutMilliseconds: 30000, retryAndSessionPreserved: true, obsoleteResponseCannotReplaceNewFilter: true, events, errors }, null, 2));
} catch (error) {
    failure = error;
    console.error(error); console.error(JSON.stringify({ events, errors }));
    for (const [index, context] of contexts.entries()) for (const page of context.pages()) {
        console.error((await page.locator('body').innerText().catch(() => '')).slice(0, 3000));
        await page.screenshot({ path: path.join(output, `fallo-${index}.png`) }).catch(() => {});
    }
} finally {
    if (browser) await browser.close();
    for (const response of pendingBodies) response.destroy();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (nextApp) await Promise.race([nextApp.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
    globalThis.fetch = originalFetch;
    await env.stop();
}
process.exit(failure ? 1 : 0);
