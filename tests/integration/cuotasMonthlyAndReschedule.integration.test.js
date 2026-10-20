import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, token } = await boot();
const { default: mongoose } = await import('mongoose');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Car } = await import('../../src/models/Car.js');
const { default: Client } = await import('../../src/models/Client.js');
const { default: Installment } = await import('../../src/models/Installment.js');

console.log('=== PRUEBAS DE INTEGRACIÓN: CUOTAS MENSUALES, REPROGRAMACIONES Y AUDITORÍA ===');

let testClient;
let testCar;
let testSale;
let currentMonthInstARS;
let currentMonthInstUSD;
let prevMonthInstARS;

await test('0. Preparación de datos: Cliente, Auto, Venta y Cuotas multimoneda', async () => {
    testClient = await Client.create({
        firstName: 'Carlos',
        lastName: 'Gómez',
        fullName: 'Carlos Gómez',
        dni: '30111222',
        phone: '1144556677'
    });

    testCar = await Car.create({
        brand: 'Toyota',
        name: 'Corolla XEI',
        year: 2022,
        km: 35000,
        fuel: 'Nafta',
        condition: 'Usado',
        price: 25000000,
        currency: '$',
        plateOrVin: 'AF123ZZ',
        purchasePrice: 20000000,
        purchaseCurrency: 'ARS',
        status: 'Vendido'
    });

    testSale = await Sale.create({
        clientId: testClient._id,
        vehicleId: testCar._id,
        salePrice: 25000000,
        saleCurrency: 'ARS',
        status: 'confirmada',
        saleDate: new Date()
    });

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth(); // 0-based

    // Cuota 1: Mes actual en ARS (vence a fin de mes)
    currentMonthInstARS = await Installment.create({
        saleId: testSale._id,
        clientId: testClient._id,
        vehicleId: testCar._id,
        installmentNumber: 1,
        totalInstallments: 3,
        amount: 2000000,
        currency: 'ARS',
        dueDate: new Date(Date.UTC(curYear, curMonth, 28, 12, 0, 0)),
        status: 'pendiente'
    });

    // Cuota 2: Mes actual en USD
    currentMonthInstUSD = await Installment.create({
        saleId: testSale._id,
        clientId: testClient._id,
        vehicleId: testCar._id,
        installmentNumber: 2,
        totalInstallments: 3,
        amount: 1500,
        currency: 'USD',
        dueDate: new Date(Date.UTC(curYear, curMonth, 20, 12, 0, 0)),
        status: 'pendiente'
    });

    // Cuota 3: Mes anterior en ARS (pendiente)
    const prevDate = new Date(Date.UTC(curYear, curMonth - 1, 10, 12, 0, 0));
    prevMonthInstARS = await Installment.create({
        saleId: testSale._id,
        clientId: testClient._id,
        vehicleId: testCar._id,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: 500000,
        currency: 'ARS',
        dueDate: prevDate,
        status: 'vencida'
    });

    assert.ok(currentMonthInstARS._id);
    assert.ok(currentMonthInstUSD._id);
    assert.ok(prevMonthInstARS._id);
});

await test('1. GET /api/admin/installments/monthly - Vista del mes actual y separación estricta de monedas', async () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const res = await call('GET', `/api/admin/installments/monthly?month=${curMonth}&year=${curYear}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);

    // Verificamos que las monedas estén totalmente separadas en el resumen
    assert.equal(res.json.summary.ars.totalExpected, 2000000);
    assert.equal(res.json.summary.ars.totalPending, 2000000);
    assert.equal(res.json.summary.ars.countTotal, 1);
    assert.equal(res.json.summary.ars.countPending, 1);

    assert.equal(res.json.summary.usd.totalExpected, 1500);
    assert.equal(res.json.summary.usd.totalPending, 1500);
    assert.equal(res.json.summary.usd.countTotal, 1);

    // Verificamos que detecte la cuota pendiente del mes anterior
    assert.ok(res.json.previousPendingCount >= 1, 'Debe registrar al menos 1 cuota pendiente de meses anteriores');

    // Verificamos enriquecimiento de las cuotas listadas
    const items = res.json.items;
    assert.equal(items.length, 2);
    const arsItem = items.find(i => i.currency === 'ARS');
    assert.ok(arsItem);
    assert.equal(arsItem.mainStatus, 'PENDIENTE');
    assert.equal(arsItem.client.fullName, 'Carlos Gómez');
    assert.equal(arsItem.vehicle.plateOrVin, 'AF123ZZ');
});

await test('2. GET /api/admin/installments/monthly?onlyPreviousPending=true - Pendientes de meses anteriores', async () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const res = await call('GET', `/api/admin/installments/monthly?month=${curMonth}&year=${curYear}&onlyPreviousPending=true`);
    assert.equal(res.status, 200);
    assert.equal(res.json.ok, true);
    assert.ok(res.json.items.some(i => i._id.toString() === prevMonthInstARS._id.toString()));
});

await test('3. POST /api/admin/installments/:id/reschedule - Reprogramación con motivo obligatorio', async () => {
    const instId = currentMonthInstARS._id.toString();

    // Intento 1: Sin motivo -> 400
    const noReason = await call('POST', `/api/admin/installments/${instId}/reschedule`, {
        newDate: '2026-11-25',
        reason: '   '
    });
    assert.equal(noReason.status, 400);
    assert.match(noReason.json.message, /motivo.*obligatorio/i);

    // Intento 2: Sin fecha -> 400
    const noDate = await call('POST', `/api/admin/installments/${instId}/reschedule`, {
        reason: 'Cliente solicita postergación'
    });
    assert.equal(noDate.status, 400);

    // Intento 3: Exitoso
    const successRes = await call('POST', `/api/admin/installments/${instId}/reschedule`, {
        newDate: '2026-11-28T15:00:00.000Z',
        reason: 'Acordado pago a fin de mes por cobro de aguinaldo',
        notes: 'Habló por teléfono con el cliente'
    });
    assert.equal(successRes.status, 200);
    assert.equal(successRes.json.ok, true);

    const updated = await Installment.findById(instId);
    assert.equal(updated.isRescheduled, true);
    assert.equal(updated.rescheduledReason, 'Acordado pago a fin de mes por cobro de aguinaldo');
    assert.equal(updated.status, 'reprogramada');
    assert.equal(updated.rescheduleHistory.length, 1);
    assert.equal(updated.rescheduleHistory[0].reason, 'Acordado pago a fin de mes por cobro de aguinaldo');
    assert.ok(updated.originalDueDate, 'Debe preservar originalDueDate');
});

await test('4. Múltiples reprogramaciones conservan historial cronológico', async () => {
    const instId = currentMonthInstARS._id.toString();

    const secondRes = await call('POST', `/api/admin/installments/${instId}/reschedule`, {
        newDate: '2026-12-05T15:00:00.000Z',
        reason: 'Segunda reprogramación acordada por retraso bancario'
    });
    assert.equal(secondRes.status, 200);

    const updated = await Installment.findById(instId);
    assert.equal(updated.rescheduleHistory.length, 2);
    assert.equal(updated.rescheduledReason, 'Segunda reprogramación acordada por retraso bancario');
});

await test('5. POST /api/admin/installments/:id/cancel-reschedule - Cancelar reprogramación restaura fecha original', async () => {
    const instId = currentMonthInstARS._id.toString();

    // Sin motivo -> 400
    const noReason = await call('POST', `/api/admin/installments/${instId}/cancel-reschedule`, {
        cancelReason: '  '
    });
    assert.equal(noReason.status, 400);

    // Exitoso
    const cancelRes = await call('POST', `/api/admin/installments/${instId}/cancel-reschedule`, {
        cancelReason: 'Cliente canceló el acuerdo y pagará en la fecha prevista original'
    });
    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.json.ok, true);

    const restored = await Installment.findById(instId);
    assert.equal(restored.isRescheduled, false);
    assert.equal(restored.rescheduledDate, null);
    assert.equal(restored.status, 'pendiente');
    // Último item de historial marcado como cancelado
    const lastItem = restored.rescheduleHistory[restored.rescheduleHistory.length - 1];
    assert.equal(lastItem.isCancelled, true);
    assert.equal(lastItem.cancelReason, 'Cliente canceló el acuerdo y pagará en la fecha prevista original');
});

await test('6. GET /api/admin/installments/:id/history - Historial completo de auditoría y transacciones', async () => {
    const instId = currentMonthInstARS._id.toString();
    const histRes = await call('GET', `/api/admin/installments/${instId}/history`);
    assert.equal(histRes.status, 200);
    assert.equal(histRes.json.ok, true);
    assert.ok(histRes.json.rescheduleHistory.length >= 2);
    assert.ok(histRes.json.installmentAuditLog.length >= 3);
});

console.log('=== PRUEBAS DE CUOTAS Y REPROGRAMACIONES COMPLETADAS EXITOSAMENTE ===');
await finish();
