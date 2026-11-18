// Uses the loopback-only disposable CRM preview. Never opens a production URL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://127.0.0.1:3200', output = path.resolve('../../outputs/stock-negociacion');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
let page, adminToken;
const contexts = [], errors = [], businessWrites = [];
const api = async (method, route, body, token = adminToken, expected = 200) => {
    assert.ok(route.startsWith('/api/'), 'only a local CRM API can be called');
    const response = await fetch(base + route, { method, signal: AbortSignal.timeout(20000), headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({})); assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`); return data;
};
async function surface(token, userId, width = 1440) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' }); contexts.push(context);
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await context.addInitScript(({ session, id }) => { localStorage.setItem('token', session); localStorage.setItem('autosporting_tour_seen_' + id, 'true'); }, { session: token, id: userId });
    const p = await context.newPage(); p.setDefaultTimeout(45000);
    p.on('pageerror', error => errors.push(error.message));
    p.on('request', request => { if (request.method() === 'POST' && /^\/api\/admin\/(sales|reservations)(\/|$)/.test(new URL(request.url()).pathname)) businessWrites.push(new URL(request.url()).pathname); });
    await p.goto(base + '/admin/stock', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await p.getByRole('button', { name: 'Negociación', exact: true }).click();
    await p.locator('[data-stock-negotiation]').getByLabel('Buscar unidad disponible', { exact: true }).waitFor();
    await p.addStyleTag({ content: 'nextjs-portal { display: none !important; }' }); return { page: p, context };
}
async function filter(p, value, ids = []) {
    const panel = p.locator('[data-stock-negotiation]');
    const response = p.waitForResponse(result => { const url = new URL(result.url()); return url.pathname === '/api/admin/stock/negotiation' && url.searchParams.get('search') === value && result.request().method() === 'GET'; });
    response.catch(() => {});
    await panel.getByLabel('Buscar unidad disponible', { exact: true }).fill(value);
    assert.equal((await response).status(), 200);
    if (ids.length) for (const id of ids) await p.locator(`[data-negotiation-row="${id}"], [data-negotiation-card="${id}"]`).waitFor();
    return panel;
}
async function capture(p, locator, filename) {
    await p.evaluate(() => document.fonts.ready);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), true, 'negotiation must fit the viewport');
    await locator.scrollIntoViewIfNeeded(); await locator.screenshot({ path: path.join(output, filename), style: 'nav.fixed { visibility: hidden !important; }' });
}
async function saveRule(p, form, buttonName, search) {
    const refresh = p.waitForResponse(result => { const url = new URL(result.url()); return url.pathname === '/api/admin/stock/negotiation' && url.searchParams.get('search') === search && result.request().method() === 'GET'; }); refresh.catch(() => {});
    await form.getByRole('button', { name: buttonName, exact: true }).click();
    await form.waitFor({ state: 'detached' });
    assert.equal((await refresh).status(), 200);
    await p.waitForFunction(() => !Array.from(document.querySelectorAll('[data-stock-negotiation] [role="status"]')).some(node => node.textContent === 'Consultando precios y ganancias…'));
}
async function simulate(p, id, amount, expected) {
    const panel = p.locator('[data-stock-negotiation]');
    const offer = panel.locator(`[data-negotiation-offer="${id}"]`);
    if (!await offer.count()) await panel.locator(`[data-negotiation-row="${id}"], [data-negotiation-card="${id}"]`).getByRole('button', { name: 'Probar oferta', exact: true }).click();
    await offer.getByRole('textbox').fill(String(amount));
    const response = p.waitForResponse(r => new URL(r.url()).pathname.endsWith('/' + id + '/simulate') && r.request().method() === 'POST'); response.catch(() => {});
    await offer.getByRole('button', { name: 'Calcular oferta', exact: true }).click();
    const sent = await response; assert.equal(sent.status(), 200); const result = await sent.json();
    assert.equal(result.status, expected);
    await offer.locator(`[data-negotiation-offer-result][data-result="${expected}"]`).waitFor();
    return result;
}
try {
    const fixture = await (await fetch(base + '/__test-fixtures.json')).json();
    adminToken = fixture.negotiation?.adminSessionToken || fixture.buyerPortal?.adminSessionToken;
    const sellerToken = fixture.negotiation?.sellerSessionToken || fixture.buyerPortal?.sellerSessionToken || fixture.sessions?.[1]?.token;
    const readOnlyToken = fixture.negotiation?.readOnlySessionToken || fixture.sessions?.[3]?.token;
    assert.ok(adminToken && sellerToken, 'requires local administrator and seller fixture sessions');
    const tag = String(Date.now()), brand = 'NegociacionQA' + tag, plates = [1, 2, 3, 4].map(index => 'NG' + tag + index);
    const carBase = { brand, year: 2024, km: 10000, fuel: 'Nafta', condition: 'Usado', currency: 'ARS', purchaseCurrency: 'ARS', status: 'Disponible', sold: false, visibleEnWeb: false, agencyOwned: true };
    const own = await api('POST', '/api/cars', { ...carBase, name: 'Propio negociación ficticia', plateOrVin: plates[0], purchasePrice: 10000000, price: 16000000,
        expenses: [{ concept: 'Gasto ficticio imputado una vez', amount: 1000000, currency: 'ARS', paidBy: 'agency' }] }, adminToken, 201);
    const shared = await api('POST', '/api/cars', { ...carBase, name: 'Compartido negociación ficticia', plateOrVin: plates[1], purchasePrice: 20000000, price: 28000000,
        investor: { name: 'Socio ficticio', percentage: 40 }, jointOwnership: { hasPartner: true, partnerPercentage: 40, agencyPercentage: 60, partnerName: 'Socio ficticio', currency: 'ARS' } }, adminToken, 201);
    const pending = await api('POST', '/api/cars', { ...carBase, name: 'Costo pendiente ficticio', plateOrVin: plates[2], price: 19000000 }, adminToken, 201);
    const below = await api('POST', '/api/cars', { ...carBase, name: 'Publicado a revisar ficticio', plateOrVin: plates[3], purchasePrice: 14000000, price: 14500000 }, adminToken, 201);
    console.log('QA: four unique fictional units created.');
    const ids = [own, shared, pending, below].map(row => String(row._id || row.id)); assert.equal(new Set(ids).size, 4);
    const baseline = await api('GET', '/api/admin/cars/' + ids[0]);
    const admin = await surface(adminToken, fixture.users[0].id); page = admin.page;
    let panel = await filter(page, brand, ids);
    console.log('QA: desktop negotiation tab and search loaded.');
    await panel.getByRole('button', { name: 'Configurar mínimo general', exact: true }).click();
    const general = panel.getByRole('form', { name: 'Ganancia mínima general', exact: true });
    await general.getByLabel('Tipo de mínimo', { exact: true }).selectOption('amount');
    await general.getByLabel('Ganancia mínima (ARS)', { exact: true }).fill('1000000');
    await saveRule(page, general, 'Guardar mínimo general', brand);
    await panel.getByText('Mínimo general actualizado.', { exact: true }).waitFor();
    console.log('QA: general minimum saved through UI.');
    const data = await api('GET', '/api/admin/stock/negotiation?search=' + encodeURIComponent(brand));
    assert.equal(data.items.length, 4); assert.equal(data.canConfigure, true);
    let ownRow = data.items.find(row => row.id === ids[0]), sharedRow = data.items.find(row => row.id === ids[1]);
    assert.equal(ownRow.status, 'ready'); assert.equal(ownRow.totalCost, 11000000, 'purchase plus one registered expense');
    assert.equal(data.items.find(row => row.id === ids[2]).status, 'pending');
    assert.equal(data.items.find(row => row.id === ids[3]).status, 'below_floor');
    assert.equal(sharedRow.ownership.shared, true); assert.ok(sharedRow.steps.some(step => Number.isFinite(step.agencyProfit) && step.agencyProfit !== step.profit));
    for (const name of ['Publicado', 'Primera rebaja', 'Cierre sugerido', 'Piso autorizado']) await panel.getByRole('columnheader', { name, exact: true }).waitFor();
    await panel.getByText('Revisar precio publicado', { exact: true }).waitFor();
    const at = await simulate(page, ids[0], ownRow.floor, 'at_floor'); assert.equal(at.message, 'Estás en el piso autorizado');
    await simulate(page, ids[0], ownRow.floor - 1, 'below_floor'); await panel.getByText(/Requiere autorización: faltan/).waitFor();
    await simulate(page, ids[0], ownRow.floor + 100000, 'above_floor'); await panel.getByText(/Podés cotizar y todavía podés bajar/).waitFor();
    await capture(page, panel, 'negociacion-escritorio.png');
    await page.setViewportSize({ width: 1280, height: 1000 });
    await capture(page, panel, 'negociacion-escritorio-1280.png');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await simulate(page, ids[2], 18000000, 'pending');
    console.log('QA: desktop boundary simulations and screenshot passed.');
    await panel.locator(`[data-negotiation-row="${ids[0]}"]`).getByRole('button', { name: 'Mínimo de la unidad', exact: true }).click();
    const particular = panel.getByRole('form', { name: 'Mínimo de ' + (ownRow.title || [ownRow.brand, ownRow.model, ownRow.year].filter(Boolean).join(' ')), exact: true });
    await particular.getByLabel('Tipo de mínimo', { exact: true }).selectOption('percent');
    await particular.getByLabel('Porcentaje mínimo (%)', { exact: true }).fill('20');
    await saveRule(page, particular, 'Guardar excepción', brand);
    let updated = await api('GET', '/api/admin/stock/negotiation?search=' + plates[0]); ownRow = updated.items.find(row => row.id === ids[0]);
    assert.equal(ownRow.ruleSource, 'vehicle'); assert.equal(ownRow.effectiveRule.mode, 'percent'); assert.equal(ownRow.effectiveRule.value, 20);
    const particularFloor = ownRow.floor;
    await panel.getByRole('button', { name: 'Configurar mínimo general', exact: true }).click();
    await general.getByLabel('Tipo de mínimo', { exact: true }).selectOption('amount');
    await general.getByLabel('Ganancia mínima (ARS)', { exact: true }).fill('3000000');
    await saveRule(page, general, 'Guardar mínimo general', brand);
    updated = await api('GET', '/api/admin/stock/negotiation?search=' + encodeURIComponent(brand));
    ownRow = updated.items.find(row => row.id === ids[0]); sharedRow = updated.items.find(row => row.id === ids[1]);
    assert.equal(ownRow.floor, particularFloor, 'the vehicle rule takes priority even after the general minimum changes');
    await capture(page, panel, 'negociacion-excepcion-escritorio.png');
    await panel.locator(`[data-negotiation-row="${ids[0]}"]`).getByRole('button', { name: 'Mínimo de la unidad', exact: true }).click();
    await saveRule(page, particular, 'Usar mínimo general', brand);
    updated = await api('GET', '/api/admin/stock/negotiation?search=' + plates[0]); ownRow = updated.items.find(row => row.id === ids[0]);
    assert.equal(ownRow.ruleSource, 'general'); assert.equal(ownRow.overrideRule, null);
    assert.notEqual(ownRow.floor, particularFloor);
    const after = await api('GET', '/api/admin/cars/' + ids[0]);
    for (const field of ['price', 'purchasePrice', 'status', 'sold', 'updatedAt']) assert.deepEqual(after[field], baseline[field], 'negotiation leaves vehicle ' + field + ' unchanged');
    assert.deepEqual(after.expenses, baseline.expenses);
    await filter(page, plates[0], [ids[0]]); assert.equal(await panel.locator('[data-negotiation-row]').count(), 1, 'search matches the plate');
    console.log('QA: override priority/removal, vehicle immutability and plate search passed.');
    await filter(page, brand, ids);
    for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 }); await panel.locator(`[data-negotiation-card="${ids[0]}"]`).waitFor();
        assert.equal(await panel.locator('[data-negotiation-row]').count(), 0, 'only one responsive representation is mounted');
        if (await panel.locator('[data-negotiation-offer]').count()) await panel.locator('[data-negotiation-offer]').getByRole('button', { name: 'Cerrar', exact: true }).click();
        await capture(page, panel.locator(`[data-negotiation-card="${ids[0]}"]`), `negociacion-propio-movil-${width}.png`);
        await capture(page, panel.locator(`[data-negotiation-card="${ids[1]}"]`), `negociacion-compartido-movil-${width}.png`);
        await simulate(page, ids[0], ownRow.floor, 'at_floor'); await simulate(page, ids[0], ownRow.floor - 1, 'below_floor');
    }
    console.log('QA: 390px and 320px cards and floor simulations passed.');
    const seller = await surface(sellerToken, fixture.users[1].id, 390); page = seller.page; panel = await filter(page, brand, ids);
    assert.equal(await panel.getByRole('button', { name: 'Configurar mínimo general', exact: true }).count(), 0);
    assert.equal(await panel.getByRole('button', { name: 'Mínimo de la unidad', exact: true }).count(), 0);
    await simulate(page, ids[1], sharedRow.floor, 'at_floor');
    await panel.locator('[data-negotiation-offer-result]').getByText('Parte de AutoSporting', { exact: true }).waitFor();
    await capture(page, panel.locator(`[data-negotiation-card="${ids[1]}"]`), 'negociacion-vendedor-movil.png');
    await api('PUT', '/api/admin/stock/negotiation/rule', { rule: { mode: 'amount', value: 0 }, expectedRevision: data.ruleRevision }, sellerToken, 403);
    await api('DELETE', '/api/admin/stock/negotiation/' + ids[0] + '/rule', { expectedRevision: ownRow.ruleRevision }, sellerToken, 403);
    await api('GET', '/api/admin/stock/negotiation', undefined, null, 401);
    if (readOnlyToken) await api('GET', '/api/admin/stock/negotiation', undefined, readOnlyToken, 403);
    console.log('QA: seller simulations and rule/access restrictions passed.');
    assert.deepEqual(businessWrites, []); assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'resultado.json'), JSON.stringify({ passed: true, availableOnly: true, exactFloor: true, onePesoBelow: true, incompleteCost: true, sharedAgencyProfit: true,
        generalAndVehicleRule: true, plateSearch: true, sellerReadOnlyRules: true, noVehicleMutations: true, noBusinessActions: true, mobileWidths: [390, 320], desktopWidths: [1440, 1280], productionAccess: false }, null, 2));
    console.log('PASS: Stock Negotiation desktop/mobile, floor boundaries, incomplete/shared units and seller permissions.');
} catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'fallo.png'), fullPage: true }).catch(() => {});
    throw error;
} finally { await browser.close(); }
