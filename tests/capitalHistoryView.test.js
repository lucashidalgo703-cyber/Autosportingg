import assert from 'node:assert/strict';
import { capitalRows, capitalChange, capitalValue, capitalQuality, capitalComponents, capitalStatusLabel, shiftCapitalPeriod, capitalMoney } from '../src/utils/capitalHistoryView.js';

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
console.log('PASS: monthly capital currencies, gaps, recorded/live separation, quality and formula comparability, nonpositive bases and composition.');
