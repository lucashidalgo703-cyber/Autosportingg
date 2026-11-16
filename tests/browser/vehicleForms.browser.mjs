// Uses only the disposable loopback preview and its normal verified fixture session.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/inventario-disponible');
fs.mkdirSync(output, { recursive: true });
const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
const token = fixture.adminSessionToken || fixture.buyerPortal?.adminSessionToken;
assert.ok(typeof token === 'string' && token.length > 20, 'requires LOCAL_BUYER_PORTAL_FIXTURES=true and its verified fictitious session');
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let page;
try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.addInitScript(({ session, userId }) => { localStorage.setItem('token', session); localStorage.setItem(`autosporting_tour_seen_${userId}`, 'true'); }, { session: token, userId: fixture.users[0].id });
    page = await context.newPage();
    await page.goto(base + '/admin/stock', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByRole('button', { name: 'Nuevo vehículo', exact: true }).click();
    const newDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Nuevo vehículo', exact: true }) });
    await newDialog.waitFor();
    assert.equal(await newDialog.getByLabel('Moneda de venta', { exact: true }).inputValue(), '');
    assert.equal(await newDialog.getByLabel('Moneda de compra o toma', { exact: true }).inputValue(), '');
    await newDialog.locator('input[name=purchasePrice]').fill('10000000');
    assert.equal(await newDialog.getByLabel('Moneda de compra o toma', { exact: true }).evaluate(element => element.required), true);
    await newDialog.locator('input[name=isSharedInvestment]').check();
    const percentage = newDialog.getByLabel('Porcentaje real del inversor', { exact: true });
    assert.equal(await percentage.inputValue(), '', 'an investment never starts at an invented50%');
    await percentage.fill('100');
    assert.equal(await percentage.evaluate(element => element.validity.valid), true);
    await percentage.fill('101');
    assert.equal(await percentage.evaluate(element => element.validity.rangeOverflow), true);
    await percentage.fill('100');
    await newDialog.getByLabel('Moneda de compra o toma', { exact: true }).selectOption('ARS');
    await page.screenshot({ path: path.join(output, '04-alta-moneda-explicita.png') });
    await newDialog.getByRole('button', { name: 'Cerrar modal', exact: true }).click();

    const carId = fixture.cars[3].id;
    const response = await page.request.get(base + '/api/admin/cars/' + carId, { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(response.status(), 200);
    // A local transport fixture simulates an actual historical MongoDB shape.
    // The backend has separate raw-collection integration coverage for this case.
    const historical = { ...await response.json(), price: 1500000, purchasePrice: 1000000,
        agencyOwned: true, investor: { name: 'Inversor ficticio sin porcentaje' }, notes: 'Nota inicial' };
    delete historical.status; delete historical.currency; delete historical.purchaseCurrency; delete historical.purchasePaymentState;
    let savedPayload;
    let historicalReads = 0;
    await page.route('**/api/admin/cars/' + carId, async route => {
        if (route.request().method() === 'GET') historicalReads++;
        if (route.request().method() === 'PATCH') {
            savedPayload = route.request().postDataJSON();
            Object.assign(historical, savedPayload);
        }
        await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Cache-Control': 'no-store' }, body: JSON.stringify(historical) });
    });
    await page.goto(base + '/admin/stock/' + carId, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.getByRole('button', { name: 'Editar Datos', exact: true }).click();
    await page.getByRole('heading', { name: 'Editar Vehículo', exact: true }).waitFor();
    assert.ok(historicalReads > 0, 'the historical transport fixture must actually supply the form');
    assert.equal(await page.getByLabel('Moneda del precio publicado', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Moneda del costo de compra o toma', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Estado operativo del vehículo', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Porcentaje real del inversor', { exact: true }).inputValue(), '');
    assert.equal(await page.locator('input[name=price]').inputValue(), '1500000');
    await page.locator('textarea[name=notes]').fill('Solo se corrigió esta observación');
    await page.screenshot({ path: path.join(output, '05-edicion-historica-sin-defaults.png') });
    const saved = page.waitForResponse(res => res.url() === base + '/api/admin/cars/' + carId && res.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Guardar Cambios', exact: true }).click();
    assert.equal((await saved).status(), 200);
    assert.deepEqual(savedPayload, { notes: 'Solo se corrigió esta observación' });
    console.log('Formularios vehículo OK: alta exige moneda de costo explícita, no50% supuesto, acepta100%inversor; nota histórica no envía moneda/estado/costo/participación inventados.');
} catch (error) {
    console.error('Page:', page?.url(), (await page?.locator('body').innerText().catch(() => '') || '').slice(0, 1800));
    if (page) await page.screenshot({ path: path.join(output, 'forms-failure.png') }).catch(() => {});
    throw error;
} finally { await browser.close(); }
