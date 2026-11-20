import assert from 'node:assert/strict';
import { capitalRows, capitalChange, capitalValue, capitalQuality, capitalComponents, capitalMetricLabel, capitalStatusLabel, capitalStockBreakdown, shiftCapitalPeriod, capitalMoney } from '../src/utils/capitalHistoryView.js';

const row = (period, ars, usd, extra = {}) => ({ period, status: 'closed', formulaVersion: 'capital-summary-v1',
    totalsByCurrency: { ARS: { capitalPropioCosto: ars, capitalPropioPublicado: ars + 500 }, USD: { capitalPropioCosto: usd, capitalPropioPublicado: usd + 5 } },
    quality: { costStatus: 'complete', publishedStatus: 'complete' }, ...extra });
const june = row('2026-06', 1000, 10), july = row('2026-07', 1100, 8);
assert.deepEqual(capitalChange(july, june, 'ARS', 'cost'), { status: 'available', amount: 100, percent: 10 });
assert.deepEqual(capitalChange(july, june, 'USD', 'cost'), { status: 'available', amount: -2, percent: -20 });
assert.equal(capitalValue(july, 'USD', 'published'), 13);
assert.match(capitalMoney(1000, 'ARS'), /^\$/); assert.match(capitalMoney(1000, 'USD'), /^USD /);

const storedCurrent = row('2026-08', 1200, 12, { status: 'recorded' });
const data = { months: [june, storedCurrent], current: row('2026-08', 9999, 999, { status: 'current' }) }, original = structuredClone(data);
const rows = capitalRows(data, '2026-06', '2026-08');
assert.equal(rows.length, 3); assert.equal(rows[1].period, '2026-07'); assert.equal(rows[1].status, 'missing');
assert.equal(capitalValue(rows[1], 'ARS', 'cost'), null, 'A missing month is a gap, never a zero-valued observation');
assert.equal(capitalValue(rows[2], 'ARS', 'cost'), 1200, 'A live preview must not replace the stored monthly amount');
assert.deepEqual(capitalChange(rows[2], rows[1], 'ARS', 'cost'), { status: 'missing' });
assert.deepEqual(capitalChange(storedCurrent, june, 'ARS', 'cost'), { status: 'missing' }, 'Never compare across a month without a record');
assert.deepEqual(data, original);
assert.equal(capitalRows({ current: data.current }, '2026-08', '2026-08')[0].status, 'missing', 'Live data cannot fabricate a stored observation');

const partial = row('2026-07', 1100, 8, { quality: { costStatus: 'partial', publishedStatus: 'complete', message: 'Costo pendiente' } });
assert.equal(capitalQuality(partial, 'cost').partial, true); assert.equal(capitalQuality(partial, 'published').partial, false);
assert.deepEqual(capitalChange(partial, june, 'ARS', 'cost'), { status: 'partial' });
assert.equal(capitalChange(partial, june, 'ARS', 'published').status, 'available');
assert.equal(capitalChange({ ...july, formulaVersion: 'another-formula' }, june, 'ARS', 'cost').status, 'incompatible');
const zero = row('2026-06', 0, 0);
assert.deepEqual(capitalChange(july, zero, 'ARS', 'cost'), { status: 'available', amount: 1100, percent: null });
assert.equal(capitalChange(july, row('2026-06', -1000, -1), 'ARS', 'cost').percent, null, 'A nonpositive base has no percentage comparison');

const composition = { components: { stockPropioCosto: { byCurrency: { ARS: 100, USD: 10 } },
    deudasPropia: { byCurrency: { ARS: 20, USD: 2 } }, legacyOnlyARS: { monto: 5 } } };
assert.deepEqual(capitalComponents(composition, 'USD').map(component => component.value), [10, 2]);
assert.equal(capitalComponents(composition, 'USD').find(component => component.key === 'deudasPropia').sign, '−');
assert.match(capitalStatusLabel(june), /Último registro del mes/);
assert.equal(shiftCapitalPeriod('2026-12', 1), '2027-01'); assert.equal(shiftCapitalPeriod('2027-01', -1), '2026-12');

const split = (period, total = 1000) => row(period, 9999, 999, { stockCapital: { version: 'available-stock-v1', scope: 'available-global', count: 3,
    completeness: { cost: true, asking: true, ownership: true }, missingCost: 0, missingPrice: 0, missingOwnership: 0,
    byCurrency: { ARS: { cost: { total, own: total * 0.6, investors: total * 0.4, unallocated: 0, thirdPartyExcluded: 5000 },
        published: { total: total * 2 + 8000, own: total * 1.2, investors: total * 0.8, unallocated: 0, thirdParty: 8000 } },
    USD: { cost: { total: 100, own: 25, investors: 75, unallocated: 0, thirdPartyExcluded: 200 },
        published: { total: 500, own: 50, investors: 150, unallocated: 0, thirdParty: 300 } } } } });
const splitJune = split('2026-06'), splitJuly = split('2026-07', 1100), originalSplit = structuredClone(splitJuly);
assert.equal(capitalValue(splitJuly, 'ARS', 'cost', 'stockTotal'), 1100);
assert.equal(capitalValue(splitJuly, 'ARS', 'cost', 'stockOwn'), 660);
assert.equal(capitalValue(splitJuly, 'ARS', 'cost', 'stockInvestors'), 440);
assert.equal(capitalValue(splitJuly, 'ARS', 'cost', 'stockUnallocated'), 0, 'A recorded zero allocation is distinct from missing history');
assert.equal(capitalValue(splitJuly, 'USD', 'cost', 'stockInvestors'), 75);
assert.equal(capitalValue(splitJuly, 'USD', 'published', 'stockTotal'), 500, 'Published inventory includes its recorded third-party portion');
assert.equal(capitalStockBreakdown(splitJuly, 'USD', 'cost').thirdPartyExcluded, 200);
assert.equal(capitalValue(splitJuly, 'ARS', 'cost', 'net'), 9999, 'Own net capital stays separate from all inventory participants');
assert.deepEqual(capitalChange(splitJuly, splitJune, 'ARS', 'cost', 'stockTotal'), { status: 'available', amount: 100, percent: 10 });
assert.deepEqual(capitalChange(splitJuly, splitJune, 'USD', 'cost', 'stockInvestors'), { status: 'available', amount: 0, percent: 0 });
assert.equal(capitalValue(july, 'ARS', 'cost', 'stockTotal'), null, 'A legacy observation has no recorded total/investor cost; never reconstruct it from current data');
assert.equal(capitalValue(july, 'USD', 'published', 'stockInvestors'), null);
assert.equal(capitalStockBreakdown(july, 'ARS', 'cost'), null);
assert.equal(capitalQuality(july, 'cost', 'stockTotal').missingBreakdown, true);
assert.equal(capitalChange(splitJuly, june, 'ARS', 'cost', 'stockTotal').status, 'missing');
assert.equal(capitalMetricLabel('stockOwn'), 'Mi capital · AutoSporting');
const portfolioOnlyPartial = { ...splitJuly, quality: { costStatus: 'partial', message: 'Cartera por verificar' } };
assert.equal(capitalQuality(portfolioOnlyPartial, 'cost', 'net').partial, true);
assert.equal(capitalQuality(portfolioOnlyPartial, 'cost', 'stockTotal').partial, false, 'Portfolio warnings do not reclassify complete inventory data');
const splitPartial = structuredClone(splitJuly); splitPartial.stockCapital.completeness.ownership = false;
assert.equal(capitalChange(splitPartial, splitJune, 'ARS', 'cost', 'stockTotal').status, 'partial');
const splitNewVersion = structuredClone(splitJuly); splitNewVersion.stockCapital.version = 'available-stock-v2';
assert.equal(capitalChange(splitNewVersion, splitJune, 'ARS', 'cost', 'stockTotal').status, 'incompatible');
assert.deepEqual(splitJuly, originalSplit, 'Changing metrics and rendering values never modifies an observation');
console.log('PASS: monthly capital currencies, gaps, recorded/live separation, quality and formula comparability, nonpositive bases and composition.');
