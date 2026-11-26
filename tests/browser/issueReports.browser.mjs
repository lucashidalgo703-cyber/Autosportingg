// Real browser QA against disposable loopback Next/Express/MongoDB and synthetic identities only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { bootIsolatedReplica } from '../integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = Number(process.env.ISSUE_REPORTS_QA_PORT || 3205), base = `http://${host}:${port}`;
const output = path.resolve(process.env.ISSUE_REPORTS_QA_OUTPUT || '../issue-browser-qa');
const endpoint = '/api/admin/issue-reports';
fs.mkdirSync(output, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const env = await bootIsolatedReplica({ listen: false }), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/(?:127\.0\.0\.1|localhost):/, 'Only disposable loopback services may be contacted');
    return originalFetch(input, options);
};
let nextApp, server, browser, failure, passed = 0;
const contexts = [], browserErrors = [];
const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_API_URL = base;
    delete process.env.TURBOPACK; delete process.env.IS_TURBOPACK_TEST;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, conf: { distDir: '.next-issue-reports-qa' } });
    await nextApp.prepare();
    const nextHandler = nextApp.getRequestHandler();
    server = http.createServer((request, response) => {
        const pathname = new URL(request.url, base).pathname;
        if (pathname.startsWith('/api/') && !/^\/api\/admin\/(telefonos|pedidos|infracciones)(\/|$)/.test(pathname)) return env.app(request, response);
        void nextHandler(request, response).catch(() => { if (!response.headersSent) response.writeHead(500); response.end('Error en vista de prueba aislada.'); });
    });
    await new Promise(resolve => server.listen(port, host, resolve));
    assert.equal((await fetch(base + '/admin/reportar-problema', { signal: AbortSignal.timeout(180000) })).status, 200);
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
    async function surface(index, width) {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' }); contexts.push(context);
        await context.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
        await context.addInitScript(({ token, id }) => { localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + id, 'true'); },
            { token: fixture.sessions[index].token, id: String(fixture.users[index]._id) });
        const page = await context.newPage(); page.setDefaultTimeout(45000);
        page.on('pageerror', error => browserErrors.push(error.message));
        return { context, page, index, token: fixture.sessions[index].token };
    }
    const isResponse = (method, route) => response => new URL(response.url()).pathname === route && response.request().method() === method;
    const listLoaded = page => page.waitForResponse(isResponse('GET', endpoint), { timeout: 180000 });
    async function goto(current, suffix = '') {
        const response = listLoaded(current.page);
        await current.page.goto(base + '/admin/reportar-problema' + suffix, { waitUntil: 'domcontentloaded', timeout: 180000 });
        assert.equal((await response).status(), 200);
        await current.page.getByRole('heading', { name: 'Reportar problema', exact: true }).waitFor();
        await current.page.getByRole('heading', { name: current.index === 0 ? 'Reportes del equipo' : 'Mis reportes', exact: true }).waitFor();
    }
    const auth = async current => {
        assert.equal(await current.page.evaluate(() => localStorage.getItem('token')), current.token);
        assert.equal((await current.page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + current.token } })).status(), 200);
    };
    async function capture(page, filename) {
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'No document horizontal overflow');
        for (const dialog of await page.getByRole('dialog').all()) {
            assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 2), true, 'No dialog horizontal overflow');
        }
        await page.screenshot({ path: path.join(output, filename), fullPage: false });
    }
    async function openDetail(current, title, id) {
        const loaded = current.page.waitForResponse(isResponse('GET', `${endpoint}/${id}`));
        await current.page.getByRole('button').filter({ has: current.page.getByRole('heading', { name: title, exact: true }) }).click();
        assert.equal((await loaded).status(), 200);
        const dialog = current.page.getByRole('dialog', { name: `Reporte #${id.slice(-6).toUpperCase()}`, exact: true });
        await dialog.waitFor();
        await dialog.getByText('Actualizando detalle…', { exact: true }).waitFor({ state: 'hidden' });
        return dialog;
    }
    async function submitReport(current, title, suffix) {
        const page = current.page;
        await page.getByRole('button', { name: 'Nuevo reporte', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Nuevo reporte de problema', exact: true });
        await dialog.getByLabel('Título *', { exact: true }).fill(title);
        await dialog.getByLabel('Descripción del problema *', { exact: true }).fill('Al guardar el formulario ficticio de prueba aparece un error y no se conservan los cambios.');
        await dialog.getByLabel('Tipo de problema', { exact: true }).selectOption(current.index === 3 ? 'falla' : 'bug');
        await dialog.getByLabel('Prioridad', { exact: true }).selectOption('high');
        await dialog.getByLabel('Sección del CRM', { exact: true }).fill('Stock');
        await dialog.getByText('Agregar más detalles (opcional)', { exact: true }).click();
        await dialog.getByLabel('Pasos para reproducirlo', { exact: true }).fill('1. Abrir la unidad de prueba. 2. Presionar Guardar.');
        await dialog.getByLabel('¿Qué esperabas que pasara?', { exact: true }).fill('Guardar el formulario ficticio.');
        await dialog.getByLabel('¿Qué pasó realmente?', { exact: true }).fill('Aparece un error ficticio de prueba.');
        assert.equal(await dialog.getByLabel('Enlace o ruta de la pantalla', { exact: true }).inputValue(), '/admin/stock');
        await capture(page, `formulario-${suffix}.png`);
        const screenshot = await page.screenshot({ fullPage: false });
        await dialog.getByLabel('Capturas de pantalla (opcional)', { exact: true }).setInputFiles({ name: `captura-${suffix}-qa.png`, mimeType: 'image/png', buffer: screenshot });
        const saved = page.waitForResponse(isResponse('POST', endpoint));
        await dialog.getByRole('button', { name: 'Enviar reporte', exact: true }).click();
        const response = await saved; assert.equal(response.status(), 201);
        const report = await response.json();
        assert.equal(String(report.author?._id || report.author), String(fixture.users[current.index]._id));
        assert.equal(report.attachments.length, 1);
        await dialog.waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: title, exact: true }).waitFor();
        await page.getByText(/Reporte enviado correctamente/).waitFor();
        await auth(current);
        return report;
    }
    const seller = await surface(1, 1440), reader = await surface(3, 390), admin = await surface(0, 1440);
    let sellerReport, readerReport;
    const sellerTitle = 'No guarda foto de Stock · Vendedor QA', readerTitle = 'Formulario con falla · Lectura QA';
    await test('seller and read-only users see the universal sidebar and header entry on desktop and mobile', async () => {
        for (const current of [seller, reader]) {
            await goto(current);
            const headerLink = current.page.locator('a[aria-label="Reportar problema"]');
            assert.equal(await headerLink.getAttribute('href'), '/admin/reportar-problema?from=%2Fadmin%2Freportar-problema');
            await headerLink.click();
            await current.page.waitForURL(base + '/admin/reportar-problema?from=%2Fadmin%2Freportar-problema');
            if (current === reader) await current.page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
            const sidebar = current.page.locator('aside:visible');
            await sidebar.getByRole('link', { name: 'Reportar problema', exact: false }).waitFor();
            if (current === reader) await sidebar.getByRole('button', { name: 'Cerrar menu', exact: true }).click();
            assert.equal(await current.page.getByLabel('Estado del reporte', { exact: true }).count(), 0);
            await capture(current.page, current === seller ? 'vendedor-escritorio-vacio.png' : 'lectura-celular-vacio.png');
            await auth(current);
        }
    });
    await test('a seller creates a real report with a private PNG screenshot and reloads persisted detail', async () => {
        await goto(seller, '?from=' + encodeURIComponent('/admin/stock?private=discard-me'));
        sellerReport = await submitReport(seller, sellerTitle, 'vendedor-escritorio');
        const loaded = listLoaded(seller.page); await seller.page.reload({ waitUntil: 'domcontentloaded' }); assert.equal((await loaded).status(), 200);
        const dialog = await openDetail(seller, sellerTitle, sellerReport._id);
        await dialog.getByText('Guardar el formulario ficticio.', { exact: true }).waitFor();
        const image = dialog.getByAltText('captura-vendedor-escritorio-qa.png', { exact: true }); await image.waitFor();
        assert.ok(await image.evaluate(element => element.complete && element.naturalWidth > 0));
        assert.equal(await dialog.getByRole('button', { name: 'Guardar actualización', exact: true }).count(), 0);
        await capture(seller.page, 'vendedor-escritorio-detalle.png');
        await dialog.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
    });
    await test('a read-only user submits and reloads their own report on mobile without seeing another author', async () => {
        await goto(reader, '?from=%2Fadmin%2Fstock');
        assert.equal(await reader.page.getByRole('heading', { name: sellerTitle, exact: true }).count(), 0);
        readerReport = await submitReport(reader, readerTitle, 'lectura-celular');
        const loaded = listLoaded(reader.page); await reader.page.reload({ waitUntil: 'domcontentloaded' }); assert.equal((await loaded).status(), 200);
        await reader.page.getByRole('heading', { name: readerTitle, exact: true }).waitFor();
        assert.equal(await reader.page.getByRole('heading', { name: sellerTitle, exact: true }).count(), 0);
        await capture(reader.page, 'lectura-celular-listado.png');
        const dialog = await openDetail(reader, readerTitle, readerReport._id);
        await dialog.getByAltText('captura-lectura-celular-qa.png', { exact: true }).waitFor();
        await capture(reader.page, 'lectura-celular-detalle.png');
        await dialog.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
    });
    await test('an administrator updates status and responds, and the author sees the persisted response after reloading', async () => {
        await goto(admin);
        for (const title of [sellerTitle, readerTitle]) await admin.page.getByRole('heading', { name: title, exact: true }).waitFor();
        const dialog = await openDetail(admin, sellerTitle, sellerReport._id);
        await dialog.getByLabel('Estado del reporte', { exact: true }).selectOption('in_review');
        await dialog.getByLabel('Respuesta para el usuario', { exact: true }).fill('Recibimos el problema ficticio y lo estamos revisando. QA.');
        const updated = admin.page.waitForResponse(isResponse('PATCH', `${endpoint}/${sellerReport._id}`));
        await dialog.getByRole('button', { name: 'Guardar actualización', exact: true }).click();
        assert.equal((await updated).status(), 200);
        await dialog.getByText('Recibimos el problema ficticio y lo estamos revisando. QA.', { exact: true }).waitFor();
        await capture(admin.page, 'administrador-respuesta.png');
        await dialog.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
        const loaded = listLoaded(seller.page); await seller.page.reload({ waitUntil: 'domcontentloaded' }); assert.equal((await loaded).status(), 200);
        assert.equal(await seller.page.getByRole('heading', { name: readerTitle, exact: true }).count(), 0);
        const authorDialog = await openDetail(seller, sellerTitle, sellerReport._id);
        await authorDialog.getByText('En revisión', { exact: true }).waitFor();
        await authorDialog.getByText('Recibimos el problema ficticio y lo estamos revisando. QA.', { exact: true }).waitFor();
        await capture(seller.page, 'vendedor-respuesta-recibida.png');
        await authorDialog.getByRole('button', { name: 'Cerrar modal', exact: true }).click();
        await auth(seller); await auth(admin);
    });
    await test('list filters and search work and a temporary error is retryable without ending the session', async () => {
        await admin.page.getByLabel('Filtrar por estado', { exact: true }).selectOption('in_review');
        await admin.page.getByRole('heading', { name: sellerTitle, exact: true }).waitFor();
        await admin.page.getByRole('heading', { name: readerTitle, exact: true }).waitFor({ state: 'hidden' });
        await admin.page.getByLabel('Filtrar por estado', { exact: true }).selectOption('');
        await admin.page.getByLabel('Buscar reportes', { exact: true }).fill('Lectura QA');
        await admin.page.getByRole('heading', { name: readerTitle, exact: true }).waitFor();
        await admin.page.getByRole('heading', { name: sellerTitle, exact: true }).waitFor({ state: 'hidden' });
        let allowRetry = false;
        await reader.page.route('**/api/admin/issue-reports?*', route => allowRetry ? route.continue() : route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Error temporal ficticio de prueba.' }) }));
        await reader.page.goto(base + '/admin/reportar-problema', { waitUntil: 'domcontentloaded' });
        await reader.page.getByText('Error temporal ficticio de prueba.', { exact: true }).waitFor();
        await capture(reader.page, 'lectura-celular-error-reintento.png');
        await auth(reader); allowRetry = true;
        const loaded = listLoaded(reader.page); await reader.page.getByRole('button', { name: 'Reintentar', exact: true }).click(); assert.equal((await loaded).status(), 200);
        await reader.page.getByRole('heading', { name: readerTitle, exact: true }).waitFor();
        await auth(reader);
        await capture(reader.page, 'lectura-celular-reintento-recuperado.png');
    });
    assert.deepEqual(browserErrors, [], 'No uncaught browser errors');
    assert.equal(env.mailbox.length, 0, 'Report QA must not send email');
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify({ passed: true, groups: passed, fixtureOnly: true,
        realSubmissionAndPersistence: true, privatePngScreenshots: true, desktop1440: true, mobile390: true,
        adminResponseVisibleToAuthor: true, temporaryErrorRetry: true, checkedAt: new Date().toISOString() }, null, 2));
    console.log(`PASS: ${passed} isolated issue-report browser groups; synthetic sessions and loopback traffic only.`);
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
