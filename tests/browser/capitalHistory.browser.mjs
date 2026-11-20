// Monthly capital UI against a real disposable Next/Express/Mongo setup.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { bootIsolatedReplica } from '../integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = Number(process.env.CAPITAL_HISTORY_QA_PORT || 3204), base = `http://${host}:${port}`;
const output = path.resolve('../../outputs/capital-mensual'); fs.mkdirSync(output, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const env = await bootIsolatedReplica({ listen: false }), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/(?:127\.0\.0\.1|localhost):/, 'Only isolated loopback services may be contacted');
    return originalFetch(input, options);
};
let nextApp, server, browser, failure, passed = 0, group = 0;
const contexts = [], errors = [], start = Math.max(1, Number(process.env.QA_START_GROUP) || 1);
const selected = process.env.QA_GROUPS ? new Set(process.env.QA_GROUPS.split(',').map(Number)) : null;
const test = async (name, callback) => {
    if (++group < start || selected && !selected.has(group)) { console.log(`skip ${group} - ${name}`); return; }
    await callback(); console.log(`ok ${++passed} - ${name}`);
};
try {
    const { seedCapitalHistory, seedCapitalHistoryObservations } = await import('../fixtures/capitalHistoryFixtures.js');
    const f = await seedCapitalHistory(env.models), history = await seedCapitalHistoryObservations(env.models, f);
    const originalPast = await env.models.CapitalObservation.findOne({ period: history.previous }).lean();
    process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_API_URL = base; delete process.env.TURBOPACK;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, conf: { distDir: '.next-capital-history-qa' } });
    await nextApp.prepare(); const nextHandler = nextApp.getRequestHandler();
    server = http.createServer((request, response) => {
        const pathname = new URL(request.url, base).pathname;
        if (pathname.startsWith('/api/') && !/^\/api\/admin\/(telefonos|pedidos|infracciones)(\/|$)/.test(pathname)) return env.app(request, response);
        void nextHandler(request, response).catch(() => { if (!response.headersSent) response.writeHead(500); response.end('Error en prueba aislada.'); });
    });
    await new Promise(resolve => server.listen(port, host, resolve));
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
    const goto = async (page, route) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try { return await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 }); }
            catch (error) { if (attempt === 2 || !String(error.message).includes('net::ERR_ABORTED') || page.isClosed()) throw error; await page.waitForTimeout(300); }
        }
    };
    async function surface(index, width = 1440) {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' }); contexts.push(context);
        await context.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
        await context.addInitScript(({ token, id }) => { localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true'); },
            { token: f.sessions[index].token, id: String(f.users[index]._id) });
        const page = await context.newPage(); page.setDefaultTimeout(45000);
        const responses = []; page.on('response', response => { if (new URL(response.url()).pathname.startsWith('/api')) responses.push({ path: new URL(response.url()).pathname, status: response.status() }); });
        page.on('pageerror', error => errors.push(error.message));
        return { page, context, responses, index, token: f.sessions[index].token };
    }
    const auth = async current => {
        assert.equal(await current.page.evaluate(() => localStorage.getItem('token')), current.token);
        assert.equal((await current.page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + current.token } })).status(), 200);
        assert.ok(!new URL(current.page.url()).pathname.startsWith('/login'));
    };
    const capitalResponse = response => new URL(response.url()).pathname === '/api/admin/capital-history' && response.request().method() === 'GET';
    const capture = async (page, name) => {
        await page.evaluate(() => document.fonts.ready); await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'Page fits the mobile viewport');
        await page.screenshot({ path: path.join(output, name), fullPage: false });
    };

    await test('owner sees separate currencies, real monthly records and gaps, switches valuation, and captures the current calculated balance on desktop and mobile', async () => {
        for (const width of [1440, 390]) {
            const current = await surface(1, width), page = current.page;
            const loaded = page.waitForResponse(capitalResponse, { timeout: 180000 }); await goto(page, '/admin/capital-mensual'); assert.equal((await loaded).status(), 200);
            await page.getByRole('heading', { name: 'Capital mensual', exact: true }).waitFor();
            const comparison = page.getByRole('region', { name: 'Comparación con Stock', exact: true });
            await comparison.getByRole('heading', { name: 'Cómo coincide con Stock', exact: true }).waitFor();
            await comparison.getByText('4 unidades disponibles · Inventario completo, sin filtros · ARS', { exact: true }).waitFor();
            await comparison.getByText('Mi parte · AutoSporting', { exact: true }).waitFor();
            await page.locator('[data-capital-history-chart]').waitFor();
            const gap = page.locator(`[data-capital-period="${history.gap}"]`); await gap.getByText('Sin registro', { exact: true }).waitFor();
            assert.equal(await gap.getByText(/\$\s*0(?:\D|$)/).count(), 0, 'Missing capital is not displayed as zero');
            await page.locator(`[data-capital-period="${history.previous}"]`).getByText('Último registro del mes', { exact: true }).waitFor();
            await page.getByLabel('Moneda del gráfico y del historial', { exact: true }).selectOption('USD');
            assert.ok(await page.locator('[data-capital-history-chart]').getAttribute('data-capital-history-chart') !== null);
            await page.getByLabel('Criterio de valuación', { exact: true }).selectOption('published');
            await comparison.getByText('Total de Stock · valor publicado', { exact: true }).waitFor();
            await comparison.getByText('Parte de terceros incluida', { exact: true }).waitFor();
            await page.getByRole('heading', { name: /^USD\s+20\.580$/ }).waitFor();
            await page.getByLabel('Criterio de valuación', { exact: true }).selectOption('cost');
            await comparison.getByText('Total de Stock · capital invertido', { exact: true }).waitFor();
            await page.getByLabel('Moneda del gráfico y del historial', { exact: true }).selectOption('ARS');
            await page.getByRole('button', { name: 'Guardar registro actual', exact: true }).click();
            const dialog = page.getByRole('dialog', { name: 'Guardar capital actual', exact: true }); await dialog.waitFor();
            assert.ok((await dialog.innerText()).includes('17.000.000')); assert.ok((await dialog.innerText()).includes('15.780'));
            const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/capital-history/capture' && response.request().method() === 'POST');
            await dialog.getByRole('button', { name: 'Confirmar registro', exact: true }).click(); assert.ok([200, 201].includes((await saved).status()));
            await dialog.waitFor({ state: 'hidden' });
            const stored = page.locator(`[data-capital-period="${history.period}"]`); await stored.getByText(/17\.000\.000/).first().waitFor();
            await stored.getByRole('button', { name: 'Ver composición', exact: true }).click();
            const detail = page.getByRole('dialog', { name: 'Composición del capital', exact: true });
            await detail.getByText('Stock propio a costo', { exact: false }).first().waitFor();
            await detail.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
            await auth(current); assert.deepEqual(current.responses.filter(response => [401, 403].includes(response.status)), []);
            assert.deepEqual(await env.models.CapitalObservation.findById(originalPast._id).lean(), originalPast);
            await page.locator('[data-capital-history-chart]').scrollIntoViewIfNeeded();
            await capture(page, width < 768 ? 'capital-mensual-celular.png' : 'capital-mensual-escritorio.png');
            await comparison.scrollIntoViewIfNeeded();
            await capture(page, width < 768 ? 'capital-stock-comparacion-celular.png' : 'capital-stock-comparacion-escritorio.png');
        }
    });
    await test('admin, seller and Maia cannot read global monthly capital or its form and retain valid sessions', async () => {
        for (const index of [0, 2, 3]) {
            const current = await surface(index, index === 0 ? 1440 : 390);
            await goto(current.page, '/admin/capital-mensual'); await current.page.waitForTimeout(200);
            assert.equal(await current.page.getByRole('button', { name: 'Guardar registro actual', exact: true }).count(), 0);
            assert.equal((await current.page.request.get(base + '/api/admin/capital-history', { headers: { Authorization: 'Bearer ' + current.token } })).status(), 403);
            await auth(current);
        }
    });
    await test('an owner denied one capital request sees a retryable error and keeps the login session', async () => {
        const current = await surface(1, 390), page = current.page; let allowRetry = false;
        await page.route('**/api/admin/capital-history?*', async route => {
            if (!allowRetry) await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Permiso de prueba temporalmente denegado.' }) });
            else await route.continue();
        });
        await goto(page, '/admin/capital-mensual'); await page.getByText('Permiso de prueba temporalmente denegado.', { exact: true }).waitFor(); await auth(current);
        allowRetry = true;
        const recovered = page.waitForResponse(capitalResponse, { timeout: 180000 });
        await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click(); assert.equal((await recovered).status(), 200);
        await page.locator('[data-capital-history-chart]').waitFor(); await auth(current);
    });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log(`PASS: ${passed} isolated capital-history browser groups; synthetic users, balances and historical observations only.`);
} catch (error) {
    failure = error;
    for (const [index, context] of contexts.entries()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, `fallo-${index}.png`) }).catch(() => {});
    console.error(error);
} finally {
    await browser?.close().catch(() => {});
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (nextApp) await Promise.race([nextApp.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
    globalThis.fetch = originalFetch; await env.stop();
}
process.exit(failure ? 1 : 0);
