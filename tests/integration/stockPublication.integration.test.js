import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Only the isolated test server may be contacted');
    return nativeFetch(input, options);
};
let passed = 0, uploaded = 0;
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    const { createLoginSession } = await import('../../src/services/authSessionService.js');
    const { default: cloudinary } = await import('../../src/config/cloudinary.js');
    process.env.CLOUDINARY_CLOUD_NAME = 'isolated-fixture';
    cloudinary.uploader.upload_stream = (options, callback) => {
        assert.equal(options.folder, 'autosporting-cars');
        let bytes = 0;
        return new Writable({ write(chunk, _encoding, done) { bytes += chunk.length; done(); }, final(done) {
            const public_id = 'autosporting-cars/local-' + (++uploaded);
            callback(null, { secure_url: 'https://res.cloudinary.com/isolated-fixture/image/upload/v1/' + public_id + '.png', public_id, bytes }); done();
        } });
    };
    const { Car, AdminUser } = env.models;
    const seller = fixture.sessions[1].token, readonly = fixture.sessions[3].token, admin = fixture.sessions[0].token;
    const car = fixture.cars[0], reserved = fixture.cars[2], paused = fixture.cars[3], sold = fixture.cars[4];
    const oldImage = 'https://res.cloudinary.com/isolated-fixture/image/upload/v1/autosporting-cars/original.png';
    await Car.updateOne({ _id: car._id }, { $set: { images: [oldImage], coverImage: oldImage } });
    const base = '/api/admin/stock/publication';
    const gallery = '/api/admin/cars/' + car._id + '/images';
    const api = (method, path, body, token = seller) => env.call(method, path, body, token);
    const expect = (result, status) => assert.equal(result.status, status, JSON.stringify(result.json));
    const test = async (name, callback) => { await callback(); console.log('ok ' + (++passed) + ' - ' + name); };
    const multipart = async (path, fields = {}, file = null, token = seller) => {
        const form = new FormData();
        for (const [key, value] of Object.entries(fields)) form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
        if (file) form.append('images', new Blob([file], { type: 'image/png' }), 'local-test.png');
        const response = await fetch(env.base + path, { method: 'PUT', headers: { Authorization: 'Bearer ' + token }, body: form });
        return { status: response.status, json: await response.json() };
    };
    await test('sellers with default and legacy saved permissions can read a sanitised gallery while read-only users cannot', async () => {
        expect(await api('GET', base, undefined, null), 401);
        expect(await api('GET', base, undefined, readonly), 403);
        const list = await api('GET', base); expect(list, 200);
        assert.ok(list.json.items.some(item => item.id === String(car._id)));
        assert.ok(list.json.items.some(item => item.id === String(reserved._id)));
        assert.ok(!list.json.items.some(item => item.id === String(sold._id)));
        assert.doesNotMatch(JSON.stringify(list.json), /purchasePrice|purchaseCurrency|expenses|investor|jointOwnership|auditLog|purchasePaymentState/);
        const single = await api('GET', base + '/' + car._id); expect(single, 200);
        assert.equal(single.json.canManageImages, true); assert.equal(single.json.canPublish, true);
        const legacy = await AdminUser.create({ name: 'Vendedor legado ficticio', email: 'legacy-gallery@example.test', passwordHash: fixture.users[0].passwordHash,
            role: 'ventas', permissions: ['stock.read'], active: true });
        const session = await createLoginSession(legacy);
        expect(await api('GET', base, undefined, session.token), 200);
        expect(await api('PATCH', '/api/admin/cars/' + car._id + '/publication', { visibleEnWeb: false }, session.token), 200);
        expect(await api('GET', '/api/admin/cars/' + car._id, undefined, session.token), 403);
        const paged = await api('GET', base + '?page=1&limit=1&search=Volkswagen'); expect(paged, 200);
        assert.equal(paged.json.items.length, 1); assert.equal(paged.json.total, 2); assert.equal(paged.json.pages, 2);
        expect(await api('GET', base + '?limit=1000'), 400);
    });
    await test('a real multipart photo upload appends, orders, frames and persists on the selected vehicle without external Cloudinary calls', async () => {
        const before = await Car.findById(car._id).lean();
        const added = await multipart(gallery, {}, 'isolated image bytes'); expect(added, 200);
        assert.equal(uploaded, 1); assert.equal(added.json.uploadedImages.length, 1);
        const newImage = added.json.uploadedImages[0];
        assert.deepEqual(added.json.images, [oldImage, newImage]);
        const ordered = await multipart(gallery, { imageOrder: [newImage, oldImage] }); expect(ordered, 200);
        expect(await api('PATCH', gallery, { imagePositions: ['50% 35%', '50% 75%'], imagePosition: '50% 35%' }), 200);
        const saved = await Car.findById(car._id).lean();
        assert.deepEqual(saved.images, [newImage, oldImage]); assert.equal(saved.coverImage, newImage);
        assert.deepEqual(saved.imagePositions, ['50% 35%', '50% 75%']); assert.equal(saved.imagePosition, '50% 35%');
        for (const field of ['price', 'currency', 'purchasePrice', 'purchaseCurrency', 'status', 'sold', 'visibleEnWeb']) assert.deepEqual(saved[field], before[field]);
        assert.equal(saved.auditLog.at(-1).field, 'images');
        assert.equal((await Car.findById(fixture.cars[1]._id).lean()).images.length, 0);
        expect(await multipart(gallery, { imageOrder: [newImage] }), 200);
        assert.deepEqual((await Car.findById(car._id).lean()).images, [newImage]);
    });
    await test('publication changes only visibility and the public catalogue reflects photos without exposing costs', async () => {
        const route = '/api/admin/cars/' + car._id + '/publication';
        expect(await api('PATCH', route, { visibleEnWeb: true }), 200);
        const result = await api('GET', '/api/public/cars'); expect(result, 200);
        const visible = result.json.find(item => String(item._id) === String(car._id));
        assert.ok(visible); assert.equal(visible.images.length, 1);
        assert.doesNotMatch(JSON.stringify(visible), /purchasePrice|purchaseCurrency|expenses|auditLog/);
        expect(await api('PATCH', route, { visibleEnWeb: false }), 200);
        const hidden = await api('GET', '/api/public/cars'); expect(hidden, 200);
        assert.ok(!hidden.json.some(item => String(item._id) === String(car._id)));
        for (const unavailable of [reserved, paused]) {
            expect(await api('PATCH', '/api/admin/cars/' + unavailable._id + '/publication', { visibleEnWeb: true }), 200);
            assert.equal((await Car.findById(unavailable._id).lean()).status, unavailable.status);
            const publicList = await api('GET', '/api/public/cars');
            assert.ok(!publicList.json.some(item => String(item._id) === String(unavailable._id)));
        }
    });
    await test('read-only or revoked users cannot upload, publish or change operational fields; sold stock remains protected', async () => {
        expect(await multipart(gallery, {}, 'must never upload', readonly), 403); assert.equal(uploaded, 1);
        expect(await api('PATCH', gallery, { imagePosition: '50% 75%' }, readonly), 403);
        expect(await api('PATCH', '/api/admin/cars/' + car._id + '/publication', { visibleEnWeb: true }, readonly), 403);
        expect(await api('PATCH', '/api/admin/cars/' + car._id + '/publication', { visibleEnWeb: true, status: 'Disponible', price: 1 }), 400);
        expect(await multipart(gallery, { status: 'Vendido' }), 400);
        expect(await multipart(gallery, { imageOrder: ['https://untrusted.example.test/photo.jpg'] }), 400);
        expect(await multipart(gallery, { imageOrder: ['__new__4'] }), 400);
        expect(await api('PATCH', '/api/admin/cars/' + car._id, { price: 1, purchasePrice: 0, status: 'Vendido' }), 403);
        expect(await api('GET', '/api/admin/cars'), 403);
        expect(await api('GET', '/api/admin/accounts'), 403);
        expect(await api('GET', base + '/' + sold._id), 409);
        expect(await api('PATCH', '/api/admin/cars/' + sold._id + '/publication', { visibleEnWeb: true }), 409);
        expect(await multipart('/api/admin/cars/' + sold._id + '/images', {}, 'never upload'), 409); assert.equal(uploaded, 1);
        expect(await api('PATCH', '/api/admin/cars/' + sold._id + '/images', { imagePosition: '50% 35%' }, admin), 200);
        await AdminUser.updateOne({ _id: fixture.users[1]._id }, { $set: { active: false } });
        expect(await api('GET', base), 401);
    });
    console.log('PASS: ' + passed + ' isolated seller photo/catalogue scenarios; no real accounts, uploads or emails.');
} finally { globalThis.fetch = nativeFetch; await env.stop(); }
