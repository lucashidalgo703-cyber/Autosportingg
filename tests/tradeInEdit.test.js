// Unit test for Argentine monetary parsing and trade-in value handling
import assert from 'node:assert/strict';
import { parseArgentineMoney, resolveVehicleAcquisitionCost } from '../src/utils/saleCommercial.js';

console.log('Testing Argentine Monetary Parser and Acquisition Cost...');

// 1. Argentine Monetary Parser Tests
assert.equal(parseArgentineMoney('15000000'), 15000000, 'Plain digits');
assert.equal(parseArgentineMoney('15.000.000'), 15000000, 'Thousands dots');
assert.equal(parseArgentineMoney('15.000.000,00'), 15000000, 'Thousands dots and decimal comma');
assert.equal(parseArgentineMoney('15.000.000,50'), 15000000.5, 'Thousands dots and decimal cents');
assert.equal(parseArgentineMoney('$ 15.000.000'), 15000000, 'Currency symbol with dots');
assert.equal(parseArgentineMoney('USD 25.000'), 25000, 'USD currency prefix');
assert.equal(parseArgentineMoney('25.000'), 25000, 'Single thousand dot');
assert.equal(parseArgentineMoney('25.50'), 25.5, 'Decimal dot');
assert.equal(parseArgentineMoney('25,50'), 25.5, 'Decimal comma');
assert.equal(parseArgentineMoney('0'), 0, 'Zero');
assert.equal(parseArgentineMoney(0), 0, 'Numeric zero');
assert.equal(parseArgentineMoney(15000000), 15000000, 'Numeric value');

// Invalid and empty values must NOT silently become 0
assert.ok(Number.isNaN(parseArgentineMoney('')), 'Empty string should be NaN');
assert.ok(Number.isNaN(parseArgentineMoney('   ')), 'Whitespace string should be NaN');
assert.ok(Number.isNaN(parseArgentineMoney(null)), 'Null should be NaN');
assert.ok(Number.isNaN(parseArgentineMoney(undefined)), 'Undefined should be NaN');
assert.ok(Number.isNaN(parseArgentineMoney('invalido')), 'Alpha text should be NaN');

// 2. Acquisition Cost Resolution Tests
const tradeInCar = {
    _id: 'car1',
    brand: 'Toyota',
    name: 'Corolla',
    purchasePrice: 0,
    tradeInOrigin: {
        saleId: 'sale123',
        value: 14000000,
        currency: 'ARS'
    }
};

const resolved = resolveVehicleAcquisitionCost(tradeInCar);
assert.equal(resolved.hasCost, true);
assert.equal(resolved.amount, 14000000);
assert.equal(resolved.source, 'valor_de_toma');
assert.equal(resolved.currency, 'ARS');

console.log('✅ Unit tests passed successfully!');
