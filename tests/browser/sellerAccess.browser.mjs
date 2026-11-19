// Self-contained browser QA: a loopback CRM, disposable MongoDB and synthetic identities.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { bootIsolatedReplica } from '../integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = Number(process.env.SELLER_ACCESS_QA_PORT || 3201);
const base = `http://${host}:${port}`, output = path.resolve('../../outputs/permisos-vendedores');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
fs.mkdirSync(output, { recursive: true });
const env = await bootIsolatedReplica({ listen: false });
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/(?:127\.0\.0\.1|localhost):/, 'No external server may be contacted during isolated QA');
    return originalFetch(input, options);
};
let nextApp, server, browser, failure;
const contexts = [], errors = [];
let passed = 0;
const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
try {
    const { seedSellerAccess, sellerAccessPassword } = await import('../fixtures/sellerAccessFixtures.js');
    const fixture = await seedSellerAccess(env.models);
    console.log('QA: isolated synthetic seller operations are ready.');
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_API_URL = base;
    delete process.env.TURBOPACK;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, conf: { distDir: '.next-seller-access-qa' } });
    await nextApp.prepare();
    const nextHandler = nextApp.getRequestHandler();
    server = http.createServer((request, response) => {
        const pathname = new URL(request.url, base).pathname;
        if (pathname.startsWith('/api/') && !/^\/api\/admin\/(telefonos|pedidos|infracciones)(\/|$)/.test(pathname)) return env.app(request, response);
        void nextHandler(request, response).catch(() => { if (!response.headersSent) response.writeHead(500); response.end('Error en vista de prueba aislada.'); });
    });
    await new Promise(resolve => server.listen(port, host, resolve));
    browser = await chromium.launch({ headless: true,
        executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });

    async function surface(index, width = 1440, token = true) {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' });
        contexts.push(context);
        await context.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
        await context.addInitScript(({ session, userId }) => {
            if (session) localStorage.setItem('token', session);
            localStorage.setItem('autosporting_tour_seen_' + userId, 'true');
        }, { session: token ? fixture.sessions[index].token : null, userId: String(fixture.users[index]._id) });
        const page = await context.newPage();
        page.setDefaultTimeout(45000);
        const requests = [];
        page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/api/')) requests.push(url.pathname); });
        page.on('pageerror', error => errors.push(error.message));
        return { page, requests };
    }
    const goto = (page, route) => page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
    const waitForMine = async (page, offset) => {
        await page.getByRole('heading', { name: /Mis Ventas/ }).waitFor();
        const ownName = fixture.cars[offset].brand + ' ' + fixture.cars[offset].name;
        await page.getByText(ownName, { exact: true }).filter({ visible: true }).first().waitFor();
        const otherName = fixture.cars[1 - offset].brand + ' ' + fixture.cars[1 - offset].name;
        assert.equal(await page.getByText(otherName, { exact: true }).count(), 0);
        assert.equal(await page.getByText(fixture.cars[1 - offset].plateOrVin, { exact: true }).count(), 0);
        assert.equal(await page.getByText(fixture.cars[2].plateOrVin, { exact: true }).count(), 0);
    };
    async function login(surface, index) {
        const { page } = surface;
        await goto(page, '/login?next=%2Fadmin');
        await page.locator('input[type=email]').fill(fixture.users[index].email);
        await page.locator('input[type=password]').fill(sellerAccessPassword);
        await page.getByRole('button', { name: /INICIAR SESIÓN/ }).click();
        await page.locator('#email-login-code').waitFor();
        const mail = env.mailbox.filter(message => message.to === fixture.users[index].email).at(-1);
        const code = mail?.html.match(/>\s*(\d{6})\s*</)?.[1];
        assert.ok(Boolean(code), 'A synthetic code must exist only in the local mailbox');
        await page.locator('#email-login-code').fill(code);
        await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
        await page.waitForURL(base + '/admin/mis-ventas', { timeout: 90000 });
        await waitForMine(page, index - 2);
        await page.addStyleTag({ content: 'nextjs-portal { display:none!important; }' });
    }
    const blockedRequest = route => /^\/api\/(?:admin\/(?:cars(?:\/|$)|dashboard(?:\/|$)|team-dashboard(?:\/|$)|stock\/capital-summary)|stats\/dashboard)/.test(route);
    async function screenshot(page, filename) {
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'The mobile view must fit the screen');
        await page.screenshot({ path: path.join(output, filename), fullPage: false });
    }

    const desktop = await surface(2, 1440, false), mobile = await surface(3, 390, false);
    await test('seller login routes to Mis Ventas despite a Dashboard next parameter and shows only owned sales', async () => {
        await login(desktop, 2); await login(mobile, 3);
        assert.equal(desktop.requests.some(blockedRequest), false);
        assert.equal(mobile.requests.some(blockedRequest), false);
    });
    await test('desktop menu hides Dashboard and general Ventas while exposing consultation-only Negociación', async () => {
        const sidebar = desktop.page.locator('aside:visible');
        assert.equal(await sidebar.locator('a[href="/admin"]').count(), 0);
        assert.equal(await sidebar.locator('a[href="/admin/ventas"]').count(), 0);
        await sidebar.locator('a[href="/admin/stock"]').filter({ hasText: 'Negociación' }).waitFor();
        await sidebar.locator('a[href="/admin/mis-ventas"]').waitFor();
        assert.equal(await desktop.page.getByPlaceholder('Buscar clientes, vehículos, ventas…', { exact: true }).count(), 0);
        await screenshot(desktop.page, 'vendedor-escritorio-mis-ventas.png');
    });
    await test('mobile bottom bar and expanded menu preserve the same seller restrictions', async () => {
        const navigation = mobile.page.locator('nav.fixed:visible');
        assert.equal(await navigation.locator('a').count(), 4);
        for (const route of ['/admin/stock', '/admin/clientes', '/admin/mis-ventas', '/admin/agenda']) await navigation.locator(`a[href="${route}"]`).waitFor();
        assert.equal(await navigation.locator('a[href="/admin"],a[href="/admin/ventas"]').count(), 0);
        await screenshot(mobile.page, 'vendedor-celular-mis-ventas.png');
        await mobile.page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
        const sidebar = mobile.page.locator('aside:visible');
        assert.equal(await sidebar.locator('a[href="/admin"],a[href="/admin/ventas"]').count(), 0);
        await sidebar.locator('a[href="/admin/stock"]').filter({ hasText: 'Negociación' }).waitFor();
        await screenshot(mobile.page, 'vendedor-celular-menu.png');
        await sidebar.getByRole('button', { name: 'Cerrar menu', exact: true }).click();
    });
    await test('Mi Espacio works for sellers without forbidden Stock requests or an unexpected logout', async () => {
        for (const [offset, current] of [desktop, mobile].entries()) {
            const { page } = current;
            const token = await page.evaluate(() => localStorage.getItem('token'));
            const before = current.requests.length;
            const assetsLoaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/my-space/assets' && response.request().method() === 'GET');
            await goto(page, '/admin/mi-espacio');
            assert.equal((await assetsLoaded).status(), 200);
            await page.getByRole('heading', { name: /^Mi Espacio/ }).waitFor();
            assert.equal(await page.evaluate(() => localStorage.getItem('token')), token);
            assert.equal((await page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + token } })).status(), 200);
            assert.equal(current.requests.slice(before).some(blockedRequest), false);
            assert.equal(current.requests.slice(before).includes('/api/logout'), false);
            assert.equal(await page.getByText('Tu agencia', { exact: true }).count(), 0);
            for (const route of ['/api/admin/installments', '/api/admin/transactions']) assert.equal(current.requests.slice(before).includes(route), false, 'Do not request global financial data for a seller');
            for (const tab of ['Saldo agencia', 'Pagos realizados']) assert.equal(await page.getByRole('button', { name: tab, exact: true }).count(), 0);
            await page.evaluate(async () => {
                window.dispatchEvent(new Event('crm:stock-changed'));
                window.dispatchEvent(new StorageEvent('storage', { key: 'crm:stock-changed', oldValue: 'qa-old', newValue: 'qa-new' }));
                await new Promise(resolve => setTimeout(resolve, 150));
            });
            assert.equal(current.requests.slice(before).some(blockedRequest), false, 'Stock events cannot trigger an inventory read from Mi Espacio');
            await page.getByRole('button', { name: 'Mis ventas', exact: true }).click();
            await page.getByText('Venta ' + String(fixture.sales[offset]._id).slice(-6).toUpperCase(), { exact: true }).waitFor();
            assert.equal(await page.getByText('Venta ' + String(fixture.sales[1 - offset]._id).slice(-6).toUpperCase(), { exact: true }).count(), 0);
            await page.getByRole('button', { name: 'Pendientes', exact: true }).click();
            await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
            const taskForm = page.locator('form').filter({ has: page.getByPlaceholder('Ej: Llamar al contador', { exact: true }) });
            await taskForm.getByPlaceholder('Ej: Llamar al contador', { exact: true }).fill('Pendiente privado QA ' + offset);
            const taskSaved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/crm-tasks' && response.request().method() === 'POST');
            await taskForm.getByRole('button', { name: 'Guardar tarea', exact: true }).click();
            const taskResponse = await taskSaved; assert.equal(taskResponse.status(), 201);
            assert.equal(String((await taskResponse.json()).assignedTo), String(fixture.users[offset + 2]._id));
            await page.getByRole('heading', { name: 'Nueva tarea', exact: true }).waitFor({ state: 'hidden' });
            await page.getByText('Pendiente privado QA ' + offset, { exact: true }).waitFor();
            assert.equal(await page.getByText('Pendiente privado QA ' + (1 - offset), { exact: true }).count(), 0);
            await page.getByRole('button', { name: 'Mis autos', exact: true }).click();
            await page.getByRole('button', { name: 'Nuevo auto personal', exact: true }).click();
            const form = page.locator('form').filter({ has: page.getByPlaceholder('Ej: Volkswagen', { exact: true }) });
            await form.getByPlaceholder('Ej: Volkswagen', { exact: true }).fill('PersonalQA');
            await form.getByPlaceholder('Ej: Amarok V6', { exact: true }).fill('Mi espacio ' + offset);
            await form.getByPlaceholder('Ej: 35000', { exact: true }).fill('1000');
            const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/my-space/assets' && response.request().method() === 'POST');
            await form.getByRole('button', { name: 'Guardar auto', exact: true }).click();
            assert.equal((await saved).status(), 201);
            await page.getByRole('heading', { name: 'Nuevo Auto Personal', exact: true }).waitFor({ state: 'hidden' });
            await page.getByText('PersonalQA Mi espacio ' + offset, { exact: false }).waitFor();
            assert.equal(await page.getByText('PersonalQA Mi espacio ' + (1 - offset), { exact: false }).count(), 0);
            assert.equal(await page.evaluate(() => localStorage.getItem('token')), token);
            await screenshot(page, offset === 0 ? 'vendedor-escritorio-mi-espacio.png' : 'vendedor-celular-mi-espacio.png');
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.getByRole('heading', { name: /^Mi Espacio/ }).waitFor();
            assert.equal(await page.evaluate(() => localStorage.getItem('token')), token);
            assert.equal((await page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + token } })).status(), 200);
            await page.getByRole('button', { name: 'Pendientes', exact: true }).click();
            await page.getByText('Pendiente privado QA ' + offset, { exact: true }).waitFor();
            assert.equal(await page.getByText('Pendiente privado QA ' + (1 - offset), { exact: true }).count(), 0);
            assert.equal(current.requests.slice(before).some(blockedRequest), false);
            assert.equal(current.requests.slice(before).includes('/api/logout'), false);
            await goto(page, '/admin/mis-ventas'); await waitForMine(page, offset);
        }
        await goto(desktop.page, '/admin/mi-espacio');
        await desktop.page.getByRole('heading', { name: /^Mi Espacio/ }).waitFor();
        await desktop.page.getByRole('button', { name: 'Pendientes', exact: true }).click();
        await desktop.page.getByText('Pendiente privado QA 0', { exact: true }).waitFor();
        assert.equal(await desktop.page.getByText('Pendiente privado QA 1', { exact: true }).count(), 0);
        await goto(desktop.page, '/admin/mis-ventas'); await waitForMine(desktop.page, 0);
    });
    await test('a seller opens their complete file from Mis Ventas and returns there without visiting Stock or global Ventas', async () => {
        for (const [offset, current] of [desktop, mobile].entries()) {
            const { page } = current;
            if (current === desktop) await page.getByTitle('Ver detalle de venta', { exact: true }).click();
            else await page.getByRole('button', { name: 'Ver detalle', exact: true }).click();
            const fullFile = page.getByRole('link', { name: 'Abrir ficha completa', exact: true });
            const destination = await fullFile.getAttribute('href');
            assert.ok(destination.startsWith('/admin/mis-ventas/' + fixture.sales[offset]._id));
            await fullFile.click();
            await page.getByRole('heading', { name: 'Expediente Comercial', exact: true }).waitFor();
            assert.equal(new URL(page.url()).pathname, '/admin/mis-ventas/' + fixture.sales[offset]._id);
            assert.equal(await page.locator(`a[href^="/admin/stock/${fixture.cars[offset]._id}"]`).count(), 0);
            await page.getByRole('link', { name: 'Volver a Mis Ventas', exact: true }).click();
            await waitForMine(page, offset);
            const response = page.waitForResponse(result => new URL(result.url()).pathname === '/api/admin/sales/' + fixture.sales[1 - offset]._id);
            await goto(page, '/admin/mis-ventas/' + fixture.sales[1 - offset]._id);
            assert.ok([403, 404].includes((await response).status()));
            assert.equal(await page.getByRole('heading', { name: 'Expediente Comercial', exact: true }).count(), 0);
            assert.equal(await page.getByText(fixture.cars[1 - offset].plateOrVin, { exact: true }).count(), 0);
            await goto(page, '/admin/mis-ventas'); await waitForMine(page, offset);
        }
    });
    await test('the Reservas chip shows only the current seller’s reservation and preserves the Todas sales view', async () => {
        for (const [offset, current] of [desktop, mobile].entries()) {
            const { page } = current;
            await page.getByRole('button', { name: 'Reservas', exact: true }).click();
            const own = fixture.cars[3 + offset], foreign = fixture.cars[4 - offset];
            await page.getByText(own.brand + ' ' + own.name, { exact: true }).filter({ visible: true }).first().waitFor();
            assert.equal(await page.getByText(foreign.brand + ' ' + foreign.name, { exact: true }).count(), 0);
            assert.equal(await page.locator('a[href^="/admin/stock/"]').count(), 0);
            await screenshot(page, current === desktop ? 'vendedor-escritorio-reservas.png' : 'vendedor-celular-reservas.png');
            await page.getByRole('button', { name: 'Todas', exact: true }).click();
            await waitForMine(page, offset);
        }
    });
    await test('direct Dashboard, global sales and vehicle-detail URLs redirect before protected data mounts', async () => {
        for (const current of [desktop, mobile]) for (const route of ['/admin', '/admin/ventas', '/admin/stock/' + fixture.cars[5]._id]) {
            const before = current.requests.length;
            await goto(current.page, route);
            await current.page.waitForURL(base + '/admin/mis-ventas', { timeout: 60000 });
            await waitForMine(current.page, current === desktop ? 0 : 1);
            assert.equal(current.requests.slice(before).some(blockedRequest), false, 'Denied children cannot mount or fetch general Dashboard/Stock data');
        }
    });
    await test('seller Stock renders only Negociación on desktop and mobile, with working simulation and no configuration', async () => {
        for (const current of [desktop, mobile]) {
            const before = current.requests.length;
            await goto(current.page, '/admin/stock?tab=inventory');
            const panel = current.page.locator('[data-stock-negotiation]');
            const search = panel.getByLabel('Buscar unidad disponible', { exact: true }); await search.waitFor();
            const loaded = current.page.waitForResponse(response => {
                const url = new URL(response.url()); return url.pathname === '/api/admin/stock/negotiation' && url.searchParams.get('search') === 'QANEGOCIA';
            });
            await search.fill('QANEGOCIA'); assert.equal((await loaded).status(), 200);
            const unit = panel.locator(`[data-negotiation-row="${fixture.cars[5]._id}"], [data-negotiation-card="${fixture.cars[5]._id}"]`).filter({ visible: true });
            await unit.waitFor();
            assert.equal(await panel.getByRole('button', { name: /Configurar mínimo general|Mínimo de la unidad/ }).count(), 0);
            assert.equal(await current.page.getByRole('button', { name: /Nuevo vehículo|Agregar unidad|Exportar stock|Inventario/i }).count(), 0);
            await unit.getByRole('button', { name: 'Probar oferta', exact: true }).click();
            const offer = panel.locator(`[data-negotiation-offer="${fixture.cars[5]._id}"]`);
            await offer.getByRole('textbox').fill('16000000');
            await offer.getByRole('button', { name: 'Calcular oferta', exact: true }).click();
            await offer.locator('[data-negotiation-offer-result][data-result="at_floor"]').waitFor();
            assert.equal(current.requests.slice(before).some(blockedRequest), false);
            await screenshot(current.page, current === desktop ? 'vendedor-escritorio-negociacion.png' : 'vendedor-celular-negociacion.png');
        }
    });
    await test('administrator and owner retain Dashboard, inventory and all-operation navigation', async () => {
        for (const index of [0, 1]) {
            const current = await surface(index);
            await goto(current.page, '/admin/stock');
            const sidebar = current.page.locator('aside:visible');
            await sidebar.locator('a[href="/admin"]').waitFor();
            await sidebar.locator('a[href="/admin/ventas"]').waitFor();
            await current.page.getByRole('button', { name: 'Negociación', exact: true }).waitFor();
            assert.equal(new URL(current.page.url()).pathname, '/admin/stock');
        }
    });
    await test('a denied Stock request keeps a valid session while an invalid session still requires login', async () => {
        const denied = await surface(0);
        await denied.page.route('**/api/admin/cars?**', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Acceso de prueba no permitido.' }) }));
        const response = denied.page.waitForResponse(result => new URL(result.url()).pathname === '/api/admin/cars' && result.status() === 403);
        await goto(denied.page, '/admin/stock'); await response;
        await denied.page.getByText('Acceso de prueba no permitido.', { exact: true }).first().waitFor();
        assert.equal(await denied.page.evaluate(() => localStorage.getItem('token')), fixture.sessions[0].token);
        assert.equal((await denied.page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + fixture.sessions[0].token } })).status(), 200);
        assert.equal(denied.requests.includes('/api/logout'), false);
        await denied.page.close();

        const expired = await surface(0);
        await expired.page.route('**/api/admin/cars?**', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Sesión de prueba vencida.' }) }));
        await goto(expired.page, '/admin/stock');
        await expired.page.waitForURL(base + '/login', { timeout: 60000 });
        assert.equal(await expired.page.evaluate(() => localStorage.getItem('token')), null);
    });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log(`PASS: ${passed} isolated seller browser scenarios. Screenshots: ${output}`);
} catch (error) {
    failure = error;
    for (const context of contexts) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'fallo-' + contexts.indexOf(context) + '.png') }).catch(() => {});
} finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (nextApp) await Promise.race([nextApp.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
    globalThis.fetch = originalFetch;
    await env.stop();
}
if (failure) console.error(failure);
process.exit(failure ? 1 : 0);
