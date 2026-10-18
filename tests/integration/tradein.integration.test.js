// Cadenas de permutas. Ejecutar: node tests/integration/tradein.integration.test.js
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, mongoose } = await boot();
const { default: Car } = await import('../../src/models/Car.js');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');
const { default: Installment } = await import('../../src/models/Installment.js');

const mkCar = (name, purchasePrice, extra = {}) => Car.create({
    brand: 'T', name, year: 2020, km: 1, fuel: 'Nafta', condition: 'Usado', price: 1, currency: '$',
    purchasePrice, purchaseCurrency: 'ARS', ...extra
});
const accountId = new mongoose.Types.ObjectId();
const cash = (saleId, amount, currency = 'ARS') => Transaction.create({
    type: 'Ingreso', amount, currency, description: 'cobro', category: 'Venta', accountId, saleId, source: 'venta', status: 'activo'
});

// Montos del ejemplo del pedido (solo para validar la lógica):
// A comprado 12M; vendido 16M (6M efectivo + B tomado en 10M); B vendido 13M => A=4M, B=3M, acumulado 7M.
const build = async () => {
    const A = await mkCar('Auto A', 12000000);
    const saleA = await Sale.create({
        vehicleId: A._id, salePrice: 16000000, saleCurrency: 'ARS', paymentMethod: 'permuta', status: 'confirmada',
        tradeIns: [{ brand: 'B', model: 'Modelo B', year: 2019, estimatedValue: 10000000, currency: 'ARS' }]
    });
    await cash(saleA._id, 6000000);
    // flujo habitual: ingresar el vehículo recibido a stock desde la venta
    const r = await call('POST', `/api/admin/sales/${saleA._id}/trade-ins/0/create-stock-car`);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    return { A, saleA, B: r.json.car };
};

console.log('Cadenas de permutas');
await test('ingresar el recibido desde la venta lo vincula solo, con costo = valor de toma', async () => {
    const { saleA, B } = await build();
    const car = await Car.findById(B._id).lean();
    assert.equal(String(car.tradeInOrigin.saleId), String(saleA._id));
    assert.equal(car.tradeInOrigin.value, 10000000);
    assert.equal(car.purchasePrice, 10000000);
    assert.equal(car.tradeInOrigin.source, 'sale_flow');
});

await test('rentabilidad acumulada = 4M + 3M = 7M sin contar la permuta como caja ni doble', async () => {
    const { A, B } = await build();
    const saleB = await Sale.create({ vehicleId: B._id, salePrice: 13000000, saleCurrency: 'ARS', paymentMethod: 'contado', status: 'entregada' });
    await cash(saleB._id, 13000000);
    for (const startId of [A._id, B._id]) { // consultable desde cualquier punto de la cadena
        const r = await call('GET', `/api/admin/cars/${startId}/trade-in-chain`);
        assert.equal(r.status, 200, JSON.stringify(r.json));
        assert.equal(r.json.nodes.length, 2);
        const [a, b] = r.json.nodes;
        assert.equal(a.role, 'origin'); assert.equal(a.netProfit, 4000000);
        assert.equal(b.role, 'received'); assert.equal(b.netProfit, 3000000);
        assert.equal(r.json.totals.netProfitByCurrency.ARS, 7000000);
        // caja: 6M (venta A) + 13M (venta B); los 10M de la permuta NO son caja
        assert.equal(r.json.totals.cashCollectedByCurrency.ARS, 19000000);
        assert.equal(a.sale.tradeInValueReceived.ARS, 10000000);
        assert.deepEqual(r.json.totals.stockCostByCurrency, {});
    }
});

await test('vehículo recibido sin vender: costo en stock y margen estimado separados de lo concretado', async () => {
    const { A, B } = await build();
    await Car.updateOne({ _id: B._id }, { $set: { price: 14000000, currency: '$' } });
    const r = await call('GET', `/api/admin/cars/${A._id}/trade-in-chain`);
    assert.equal(r.json.totals.netProfitByCurrency.ARS, 4000000); // solo lo concretado
    assert.equal(r.json.totals.stockCostByCurrency.ARS, 10000000);
    assert.equal(r.json.totals.estimatedMarginByCurrency.ARS, 4000000); // estimado
    assert.equal(r.json.nodes[1].netProfit, null);
});

await test('cuotas pendientes: ganancia ≠ caja cobrada, saldo por cobrar visible', async () => {
    const { A, B } = await build();
    const saleB = await Sale.create({ vehicleId: B._id, salePrice: 13000000, saleCurrency: 'ARS', paymentMethod: 'financiado', status: 'confirmada' });
    await cash(saleB._id, 3000000);
    await Installment.create({ saleId: saleB._id, installmentNumber: 1, dueDate: new Date(), amount: 10000000, currency: 'ARS', status: 'pendiente' });
    const r = await call('GET', `/api/admin/cars/${A._id}/trade-in-chain`);
    assert.equal(r.json.totals.netProfitByCurrency.ARS, 7000000);
    assert.equal(r.json.totals.cashCollectedByCurrency.ARS, 9000000);
    assert.equal(r.json.totals.receivableByCurrency.ARS, 10000000);
});

await test('comisión y gastos de venta se atribuyen a cada vehículo', async () => {
    const { A, B, saleA } = await build();
    await Sale.updateOne({ _id: saleA._id }, { $set: { 'commissionSettings.extraAmount': 160000, 'commissionSettings.extraCurrency': 'ARS', saleExpenses: [{ description: 'transf', amount: 40000, currency: 'ARS' }] } });
    await Car.updateOne({ _id: B._id }, { $push: { expenses: { concept: 'mecánica', amount: 100000, currency: 'ARS' } } });
    const saleB = await Sale.create({ vehicleId: B._id, salePrice: 13000000, saleCurrency: 'ARS', status: 'entregada' });
    const r = await call('GET', `/api/admin/cars/${A._id}/trade-in-chain`);
    const [a, b] = r.json.nodes;
    assert.equal(a.netProfit, 4000000 - 160000 - 40000);
    assert.equal(b.netProfit, 3000000 - 100000);
    assert.ok(saleB);
});

await test('socio: resultado total vs parte de la agencia', async () => {
    const A = await mkCar('Auto socio', 10000000, { investor: { name: 'Socio', percentage: 40 } });
    await Sale.create({ vehicleId: A._id, salePrice: 12000000, saleCurrency: 'ARS', status: 'entregada' });
    const r = await call('GET', `/api/admin/cars/${A._id}/trade-in-chain`);
    assert.equal(r.json.totals.netProfitByCurrency.ARS, 2000000);
    assert.equal(r.json.totals.agencyNetProfitByCurrency.ARS, 1200000);
});

await test('monedas distintas no se suman; costo en USD vs venta ARS queda no comparable', async () => {
    const A = await mkCar('Auto USD', 8000, { purchaseCurrency: 'USD' });
    await Sale.create({ vehicleId: A._id, salePrice: 12000000, saleCurrency: 'ARS', status: 'entregada' });
    const r = await call('GET', `/api/admin/cars/${A._id}/trade-in-chain`);
    assert.equal(r.json.nodes[0].netProfit, null);
    assert.equal(r.json.nodes[0].comparable, false);
    assert.equal(r.json.totals.nonComparableSales, 1);
    assert.deepEqual(r.json.totals.netProfitByCurrency, {});
});

await test('operación con más de un vehículo recibido y cadena que continúa (A -> B -> C)', async () => {
    const A = await mkCar('A2', 5000000);
    const saleA = await Sale.create({
        vehicleId: A._id, salePrice: 9000000, saleCurrency: 'ARS', status: 'entregada',
        tradeIns: [
            { brand: 'B', model: 'b', year: 2019, estimatedValue: 3000000, currency: 'ARS' },
            { brand: 'D', model: 'd', year: 2018, estimatedValue: 2000000, currency: 'ARS' }
        ]
    });
    const b = (await call('POST', `/api/admin/sales/${saleA._id}/trade-ins/0/create-stock-car`)).json.car;
    const d = (await call('POST', `/api/admin/sales/${saleA._id}/trade-ins/1/create-stock-car`)).json.car;
    const saleB = await Sale.create({
        vehicleId: b._id, salePrice: 4000000, saleCurrency: 'ARS', status: 'entregada',
        tradeIns: [{ brand: 'C', model: 'c', year: 2017, estimatedValue: 1500000, currency: 'ARS' }]
    });
    const c = (await call('POST', `/api/admin/sales/${saleB._id}/trade-ins/0/create-stock-car`)).json.car;
    const r = await call('GET', `/api/admin/cars/${c._id}/trade-in-chain`);
    assert.equal(r.json.nodes.length, 4);
    assert.equal(r.json.rootCarId, String(A._id));
    assert.equal(r.json.totals.netProfitByCurrency.ARS, (9000000 - 5000000) + (4000000 - 3000000));
    assert.ok(d);
});

await test('no se puede crear dos veces el mismo vehículo desde el mismo recibido', async () => {
    const { saleA } = await build();
    const again = await call('POST', `/api/admin/sales/${saleA._id}/trade-ins/0/create-stock-car`);
    assert.equal(again.status, 400);
});

console.log('Vinculación de históricos');
await test('vincular histórico: exige confirmación, valor y moneda; no inventa nada', async () => {
    const A = await mkCar('H-A', 1000000);
    const hist = await mkCar('H-B', 900000);
    const sale = await Sale.create({ vehicleId: A._id, salePrice: 1500000, saleCurrency: 'ARS', status: 'entregada' });
    const url = `/api/admin/cars/${hist._id}/link-trade-in`;
    assert.equal((await call('POST', url, { saleId: String(sale._id), value: 800000, currency: 'ARS' })).status, 400); // sin confirm
    assert.equal((await call('POST', url, { saleId: String(sale._id), currency: 'ARS', confirm: true })).status, 400); // sin valor
    assert.equal((await call('POST', url, { saleId: String(sale._id), value: 800000, currency: 'EUR', confirm: true })).status, 400);
    const ok = await call('POST', url, { saleId: String(sale._id), value: 800000, currency: 'ARS', confirm: true });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const car = await Car.findById(hist._id).lean();
    assert.equal(car.tradeInOrigin.source, 'manual_link');
    assert.equal(car.purchasePrice, 900000); // no se pisa el dato histórico
    assert.equal(ok.json.nodes.find((n) => n.carId === String(hist._id)).cost.amount, 800000);
});

await test('vínculo duplicado y relaciones circulares se rechazan', async () => {
    const A = await mkCar('C-A', 1000000);
    const B = await mkCar('C-B', 900000);
    const saleA = await Sale.create({ vehicleId: A._id, salePrice: 1500000, saleCurrency: 'ARS', status: 'entregada' });
    const saleB = await Sale.create({ vehicleId: B._id, salePrice: 1200000, saleCurrency: 'ARS', status: 'entregada' });
    const link = (carId, sale) => call('POST', `/api/admin/cars/${carId}/link-trade-in`, { saleId: String(sale._id), value: 500000, currency: 'ARS', confirm: true });
    assert.equal((await link(B._id, saleA)).status, 200);           // B recibido en la venta de A
    const dup = await link(B._id, saleA);                            // duplicado
    assert.equal(dup.status, 409); assert.equal(dup.json.code, 'ALREADY_LINKED');
    const circ = await link(A._id, saleB);                           // A recibido en la venta de B (que viene de A) => ciclo
    assert.equal(circ.status, 409); assert.equal(circ.json.code, 'CIRCULAR');
    const self = await link(A._id, saleA);                           // consigo mismo
    assert.equal(self.status, 409); assert.equal(self.json.code, 'CIRCULAR');
});

await test('vincular a un recibido existente evita doble vínculo del mismo recibido', async () => {
    const A = await mkCar('L-A', 1000000);
    const x = await mkCar('L-X', 100);
    const y = await mkCar('L-Y', 100);
    const sale = await Sale.create({ vehicleId: A._id, salePrice: 2000000, saleCurrency: 'ARS', status: 'entregada', tradeIns: [{ brand: 'X', model: 'x', year: 2018, estimatedValue: 500000, currency: 'ARS' }] });
    const tid = String((await Sale.findById(sale._id).lean()).tradeIns[0]._id);
    assert.equal((await call('POST', `/api/admin/cars/${x._id}/link-trade-in`, { saleId: String(sale._id), tradeInId: tid, value: 500000, currency: 'ARS', confirm: true })).status, 200);
    const second = await call('POST', `/api/admin/cars/${y._id}/link-trade-in`, { saleId: String(sale._id), tradeInId: tid, value: 500000, currency: 'ARS', confirm: true });
    assert.equal(second.status, 409); assert.equal(second.json.code, 'TRADE_IN_ALREADY_LINKED');
});

await test('desvincular exige motivo y deja auditoría; luego puede revincularse', async () => {
    const A = await mkCar('U-A', 1000000);
    const B = await mkCar('U-B', 100);
    const sale = await Sale.create({ vehicleId: A._id, salePrice: 2000000, saleCurrency: 'ARS', status: 'entregada' });
    await call('POST', `/api/admin/cars/${B._id}/link-trade-in`, { saleId: String(sale._id), value: 500000, currency: 'ARS', confirm: true });
    assert.equal((await call('POST', `/api/admin/cars/${B._id}/unlink-trade-in`, { confirm: true, reason: 'x' })).status, 400);
    assert.equal((await call('POST', `/api/admin/cars/${B._id}/unlink-trade-in`, { confirm: true, reason: 'vínculo erróneo' })).status, 200);
    const car = await Car.findById(B._id).lean();
    assert.equal(car.tradeInOrigin?.saleId, undefined);
    assert.ok(car.auditLog.some((l) => /quitado/.test(l.details)));
});

await test('endpoint por venta devuelve la misma cadena', async () => {
    const { saleA } = await build();
    const r = await call('GET', `/api/admin/sales/${saleA._id}/trade-in-chain`);
    assert.equal(r.status, 200);
    assert.equal(r.json.nodes.length, 2);
});

await test('15) POST /api/cars con "Recibido en parte de pago" vincula venta de origen y registra valor de toma como costo inicial', async () => {
    const a = await mkCar('Origen Stock', 12000000);
    const saleA = await Sale.create({ vehicleId: a._id, salePrice: 16000000, saleCurrency: 'ARS', paymentMethod: 'contado', status: 'confirmada' });

    const created = await call('POST', '/api/cars', {
        name: 'Gol Trend 1.6 2018',
        brand: 'Volkswagen',
        year: 2018,
        km: 65000,
        fuel: 'Nafta',
        condition: 'Muy bueno',
        price: 11500000,
        currency: 'ARS',
        status: 'Disponible',
        receivedAsTradeIn: true,
        tradeInOriginSaleId: String(saleA._id),
        tradeInOriginValue: 10000000,
        tradeInOriginCurrency: 'ARS'
    });
    assert.equal(created.status, 201);
    assert.equal(created.json.purchasePrice, 10000000);
    assert.equal(created.json.purchaseCurrency, 'ARS');
    assert.equal(String(created.json.tradeInOrigin?.saleId), String(saleA._id));
    assert.equal(created.json.tradeInOrigin?.value, 10000000);

    const chain = await call('GET', `/api/admin/cars/${created.json._id}/trade-in-chain`);
    assert.equal(chain.status, 200);
    assert.equal(chain.json.nodes.length, 2);
    assert.equal(chain.json.totals.stockCostByCurrency.ARS, 10000000);
});

await test('16) Cotización registrada opcional muestra equivalencia referencial sin mezclar los totales por moneda', async () => {
    const a = await mkCar('A ARS', 10000000, { purchaseCurrency: 'ARS' });
    const saleA = await Sale.create({
        vehicleId: a._id, salePrice: 14000000, saleCurrency: 'ARS', paymentMethod: 'permuta', status: 'confirmada',
        tradeIns: [{ brand: 'Toyota', model: 'Corolla', year: 2021, estimatedValue: 5000, currency: 'USD' }]
    });
    const bRes = await call('POST', `/api/admin/sales/${saleA._id}/trade-ins/0/create-stock-car`);
    const b = bRes.json.car;
    await Car.findByIdAndUpdate(b._id, { status: 'Disponible' });
    await Sale.create({ vehicleId: b._id, salePrice: 7000, saleCurrency: 'USD', paymentMethod: 'contado', status: 'confirmada' });

    const r = await call('GET', `/api/admin/cars/${a._id}/trade-in-chain?exchangeRate=1200`);
    assert.equal(r.status, 200);
    assert.equal(r.json.totals.netProfitByCurrency.ARS, 4000000);
    assert.equal(r.json.totals.netProfitByCurrency.USD, 2000);
    assert.equal(r.json.totals.referenceConverted.exchangeRate, 1200);
    assert.equal(r.json.totals.referenceConverted.equivalentInARS, 4000000 + 2000 * 1200);
});

await finish();

