import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeSaleWorkspace, saleTradeInComposition } from '../src/utils/saleWorkspace.js';
import { filterSales, readSalesFilters, writeSalesFilters, salesQuickPeriod, salePdfValues } from '../src/utils/salesWorkbench.js';

test('señas declaradas rechazan valores inválidos, fechas imposibles y no permiten confirmar desde formulario', () => {
    const row = { amount: 500, currency: 'USD', date: '2026-11-10', status: 'confirmada' };
    assert.equal(normalizeSaleWorkspace({ depositRecords: [row] }).depositRecords[0].status, 'pendiente');
    for (const amount of ['no', Infinity, [], {}, -1, 0]) assert.throws(() => normalizeSaleWorkspace({ depositRecords: [{ ...row, amount }] }));
    assert.throws(() => normalizeSaleWorkspace({ depositRecords: [{ ...row, date: '2026-02-30' }] }));
});
test('composición mantiene monedas separadas y sólo convierte con FX explícito de la venta', () => {
    const sale = { salePrice: 20000, saleCurrency: 'USD', depositAppliedAmount: 1000, depositAppliedCurrency: 'ARS', tradeIns: [{ estimatedValue: 1000000, currency: 'ARS' }, { estimatedValue: 2000, currency: 'USD' }] };
    assert.deepEqual(saleTradeInComposition(sale), { totals: { ARS: 1000000, USD: 2000 }, credit: 2000, unresolved: 1, balance: 18000 });
    assert.equal(saleTradeInComposition({ ...sale, exchangeRate: 1000 }).credit, 3000);
});
test('permutas preservan vínculo y rechazan cambios de costo vinculados o IDs duplicados', () => {
    const id = 'a'.repeat(24), carId = 'b'.repeat(24);
    const old = { _id: id, brand: 'Marca', model: 'Modelo', year: 2020, estimatedValue: 500, currency: 'USD', linkedStockCarId: carId };
    assert.equal(String(normalizeSaleWorkspace({ tradeIns: [{ ...old, linkedStockCarId: undefined }] }, { tradeIns: [old] }).tradeIns[0].linkedStockCarId), carId);
    assert.throws(() => normalizeSaleWorkspace({ tradeIns: [{ ...old, estimatedValue: 501 }] }, { tradeIns: [old] }));
    assert.throws(() => normalizeSaleWorkspace({ tradeIns: [] }, { tradeIns: [old] }));
    assert.throws(() => normalizeSaleWorkspace({ tradeIns: [old, old] }));
});
test('estado Activas incluye pendiente entrega; Caídas se distingue sin reclasificar canceladas legacy', () => {
    const rows = [{ status: 'confirmada' }, { status: 'pendiente_entrega' }, { status: 'cancelada' }, { status: 'cancelada', cancellationKind: 'caida' }];
    const base = readSalesFilters('');
    assert.equal(filterSales(rows, { ...base, status: 'confirmada' }).length, 2);
    assert.equal(filterSales(rows, { ...base, status: 'caida' }).length, 1);
    assert.equal(filterSales(rows, { ...base, status: 'cancelada' }).length, 1);
});
test('filtros conservan URL y período anterior cruza año con calendario Argentina', () => {
    const state = { ...readSalesFilters(''), search: 'Marca & Modelo', tradeInOnly: true, dateFrom: '2026-01-01' };
    assert.deepEqual(readSalesFilters(writeSalesFilters(state).split('?')[1]), state);
    assert.deepEqual(salesQuickPeriod('previous', new Date('2026-01-15T12:00:00Z')), { dateFrom: '2025-12-01', dateTo: '2025-12-31', month: '' });
});
test('PDF usa snapshot comercial y no fabrica un cliente ni datos del emisor', () => {
    const values = salePdfValues({ _id: 'a', draftData: { buyerName: 'Comprador', buyerDni: 'DEMO' }, saleCurrency: 'USD', salePrice: 0 });
    assert.equal(values.buyer.dni, 'DEMO'); assert.equal(values.buyer.name, 'Comprador'); assert.equal(values.sourceId, 'a'); assert.equal('issuer' in values, false);
});
