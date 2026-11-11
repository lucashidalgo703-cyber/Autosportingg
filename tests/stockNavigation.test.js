import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStockLocation, readStockLocation, safeStockReturnTo, vehicleDetailHref } from '../src/utils/stockNavigation.js';

test('a stock detail roundtrip preserves the search, combined filters, page and card view', () => {
    const href = buildStockLocation({ search: 'Clío azul', brand: 'Renault', status: 'senado', minKm: 1000, maxKm: 90000, currency: 'ARS', minPrice: 1000000, sort: 'oldest', page: 3 }, 'inventario', 'cards');
    const detail = new URL(vehicleDetailHref('abc', href), 'https://example.test');
    const back = detail.searchParams.get('returnTo');
    const restored = readStockLocation(new URL(back, 'https://example.test').search);
    assert.equal(restored.filters.search, 'Clío azul');
    assert.equal(restored.filters.page, 3);
    assert.equal(restored.filters.minKm, 1000);
    assert.equal(restored.filters.minPrice, 1000000);
    assert.equal(restored.layout, 'cards');
    assert.equal(restored.filters.status, 'senado');
    assert.equal(restored.filters.sort, 'oldest');
});

test('global-search deep links initialize inventory search and capital links retain their view', () => {
    assert.equal(readStockLocation('?search=Focus').filters.search, 'Focus');
    assert.equal(readStockLocation('?vista=capital').view, 'capital');
    assert.equal(readStockLocation('').filters.status, 'disponible');
    assert.equal(readStockLocation('?status=').filters.status, '');
    assert.equal(readStockLocation(buildStockLocation({ status: '' }).split('?')[1]).filters.status, '');
});

test('advanced commercial filters survive a detailed-view return link', () => {
    const href = buildStockLocation({ status: '', minYear: 2018, maxYear: 2024, location: 'Salón Norte', responsible: 'unassigned', origin: 'owned', page: 2 }, 'capital', 'detailed');
    const restored = readStockLocation(new URL(href, 'https://example.test').search);
    assert.equal(restored.advanced.minYear, 2018);
    assert.equal(restored.advanced.maxYear, 2024);
    assert.equal(restored.advanced.location, 'Salón Norte');
    assert.equal(restored.advanced.responsible, 'unassigned');
    assert.equal(restored.advanced.origin, 'owned');
    assert.equal(restored.view, 'capital');
    assert.equal(restored.layout, 'detailed');
    assert.equal(restored.filters.page, 2);
});

test('workbench views retain their own filters without turning them into inventory categories', () => {
    const href = buildStockLocation({ search: 'Azul', tab: 'consignaciones', page: 2 }, 'demanda', 'cards', { demandDays: '180', demandSearch: 'Toyota Corolla', demandYearFrom: '2018', demandYearTo: '2025', includeImported: false, zeroDemand: true, withoutDays: '90', attentionType: 'mandate' });
    const restored = readStockLocation(new URL(href, 'https://example.test').search);
    assert.equal(restored.view, 'demanda'); assert.equal(restored.filters.tab, 'consignaciones'); assert.equal(restored.filters.search, 'Azul');
    assert.equal(restored.workbench.demandDays, '180'); assert.equal(restored.workbench.includeImported, false); assert.equal(restored.workbench.zeroDemand, true); assert.equal(restored.workbench.withoutDays, '90');
    assert.equal(restored.workbench.attentionType, 'all');
    const today = readStockLocation('?vista=hoy&attentionType=followup&attentionResponsible=unassigned');
    assert.equal(today.view, 'hoy'); assert.equal(today.workbench.attentionType, 'followup'); assert.equal(today.workbench.attentionResponsible, 'unassigned');
    assert.equal(readStockLocation('?vista=demanda&demandDays=invalid').workbench.demandDays, '90');
});

test('invalid copied filters recover explicitly instead of sending malformed ranges to the API', () => {
    const restored = readStockLocation('?currency=USD&minPrice=100&maxPrice=10&pagina=4');
    assert.match(restored.error, /mínimo/);
    assert.equal(restored.filters.page, 1);
    assert.equal(restored.filters.minPrice, null);
});

test('return links accept only the inventory path and reject external or ambiguous destinations', () => {
    for (const value of ['https://evil.test', '//evil.test', '/admin/stock/other', '/admin/stock\\evil', '/admin/stock?x=1\nother', '/admin/stock?x=1#frag']) {
        assert.equal(safeStockReturnTo(value), '/admin/stock');
    }
    assert.equal(safeStockReturnTo('/admin/stock?pagina=2'), '/admin/stock?pagina=2');
    assert.equal(new URL(vehicleDetailHref('abc', '/admin/stock', true), 'https://example.test').searchParams.get('editar'), '1');
});
