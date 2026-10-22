// Pruebas de cálculo financiero del Dashboard: ganancia comercial, cobrada y distribuida.
// Puras (sin base de datos): ejecutar con `node tests/dashboardGains.test.js`.
import assert from 'node:assert/strict';
import { calculateDashboardMetrics } from '../src/components/crm/dashboard/dashboardMetrics.js';

let passed = 0;
const test = (name, fn) => {
    try { fn(); passed++; console.log(`  ok  - ${name}`); }
    catch (e) { console.error(`  FAIL - ${name}\n`, e.message); process.exitCode = 1; }
};

const NOW = new Date();
const monthIdx = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const THIS = monthIdx(NOW);
const prevMonthDate = (n) => { const d = new Date(NOW); d.setDate(15); d.setMonth(d.getMonth() - n); return d; };
const mid = (d) => { const x = new Date(d); x.setDate(15); x.setHours(15, 0, 0, 0); return x; };

let seq = 0;
const id = () => `id${++seq}`;

const mkCar = (over = {}) => ({
    _id: id(), brand: 'Toyota', name: 'Corolla', year: 2022, status: 'Vendido', agencyOwned: true,
    purchasePrice: 15000, purchaseCurrency: 'USD', price: 20000, currency: 'USD', expenses: [], ...over
});
const mkSale = (car, over = {}) => ({
    _id: id(), vehicleId: car._id, salePrice: 20000, saleCurrency: 'USD', saleDate: mid(NOW),
    status: 'confirmada', paymentMethod: 'contado', buyerName: 'Cliente', ...over
});
const mkTx = (sale, over = {}) => ({
    _id: id(), saleId: sale._id, type: 'Ingreso', amount: 1000, currency: 'USD', status: 'activo',
    date: mid(NOW), concept: 'Cobro', ...over
});
const run = (cars, sales, txs = [], extra = {}) =>
    calculateDashboardMetrics(cars, sales, NOW, txs, [], {}, extra.dolarBlue ?? { rate: 1000 }, extra.history ?? null, 110000);
const bucket = (list, key = THIS) => list.months.find((m) => m.key === key);
const sum = (list, f) => list.months.reduce((a, m) => a + m[f], 0);

console.log('=== PRUEBAS: GANANCIA COMERCIAL / COBRADA / DISTRIBUIDA ===');

// Operación base: precio 20000, costo 15000, gastos 500, comisión 500 => ganancia comercial 4000 USD
const baseCar = (over = {}) => mkCar({ expenses: [{ amount: 500, currency: 'USD', concept: 'Service' }], ...over });
const baseSale = (car, over = {}) => mkSale(car, { commissionSettings: { mode: 'fixed', extraAmount: 500, extraCurrency: 'USD' }, ...over });

test('Ganancia comercial: descuenta costo, gastos y comisión una sola vez y va al mes de la venta', () => {
    const car = baseCar(); const sale = baseSale(car);
    const m = run([car], [sale]);
    const g = m.last12MonthsGains;
    assert.equal(bucket(g.commercial).gainUSD, 4000);
    assert.equal(g.commercial.totalAccumulatedUSD, 4000);
    assert.equal(g.projected, g.commercial, 'alias projected = comercial');
});

test('Cobro parcial: no libera margen hasta recuperar capital (costo + gastos + comisión)', () => {
    const car = baseCar(); const sale = baseSale(car);
    const m = run([car], [sale], [mkTx(sale, { amount: 10000 })]);
    assert.equal(bucket(m.last12MonthsGains.collected).gainUSD, 0);
});

test('Cobro parcial que supera el capital libera solo el excedente', () => {
    const car = baseCar(); const sale = baseSale(car);
    const m = run([car], [sale], [mkTx(sale, { amount: 17000 })]);
    assert.equal(bucket(m.last12MonthsGains.collected).gainUSD, 1000);
});

test('Cobro total = ganancia comercial (nunca la supera aunque se cobre de más)', () => {
    const car = baseCar(); const sale = baseSale(car);
    const m = run([car], [sale], [mkTx(sale, { amount: 20000 }), mkTx(sale, { amount: 3000, date: prevMonthDate(0) })]);
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 4000);
    assert.equal(m.last12MonthsGains.reconciliation.salesWithCollectedAboveCommercial.length, 0);
});

test('Cobros en meses distintos: el margen va al mes del cobro, la comercial al mes de la venta', () => {
    const car = baseCar();
    const sale = baseSale(car, { saleDate: mid(prevMonthDate(2)) });
    const txs = [
        mkTx(sale, { amount: 16000, date: mid(prevMonthDate(2)) }),
        mkTx(sale, { amount: 4000, date: mid(NOW) })
    ];
    const m = run([car], [sale], txs);
    const g = m.last12MonthsGains;
    assert.equal(bucket(g.commercial, monthIdx(prevMonthDate(2))).gainUSD, 4000);
    assert.equal(bucket(g.collected, monthIdx(prevMonthDate(2))).gainUSD, 0);
    assert.equal(bucket(g.collected).gainUSD, 4000);
});

test('Comisiones: el pago de la comisión NO resta cobros ni duplica el descuento', () => {
    const car = baseCar(); const sale = baseSale(car);
    const txs = [
        mkTx(sale, { amount: 20000 }),
        mkTx(sale, { type: 'Egreso', amount: 500, category: 'Comisiones', concept: 'Pago comisión vendedor' }),
        mkTx(sale, { type: 'Egreso', amount: 300, category: 'Gastos', concept: 'Lavado' })
    ];
    const m = run([car], [sale], txs);
    const g = m.last12MonthsGains;
    assert.equal(sum(g.collected, 'gainUSD'), 4000);
    assert.equal(g.reconciliation.commissionPayments.count, 1);
    assert.equal(g.reconciliation.otherExpensesIgnored, 1);
});

test('Devoluciones: un egreso de devolución al cliente revierte margen cobrado', () => {
    const car = baseCar(); const sale = baseSale(car);
    const txs = [
        mkTx(sale, { amount: 20000, date: mid(prevMonthDate(1)) }),
        mkTx(sale, { type: 'Egreso', amount: 1000, category: 'Devolución', concept: 'Devolución al cliente', date: mid(NOW) })
    ];
    const m = run([car], [sale], txs);
    const g = m.last12MonthsGains;
    assert.equal(bucket(g.collected, monthIdx(prevMonthDate(1))).gainUSD, 4000);
    assert.equal(bucket(g.collected).gainUSD, -1000);
    assert.equal(g.reconciliation.refunds.count, 1);
});

test('Socios: la ganancia comercial y la cobrada consideran solo la parte de la agencia', () => {
    const car = baseCar({ investor: { name: 'Socio', percentage: 40 } });
    const sale = baseSale(car);
    const m = run([car], [sale], [mkTx(sale, { amount: 20000 })]);
    const g = m.last12MonthsGains;
    assert.equal(bucket(g.commercial).gainUSD, 2400); // 4000 * 60%
    assert.equal(sum(g.collected, 'gainUSD'), 2400);
});

test('Permutas: el vehículo recibido no es efectivo; el efectivo cubre el resto sin duplicar capital', () => {
    const car = baseCar();
    const sale = baseSale(car, { tradeInTotalAmount: 5000, tradeIns: [{ estimatedValue: 5000, currency: 'USD' }], paymentMethod: 'permuta' });
    // Efectivo esperado = 20000 - 5000 = 15000. Ganancia comercial 4000 ya incluye la permuta valuada.
    const m = run([car], [sale], [mkTx(sale, { amount: 15000 })]);
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 4000);
});

test('Tesorería: margen cobrado se toma de marginCollected aunque marginDistributed sea 0 (esquema pendiente)', () => {
    const car = baseCar(); const sale = baseSale(car);
    const tx = mkTx(sale, {
        amount: 20000, isTreasuryDistributed: true,
        treasuryBreakdown: { totalCollected: 20000, ownGrossAmount: 20000, capitalRecoveredToStock: 15500, obligationsSeparated: 500, marginCollected: 4000, marginDistributed: 0, schemeKey: null }
    });
    // schemeKey null + valores > 0 => cuenta como procesado
    const m = run([car], [sale], [tx]);
    const g = m.last12MonthsGains;
    assert.equal(sum(g.collected, 'gainUSD'), 4000, 'la cobrada no puede ser 0');
    assert.equal(sum(g.distributed, 'gainUSD'), 0, 'lo distribuido es 0 hasta elegir esquema');
});

test('Tesorería: marginDistributed va solo a distribuida y no infla la cobrada', () => {
    const car = baseCar(); const sale = baseSale(car);
    const tx = mkTx(sale, {
        amount: 20000, isTreasuryDistributed: true,
        treasuryBreakdown: { ownGrossAmount: 20000, capitalRecoveredToStock: 16000, marginCollected: 4000, marginDistributed: 3000, schemeKey: 'caja_solida' }
    });
    const m = run([car], [sale], [tx]);
    const g = m.last12MonthsGains;
    assert.equal(sum(g.collected, 'gainUSD'), 4000);
    assert.equal(sum(g.distributed, 'gainUSD'), 3000);
});

test('Tesorería: documentos viejos con marginDistributed = 0 usan la suma de componentes', () => {
    const car = baseCar(); const sale = baseSale(car);
    const tx = mkTx(sale, {
        amount: 20000, isTreasuryDistributed: true,
        treasuryBreakdown: { ownGrossAmount: 20000, capitalRecoveredToStock: 16000, marginCollected: 0, marginDistributed: 0, remainderDistributed: 3000, reserveCovered: 1000, schemeKey: 'x' }
    });
    const m = run([car], [sale], [tx]);
    const g = m.last12MonthsGains;
    assert.equal(sum(g.distributed, 'gainUSD'), 4000);
    assert.equal(sum(g.collected, 'gainUSD'), 4000, 'lo cobrado no puede ser menor que lo distribuido');
});

test('Capital recuperado por Tesorería no se cuenta dos veces con cobros posteriores sin distribuir', () => {
    const car = baseCar(); const sale = baseSale(car);
    const dist = mkTx(sale, {
        amount: 16000, date: mid(prevMonthDate(1)), isTreasuryDistributed: true,
        treasuryBreakdown: { ownGrossAmount: 16000, capitalRecoveredToStock: 16000, marginCollected: 0, marginDistributed: 0, schemeKey: 'x' }
    });
    const later = mkTx(sale, { amount: 4000, date: mid(NOW) });
    const m = run([car], [sale], [dist, later]);
    // Capital (16000) ya recuperado por Tesorería: los 4000 posteriores son margen íntegro.
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 4000);
});

test('Distribución revertida: se trata como cobro sin distribuir (cascada estimada)', () => {
    const car = baseCar(); const sale = baseSale(car);
    const tx = mkTx(sale, {
        amount: 20000, isTreasuryDistributed: true, isTreasuryDistributionReversed: true,
        treasuryBreakdown: { ownGrossAmount: 20000, capitalRecoveredToStock: 16000, marginCollected: 9999, marginDistributed: 9999, schemeKey: 'x' }
    });
    const m = run([car], [sale], [tx]);
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 4000);
    assert.equal(sum(m.last12MonthsGains.distributed, 'gainUSD'), 0);
});

test('Monedas: venta ARS cobrada en USD usa la cotización registrada; sin cotización no inventa margen', () => {
    const car = mkCar({ purchasePrice: 10000000, purchaseCurrency: 'ARS' });
    const sale = mkSale(car, { salePrice: 14000000, saleCurrency: 'ARS', exchangeRate: 1000 });
    const withRate = run([car], [sale], [mkTx(sale, { amount: 14000, currency: 'USD' })]);
    assert.equal(sum(withRate.last12MonthsGains.collected, 'gainARS'), 4000000);
    assert.equal(sum(withRate.last12MonthsGains.collected, 'gainUSD'), 4000);

    const car2 = mkCar({ purchasePrice: 10000000, purchaseCurrency: 'ARS' });
    const sale2 = mkSale(car2, { salePrice: 14000000, saleCurrency: 'ARS' }); // sin exchangeRate
    const noRate = run([car2], [sale2], [mkTx(sale2, { amount: 14000, currency: 'USD' })], { dolarBlue: null });
    assert.equal(sum(noRate.last12MonthsGains.collected, 'gainARS'), 0);
    assert.equal(noRate.last12MonthsGains.reconciliation.unconvertibleCashEvents, 1);
});

test('Cobros pendientes y movimientos anulados no cuentan como dinero cobrado', () => {
    const car = baseCar(); const sale = baseSale(car);
    const m = run([car], [sale], [mkTx(sale, { amount: 20000, status: 'pendiente' }), mkTx(sale, { amount: 20000, status: 'anulado' })]);
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 0);
    assert.equal(m.last12MonthsGains.reconciliation.ignoredPendingOrVoided, 2);
});

test('Ingresos sin venta vinculada no generan margen: se informan para conciliar', () => {
    const car = baseCar(); const sale = baseSale(car);
    const m = run([car], [sale], [{ _id: id(), type: 'Ingreso', amount: 500, currency: 'USD', status: 'activo', date: mid(NOW) }]);
    const g = m.last12MonthsGains;
    assert.equal(sum(g.collected, 'gainUSD'), 0);
    assert.equal(g.reconciliation.unlinkedIncomes.count, 1);
    assert.equal(sum(g.collected, 'salesCount'), 0);
});

test('Seña aplicada sin movimiento propio cuenta como efectivo cobrado (sin duplicarse si existe el movimiento)', () => {
    const car = baseCar();
    const sale = baseSale(car, { depositAppliedAmount: 20000, depositAppliedCurrency: 'USD' });
    const m = run([car], [sale]);
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 4000);
    const withTx = run([car], [sale], [mkTx(sale, { amount: 20000, source: 'reserva', concept: 'Seña' })]);
    assert.equal(sum(withTx.last12MonthsGains.collected, 'gainUSD'), 4000, 'no se duplica');
});

test('Venta sin ganancia calculable (sin costo): no inventa margen cobrado', () => {
    const car = mkCar({ purchasePrice: 0 }); const sale = mkSale(car);
    const m = run([car], [sale], [mkTx(sale, { amount: 20000 })]);
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 0);
    assert.equal(m.last12MonthsGains.reconciliation.salesWithoutCalculableProfit.length, 1);
});

test('Ventas canceladas o en borrador no generan ganancia', () => {
    const car = baseCar(); const sale = baseSale(car, { status: 'cancelada' });
    const m = run([car], [sale], [mkTx(sale, { amount: 20000 })]);
    assert.equal(sum(m.last12MonthsGains.commercial, 'gainUSD'), 0);
    assert.equal(sum(m.last12MonthsGains.collected, 'gainUSD'), 0);
});

test('Flujo del mes (Dashboard general): reconoce Ingreso/Egreso capitalizados y excluye anulados', () => {
    const car = baseCar(); const sale = baseSale(car);
    const m = run([car], [sale], [
        mkTx(sale, { amount: 1000, type: 'Ingreso' }),
        mkTx(sale, { amount: 300, type: 'Egreso', category: 'Gastos' }),
        mkTx(sale, { amount: 9999, type: 'Ingreso', status: 'anulado' })
    ]);
    assert.equal(m.finanzas.ingresosUSD, 1000);
    assert.equal(m.finanzas.egresosUSD, 300);
    assert.equal(m.finanzas.saldos.USD, 700);
});

test('La estructura del panel conserva claves compatibles (months, projected, released) y nuevas', () => {
    const car = baseCar(); const sale = baseSale(car);
    const g = run([car], [sale]).last12MonthsGains;
    for (const k of ['months', 'projected', 'released', 'commercial', 'collected', 'distributed', 'reconciliation']) assert.ok(k in g, k);
    assert.equal(g.months.length, 12);
});

console.log(`\n${passed} pruebas OK${process.exitCode ? ' (con fallos)' : ''}`);
