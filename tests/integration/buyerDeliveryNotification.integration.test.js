// Isolated database and fake mail transport. Never uses employee data or real mail.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica({ listen: false });
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    const core = await import('../../src/services/buyerPortalService.js');
    const delivery = await import('../../src/services/buyerDeliveryDocumentService.js');
    const notices = await import('../../src/services/buyerDeliveryNotificationService.js');
    const { default: Notification } = await import('../../src/models/BuyerDeliveryNotification.js');
    const { default: DeliveryDocument } = await import('../../src/models/BuyerDeliveryDocument.js');
    const { BuyerPortal } = await import('../../src/models/BuyerPortal.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    await core.createBuyerPortalIndexes();
    const admin = { id: String(fixture.users[0]._id), name: fixture.users[0].name, role: 'owner' };
    const mail = [], calls = [];
    let transportFailure = null;
    EmailAdapter.sendEmail = async (to, subject, html, attachments, options, messageOptions = {}) => {
        assert.match(to, /@example\.test$/); calls.push({ to, subject });
        if (transportFailure) throw transportFailure;
        mail.push({ to, subject, html, attachments, options, text: messageOptions.text });
        return { accepted: [to], rejected: [] };
    };
    const test = async (name, run) => { await run(); console.log(`ok ${++passed} - ${name}`); };
    const file = { buffer: Buffer.from('%PDF-1.4\n% FICTITIOUS DOCUMENT ONLY\n%%EOF'), originalname: 'copia-ficticia.pdf' };
    async function make({ portal = true, name = 'María José', tradeIn = false } = {}) {
        const client = await env.models.Client.create({ firstName: name, lastName: 'Ficticio', fullName: name + ' Ficticio', email: crypto.randomUUID() + '@example.test' });
        const car = await env.models.Car.create({ brand: 'Ficticia', name: 'Vehículo comprado ' + crypto.randomUUID().slice(0, 6), year: 2024, km: 1000, fuel: 'Nafta', condition: 'Usado', price: 20000, currency: 'ARS', plateOrVin: 'QA' + crypto.randomUUID().slice(0, 5) });
        const sale = await env.models.Sale.create({ clientId: client._id, vehicleId: car._id, salePrice: 20000, saleCurrency: 'ARS', status: 'confirmada',
            ...(tradeIn ? { tradeIns: [{ brand: 'OTRO VEHÍCULO PRIVADO', model: 'Usado que entrega', year: 2020, estimatedValue: 1000, currency: 'ARS' }] } : {}) });
        const configuration = portal ? await core.configurePortal(admin, String(sale._id), {}) : null;
        const input = { type: 'title', requestId: crypto.randomUUID() };
        const draft = await delivery.uploadDeliveryDocument(admin, String(sale._id), input, file);
        return { client, car, sale, configuration, draft: draft.entry, input };
    }
    async function publish(f) {
        const list = await delivery.adminDeliveryDocuments(admin, String(f.sale._id));
        const current = list.documents.find(doc => doc.id === f.draft.id);
        return delivery.publishDeliveryDocument(admin, f.draft.id, { revision: current.revision, confirmationKey: list.recipient.confirmationKey });
    }
    const latest = id => Notification.findOne({ documentId: id }).sort({ revision: -1 }).lean();
    async function failed() {
        const f = await make(); transportFailure = Object.assign(new Error('Provider rejected fixture'), { responseCode: 550 });
        const result = await publish(f); transportFailure = null;
        assert.equal(result.entry.state, 'published'); assert.equal(result.emailNotification.status, 'failed');
        return { ...f, published: result.entry, event: await latest(f.draft.id) };
    }

    await test('drafts and descriptions stay internal; publication emails only the linked buyer and bought car', async () => {
        for (const [name, tradeIn] of [['María José', true], ['Juan Ignacio', false]]) {
            const before = mail.length, transactions = await env.models.Transaction.countDocuments();
            const f = await make({ name, tradeIn });
            await delivery.editDeliveryDocument(admin, f.draft.id, { description: 'INTERNAL DESCRIPTION NEVER IN EMAIL' });
            assert.equal(mail.length, before); assert.equal(await Notification.countDocuments({ documentId: f.draft.id }), 0);
            const result = await publish(f);
            assert.equal(result.emailNotification.status, 'sent'); assert.equal(result.notificationDocumentId, f.draft.id);
            assert.equal(mail.length, before + 1);
            const sent = mail.at(-1);
            assert.equal(sent.to, f.client.email); assert.notEqual(sent.to, process.env.SECURITY_ALERT_EMAIL);
            assert.match(sent.subject, /Documentación de tu vehículo disponible/);
            assert.ok(sent.html.includes(f.client.firstName)); assert.ok(sent.html.includes(f.car.name)); assert.ok(sent.html.includes(f.car.plateOrVin));
            assert.ok(sent.html.includes(f.configuration.url)); assert.match(sent.text, /Disponible para descargar/); assert.match(sent.text, /Hora argentina/);
            assert.deepEqual(sent.attachments, []); assert.equal(sent.options.logger, false); assert.equal(sent.options.debug, false);
            assert.doesNotMatch(sent.html + sent.text, /INTERNAL DESCRIPTION|OTRO VEHÍCULO PRIVADO|api\/buyer-portal\/files|access=|FICTITIOUS DOCUMENT ONLY/);
            const event = await latest(f.draft.id), stored = JSON.stringify(event);
            assert.ok(!stored.includes(f.client.email)); assert.ok(!stored.includes(f.configuration.url)); assert.ok(!stored.includes('copia-ficticia.pdf'));
            assert.equal((await delivery.adminDeliveryDocuments(admin, String(f.sale._id))).documents[0].emailNotification.status, 'sent');
            assert.equal(await env.models.Transaction.countDocuments(), transactions);
        }
    });
    await test('concurrent publication and withdrawal retries create one event and one email per actual revision', async () => {
        const f = await make(), before = mail.length;
        const list = await delivery.adminDeliveryDocuments(admin, String(f.sale._id));
        const input = { revision: f.draft.revision, confirmationKey: list.recipient.confirmationKey };
        const result = await Promise.all([delivery.publishDeliveryDocument(admin, f.draft.id, input), delivery.publishDeliveryDocument(admin, f.draft.id, input)]);
        assert.equal(mail.length, before + 1); assert.equal(await Notification.countDocuments({ documentId: f.draft.id }), 1);
        assert.equal((await latest(f.draft.id)).attempts, 1);
        const withdraw = { revision: result[0].entry.revision };
        await Promise.all([delivery.withdrawDeliveryDocument(admin, f.draft.id, withdraw), delivery.withdrawDeliveryDocument(admin, f.draft.id, withdraw)]);
        assert.equal(mail.length, before + 2); assert.equal(await Notification.countDocuments({ documentId: f.draft.id }), 2);
        assert.match(mail.at(-1).text, /Retirado del portal/);
        await delivery.withdrawDeliveryDocument(admin, f.draft.id, withdraw);
        assert.equal(mail.length, before + 2);
    });
    await test('replacing a published file notifies once on its visible new draft; replacing internal drafts does not', async () => {
        const f = await make(); await publish(f); const before = mail.length;
        const input = { type: 'title', requestId: crypto.randomUUID(), replacesId: f.draft.id };
        const results = await Promise.all([delivery.uploadDeliveryDocument(admin, String(f.sale._id), input, file), delivery.uploadDeliveryDocument(admin, String(f.sale._id), input, file)]);
        assert.equal(results[0].entry.id, results[1].entry.id); assert.equal(results[0].entry.state, 'draft');
        assert.equal(mail.length, before + 1); assert.match(mail.at(-1).text, /Retirado del portal/);
        assert.equal(results[0].notificationDocumentId, results[0].entry.id);
        const list = await delivery.adminDeliveryDocuments(admin, String(f.sale._id));
        assert.equal(list.documents[0].emailNotification.status, 'sent');
        await delivery.uploadDeliveryDocument(admin, String(f.sale._id), { type: 'title', requestId: crypto.randomUUID(), replacesId: results[0].entry.id }, file);
        assert.equal(mail.length, before + 1);
    });
    await test('provider failure preserves the document change and explicit concurrent retry sends one notice', async () => {
        const f = await failed(), before = mail.length;
        const status = await notices.getBuyerDeliveryNotification(admin, f.draft.id);
        assert.equal(status.status, 'failed'); assert.equal(status.retryable, true);
        await assert.rejects(notices.retryBuyerDeliveryNotification({ role: 'solo_lectura' }, f.draft.id), error => error.status === 403);
        await Promise.all([notices.retryBuyerDeliveryNotification(admin, f.draft.id), notices.retryBuyerDeliveryNotification(admin, f.draft.id)]);
        assert.equal(mail.length, before + 1); assert.equal((await latest(f.draft.id)).state, 'sent'); assert.equal((await latest(f.draft.id)).attempts, 2);
        assert.equal((await DeliveryDocument.findById(f.draft.id)).state, 'published');
        await notices.retryBuyerDeliveryNotification(admin, f.draft.id); assert.equal(mail.length, before + 1);
    });
    await test('unconfirmed transport results never send another mail automatically or on a blind retry', async () => {
        const f = await make(); transportFailure = Object.assign(new Error('Unconfirmed fixture response'), { code: 'ETIMEDOUT' });
        const result = await publish(f); transportFailure = null;
        assert.equal(result.entry.state, 'published'); assert.equal(result.emailNotification.reason, 'delivery_uncertain'); assert.equal(result.emailNotification.retryable, false);
        const before = calls.length;
        await assert.rejects(notices.retryBuyerDeliveryNotification(admin, f.draft.id), error => error.status === 409);
        await notices.deliverBuyerDeliveryNotification(f.draft.id); assert.equal(calls.length, before);
        const event = await latest(f.draft.id);
        await Notification.updateOne({ _id: event._id }, { $set: { state: 'sending', claimedAt: new Date(Date.now() - 180000), claimId: 'stale-fixture' } });
        const list = await delivery.adminDeliveryDocuments(admin, String(f.sale._id));
        assert.equal(list.documents[0].emailNotification.reason, 'delivery_uncertain'); assert.equal(list.documents[0].emailNotification.retryable, false);
        for (const failure of [{ code: 'ECONNECTION', command: 'DATA' }, { code: 'ECONNECTION' }, { code: 'EMESSAGE', command: 'DATA' }, { code: 'ESMTP', command: 'QUIT', responseCode: 550 }]) {
            const candidate = await make(); transportFailure = Object.assign(new Error('Acceptance was not acknowledged'), failure);
            const sent = await publish(candidate); transportFailure = null;
            assert.equal(sent.emailNotification.reason, 'delivery_uncertain'); assert.equal(sent.emailNotification.retryable, false);
            const attempts = calls.length;
            await assert.rejects(notices.retryBuyerDeliveryNotification(admin, candidate.draft.id), error => error.status === 409);
            assert.equal(calls.length, attempts);
        }
    });
    await test('queued retries skip changed buyers, contacts, purchased vehicles and revoked or expired portals', async () => {
        for (const mutate of [
            f => env.models.Client.updateOne({ _id: f.client._id }, { $set: { email: 'changed-' + crypto.randomUUID() + '@example.test' } }),
            f => env.models.Client.updateOne({ _id: f.client._id }, { $set: { status: 'bloqueado' } }),
            f => env.models.Sale.updateOne({ _id: f.sale._id }, { $set: { clientId: fixture.client._id } }),
            f => env.models.Sale.updateOne({ _id: f.sale._id }, { $set: { vehicleId: fixture.cars[0]._id } }),
            f => BuyerPortal.updateOne({ _id: f.sale._id }, { $set: { enabled: false } }),
            f => BuyerPortal.updateOne({ _id: f.sale._id }, { $inc: { generation: 1 } }),
            f => BuyerPortal.updateOne({ _id: f.sale._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
        ]) {
            const f = await failed(); await mutate(f); const before = calls.length;
            const result = await notices.retryBuyerDeliveryNotification(admin, f.draft.id);
            assert.equal(result.status, 'skipped'); assert.equal(calls.length, before);
        }
    });
    await test('superseded failed notices cannot announce an earlier document state', async () => {
        const f = await failed();
        await delivery.withdrawDeliveryDocument(admin, f.draft.id, { revision: f.published.revision });
        const before = calls.length;
        await Notification.updateOne({ _id: f.event._id }, { $set: { nextAttemptAt: new Date(0) } });
        await notices.processPendingBuyerDeliveryNotifications({ limit: 10 });
        assert.equal(calls.length, before); assert.equal((await Notification.findById(f.event._id)).state, 'skipped');
        assert.equal((await Notification.findById(f.event._id)).reason, 'superseded');
    });
    await test('publication without an existing live portal does not create a link or send a misleading notice', async () => {
        const f = await make({ portal: false }), before = calls.length;
        const result = await publish(f);
        assert.equal(result.entry.state, 'published'); assert.equal(result.emailNotification.status, 'skipped'); assert.equal(result.emailNotification.reason, 'portal_unavailable');
        assert.equal(calls.length, before); assert.equal(await BuyerPortal.countDocuments({ _id: f.sale._id }), 0);
    });
    console.log(`PASS: ${passed} isolated buyer delivery notification groups; ${mail.length} fake deliveries, no real emails.`);
} finally { await env.stop(); }
