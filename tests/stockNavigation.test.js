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
