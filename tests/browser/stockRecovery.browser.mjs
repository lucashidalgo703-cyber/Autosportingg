// Real Next UI and recovery API against disposable MongoDB and synthetic owners.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { bootIsolatedReplica } from '../integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = Number(process.env.STOCK_RECOVERY_QA_PORT || 3228), base = `http://${host}:${port}`;
const output = path.resolve(process.env.STOCK_RECOVERY_QA_OUTPUT || '../../outputs/stock-recovery');
fs.mkdirSync(output, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const env = await bootIsolatedReplica({ listen: false }), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/(?:127\.0\.0\.1|localhost):/, 'Only disposable loopback services may be contacted');
    return originalFetch(input, options);
};
let nextApp, server, browser, failure, passed = 0;
const contexts = [], errors = [], observations = [];
const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
const routeOf = response => new URL(response.url()).pathname;
const isHistory = response => routeOf(response) === '/api/admin/capital-history' && response.request().method() === 'GET';
const isPreview = response => routeOf(response) === '/api/admin/capital-history/recovery' && response.request().method() === 'GET';
const isImport = response => routeOf(response) === '/api/admin/capital-history/recovery' && response.request().method() === 'POST';
try {
    const { seedCapitalHistory } = await import('../fixtures/capitalHistoryFixtures.js');
    const { captureCapitalObservation } = await import('../../src/services/capitalHistoryService.js');
    const f = await seedCapitalHistory(env.models);
    const owner = { id: String(f.users[1]._id), username: f.users[1].name, role: 'owner', permissions: [] };
    const observed = (await captureCapitalObservation({ user: owner, requestKey: crypto.randomUUID() })).snapshot;
    const observedBefore = await env.models.CapitalObservation.findById(observed.id).lean();
    const monthBefore = await env.models.CapitalMonth.findById(observed.period).lean();
    const period = observed.period, expectedMonths = [];
    for (let next = '2026-05'; next < period;) {
        expectedMonths.push(next);
        const [year, month] = next.split('-').map(Number), date = new Date(Date.UTC(year, month, 15));
        next = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_API_URL = base; delete process.env.TURBOPACK;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, conf: { distDir: '.next-stock-recovery-qa' } });
    await nextApp.prepare(); const handler = nextApp.getRequestHandler();
    server = http.createServer((request, response) => {
        if (new URL(request.url, base).pathname.startsWith('/api/')) return env.app(request, response);
        void handler(request, response).catch(() => { if (!response.headersSent) response.writeHead(500); response.end('Error en prueba aislada.'); });
    });
    await new Promise(resolve => server.listen(port, host, resolve));
    assert.equal((await fetch(base + '/admin/capital-mensual', { signal: AbortSignal.timeout(180000) })).status, 200);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
    const surface = async (index, width) => {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' }); contexts.push(context);
        await context.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
        await context.addInitScript(({ token, id }) => {
            localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true');
        }, { token: f.sessions[index].token, id: String(f.users[index]._id) });
        const page = await context.newPage(); page.setDefaultTimeout(45000);
        page.on('pageerror', error => errors.push(error.message));
        return { page, context };
    };
    const open = async current => {
        const loaded = current.page.waitForResponse(isHistory, { timeout: 180000 });
        await current.page.goto(base + '/admin/capital-mensual', { waitUntil: 'domcontentloaded', timeout: 180000 });
        assert.equal((await loaded).status(), 200);
        await current.page.getByRole('button', { name: 'Recuperar stock histórico', exact: true }).waitFor();
    };
    const screenshot = async (page, name) => {
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'Page fits the viewport');
        await page.screenshot({ path: path.join(output, name), fullPage: false });
    };
    const desktop = await surface(1, 1440), mobile = await surface(1, 390);
    for (const [current, label] of [[desktop, 'desktop'], [mobile, 'mobile']]) {
        await test(`${label}: preview shows both currencies, historical cuts and the preserved observed month`, async () => {
            await open(current);
            const preview = current.page.waitForResponse(isPreview, { timeout: 180000 });
            await current.page.getByRole('button', { name: 'Recuperar stock histórico', exact: true }).click();
            const response = await preview; assert.equal(response.status(), 200);
            const plan = await response.json(); observations.push({ label, planId: plan.planId, periods: plan.importablePeriods });
            const dialog = current.page.getByRole('dialog', { name: 'Recuperar stock histórico', exact: true });
            await dialog.locator('[data-capital-recovery-preview]').waitFor();
            assert.equal(await dialog.getByLabel('Recuperar desde', { exact: true }).inputValue(), '2026-05');
            assert.equal(await dialog.getByLabel('Recuperar hasta', { exact: true }).inputValue(), period);
            assert.deepEqual(plan.importablePeriods, expectedMonths);
            await dialog.locator(`[data-recovery-period="${period}"]`).getByText('Se conserva el registro guardado', { exact: true }).waitFor();
            const first = dialog.locator('[data-recovery-period="2026-05"]');
            await first.getByText('Subtotal histórico respaldado · ARS', { exact: true }).waitFor();
            await first.getByText('Subtotal histórico respaldado · USD', { exact: true }).waitFor();
            await first.getByText('Stock reconstruido · Parcial', { exact: true }).waitFor();
            assert.ok((await first.innerText()).includes('Corte:'));
            assert.equal(await dialog.getByRole('button', { name: /Guardar recuperación/ }).isEnabled(), true);
            await screenshot(current.page, `recuperacion-previa-${label}.png`);
            if (label === 'mobile') await dialog.getByRole('button', { name: 'Volver', exact: true }).click();
        });
    }
    await test('a changed source rejects an old preview and requires a fresh review before saving', async () => {
        await env.models.Car.updateOne({ _id: f.cars[0]._id }, { $inc: { price: 1 } });
        const dialog = desktop.page.getByRole('dialog', { name: 'Recuperar stock histórico', exact: true });
        const rejected = desktop.page.waitForResponse(isImport);
        await dialog.getByRole('button', { name: /Guardar recuperación/ }).click();
        assert.equal((await rejected).status(), 409);
        await dialog.getByRole('alert').filter({ hasText: /Los datos cambiaron/ }).waitFor();
        assert.equal(await dialog.getByRole('button', { name: /Guardar recuperación/ }).isDisabled(), true);
        assert.equal(await env.models.CapitalObservation.countDocuments({ source: 'reconstructed' }), 0);
        const refreshed = desktop.page.waitForResponse(isPreview);
        await dialog.getByRole('button', { name: 'Actualizar vista previa', exact: true }).click();
        assert.equal((await refreshed).status(), 200);
        await dialog.locator('[data-capital-recovery-preview]').waitFor();
    });
    await test('saving recovers only missing stock months and keeps the original observed record unchanged', async () => {
        const dialog = desktop.page.getByRole('dialog', { name: 'Recuperar stock histórico', exact: true });
        const imported = desktop.page.waitForResponse(isImport), refreshed = desktop.page.waitForResponse(isHistory);
        await dialog.getByRole('button', { name: /Guardar recuperación/ }).click();
        const response = await imported; assert.equal(response.status(), 200);
        const result = await response.json(); assert.deepEqual(result.importedPeriods, expectedMonths); assert.ok(result.preservedPeriods.includes(period));
        assert.equal((await refreshed).status(), 200);
        await desktop.page.getByRole('status').filter({ hasText: /Se recuperaron/ }).waitFor();
        assert.deepEqual(await env.models.CapitalObservation.findById(observed.id).lean(), observedBefore);
        assert.deepEqual(await env.models.CapitalMonth.findById(period).lean(), monthBefore);
        const recovered = await env.models.CapitalObservation.find({ source: 'reconstructed' }).lean();
        assert.equal(recovered.length, expectedMonths.length);
        for (const row of recovered) { assert.equal(row.quality.costStatus, 'partial'); assert.equal(row.quality.publishedStatus, 'partial'); assert.deepEqual(row.components, {}); }
    });
    await test('desktop and mobile history distinguish reconstructed stock from observed capital and expose no false net total', async () => {
        for (const [current, label] of [[desktop, 'desktop'], [mobile, 'mobile']]) {
            if (label === 'mobile') await open(current);
            const recovered = current.page.locator('[data-capital-period="2026-05"]');
            await recovered.getByText('Stock reconstruido · Corte histórico', { exact: true }).waitFor();
            await recovered.getByText('No reconstruido · Solo Stock', { exact: true }).waitFor();
            await recovered.getByText('Stock reconstruido · Parcial', { exact: true }).waitFor();
            assert.ok((await recovered.innerText()).includes('Corte:'));
            assert.ok((await recovered.innerText()).includes('Recuperado:'));
            assert.equal(await current.page.locator(`[data-capital-period="${period}"]`).getAttribute('data-capital-reconstructed'), null);
            await recovered.scrollIntoViewIfNeeded(); await screenshot(current.page, `recuperacion-guardada-${label}.png`);
        }
    });
    await test('reopening a completed range protects every month and disables a duplicate import', async () => {
        const preview = desktop.page.waitForResponse(isPreview);
        await desktop.page.getByRole('button', { name: 'Recuperar stock histórico', exact: true }).click();
        assert.equal((await preview).status(), 200);
        const dialog = desktop.page.getByRole('dialog', { name: 'Recuperar stock histórico', exact: true });
        await dialog.getByText('No hay meses faltantes para recuperar en este rango.', { exact: true }).waitFor();
        assert.equal(await dialog.getByRole('button', { name: /Guardar recuperación/ }).isDisabled(), true);
        assert.equal(await env.models.CapitalObservation.countDocuments({ source: 'reconstructed' }), expectedMonths.length);
        await dialog.getByRole('button', { name: 'Volver', exact: true }).click();
    });
    await test('a non-owner cannot see the recovery control or request the recovery API', async () => {
        const current = await surface(0, 390);
        await current.page.goto(base + '/admin/capital-mensual', { waitUntil: 'domcontentloaded', timeout: 180000 });
        await current.page.waitForURL(url => url.pathname === '/admin', { timeout: 45000 });
        assert.equal(await current.page.getByRole('button', { name: 'Recuperar stock histórico', exact: true }).count(), 0);
        assert.equal(await current.page.evaluate(() => localStorage.getItem('token')), f.sessions[0].token, 'A permission denial preserves the valid session');
        const denied = await current.page.request.get(base + '/api/admin/capital-history/recovery?from=2026-05&to=' + period,
            { headers: { Authorization: 'Bearer ' + f.sessions[0].token } });
        assert.equal(denied.status(), 403);
    });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    fs.writeFileSync(path.join(output, 'resultado-navegador.json'), JSON.stringify({ passed: true, groups: passed,
        checkedAt: new Date().toISOString(), syntheticOnly: true, productionWrites: false, observedMonthPreserved: true,
        recoveredPeriods: expectedMonths, desktopAndMobile: true, rejectedStalePreview: true, observations }, null, 2));
    console.log(`PASS: ${passed} real isolated recovery browser groups, desktop and 390px; observed records preserved.`);
} catch (error) {
    failure = error; console.error(error);
    for (const [index, context] of contexts.entries()) for (const page of context.pages()) {
        await page.screenshot({ path: path.join(output, `fallo-recuperacion-${index}.png`) }).catch(() => {});
    }
} finally {
    await browser?.close().catch(() => {});
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (nextApp) await Promise.race([nextApp.close().catch(() => {}), new Promise(resolve => setTimeout(resolve, 5000))]);
    globalThis.fetch = originalFetch; await env.stop();
}
process.exit(failure ? 1 : 0);
