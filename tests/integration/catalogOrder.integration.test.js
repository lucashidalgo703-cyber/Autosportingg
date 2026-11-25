import assert from 'node:assert/strict';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Only the isolated local server may be contacted');
    return originalFetch(input, options);
};
let passed = 0;
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    const { Car, AdminUser } = env.models;
    const seller = fixture.sessions[1].token, readonly = fixture.sessions[3].token;
    const route = '/api/admin/stock/publication/order';
    const api = (method, path, body, token = seller) => env.call(method, path, body, token);
    const expect = (result, status) => assert.equal(result.status, status, JSON.stringify(result.json));
    const test = async (name, callback) => { await callback(); console.log('ok ' + (++passed) + ' - ' + name); };
    const ids = result => result.json.items.map(car => car.id);
    const publicIds = async () => { const result = await api('GET', '/api/public/cars'); expect(result, 200); return result.json.map(car => String(car._id)); };
    const cars = await Car.create(Array.from({ length: 26 }, (_, index) => ({
        brand: 'Marca pública de prueba', name: 'Modelo catálogo ' + index, year: 2022, km: 10000,
        condition: 'Usado', fuel: 'Nafta', price: 15000 + index, currency: 'U$S', purchasePrice: 11000 + index,
        purchaseCurrency: 'USD', agencyOwned: true, visibleEnWeb: true, sold: false, status: 'Disponible',
        images: ['https://example.test/local-' + index + '.jpg'], order: index % 3,
        createdAt: new Date('2026-01-01T00:00:00.000Z')
    })));
    await Car.updateMany({ _id: { $in: [fixture.cars[2]._id, fixture.cars[3]._id, fixture.cars[4]._id] } }, { $set: { visibleEnWeb: true, order: 77 } });
    const staleSold = await Car.create({ brand: 'No publicar', name: 'Vendido con estado heredado', year: 2020, price: 9000, km: 10000, fuel: 'Nafta', condition: 'Usado', currency: 'U$S', sold: true, status: 'Disponible', visibleEnWeb: true, order: -10 });
    const excludedIds = [...fixture.cars.map(car => car._id), staleSold._id];
    const excludedBefore = await Car.find({ _id: { $in: excludedIds } }).lean();
    const unchangedFields = ['brand', 'name', 'year', 'price', 'currency', 'purchasePrice', 'purchaseCurrency', 'expenses', 'status', 'sold', 'visibleEnWeb', 'images', 'coverImage'];
    const before = new Map((await Car.find({ _id: { $in: cars.map(car => car._id) } }).lean()).map(car => [String(car._id), car]));
    let initial;
    await test('sellers receive all published vehicles, including beyond twenty rows, in the same stable order as the public catalogue', async () => {
        expect(await api('GET', route, undefined, null), 401);
        expect(await api('GET', route, undefined, readonly), 403);
        initial = await api('GET', route); expect(initial, 200);
        assert.equal(initial.json.items.length, 26);
        assert.match(initial.json.revision, /^[a-f0-9]{64}$/);
        assert.equal(initial.json.canReorder, true);
        assert.deepEqual(ids(initial), await publicIds());
        assert.deepEqual(initial.json.items.map(car => car.position), Array.from({ length: 26 }, (_, index) => index + 1));
        assert.doesNotMatch(JSON.stringify(initial.json), /purchasePrice|purchaseCurrency|expenses|investor|jointOwnership|auditLog/);
        assert.ok(!ids(initial).includes(String(staleSold._id)));
    });
    await test('saving the complete desired order persists positions and the public default order without modifying hidden, unavailable or financial records', async () => {
        const desired = ids(initial).reverse();
        const saved = await api('PATCH', route, { vehicleIds: desired, expectedRevision: initial.json.revision }); expect(saved, 200);
        assert.deepEqual(ids(saved), desired);
        assert.notEqual(saved.json.revision, initial.json.revision);
        const reloaded = await api('GET', route); expect(reloaded, 200);
        assert.deepEqual(ids(reloaded), desired);
        assert.deepEqual(await publicIds(), desired);
        assert.deepEqual((await Car.find({ _id: { $in: excludedIds } }).lean()), excludedBefore);
        for (const car of await Car.find({ _id: { $in: cars.map(car => car._id) } }).lean()) {
            for (const field of unchangedFields) assert.deepEqual(car[field], before.get(String(car._id))[field], field + ' must remain unchanged');
            assert.equal(car.order, desired.indexOf(String(car._id)) + 1);
            if (before.get(String(car._id)).order !== car.order) assert.equal(car.auditLog.at(-1).field, 'order');
        }
        expect(await api('PATCH', route, { vehicleIds: ids(initial), expectedRevision: initial.json.revision }), 409);
        assert.deepEqual(await publicIds(), desired);
    });
    await test('invalid, partial, duplicate or privileged payloads and missing permissions cannot partially reorder the catalogue', async () => {
        const snapshot = await api('GET', route), current = ids(snapshot);
        for (const vehicleIds of [current.slice(1), [...current.slice(1), current[1]], [...current.slice(1), String(fixture.cars[0]._id)], ['not-an-id']]) {
            expect(await api('PATCH', route, { vehicleIds, expectedRevision: snapshot.json.revision }), 400);
        }
        expect(await api('PATCH', route, { vehicleIds: current, expectedRevision: snapshot.json.revision, price: 1, status: 'Vendido' }), 400);
        expect(await api('PATCH', route, { vehicleIds: current }), 400);
        expect(await api('PATCH', route, { vehicleIds: current, expectedRevision: snapshot.json.revision }, readonly), 403);
        expect(await api('PUT', '/api/cars/reorder/batch', { orderedIds: current }), 403);
        expect(await api('PATCH', '/api/admin/cars/' + current[0], { order: -20, price: 1 }), 403);
        assert.deepEqual(await publicIds(), current);
        assert.equal((await api('GET', route)).json.revision, snapshot.json.revision);
        expect(await api('PATCH', '/api/admin/cars/' + current[0] + '/publication', { visibleEnWeb: false }), 200);
        const afterVisibility = await api('GET', route);
        expect(await api('PATCH', route, { vehicleIds: current.reverse(), expectedRevision: snapshot.json.revision }), 409);
        assert.deepEqual(await publicIds(), ids(afterVisibility));
        expect(await api('PATCH', '/api/admin/cars/' + current.at(-1) + '/publication', { visibleEnWeb: true }), 200);
    });
    await test('concurrent saves of the same snapshot have one winner and one conflict instead of a mixed order', async () => {
        const snapshot = await api('GET', route), first = ids(snapshot), second = [...first].reverse();
        const rotate = [...first.slice(1), first[0]];
        const results = await Promise.all([second, rotate].map(vehicleIds => api('PATCH', route, { vehicleIds, expectedRevision: snapshot.json.revision })));
        assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
        const winner = results.find(result => result.status === 200);
        assert.deepEqual(await publicIds(), ids(winner));
        assert.deepEqual(ids(await api('GET', route)), ids(winner));
    });
    await test('disjoint swaps from one snapshot conflict instead of silently merging both intentions', async () => {
        const snapshot = await api('GET', route), current = ids(snapshot);
        const first = [...current], second = [...current];
        [first[0], first[1]] = [first[1], first[0]];
        [second[2], second[3]] = [second[3], second[2]];
        const outcomes = await Promise.all([first, second].map(vehicleIds => api('PATCH', route, { vehicleIds, expectedRevision: snapshot.json.revision })));
        assert.deepEqual(outcomes.map(outcome => outcome.status).sort(), [200, 409]);
        const winner = outcomes.find(outcome => outcome.status === 200);
        assert.deepEqual(await publicIds(), ids(winner));
        assert.deepEqual(ids(await api('GET', route)), ids(winner));
    });
    await test('a failure after an attempted first write rolls back every catalogue position and revoked sellers cannot save', async () => {
        const snapshot = await api('GET', route), previous = ids(snapshot);
        const priorRows = await Car.find({ _id: { $in: previous } }).lean();
        const originalBulkWrite = Car.bulkWrite;
        Car.bulkWrite = async function (operations, options) {
            await originalBulkWrite.call(this, operations.slice(0, 1), options);
            throw new Error('Synthetic failure after the first write');
        };
        try { expect(await api('PATCH', route, { vehicleIds: [...previous].reverse(), expectedRevision: snapshot.json.revision }), 503); }
        finally { Car.bulkWrite = originalBulkWrite; }
        assert.deepEqual(await Car.find({ _id: { $in: previous } }).lean(), priorRows);
        assert.deepEqual(await publicIds(), previous);
        await AdminUser.updateOne({ _id: fixture.users[1]._id }, { $set: { active: false } });
        expect(await api('GET', route), 401);
        expect(await api('PATCH', route, { vehicleIds: previous, expectedRevision: snapshot.json.revision }), 401);
    });
    console.log('PASS: ' + passed + ' isolated catalogue ordering scenarios; no real accounts or vehicles modified.');
} finally { globalThis.fetch = originalFetch; await env.stop(); }
