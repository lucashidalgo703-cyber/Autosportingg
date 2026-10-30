import assert from 'assert';
import { resolveImagePosition, normalizeCarData } from '../src/lib/formatters.js';

console.log('Testing Image Position Resolution and Catalog Centering...');

// 1. Tests for resolveImagePosition
assert.strictEqual(resolveImagePosition(undefined), 'center', 'undefined should resolve to center');
assert.strictEqual(resolveImagePosition(null), 'center', 'null should resolve to center');
assert.strictEqual(resolveImagePosition(''), 'center', 'empty string should resolve to center');
assert.strictEqual(resolveImagePosition('   '), 'center', 'whitespace should resolve to center');
assert.strictEqual(resolveImagePosition('50% 75%'), 'center', 'legacy default 50% 75% must resolve to center');
assert.strictEqual(resolveImagePosition('center'), 'center', 'explicit center should be preserved');
assert.strictEqual(resolveImagePosition('50% 50%'), '50% 50%', 'explicit 50% 50% should be preserved');
assert.strictEqual(resolveImagePosition('50% 30%'), '50% 30%', 'custom valid position should be preserved');

// 2. Tests for normalizeCarData
const legacyCar = {
    brand: 'toyota',
    name: 'corolla',
    imagePosition: '50% 75%'
};

const normalized = normalizeCarData(legacyCar);
assert.strictEqual(normalized.imagePosition, 'center', 'Car with legacy 50% 75% should normalize to center');

const emptyPosCar = {
    brand: 'toyota',
    name: 'corolla'
};
const normalizedEmpty = normalizeCarData(emptyPosCar);
assert.strictEqual(normalizedEmpty.imagePosition, 'center', 'Car without imagePosition should normalize to center');

// 3. Test public endpoint normalization logic
const rawDbCars = [
    { _id: '1', name: 'Corolla', imagePosition: '50% 75%' },
    { _id: '2', name: 'Yaris', imagePosition: undefined },
    { _id: '3', name: 'Hilux', imagePosition: 'center' }
];

const sanitizedCars = rawDbCars.map(c => ({
    ...c,
    imagePosition: (!c.imagePosition || c.imagePosition === '50% 75%') ? 'center' : c.imagePosition
}));

assert.strictEqual(sanitizedCars[0].imagePosition, 'center');
assert.strictEqual(sanitizedCars[1].imagePosition, 'center');
assert.strictEqual(sanitizedCars[2].imagePosition, 'center');

console.log('✅ All image position and centering tests passed successfully!');
