import assert from 'assert';
import { resolveImagePosition, resolveImagePositionByIndex, normalizeCarData } from '../src/lib/formatters.js';

console.log('Testing Image Position Resolution and Multi-image Framing...');

// 1. Tests for resolveImagePosition with Catalog fallback (50% 75%)
assert.strictEqual(resolveImagePosition(undefined, '50% 75%'), '50% 75%', 'undefined should use catalog fallback');
assert.strictEqual(resolveImagePosition(null, '50% 75%'), '50% 75%', 'null should use catalog fallback');
assert.strictEqual(resolveImagePosition('', '50% 75%'), '50% 75%', 'empty string should use catalog fallback');
assert.strictEqual(resolveImagePosition('   ', '50% 75%'), '50% 75%', 'whitespace should use catalog fallback');
assert.strictEqual(resolveImagePosition('center', '50% 75%'), '50% 75%', 'generic center should resolve to catalog framing');

// 2. Tests for resolveImagePosition with Detail View fallback (50% 68%)
assert.strictEqual(resolveImagePosition(undefined, '50% 68%'), '50% 68%', 'undefined should use detail fallback');
assert.strictEqual(resolveImagePosition('center', '50% 68%'), '50% 68%', 'generic center should resolve to detail framing');

// 3. Custom explicit positions should be preserved
assert.strictEqual(resolveImagePosition('50% 50%'), '50% 50%', 'center 50% preset should be preserved');
assert.strictEqual(resolveImagePosition('50% 35%'), '50% 35%', 'custom roof 35% position should be preserved');
assert.strictEqual(resolveImagePosition('50% 75%'), '50% 75%', 'custom bottom 75% position should be preserved');
assert.strictEqual(resolveImagePosition('top'), 'top', 'custom valid top should be preserved');

// 4. Multi-image individual position tests (resolveImagePositionByIndex)
const multiCar = {
    brand: 'Toyota',
    name: 'Corolla',
    imagePosition: '50% 35%',
    imagePositions: ['50% 35%', '50% 50%', '50% 80%']
};

assert.strictEqual(resolveImagePositionByIndex(multiCar, 0), '50% 35%', 'image 0 should resolve to 50% 35%');
assert.strictEqual(resolveImagePositionByIndex(multiCar, 1), '50% 50%', 'image 1 should resolve to 50% 50%');
assert.strictEqual(resolveImagePositionByIndex(multiCar, 2), '50% 80%', 'image 2 should resolve to 50% 80%');
assert.strictEqual(resolveImagePositionByIndex(multiCar, 5, '50% 75%'), '50% 35%', 'out-of-bounds image falls back to cover position');

// 5. normalizeCarData test
const car = {
    brand: 'toyota',
    name: 'corolla',
    imagePosition: '50% 35%',
    imagePositions: ['50% 35%', '50% 50%']
};
const normalized = normalizeCarData(car);
assert.strictEqual(normalized.imagePosition, '50% 35%');
assert.deepStrictEqual(normalized.imagePositions, ['50% 35%', '50% 50%']);

console.log('✅ All image position multi-image framing tests passed successfully!');
