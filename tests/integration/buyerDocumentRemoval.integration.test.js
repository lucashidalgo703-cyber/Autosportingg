import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

// Disposable database and fake administrator mailbox only. No production
// credentials, customer documents or external delivery are used in this suite.
const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('base64url');
    const service = await import('../../src/services/buyerPortalService.js');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const fixture = await seedMobileCrm(env.models);
    const { Sale, Client, BuyerPortal, BuyerPortalSession, BuyerPortalDocument, BuyerPortalOriginal, BuyerDocumentNotification } = env.models;
    await service.createBuyerPortalIndexes();
    const mails = [];
    EmailAdapter.sendEmail = async (to, subject) => {
        assert.equal(to, process.env.SECURITY_ALERT_EMAIL);
        mails.push({ to, subject }); return { accepted: [to], rejected: [] };
    };
    const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
    const encryptionKey = crypto.createHash('sha256').update(process.env.BUYER_PORTAL_DOCUMENT_KEY).digest();
    const signingKey = crypto.createHmac('sha256', encryptionKey).update('autosporting:buyer-portal-signing:v1').digest('hex');
    const admin = { id: String(fixture.users[0]._id), role: 'admin' };
    const adminApi = (method, route, body) => env.call(method, '/api/admin/buyer-portal' + route, body, fixture.sessions[0].token);
    const status = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.json));
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const create = async () => {
        const client = await Client.create({ fullName: 'Comprador ficticio', email: crypto.randomUUID() + '@example.test', status: 'activo' });
        const sale = await Sale.create({ clientId: client._id, status: 'confirmada', salePrice: 10000000, saleCurrency: 'ARS',
            tradeIns: [{ brand: 'Ficticia', model: 'Unidad local', year: 2022, plate: 'QA001AA', estimatedValue: 5000000, currency: 'ARS' }] });
        const configuration = await service.configurePortal(admin, String(sale._id), {});
        const link = configuration.url.split('/').at(-1), portal = await BuyerPortal.findById(sale._id).lean();
        const sid = crypto.randomBytes(32).toString('base64url'), exp = Math.floor(Date.now() / 1000) + 1800;
        await BuyerPortalSession.create({ _id: sha(sid), portalId: sale._id, generation: portal.generation, clientId: client._id,
            contactHash: sha(client.email), expiresAt: new Date(exp * 1000) });
        const token = jwt.sign({ purpose: 'buyer-portal', portalId: String(sale._id), generation: portal.generation,
            clientId: String(client._id), contactHash: sha(client.email), sid, exp }, signingKey, { algorithm: 'HS256', audience: 'autosporting-buyer' });
        const context = await service.buyerSession(link, token);
        return { sale, client, portal, link, token, context, tid: String(sale.tradeIns[0]._id) };
    };
    const pub = (f, method, path, body, token = f.token, headers = {}) => env.call(method, '/api/buyer-portal/' + f.link + path, body, token, headers);
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const pdf = Buffer.from('%PDF-1.4\n% fictional local test only\n%%EOF');
    const upload = async (f, values = {}) => {
        const input = { tradeInId: f.tid, requirementKey: 'title', slot: 'title-page-1', side: 'page', requestId: crypto.randomUUID(), ...values };
        const { buffer = photo, ...fields } = input;
        const form = new FormData();
        for (const [name, value] of Object.entries(fields)) if (value !== undefined) form.set(name, value);
        form.set('file', new Blob([buffer]), buffer === pdf ? 'ficticio.pdf' : 'ficticia.jpg');
        const response = await fetch(env.base + '/api/buyer-portal/' + f.link + '/documents', {
            method: 'POST', headers: { Authorization: 'Bearer ' + f.token }, body: form
        });
        return { status: response.status, json: await response.json(), fields };
    };
    const remove = (f, id) => pub(f, 'DELETE', '/documents/' + id);
    const entries = async f => (await pub(f, 'GET', '/session')).json.tradeIns[0].groups;
    const signed = async (f, id) => { const response = await pub(f, 'POST', '/documents/' + id + '/access', {}); status(response, 200); return response.json.url; };
    const read = async url => fetch(env.base + url);

    await test('removal requires the correct verified buyer, a live portal and same-origin cookie mutations', async () => {
        const a = await create(), b = await create();
        const file = await upload(a); status(file, 200);
        const id = file.json.entry.id;
        status(await pub(a, 'DELETE', '/documents/' + id, undefined, null), 401);
        status(await pub(a, 'DELETE', '/documents/' + id, undefined, null, {
            Cookie: 'autosporting_buyer_session=' + encodeURIComponent(a.token), Origin: 'https://foreign.example.test'
        }), 403);
        status(await remove(b, id), 404);
        status(await remove(a, 'invalid'), 404);
        const nonBuyer = await BuyerPortalDocument.create({ saleId: a.sale._id, tradeInId: a.tid, requirementKey: 'title', slot: 'title-page-9',
            side: 'page', requestId: crypto.randomUUID(), origin: 'agency', encryptedFile: { iv: 'fixture', tag: 'fixture', data: 'fixture' } });
        status(await remove(a, String(nonBuyer._id)), 404);
        assert.equal((await BuyerPortalDocument.findById(id).lean()).isCurrent, true);
    });

    await test('explicit image replacement succeeds in an occupied position and keeps one current version', async () => {
        const f = await create();
        const first = await upload(f); status(first, 200);
        status(await upload(f), 409);
        const replacement = await upload(f, { replacesId: first.json.entry.id }); status(replacement, 200);
        assert.equal(replacement.json.entry.version, 2);
        assert.equal(await BuyerPortalDocument.countDocuments({ saleId: f.sale._id, isCurrent: true }), 1);
        status(await remove(f, first.json.entry.id), 409);
    });

    await test('removing a reviewed copy erases bytes, invalidates buyer/admin links, keeps originals and cannot resurrect on retries', async () => {
        const f = await create(), first = await upload(f); status(first, 200);
        const replacement = await upload(f, { replacesId: first.json.entry.id }); status(replacement, 200);
        const id = replacement.json.entry.id;
        status(await adminApi('PATCH', '/documents/' + id, { status: 'reviewed' }), 200);
        status(await adminApi('PATCH', '/requirements/original', { saleId: String(f.sale._id), tradeInId: f.tid, requirementKey: 'title', received: true }), 200);
        const buyerUrl = await signed(f, id);
        const adminAccess = await adminApi('POST', '/documents/' + id + '/access', {}); status(adminAccess, 200);
        assert.equal((await read(buyerUrl)).status, 200); assert.equal((await read(adminAccess.json.url)).status, 200);
        await BuyerDocumentNotification.updateOne({ documentId: id }, { $set: { state: 'pending', nextAttemptAt: new Date() } });
        const priorMails = mails.length, priorEvents = await BuyerDocumentNotification.countDocuments();
        const removed = await remove(f, id); status(removed, 200); assert.equal(removed.json.removed, true);
        const tombstone = await BuyerPortalDocument.findById(id).select('+encryptedFile').lean();
        assert.ok(tombstone.removedAt); assert.equal(tombstone.isCurrent, false); assert.equal(tombstone.encryptedFile, undefined);
        assert.equal(tombstone.history.filter(item => item.status === 'removed').length, 1);
        const group = (await entries(f)).find(item => item.key === 'title');
        assert.equal(group.complete, false); assert.equal(group.originalReceived, true);
        assert.equal(group.entries.some(item => item.id === id), false);
        assert.equal(group.entries.filter(item => item.isCurrent).length, 0, 'an older version must not become current again');
        const docs = await adminApi('GET', '/documents?saleId=' + f.sale._id); status(docs, 200);
        assert.equal(docs.json.groups.flatMap(item => item.entries).some(item => item.id === id), false);
        assert.equal((await read(buyerUrl)).status, 404); assert.equal((await read(adminAccess.json.url)).status, 404);
        status(await pub(f, 'POST', '/documents/' + id + '/access', {}), 404);
        status(await adminApi('POST', '/documents/' + id + '/access', {}), 404);
        status(await adminApi('PATCH', '/documents/' + id, { status: 'received' }), 404);
        const again = await remove(f, id); status(again, 200); assert.equal(again.json.duplicate, true);
        assert.equal((await BuyerPortalDocument.findById(id).lean()).history.filter(item => item.status === 'removed').length, 1);
        status(await upload(f, replacement.fields), 409);
        assert.equal(mails.length, priorMails); assert.equal(await BuyerDocumentNotification.countDocuments(), priorEvents);
        assert.equal((await BuyerDocumentNotification.findOne({ documentId: id }).lean()).state, 'skipped');
        assert.equal((await BuyerPortalOriginal.findOne({ saleId: f.sale._id }).lean()).received, true);
        const next = await upload(f); status(next, 200); assert.notEqual(next.json.entry.id, id);
    });

    await test('a complete registration-card PDF can be replaced by its chosen photo side without marking the missing side complete', async () => {
        const f = await create();
        const whole = await upload(f, { requirementKey: 'registration_cards', slot: 'cedula-1-complete', side: 'other', buffer: pdf }); status(whole, 200);
        const front = await upload(f, { requirementKey: 'registration_cards', slot: 'cedula-1-front', side: 'front', replacesId: whole.json.entry.id }); status(front, 200);
        assert.equal(front.json.entry.side, 'front'); assert.equal(front.json.entry.mimeType, 'image/jpeg');
        let group = (await entries(f)).find(item => item.key === 'registration_cards'); assert.equal(group.complete, false);
        const back = await upload(f, { requirementKey: 'registration_cards', slot: 'cedula-1-back', side: 'back' }); status(back, 200);
        group = (await entries(f)).find(item => item.key === 'registration_cards'); assert.equal(group.complete, true);
    });

    await test('conversion cannot overwrite an occupied side or move into an unrelated position', async () => {
        const f = await create();
        const front = await upload(f, { requirementKey: 'registration_cards', slot: 'cedula-2-front', side: 'front' }); status(front, 200);
        const whole = await upload(f, { requirementKey: 'registration_cards', slot: 'cedula-2-complete', side: 'other', buffer: pdf }); status(whole, 200);
        status(await upload(f, { requirementKey: 'registration_cards', slot: 'cedula-2-front', side: 'front', replacesId: whole.json.entry.id }), 409);
        status(await upload(f, { requirementKey: 'registration_cards', slot: 'cedula-3-back', side: 'back', replacesId: whole.json.entry.id }), 400);
        for (const id of [front.json.entry.id, whole.json.entry.id]) assert.equal((await BuyerPortalDocument.findById(id).lean()).isCurrent, true);
    });

    await test('concurrent delete and replace choose one winner without resurrecting or losing a committed copy', async () => {
        const f = await create(), first = await upload(f); status(first, 200);
        const [removed, replacement] = await Promise.all([remove(f, first.json.entry.id), upload(f, { replacesId: first.json.entry.id })]);
        assert.deepEqual([removed.status, replacement.status].sort(), [200, 409]);
        const original = await BuyerPortalDocument.findById(first.json.entry.id).lean();
        const current = await BuyerPortalDocument.find({ saleId: f.sale._id, isCurrent: true }).lean();
        assert.equal(current.length, removed.status === 200 ? 0 : 1);
        assert.equal(Boolean(original.removedAt), removed.status === 200);
    });

    await test('concurrent review and duplicate deletion cannot restore a removed file or duplicate removal history', async () => {
        const f = await create(), first = await upload(f); status(first, 200);
        const id = first.json.entry.id;
        const results = await Promise.all([remove(f, id), remove(f, id), adminApi('PATCH', '/documents/' + id, { status: 'reviewed' })]);
        status(results[0], 200); status(results[1], 200); assert.ok([200, 404, 409].includes(results[2].status));
        const doc = await BuyerPortalDocument.findById(id).lean(); assert.ok(doc.removedAt); assert.equal(doc.isCurrent, false);
        assert.equal(doc.history.filter(item => item.status === 'removed').length, 1);
        status(await adminApi('PATCH', '/documents/' + id, { status: 'received' }), 404);
    });

    await test('a stale mutation context is rejected after channel, device, portal, vehicle or sale changes', async () => {
        const cases = [
            f => Client.updateOne({ _id: f.client._id }, { $set: { email: 'changed@example.test' } }),
            f => service.revokeBuyerSession(f.token),
            f => service.revokePortal(admin, String(f.sale._id)),
            f => Sale.updateOne({ _id: f.sale._id }, { $set: { tradeIns: [] } }),
            f => Sale.updateOne({ _id: f.sale._id }, { $set: { status: 'cancelada' } })
        ];
        for (const mutate of cases) {
            const f = await create(), file = await upload(f); status(file, 200);
            await mutate(f);
            await assert.rejects(service.removeBuyerDocument(f.context, file.json.entry.id), error => [401, 404].includes(error.status));
            assert.equal((await BuyerPortalDocument.findById(file.json.entry.id).lean()).isCurrent, true);
        }
    });
    console.log(`PASS: ${passed} isolated document removal/replacement groups.`);
} finally { await env.stop(); }
