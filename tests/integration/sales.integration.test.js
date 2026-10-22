// Prueba de integración etapas 1 y 2 + plan de cuotas.
import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish } = await boot();
const { default: mongoose } = await import('mongoose');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Car } = await import('../../src/models/Car.js');
const { default: Installment } = await import('../../src/models/Installment.js');

const mkCar = (purchasePrice, purchaseCurrency = 'ARS') => Car.create({
    brand: 'Test', name: 'Auto', year: 2020, km: 1, fuel: 'Nafta', condition: 'Usado',
    price: 1, currency: '$', purchasePrice, purchaseCurrency
});
const mkSale = async (extra = {}) => {
    const car = await mkCar(21000000);
    return Sale.create({ vehicleId: car._id, salePrice: 25500000, saleCurrency: 'ARS', paymentMethod: 'contado', ...extra });
};

console.log('Etapa 1 - guardado');
await test('guardar venta CONTADO (financingDetails:null) no falla y persiste', async () => {
    const sale = await mkSale();
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'contado', salePrice: 26000000, financingDetails: null });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const db = await Sale.findById(sale._id).lean();
    assert.equal(db.salePrice, 26000000);
    assert.equal(db.financingDetails.hasFinancing, false);
    assert.equal(db.financingDetails.installmentsCount, undefined);
});

await test('guardar financiada con 12 cuotas valida y persiste', async () => {
    const sale = await mkSale();
    const fin = { hasFinancing: true, cashPrice: 20000000, downPayment: 8000000, installmentsCount: 12, calculationMode: 'by_installment', customInstallmentAmount: 1100000 };
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: fin, syncInstallmentPlan: true });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const db = await Sale.findById(sale._id).lean();
    assert.equal(db.financingDetails.installmentsCount, 12);
    assert.equal(db.salePrice, 8000000 + 1100000 * 12);
    assert.equal(await Installment.countDocuments({ saleId: sale._id, status: { $ne: 'anulada' } }), 12);
});

await test('cuotas inválidas (7) se rechazan', async () => {
    const sale = await mkSale();
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: { hasFinancing: true, cashPrice: 1000000, downPayment: 0, installmentsCount: 7, calculationMode: 'by_rate', interestRate: 0 } });
    assert.equal(r.status, 400);
});

await test('entrega que cubre todo el precio se guarda sin cuotas', async () => {
    const sale = await mkSale();
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: { hasFinancing: true, cashPrice: 1000000, downPayment: 1000000, installmentsCount: 18, calculationMode: 'by_rate', interestRate: 0 } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const db = await Sale.findById(sale._id).lean();
    assert.equal(db.financingDetails.installmentsCount, undefined);
});

await test('registro legacy con installmentsCount 0 se puede volver a guardar', async () => {
    const sale = await mkSale();
    await Sale.collection.updateOne({ _id: sale._id }, { $set: { financingDetails: { hasFinancing: false, installmentsCount: 0, cashPrice: 0 } } });
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { notes: 'nota' });
    assert.equal(r.status, 200, JSON.stringify(r.json));
});

console.log('Plan de cuotas activo');
await test('no se puede pasar a contado con plan activo sin cobros (409) y no se borra nada', async () => {
    const sale = await mkSale();
    const fin = { hasFinancing: true, cashPrice: 12000000, downPayment: 0, installmentsCount: 6, calculationMode: 'by_installment', customInstallmentAmount: 2000000 };
    assert.equal((await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: fin, syncInstallmentPlan: true })).status, 200);
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'contado', financingDetails: null, salePrice: 12000000 });
    assert.equal(r.status, 409);
    assert.equal(r.json.code, 'SALE_HAS_ACTIVE_INSTALLMENT_PLAN');
    assert.equal(await Installment.countDocuments({ saleId: sale._id, status: { $ne: 'anulada' } }), 6);
    const db = await Sale.findById(sale._id).lean();
    assert.equal(db.paymentMethod, 'financiado');
});

await test('cancelar plan: exige confirmación, motivo e ids; anula sin borrar; luego permite contado', async () => {
    const sale = await mkSale();
    const fin = { hasFinancing: true, cashPrice: 12000000, downPayment: 0, installmentsCount: 6, calculationMode: 'by_installment', customInstallmentAmount: 2000000 };
    await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: fin, syncInstallmentPlan: true });
    const prev = await call('GET', `/api/admin/sales/${sale._id}/installment-plan/cancel-preview`);
    assert.equal(prev.status, 200);
    assert.equal(prev.json.cancellable.length, 6);
    assert.equal(prev.json.totalsByCurrency.ARS, 12000000);
    const ids = prev.json.cancellable.map((i) => i._id);
    assert.equal((await call('POST', `/api/admin/sales/${sale._id}/installment-plan/cancel`, { installmentIds: ids, reason: 'cambio a contado' })).status, 400); // sin confirm
    assert.equal((await call('POST', `/api/admin/sales/${sale._id}/installment-plan/cancel`, { installmentIds: ids, confirm: true, reason: 'x' })).status, 400); // motivo corto
    assert.equal((await call('POST', `/api/admin/sales/${sale._id}/installment-plan/cancel`, { installmentIds: ids.slice(1), confirm: true, reason: 'cambio a contado' })).status, 409); // plan distinto
    const ok = await call('POST', `/api/admin/sales/${sale._id}/installment-plan/cancel`, { installmentIds: ids, confirm: true, reason: 'cambio a contado' });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    assert.equal(await Installment.countDocuments({ saleId: sale._id }), 6); // no se borró nada
    assert.equal(await Installment.countDocuments({ saleId: sale._id, status: 'anulada' }), 6);
    const inst = await Installment.findOne({ saleId: sale._id }).lean();
    assert.equal(inst.installmentAuditLog.at(-1).action, 'CUOTA_ANULADA');
    const s = await Sale.findById(sale._id).lean();
    assert.ok(s.saleAuditLog.some((a) => a.action === 'PLAN_CUOTAS_CANCELADO'));
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'contado', financingDetails: null, salePrice: 12000000 });
    assert.equal(r.status, 200, JSON.stringify(r.json));
});

await test('plan con cobros: no se puede cancelar ni pasar a contado', async () => {
    const sale = await mkSale();
    const fin = { hasFinancing: true, cashPrice: 6000000, downPayment: 0, installmentsCount: 6, calculationMode: 'by_installment', customInstallmentAmount: 1000000 };
    await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: fin, syncInstallmentPlan: true });
    await Installment.updateOne({ saleId: sale._id, installmentNumber: 1 }, { $set: { status: 'pagada', paidAmount: 1000000 } });
    const prev = await call('GET', `/api/admin/sales/${sale._id}/installment-plan/cancel-preview`);
    assert.equal(prev.json.blocked, true);
    const c = await call('POST', `/api/admin/sales/${sale._id}/installment-plan/cancel`, { installmentIds: prev.json.cancellable.map((i) => i._id), confirm: true, reason: 'intento' });
    assert.equal(c.status, 409);
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'contado', financingDetails: null });
    assert.equal(r.status, 409);
    assert.equal(r.json.code, 'SALE_HAS_PAID_INSTALLMENTS');
});

await test('plan con cobros: modificar condiciones sigue protegido', async () => {
    const sale = await mkSale();
    const fin = { hasFinancing: true, cashPrice: 6000000, downPayment: 0, installmentsCount: 6, calculationMode: 'by_installment', customInstallmentAmount: 1000000 };
    await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: fin, syncInstallmentPlan: true });
    await Installment.updateOne({ saleId: sale._id, installmentNumber: 1 }, { $set: { status: 'pagada', paidAmount: 1000000 } });
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { financingDetails: { ...fin, installmentsCount: 12 } });
    assert.equal(r.status, 400);
});

console.log('Etapa 2 - comisión');
await test('1,3% sobre 25.500.000 = 331.500 y persiste base/porcentaje/importe', async () => {
    const sale = await mkSale();
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'percent', percent: 1.3, extraAmount: 999 } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const cs = (await Sale.findById(sale._id).lean()).commissionSettings;
    assert.equal(cs.mode, 'percent'); assert.equal(cs.percent, 1.3); assert.equal(cs.base, 25500000); assert.equal(cs.extraAmount, 331500); // ignora el 999 del cliente
});

await test('modificar precio recalcula la comisión en el servidor (sin enviar commissionSettings)', async () => {
    const sale = await mkSale();
    await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'percent', percent: 1.3 } });
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { salePrice: 20000000 });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const cs = (await Sale.findById(sale._id).lean()).commissionSettings;
    assert.equal(cs.base, 20000000); assert.equal(cs.extraAmount, 260000);
});

await test('modificar porcentaje recalcula; porcentajes inválidos se rechazan', async () => {
    const sale = await mkSale();
    await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'percent', percent: 1.3 } });
    await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'percent', percent: '2,5' } });
    assert.equal((await Sale.findById(sale._id).lean()).commissionSettings.extraAmount, 637500);
    for (const bad of [-1, 101, 'abc', '']) {
        const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'percent', percent: bad } });
        assert.equal(r.status, 400, `percent=${bad}`);
    }
});

await test('financiada: base = precio total pactado (una sola vez)', async () => {
    const sale = await mkSale();
    const fin = { hasFinancing: true, cashPrice: 20000000, downPayment: 8000000, installmentsCount: 12, calculationMode: 'by_installment', customInstallmentAmount: 1100000 };
    const total = 8000000 + 1100000 * 12;
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { paymentMethod: 'financiado', financingDetails: fin, syncInstallmentPlan: true, commissionSettings: { mode: 'percent', percent: 1 } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const cs = (await Sale.findById(sale._id).lean()).commissionSettings;
    assert.equal(cs.base, total); assert.equal(cs.extraAmount, total * 0.01);
});

await test('comisión histórica de importe fijo se conserva (documento sin mode)', async () => {
    const sale = await mkSale();
    await Sale.collection.updateOne({ _id: sale._id }, { $set: { commissionSettings: { isManual: true, extraAmount: 123456, extraCurrency: 'ARS', sellerPct: 1, consignationPct: 0.5 } } });
    // edición de otra cosa y cambio de precio: la comisión fija NO se transforma en porcentaje
    const r = await call('PATCH', `/api/admin/sales/${sale._id}`, { salePrice: 30000000, notes: 'x' });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const cs = (await Sale.findById(sale._id).lean()).commissionSettings;
    assert.equal(cs.extraAmount, 123456); assert.notEqual(cs.mode, 'percent'); assert.equal(cs.sellerPct, 1);
    // reenvío del panel en modo fijo con el mismo importe
    const r2 = await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'fixed', extraAmount: 123456, extraCurrency: 'ARS' } });
    assert.equal(r2.status, 200);
    assert.equal((await Sale.findById(sale._id).lean()).commissionSettings.extraAmount, 123456);
});

await test('pasar de porcentaje a fijo limpia porcentaje y base', async () => {
    const sale = await mkSale();
    await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'percent', percent: 1.3 } });
    await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'fixed', extraAmount: 5000, extraCurrency: 'ARS' } });
    const cs = (await Sale.findById(sale._id).lean()).commissionSettings;
    assert.equal(cs.mode, 'fixed'); assert.equal(cs.extraAmount, 5000); assert.equal(cs.percent, undefined); assert.equal(cs.base, undefined);
});

await test('guardar comisión no crea egresos ni movimientos', async () => {
    const sale = await mkSale();
    const { default: Transaction } = await import('../../src/models/Transaction.js');
    const before = await Transaction.countDocuments();
    await call('PATCH', `/api/admin/sales/${sale._id}`, { commissionSettings: { mode: 'percent', percent: 1.3 } });
    assert.equal(await Transaction.countDocuments(), before);
});

await finish();
