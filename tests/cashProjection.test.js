// Pruebas puras: no importan servidor, modelos, entorno ni proveedores.
// Ejecutar con node --test tests/cashProjection.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCashProjection, getBusinessDateKey, getArgentinaDateKey, getEffectiveInstallmentDueDate, getUpcomingInstallmentPresentation } from '../src/utils/cashProjection.js';

const asOf = '2026-11-10T15:00:00.000Z';
const account = (overrides = {}) => ({ _id: 'a1', currency: 'ARS', balance: 1000, isActive: true, ...overrides });
const sale = (overrides = {}) => ({ _id: 's1', status: 'confirmada', ...overrides });
const installment = (overrides = {}) => ({ _id: 'i1', saleId: 's1', source: 'venta', status: 'pendiente', currency: 'ARS', amount: 100, paidAmount: 0, dueDate: '2026-11-10', ...overrides });
const transaction = (overrides = {}) => ({ _id: 't1', type: 'Egreso', currency: 'ARS', amount: 40, status: 'pendiente', dueDate: '2026-11-11', ...overrides });
const run = (overrides = {}) => buildCashProjection({ accounts: [account()], sales: [sale()], installments: [], transactions: [], asOf, ...overrides });

test('parte de cuentas activas, separa monedas y conserva saldos negativos', () => {
    const result = run({ accounts: [account(), account({ _id: 'a2', currency: 'USD', balance: -25.5 }), account({ _id: 'archived', balance: 99999, isActive: false })] });
    assert.deepEqual(result.openingBalances, { ARS: 1000, USD: -25.5 });
    assert.deepEqual(result.periods[0].closingBalances, { ARS: 1000, USD: -25.5 });
    assert.equal(result.quality.excluded.inactiveAccounts, 1);
});

test('una cuota parcial suma únicamente lo pendiente, no el total original', () => {
    const result = run({ installments: [installment({ status: 'parcial', paidAmount: 35.25 })] });
    assert.equal(result.periods[0].incoming.ARS, 64.75);
    assert.equal(result.periods[0].closingBalances.ARS, 1064.75);
});

test('cuotas manuales sin venta se consideran y cuotas pagadas o anuladas se excluyen', () => {
    const result = run({ installments: [
        installment({ source: 'manual', saleId: undefined }),
        installment({ _id: 'paid', status: 'pagada' }),
        installment({ _id: 'manual-paid', status: 'pagada_manual' }),
        installment({ _id: 'void', status: 'anulada' })
    ] });
    assert.equal(result.periods[0].incoming.ARS, 100);
    assert.equal(result.quality.excluded.closedInstallments, 3);
});

test('cuotas de borradores o ventas canceladas no generan previsión de ingreso', () => {
    const result = run({ sales: [sale({ status: 'borrador' }), sale({ _id: 's2', status: 'cancelada' })], installments: [installment(), installment({ _id: 'i2', saleId: 's2' })] });
    assert.equal(result.periods[0].incoming.ARS, 0);
    assert.equal(result.quality.excluded.inactiveSales, 2);
    assert.equal(result.quality.complete, true);
});

test('importación legacy sin historicalOnly conserva cuotas realmente cobrables', () => {
    const result = run({ sales: [sale({ status: 'entregada', isManualImport: true })], installments: [installment()] });
    assert.equal(result.periods[0].incoming.ARS, 100);
    assert.equal(result.periods[0].closingBalances.ARS, 1100);
    assert.equal(result.quality.excluded.historicalSales, 0);
});

test('historicalOnly excluye entradas de la carga para reportes y conserva egresos explícitos', () => {
    const result = run({
        sales: [sale({ status: 'entregada', isManualImport: true, historicalOnly: true })],
        installments: [installment()],
        transactions: [transaction({ saleId: 's1' }), transaction({ _id: 'income', type: 'Ingreso', saleId: 's1', amount: 75 })]
    });
    assert.equal(result.periods[0].incoming.ARS, 0);
    assert.equal(result.periods[0].outgoing.ARS, 40);
    assert.equal(result.quality.excluded.historicalSales, 2);
    assert.equal(result.quality.complete, true);
});

test('la fecha reprogramada reemplaza al vencimiento original y no duplica mora', () => {
    const result = run({ installments: [installment({ status: 'reprogramada', isRescheduled: true, originalDueDate: '2026-11-01', rescheduledDate: '2026-11-20' })] });
    assert.equal(result.periods[0].incoming.ARS, 0);
    assert.equal(result.periods[1].incoming.ARS, 100);
    assert.equal(result.overdue.count, 0);
    assert.equal(result.calendar[0].dueDate, '2026-11-20');
});

test('7, 15 y 30 días incluyen hoy y terminan en el día N menos uno', () => {
    const dates = ['2026-11-10', '2026-11-16', '2026-11-17', '2026-11-24', '2026-11-25', '2026-12-09', '2026-12-10'];
    const result = run({ installments: dates.map((date, i) => installment({ _id: `i${i}`, dueDate: date, amount: 10 })) });
    assert.deepEqual(result.periods.map((item) => item.incoming.ARS), [20, 40, 60]);
    assert.deepEqual(result.periods.map((item) => item.toDate), ['2026-11-16', '2026-11-24', '2026-12-09']);
});

test('vencidos y obligaciones sin fecha quedan separados de los horizontes', () => {
    const result = run({ installments: [installment({ status: 'vencida', dueDate: '2026-11-09' })], transactions: [transaction({ dueDate: undefined, date: '2026-11-11' })] });
    assert.equal(result.overdue.incoming.ARS, 100);
    assert.equal(result.undated.outgoing.ARS, 40);
    assert.equal(result.periods[2].incoming.ARS, 0);
    assert.equal(result.periods[2].outgoing.ARS, 0, 'no inventa vencimiento desde la fecha de movimiento');
});

test('movimientos pagados y anulados no se suman otra vez al saldo registrado', () => {
    const result = run({ transactions: [transaction({ status: 'activo' }), transaction({ _id: 'void', status: 'anulado' })] });
    assert.equal(result.periods[0].outgoing.ARS, 0);
    assert.equal(result.periods[0].closingBalances.ARS, 1000);
});

test('un ingreso vinculado a cuota no duplica la cuota ni reaparece cuando ya está pagada', () => {
    const linked = transaction({ type: 'Ingreso', installmentId: 'i1', amount: 100 });
    const pending = run({ installments: [installment()], transactions: [linked] });
    assert.equal(pending.periods[0].incoming.ARS, 100);
    assert.equal(pending.quality.excluded.linkedInstallmentTransactions, 1);
    const paid = run({ installments: [installment({ status: 'pagada', paidAmount: 100 })], transactions: [linked] });
    assert.equal(paid.periods[0].incoming.ARS, 0);
});

test('egreso explícito conserva la obligación aunque la venta esté cancelada', () => {
    const result = run({ sales: [sale({ status: 'cancelada' })], transactions: [transaction({ saleId: 's1' }), transaction({ _id: 'income', type: 'Ingreso', saleId: 's1' })] });
    assert.equal(result.periods[0].outgoing.ARS, 40);
    assert.equal(result.periods[0].incoming.ARS, 0);
});

test('dos monedas se proyectan sin conversión ni uso del precio o margen de venta', () => {
    const result = run({ sales: [sale({ salePrice: 9999999, saleCurrency: 'USD' })], installments: [installment({ currency: 'USD', amount: 70 })], transactions: [transaction({ amount: 10 })] });
    assert.deepEqual(result.periods[0].closingBalances, { ARS: 990, USD: 70 });
});

test('cuenta con saldo inválido no aparenta saldo cero ni previsión segura', () => {
    const result = run({ accounts: [account({ balance: 'sin conciliar' })] });
    assert.equal(result.openingBalances.ARS, null);
    assert.equal(result.periods[0].closingBalances.ARS, null);
    assert.equal(result.quality.complete, false);
    assert.equal(result.quality.issues[0].code, 'saldo_invalido');
});

test('importes inválidos no se silencian como cero y no afectan la otra moneda', () => {
    const result = run({ installments: [installment({ amount: null })] });
    assert.equal(result.periods[0].incoming.ARS, null);
    assert.equal(result.periods[0].closingBalances.ARS, null);
    assert.equal(result.periods[0].closingBalances.USD, 0);
    assert.equal(result.undated.outgoing.ARS, null);
});

test('una moneda desconocida invalida la previsión en ambas monedas, sin asumir ARS', () => {
    const result = run({ transactions: [transaction({ currency: 'EUR' })] });
    assert.deepEqual(result.periods[0].closingBalances, { ARS: null, USD: null });
    assert.equal(result.quality.issues[0].code, 'moneda_invalida');
});

test('vínculos a venta o cuota inexistentes se informan, no aparentan actividad cero', () => {
    const orphanSale = run({ sales: [], installments: [installment()] });
    assert.equal(orphanSale.periods[0].incoming.ARS, null);
    assert.equal(orphanSale.quality.issues[0].code, 'venta_no_encontrada');
    const orphanInstallment = run({ transactions: [transaction({ type: 'Ingreso', installmentId: 'missing' })] });
    assert.equal(orphanInstallment.periods[0].incoming.ARS, null);
    assert.equal(orphanInstallment.quality.issues[0].code, 'cuota_no_encontrada');
});

test('fecha inválida se informa y el saldo queda sin fecha, fuera de los plazos', () => {
    const result = run({ installments: [installment({ dueDate: '2026-02-30' })], transactions: [transaction({ dueDate: '2026-11-12Tinválido' })] });
    assert.equal(result.quality.complete, false);
    assert.equal(result.quality.issues.filter((item) => item.code === 'fecha_invalida').length, 2);
    assert.equal(result.undated.incoming.ARS, 100);
    assert.equal(result.undated.outgoing.ARS, 40);
    assert.equal(result.periods[2].incoming.ARS, 0);
});

test('los registros repetidos por ID se computan una sola vez', () => {
    const result = run({ accounts: [account(), account()], installments: [installment(), installment()], transactions: [transaction(), transaction()] });
    assert.equal(result.openingBalances.ARS, 1000);
    assert.equal(result.periods[0].incoming.ARS, 100);
    assert.equal(result.periods[0].outgoing.ARS, 40);
    assert.equal(result.quality.excluded.duplicateRecords, 3);
});

test('preserva vencimientos de calendario a medianoche UTC y toma hoy de Argentina', () => {
    assert.equal(getBusinessDateKey(new Date('2026-11-10T00:00:00.000Z')), '2026-11-10');
    assert.equal(getArgentinaDateKey('2026-11-10T01:00:00.000Z'), '2026-11-09');
    assert.equal(getEffectiveInstallmentDueDate(installment()).toISOString(), '2026-11-10T00:00:00.000Z');
    assert.equal(getBusinessDateKey('2026-02-30'), null);
    assert.throws(() => run({ asOf: '2026-02-30' }), /Fecha de corte inválida/);
});

test('pagos superiores al importe no generan un cobro negativo y se señalan para revisar', () => {
    const result = run({ installments: [installment({ amount: 100, paidAmount: 120, status: 'parcial' })] });
    assert.equal(result.periods[0].incoming.ARS, 0);
    assert.equal(result.quality.issues[0].code, 'pagos_superan_importe');
});

test('cálculo no modifica las fuentes ni cambia entre ejecuciones con el mismo corte', () => {
    const sources = { accounts: [account()], sales: [sale()], installments: [installment()], transactions: [transaction()], asOf };
    const snapshot = JSON.stringify(sources);
    assert.deepEqual(buildCashProjection(sources), buildCashProjection(sources));
    assert.equal(JSON.stringify(sources), snapshot);
});

test('vencimientos usa pendingAmount del servidor sin sustituir el amount original', () => {
    const due = installment({ amount: 100, paidAmount: 20, pendingAmount: 65.5, effectiveDueDate: '2026-11-12T00:00:00.000Z' });
    const result = getUpcomingInstallmentPresentation(due, asOf);
    assert.equal(result.pendingAmount, 65.5);
    assert.equal(result.dueDateLabel, '12/11/2026');
    assert.equal(result.badgeLabel, 'Vence en 2 días');
    assert.equal(due.amount, 100);
});

test('vencimientos muestra la fecha reprogramada sin retroceder por el huso horario', () => {
    const result = getUpcomingInstallmentPresentation(installment({ status: 'reprogramada', isRescheduled: true, rescheduledDate: '2026-11-10T00:00:00.000Z', originalDueDate: '2026-11-01' }), asOf);
    assert.equal(result.dueDateLabel, '10/11/2026');
    assert.equal(result.daysUntilDue, 0);
    assert.equal(result.badgeLabel, 'Vence hoy');
});

test('vencimientos distingue ayer, mañana y saldo inválido sin mostrar negativos o cero inventado', () => {
    assert.equal(getUpcomingInstallmentPresentation(installment({ effectiveDueDate: '2026-11-09', pendingAmount: null }), asOf).badgeLabel, 'Vencido hace 1 día');
    assert.equal(getUpcomingInstallmentPresentation(installment({ effectiveDueDate: '2026-11-11' }), asOf).badgeLabel, 'Vence mañana');
    assert.equal(getUpcomingInstallmentPresentation(installment({ pendingAmount: null }), asOf).pendingAmount, null);
    assert.equal(getUpcomingInstallmentPresentation(installment({ paidAmount: 150 }), asOf).pendingAmount, 0);
});
