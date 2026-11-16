// Run the disposable loopback preview first. Every record created below is fictitious.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200';
const output = path.resolve('../../outputs/inventario-disponible');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let page;
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    const fixtureToken = fixture.buyerPortal?.adminSessionToken;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.addInitScript(({ userId, session }) => { localStorage.setItem(`autosporting_tour_seen_${userId}`, 'true'); if (session) localStorage.setItem('token', session); }, { userId: fixture.users[0].id, session: fixtureToken });
    page = await context.newPage();
    page.on('pageerror', error => console.error('Browser error:', error.message));
    await page.goto(base + '/admin/stock', { waitUntil: 'domcontentloaded', timeout: 180000 });
    if (!fixtureToken) {
    await page.locator('input[type=email]').waitFor({ timeout: 120000 });
    await page.locator('input[type=email]').fill('admin@example.test');
    await page.locator('input[type=password]').fill('Ficticia-Local-2026!');
    await page.getByRole('button', { name: 'INICIAR SESIÓN // LOGIN' }).click();
    await page.getByRole('heading', { name: 'Ingresá el código de 6 dígitos enviado al administrador' }).waitFor();
    const mailbox = await (await page.request.get(base + '/__test-mail.json')).json();
    const adminMail = mailbox.findLast(message => message.to === 'administrador@example.test');
    assert.ok(adminMail, 'the isolated administrator mailbox must contain the login message');
    const code = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').body.textContent.match(/\b\d{6}\b/)[0], adminMail.html);
    await page.getByLabel('Código de verificación').fill(code);
    await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 120000 });
    }
    await page.goto(base + '/admin/stock', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.locator('[data-stock-heading]').waitFor({ timeout: 120000 });
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log('Login ficticio verificado; comienza la prueba de inventario.');
    const call = async (method, route, body) => {
        const response = await page.request.fetch(base + route, { method, headers: { Authorization: 'Bearer ' + token }, ...(body ? { data: body } : {}) });
        assert.ok(response.ok(), `${response.status()} ${await response.text()}`);
        return response.json();
    };
    const baseline = await call('GET', '/api/admin/cars?tab=stock&limit=20');
    assert.ok(baseline.cars.every(car => car.status.toLowerCase() === 'disponible' && !car.sold));
    assert.equal(await page.locator('[data-stock-heading]').innerText(), `Inventario disponible (${baseline.summary.disponibles})`);
    assert.equal(await page.getByText('Inventario completo', { exact: true }).count(), 0);
    const numericBrand = `NumericaQA_${Date.now()}`;
    const carBase = { brand: numericBrand, year: 2022, km: 10000, fuel: 'Nafta', condition: 'Usado', currency: 'ARS', purchaseCurrency: 'ARS', status: 'Disponible', visibleEnWeb: false, agencyOwned: true };
    const own = await call('POST', '/api/cars', { ...carBase, name: 'Propio prueba', plateOrVin: 'NUM001QA', purchasePrice: 10000000, price: 12000000 });
    const shared = await call('POST', '/api/cars', { ...carBase, name: 'Compartido prueba', plateOrVin: 'NUM002QA', purchasePrice: 20000000, price: 24000000, investor: { name: 'Inversor ficticio', percentage: 50 } });
    const investor = await call('POST', '/api/cars', { ...carBase, name: 'Inversor prueba', plateOrVin: 'NUM003QA', purchasePrice: 15000000, price: 18000000, agencyOwned: false, investor: { name: 'Inversor ficticio', percentage: 100 } });
    const beforeSold = await call('GET', '/api/admin/cars?tab=stock&brand=' + numericBrand);
    await call('POST', '/api/cars', { ...carBase, name: 'Vendido excluido', plateOrVin: 'NUM004QA', purchasePrice: 90000000, price: 99000000, status: 'Vendido', sold: true });
    const afterSold = await call('GET', '/api/admin/cars?tab=stock&brand=' + numericBrand);
    assert.deepEqual(afterSold.filteredMetrics.cost, beforeSold.filteredMetrics.cost);
    assert.equal(afterSold.total, 3);
    assert.equal(afterSold.filteredMetrics.cost.ARS, 45000000);
    assert.equal(afterSold.filteredMetrics.ownCost.ARS, 20000000);
    assert.equal(afterSold.filteredMetrics.investorCost.ARS, 25000000);
    assert.equal(afterSold.filteredMetrics.asking.ARS, 54000000);
    assert.equal(afterSold.filteredMetrics.ownAsking.ARS, 24000000);
    assert.equal(afterSold.filteredMetrics.investorAsking.ARS, 30000000);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByLabel('Marca del vehículo').selectOption(numericBrand);
    await page.getByRole('heading', { name: `3 de ${afterSold.summary.disponibles} disponibles`, exact: true }).waitFor();
    await page.getByText(`Subtotal del filtro · 3 de ${afterSold.summary.disponibles} disponibles`, { exact: true }).click();
    const filteredCost = page.getByRole('region', { name: 'Subtotal del filtro: Capital invertido a costo', exact: true });
    const filteredAsking = page.getByRole('region', { name: 'Subtotal del filtro: Valor de venta publicado', exact: true });
    for (const text of ['45.000.000,00', '20.000.000,00', '25.000.000,00']) assert.ok((await filteredCost.innerText()).includes(text));
    for (const text of ['54.000.000,00', '24.000.000,00', '30.000.000,00']) assert.ok((await filteredAsking.innerText()).includes(text));
    await filteredCost.getByRole('button', { name: 'Ver desglose de capital invertido a costo', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Desglose: Capital invertido a costo', exact: true });
    await dialog.waitFor();
    assert.equal(await dialog.locator('tbody tr').count(), 3);
    for (const plate of ['NUM001QA', 'NUM002QA', 'NUM003QA']) assert.equal(await dialog.getByText(plate, { exact: true }).count(), 1);
    await page.screenshot({ path: path.join(output, '01-desglose-numerico.png') });
    await dialog.getByRole('button', { name: 'Cerrar desglose', exact: true }).click();
    await call('PATCH', '/api/admin/cars/' + shared._id, { status: 'Reservado' });
    await page.evaluate(() => window.dispatchEvent(new Event('crm:stock-changed')));
    await page.getByRole('heading', { name: `2 de ${afterSold.summary.disponibles - 1} disponibles`, exact: true }).waitFor();
    for (const text of ['25.000.000,00', '10.000.000,00', '15.000.000,00']) assert.ok((await filteredCost.innerText()).includes(text));
    const reserved = await call('GET', '/api/admin/cars?tab=stock&brand=' + numericBrand);
    assert.equal(reserved.filteredMetrics.cost.ARS, 25000000);
    assert.equal(reserved.filteredMetrics.ownCost.ARS, 10000000);
    assert.equal(reserved.filteredMetrics.investorCost.ARS, 15000000);
    assert.equal(await page.locator(`tr[data-stock-vehicle="${shared._id}"]`).count(), 0);
    await page.getByRole('button', { name: /Todos los estados \(/ }).click();
    await page.locator(`tr[data-stock-vehicle="${shared._id}"]`).getByText('Reservado', { exact: true }).waitFor();
    await page.locator(`tr[data-stock-vehicle="${own._id}"]`).waitFor();
    await call('PATCH', '/api/admin/cars/' + shared._id, { status: 'Disponible' });
    await call('PATCH', '/api/admin/cars/' + shared._id, { status: 'Disponible' });
    await page.getByRole('button', { name: /Inventario disponible \(/ }).click();
    await page.getByRole('heading', { name: `3 de ${afterSold.summary.disponibles} disponibles`, exact: true }).waitFor();
    assert.equal(await page.locator(`tr[data-stock-vehicle="${investor._id}"]`).count(), 1);
    // Create enough loopback-only rows to verify pagination is independent from totals.
    for (let start = 0; start < 20; start += 5) await Promise.all(Array.from({ length: 5 }, (_, index) => start + index).map(index => call('POST', '/api/cars', { ...carBase, brand: 'PaginasQA', name: `Página ficticia ${index + 1}`, plateOrVin: `PAG${String(index + 1).padStart(3, '0')}QA`, purchasePrice: 1000000, price: 2000000 })));
    await page.getByLabel('Marca del vehículo').selectOption('todas');
    await page.evaluate(() => window.dispatchEvent(new Event('crm:stock-changed')));
    const paginated = await call('GET', '/api/admin/cars?tab=stock&limit=20');
    await page.getByRole('button', { name: 'Siguiente', exact: true }).waitFor();
    const totalText = await page.getByRole('region', { name: 'Capital invertido a costo', exact: true }).innerText();
    const askingText = await page.getByRole('region', { name: 'Valor de venta publicado', exact: true }).innerText();
    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await page.getByText(`Página 2 de ${paginated.pages}`, { exact: true }).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Capital invertido a costo', exact: true }).innerText(), totalText);
    assert.equal(await page.getByRole('region', { name: 'Valor de venta publicado', exact: true }).innerText(), askingText);
    const ids = await page.locator('tr[data-stock-vehicle]').evaluateAll(rows => rows.map(row => row.dataset.stockVehicle));
    await page.screenshot({ path: path.join(output, '02-inventario-escritorio.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileIds = await page.locator('article[data-stock-vehicle]').evaluateAll(rows => rows.map(row => row.dataset.stockVehicle));
    assert.deepEqual(mobileIds, ids);
    assert.equal(await page.getByRole('region', { name: 'Capital invertido a costo', exact: true }).innerText(), totalText);
    assert.equal(await page.getByRole('region', { name: 'Valor de venta publicado', exact: true }).innerText(), askingText);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2), false);
    await page.screenshot({ path: path.join(output, '03-inventario-celular.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'Prueba-local.json'), JSON.stringify({ localOnly: true, base, numericBrand,
        vehicles: { own: own._id, shared: shared._id, investor: investor._id },
        expectedARS: { available: 3, costTotal: 45000000, agencyCost: 20000000, investorCost: 25000000,
            askingTotal: 54000000, agencyAsking: 24000000, investorAsking: 30000000 },
        reservedARS: { available: 2, costTotal: 25000000, agencyCost: 10000000, investorCost: 15000000 },
        soldExcluded: true, availableReentryWithoutDuplicate: true, paginationAndViewportTotalsMatch: true,
        checkedAt: new Date().toISOString() }, null, 2));
    console.log('Inventario disponible móvil/escritorio OK: 45/20/25 millones, vendido excluido, reserva25/10/15, regreso único, desglose porunidad, publicados54/24/30, totales idénticos al paginar y cambiar viewport.');
} catch (error) {
    console.error('Page:', page?.url(), (await page?.locator('body').innerText().catch(() => '') || '').slice(0, 2500));
    if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    throw error;
} finally { await browser.close(); }
