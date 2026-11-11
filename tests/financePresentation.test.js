import assert from 'node:assert/strict';
import { financeDateInputValue, filterFinanceTransactions, summarizeFinanceInstallments, summarizeFinanceTransactions } from '../src/utils/financePresentation.js';

process.env.TZ = 'America/Argentina/Buenos_Aires';

const base = { search: '', currency: 'todas', paymentMethod: 'todas', status: 'todos', linkedTo: 'todas', startDate: '', endDate: '' };
const transactions = [
    { _id: 'one', type: 'Ingreso', currency: 'ARS', amount: 100, status: 'activo', concept: 'Recibo', description: 'Entrega Corolla', date: '2026-11-10T18:00:00-03:00', saleId: 'sale', paymentMethod: 'efectivo' },
    { _id: 'two', type: 'Egreso', currency: 'USD', amount: 20, status: 'pendiente', notes: 'Transferencia QA', date: '2026-11-11T23:30:00-03:00', paymentMethod: 'transferencia' },
    { _id: 'three', type: 'Egreso', currency: 'ARS', amount: 15, status: 'anulado', date: '2026-11-12T09:00:00-03:00' }
];
const ids = (filters, mode) => filterFinanceTransactions(transactions, { ...base, ...filters }, mode).map(item => item._id);
assert.deepEqual(ids({}), ['one', 'two', 'three']);
assert.deepEqual(ids({ search: 'corolla' }), ['one']);
assert.deepEqual(ids({ currency: 'USD', status: 'pendiente', paymentMethod: 'transferencia' }), ['two']);
assert.deepEqual(ids({ linkedTo: 'sale' }), ['one']);
assert.deepEqual(ids({ linkedTo: 'unlinked' }), ['two', 'three']);
assert.deepEqual(ids({}, 'ingreso'), ['one']);
assert.deepEqual(ids({}, 'transferencias'), ['two']);
assert.deepEqual(ids({ startDate: '2026-11-11' }), ['two', 'three']);
assert.deepEqual(ids({ endDate: '2026-11-11' }), ['one', 'two']);
assert.deepEqual(ids({ startDate: '2026-11-11', endDate: '2026-11-11' }), ['two']);
assert.equal(financeDateInputValue(new Date(2026, 10, 11, 23, 30)), '2026-11-11');
assert.deepEqual(summarizeFinanceTransactions(transactions), { ARS: { income: 100, expense: 0 }, USD: { income: 0, expense: 0 } });
assert.deepEqual(summarizeFinanceTransactions([...transactions, { type: 'Egreso', amount: 12.5, currency: 'USD', status: 'activo' }]).USD, { income: 0, expense: 12.5 });

const items = [
    { amount: 100000, paidAmount: 25000, currency: 'ARS', status: 'parcial', dueDate: '2026-11-10' },
    { amount: 100, paidAmount: 0, currency: 'USD', status: 'pendiente', dueDate: '2026-11-11' },
    { amount: 200, paidAmount: 50, currency: 'USD', status: 'parcial', dueDate: '2026-11-18' },
    { amount: 50000, paidAmount: 0, currency: 'ARS', status: 'pendiente', dueDate: '2026-11-19' },
    { amount: 60, paidAmount: 60, currency: 'USD', status: 'pagada_manual', dueDate: '2026-11-01' },
    { amount: 900000, paidAmount: 1, currency: 'ARS', status: 'anulada', dueDate: '2026-11-01' }
];
const before = JSON.stringify(items);
assert.deepEqual(summarizeFinanceInstallments(items, new Date(2026, 10, 11, 15)), {
    pending: { ARS: 125000, USD: 250 }, paid: { ARS: 25000, USD: 110 }, pendingCount: 4, overdueCount: 1, soonCount: 2, futureCount: 1
});
assert.equal(JSON.stringify(items), before);
assert.deepEqual(summarizeFinanceInstallments([]).pending, { ARS: 0, USD: 0 });
console.log('PASS finance presentation: currency separation, paid/cancelled statuses, date boundaries and combined filters.');
