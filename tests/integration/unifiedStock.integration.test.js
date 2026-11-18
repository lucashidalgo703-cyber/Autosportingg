// Unified Stock: actual Mongo queries and HTTP handlers against an isolated, disposable database.
// STOCK_DIRECT_SERVICE=1 allows checking services before the surgical server patch is applied.
import assert from 'node:assert/strict';
import { boot } from './harness.js';
import { filterStockVehicles, isAvailableStock, stockValuation, summarizeStock } from '../../src/utils/inventoryStock.js';
import { getAdminStock, serializeStockCar } from '../../src/services/inventoryStockService.js';
import { getCapitalSummary } from '../../src/services/capitalSummaryService.js';
const { call, test, finish, mongoose, makeToken } = await boot();
const { default: Car } = await import('../../src/models/Car.js');
const { default: Account } = await import('../../src/models/Account.js');
const owner = { role: 'owner' };
const direct = process.env.STOCK_DIRECT_SERVICE === '1';
const get = async (params = {}, user = owner) => {
    if (direct) return getAdminStock(params, user);
    const token = user.role === 'owner' ? undefined : makeToken(user.role);
    const response = await call('GET', `/api/admin/cars?${new URLSearchParams(params)}`, null, token);
    assert.equal(response.status, 200);
    return response.json;
};
const base = { brand: 'Ficticia', year: 2022, km: 12000, fuel: 'Nafta', condition: 'Usado', agencyOwned: true, status: 'Disponible', currency: 'ARS', price: 10000, purchaseCurrency: 'ARS', purchasePrice: 6000 };
const created = await Car.create([
    ...Array.from({ length: 23 }, (_, index) => ({ ...base, name: `Unidad ${String(index).padStart(2, '0')}`, plateOrVin: `TEST${index}`, order: index, status: index === 21 ? 'Reservado' : index === 22 ? 'Pausado' : 'Disponible' })),
    { ...base, name: 'Amarok Extreme', description: 'Versión única prueba', plateOrVin: 'AAA111', price: 40000, currency: 'USD', purchasePrice: 20000000, purchaseCurrency: 'ARS', investor: { name: 'Inversor ficticio', percentage: 35 }, expenses: [{ concept: 'Alineación', amount: 85000, currency: 'ARS' }, { concept: 'Repuesto', amount: 250, currency: 'USD' }] },
    { ...base, name: 'Inversor completo', price: 300000, currency: 'USD', purchasePrice: 220000, purchaseCurrency: 'USD', investor: { name: 'Inversora ficticia', percentage: 100 } },
    { ...base, name: 'Consignación ficticia', price: 15000, currency: 'USD', consignedBy: 'Consignante de prueba', agencyOwned: false, investor: { name: 'No debe sumarse', percentage: 50 } },
    { ...base, name: 'Tercero ficticio', price: 9000, agencyOwned: false },
    { ...base, name: 'Histórico vendido', status: 'Vendido', sold: true, price: 80000, purchasePrice: 50000 },
    { ...base, name: 'Permuta ficticia', price: 20000, currency: 'USD', purchasePrice: 1, purchaseCurrency: 'USD', tradeInOrigin: { saleId: new mongoose.Types.ObjectId(), value: 15000, currency: 'USD' } }
]);
await Car.collection.insertMany([
    { ...base, name: 'Histórico cancelado', status: 'Cancelado' },
    { ...base, name: 'Sin estado ficticio', status: null }
]);
const all = await Car.find({}).lean();

await test('Todos incluye históricos, cancelados y sin estado; páginas comparten totales del inventario completo', async () => {
    const first = await get({ tab: 'historial', status: 'todos', page: 1, limit: 2 });
    const last = await get({ tab: 'historial', status: 'todos', page: 16, limit: 2 });
    assert.equal(first.total, 31);
    assert.equal(first.cars.length, 2);
    assert.equal(last.cars.length, 1);
    assert.deepEqual(first.filteredMetrics, last.filteredMetrics);
    assert.deepEqual(first.summary, last.summary);
    assert.equal(first.summary.inventoryCount, 31);
    assert.equal(first.summary.totalStock, 26);
    assert.equal(first.summary.disponibles, 26);
    assert.equal(first.summary.reservados, 1);
    assert.equal(first.summary.pausados, 1);
    assert.equal(first.summary.sinEstado, 1);
    const allPages = [];
    for (let page = 1; page <= first.pages; page++) allPages.push(...(await get({ tab: 'historial', status: 'todos', page, limit: 2 })).cars.map(car => String(car._id)));
    assert.equal(new Set(allPages).size, 31);
    assert.deepEqual(first.filteredMetrics, summarizeStock(all.filter(isAvailableStock)));
});

await test('Búsqueda global por versión y patente encuentra una unidad fuera de la primera página', async () => {
    for (const search of ['única AAA111', 'Amarok Extreme', 'Versión única prueba']) {
        const result = await get({ search, status: 'todos', limit: 1 });
        assert.equal(result.total, 1);
        assert.equal(result.cars[0].name, 'Amarok Extreme');
        assert.equal(result.filteredMetrics.asking.USD, 40000);
    }
    const quoted = await get({ search: '.*', status: 'todos' });
    assert.equal(quoted.total, 0, 'El texto no debe ejecutarse como regex');
});

await test('Estado operativo y propiedad son filtros independientes; disponible cuenta únicamente Disponible', async () => {
    const available = await get({ status: 'disponible', limit: 1 });
    assert.equal(available.total, 26);
    const reserved = await get({ tab: 'historial', status: 'reservado', ownership: 'propio' });
    assert.equal(reserved.total, 1);
    assert.equal(reserved.cars[0].status, 'Reservado');
    const investor = await get({ status: 'todos', ownership: 'inversor' });
    assert.equal(investor.total, 1);
    assert.equal(investor.filteredMetrics.ownAsking.USD, 0);
    const consigned = await get({ ownership: 'consignacion' });
    assert.equal(consigned.total, 1);
    assert.equal(consigned.filteredMetrics.ownCost.ARS, 0);
    assert.equal(consigned.filteredMetrics.thirdPartyAsking.USD, 15000);
    assert.equal(consigned.filteredMetrics.investorAsking.USD, 0);
});

await test('Costo, publicación, participación y monedas se conservan; no se infiere moneda por importe', async () => {
    const result = await get({ search: 'AAA111' });
    const m = result.filteredMetrics;
    assert.deepEqual(m.asking, { ARS: 0, USD: 40000 });
    assert.deepEqual(m.cost, { ARS: 20085000, USD: 250 });
    assert.deepEqual(m.ownCost, { ARS: 13055250, USD: 162.5 });
    assert.deepEqual(m.investorCost, { ARS: 7029750, USD: 87.5 });
    assert.equal(m.ownAsking.USD, 26000);
    assert.equal(m.investorAsking.USD, 14000);
    const largeUSD = await get({ search: 'Inversor completo' });
    assert.equal(largeUSD.filteredMetrics.asking.USD, 300000);
    assert.equal(largeUSD.filteredMetrics.asking.ARS, 0);
    const trade = await get({ search: 'Permuta ficticia' });
    assert.equal(trade.filteredMetrics.cost.USD, 15000);
});

await test('Simular un precio recalcula la participación sin modificar registros ni el precio guardado', async () => {
    const car = await Car.findOne({ plateOrVin: 'AAA111' }).lean();
    const simulated = stockValuation(car, 50000);
    assert.equal(simulated.ownAsking, 32500);
    assert.equal(simulated.externalAsking, 17500);
    assert.equal(car.price, 40000);
    assert.equal((await Car.findById(car._id).lean()).price, 40000);
});

await test('Desktop y móvil consumen la misma búsqueda y filtros; el fallback aplica el mismo conjunto antes de paginar', async () => {
    for (const params of [{ tab: 'historial', status: 'todos' }, { tab: 'historial', status: 'reservado' }, { status: 'todos', ownership: 'propio' }, { search: 'AAA111', catalog: 'published' }, { ownership: 'consignacion' }, { tab: 'historial', ml: 'no_publicados', brand: 'Ficticia', status: 'vendido' }]) {
        const result = await get({ ...params, limit: 500 });
        const expected = filterStockVehicles(all, params).map(car => String(car._id)).sort();
        assert.deepEqual(result.cars.map(car => String(car._id)).sort(), expected);
    }
});

await test('Sin permiso de Finanzas hay precio de venta pero no costos ni capital, también en ficha y API patrimonial', async () => {
    const response = await get({ search: 'AAA111' }, { role: 'solo_lectura', permissions: ['stock.read'] });
    assert.equal(response.financialAccess, false);
    assert.equal(response.cars[0].price, 40000);
    for (const key of ['purchasePrice', 'purchaseCurrency', 'expenses', 'purchasePaymentState', 'auditLog']) assert.equal(response.cars[0][key], undefined);
    for (const key of ['cost', 'ownCost', 'investorCost', 'ownAsking']) assert.equal(response.filteredMetrics[key], undefined);
    assert.equal(response.summary.activeMetrics, undefined);
    assert.equal(response.summary.valorActivoARS, undefined);
    const car = created.find(car => car.plateOrVin === 'AAA111');
    if (direct) assert.equal(serializeStockCar(car, false).purchasePrice, undefined);
    else {
        const token = makeToken('solo_lectura');
        const detail = await call('GET', `/api/admin/cars/${car._id}`, null, token);
        assert.equal(detail.status, 200);
        assert.equal(detail.json.purchasePrice, undefined);
        const capital = await call('GET', '/api/admin/stock/capital-summary', null, token);
        assert.equal(capital.status, 403);
    }
});

await test('Un admin con permisos explícitos restringidos a Stock no recibe finanzas en listado, ficha ni snapshot', async () => {
    const restricted = { role: 'admin', permissions: ['stock.read'] };
    const unrestricted = await getAdminStock({ search: 'AAA111' }, { role: 'admin', permissions: [] });
    assert.equal(unrestricted.financialAccess, true, 'Admin sin permisos explícitos usa los permisos por defecto del rol');
    let response;
    if (direct) response = await getAdminStock({ search: 'AAA111' }, restricted);
    else {
        const { default: AdminUser } = await import('../../src/models/AdminUser.js');
        const userId = new mongoose.Types.ObjectId().toString();
        const restrictedToken = makeToken('admin', userId);
        await call('GET', '/api/admin/auth/me', null, restrictedToken); // Flush the durable login fixture.
        await AdminUser.updateOne({ _id: userId }, { $set: { permissions: restricted.permissions } });
        const list = await call('GET', '/api/admin/cars?search=AAA111', null, restrictedToken);
        assert.equal(list.status, 200);
        response = list.json;
        const carId = created.find(car => car.plateOrVin === 'AAA111')._id;
        const detail = await call('GET', '/api/admin/cars/' + carId, null, restrictedToken);
        assert.equal(detail.status, 200);
        assert.equal(detail.json.financialAccess, false);
        assert.equal(detail.json.purchasePrice, undefined);
        const snapshot = await call('GET', '/api/admin/offline/bootstrap', null, restrictedToken);
        assert.equal(snapshot.status, 200);
        const cachedCar = snapshot.json.data.vehicles.find(car => String(car._id) === String(carId));
        assert.equal(cachedCar.financialAccess, false);
        assert.equal(cachedCar.purchasePrice, undefined);
        assert.equal(cachedCar.expenses, undefined);
        const capital = await call('GET', '/api/admin/stock/capital-summary', null, restrictedToken);
        assert.equal(capital.status, 403);
    }
    assert.equal(response.financialAccess, false);
    assert.equal(response.cars[0].price, 40000);
    assert.equal(response.cars[0].purchasePrice, undefined);
    assert.equal(response.cars[0].expenses, undefined);
    assert.equal(response.summary.activeMetrics, undefined);
    assert.equal(response.filteredMetrics.ownCost, undefined);
});

await test('Capital patrimonial mantiene ARS/USD y la participación real sin duplicar el precio publicado', async () => {
    await Account.create({ name: 'Caja ficticia', type: 'Efectivo', currency: 'ARS', balance: 1000 });
    const summary = await getCapitalSummary();
    const metrics = summarizeStock(all.filter(isAvailableStock));
    assert.deepEqual(summary.componentes.stockPropioCosto.byCurrency, metrics.ownCost);
    assert.equal(summary.totales.capitalPropioCosto, metrics.ownCost.ARS + 1000);
    assert.equal(summary.totalsByCurrency.USD.capitalPropioCosto, metrics.ownCost.USD);
    assert.equal(summary.componentes.stockPropioCosto.items.some(car => car.isConsignment || car.isThirdParty), false);
    assert.equal(summary.totales.stockPropioPublicado, metrics.ownAsking.ARS);
});
await finish();
