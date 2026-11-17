// Real isolated Mongo transactions and HTTP uploads; fictitious mail/files only.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    process.env.NEXT_PUBLIC_BASE_URL = env.base;
    const portal = await import('../../src/services/buyerPortalService.js');
    const proofs = await import('../../src/services/buyerPaymentProofService.js');
    const notifications = await import('../../src/services/buyerPaymentNotificationService.js');
    const { default: Notification } = await import('../../src/models/BuyerPaymentNotification.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    await portal.createBuyerPortalIndexes();
    const { Client, Car, Sale, BuyerPortal, BuyerPortalSession, BuyerPaymentProof, Transaction } = env.models;
    const admin = { id: String(fixture.users[0]._id), role: 'admin' }, adminEmail = process.env.SECURITY_ALERT_EMAIL;
    const vendor = { id: String(fixture.users[1]._id), role: 'ventas' };
    const sha = value => crypto.createHash('sha256').update(value).digest('hex');
    const key = crypto.createHmac('sha256', crypto.createHash('sha256').update(process.env.BUYER_PORTAL_DOCUMENT_KEY).digest()).update('autosporting:buyer-portal-signing:v1').digest('hex');
    const mails = [], attempts = [];
    let failure = '';
    EmailAdapter.sendEmail = async (to, subject, html, attachments = [], options = {}, messageOptions = {}) => {
        assert.match(to, /@example\.test$/, 'never contact a real mailbox');
        attempts.push({ to, subject });
        if (failure === 'known') throw Object.assign(new Error('Fictional SMTP rejection'), { responseCode: 550 });
        if (failure === 'unknown') throw new Error('Fictional uncertain provider response');
        if (failure === 'after-data') throw Object.assign(new Error('Fictional lost acknowledgement after DATA'), { code: 'ECONNECTION', command: 'DATA' });
        if (failure === 'message-after-data') throw Object.assign(new Error('Fictional message stream lost after DATA'), { code: 'EMESSAGE', command: 'DATA' });
        if (failure === 'quit-rejected') throw Object.assign(new Error('Fictional QUIT rejection after message acceptance'), { responseCode: 550, command: 'QUIT' });
        mails.push({ to, subject, html, attachments, options, ...messageOptions });
        return { accepted: [to], rejected: [] };
    };
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const pdf = Buffer.from('%PDF-1.4\n% Fictional payment\n%%EOF');
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    async function create({ withTradeIn = false, currency = 'ARS' } = {}) {
        const client = await Client.create({ firstName: 'María José', lastName: 'Prueba', fullName: 'María José Prueba', email: crypto.randomUUID() + '@example.test' });
        const car = await Car.create({ brand: 'Ficticia', name: 'Compra de prueba', year: 2024, km: 1000, fuel: 'Nafta', condition: 'Usado', price: 10000, currency, plateOrVin: 'PRUEBA01', status: 'Vendido', sold: true });
        const sale = await Sale.create({ clientId: client._id, vehicleId: car._id, salePrice: 10000, saleCurrency: currency, status: 'confirmada', notes: 'NOTA INTERNA PRIVADA',
            ...(withTradeIn ? { tradeInTotalAmount: 1000, tradeIns: [{ brand: 'Ficticia', model: 'Usado recibido', year: 2020, estimatedValue: 1000, currency }] } : {}) });
        const config = await portal.configurePortal(admin, String(sale._id), {}), link = config.url.split('/').at(-1), stored = await BuyerPortal.findById(sale._id).lean();
        const sid = crypto.randomBytes(32).toString('base64url'), exp = Math.floor(Date.now() / 1000) + 1800;
        await BuyerPortalSession.create({ _id: sha(sid), portalId: sale._id, clientId: client._id, generation: stored.generation, contactHash: sha(client.email), expiresAt: new Date(exp * 1000) });
        const token = jwt.sign({ purpose: 'buyer-portal', portalId: String(sale._id), clientId: String(client._id), generation: stored.generation, contactHash: sha(client.email), sid, exp }, key, { algorithm: 'HS256', audience: 'autosporting-buyer' });
        return { sale, client, car, link, token, context: await portal.buyerSession(link, token) };
    }
    async function upload(f, extra = {}, token = f.token) {
        const { buffer = photo, ...fields } = { requestId: crypto.randomUUID(), amount: '250.50', currency: f.sale.saleCurrency, paymentDate: '2026-01-02', concept: 'Saldo <ficticio>', targetType: 'purchase', ...extra };
        const form = new FormData(); for (const [name, value] of Object.entries(fields)) form.set(name, value);
        form.set('file', new Blob([buffer]), buffer === pdf ? 'comprobante-ficticio.pdf' : 'comprobante-ficticio.jpg');
        const response = await fetch(env.base + '/api/buyer-portal/' + f.link + '/payments', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: form });
        return { status: response.status, body: await response.json() };
    }
    const eventFor = id => Notification.findOne({ proofId: id }).lean();

    await test('invalid, unverified and foreign-operation uploads send no notice and create no event', async () => {
        const a = await create(), b = await create(), before = attempts.length;
        assert.equal((await upload(a, {}, '')).status, 401);
        assert.equal((await upload(a, {}, b.token)).status, 401);
        assert.equal((await upload(a, { buffer: Buffer.from('<script>invalid file</script>') })).status, 400);
        assert.equal(await Notification.countDocuments({ saleId: a.sale._id }), 0);
        assert.equal(attempts.length, before);
    });
    await test('both operation modes notify only the administrator with pending status and the exact protected review link', async () => {
        for (const withTradeIn of [false, true]) {
            const f = await create({ withTradeIn, currency: withTradeIn ? 'USD' : 'ARS' }), before = mails.length, moneyBefore = await Transaction.countDocuments();
            const result = await upload(f); assert.equal(result.status, 200);
            assert.equal(mails.length, before + 1); assert.equal(await Transaction.countDocuments(), moneyBefore);
            const mail = mails.at(-1); assert.equal(mail.to, adminEmail); assert.equal(mail.attachments.length, 0);
            assert.equal(mail.subject, 'AutoSporting | Nuevo comprobante de pago de María José Prueba');
            assert.match(mail.html, /Pendiente de verificación/); assert.match(mail.html, /PRUEBA01/); assert.match(mail.html, /250,50/);
            assert.match(mail.html, new RegExp(f.sale.saleCurrency)); assert.match(mail.html, /Hora argentina/);
            assert.match(mail.html, /Saldo &lt;ficticio&gt;/);
            const link = mail.html.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');
            assert.equal(link, env.base + '/admin/ventas/' + f.sale._id + '?section=collections&comprobante=' + result.body.proof.id);
            assert.doesNotMatch(mail.html + mail.text, /\/portal\/|access=|NOTA INTERNA PRIVADA|encryptedFile/);
            const event = await eventFor(result.body.proof.id); assert.equal(event.state, 'sent');
            assert.doesNotMatch(JSON.stringify(event), /@example\.test|https?:|encryptedFile|comprobante-ficticio|Saldo/);
            const adminData = await proofs.adminPaymentProofs(admin, String(f.sale._id)); assert.equal(adminData.proofs[0].emailNotification.status, 'sent');
            const buyerData = await proofs.buyerPaymentData(f.context); assert.equal(buyerData.proofs[0].emailNotification, undefined);
            await assert.rejects(notifications.getBuyerPaymentNotification(vendor, result.body.proof.id), error => error.status === 403);
        }
    });
    await test('concurrent retries with equal or new request identifiers retain one file, one event and one email', async () => {
        const f = await create(), requestId = crypto.randomUUID(), before = mails.length;
        const results = await Promise.all([upload(f, { requestId }), upload(f, { requestId }), upload(f)]);
        results.forEach(result => assert.equal(result.status, 200));
        assert.equal(new Set(results.map(result => result.body.proof.id)).size, 1);
        assert.equal(await BuyerPaymentProof.countDocuments({ saleId: f.sale._id }), 1);
        assert.equal(await Notification.countDocuments({ saleId: f.sale._id }), 1);
        assert.equal(mails.length, before + 1);
        await upload(f, { requestId }); assert.equal(mails.length, before + 1);
    });
    await test('a known provider rejection keeps the file pending, makes the failed notice visible and permits one explicit concurrent retry', async () => {
        const f = await create(), before = mails.length, moneyBefore = await Transaction.countDocuments(); failure = 'known';
        const result = await upload(f); assert.equal(result.status, 200); assert.equal(result.body.proof.status, 'pending');
        assert.equal((await eventFor(result.body.proof.id)).state, 'failed'); assert.equal(await Transaction.countDocuments(), moneyBefore);
        const failed = await notifications.getBuyerPaymentNotification(admin, result.body.proof.id); assert.equal(failed.status, 'failed'); assert.equal(failed.retryable, true);
        failure = '';
        await Promise.all([notifications.retryBuyerPaymentNotification(admin, result.body.proof.id), notifications.retryBuyerPaymentNotification(admin, result.body.proof.id)]);
        assert.equal(mails.length, before + 1); assert.equal((await eventFor(result.body.proof.id)).state, 'sent');
    });
    await test('uncertain delivery is never retried automatically or by an unsafe manual resend', async () => {
        for (const mode of ['unknown', 'after-data', 'message-after-data', 'quit-rejected']) {
            const f = await create(), before = attempts.length; failure = mode;
            const result = await upload(f); assert.equal(result.status, 200); failure = '';
            const info = await notifications.getBuyerPaymentNotification(admin, result.body.proof.id);
            assert.equal(info.status, 'failed'); assert.equal(info.reason, 'delivery_uncertain'); assert.equal(info.retryable, false);
            await upload(f); await notifications.retryPendingBuyerPaymentNotifications();
            await assert.rejects(notifications.retryBuyerPaymentNotification(admin, result.body.proof.id), error => error.status === 409);
            assert.equal(attempts.length, before + 1);
        }
    });
    await test('queued retries cannot notify a changed administrator, buyer, contact, vehicle, cancelled sale or revoked portal', async () => {
        for (const mutation of ['administrator', 'buyer', 'email', 'vehicle', 'cancelled', 'revoked']) {
            failure = 'known'; const f = await create(), result = await upload(f); assert.equal(result.status, 200); failure = '';
            const before = mails.length;
            if (mutation === 'administrator') process.env.SECURITY_ALERT_EMAIL = 'otro@example.test';
            if (mutation === 'buyer') await Sale.updateOne({ _id: f.sale._id }, { $set: { clientId: fixture.client._id } });
            if (mutation === 'email') await Client.updateOne({ _id: f.client._id }, { $set: { email: 'corregido@example.test' } });
            if (mutation === 'vehicle') await Sale.updateOne({ _id: f.sale._id }, { $set: { vehicleId: fixture.cars[0]._id } });
            if (mutation === 'cancelled') await Sale.updateOne({ _id: f.sale._id }, { $set: { status: 'cancelada' } });
            if (mutation === 'revoked') await BuyerPortal.updateOne({ _id: f.sale._id }, { $set: { enabled: false } });
            // A reassigned operation must also deny metadata retrieval; a worker
            // still skips it safely using only its persisted event reference.
            await Notification.updateOne({ proofId: result.body.proof.id }, { $set: { nextAttemptAt: new Date(0) } });
            await notifications.retryPendingBuyerPaymentNotifications();
            assert.equal((await eventFor(result.body.proof.id)).state, 'skipped'); assert.equal(mails.length, before);
            process.env.SECURITY_ALERT_EMAIL = adminEmail;
        }
    });
    await test('a corrected file creates a new version notice without re-sending its earlier upload or creating a collection', async () => {
        const f = await create(), before = mails.length, moneyBefore = await Transaction.countDocuments();
        const first = await upload(f); assert.equal(first.status, 200);
        await proofs.reviewPaymentProof(admin, first.body.proof.id, { action: 'correction', comment: 'Enviá la imagen completa.' });
        const replacement = await upload(f, { replacesId: first.body.proof.id, buffer: pdf }); assert.equal(replacement.status, 200);
        assert.equal(replacement.body.proof.version, 2); assert.equal(mails.length, before + 2); assert.match(mails.at(-1).html, /Versión 2/);
        assert.equal(await Notification.countDocuments({ saleId: f.sale._id }), 2); assert.equal(await Transaction.countDocuments(), moneyBefore);
        await notifications.retryBuyerPaymentNotification(admin, first.body.proof.id); assert.equal(mails.length, before + 2);
    });
    await test('failed deliveries stop at three attempts and an interrupted worker becomes uncertain instead of duplicating mail', async () => {
        const f = await create(); failure = 'known'; const result = await upload(f);
        await notifications.retryBuyerPaymentNotification(admin, result.body.proof.id); await notifications.retryBuyerPaymentNotification(admin, result.body.proof.id);
        await assert.rejects(notifications.retryBuyerPaymentNotification(admin, result.body.proof.id), error => error.status === 409);
        assert.equal((await notifications.getBuyerPaymentNotification(admin, result.body.proof.id)).retryable, false);
        failure = ''; const g = await create(), sent = await upload(g), before = attempts.length;
        await Notification.updateOne({ proofId: sent.body.proof.id }, { $set: { state: 'sending', claimedAt: new Date(Date.now() - 180000) } });
        const interrupted = await notifications.getBuyerPaymentNotification(admin, sent.body.proof.id); assert.equal(interrupted.reason, 'delivery_uncertain');
        await notifications.retryPendingBuyerPaymentNotifications(); assert.equal(attempts.length, before);
    });
    console.log(`PASS: ${passed} payment upload email scenarios; no production access or real emails.`);
} finally { await env.stop(); }
