import assert from 'assert';
import { resolveImagePosition, normalizeCarData } from '../src/lib/formatters.js';

console.log('Testing Image Position Resolution and Multi-view Framing...');

// 1. Tests for resolveImagePosition with Catalog fallback (50% 75%)
assert.strictEqual(resolveImagePosition(undefined, '50% 75%'), '50% 75%', 'undefined should use catalog fallback');
assert.strictEqual(resolveImagePosition(null, '50% 75%'), '50% 75%', 'null should use catalog fallback');
assert.strictEqual(resolveImagePosition('', '50% 75%'), '50% 75%', 'empty string should use catalog fallback');
assert.strictEqual(resolveImagePosition('   ', '50% 75%'), '50% 75%', 'whitespace should use catalog fallback');
assert.strictEqual(resolveImagePosition('center', '50% 75%'), '50% 75%', 'generic center should resolve to catalog framing');
assert.strictEqual(resolveImagePosition('50% 50%', '50% 75%'), '50% 75%', '50% 50% should resolve to catalog framing');

// 2. Tests for resolveImagePosition with Detail View fallback (50% 68%)
assert.strictEqual(resolveImagePosition(undefined, '50% 68%'), '50% 68%', 'undefined should use detail fallback');
assert.strictEqual(resolveImagePosition('center', '50% 68%'), '50% 68%', 'generic center should resolve to detail framing');

// 3. Custom explicit positions should be preserved
assert.strictEqual(resolveImagePosition('50% 30%'), '50% 30%', 'custom valid position should be preserved');
assert.strictEqual(resolveImagePosition('top'), 'top', 'custom valid top should be preserved');

// 4. normalizeCarData test
const car = {
    brand: 'toyota',
    name: 'corolla',
    imagePosition: '50% 75%'
};
const normalized = normalizeCarData(car);
assert.strictEqual(normalized.imagePosition, '50% 75%');

console.log('✅ All image position multi-view framing tests passed successfully!');
