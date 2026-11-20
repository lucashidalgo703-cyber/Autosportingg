import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica(), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Only disposable loopback services may be contacted');
    return originalFetch(input, options);
};
let passed = 0;
try {
    const { seedCapitalHistory } = await import('../fixtures/capitalHistoryFixtures.js');
    const service = await import('../../src/services/capitalHistoryService.js');
    const { getAdminStock } = await import('../../src/services/inventoryStockService.js');
    const f = await seedCapitalHistory(env.models), owner = { id: String(f.users[1]._id), username: f.users[1].name, role: 'owner', permissions: [] };
    const api = (index, method, route, body, headers = {}) => env.call(method, route, body, f.sessions[index].token, headers);
    const check = (response, status, context = '') => assert.equal(response.status, status, context + ' ' + JSON.stringify(response.json));
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
    const key = () => ({ 'Idempotency-Key': crypto.randomUUID() });
    const idOf = entry => String(entry?.id || entry?._id || '');
    const shift = (period, offset) => { const [year, month] = period.split('-').map(Number), d = new Date(Date.UTC(year, month - 1 + offset, 15)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
    const now = new Date(), period = service.capitalPeriodForDate(now), previous = shift(period, -1), gap = shift(period, -2), oldest = shift(period, -3);
    const capital = row => row.totalsByCurrency;
    const assertTotals = (row, expected = f.expected) => {
        for (const currency of ['ARS', 'USD']) {
            assert.equal(capital(row)[currency].capitalPropioCosto, expected.cost[currency], currency + ' cost capital');
            assert.equal(capital(row)[currency].capitalPropioPublicado, expected.published[currency], currency + ' published capital');
        }
    };
    const businessState = async () => {
        const result = {};
        for (const name of ['Car', 'Account', 'Sale', 'Installment', 'Transaction']) result[name] = await env.models[name].find({}).sort({ _id: 1 }).lean();
        return JSON.stringify(result);
    };
    const get = (from = oldest, to = period) => api(1, 'GET', `/api/admin/capital-history?from=${from}&to=${to}`);
    let first, firstHeaders, immutableInitial;

    await test('owner-only capital history rejects every other role even with broad saved permissions, without invalidating their sessions', async () => {
        check(await env.call('GET', '/api/admin/capital-history'), 401);
        for (const index of [0, 2, 3]) {
            check(await api(index, 'GET', '/api/admin/capital-history'), 403);
            check(await api(index, 'POST', '/api/admin/capital-history/capture', {}, key()), 403);
            check(await api(index, 'GET', '/api/admin/auth/me'), 200);
        }
        check(await api(1, 'GET', '/api/admin/auth/me'), 200);
    });
    await test('reading current capital preserves independent ARS/USD equations and leaves unrecorded months empty without creating snapshots', async () => {
        const before = await businessState();
        const response = await get(); check(response, 200); assertTotals(response.json.current);
        assert.equal(response.json.current.period, period); assert.equal(response.json.formulaVersion, 'capital-summary-v1');
        assert.equal(response.json.months.length, 4);
        for (const row of response.json.months) { assert.equal(row.status, 'missing'); assert.ok(row.totalsByCurrency == null); }
        assert.equal(await env.models.CapitalObservation.countDocuments(), 0); assert.equal(await env.models.CapitalMonth.countDocuments(), 0);
        assert.equal(await businessState(), before);
        assert.doesNotMatch(JSON.stringify(response.json), /passwordHash|Caja ficticia|Socio ficticio|Crédito ficticio|requestFingerprint/);
    });
    await test('live comparison reconciles global Stock, investors and excluded third parties with own capital in each currency despite filters and pagination', async () => {
        const before = await businessState();
        const unfiltered = await getAdminStock({ limit: 1, page: 1 }, owner);
        const filtered = await getAdminStock({ search: 'QACAP02', limit: 1 }, owner);
        assert.equal(filtered.total, 1); assert.equal(unfiltered.cars.length, 1);
        assert.deepEqual(filtered.summary.availableMetrics, unfiltered.summary.availableMetrics);
        assert.notDeepEqual(filtered.filteredMetrics, unfiltered.summary.availableMetrics);
        const response = await get(); check(response, 200);
        const current = response.json.current, comparison = current.stockComparison, metrics = unfiltered.summary.availableMetrics;
        assert.equal(comparison.scope, 'available-global'); assert.equal(comparison.count, 4);
        assert.equal(comparison.count, unfiltered.summary.disponibles);
        for (const field of ['cost', 'ownCost', 'investorCost', 'thirdPartyCost', 'unallocatedCost', 'asking', 'ownAsking', 'investorAsking', 'thirdPartyAsking', 'unallocatedAsking', 'completeness']) assert.deepEqual(comparison[field], metrics[field], field);
        for (const currency of ['ARS', 'USD']) {
            const round = value => Math.round(value * 100) / 100;
            assert.equal(comparison.cost[currency], round(comparison.ownCost[currency] + comparison.investorCost[currency] + comparison.unallocatedCost[currency]));
            assert.equal(comparison.asking[currency], round(comparison.ownAsking[currency] + comparison.investorAsking[currency] + comparison.thirdPartyAsking[currency] + comparison.unallocatedAsking[currency]));
            assert.equal(comparison.ownCost[currency], current.components.stockPropioCosto.byCurrency[currency]);
            assert.equal(comparison.ownAsking[currency], current.totalsByCurrency[currency].stockPropioPublicado);
            const others = current.components.efectivoPropio.byCurrency[currency] + current.components.carteraPropia.byCurrency[currency]
                + current.components.otrosCreditos.byCurrency[currency] - current.components.deudasPropia.byCurrency[currency] - current.components.pagosSinCuenta.byCurrency[currency];
            assert.equal(current.totalsByCurrency[currency].capitalPropioCosto, round(comparison.ownCost[currency] + others));
            assert.equal(current.totalsByCurrency[currency].capitalPropioPublicado, round(comparison.ownAsking[currency] + others));
        }
        assert.equal(comparison.thirdPartyCost.ARS, 700000000); assert.equal(comparison.thirdPartyCost.USD, 800000);
        assert.equal(comparison.investorCost.USD, 8800); assert.equal(comparison.thirdPartyAsking.ARS, 800000000);
        assert.equal(comparison.thirdPartyAsking.USD, 900000);
        assert.doesNotMatch(JSON.stringify(comparison), /vehicleId|QACAP|ficticio|name|items|breakdown|pending/);
        assert.equal(await businessState(), before);
    });
    await test('concurrent capture retries create one immutable observation and one monthly reference with no business effects', async () => {
        const before = await businessState(); firstHeaders = key();
        const responses = await Promise.all([0, 1].map(() => api(1, 'POST', '/api/admin/capital-history/capture', {}, firstHeaders)));
        for (const response of responses) assert.ok([200, 201].includes(response.status), JSON.stringify(response.json));
        first = responses[0].json.snapshot; assertTotals(first); assert.equal(first.period, period); assert.ok(idOf(first));
        assert.equal(first.stockComparison, undefined, 'A current comparison is not backfilled into immutable observations');
        assert.equal(idOf(responses[1].json.snapshot), idOf(first));
        assert.equal(await env.models.CapitalObservation.countDocuments(), 1); assert.equal(await env.models.CapitalMonth.countDocuments(), 1);
        immutableInitial = await env.models.CapitalObservation.findById(idOf(first)).lean();
        assert.equal(await businessState(), before);
    });
    await test('a live preview never rewrites the monthly record and repeating the original key cannot recompute its old observation', async () => {
        await env.models.Account.updateOne({ _id: f.accounts[0]._id }, { $inc: { balance: 1000000 } });
        const response = await get(); check(response, 200);
        assert.equal(capital(response.json.current).ARS.capitalPropioCosto, f.expected.cost.ARS + 1000000);
        const recorded = response.json.months.find(row => row.period === period); assert.equal(capital(recorded).ARS.capitalPropioCosto, f.expected.cost.ARS);
        const old = await env.models.CapitalObservation.findById(idOf(first)).lean(); assert.deepEqual(old, immutableInitial);
        const replay = await api(1, 'POST', '/api/admin/capital-history/capture', {}, firstHeaders); assert.ok([200, 201].includes(replay.status));
        assert.equal(idOf(replay.json.snapshot), idOf(first)); assertTotals(replay.json.snapshot);
        const fresh = await api(1, 'POST', '/api/admin/capital-history/capture', {}, key()); assert.ok([200, 201].includes(fresh.status));
        assert.equal(capital(fresh.json.snapshot).ARS.capitalPropioCosto, f.expected.cost.ARS + 1000000);
        assert.equal(await env.models.CapitalObservation.countDocuments(), 2); assert.equal(await env.models.CapitalMonth.countDocuments(), 1);
        assert.deepEqual(await env.models.CapitalObservation.findById(idOf(first)).lean(), immutableInitial);
        await env.models.Account.updateOne({ _id: f.accounts[0]._id }, { $inc: { balance: -1000000 } });
    });
    await test('clients cannot backdate, forge totals or control the capture clock and invalid ranges do not mutate history', async () => {
        const count = await env.models.CapitalObservation.countDocuments();
        check(await api(1, 'POST', '/api/admin/capital-history/capture', { period: previous }, key()), 409);
        check(await api(1, 'POST', '/api/admin/capital-history/capture', { now: '2020-01-01', totalsByCurrency: { ARS: { capitalPropioCosto: 999 } } }, key()), 400);
        check(await api(1, 'POST', '/api/admin/capital-history/capture', {}), 400);
        for (const route of [`?from=2026-13&to=${period}`, `?from=${period}&to=${previous}`, `?from=2000-01&to=${period}`, `?to=${shift(period, 1)}`]) check(await api(1, 'GET', '/api/admin/capital-history' + route), 400, route);
        assert.equal(await env.models.CapitalObservation.countDocuments(), count);
    });
    await test('a concurrent account and vehicle change between source reads cannot mix revisions in a saved capital observation', async () => {
        const originalFind = env.models.Account.find; let injected = false;
        env.models.Account.find = function (...args) {
            const query = originalFind.apply(this, args), originalExec = query.exec.bind(query);
            query.exec = async (...execArgs) => {
                if (!injected) {
                    injected = true;
                    await env.models.Account.collection.updateOne({ _id: f.accounts[0]._id }, { $inc: { balance: 1000000 } });
                    await env.models.Car.collection.updateOne({ _id: f.cars[0]._id }, { $inc: { purchasePrice: 2000000 } });
                }
                return originalExec(...execArgs);
            };
            return query;
        };
        try {
            const result = await service.captureCapitalObservation({ user: owner, requestKey: crypto.randomUUID() });
            assert.equal(injected, true); assertTotals(result.snapshot);
            assert.equal((await env.models.Account.findById(f.accounts[0]._id).lean()).balance, f.expected.cash.ARS + 1000000);
            assert.equal((await env.models.Car.findById(f.cars[0]._id).lean()).purchasePrice, 12000000);
        } finally {
            env.models.Account.find = originalFind;
            if (injected) {
                await env.models.Account.collection.updateOne({ _id: f.accounts[0]._id }, { $inc: { balance: -1000000 } });
                await env.models.Car.collection.updateOne({ _id: f.cars[0]._id }, { $inc: { purchasePrice: -2000000 } });
            }
        }
    });
    await test('observations from earlier months stay frozen, gaps remain unknown and historical values never use current account or stock edits', async () => {
        const older = await service.captureCapitalObservation({ user: owner, requestKey: crypto.randomUUID(), now: new Date(oldest + '-20T15:00:00Z') });
        const later = await service.captureCapitalObservation({ user: owner, requestKey: crypto.randomUUID(), now: new Date(previous + '-20T15:00:00Z') });
        const oldObservation = await env.models.CapitalObservation.findById(idOf(older.snapshot)).lean();
        await env.models.Car.updateOne({ _id: f.cars[0]._id }, { $inc: { purchasePrice: 2000000, price: 3000000 } });
        const response = await get(); check(response, 200);
        assert.equal(response.json.months.find(row => row.period === gap).status, 'missing');
        for (const month of [oldest, previous]) {
            const row = response.json.months.find(item => item.period === month); assert.equal(row.status, 'closed'); assertTotals(row);
        }
        assert.equal(response.json.firstRecordedPeriod, oldest);
        assert.deepEqual(await env.models.CapitalObservation.findById(idOf(older.snapshot)).lean(), oldObservation);
        assert.ok(idOf(later.snapshot));
        await env.models.Car.updateOne({ _id: f.cars[0]._id }, { $inc: { purchasePrice: -2000000, price: -3000000 } });
    });
    await test('Argentina month/year boundaries use the actual capture instant and scheduled retries are once per Argentina day', async () => {
        assert.equal(service.capitalPeriodForDate(new Date('2027-01-01T02:59:59Z')), '2026-12');
        assert.equal(service.capitalPeriodForDate(new Date('2027-01-01T03:00:00Z')), '2027-01');
        const a = await service.captureScheduledCapitalObservation({ now: new Date('2026-12-31T20:00:00Z') });
        const again = await service.captureScheduledCapitalObservation({ now: new Date('2027-01-01T02:59:59Z') });
        assert.equal(a.snapshot.period, '2026-12'); assert.equal(idOf(a.snapshot), idOf(again.snapshot));
        const b = await service.captureScheduledCapitalObservation({ now: new Date('2027-01-01T03:00:00Z') });
        assert.equal(b.snapshot.period, '2027-01'); assert.notEqual(idOf(a.snapshot), idOf(b.snapshot));
        assert.equal(new Date(a.snapshot.capturedAt).toISOString(), '2026-12-31T20:00:00.000Z');
    });
    await test('a month or cron-day rollover during a consistent read cannot tag today’s values as an earlier period', async () => {
        const before = await env.models.CapitalObservation.countDocuments();
        const sequence = values => { let index = 0; return () => new Date(values[Math.min(index++, values.length - 1)]); };
        await assert.rejects(() => service.captureCapitalObservation({ user: owner, requestKey: crypto.randomUUID(), now: sequence([
            '2027-01-01T02:59:59Z', '2027-01-01T02:59:59Z', '2027-01-01T03:00:01Z'
        ]) }), error => error.status === 409);
        await assert.rejects(() => service.captureScheduledCapitalObservation({ now: sequence([
            '2026-11-25T02:59:59Z', '2026-11-25T03:00:01Z', '2026-11-25T03:00:01Z'
        ]) }), error => error.status === 409);
        assert.equal(await env.models.CapitalObservation.countDocuments(), before);
    });
    await test('cron endpoints require their server secret and a valid job captures only the current actual month without financial writes', async () => {
        const route = '/api/internal/jobs/capital-history', count = await env.models.CapitalObservation.countDocuments(), before = await businessState();
        check(await env.call('GET', route), 401); check(await env.call('POST', route, {}, 'incorrect-job-secret'), 401);
        const response = await env.call('GET', route, undefined, process.env.CRON_SECRET); check(response, 200);
        const repeated = await env.call('POST', route, { period: previous, totalsByCurrency: { ARS: 1 } }, process.env.CRON_SECRET); check(repeated, 200);
        assert.equal(response.json.snapshot.period, period); assert.equal(idOf(response.json.snapshot), idOf(repeated.json.snapshot));
        assert.equal(await env.models.CapitalObservation.countDocuments(), count + 1); assert.equal(await businessState(), before);
        const original = process.env.CRON_SECRET; delete process.env.CRON_SECRET;
        try { check(await env.call('GET', route, undefined, original), 503); } finally { process.env.CRON_SECRET = original; }
    });
    await test('missing costs and unverifiable portfolio ownership stay marked partial in the saved observation after data is later corrected', async () => {
        const car = await env.models.Car.create({ brand: 'CapitalQA', name: 'Costo pendiente', year: 2024, km: 100, fuel: 'Nafta', condition: 'Usado', agencyOwned: true, status: 'Disponible', price: 2000000, currency: 'ARS', purchaseCurrency: 'ARS' });
        const response = await api(1, 'POST', '/api/admin/capital-history/capture', {}, key()); assert.ok([200, 201].includes(response.status));
        const partial = response.json.snapshot; assert.equal(partial.quality.costStatus, 'partial');
        assert.equal(capital(partial).ARS.capitalPropioCosto, f.expected.cost.ARS);
        await env.models.Car.updateOne({ _id: car._id }, { $set: { purchasePrice: 1000000 } });
        const current = await get(); check(current, 200); assert.equal(capital(current.json.current).ARS.capitalPropioCosto, f.expected.cost.ARS + 1000000);
        const stored = await env.models.CapitalObservation.findById(idOf(partial)).lean(); assert.equal(stored.quality.costStatus, 'partial');
        await env.models.Car.deleteOne({ _id: car._id });
        const missingOwner = await env.models.Installment.create({ installmentNumber: 1, saleId: crypto.randomBytes(12).toString('hex'), source: 'venta', customerName: 'Cartera con venta ausente QA', amount: 500, paidAmount: 0, currency: 'USD', dueDate: new Date('2027-01-20'), status: 'pendiente' });
        const quality = await get(); check(quality, 200); assert.equal(quality.json.current.quality.costStatus, 'partial');
        await env.models.Installment.deleteOne({ _id: missingOwner._id });
    });
    await test('an inconsistent historical month reference is shown as missing instead of borrowing live values', async () => {
        const brokenPeriod = shift(period, -4);
        await env.models.CapitalMonth.create({ _id: brokenPeriod, observationId: crypto.randomBytes(32).toString('hex'), revision: 1, firstCapturedAt: new Date(brokenPeriod + '-15T15:00:00Z') });
        const response = await get(brokenPeriod, period); check(response, 200);
        const broken = response.json.months.find(row => row.period === brokenPeriod); assert.equal(broken.status, 'missing'); assert.ok(broken.totalsByCurrency == null);
    });
    console.log(`PASS: ${passed} isolated capital-history scenarios; no employees, production, exchange conversion or business-record mutation.`);
} finally { globalThis.fetch = originalFetch; await env.stop(); }
