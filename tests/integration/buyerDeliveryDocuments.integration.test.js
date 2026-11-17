import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('base64url');
    const core = await import('../../src/services/buyerPortalService.js');
    const delivery = await import('../../src/services/buyerDeliveryDocumentService.js');
    const { default: Delivery } = await import('../../src/models/BuyerDeliveryDocument.js');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { seedBuyerPortalFixtures } = await import('../fixtures/buyerPortalFixtures.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const fixtures = await seedMobileCrm(env.models), buyers = await seedBuyerPortalFixtures(env.models, fixtures);
    await core.createBuyerPortalIndexes(); await delivery.createBuyerDeliveryIndexes();
    const admin = jwt.decode(fixtures.sessions[0].token), seller = jwt.decode(fixtures.sessions[2].token);
    const mailbox = [];
    EmailAdapter.sendEmail = async (to, subject, html) => {
        assert.ok([buyers.buyerOneEmail, buyers.buyerTwoEmail].includes(to)); mailbox.push({ to, html }); return { accepted: [to] };
    };
    async function buyer(saleId, email) {
        const config = await core.configurePortal(admin, saleId, {}), token = config.url.split('/').at(-1);
        const challenge = await core.sendBuyerChallenge(token, '127.0.0.1');
        const code = mailbox.filter(message => message.to === email).at(-1).html.replace(/<[^>]*>/g, ' ').match(/\b\d{6}\b/)[0];
        const verified = await core.verifyBuyerChallenge(token, { challengeId: challenge.challengeId, code }, '127.0.0.1');
        return { token, sessionToken: verified.sessionToken, context: await core.buyerSession(token, verified.sessionToken) };
    }
    const a = await buyer(buyers.withTradeIn, buyers.buyerOneEmail), b = await buyer(buyers.withoutTradeIn, buyers.buyerTwoEmail);
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const pdf = Buffer.from('%PDF-1.4\n% disposable buyer delivery test\n%%EOF');
    const file = (buffer = photo) => ({ buffer, originalname: buffer === pdf ? 'titulo-ficticio.pdf' : 'cedula-ficticia.jpg' });
    const input = (type = 'title', extra = {}) => ({ requestId: crypto.randomUUID(), type, ...extra });
    const list = saleId => delivery.adminDeliveryDocuments(admin, saleId);
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const reject = (fn, status) => assert.rejects(fn, error => error.status === status, `expected status ${status}`);
    let draft, published, signedBeforeWithdraw;
    const initialGestoria = await env.models.Gestoria.findOne({ saleId: buyers.withTradeIn }).lean();

    await test('agency uploads are encrypted drafts bound to the purchased car and explicit recipient', async () => {
        const prepared = await delivery.uploadDeliveryDocument(admin, buyers.withTradeIn, input(), file(pdf)); draft = prepared.entry;
        assert.equal(draft.state, 'draft'); assert.equal(draft.version, 1);
        const stored = await Delivery.findById(draft.id).select('+encryptedFile').lean();
        assert.equal(String(stored.clientId), buyers.buyerOneId);
        assert.equal(String(stored.vehicleId), String(a.context.sale.vehicleId));
        assert.equal(stored.tradeInId, undefined);
        assert.notEqual(stored.encryptedFile.data, pdf.toString('base64'));
        const adminList = await list(buyers.withTradeIn);
        assert.equal(adminList.recipient.name, 'María José Pérez');
        assert.equal(adminList.recipient.clientId, buyers.buyerOneId);
        assert.ok(adminList.recipient.plate && adminList.recipient.vehicle && adminList.recipient.confirmationKey);
        assert.equal((await delivery.buyerDeliveryDocuments(a.context)).status, 'preparing');
        assert.equal((await delivery.buyerDeliveryDocuments(a.context)).documents.length, 0);
        await reject(() => delivery.deliveryDocumentAccess(draft.id, { context: a.context }), 404);
        const access = await delivery.deliveryDocumentAccess(draft.id, { adminUser: admin });
        const data = await delivery.readDeliveryPortalFile(draft.id, new URL(access.url, 'http://localhost').searchParams.get('access'));
        assert.deepEqual(data.buffer, pdf);
    });
    await test('publication requires fresh recipient confirmation and preserves procedure state', async () => {
        const before = await list(buyers.withTradeIn), wrong = await list(buyers.withoutTradeIn);
        await reject(() => delivery.publishDeliveryDocument(admin, draft.id, { revision: draft.revision, confirmationKey: wrong.recipient.confirmationKey }), 409);
        await env.models.Client.updateOne({ _id: buyers.buyerOneId }, { $set: { firstName: 'María Elena', fullName: 'María Elena Pérez' } });
        await reject(() => delivery.publishDeliveryDocument(admin, draft.id, { revision: draft.revision, confirmationKey: before.recipient.confirmationKey }), 409);
        const fresh = await list(buyers.withTradeIn);
        const result = await delivery.publishDeliveryDocument(admin, draft.id, { revision: draft.revision, confirmationKey: fresh.recipient.confirmationKey });
        published = result.entry;
        assert.equal(published.state, 'published'); assert.equal(published.revision, draft.revision + 1);
        const duplicate = await delivery.publishDeliveryDocument(admin, draft.id, { revision: draft.revision, confirmationKey: fresh.recipient.confirmationKey });
        assert.equal(duplicate.duplicate, true);
        assert.equal((await env.models.Gestoria.findById(initialGestoria._id).lean()).status, initialGestoria.status);
        assert.equal((await delivery.buyerDeliveryDocuments(a.context)).documents[0].id, draft.id);
        assert.equal((await delivery.buyerDeliveryDocuments(b.context)).documents.length, 0);
    });
    await test('view and download links keep their signed disposition and reject cross-buyer access', async () => {
        await reject(() => delivery.deliveryDocumentAccess(draft.id, { context: b.context }), 404);
        await reject(() => delivery.adminDeliveryDocuments(seller, buyers.withTradeIn), 404);
        const viewed = await delivery.deliveryDocumentAccess(draft.id, { context: a.context });
        signedBeforeWithdraw = viewed.url;
        const viewedToken = new URL(viewed.url, 'http://localhost').searchParams.get('access');
        const shown = await delivery.readDeliveryPortalFile(draft.id, viewedToken);
        assert.deepEqual(shown.buffer, pdf); assert.equal(shown.download, false);
        const download = await delivery.deliveryDocumentAccess(draft.id, { context: a.context, download: true });
        const downloaded = await delivery.readDeliveryPortalFile(draft.id, new URL(download.url, 'http://localhost').searchParams.get('access'));
        assert.deepEqual(downloaded.buffer, pdf); assert.equal(downloaded.download, true);
        const response = await fetch(env.base + download.url);
        assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition'), /^attachment;/);
        assert.match(response.headers.get('cache-control'), /no-store/); assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
        const tamperedDisposition = await fetch(env.base + viewed.url + '&download=true');
        assert.equal(tamperedDisposition.status, 200); assert.match(tamperedDisposition.headers.get('content-disposition'), /^inline;/);
        const anonymous = await env.call('GET', '/api/buyer-portal/' + a.token + '/delivery-documents');
        assert.equal(anonymous.status, 401);
        const crossBuyer = await env.call('POST', '/api/buyer-portal/' + b.token + '/delivery-documents/' + draft.id + '/access', {}, b.sessionToken);
        assert.equal(crossBuyer.status, 404);
        const foreignOrigin = await env.call('POST', '/api/buyer-portal/' + a.token + '/delivery-documents/' + draft.id + '/access', {}, null,
            { Cookie: 'autosporting_buyer_session=' + encodeURIComponent(a.sessionToken), Origin: 'https://foreign.example.test' });
        assert.equal(foreignOrigin.status, 403);
        await reject(() => delivery.readDeliveryPortalFile(new env.mongoose.Types.ObjectId().toString(), viewedToken), 404);
        await reject(() => delivery.readDeliveryPortalFile(draft.id, 'not-a-signed-access'), 401);
    });
    await test('withdrawal invalidates already issued links and stale publish retries cannot republish it', async () => {
        const withdrawn = await delivery.withdrawDeliveryDocument(admin, draft.id, { revision: published.revision });
        assert.equal(withdrawn.entry.state, 'withdrawn');
        assert.equal((await delivery.buyerDeliveryDocuments(a.context)).documents.length, 0);
        await reject(() => delivery.readDeliveryPortalFile(draft.id, new URL(signedBeforeWithdraw, 'http://localhost').searchParams.get('access')), 404);
        assert.equal((await fetch(env.base + signedBeforeWithdraw)).status, 404);
        await reject(() => delivery.deliveryDocumentAccess(draft.id, { context: a.context, download: true }), 404);
        const recipient = (await list(buyers.withTradeIn)).recipient;
        await reject(() => delivery.publishDeliveryDocument(admin, draft.id, { revision: draft.revision, confirmationKey: recipient.confirmationKey }), 409);
        assert.equal((await delivery.withdrawDeliveryDocument(admin, draft.id, { revision: published.revision })).duplicate, true);
        const again = await delivery.publishDeliveryDocument(admin, draft.id, { revision: withdrawn.entry.revision, confirmationKey: recipient.confirmationKey });
        published = again.entry;
        await reject(() => delivery.withdrawDeliveryDocument(admin, draft.id, { revision: 2 }), 409);
        assert.equal((await Delivery.findById(draft.id).lean()).state, 'published');
    });
    await test('replacement is idempotent, retires the old bytes from public access and needs a new publication', async () => {
        const oldAccess = await delivery.deliveryDocumentAccess(draft.id, { context: a.context });
        const replacementInput = input('title', { replacesId: draft.id }), newFile = file(Buffer.from('%PDF-1.4\n% replacement bytes\n%%EOF'));
        const [one, two] = await Promise.all([
            delivery.uploadDeliveryDocument(admin, buyers.withTradeIn, replacementInput, newFile),
            delivery.uploadDeliveryDocument(admin, buyers.withTradeIn, replacementInput, newFile)
        ]);
        assert.equal(one.entry.id, two.entry.id); assert.equal(one.entry.version, 2); assert.equal(one.entry.state, 'draft');
        assert.equal(await Delivery.countDocuments({ saleId: buyers.withTradeIn, requestId: replacementInput.requestId }), 1);
        assert.equal((await delivery.buyerDeliveryDocuments(a.context)).documents.length, 0);
        await reject(() => delivery.readDeliveryPortalFile(draft.id, new URL(oldAccess.url, 'http://localhost').searchParams.get('access')), 404);
        await reject(() => delivery.uploadDeliveryDocument(admin, buyers.withTradeIn, { ...replacementInput, description: 'Other request payload' }, newFile), 409);
        draft = one.entry;
    });
    await test('all delivery types work without a trade-in and Other descriptions remain editable', async () => {
        for (const type of ['registration_front', 'registration_back', 'transfer_certificate', 'other']) {
            const upload = await delivery.uploadDeliveryDocument(admin, buyers.withoutTradeIn, input(type, { description: type === 'other' ? 'Manual del vehículo' : '' }), file(type === 'transfer_certificate' ? pdf : photo));
            const recipient = (await list(buyers.withoutTradeIn)).recipient;
            assert.equal(recipient.clientId, buyers.buyerTwoId);
            if (type === 'other') {
                const edited = await delivery.editDeliveryDocument(admin, upload.entry.id, { description: 'Garantía y manual del vehículo' });
                assert.equal(edited.entry.description, 'Garantía y manual del vehículo');
            }
            await delivery.publishDeliveryDocument(admin, upload.entry.id, { revision: upload.entry.revision, confirmationKey: recipient.confirmationKey });
        }
        const result = await delivery.buyerDeliveryDocuments(b.context);
        assert.equal(result.status, 'available'); assert.equal(result.documents.length, 4);
        assert.equal(result.documents.some(doc => doc.type === 'registration_front'), true);
        assert.equal(result.documents.some(doc => doc.type === 'registration_back'), true);
        assert.equal(JSON.stringify(result).includes('Gómez'), false);
        await reject(() => delivery.uploadDeliveryDocument(admin, buyers.withoutTradeIn, input('other'), file()), 400);
        await reject(() => delivery.uploadDeliveryDocument(admin, buyers.withoutTradeIn, input('title'), file(Buffer.from('<html>not-an-image</html>'))), 400);
    });
    await test('reassigned recipients and vehicles cannot receive or download the previous purchaser documents', async () => {
        const publishedDoc = (await delivery.buyerDeliveryDocuments(b.context)).documents[0];
        const signed = await delivery.deliveryDocumentAccess(publishedDoc.id, { context: b.context });
        await env.models.Sale.updateOne({ _id: buyers.withoutTradeIn }, { $set: { vehicleId: fixtures.cars[0]._id } });
        await reject(() => delivery.readDeliveryPortalFile(publishedDoc.id, new URL(signed.url, 'http://localhost').searchParams.get('access')), 404);
        const changed = await env.models.Sale.findById(buyers.withoutTradeIn).lean();
        assert.equal((await delivery.buyerDeliveryDocuments({ ...b.context, sale: changed })).documents.length, 0);
        const oldDraft = await Delivery.findById(draft.id).lean();
        await env.models.Sale.updateOne({ _id: buyers.withTradeIn }, { $set: { clientId: buyers.buyerTwoId } });
        const recipient = (await list(buyers.withTradeIn)).recipient;
        await reject(() => delivery.publishDeliveryDocument(admin, draft.id, { revision: oldDraft.revision, confirmationKey: recipient.confirmationKey }), 409);
    });
    await test('domain operations never create a collection movement or finalize the procedure', async () => {
        assert.equal(await env.models.Transaction.countDocuments({ saleId: { $in: [buyers.withTradeIn, buyers.withoutTradeIn] } }), 0);
        assert.equal((await env.models.Gestoria.findById(initialGestoria._id).lean()).status, initialGestoria.status);
    });
    console.log(`PASS: ${passed} private buyer delivery document scenarios.`);
} finally { await env.stop(); }
