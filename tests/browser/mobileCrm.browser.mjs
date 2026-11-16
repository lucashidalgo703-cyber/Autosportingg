// npm run dev:mobile-preview first. All credentials, data and email are fictitious.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/crm-mejoras');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let passed = 0;
const ok = message => { passed++; console.log('ok - ' + message); };
const contexts = [];
async function newPage(viewport) {
    const context = await browser.newContext({ viewport }); contexts.push(context);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => console.error('Browser page error:', error.message));
    return page;
}
const goto = (page, route) => page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 180000 });
async function login(page, route = '/login') {
    await goto(page, route);
    await page.locator('input[type=email]').fill('admin@example.test');
    await page.locator('input[type=password]').fill('Ficticia-Local-2026!');
    await page.getByRole('button', { name: 'INICIAR SESIÓN // LOGIN' }).click();
    await page.getByRole('heading', { name: 'Ingresá el código de 6 dígitos enviado al administrador' }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('token')), null);
    const mailbox = await (await page.request.get(base + '/__test-mail.json')).json();
    const code = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/\b\d{6}\b/)[0], mailbox.at(-1).html);
    await page.getByLabel('Código de verificación').fill(code);
    await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 120000 });
    return page.evaluate(() => localStorage.getItem('token'));
}
async function api(page, method, route, body, token) {
    const response = await page.request.fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token }, ...(body ? { data: body } : {}) });
    return { status: response.status(), json: await response.json() };
}
try {
    const desktop = await newPage({ width: 1440, height: 1050 });
    const params = new URLSearchParams({ client_id: 'gastos-autosporting-local', response_type: 'code', redirect_uri: 'https://chatgpt.com/aip/g-autosporting-local/oauth/callback', state: 'browser-test-state', scope: 'expenses.write' });
    const token = await login(desktop, '/gpt/autorizar?' + params);
    await desktop.getByRole('heading', { name: 'Conectar Gastos AutoSporting' }).waitFor({ timeout: 120000 });
    await desktop.screenshot({ path: path.join(output, 'conexion-gastos.png') });
    let authorizationBody;
    await desktop.route('**/api/gpt/oauth/authorize', async route => {
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        authorizationBody = await response.json();
        await route.fulfill({ response });
    });
    const authorization = desktop.waitForResponse(response => response.url().endsWith('/api/gpt/oauth/authorize'));
    await desktop.getByRole('button', { name: 'Autorizar gastos' }).click();
    const authResponse = await authorization;
    assert.equal(authResponse.status(), 200);
    const code = new URL(authorizationBody.redirectUrl).searchParams.get('code');
    const exchange = await api(desktop, 'POST', '/api/gpt/oauth/token', { grant_type: 'authorization_code', client_id: 'gastos-autosporting-local',
        client_secret: 'local-fixture-only-never-use-in-deployment-2026', code, redirect_uri: params.get('redirect_uri') }, '');
    assert.equal(exchange.status, 200, JSON.stringify(exchange.json));
    const delegated = exchange.json.access_token;
    const fixtures = await (await desktop.request.get(base + '/__test-fixtures.json')).json();
    const context = await api(desktop, 'GET', '/api/gpt/expenses/context?vehicleQuery=Amarok', null, delegated);
    assert.equal(context.status, 200);
    assert.equal(context.json.vehicles.length, 2);
    ok('Login con código de correo y consentimiento OAuth real sin acceso general del GPT');
    const accountsBefore = await api(desktop, 'GET', '/api/admin/accounts', null, token);
    const draft = await api(desktop, 'POST', '/api/gpt/expenses/drafts', { requestId: crypto.randomUUID(), expense: {
        kind: 'workshop', amount: 85000, currency: 'ARS', concept: 'Alineación prueba dictada', paymentMethod: 'efectivo', vehicleQuery: 'Amarok Extreme'
    } }, delegated);
    assert.equal(draft.status, 201, JSON.stringify(draft.json));
    assert.equal(draft.json.readyToConfirm, false);
    assert.equal(draft.json.nextQuestion.field, 'vehicleId');
    const edited = await api(desktop, 'PATCH', `/api/gpt/expenses/drafts/${draft.json.draftId}`, { version: draft.json.version, expense: { vehicleId: fixtures.cars[0].id } }, delegated);
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    assert.equal(edited.json.readyToConfirm, true, JSON.stringify(edited.json));
    assert.match(edited.json.summary, /85\.000/);
    const confirmations = await Promise.all([1, 2].map(() => api(desktop, 'POST', `/api/gpt/expenses/drafts/${draft.json.draftId}/confirm`, { version: edited.json.version, confirmed: true }, delegated)));
    assert.ok(confirmations.every(r => r.status === 200), JSON.stringify(confirmations));
    assert.equal(confirmations[0].json.movementId, confirmations[1].json.movementId);
    const accountsAfter = await api(desktop, 'GET', '/api/admin/accounts', null, token);
    const accountRows = data => Array.isArray(data) ? data : data.accounts;
    const balance = data => accountRows(data).find(account => String(account._id) === fixtures.accounts[0].id).balance;
    assert.equal(balance(accountsBefore.json) - balance(accountsAfter.json), 85000);
    const movement = confirmations[0].json;
    await goto(desktop, movement.url);
    await desktop.getByPlaceholder('Ej: Pago servicio de limpieza').waitFor({ timeout: 60000 });
    assert.equal(await desktop.getByPlaceholder('Ej: Pago servicio de limpieza').inputValue(), 'Alineación prueba dictada');
    await desktop.getByRole('button', { name: 'REGISTRO DE GASTOS DE TALLER', exact: true }).waitFor();
    assert.equal(new URL(desktop.url()).searchParams.get('tab'), 'taller');
    await desktop.screenshot({ path: path.join(output, 'gasto-taller-confirmado.png') });
    ok('Acción de taller: ambigüedad por año/patente, vista previa, doble confirmación = un movimiento y un débito');
    await goto(desktop, '/admin/stock');
    await desktop.getByRole('searchbox', { name: 'Buscar en todo el inventario' }).fill('QA001AA');
    const row = desktop.locator(`tr[data-stock-vehicle="${fixtures.cars[0].id}"]`);
    await row.waitFor({ timeout: 180000 });
    await desktop.waitForFunction(() => document.querySelectorAll('tr[data-stock-vehicle]').length === 1);
    assert.equal(await desktop.locator('tr[data-stock-vehicle]').count(), 1);
    const desktopText = await row.innerText();
    const carAfterExpense = await api(desktop, 'GET', `/api/admin/cars/${fixtures.cars[0].id}`, null, token);
    const pesoCost = carAfterExpense.json.expenses.filter(expense => expense.currency === 'ARS').reduce((sum, expense) => sum + expense.amount, 0).toLocaleString('es-AR');
    for (const text of ['QA001AA', '32.000', '24.000', pesoCost, 'Disponible']) assert.ok(desktopText.includes(text), desktopText);
    await desktop.screenshot({ path: path.join(output, 'stock-computadora.png') });
    const mobile = await newPage({ width: 390, height: 844 });
    const mobileToken = await login(mobile);
    await goto(mobile, '/admin/stock');
    await mobile.getByRole('searchbox', { name: 'Buscar en todo el inventario' }).fill('QA001AA');
    const card = mobile.locator(`article[data-stock-vehicle="${fixtures.cars[0].id}"]`);
    await card.waitFor({ timeout: 180000 });
    await mobile.waitForFunction(() => document.querySelectorAll('article[data-stock-vehicle]').length === 1);
    assert.equal(await mobile.locator('article[data-stock-vehicle]').count(), 1);
    const mobileText = await card.innerText();
    for (const text of ['QA001AA', '32.000', '24.000', pesoCost, 'Disponible']) assert.ok(mobileText.includes(text), mobileText);
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false);
    await card.scrollIntoViewIfNeeded();
    await mobile.screenshot({ path: path.join(output, 'stock-celular.png') });
    ok('Misma unidad, estado, costo USD+ARS y precio en una fila de escritorio y una tarjeta móvil');
    // Keep Stock open while another tab sells: storage notification must refresh it.
    const sales = await desktop.context().newPage();
    await goto(sales, '/admin/mis-ventas');
    async function completeSale(plate, reserved) {
        await sales.getByRole('button', { name: 'Nueva venta', exact: false }).first().click();
        await sales.getByPlaceholder('Ej. Corolla, XEI o AB123CD').fill(plate);
        await sales.getByRole('button', { name: new RegExp(plate) }).click();
        if (reserved) {
            assert.equal(await sales.getByLabel('Nombre del comprador', { exact: true }).inputValue(), 'Cliente ficticio reservado');
            assert.equal(await sales.getByLabel('Seña aplicada (no genera un cobro)').inputValue(), '2000');
        } else await sales.getByLabel('Nombre del comprador', { exact: true }).fill('Comprador ficticio navegador');
        const response = sales.waitForResponse(r => r.url().endsWith('/api/admin/sales') && r.request().method() === 'POST');
        await sales.getByRole('button', { name: reserved ? 'Convertir reserva y confirmar' : 'Confirmar venta', exact: true }).click();
        const saved = await response;
        assert.equal(saved.status(), 201, await saved.text());
        await sales.getByRole('button', { name: 'Ver venta', exact: true }).waitFor();
        await sales.screenshot({ path: path.join(output, reserved ? 'venta-reservada-confirmada.png' : 'venta-disponible-confirmada.png') });
        await sales.getByRole('button', { name: 'Ver venta', exact: true }).click();
        await sales.getByText(plate, { exact: false }).first().waitFor();
        return saved.json();
    }
    const sold = await completeSale('QA001AA', false);
    await row.getByText('Vendido', { exact: true }).waitFor({ timeout: 60000 });
    assert.equal((await api(desktop, 'GET', `/api/admin/cars/${fixtures.cars[0].id}`, null, token)).json.status, 'Vendido');
    await goto(sales, '/admin/mis-ventas');
    const reservedSale = await completeSale('QA003AA', true);
    const reservedCar = await api(mobile, 'GET', `/api/admin/cars/${fixtures.cars[2].id}`, null, mobileToken);
    assert.equal(reservedCar.json.status, 'Vendido');
    assert.ok(sold._id && reservedSale._id);
    const finalAccounts = await api(desktop, 'GET', '/api/admin/accounts', null, token);
    assert.equal(balance(finalAccounts.json), balance(accountsAfter.json), 'conversion cannot charge the deposit again');
    ok('Mis Ventas vende disponible y convierte reserva con cliente/seña; Ver venta y Stock se actualizan sin recargar');
    console.log(`${passed} recorridos de navegador aprobados. El dictado real de ChatGPT queda pendiente de activación externa.`);
} catch (error) {
    for (const context of contexts) for (const page of context.pages()) {
        console.error('Failure page:', page.url(), (await page.locator('body').innerText().catch(() => '')).slice(0, 1800));
        await page.screenshot({ path: path.resolve('work-browser-failure.png') }).catch(() => {});
    }
    throw error;
} finally { await browser.close(); }
