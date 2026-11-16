import assert from 'node:assert/strict';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
const { models, call } = env;
const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
const { cars, users, client, reservation, sessions } = await seedMobileCrm(models);
const { Car, Sale, Reservation, Transaction, AuditLog, Installment, Client, Account } = models;
const admin = sessions[0].token, seller1 = sessions[1].token, seller2 = sessions[2].token;
const baseCar = { brand: 'Ficticio', name: 'Unidad prueba', year: 2023, km: 1, fuel: 'Nafta', condition: 'Usado', price: 1200, currency: 'U$S', purchasePrice: 900, purchaseCurrency: 'USD', visibleEnWeb: false };
const mkCar = extra => Car.create({ ...baseCar, ...extra });
const payload = car => ({ vehicleId: String(car._id), clientId: String(client._id), salePrice: 1200, saleCurrency: 'USD', paymentMethod: 'contado' });
const reserveCar = async extra => {
    const car = await mkCar({ status: 'Reservado', ...extra });
    const reserve = await Reservation.create({ vehicleId: car._id, clientId: client._id, agreedPrice: 1200, agreedCurrency: 'USD', depositAmount: 100, depositCurrency: 'USD', depositMethod: 'efectivo', expiresAt: new Date(Date.now() + 86400000) });
    return { car, reserve };
};
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`OK ${name}`); };
try {
    await test('stock completo: búsqueda por versión real y patente, sin truncar a 200', async () => {
        await Car.insertMany(Array.from({ length: 205 }, (_, i) => ({ ...baseCar, name: `Paginada ${i}`, plateOrVin: `ZX${String(i).padStart(3, '0')}YY` })));
        const version = await call('GET', '/api/admin/sales/vehicle-options?q=Extreme%20V6', undefined, seller1);
        assert.equal(version.status, 200); assert.equal(version.json.total, 1); assert.equal(version.json.cars[0]._id, String(cars[0]._id));
        const plate = await call('GET', '/api/admin/sales/vehicle-options?q=ZX000YY', undefined, seller1);
        assert.equal(plate.json.total, 1);
        const all = await call('GET', '/api/admin/sales/vehicle-options?page=2&limit=20', undefined, seller1);
        assert.ok(all.json.total > 200); assert.equal(all.json.cars.length, 20);
        const literal = await call('GET', '/api/admin/sales/vehicle-options?q=%5B', undefined, seller1);
        assert.equal(literal.status, 200); assert.equal(literal.json.total, 0);
    });
    await test('disponible se confirma desde Mis Ventas y queda asignada al usuario real', async () => {
        const txBefore = await Transaction.countDocuments();
        const response = await call('POST', '/api/admin/sales', { ...payload(cars[0]), saleDate: '2026-11-16', salesperson: 'Otro texto que no decide pertenencia' }, seller1);
        assert.equal(response.status, 201, JSON.stringify(response.json));
        assert.equal(response.json.saleDate, '2026-11-16T15:00:00.000Z');
        assert.equal(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(response.json.saleDate)), '2026-11-16');
        const datedCar = await mkCar();
        const invalidDate = await call('POST', '/api/admin/sales', { ...payload(datedCar), saleDate: '2026-02-30' }, seller1);
        assert.equal(invalidDate.status, 400); assert.equal(await Sale.countDocuments({ vehicleId: datedCar._id }), 0);
        assert.equal((await Car.findById(datedCar._id)).status, 'Disponible');
        const explicitTime = '2026-11-16T20:45:30.000Z';
        const timestampSale = await call('POST', '/api/admin/sales', { ...payload(datedCar), saleDate: explicitTime }, seller1);
        assert.equal(timestampSale.status, 201); assert.equal(timestampSale.json.saleDate, explicitTime);
        assert.equal(response.json.assignedTo, String(users[1]._id)); assert.equal(response.json.salesperson, users[1].name);
        const car = await Car.findById(cars[0]._id).lean(); assert.equal(car.status, 'Vendido'); assert.equal(car.sold, true);
        assert.equal(await Transaction.countDocuments(), txBefore);
        const repeat = await call('POST', '/api/admin/sales', payload(cars[0]), seller1);
        assert.equal(repeat.status, 409); assert.equal(repeat.json.activeSaleId, response.json._id);
        const picker = await call('GET', '/api/admin/sales/vehicle-options?q=QA001AA', undefined, seller1);
        assert.equal(picker.json.cars[0].activeSale._id, response.json._id);
    });
    await test('reserva vigente recupera cliente y seña una sola vez sin nuevo movimiento de Caja', async () => {
        const before = await Transaction.countDocuments(); const balances = await Account.find().sort({ _id: 1 }).select('balance').lean();
        const picker = await call('GET', '/api/admin/sales/vehicle-options?q=QA003AA', undefined, seller1);
        assert.equal(picker.json.cars[0].reservation.clientId._id, String(client._id));
        const response = await call('POST', '/api/admin/sales', { ...payload(cars[2]), salePrice: 35000, reservationId: String(reservation._id), depositAppliedAmount: 9999, buyerName: 'Ignorar; cliente vinculado' }, seller1);
        assert.equal(response.status, 201, JSON.stringify(response.json));
        assert.equal(response.json.clientId, String(client._id)); assert.equal(response.json.reservationId, String(reservation._id));
        assert.equal(response.json.depositAppliedAmount, 2000); assert.equal(response.json.balanceAfterTradeIn, 33000);
        assert.equal((await Reservation.findById(reservation._id)).status, 'convertida'); assert.equal((await Car.findById(cars[2]._id)).status, 'Vendido');
        assert.equal(await Transaction.countDocuments(), before); assert.deepEqual(await Account.find().sort({ _id: 1 }).select('balance').lean(), balances);
        assert.equal((await call('POST', `/api/admin/reservations/${reservation._id}/convert-to-sale`, { salePrice: 35000, saleCurrency: 'USD' }, seller1)).status, 409);
    });
    await test('una reserva nueva después de elegir Disponible exige volver a revisar cliente y seña', async () => {
        const car = await mkCar({ plateOrVin: 'RACE18AA' });
        const reviewedBuyer = await Client.create({ fullName: 'Comprador ficticio elegido antes de la reserva', type: 'comprador' });
        const reviewed = await call('GET', '/api/admin/sales/vehicle-options?q=RACE18AA', undefined, seller1);
        assert.equal(reviewed.status, 200);
        assert.equal(reviewed.json.cars[0].status, 'Disponible');
        assert.equal(reviewed.json.cars[0].reservation, null);
        const reserve = await Reservation.create({ vehicleId: car._id, clientId: client._id, status: 'activa',
            agreedPrice: 1200, agreedCurrency: 'USD', depositAmount: 250, depositCurrency: 'USD',
            depositMethod: 'efectivo', expiresAt: new Date(Date.now() + 86400000) });
        await Car.updateOne({ _id: car._id }, { status: 'Reservado' });
        const clientCount = await Client.countDocuments();
        const auditCount = await AuditLog.countDocuments();
        const transactionCount = await Transaction.countDocuments();
        const balances = await Account.find().sort({ _id: 1 }).select('balance').lean();
        const unreviewed = await call('POST', '/api/admin/sales', { ...payload(car), clientId: String(reviewedBuyer._id), depositAppliedAmount: 999 }, seller1);
        assert.equal(unreviewed.status, 409, JSON.stringify(unreviewed.json));
        assert.match(unreviewed.json.message, /reserva.*seleccionarla.*cliente.*seña/i);
        assert.equal(await Sale.countDocuments({ vehicleId: car._id }), 0);
        assert.equal((await Car.findById(car._id)).status, 'Reservado');
        assert.equal((await Reservation.findById(reserve._id)).status, 'activa');
        assert.equal((await Client.findById(reviewedBuyer._id)).fullName, reviewedBuyer.fullName);
        assert.equal(await Client.countDocuments(), clientCount);
        assert.equal(await AuditLog.countDocuments(), auditCount);
        const converted = await call('POST', '/api/admin/sales', { ...payload(car), reservationId: String(reserve._id) }, seller1);
        assert.equal(converted.status, 201, JSON.stringify(converted.json));
        assert.equal(converted.json.clientId, String(client._id));
        assert.equal(converted.json.reservationId, String(reserve._id));
        assert.equal(converted.json.depositAppliedAmount, 250);
        assert.equal(converted.json.balanceAfterTradeIn, 950);
        assert.equal((await Reservation.findById(reserve._id)).status, 'convertida');
        assert.equal((await Car.findById(car._id)).status, 'Vendido');
        assert.equal(await Transaction.countDocuments(), transactionCount);
        assert.deepEqual(await Account.find().sort({ _id: 1 }).select('balance').lean(), balances);
    });
    await test('dos vendedores simultáneos crean una sola venta activa por unidad', async () => {
        const car = await mkCar();
        const responses = await Promise.all([call('POST', '/api/admin/sales', payload(car), seller1), call('POST', '/api/admin/sales', payload(car), seller2)]);
        assert.deepEqual(responses.map(r => r.status).sort(), [201, 409], JSON.stringify(responses));
        assert.equal(await Sale.countDocuments({ vehicleId: car._id, status: { $ne: 'cancelada' } }), 1);
        assert.equal((await Car.findById(car._id)).status, 'Vendido');
    });
    await test('doble envío simultáneo tampoco duplica venta', async () => {
        const { car, reserve } = await reserveCar();
        const data = { ...payload(car), reservationId: String(reserve._id) };
        const responses = await Promise.all([call('POST', '/api/admin/sales', data, seller1), call('POST', '/api/admin/sales', data, seller1)]);
        assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
        assert.equal(await Sale.countDocuments({ vehicleId: car._id }), 1); assert.equal((await Reservation.findById(reserve._id)).status, 'convertida');
    });
    await test('fallo de escritura stock revierte venta, reserva y auditorías', async () => {
        const { car, reserve } = await reserveCar();
        const auditBefore = await AuditLog.countDocuments();
        const originalSave = Car.prototype.save;
        Car.prototype.save = async function(...args) { if (String(this._id) === String(car._id) && this.status === 'Vendido') throw new Error('Fallo ficticio escritura stock'); return originalSave.apply(this, args); };
        try { const r = await call('POST', '/api/admin/sales', { ...payload(car), reservationId: String(reserve._id) }, seller1); assert.equal(r.status, 400); }
        finally { Car.prototype.save = originalSave; }
        assert.equal(await Sale.countDocuments({ vehicleId: car._id }), 0); assert.equal((await Car.findById(car._id)).status, 'Reservado');
        assert.equal((await Reservation.findById(reserve._id)).status, 'activa'); assert.equal(await AuditLog.countDocuments(), auditBefore);
    });
    await test('fallo tardío revierte también cliente nuevo, cuotas, seña y stock', async () => {
        const car = await mkCar(); const clientBefore = await Client.countDocuments(); const txBefore = await Transaction.countDocuments();
        const originalCreate = AuditLog.create;
        AuditLog.create = async () => { throw new Error('Fallo ficticio final de transacción'); };
        try {
            const r = await call('POST', '/api/admin/sales', { ...payload(car), clientId: undefined, buyerName: 'Comprador que se revierte', financingDetails: { hasFinancing: true, cashPrice: 1200, downPayment: 600, installmentsCount: 6, interestRate: 0 } }, seller1);
            assert.equal(r.status, 400);
        } finally { AuditLog.create = originalCreate; }
        assert.equal(await Sale.countDocuments({ vehicleId: car._id }), 0); assert.equal((await Car.findById(car._id)).status, 'Disponible');
        assert.equal(await Client.countDocuments(), clientBefore); assert.equal(await Installment.countDocuments({ vehicleId: car._id }), 0); assert.equal(await Transaction.countDocuments(), txBefore);
    });
    await test('unidad pausada exige permiso Stock, confirmación y motivo auditado', async () => {
        assert.equal((await call('POST', '/api/admin/sales', payload(cars[3]), seller1)).status, 403);
        assert.equal((await call('POST', '/api/admin/sales', payload(cars[3]), admin)).status, 409);
        const r = await call('POST', '/api/admin/sales', { ...payload(cars[3]), resolvePause: true, pauseResolutionReason: 'Documentación ficticia revisada' }, admin);
        assert.equal(r.status, 201, JSON.stringify(r.json));
        const car = await Car.findById(cars[3]._id); assert.equal(car.status, 'Vendido'); assert.ok(car.auditLog.some(a => a.details.includes('Documentación ficticia revisada')));
    });
    await test('reserva vencida no se convierte y no deja cambios parciales', async () => {
        const { car, reserve } = await reserveCar(); await Reservation.updateOne({ _id: reserve._id }, { expiresAt: new Date(Date.now() - 1000) });
        const r = await call('POST', `/api/admin/reservations/${reserve._id}/convert-to-sale`, payload(car), seller1);
        assert.equal(r.status, 409); assert.equal(await Sale.countDocuments({ vehicleId: car._id }), 0); assert.equal((await Car.findById(car._id)).status, 'Reservado');
    });
    await test('el estado y la asignación se validan al confirmar, aunque cambien tras la búsqueda', async () => {
        const car = await mkCar(); await Car.updateOne({ _id: car._id }, { status: 'Pausado' });
        assert.equal((await call('POST', '/api/admin/sales', payload(car), seller1)).status, 403);
        const other = await mkCar(); assert.equal((await call('POST', '/api/admin/sales', { ...payload(other), assignedTo: String(users[2]._id) }, seller1)).status, 403);
        assert.equal(await Sale.countDocuments({ vehicleId: { $in: [car._id, other._id] } }), 0);
    });
    await test('financiación genera cuotas pendientes y comisión sobre total una vez', async () => {
        const car = await mkCar(); const before = await Transaction.countDocuments();
        const r = await call('POST', '/api/admin/sales', { ...payload(car), financingDetails: { hasFinancing: true, cashPrice: 1200, downPayment: 600, installmentsCount: 6, calculationMode: 'by_installment', customInstallmentAmount: 120 }, commissionSettings: { mode: 'percent', percent: 1.3, extraAmount: 999 } }, seller1);
        assert.equal(r.status, 201, JSON.stringify(r.json)); assert.equal(r.json.salePrice, 1320); assert.equal(r.json.commissionSettings.extraAmount, 17.16);
        const insts = await Installment.find({ saleId: r.json._id }); assert.equal(insts.length, 6); assert.equal(insts.reduce((n, i) => n + i.amount, 0), 720);
        assert.equal(await Transaction.countDocuments(), before);
    });
    await test('la ruta legacy de conversión conserva seña y cliente', async () => {
        const { car, reserve } = await reserveCar();
        const r = await call('POST', `/api/admin/reservations/${reserve._id}/convert-to-sale`, { salePrice: 1300, saleCurrency: 'USD' }, seller1);
        assert.equal(r.status, 201, JSON.stringify(r.json)); assert.equal(r.json.depositAppliedAmount, 100);
        assert.equal(r.json.clientId, String(client._id)); assert.equal((await Car.findById(car._id)).status, 'Vendido');
    });
    await test('cambio de vehículo compite con nueva venta sin duplicar unidad', async () => {
        const originalCar = await mkCar({ status: 'Vendido' });
        const existing = await Sale.create({ vehicleId: originalCar._id, clientId: client._id, salePrice: 1200, saleCurrency: 'USD', status: 'confirmada' });
        const target = await mkCar();
        const responses = await Promise.all([
            call('POST', `/api/admin/sales/${existing._id}/change-vehicle`, { newVehicleId: String(target._id), reason: 'Reemplazo ficticio autorizado' }, admin),
            call('POST', '/api/admin/sales', payload(target), seller1)
        ]);
        assert.equal(responses.filter(r => [200, 201].includes(r.status)).length, 1, JSON.stringify(responses));
        assert.equal(responses.filter(r => r.status === 409).length, 1, JSON.stringify(responses));
        assert.equal(await Sale.countDocuments({ vehicleId: target._id, status: { $ne: 'cancelada' } }), 1);
    });
    await test('fallo al cambiar vehículo revierte ambas unidades, cuotas e historia', async () => {
        const originalCar = await mkCar({ status: 'Vendido' }); const target = await mkCar();
        const existing = await Sale.create({ vehicleId: originalCar._id, clientId: client._id, salePrice: 1200, saleCurrency: 'USD', status: 'confirmada' });
        await Installment.create({ saleId: existing._id, vehicleId: originalCar._id, installmentNumber: 1, amount: 100, currency: 'USD', dueDate: new Date() });
        const originalCreate = AuditLog.create; AuditLog.create = async () => { throw new Error('Fallo ficticio auditoría cambio'); };
        try { assert.equal((await call('POST', `/api/admin/sales/${existing._id}/change-vehicle`, { newVehicleId: String(target._id), reason: 'Prueba rollback cambio' }, admin)).status, 400); }
        finally { AuditLog.create = originalCreate; }
        assert.equal((await Car.findById(originalCar._id)).status, 'Vendido'); assert.equal((await Car.findById(target._id)).status, 'Disponible');
        const saved = await Sale.findById(existing._id); assert.equal(String(saved.vehicleId), String(originalCar._id)); assert.equal(saved.vehicleChangeHistory.length, 0);
        assert.equal(String((await Installment.findOne({ saleId: existing._id })).vehicleId), String(originalCar._id));
    });
    await test('anulación normal persiste y la edición no reactiva una venta cancelada', async () => {
        const car = await mkCar(); const created = await call('POST', '/api/admin/sales', payload(car), seller1);
        const cancel = await call('PATCH', `/api/admin/sales/${created.json._id}/cancel`, { reason: 'Prueba ficticia de anulación' }, admin);
        assert.equal(cancel.status, 200, JSON.stringify(cancel.json)); assert.equal(cancel.json.status, 'cancelada');
        const reactivate = await call('PATCH', `/api/admin/sales/${created.json._id}`, { status: 'confirmada' }, admin);
        assert.equal(reactivate.status, 409); assert.equal(reactivate.json.code, 'SALE_CANCELLED');
        assert.equal((await Sale.findById(created.json._id)).status, 'cancelada');
    });
    await test('seña y permuta financiadas se aplican una vez sin generar cobros', async () => {
        const { car, reserve } = await reserveCar(); const before = await Transaction.countDocuments();
        const r = await call('POST', '/api/admin/sales', { ...payload(car), reservationId: String(reserve._id),
            tradeIns: [{ brand: 'Ficticio', model: 'Permuta', year: 2020, estimatedValue: 200, currency: 'USD' }],
            financingDetails: { hasFinancing: true, cashPrice: 1200, downPayment: 600, installmentsCount: 6, interestRate: 0, includesDeposit: true }
        }, seller1);
        assert.equal(r.status, 201, JSON.stringify(r.json)); assert.equal(r.json.salePrice, 1200);
        assert.equal(r.json.depositAppliedAmount, 100); assert.equal(r.json.tradeInTotalAmount, 200); assert.equal(r.json.balanceAfterTradeIn, 900);
        assert.equal(r.json.financingDetails.financedBalance, 600);
        const insts = await Installment.find({ saleId: r.json._id }); assert.equal(insts.reduce((sum, i) => sum + i.amount, 0), 600);
        assert.equal(await Transaction.countDocuments(), before);
    });
    await test('seña en moneda distinta exige cotización y se aplica con conversión explícita', async () => {
        const { car, reserve } = await reserveCar(); await Reservation.updateOne({ _id: reserve._id }, { depositAmount: 50000, depositCurrency: 'ARS' });
        const missingRate = await call('POST', '/api/admin/sales', { ...payload(car), reservationId: String(reserve._id) }, seller1); assert.equal(missingRate.status, 400);
        assert.equal(await Sale.countDocuments({ vehicleId: car._id }), 0); assert.equal((await Reservation.findById(reserve._id)).status, 'activa');
        const r = await call('POST', '/api/admin/sales', { ...payload(car), reservationId: String(reserve._id), exchangeRate: 1000 }, seller1);
        assert.equal(r.status, 201, JSON.stringify(r.json)); assert.equal(r.json.depositAppliedAmount, 50000);
        assert.equal(r.json.depositAppliedCurrency, 'ARS'); assert.equal(r.json.balanceAfterTradeIn, 1150);
    });
    console.log(`${passed} pruebas de confirmación de ventas OK. Base ficticia replica set.`);
} catch (error) { console.error(error); process.exitCode = 1; }
finally { await env.stop(); }
