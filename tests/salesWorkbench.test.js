import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSalesWorkbench, normalizeSalesWorkbenchQuery, sortSales, salesWorkbenchQuery, SALE_FILTER_DEFAULTS, SALE_PAYMENT_LABELS } from '../src/utils/salesWorkbench.js';
const operations = () => [
    ...Array.from({ length: 25 }, (_, i) => ({ _id: `active-${String(i).padStart(2, '0')}`, status: i === 0 ? 'pendiente_entrega' : 'confirmada', salePrice: i + 1, saleCurrency: i % 2 ? 'USD' : 'ARS', salesperson: i % 2 ? 'beta' : 'alpha', saleDate: `2026-11-${String(i + 1).padStart(2, '0')}`, draftData: { buyerName: `Actual ${String(24 - i).padStart(2, '0')}` }, vehicleId: { brand: 'Marca', name: `Modelo ${24 - i}` } })),
    { _id: 'draft', status: 'borrador', salePrice: 999, saleCurrency: 'USD', salesperson: 'alpha', finance: { netoCobrado: 999 } },
    { _id: 'cancel', status: 'cancelada', salePrice: 1000, saleCurrency: 'ARS', salesperson: 'beta' },
    { _id: 'history', status: 'entregada', historicalOnly: true, salePrice: 50, saleCurrency: 'USD', salesperson: 'alpha' }
];
test('conteos y precios del conjunto completo son iguales entre páginas; borrador no representa caja', () => {
    const users = [{ username: 'alpha', name: 'Vendedor A' }, { username: 'beta', name: 'Vendedor B' }, { username: 'zero', name: 'Sin operaciones' }];
    const first = buildSalesWorkbench(operations(), { sort: 'price', direction: 'asc', page: 1, limit: 20 }, users);
    const second = buildSalesWorkbench(operations(), { sort: 'price', direction: 'asc', page: 2, limit: 20 }, users);
    assert.equal(first.sales.length, 20); assert.equal(second.sales.length, 8); assert.equal(first.total, 28); assert.equal(first.pages, 2);
    assert.deepEqual(first.summary, second.summary); assert.deepEqual(first.summary.totals, { ARS: 169, USD: 206 }); assert.equal(first.summary.computableCount, 26); assert.equal(first.summary.opCount, 28);
    assert.equal(first.statusCounts.confirmada, 25); assert.equal(first.statusCounts.borrador, 1); assert.equal(first.statusCounts.cancelada, 1); assert.equal(first.statusCounts.entregada, 1);
    assert.equal(first.sellerCounts.find(row => row.value === '').count, 28); assert.equal(first.sellerCounts.find(row => row.value === 'alpha').count, 15); assert.equal(first.sellerCounts.find(row => row.value === 'zero').count, 0);
    const combined = [...first.sales, ...second.sales]; assert.equal(new Set(combined.map(row => row._id)).size, 28); assert.ok(combined.slice(0, 14).every(row => row.saleCurrency === 'ARS')); assert.equal(combined[14].salePrice, 2); assert.equal(combined[13].salePrice, 1000); assert.equal('netoCobrado' in first.summary, false);
});
test('facetas conservan otros filtros y excluyen sólo su propia selección', () => {
    const result = buildSalesWorkbench(operations(), { seller: 'alpha', status: 'confirmada', search: 'Actual' });
    assert.equal(result.total, 13); assert.equal(result.statusCounts.confirmada, 13); assert.equal(result.sellerCounts.find(row => row.value === '').count, 25); assert.equal(result.sellerCounts.find(row => row.value === 'beta').count, 12); assert.deepEqual(result.summary.totals, { ARS: 169, USD: 0 });
});
test('allowlist de orden rechaza claves arbitrarias y ordena globalmente antes de cortar páginas', () => {
    assert.throws(() => normalizeSalesWorkbenchQuery({ sort: 'commission' }), /orden/); assert.throws(() => normalizeSalesWorkbenchQuery({ direction: '$gt' }), /orden/); assert.throws(() => normalizeSalesWorkbenchQuery({ page: 1.2 })); assert.throws(() => normalizeSalesWorkbenchQuery({ limit: 1000 }));
    const sorted = sortSales(operations(), 'buyer', 'asc'); assert.equal(sorted[0].draftData.buyerName, 'Actual 00');
    const second = buildSalesWorkbench(operations(), { sort: 'buyer', direction: 'asc', page: 2, limit: 20 }); assert.deepEqual(second.sales.map(row => row._id), sorted.slice(20).map(row => row._id));
});
test('request contiene filtros y orden server-side; exportación incluye todas las operaciones filtradas', () => {
    const query = salesWorkbenchQuery({ ...SALE_FILTER_DEFAULTS, seller: 'alpha', sort: 'vehicle', direction: 'asc' }, { page: 2 });
    assert.equal(query.get('workspace'), '1'); assert.equal(query.get('page'), '2'); assert.equal(query.get('sort'), 'vehicle'); assert.equal(query.get('seller'), 'alpha');
    const result = buildSalesWorkbench(operations(), { seller: 'alpha', limit: 1 }, [], { exportAll: true }); assert.equal(result.sales.length, 15); assert.equal(result.pages, 1); assert.equal(SALE_PAYMENT_LABELS.financiado, 'Financiado');
});
