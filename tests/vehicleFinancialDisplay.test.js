import test from 'node:test';
import assert from 'node:assert/strict';
import { getVehicleFinancialDisplay } from '../src/utils/vehicleFinancialDisplay.js';

const unit = { price: 20000, currency: 'USD', purchasePrice: 15000, purchaseCurrency: 'USD' };

test('detail margin uses real acquisition and recorded costs, without invented minimum or commission', () => {
    const data = getVehicleFinancialDisplay({ ...unit, expenses: [{ amount: 500.1, currency: 'USD' }, { amount: 20.2, currency: 'USD' }] });
    assert.deepEqual(data.costs, { ARS: 0, USD: 15520.3 });
    assert.equal(data.margin.amount, 4479.7);
    assert.equal(data.margin.calculable, true);
    assert.equal(data.minimumPrice, null);
});

test('ARS and USD expenses stay separate and cannot produce a nominal mixed-currency margin', () => {
    const data = getVehicleFinancialDisplay({ ...unit, expenses: [{ amount: 200000, currency: 'ARS' }, { amount: 400, currency: 'USD' }] });
    assert.deepEqual(data.costs, { ARS: 200000, USD: 15400 });
    assert.equal(data.margin.calculable, false);
    assert.equal(data.margin.amount, null);
    assert.match(data.margin.reason, /monedas diferentes/);
});

test('a trade-in uses its agreed acquisition value and currency', () => {
    const data = getVehicleFinancialDisplay({ ...unit, purchasePrice: 1, tradeInOrigin: { saleId: 'origin', value: 16000, currency: 'U$S' } });
    assert.deepEqual(data.purchase, { amount: 16000, currency: 'USD', hasCost: true });
    assert.equal(data.margin.amount, 4000);
});

test('missing acquisition data is unavailable rather than an assumed zero cost', () => {
    const data = getVehicleFinancialDisplay({ price: 20000, currency: 'USD', expenses: [] });
    assert.equal(data.purchase.hasCost, false);
    assert.equal(data.margin.calculable, false);
    assert.equal(data.margin.amount, null);
});

test('unknown currencies and invalid expense values cannot appear as a complete margin', () => {
    const data = getVehicleFinancialDisplay({ ...unit, expenses: [{ amount: 10, currency: 'EUR' }, { amount: -10, currency: 'USD' }, { amount: '', currency: 'USD' }] });
    assert.equal(data.expenses.unknownCount, 3);
    assert.equal(data.margin.calculable, false);
    assert.equal(getVehicleFinancialDisplay({ ...unit, purchaseCurrency: 'EUR' }).purchase.currency, null);
});

test('currency aliases are recognized without relabeling large USD costs as pesos', () => {
    const data = getVehicleFinancialDisplay({ ...unit, price: 400000, purchasePrice: 300000, currency: ' u$s ', purchaseCurrency: ' US$ ' });
    assert.equal(data.purchase.currency, 'USD');
    assert.equal(data.margin.amount, 100000);
    assert.equal(getVehicleFinancialDisplay({ ...unit, currency: 'ARS' }).margin.calculable, false);
});

test('incomplete trade-in origin falls back to both purchase amount and its actual currency', () => {
    const data = getVehicleFinancialDisplay({ ...unit, purchasePrice: 10000000, purchaseCurrency: 'ARS', tradeInOrigin: { saleId: 'origin', value: 0, currency: 'USD' } });
    assert.deepEqual(data.purchase, { amount: 10000000, currency: 'ARS', hasCost: true });
    assert.equal(data.margin.calculable, false);
    assert.equal(data.margin.amount, null);
});

test('non-finite acquisition values cannot masquerade as a known zero cost', () => {
    const data = getVehicleFinancialDisplay({ ...unit, purchasePrice: Infinity });
    assert.equal(data.purchase.hasCost, false);
    assert.equal(data.margin.calculable, false);
    const fallback = getVehicleFinancialDisplay({ ...unit, tradeInOrigin: { saleId: 'origin', value: Infinity, currency: 'ARS' } });
    assert.equal(fallback.purchase.amount, 15000);
    assert.equal(fallback.purchase.currency, 'USD');
    assert.equal(fallback.margin.amount, 5000);
});
