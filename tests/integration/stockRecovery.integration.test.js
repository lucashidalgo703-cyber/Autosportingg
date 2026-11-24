// Recovery is exercised only against the credential-free disposable replica.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica(), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Recovery tests cannot contact external services');
    return originalFetch(input, options);
};
let passed = 0;
const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
const endpoint = '/api/admin/capital-history/recovery';
const selected = { from: '2026-05', to: '2026-11' };
const expectedExisting = ['2026-06', '2026-07', '2026-08', '2026-11'];
const expectedImported = ['2026-05', '2026-09', '2026-10'];
const expectedPeriods = [...expectedExisting, ...expectedImported].sort();
const check = (response, expected = 200) => assert.equal(response.status, expected, JSON.stringify(response.json));
const okay = response => assert.ok([200, 201].includes(response.status), JSON.stringify(response.json));
const sorted = list => [...list].sort();
const millis = value => new Date(value).getTime();
try {
    const { mongoose, models } = env;
    const { AdminUser, Car, Sale, Reservation, Account, Transaction, CapitalObservation, CapitalMonth } = models;
    const { createLoginSession } = await import('../../src/services/authSessionService.js');
    const { PERMISSIONS } = await import('../../src/utils/adminPermissions.js');
    const id = () => new mongoose.Types.ObjectId();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = salt + ':' + crypto.scryptSync('Recovery-fixture-only!', salt, 64).toString('hex');
    const users = await AdminUser.create(['owner', 'admin', 'ventas'].map(role => ({
        name: `Recovery fixture ${role}`, email: `${role}.recovery@example.test`, role,
        permissions: Object.values(PERMISSIONS), passwordHash, active: true
    })));
    const sessions = await Promise.all(users.map(user => createLoginSession(user)));
    const api = (method, route, body, index = 0) => env.call(method, route, body, sessions[index].token);
    const preview = async (range = selected) => {
        const response = await api('GET', endpoint + '?' + new URLSearchParams(range));
        check(response); return response.json;
    };
    const base = { brand: 'RecoveryQA', year: 2022, km: 100, fuel: 'Nafta', condition: 'Usado',
        status: 'Disponible', sold: false, agencyOwned: true, purchaseCurrency: 'ARS', currency: 'ARS',
        purchasePrice: 1000000, price: 1400000, createdAt: new Date('2026-05-10T15:00:00Z'),
        updatedAt: new Date('2026-11-20T15:00:00Z'), ownerPhone: 'private-fixture-not-for-recovery',
        notes: 'private-fixture-not-for-recovery' };
    const cars = [
        { ...base, _id: id(), name: 'Venta posterior al corte', status: 'Vendido', sold: true,
            soldAt: new Date('2026-09-15T15:00:00Z'), auditLog: [{ action: 'ESTADO', field: 'status', oldValue: 'Disponible', newValue: 'Vendido', date: new Date('2026-09-15T15:00:00Z') }] },
        { ...base, _id: id(), name: 'Disponible con ingreso de julio', createdAt: new Date('2026-07-05T15:00:00Z'),
            expenses: [{ concept: 'Preparación posterior al corte', amount: 90000, currency: 'ARS', date: new Date('2026-10-20T15:00:00Z') }] },
        { ...base, _id: id(), name: 'Vendido sin fecha verificable', status: 'Vendido', sold: true, createdAt: new Date('2026-05-20T15:00:00Z') },
        { ...base, _id: id(), name: 'Ingreso antes de medianoche argentina', createdAt: new Date('2026-06-01T02:30:00Z') },
        { ...base, _id: id(), name: 'Ingreso en el mes siguiente argentino', createdAt: new Date('2026-06-01T03:00:00Z') },
        { ...base, _id: id(), name: 'Participación y costo ambiguos', createdAt: new Date('2026-05-08T15:00:00Z'),
            purchasePrice: null, investor: { name: 'private-investor-fixture', percentage: null } }
    ];
    await Car.collection.insertMany(cars);
    const sales = [{ _id: id(), vehicleId: cars[0]._id, status: 'confirmada', saleDate: new Date('2026-09-15T15:00:00Z'),
        createdAt: new Date('2026-09-15T15:00:00Z'), updatedAt: new Date('2026-09-15T15:00:00Z'),
        salePrice: 1400000, saleCurrency: 'ARS', saleAuditLog: [] }];
    await Sale.collection.insertMany(sales);
    await Reservation.collection.insertOne({ _id: id(), vehicleId: cars[1]._id, status: 'cancelada',
        depositDate: new Date('2026-08-05T15:00:00Z'), createdAt: new Date('2026-08-05T15:00:00Z'),
        updatedAt: new Date('2026-08-08T15:00:00Z'), expiresAt: new Date('2026-08-10T15:00:00Z'),
        reservationAuditLog: [{ action: 'ESTADO', field: 'status', oldValue: 'activa', newValue: 'cancelada', date: new Date('2026-08-08T15:00:00Z') }] });
    const account = await Account.create({ name: 'private-cash-fixture', type: 'Efectivo', currency: 'ARS', balance: 91234567 });
    await Transaction.collection.insertOne({ _id: id(), type: 'Ingreso', amount: 7654321, currency: 'ARS', accountId: account._id,
        description: 'private-business-fixture', category: 'varios', status: 'activo', date: new Date('2026-06-15T15:00:00Z') });
    // Old observed and reconstructed rows must remain byte-for-byte unchanged.
    const originalObservations = expectedExisting.map((period, index) => ({
        _id: 'existing-recovery-fixture-' + period, period,
        capturedAt: new Date(period + '-20T15:00:00Z'), source: ['manual', 'cron', 'reconstructed', 'cron'][index],
        formulaVersion: index === 2 ? 'stock-recovery-v1' : 'capital-summary-v1',
        totalsByCurrency: index === 2 ? {} : { ARS: { capitalPropioCosto: 1000 + index }, USD: { capitalPropioCosto: 10 + index } },
        components: {}, quality: { status: index === 2 ? 'partial' : 'complete' },
        stockCapital: null, requestFingerprint: 'private-internal-request-fingerprint-' + index,
        ...(index === 2 ? { asOf: new Date('2026-09-01T02:59:59.999Z'), recovery: { version: 'stock-recovery-v1', method: 'existing-fixture', coverage: {} } } : {})
    }));
    await CapitalObservation.collection.insertMany(originalObservations);
    await CapitalMonth.collection.insertMany(originalObservations.map(observation => ({
        _id: observation.period, observationId: observation._id, revision: 3, firstCapturedAt: observation.capturedAt,
        createdAt: observation.capturedAt, updatedAt: observation.capturedAt
    })));
    const collectionState = async names => {
        const result = {};
        for (const name of names) result[name] = await models[name].collection.find({}).sort({ _id: 1 }).toArray();
        return JSON.stringify(result);
    };
    const businessState = () => collectionState(['Car', 'Sale', 'Reservation', 'Account', 'Transaction', 'TrashRecord']);
    const historyState = () => collectionState(['CapitalObservation', 'CapitalMonth']);
    const originalBusiness = await businessState(), originalHistory = await historyState();
    const existingDocs = await CapitalMonth.collection.find({}).sort({ _id: 1 }).toArray();
    let proposed;

    await test('recovery is owner-only even when other roles carry all saved permissions', async () => {
        check(await env.call('GET', endpoint), 401);
        check(await env.call('POST', endpoint, selected), 401);
        for (const index of [1, 2]) {
            check(await api('GET', endpoint, undefined, index), 403);
            check(await api('POST', endpoint, { ...selected, planId: '0'.repeat(64) }, index), 403);
            check(await api('GET', '/api/admin/auth/me', undefined, index));
        }
        assert.equal(await historyState(), originalHistory);
    });
    await test('preview lists the chosen months without writing history or changing business data', async () => {
        proposed = await preview();
        assert.equal(proposed.from, selected.from); assert.equal(proposed.to, selected.to);
        assert.match(proposed.planId, /^[a-f0-9]{64}$/);
        assert.deepEqual(sorted(proposed.existingPeriods), expectedExisting);
        assert.deepEqual(sorted(proposed.importablePeriods), expectedImported);
        assert.deepEqual(sorted(proposed.rows.map(row => row.period)), expectedPeriods);
        assert.equal(proposed.rows.find(row => row.period === '2026-11').importable, false);
        assert.equal(await historyState(), originalHistory); assert.equal(await businessState(), originalBusiness);
    });
    await test('server rejects forged amounts, dates, sources, malformed plans and invalid month ranges', async () => {
        for (const range of [{ from: '2026-04', to: '2026-05' }, { from: '2026-10', to: '2026-05' },
            { from: '2026-13', to: '2026-13' }, { from: '2026-05', to: '9999-12' }, { ...selected, source: 'cron' }]) {
            check(await api('GET', endpoint + '?' + new URLSearchParams(range)), 400);
        }
        const valid = { ...selected, planId: proposed.planId };
        for (const extra of [{ amounts: { ARS: 999 } }, { totalsByCurrency: { ARS: 999 } }, { source: 'cron' },
            { capturedAt: '2026-05-31T23:59:59Z' }, { now: '2026-06-01T00:00:00Z' }, { period: '2026-05' }]) {
            check(await api('POST', endpoint, { ...valid, ...extra }), 400);
        }
        for (const input of [[], {}, { ...selected, planId: 'invalid' }]) check(await api('POST', endpoint, input), 400);
        check(await api('POST', endpoint, { ...selected, planId: '0'.repeat(64) }), 409);
        assert.equal(await historyState(), originalHistory); assert.equal(await businessState(), originalBusiness);
    });
    await test('preview is stable and keeps month-end Argentina cutoffs and uncertain evidence explicit', async () => {
        const second = await preview(); assert.equal(second.planId, proposed.planId);
        const may = second.rows.find(row => row.period === '2026-05');
        assert.equal(new Date(may.asOf).toISOString(), '2026-06-01T02:59:59.999Z');
        const october = second.rows.find(row => row.period === '2026-10');
        assert.equal(new Date(october.asOf).toISOString(), '2026-11-01T02:59:59.999Z');
        for (const row of second.rows.filter(row => row.importable)) {
            assert.equal(row.quality.status, 'partial', 'Incomplete provenance cannot be represented as an observed complete capital record');
            assert.equal(row.recovery.version, 'stock-recovery-v1');
            assert.ok(row.recovery.coverage && row.recovery.sourceCounts);
            assert.ok(Array.isArray(row.recovery.warnings)); assert.ok(Array.isArray(row.recovery.vehicleEvidence));
            assert.equal(row.totalsByCurrency, undefined, 'Stock recovery must not invent past cash or net capital');
        }
        const serialized = JSON.stringify(second);
        for (const secret of [passwordHash, sessions[0].token, process.env.JWT_SECRET, 'private-internal-request-fingerprint', 'private-cash-fixture', 'private-business-fixture']) assert.ok(!serialized.includes(secret));
        assert.doesNotMatch(serialized, /passwordHash|requestFingerprint|EMAIL_LOGIN_HMAC_SECRET|SMTP_PASS/);
    });
    await test('a source change invalidates a reviewed plan and cannot save unreviewed data', async () => {
        await Car.collection.updateOne({ _id: cars[0]._id }, { $set: { purchasePrice: 1234567 } });
        try {
            check(await api('POST', endpoint, { ...selected, planId: proposed.planId }), 409);
            assert.equal(await historyState(), originalHistory);
        } finally { await Car.collection.updateOne({ _id: cars[0]._id }, { $set: { purchasePrice: base.purchasePrice } }); }
        assert.equal((await preview()).planId, proposed.planId);
        assert.equal(await businessState(), originalBusiness);
    });
    await test('an Argentina month rollover invalidates the reviewed plan even when sources and requested range are unchanged', async () => {
        const { previewStockRecovery, importStockRecovery } = await import('../../src/services/stockRecoveryService.js');
        const owner = { id: String(users[0]._id), username: users[0].name, role: 'owner', permissions: Object.values(PERMISSIONS) };
        const before = await historyState();
        const reviewed = await previewStockRecovery(owner, selected, { now: new Date('2026-12-01T02:59:00.000Z') });
        await assert.rejects(() => importStockRecovery(owner, { ...selected, planId: reviewed.planId }, null,
            { now: new Date('2026-12-01T03:01:00.000Z') }), error => error.status === 409);
        assert.equal(await historyState(), before); assert.equal(await businessState(), originalBusiness);
    });
    await test('source reads share a transaction snapshot during a concurrent insertion', async () => {
        const originalFind = Sale.find, concurrentId = id(); let injected = false;
        Sale.find = function (...args) {
            const query = originalFind.apply(this, args), originalExec = query.exec.bind(query);
            query.exec = async (...execArgs) => {
                if (!injected) {
                    injected = true;
                    await Sale.collection.insertOne({ _id: concurrentId, vehicleId: cars[3]._id, status: 'confirmada',
                        saleDate: new Date('2026-08-02T15:00:00Z'), createdAt: new Date('2026-08-02T15:00:00Z'), salePrice: 2000000, saleCurrency: 'ARS' });
                }
                return originalExec(...execArgs);
            };
            return query;
        };
        try {
            const consistent = await preview();
            assert.equal(injected, true); assert.equal(consistent.planId, proposed.planId);
            assert.deepEqual(consistent.sourceCounts, proposed.sourceCounts);
        } finally { Sale.find = originalFind; await Sale.collection.deleteOne({ _id: concurrentId }); }
        assert.equal(await businessState(), originalBusiness);
    });
    const importStarted = Date.now();
    await test('concurrent imports save each missing closed month once and protect every existing month', async () => {
        const responses = await Promise.all([0, 1].map(() => api('POST', endpoint, { ...selected, planId: proposed.planId })));
        responses.forEach(okay);
        assert.deepEqual(sorted([...new Set(responses.flatMap(response => response.json.importedPeriods))]), expectedImported);
        assert.ok(responses.some(response => response.json.duplicate === true));
        assert.ok(responses.some(response => response.json.duplicate === false));
        for (const response of responses) assert.equal(response.json.planId, proposed.planId);
        assert.equal(await CapitalMonth.countDocuments(), expectedPeriods.length);
        assert.equal(await CapitalObservation.countDocuments(), expectedPeriods.length);
        assert.equal(await businessState(), originalBusiness);
    });
    await test('reconstructed observations preserve provenance, distinguish cutoff from capture time and contain no fabricated net capital', async () => {
        for (const period of expectedImported) {
            const month = await CapitalMonth.findById(period).lean();
            const observation = await CapitalObservation.findById(month.observationId).lean();
            const row = proposed.rows.find(item => item.period === period);
            assert.equal(observation.source, 'reconstructed'); assert.equal(observation.formulaVersion, 'stock-recovery-v1');
            assert.equal(millis(observation.asOf), millis(row.asOf));
            assert.ok(millis(observation.capturedAt) >= importStarted && millis(observation.capturedAt) <= Date.now());
            assert.ok(millis(observation.capturedAt) > millis(observation.asOf));
            assert.deepEqual(observation.totalsByCurrency, {}); assert.deepEqual(observation.components, {});
            assert.equal(observation.quality.status, 'partial'); assert.equal(observation.quality.costStatus, 'partial');
            assert.equal(observation.recovery.version, 'stock-recovery-v1'); assert.equal(observation.recovery.scope, 'stock-only');
            assert.equal(observation.recovery.preservesObservedMonths, true);
            assert.equal(millis(observation.recovery.cutoffAt), millis(row.asOf));
            assert.equal(millis(observation.recovery.reconstructedAt), millis(observation.capturedAt));
            assert.deepEqual(observation.recovery.sourceCounts, row.recovery.sourceCounts);
            assert.ok(Array.isArray(observation.recovery.vehicleEvidence));
        }
    });
    await test('manual, cron and previous reconstructed records remain byte-for-byte intact', async () => {
        for (const original of originalObservations) {
            assert.deepEqual(await CapitalObservation.collection.findOne({ _id: original._id }), original);
        }
        for (const original of existingDocs) assert.deepEqual(await CapitalMonth.collection.findOne({ _id: original._id }), original);
        assert.equal(await businessState(), originalBusiness);
    });
    await test('the same reviewed plan replays successfully without duplicate observations or source changes', async () => {
        const before = await historyState();
        const replay = await api('POST', endpoint, { ...selected, planId: proposed.planId }); okay(replay);
        assert.equal(replay.json.duplicate, true); assert.deepEqual(replay.json.importedPeriods, []);
        assert.deepEqual(sorted(replay.json.preservedPeriods), expectedPeriods);
        assert.equal(await historyState(), before); assert.equal(await businessState(), originalBusiness);
        const afterPreview = await preview();
        assert.equal(afterPreview.planId, proposed.planId); assert.deepEqual(afterPreview.importablePeriods, []);
        assert.deepEqual(sorted(afterPreview.existingPeriods), expectedPeriods);
    });
    await test('monthly-history reads expose reconstruction provenance without relabeling it as an observed net-capital balance', async () => {
        const response = await api('GET', '/api/admin/capital-history?' + new URLSearchParams(selected)); check(response);
        for (const period of expectedImported) {
            const row = response.json.months.find(item => item.period === period);
            assert.equal(row.source, 'reconstructed'); assert.match(row.sourceLabel, /reconstru/i);
            assert.equal(row.recovery.version, 'stock-recovery-v1');
            assert.equal(millis(row.asOf), millis(proposed.rows.find(item => item.period === period).asOf));
            assert.deepEqual(row.totalsByCurrency, {}); assert.deepEqual(row.components, {});
            assert.equal(row.quality.status, 'partial');
        }
        const serialized = JSON.stringify(response.json);
        assert.doesNotMatch(serialized, /requestFingerprint|private-internal-request-fingerprint|passwordHash/);
        for (const secret of [passwordHash, sessions[0].token, process.env.JWT_SECRET]) assert.ok(!serialized.includes(secret));
        assert.equal(await businessState(), originalBusiness);
    });
    console.log(`PASS: ${passed} isolated stock-recovery integration scenarios.`);
} finally { globalThis.fetch = originalFetch; await env.stop(); }
