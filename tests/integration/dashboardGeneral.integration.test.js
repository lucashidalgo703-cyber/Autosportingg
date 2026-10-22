// Pruebas de integración del Dashboard general / Cockpit CEO.
// Servidor Express real + MongoDB EN MEMORIA (jamás producción).
// Verifica:
// 1. Endpoint /api/admin/dashboard responda 200 con estructura y proyección requeridas.
// 2. Las transacciones expongan saleId y treasuryBreakdown completos para conciliar cobros.
// 3. calculateDashboardMetrics procese el payload devuelto por el servidor sin errores,
//    produciendo las métricas exactas que consumen CockpitCeoSote y GeneralDashboardSote.

import assert from 'node:assert/strict';
import { boot } from './harness.js';

const { call, test, finish, mongoose } = await boot();
const { default: Car } = await import('../../src/models/Car.js');
const { default: Sale } = await import('../../src/models/Sale.js');
const { default: Transaction } = await import('../../src/models/Transaction.js');
const { default: Installment } = await import('../../src/models/Installment.js');
const { calculateDashboardMetrics } = await import('../../src/components/crm/dashboard/dashboardMetrics.js');

console.log('=== PRUEBAS DE INTEGRACIÓN: DASHBOARD GENERAL Y COCKPIT CEO ===');

await Car.deleteMany({});
await Sale.deleteMany({});
await Transaction.deleteMany({});
await Installment.deleteMany({});

const car = await Car.create({
    brand: 'Toyota', name: 'Corolla XEI', year: 2022, km: 25000, fuel: 'Nafta', condition: 'Usado',
    price: 20000, currency: 'USD', purchasePrice: 15000, purchaseCurrency: 'USD', status: 'Vendido', agencyOwned: true
});

const sale = await Sale.create({
    vehicleId: car._id, salePrice: 20000, saleCurrency: 'USD', buyerName: 'Cliente Test',
    saleDate: new Date(), status: 'confirmada', paymentMethod: 'contado',
    commissionSettings: { mode: 'fixed', extraAmount: 500, extraCurrency: 'USD' }
});

const accountId = new mongoose.Types.ObjectId();
await Transaction.create({
    type: 'Ingreso', amount: 16000, currency: 'USD', description: 'Cobro de costo + comisión', category: 'Ventas',
    accountId, saleId: sale._id, date: new Date(), status: 'activo',
    isTreasuryDistributed: true,
    treasuryBreakdown: {
        totalCollected: 16000, ownGrossAmount: 16000,
        capitalRecoveredToStock: 15500, obligationsSeparated: 500,
        marginCollected: 0, marginDistributed: 0, schemeKey: 'caja_ajustada'
    }
});

await Transaction.create({
    type: 'Ingreso', amount: 4000, currency: 'USD', description: 'Cobro final de margen', category: 'Ventas',
    accountId, saleId: sale._id, date: new Date(), status: 'activo',
    isTreasuryDistributed: true,
    treasuryBreakdown: {
        totalCollected: 4000, ownGrossAmount: 4000,
        capitalRecoveredToStock: 0, obligationsSeparated: 0,
        marginCollected: 4000, marginDistributed: 3000, schemeKey: 'caja_solida'
    }
});

await Installment.create({
    installmentNumber: 1,
    amount: 2500,
    currency: 'USD',
    status: 'pendiente',
    dueDate: new Date()
});

await test('GET /api/admin/dashboard responde 200 con la estructura esperada', async () => {
    const { status, json } = await call('GET', '/api/admin/dashboard');
    assert.equal(status, 200, `status ${status}: ${JSON.stringify(json)}`);
    for (const k of ['cars', 'sales', 'transactions', 'installments', 'cockpitTargetUSD']) {
        assert.ok(k in json, `falta la clave ${k}`);
    }
    assert.equal(json.cars.length, 1);
    assert.equal(json.sales.length, 1);
    assert.equal(json.transactions.length, 2);
    assert.equal(json.installments.length, 1);
});

await test('Las transacciones del dashboard incluyen saleId y treasuryBreakdown para conciliar cobros', async () => {
    const { json } = await call('GET', '/api/admin/dashboard');
    const tx = json.transactions[0];
    assert.ok(tx, 'sin transacciones');
    assert.ok(tx.saleId, 'la transacción no expone saleId');
    assert.ok(tx.treasuryBreakdown, 'la transacción no expone treasuryBreakdown');
    assert.equal(tx.treasuryBreakdown.schemeKey, 'caja_ajustada');
});

await test('calculateDashboardMetrics procesa el payload de la API y genera todas las métricas de UI', async () => {
    const { json } = await call('GET', '/api/admin/dashboard');
    const user = { id: 'test_owner', role: 'owner', name: 'Tester' };
    const selectedDate = new Date();

    const metrics = calculateDashboardMetrics(
        json.cars,
        json.sales,
        selectedDate,
        json.transactions,
        json.installments,
        user,
        json.dolarBlue || { rate: 1200 },
        json.dolarBlueHistory,
        json.cockpitTargetUSD
    );

    // 1. Verificación para Cockpit CEO
    assert.ok(metrics.monthlyBilling, 'falta monthlyBilling');
    assert.equal(metrics.monthlyBilling.salesCount, 1);
    assert.equal(metrics.monthlyBilling.totalOriginalUSD, 20000);

    // 2. Verificación de los 3 conceptos de ganancia
    const gains = metrics.last12MonthsGains;
    assert.ok(gains, 'falta last12MonthsGains');
    assert.ok(gains.commercial, 'falta gains.commercial');
    assert.ok(gains.collected, 'falta gains.collected');
    assert.ok(gains.distributed, 'falta gains.distributed');

    // Ganancia comercial: precio 20000 - costo 15000 - comision 500 = 4500 USD
    assert.equal(gains.commercial.totalAccumulatedUSD, 4500);
    // Ganancia cobrada según Tesorería: cobro 1 (0) + cobro 2 (4000) = 4000 USD
    assert.equal(gains.collected.totalAccumulatedUSD, 4000);
    // Ganancia distribuida según Tesorería: cobro 1 (0) + cobro 2 (3000) = 3000 USD
    assert.equal(gains.distributed.totalAccumulatedUSD, 3000);

    // 3. Verificación de flujo de caja / Finanzas
    assert.ok(metrics.finanzas, 'falta metrics.finanzas');
    assert.equal(metrics.finanzas.ingresosUSD, 20000);
    assert.equal(metrics.finanzas.egresosUSD, 0);
    assert.equal(metrics.finanzas.saldos.USD, 20000);

    // 4. Verificación de Cuotas
    assert.ok(metrics.cuotas, 'falta metrics.cuotas');
    assert.equal(metrics.cuotas.totalMontoUSD, 2500);
    assert.equal(metrics.cuotas.cantidadMes, 1);

    // 5. Verificación de Stock y Margen
    assert.equal(metrics.counts.vendidos, 1);
    assert.equal(metrics.margenEstimado.USD, 4500);
});

await finish();
