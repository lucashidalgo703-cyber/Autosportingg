import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluatePurchase, listingIdentity } from '../src/services/purchaseAnalyzer.js';

import { now, vehicle, terms, dashboard, listings } from './fixtures/purchaseAnalyzerFixtures.js';

const evaluate = (rows = listings, buy = terms, cash = dashboard) => evaluatePurchase({ vehicle, terms: buy, listings: rows }, cash, now);

test('enlaces específicos por proveedor y URLs inseguras o genéricas', () => {
    assert.equal(listingIdentity('https://auto.mercadolibre.com.ar/MLA-2248215545-toyota-corolla-20-xei-cvt-170cv-_JM').id, 'MLA2248215545');
    assert.equal(listingIdentity('https://www.autocosmos.com.ar/auto/usado/toyota/corolla/20-se-g-cvt/c029d4e1e8e44677a57a08de3d9a5481').source, 'Autocosmos');
    const smartCarListing = listingIdentity('https://www.smartcar.com.ar/autos/peugeot-208-1-6-feline-tiptronic-l23-2023-a81e');
    assert.equal(smartCarListing.source, 'SmartCar');
    assert.equal(smartCarListing.id, 'peugeot-208-1-6-feline-tiptronic-l23-2023-a81e');
    assert.equal(listingIdentity('https://www.smartcar.com.ar/usados/peugeot/208'), null);
    const kavakUrl = 'https://www.kavak.com/ar/venta/peugeot-208-16l_allure_at-hatchback-2025';
    assert.equal(listingIdentity(kavakUrl + '?id=566689').id, '566689');
    assert.equal(listingIdentity(kavakUrl + '?id=566689&id=554922'), null);
    for (const link of [kavakUrl,'https://listado.mercadolibre.com.ar/auto', 'javascript:alert(1)', 'https://127.0.0.1/',
        'http://auto.mercadolibre.com.ar/MLA-2248215545', 'https://auto.mercadolibre.com.ar@untrusted.test/MLA-2248215545',
        'https://www.kavak.com/ar/venta/toyota-corolla-20_xli-sedan-2022']) assert.equal(listingIdentity(link), null);
    assert.throws(() => evaluate([{ ...listings[0], url: 'https://example.org/' }]), /enlace directo/);
});

test('excluye duplicados, otra versión, moneda, zona, financiación y avisos sin verificar', () => {
    const row = listings[0];
    const extra = [
        { ...row, url: row.url + '?tracking=123' },
        ...[
            { version: '2.0 XLI' }, { currency: 'ARS' }, { market: 'Patagonia' },
            { priceType: 'financiado' }, { priceType: 'promoción' }, { verification: 'sin verificar' },
            { verification: 'ya no disponible' }, { checkedAt: '2026-09-03T12:00:00Z' }
        ].map((override, i) => ({ ...row, url: row.url.replace('0000000', '111111' + i), ...override }))
    ];
    const result = evaluate([...listings, ...extra]);
    assert.equal(result.market.accepted, 3);
    assert.equal(result.listings[4].similarity, 'parcial');
    assert.match(result.listings[3].exclusions.join(), /duplicado/);
    assert.equal(result.market.publish, 22000);
    assert.equal(result.market.fast, 21000);
    assert.equal(result.market.close, null);
    assert.equal(result.market.dispersion, 4000);
    assert.equal(evaluate(listings.slice(0, 2)).market.sufficient, false);
    assert.equal(evaluate(listings.slice(0, 2)).finance.scenarios.length, 0);
});

test('permuta y participación, gastos asignados y punto mínimo en Tesorería', () => {
    const result = evaluate();
    assert.equal(result.finance.cost, 19000);
    assert.equal(result.finance.maxBuy, 18500);
    assert.equal(result.finance.scenarios[1].gross, 4000);
    assert.equal(result.finance.scenarios[1].net, 3000);
    assert.equal(result.finance.scenarios[1].ownNet, 1000);
    assert.equal(result.liquidity.immediate, 7000);
    assert.equal(result.liquidity.future, 1000);
    assert.equal(result.liquidity.minimum, 12500);
    assert.equal(result.liquidity.futureFundingGap, 0);
    const own = evaluate(listings, { ...terms, tradeVehicle: '', tradeValue: 0, cashNow: 18000, payments: [], share: 100 });
    assert.equal(own.finance.scenarios[1].ownNet, 3000);
    assert.equal(own.liquidity.futureFundingGap, 7500);
    assert.throws(() => evaluate(listings, { ...terms, tradeValue: 3500 }), /deben sumar la oferta/);
    assert.match(evaluate(listings, terms, { ...dashboard, auditInfo: { ...dashboard.auditInfo, hasPhysicalCashInconsistency: true } })
        .liquidity.status, /Sin capacidad verificable/);
});
