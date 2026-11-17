// Disposable loopback database and fake mailbox. Never sends a real email.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica({ listen: false });
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { createBuyerPortalIndexes, configurePortal, revokePortal } = await import('../../src/services/buyerPortalService.js');
    const service = await import('../../src/services/gestoriaStatusService.js');
    const { default: Notification } = await import('../../src/models/GestoriaStatusNotification.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const fixture = await seedMobileCrm(env.models);
    await createBuyerPortalIndexes();
    await Notification.createCollection();
    await Notification.createIndexes();
    const admin = { id: String(fixture.users[0]._id), name: fixture.users[0].name, role: 'owner' };
    const readOnly = { id: String(fixture.users[3]._id), name: fixture.users[3].name, role: 'solo_lectura' };
    const mails = [];
    const calls = [];
    let mailFailure = null;
    EmailAdapter.sendEmail = async (to, subject, html, attachments, options, messageOptions = {}) => {
        assert.match(to, /@example\.test$/, 'the fake transport refuses non-fixture recipients');
        calls.push({ to, subject });
        if (mailFailure) throw mailFailure;
        mails.push({ to, subject, html, text: messageOptions.text || '', attachments, options });
        return { accepted: [to], rejected: [], messageId: crypto.randomUUID() };
    };
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const latest = f => Notification.findOne({ tramiteId: f.tramite._id }).sort({ revision: -1 }).lean();
    const update = (f, input, user = admin) => service.updateGestoria(user, String(f.tramite._id), input);
    const makeFixture = async ({ portal = true, linkedSale = true, email = crypto.randomUUID() + '@example.test', clientStatus = 'activo' } = {}) => {
        const buyer = await env.models.Client.create({ fullName: 'Comprador ficticio de aviso', email, status: clientStatus });
        const seller = await env.models.Client.create({ fullName: 'Vendedor ficticio de aviso', email: crypto.randomUUID() + '@example.test', status: 'activo' });
        const sale = linkedSale ? await env.models.Sale.create({ clientId: buyer._id, vehicleId: fixture.cars[4]._id,
            status: 'confirmada', salePrice: 25000000, saleCurrency: 'ARS', assignedTo: fixture.users[1]._id }) : null;
        const tramite = await env.models.Gestoria.create({ title: 'TÍTULO INTERNO SECRETO', type: 'Transferencia Egreso',
            saleId: sale?._id, clientId: buyer._id, sellerId: seller._id, vehicleId: fixture.cars[4]._id,
            status: 'Pendiente', notes: 'NOTA INTERNA SECRETA', cost: 871234567890, chargedAmount: 991234567890 });
        const configuration = portal && sale && email && clientStatus === 'activo' ? await configurePortal(admin, String(sale._id), { days: 30 }) : null;
        return { buyer, seller, sale, tramite, configuration };
    };
    const failedFixture = async () => {
        const f = await makeFixture();
        mailFailure = Object.assign(new Error('Proveedor ficticio rechazó el envío'), { responseCode: 550 });
        await update(f, { status: 'Documentación' });
        mailFailure = null;
        const event = await latest(f);
        assert.equal(event.state, 'failed');
        return { ...f, event };
    };

    await test('a real transition sends one safe customer notice with the current state and existing private link', async () => {
        const f = await makeFixture();
        // The sale is authoritative even when the procedure's separate contact is stale.
        await env.models.Gestoria.updateOne({ _id: f.tramite._id }, { $set: { clientId: f.seller._id } });
        const before = mails.length;
        const result = await update(f, { status: 'Documentación' });
        assert.equal(result.tramite.status, 'Documentación');
        assert.equal(result.notification.status, 'sent');
        assert.equal(mails.length, before + 1);
        const mail = mails.at(-1);
        assert.equal(mail.to, f.buyer.email);
        assert.notEqual(mail.to, f.seller.email);
        assert.notEqual(mail.to, process.env.SECURITY_ALERT_EMAIL);
        assert.match(mail.subject, /AutoSporting/);
        assert.match(mail.subject, /documentación de tu vehículo/);
        assert.match(mail.html, /Documentación/);
        assert.match(mail.html, /Documentación de tu vehículo/);
        assert.doesNotMatch(mail.html + mail.text, /Transferencia Egreso/);
        assert.match(mail.html, /Duster/);
        assert.ok(mail.html.includes(f.configuration.url), 'the notice includes only the existing portal link');
        assert.match(mail.html, /argentina/i);
        assert.ok(mail.text.length > 0, 'plain text is provided alongside HTML');
        assert.doesNotMatch(mail.html + mail.text, /NOTA INTERNA SECRETA|TÍTULO INTERNO SECRETO|871234567890|991234567890|código de 6/i);
        const saved = await env.models.Gestoria.findById(f.tramite._id).lean();
        assert.equal(saved.auditLog.filter(item => item.action === 'CAMBIO_ESTADO').length, 1);
    });
    await test('unchanged saves do not resend, and concurrent identical updates create one transition and one notice', async () => {
        const f = await makeFixture();
        const before = mails.length;
        await update(f, { status: 'Pendiente', notes: 'Otra nota interna privada' });
        assert.equal(mails.length, before);
        assert.equal(await Notification.countDocuments({ tramiteId: f.tramite._id }), 0);
        const replies = await Promise.allSettled([update(f, { status: 'Presentado' }), update(f, { status: 'Presentado' })]);
        assert.ok(replies.some(item => item.status === 'fulfilled'));
        for (const reply of replies) if (reply.status === 'rejected') assert.equal(reply.reason.status, 409);
        assert.equal(mails.length, before + 1);
        assert.equal(await Notification.countDocuments({ tramiteId: f.tramite._id }), 1);
        const saved = await env.models.Gestoria.findById(f.tramite._id).lean();
        assert.equal(saved.auditLog.filter(item => item.action === 'CAMBIO_ESTADO').length, 1);
        await update(f, { status: 'Presentado', notes: 'La nota puede editarse sin avisar de nuevo' });
        assert.equal(mails.length, before + 1);
    });
    await test('later distinct transitions, including returning to an earlier state, notify once each and stay scoped by procedure', async () => {
        const f = await makeFixture(), other = await makeFixture();
        const before = mails.length;
        for (const status of ['Documentación', 'Presentado', 'Documentación']) await update(f, { status });
        await update(other, { status: 'Documentación' });
        assert.equal(mails.length, before + 4);
        assert.equal(await Notification.countDocuments({ tramiteId: f.tramite._id }), 3);
        assert.equal(await Notification.countDocuments({ tramiteId: other.tramite._id }), 1);
        assert.equal(mails.at(-1).to, other.buyer.email);
    });
    await test('invalid or unauthorized changes neither persist nor send', async () => {
        const f = await makeFixture(), before = mails.length;
        await assert.rejects(update(f, { status: 'Finalizado' }, readOnly), error => error.status === 403);
        await assert.rejects(update(f, { status: 'Estado inventado', notes: 'No guardar esto' }));
        assert.equal((await env.models.Gestoria.findById(f.tramite._id).lean()).status, 'Pendiente');
        assert.equal(mails.length, before);
        assert.equal(await Notification.countDocuments({ tramiteId: f.tramite._id }), 0);
    });
    await test('invalid or inactive buyers and cancelled or missing sales are saved with an explicit skipped notice', async () => {
        const fixtures = [await makeFixture({ portal: false, email: undefined }), await makeFixture({ portal: false, clientStatus: 'bloqueado' }),
            await makeFixture(), await makeFixture(), await makeFixture({ portal: false, clientStatus: 'inactivo' }),
            await makeFixture({ portal: false, email: 'comprador@example.test\r\nBcc: externo@example.test' })];
        // Explicitly remove the address: undefined triggers the factory's safe fake default.
        await env.models.Client.updateOne({ _id: fixtures[0].buyer._id }, { $unset: { email: '' } });
        await env.models.Sale.updateOne({ _id: fixtures[2].sale._id }, { $set: { status: 'cancelada' } });
        await env.models.Sale.deleteOne({ _id: fixtures[3].sale._id });
        const before = mails.length;
        for (const f of fixtures) {
            const result = await update(f, { status: 'Observado' });
            assert.equal(result.tramite.status, 'Observado');
            assert.equal(result.notification.status, 'skipped');
            assert.ok(result.notification.reason);
        }
        assert.equal(mails.length, before);
    });
    await test('a missing portal never creates an access link, and a standalone procedure only uses its explicit buyer', async () => {
        const f = await makeFixture({ portal: false }), standalone = await makeFixture({ linkedSale: false });
        for (const item of [f, standalone]) {
            const before = mails.length;
            const result = await update(item, { status: 'Finalizado' });
            assert.equal(result.notification.status, 'sent');
            assert.equal(mails.length, before + 1);
            assert.equal(mails.at(-1).to, item.buyer.email);
            assert.doesNotMatch(mails.at(-1).html + mails.at(-1).text, /\/portal\//);
        }
        assert.equal(await env.models.BuyerPortal.countDocuments({ _id: f.sale._id }), 0);
    });
    await test('known delivery failure keeps the state, and concurrent retries send one notification without modifying it again', async () => {
        const f = await failedFixture();
        assert.equal((await env.models.Gestoria.findById(f.tramite._id).lean()).status, 'Documentación');
        const before = mails.length;
        await update(f, { status: 'Documentación', notes: 'No reintentar silenciosamente al guardar' });
        assert.equal(mails.length, before);
        const retries = await Promise.allSettled([1, 2].map(() => service.retryGestoriaNotification(admin, String(f.tramite._id), String(f.event._id))));
        assert.ok(retries.some(item => item.status === 'fulfilled'));
        assert.equal(mails.length, before + 1);
        assert.equal((await latest(f)).state, 'sent');
        assert.equal((await env.models.Gestoria.findById(f.tramite._id).lean()).auditLog.filter(item => item.action === 'CAMBIO_ESTADO').length, 1);
        await service.retryGestoriaNotification(admin, String(f.tramite._id), String(f.event._id));
        assert.equal(mails.length, before + 1);
    });
    await test('queued retries do not send to a replaced buyer, changed email or changed portal generation', async () => {
        const changedBuyer = await failedFixture(), changedEmail = await failedFixture(), changedPortal = await failedFixture();
        const replacement = await env.models.Client.create({ fullName: 'Reemplazo ficticio', email: crypto.randomUUID() + '@example.test', status: 'activo' });
        await env.models.Sale.updateOne({ _id: changedBuyer.sale._id }, { $set: { clientId: replacement._id } });
        await env.models.Client.updateOne({ _id: changedEmail.buyer._id }, { $set: { email: crypto.randomUUID() + '@example.test' } });
        await configurePortal(admin, String(changedPortal.sale._id), { days: 30 });
        const before = mails.length;
        for (const f of [changedBuyer, changedEmail, changedPortal]) {
            const result = await service.retryGestoriaNotification(admin, String(f.tramite._id), String(f.event._id));
            assert.equal(result.status, 'skipped');
        }
        assert.equal(mails.length, before);
    });
    await test('a failed old revision is not announced after the procedure has moved on', async () => {
        const f = await failedFixture();
        await update(f, { status: 'Presentado' });
        const before = mails.length;
        const stale = await service.retryGestoriaNotification(admin, String(f.tramite._id), String(f.event._id));
        assert.equal(stale.status, 'skipped');
        assert.equal(mails.length, before);
        assert.equal((await env.models.Gestoria.findById(f.tramite._id).lean()).status, 'Presentado');
    });
    await test('a queued procedure notice remains bound to the purchased vehicle at the actual transition', async () => {
        const f = await failedFixture();
        assert.equal(String(f.event.vehicleId), String(f.sale.vehicleId));
        await env.models.Sale.updateOne({ _id: f.sale._id }, { $set: { vehicleId: fixture.cars[0]._id } });
        const before = mails.length;
        const stale = await service.retryGestoriaNotification(admin, String(f.tramite._id), String(f.event._id));
        assert.equal(stale.status, 'skipped'); assert.equal(stale.reason, 'vehicle_changed');
        assert.equal(mails.length, before);
        const current = await update(f, { status: 'Presentado' });
        assert.equal(current.notification.status, 'sent'); assert.ok(mails.at(-1).html.includes(fixture.cars[0].name));
    });
    await test('a lost SMTP acknowledgement after DATA is uncertain and never blindly re-sent', async () => {
        for (const failure of [{ code: 'ECONNECTION', command: 'DATA' }, { code: 'ECONNECTION' }, { code: 'EMESSAGE', command: 'DATA' }, { code: 'ESMTP', command: 'QUIT', responseCode: 550 }]) {
            const f = await makeFixture();
            mailFailure = Object.assign(new Error('Provider fixture result unknown'), failure);
            const result = await update(f, { status: 'Documentación' }); mailFailure = null;
            assert.equal(result.notification.reason, 'delivery_uncertain'); assert.equal(result.notification.retryable, false);
            const event = await latest(f), before = calls.length;
            await assert.rejects(service.retryGestoriaNotification(admin, String(f.tramite._id), String(event._id)), error => error.status === 409);
            assert.equal(calls.length, before);
        }
    });
    await test('scheduled retries respect delivery claims and revoked links, with minimal expiring outbox data', async () => {
        const failed = await failedFixture(), revoked = await failedFixture(), inFlight = await failedFixture();
        await revokePortal(admin, String(revoked.sale._id));
        await Notification.updateMany({ _id: { $in: [failed.event._id, revoked.event._id] } }, { $set: { nextAttemptAt: new Date(0) } });
        await Notification.updateOne({ _id: inFlight.event._id }, { $set: { state: 'sending', claimedAt: new Date(Date.now() - 600000), nextAttemptAt: new Date(0) } });
        const before = mails.length;
        await service.processPendingGestoriaNotifications({ limit: 20 });
        assert.equal(mails.length, before + 1, 'only a known failed send may be retried automatically');
        assert.equal((await latest(failed)).state, 'sent');
        assert.equal((await latest(revoked)).state, 'skipped');
        assert.notEqual((await latest(inFlight)).state, 'sent', 'an ambiguous old claim cannot be blindly resent');
        const record = await latest(failed);
        assert.ok(record.expiresAt > new Date());
        assert.ok(record.expiresAt.getTime() <= Date.now() + 31 * 86400000);
        const stored = JSON.stringify(record);
        assert.ok(!stored.includes(failed.buyer.email));
        assert.ok(!stored.includes(failed.configuration.url));
        assert.doesNotMatch(stored, /NOTA INTERNA SECRETA|TÍTULO INTERNO SECRETO|<html|<div/);
        const indexes = await Notification.collection.indexes();
        assert.ok(indexes.some(index => index.unique && index.key.tramiteId === 1 && index.key.revision === 1));
        assert.ok(indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0));
    });
    await test('a committed but unsent notification can be recovered explicitly without changing the procedure again', async () => {
        const f = await failedFixture();
        await Notification.updateOne({ _id: f.event._id }, { $set: { state: 'pending', attempts: 0 }, $unset: { reason: '', claimedAt: '', claimId: '' } });
        const notice = await service.getGestoriaNotification(admin, String(f.tramite._id));
        assert.equal(notice.status, 'pending');
        assert.equal(notice.retryable, true);
        const before = mails.length;
        const recovered = await service.retryGestoriaNotification(admin, String(f.tramite._id), String(f.event._id));
        assert.equal(recovered.status, 'sent');
        assert.equal(mails.length, before + 1);
        assert.equal((await env.models.Gestoria.findById(f.tramite._id).lean()).statusRevision, 1);
    });
    console.log(`PASS: ${passed} isolated procedure status email scenarios; ${calls.length} fake provider attempts.`);
} finally { await env.stop(); }
