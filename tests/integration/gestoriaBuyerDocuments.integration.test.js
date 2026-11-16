import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica({ listen: false });
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { seedBuyerPortalFixtures } = await import('../fixtures/buyerPortalFixtures.js');
    const service = await import('../../src/services/buyerPortalService.js');
    const { createLoginSession, validateLoginSession } = await import('../../src/services/authSessionService.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const fixture = await seedMobileCrm(env.models);
    const buyers = await seedBuyerPortalFixtures(env.models, fixture);
    await service.createBuyerPortalIndexes();
    const owner = await validateLoginSession(fixture.sessions[0].token);
    let message;
    EmailAdapter.sendEmail = async (to, _subject, html) => {
        assert.equal(to, buyers.buyerOneEmail);
        message = html; return { accepted: [to], rejected: [] };
    };
    const configuration = await service.configurePortal(owner, buyers.withTradeIn, { days: 30 });
    const link = configuration.url.split('/').at(-1);
    const challenge = await service.sendBuyerChallenge(link, '127.0.0.1');
    const verified = await service.verifyBuyerChallenge(link, { challengeId: challenge.challengeId, code: message.match(/>\s*(\d{6})\s*</)[1] }, '127.0.0.1');
    const context = await service.buyerSession(link, verified.sessionToken);
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const uploaded = await service.uploadBuyerDocument(context, { requirementKey: 'title', tradeInId: buyers.tradeInId,
        side: 'page', slot: 'title-page-1', requestId: crypto.randomUUID() }, { buffer: bytes, originalname: 'titulo-ficticio.jpg' });
    const documentId = uploaded.entry.id;
    const asUser = async (index, permissions) => {
        await env.models.AdminUser.updateOne({ _id: fixture.users[index]._id }, { $set: { permissions } });
        const user = await env.models.AdminUser.findById(fixture.users[index]._id);
        const session = await createLoginSession(user);
        return validateLoginSession(session.token);
    };
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const denied = (fn, status) => assert.rejects(fn, error => error.status === status);
    let reader, signedAccess;
    await test('a Gestoria-only reader can list its linked sale legajo and open the private signed image', async () => {
        reader = await asUser(3, ['gestoria.read']);
        const listed = await service.adminDocuments(reader, { saleId: buyers.withTradeIn });
        assert.equal(listed.groups.find(group => group.key === 'title').entries[0].id, documentId);
        const access = await service.documentAccess(documentId, null, reader);
        signedAccess = new URL(access.url, 'https://fixture.example.test').searchParams.get('access');
        assert.deepEqual((await service.readPrivateDocument(documentId, signedAccess)).buffer, bytes);
    });
    await test('Gestoria permission does not grant access to unrelated sales or another seller\'s operation', async () => {
        await denied(() => service.adminDocuments(reader, { saleId: buyers.withoutTradeIn }), 404);
        const otherSeller = await asUser(2, ['gestoria.read']);
        await denied(() => service.adminDocuments(otherSeller, { saleId: buyers.withTradeIn }), 404);
        await denied(() => service.documentAccess(documentId, null, otherSeller), 404);
    });
    await test('read access does not grant document review or physical-original writes', async () => {
        await denied(() => service.reviewBuyerDocument(reader, documentId, { status: 'reviewed' }), 403);
        await denied(() => service.markOriginal(reader, { saleId: buyers.withTradeIn, tradeInId: buyers.tradeInId, requirementKey: 'title', received: true }), 403);
    });
    await test('permission changes and removal of the linked procedure revoke already-issued file access', async () => {
        const noPermission = await asUser(3, ['help.read']);
        await denied(() => service.adminDocuments(noPermission, { saleId: buyers.withTradeIn }), 403);
        await denied(() => service.documentAccess(documentId, null, noPermission), 403);
        await denied(() => service.readPrivateDocument(documentId, signedAccess), 403);
        reader = await asUser(3, ['gestoria.read']);
        const access = await service.documentAccess(documentId, null, reader);
        await env.models.Gestoria.deleteMany({ saleId: buyers.withTradeIn });
        await denied(() => service.readPrivateDocument(documentId, new URL(access.url, 'https://fixture.example.test').searchParams.get('access')), 404);
    });
    console.log(`PASS: ${passed} private Gestoria documentation scenarios.`);
} finally { await env.stop(); }
