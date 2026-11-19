// Live Next/Express browser checks using disposable MongoDB and fictional accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { bootIsolatedReplica } from '../integration/isolatedReplicaHarness.js';

const host = '127.0.0.1', port = Number(process.env.MANAGED_ROLES_QA_PORT || 3202);
const base = `http://${host}:${port}`, output = path.resolve('../../outputs/roles-aprobaciones');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
fs.mkdirSync(output, { recursive: true });
const env = await bootIsolatedReplica({ listen: false });
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/(?:127\.0\.0\.1|localhost):/, 'Only isolated loopback services may be contacted');
    return originalFetch(input, options);
};
let nextApp, server, browser, failure, passed = 0, groupNumber = 0;
const startGroup = Math.max(1, Number(process.env.QA_START_GROUP) || 1);
const contexts = [], errors = [];
const test = async (name, callback) => {
    if (++groupNumber < startGroup) { console.log(`skip ${groupNumber} - ${name} (resume after previously verified group)`); return; }
    await callback(); console.log(`ok ${++passed} - ${name}`);
};
try {
    const { seedManagedRoles } = await import('../fixtures/managedRolesFixtures.js');
    const fixture = await seedManagedRoles(env.models);
    console.log('QA: fictional seller and case-management profiles are ready.');
    process.env.NODE_ENV = 'development'; process.env.NEXT_PUBLIC_API_URL = base; delete process.env.TURBOPACK;
    const next = (await import('next')).default;
    nextApp = next({ dev: true, webpack: true, hostname: host, port, conf: { distDir: '.next-managed-roles-qa' } });
    await nextApp.prepare();
    const nextHandler = nextApp.getRequestHandler();
    server = http.createServer((request, response) => {
        const pathname = new URL(request.url, base).pathname;
        if (pathname.startsWith('/api/') && !/^\/api\/admin\/(telefonos|pedidos|infracciones)(\/|$)/.test(pathname)) return env.app(request, response);
        void nextHandler(request, response).catch(() => { if (!response.headersSent) response.writeHead(500); response.end('Error en prueba aislada.'); });
    });
    await new Promise(resolve => server.listen(port, host, resolve));
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
        args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });

    async function surface(index, width = 1440, sessionToken = fixture.sessions[index].token) {
        const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 1000 }, reducedMotion: 'reduce' });
        contexts.push(context);
        await context.route('**/*', route => new URL(route.request().url()).hostname === host ? route.continue() : route.abort());
        await context.addInitScript(({ token, userId }) => { localStorage.setItem('token', token); localStorage.setItem('autosporting_tour_seen_' + userId, 'true'); window.print = () => {}; },
            { token: sessionToken, userId: String(fixture.users[index]._id) });
        const page = await context.newPage(); page.setDefaultTimeout(45000);
        const requests = [], responses = [];
        page.on('request', request => { const pathname = new URL(request.url()).pathname; if (/^\/api(?:\/|-)/.test(pathname)) requests.push(pathname); });
        page.on('response', response => { const pathname = new URL(response.url()).pathname; if (/^\/api(?:\/|-)/.test(pathname)) responses.push({ pathname, status: response.status() }); });
        page.on('pageerror', error => errors.push(error.message));
        return { page, requests, responses, index, token: sessionToken };
    }
    const goto = async (page, route) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try { return await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 }); }
            catch (error) {
                // Next development compilation can abort a navigation for Fast Refresh.
                if (attempt === 2 || !String(error.message).includes('net::ERR_ABORTED') || page.isClosed()) throw error;
                await page.waitForTimeout(250);
            }
        }
    };
    const blocked = route => /^\/api\/(?:admin\/(?:cars(?:\/|$)|dashboard(?:\/|$)|team-dashboard(?:\/|$)|transactions(?:\/|$)|installments(?:\/|$)|stock\/capital-summary)|stats\/dashboard)/.test(route);
    const stillAuthenticated = async current => {
        assert.equal(await current.page.evaluate(() => localStorage.getItem('token')), current.token);
        assert.equal((await current.page.request.get(base + '/api/admin/auth/me', { headers: { Authorization: 'Bearer ' + current.token } })).status(), 200);
        assert.equal(current.requests.includes('/api/logout'), false);
    };
    const capture = async (page, filename) => {
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: 'nextjs-portal { display:none!important; }' });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'The page must fit the mobile viewport');
        await page.screenshot({ path: path.join(output, filename), fullPage: false });
    };
    const modules = [
        ['/admin/gestoria', /Gestoría/, '/api-gestoria'],
        ['/admin/clientes', /Clientes/, '/api/admin/clients'],
        ['/admin/stock', null, '/api/admin/stock/negotiation'],
        ['/admin/mis-ventas', /Mis Ventas/, '/api/admin/sales'],
        ['/admin/expedientes', /Expedientes/, '/api/admin/gestoria/sales'],
        ['/admin/mis-comisiones', /Mis Comisiones/, '/api/admin/my-commissions'],
        ['/admin/oportunidades', /Oportunidades/, '/api/admin/opportunities'],
        ['/admin/agenda', /Calendario|Agenda/, '/api/admin/crm-tasks'],
        ['/admin/alertas', /Alertas/, '/api/admin/sales'],
        ['/admin/reportes', /Reportes/, '/api/admin/sales'],
        ['/admin/reportes/imprimir', /Reporte de mi actividad/i, '/api/admin/sales'],
        ['/admin/mi-espacio', /Mi Espacio/, '/api/admin/my-space/assets']
    ];
    const profiles = [await surface(2, 1440), await surface(3, 390)];
    await test('all requested sections load for seller and case-management profiles without closing the session', async () => {
        const deniedQueries = [];
        for (const current of profiles) for (const [route, heading, endpoint] of modules) {
            const beforeRequests = current.requests.length, beforeResponses = current.responses.length;
            const loaded = current.page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.request().method() === 'GET');
            await goto(current.page, route); assert.equal((await loaded).status(), 200, `${current.index} ${route} must load its data`);
            if (heading) await current.page.getByRole('heading', { name: heading }).first().waitFor();
            else await current.page.locator('[data-stock-negotiation]').waitFor();
            await stillAuthenticated(current);
            assert.equal(current.requests.slice(beforeRequests).some(blocked), false, route + ' cannot read general inventory or Dashboard');
            deniedQueries.push(...current.responses.slice(beforeResponses).filter(item => [401, 403].includes(item.status)).map(item => ({ ...item, route, profile: current.index })));
            if (route === '/admin/gestoria' || route === '/admin/mi-espacio' || route === '/admin/reportes') await capture(current.page,
                (current.index === 2 ? 'vendedor-escritorio-' : 'gestoria-celular-') + route.split('/').at(-1) + '.png');
            console.log(`QA: profile ${current.index} ${route} preserved its session.`);
        }
        assert.deepEqual(deniedQueries, [], 'Enabled sections must not request forbidden modules');
    });
    await test('both profiles retain restricted Dashboard, general sales, Stock and financial boundaries', async () => {
        for (const current of profiles) {
            for (const route of ['/admin', '/admin/ventas', '/admin/stock/' + fixture.cars[5]._id]) {
                await goto(current.page, route); await current.page.waitForURL(base + '/admin/mis-ventas'); await stillAuthenticated(current);
            }
            for (const route of ['/api/admin/dashboard', '/api/admin/cars', '/api/admin/transactions', '/api/admin/installments']) {
                assert.equal((await current.page.request.get(base + route, { headers: { Authorization: 'Bearer ' + current.token } })).status(), 403);
                await stillAuthenticated(current);
            }
        }
    });
    await test('case management opens and updates another seller’s documentation file without visiting Stock or ending the session', async () => {
        const current = profiles[1], id = fixture.sales[0]._id;
        const before = current.requests.length;
        const loaded = current.page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/gestoria/sales/' + id);
        await goto(current.page, '/admin/expedientes/' + id + '?returnTo=%2Fadmin%2Fgestoria'); assert.equal((await loaded).status(), 200);
        await current.page.getByRole('heading', { name: 'Expediente y documentación', exact: true }).waitFor();
        await current.page.getByLabel(/^Estado del expediente/).selectOption('observado');
        const saved = current.page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/gestoria/sales/' + id && response.request().method() === 'PATCH');
        await current.page.getByRole('button', { name: 'Guardar expediente', exact: true }).click(); assert.equal((await saved).status(), 200);
        await current.page.getByText('Expediente actualizado.', { exact: true }).waitFor();
        await stillAuthenticated(current); await capture(current.page, 'expediente-gestoria-celular.png');
        await current.page.reload({ waitUntil: 'domcontentloaded' });
        await current.page.getByLabel(/^Estado del expediente/).waitFor();
        assert.equal(await current.page.getByLabel(/^Estado del expediente/).inputValue(), 'observado');
        const back = current.page.getByRole('link', { name: 'Volver a Gestoría', exact: true }); assert.equal(await back.getAttribute('href'), '/admin/gestoria');
        await back.click(); await current.page.getByRole('heading', { name: /Gestoría/ }).waitFor();
        await stillAuthenticated(current); assert.equal(current.requests.slice(before).some(blocked), false);
    });
    await test('a seller submits a vehicle on mobile and the owner reviews its concrete details before approval', async () => {
        const seller = await surface(2, 390), owner = await surface(1, 390);
        await goto(seller.page, '/admin/stock');
        await seller.page.getByRole('button', { name: 'Solicitar alta de vehículo', exact: true }).click();
        await seller.page.getByLabel('Marca', { exact: true }).fill('AltaVehiculoQA');
        await seller.page.getByLabel('Modelo y versión', { exact: true }).fill('Modelo UI QA');
        await seller.page.getByLabel('Año', { exact: true }).fill('2024');
        await seller.page.getByLabel('Kilometraje', { exact: true }).fill('1000');
        await seller.page.getByLabel('Precio publicado', { exact: true }).fill('20000000');
        await seller.page.getByLabel('Patente / VIN', { exact: true }).fill('QAUIALTA');
        await seller.page.getByLabel('Costo de compra (opcional)', { exact: true }).fill('14000000');
        await seller.page.getByLabel(/^Moneda del costo/).selectOption('ARS');
        await capture(seller.page, 'solicitud-vehiculo-celular.png');
        const submitted = seller.page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/intake/vehicles' && response.request().method() === 'POST');
        await seller.page.getByRole('button', { name: 'Enviar para autorización', exact: true }).click();
        const result = await submitted; assert.equal(result.status(), 202);
        const approval = (await result.json()).approval; assert.ok(approval?._id);
        await seller.page.getByText('Solicitud recibida · Pendiente de autorización del titular.', { exact: true }).waitFor();
        assert.equal(await env.models.Car.countDocuments({ plateOrVin: 'QAUIALTA' }), 0);
        await stillAuthenticated(seller);
        await goto(owner.page, '/admin/autorizaciones');
        const card = owner.page.locator(`[data-approval-id="${approval._id}"]`); await card.waitFor();
        await capture(owner.page, 'autorizaciones-celular.png');
        await card.getByRole('button', { name: 'Aprobar alta', exact: true }).click();
        await owner.page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).waitFor();
        await owner.page.getByRole('dialog').getByText('QAUIALTA', { exact: true }).waitFor();
        await capture(owner.page, 'revision-alta-vehiculo-celular.png');
        const approved = owner.page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/approvals/' + approval._id && response.request().method() === 'PATCH');
        await owner.page.getByRole('button', { name: 'Confirmar aprobación', exact: true }).click();
        assert.equal((await approved).status(), 200);
        assert.equal(await env.models.Car.countDocuments({ plateOrVin: 'QAUIALTA' }), 1);
        await stillAuthenticated(owner); await stillAuthenticated(seller);
    });
    await test('a late permission denial in each newly enabled data hook preserves the token', async () => {
        for (const [route, heading, endpoint] of modules.filter(item => !['/admin/stock', '/admin/alertas', '/admin/reportes', '/admin/mi-espacio'].includes(item[0]))) {
            const current = profiles[0];
            const pattern = new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\?|$)');
            await current.page.route(pattern, handler => handler.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Permiso de prueba denegado.', error: 'Permiso de prueba denegado.' }) }));
            const denied = current.page.waitForResponse(response => new URL(response.url()).pathname === endpoint && response.status() === 403);
            await goto(current.page, route); await denied;
            if (heading) await current.page.getByRole('heading', { name: heading }).first().waitFor();
            await stillAuthenticated(current); await current.page.unroute(pattern);
        }
    });
    // The owner reviews the same role profiles and pending requests used by the live CRM.
    await test('Configuration exposes assignable role descriptions on desktop and mobile', async () => {
        const owner = await surface(1), ownerMobile = await surface(1, 390);
        for (const current of [owner, ownerMobile]) {
            await goto(current.page, '/admin/configuracion/usuarios');
            await current.page.getByText('Lucas ficticio QA', { exact: true }).waitFor();
            await current.page.getByRole('table').getByText('Gestoría / Contabilidad', { exact: true }).waitFor();
            await capture(current.page, current === owner ? 'configuracion-roles-escritorio.png' : 'configuracion-roles-celular.png');
            await stillAuthenticated(current);
        }
    });
    await test('refreshing an existing session applies the account’s current role and permissions without another login', async () => {
        const maia = await surface(3, 390, fixture.previousSessions[3].token);
        assert.equal(JSON.parse(Buffer.from(maia.token.split('.')[1], 'base64url').toString()).role, 'ventas');
        const loaded = maia.page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/stock/negotiation');
        await goto(maia.page, '/admin/stock'); assert.equal((await loaded).status(), 200);
        assert.equal(await maia.page.getByRole('button', { name: 'Solicitar alta de vehículo', exact: true }).count(), 0);
        await stillAuthenticated(maia);
        await maia.page.reload({ waitUntil: 'domcontentloaded' });
        await maia.page.locator('[data-stock-negotiation]').waitFor();
        assert.equal(await maia.page.getByRole('button', { name: 'Solicitar alta de vehículo', exact: true }).count(), 0);
        const tasks = maia.page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/crm-tasks');
        await goto(maia.page, '/admin/agenda'); assert.equal((await tasks).status(), 200);
        await stillAuthenticated(maia);
        assert.equal(maia.requests.some(route => ['/api/admin/leads', '/api/leads'].includes(route)), false);
        const lucas = await surface(2, 1440, fixture.previousSessions[2].token);
        const sales = lucas.page.waitForResponse(response => new URL(response.url()).pathname === '/api/admin/sales');
        await goto(lucas.page, '/admin/mis-ventas'); assert.equal((await sales).status(), 200);
        await lucas.page.getByRole('heading', { name: /Mis Ventas/ }).waitFor();
        await stillAuthenticated(lucas);
        assert.equal(lucas.requests.includes('/api/admin/team-goals/progress'), false);
    });
    assert.deepEqual(errors, [], 'No uncaught browser errors');
    console.log(`PASS: ${passed} isolated managed-role browser scenarios. Screenshots: ${output}`);
} catch (error) {
    failure = error;
    for (const [index, context] of contexts.entries()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, `fallo-${index}.png`) }).catch(() => {});
} finally {
    if (browser) await browser.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    if (nextApp) await Promise.race([nextApp.close(), new Promise(resolve => setTimeout(resolve, 5000))]);
    globalThis.fetch = originalFetch; await env.stop();
}
if (failure) console.error(failure);
process.exit(failure ? 1 : 0);
