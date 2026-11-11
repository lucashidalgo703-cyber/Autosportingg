import assert from 'node:assert/strict';
import { buildFinanceOverviewCharts } from '../src/utils/financeOverview.js';

const now = new Date(2026, 10, 11, 12);
const rows = [
    { type: 'Ingreso', currency: 'ARS', amount: 1000, date: '2026-11-01', status: 'activo' },
    { type: 'Egreso', currency: 'ARS', amount: 200, date: '2026-11-11', status: 'activo', category: 'Taller' },
    { type: 'Egreso', currency: 'ARS', amount: 50, createdAt: new Date(2026, 10, 10, 14).toISOString(), status: 'activo', category: 'Taller' },
    { type: 'Ingreso', currency: 'USD', amount: 90, date: '2026-11-10', status: 'activo' },
    { type: 'Egreso', currency: 'USD', amount: 20, date: '2026-11-10', status: 'activo', category: 'Servicios' },
    { type: 'Egreso', currency: 'USD', amount: 9999, date: '2026-11-10', status: 'pendiente', category: 'Pendiente' },
    { type: 'Ingreso', currency: 'ARS', amount: 99999, date: '2026-11-10', status: 'anulado' },
    { type: 'Egreso', currency: 'ARS', amount: 30, date: '2026-10-31', status: 'activo', category: 'Anterior' },
    { type: 'Ingreso', currency: 'USD', amount: 10, date: '2026-10-31', status: 'activo' }
];
const snapshot = JSON.stringify(rows);
const month = buildFinanceOverviewCharts(rows, { period: 'month', now });
assert.deepEqual(month.ARS, { income: 1000, expense: 250, max: 1000, expenseCategories: [{ category: 'Taller', amount: 250 }] });
assert.deepEqual(month.USD, { income: 90, expense: 20, max: 90, expenseCategories: [{ category: 'Servicios', amount: 20 }] });
assert.equal(JSON.stringify(rows), snapshot, 'Chart projection must not mutate financial records');

const all = buildFinanceOverviewCharts(rows, { period: 'all', now });
assert.equal(all.ARS.expense, 280);
assert.equal(all.USD.income, 100);
assert.deepEqual(all.ARS.expenseCategories, [{ category: 'Taller', amount: 250 }, { category: 'Anterior', amount: 30 }]);
assert.ok(!all.USD.expenseCategories.some(item => item.category === 'Pendiente'));

const empty = buildFinanceOverviewCharts([], { now });
const zero = buildFinanceOverviewCharts([{ type: 'Egreso', currency: 'ARS', amount: 0, date: '2026-11-02' }], { now });
assert.deepEqual(zero, empty);
assert.deepEqual(empty.ARS, { income: 0, expense: 0, max: 1, expenseCategories: [] });

const boundaries = buildFinanceOverviewCharts([
    { type: 'Ingreso', currency: 'ARS', amount: 1, date: '2026-11-01' },
    { type: 'Ingreso', currency: 'ARS', amount: 2, date: '2026-11-30' },
    { type: 'Ingreso', currency: 'ARS', amount: 4, date: '2026-12-01' },
    { type: 'Ingreso', currency: 'ARS', amount: 8, date: '2026-10-31' },
    { type: 'Ingreso', currency: 'ARS', amount: 16, date: 'invalid date' },
    { type: 'Ingreso', currency: 'ARS', amount: 32, date: '2026-11-31' }
], { now });
assert.equal(boundaries.ARS.income, 3, 'Calendar month must include first/last date-only values without UTC shifts');

const top = buildFinanceOverviewCharts([1, 5, 3, 4, 2].map(amount => ({ type: 'Egreso', currency: 'USD', amount, date: '2026-11-03', category: 'Categoría ' + amount })), { now });
assert.equal(top.USD.expense, 15, 'Total retains all categories, even those outside the top four');
assert.deepEqual(top.USD.expenseCategories.map(item => item.amount), [5, 4, 3, 2]);

const categoryText = buildFinanceOverviewCharts([{ type: 'Egreso', currency: 'ARS', amount: 3, date: '2026-11-02', category: '__proto__' }], { now });
assert.deepEqual(categoryText.ARS.expenseCategories, [{ category: '__proto__', amount: 3 }], 'Any stored category name must remain an ordinary category');
console.log('financeOverview: moneda, período, estados, límites de mes, vacíos y categorías OK');
