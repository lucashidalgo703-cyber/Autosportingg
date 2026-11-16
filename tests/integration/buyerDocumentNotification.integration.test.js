// Disposable database and fake email adapter only; no production email is sent.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    process.env.NEXT_PUBLIC_BASE_URL = env.base;
    const adminEmail = process.env.SECURITY_ALERT_EMAIL;
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const portal = await import('../../src/services/buyerPortalService.js');
    const notifications = await import('../../src/services/buyerDocumentNotificationService.js');
    const { default: Notification } = await import('../../src/models/BuyerDocumentNotification.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const fixture = await seedMobileCrm(env.models);
    await portal.createBuyerPortalIndexes();
    await notifications.createBuyerDocumentNotificationIndexes();
    const admin = { id: String(fixture.users[0]._id), name: fixture.users[0].name, role: 'admin' };
    const mails = [];
    const attempts = [];
    let failAdminMail = false;
    EmailAdapter.sendEmail = async (to, subject, html, attachments = [], options = {}, messageOptions = {}) => {
        assert.match(to, /@example\.test$/, 'all recipients must be disposable test addresses');
        attempts.push({ to, subject });
        if (failAdminMail && to === process.env.SECURITY_ALERT_EMAIL) throw Object.assign(new Error('Fake SMTP rejection'), { responseCode: 550 });
        mails.push({ to, subject, html, attachments, options, ...messageOptions });
        return { accepted: [to], rejected: [], messageId: crypto.randomUUID() };
    };
    const notices = () => mails.filter(mail => mail.to === adminEmail && /documentación/i.test(mail.subject));
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const pdf = Buffer.from('%PDF-1.4\n% disposable document fixture\n%%EOF');
    const makeFixture = async () => {
        const buyer = await env.models.Client.create({ fullName: 'Comprador ficticio de documentación',
            email: crypto.randomUUID() + '@example.test', status: 'activo' });
        const sale = await env.models.Sale.create({ vehicleId: fixture.cars[4]._id, clientId: buyer._id,
            salePrice: 25000000, saleCurrency: 'ARS', status: 'confirmada', assignedTo: fixture.users[1]._id,
            notes: 'NOTA INTERNA SECRETA', tradeIns: [{ brand: 'Toyota', model: 'Etios ficticio', year: 2015,
                plate: 'QA123AA', estimatedValue: 6000000, currency: 'ARS', shouldEnterStock: false }] });
        await env.models.Gestoria.create({ title: 'TÍTULO INTERNO SECRETO', type: 'Transferencia Egreso',
            saleId: sale._id, clientId: buyer._id, status: 'Presentado', notes: 'GESTOR INTERNO SECRETO' });
        const configuration = await portal.configurePortal(admin, String(sale._id), { days: 30 });
        const token = configuration.url.split('/').at(-1);
        const challenge = await portal.sendBuyerChallenge(token, crypto.randomUUID());
        const code = mails.filter(mail => mail.to === buyer.email).at(-1).html.match(/>\s*(\d{6})\s*</)[1];
        const verified = await portal.verifyBuyerChallenge(token, { challengeId: challenge.challengeId, code }, crypto.randomUUID());
        const context = await portal.buyerSession(token, verified.sessionToken);
        return { buyer, sale, token, configuration, context, sessionToken: verified.sessionToken,
            tradeInId: String(sale.tradeIns[0]._id) };
    };
    const input = (f, overrides = {}) => ({ tradeInId: f.tradeInId, requirementKey: 'title', slot: 'title-page-1',
        side: 'page', requestId: crypto.randomUUID(), ...overrides });
    const file = (buffer = photo) => ({ buffer, originalname: buffer === pdf ? 'ficticio.pdf' : 'ficticia.jpg' });
    const upload = (f, overrides = {}, buffer = photo) => portal.uploadBuyerDocument(f.context, input(f, overrides), file(buffer));
    const eventFor = id => Notification.findOne({ documentId: id }).lean();
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const postFile = async (f, sessionToken, overrides = {}, buffer = photo) => {
        const data = new FormData();
        for (const [key, value] of Object.entries(input(f, overrides))) data.set(key, value);
        data.set('file', new Blob([buffer], { type: buffer === pdf ? 'application/pdf' : 'image/jpeg' }), buffer === pdf ? 'ficticio.pdf' : 'ficticia.jpg');
        const response = await fetch(env.base + '/api/buyer-portal/' + f.token + '/documents', { method: 'POST',
            headers: sessionToken ? { Authorization: 'Bearer ' + sessionToken } : {}, body: data });
        return { status: response.status, body: await response.json() };
    };

    await test('unverified, wrong-session and invalid-file uploads never create an administrator notice', async () => {
        const f = await makeFixture(), other = await makeFixture();
        const before = notices().length;
        assert.equal((await postFile(f, '')).status, 401);
        assert.equal((await postFile(f, other.sessionToken)).status, 401);
        assert.equal((await postFile(f, f.sessionToken, {}, Buffer.from('<svg onload="alert(1)">'))).status, 400);
        assert.equal(await env.models.BuyerPortalDocument.countDocuments({ saleId: f.sale._id }), 0);
        assert.equal(await Notification.countDocuments({ saleId: f.sale._id }), 0);
        assert.equal(notices().length, before);
    });
    await test('each committed photo and complete PDF sends one private review link only to the configured administrator', async () => {
        const f = await makeFixture();
        const before = notices().length;
        const image = await postFile(f, f.sessionToken); assert.equal(image.status, 200);
        const document = await postFile(f, f.sessionToken, { requirementKey: 'domain_report', slot: 'domain-pdf-1', side: 'other' }, pdf);
        assert.equal(document.status, 200);
        assert.equal(notices().length, before + 2);
        for (const mail of notices().slice(before)) {
            assert.equal(mail.to, adminEmail);
            assert.notEqual(mail.to, f.buyer.email);
            assert.equal(mail.attachments.length, 0);
            assert.match(mail.html, /Comprador ficticio de documentación/);
            assert.match(mail.html, /argentina/i);
            const link = mail.html.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&');
            assert.equal(link, env.base + '/admin/gestoria?documentos=' + f.sale._id);
            assert.doesNotMatch(mail.html + (mail.text || ''), /\/portal\/|\?access=|NOTA INTERNA SECRETA|GESTOR INTERNO SECRETO|código de 6|encryptedFile/);
            assert.match(mail.messageId || '', /^<autosporting-/);
        }
        const record = await eventFor(image.body.entry.id);
        assert.equal(record.state, 'sent');
        const serialized = JSON.stringify(record);
        assert.ok(!serialized.includes(adminEmail));
        assert.ok(!serialized.includes(f.buyer.email));
        assert.ok(!serialized.includes(f.configuration.url));
        assert.doesNotMatch(serialized, /<div|encryptedFile|data:application/);
        const anonymous = await env.call('GET', '/api/admin/buyer-portal/documents?saleId=' + f.sale._id);
        assert.equal(anonymous.status, 401);
    });
    await test('concurrent retries of one upload create one file and one administrator email; a replacement is a new notice', async () => {
        const f = await makeFixture(), request = input(f);
        const before = notices().length;
        const results = await Promise.all([1, 2].map(() => portal.uploadBuyerDocument(f.context, request, file())));
        assert.equal(results[0].entry.id, results[1].entry.id);
        assert.equal(await Notification.countDocuments({ documentId: results[0].entry.id }), 1);
        assert.equal(notices().length, before + 1);
        await portal.uploadBuyerDocument(f.context, request, file());
        assert.equal(notices().length, before + 1);
        const replacement = await upload(f, { replacesId: results[0].entry.id });
        assert.equal(replacement.entry.version, 2);
        assert.equal(notices().length, before + 2);
        assert.equal((await eventFor(replacement.entry.id)).state, 'sent');
    });
    await test('an aborted upload transaction cannot leave a file, email event or administrator email', async () => {
        const f = await makeFixture(), before = notices().length;
        await env.models.Sale.updateOne({ _id: f.sale._id }, { $set: { status: 'cancelada' } });
        await assert.rejects(upload(f), error => error.status === 401);
        assert.equal(await env.models.BuyerPortalDocument.countDocuments({ saleId: f.sale._id }), 0);
        assert.equal(await Notification.countDocuments({ saleId: f.sale._id }), 0);
        assert.equal(notices().length, before);
    });
    await test('missing or invalid administrator addresses never fall back to a buyer or employee and do not lose the uploaded file', async () => {
        const f = await makeFixture(), before = mails.length;
        try {
            for (const [index, address] of ['', 'invalid-address', 'one@example.test,two@example.test'].entries()) {
                process.env.SECURITY_ALERT_EMAIL = address;
                const result = await upload(f, { slot: 'title-page-' + (index + 1) });
                assert.ok(result.entry.id);
                assert.equal((await eventFor(result.entry.id)).state, 'skipped');
            }
        } finally { process.env.SECURITY_ALERT_EMAIL = adminEmail; }
        assert.equal(mails.length, before);
        assert.equal(await env.models.BuyerPortalDocument.countDocuments({ saleId: f.sale._id }), 3);
    });
    const failedUpload = async () => {
        const f = await makeFixture();
        failAdminMail = true;
        let result;
        try { result = await upload(f); } finally { failAdminMail = false; }
        const event = await eventFor(result.entry.id);
        assert.equal(event.state, 'failed');
        return { ...f, result, event };
    };
    await test('a confirmed mail failure preserves the file and safe parallel retry sends only one notification', async () => {
        const f = await failedUpload();
        assert.ok(await env.models.BuyerPortalDocument.findById(f.result.entry.id));
        const before = notices().length;
        await Promise.all([1, 2].map(() => notifications.retryBuyerDocumentNotification(admin, f.result.entry.id)));
        assert.equal(notices().length, before + 1);
        assert.equal((await eventFor(f.result.entry.id)).state, 'sent');
        await notifications.retryBuyerDocumentNotification(admin, f.result.entry.id);
        assert.equal(notices().length, before + 1);
    });
    await test('queued notices are not misdirected after the administrator, purchaser or portal generation changes', async () => {
        const adminChanged = await failedUpload();
        const before = mails.length;
        try {
            process.env.SECURITY_ALERT_EMAIL = 'otro.administrador@example.test';
            await notifications.retryBuyerDocumentNotification(admin, adminChanged.result.entry.id);
        } finally { process.env.SECURITY_ALERT_EMAIL = adminEmail; }
        assert.equal((await eventFor(adminChanged.result.entry.id)).state, 'skipped');
        assert.equal(mails.length, before);
        for (const change of ['buyer', 'email', 'generation']) {
            const f = await failedUpload();
            if (change === 'buyer') {
                const replacement = await env.models.Client.create({ fullName: 'Otro comprador ficticio', email: crypto.randomUUID() + '@example.test', status: 'activo' });
                await env.models.Sale.updateOne({ _id: f.sale._id }, { $set: { clientId: replacement._id } });
            } else if (change === 'email') await env.models.Client.updateOne({ _id: f.buyer._id }, { $set: { email: crypto.randomUUID() + '@example.test' } });
            else await portal.configurePortal(admin, String(f.sale._id), { days: 30 });
            const count = mails.length;
            await notifications.retryBuyerDocumentNotification(admin, f.result.entry.id);
            assert.equal((await eventFor(f.result.entry.id)).state, 'skipped');
            assert.equal(mails.length, count);
        }
    });
    await test('unknown provider results are not blindly resent and notification records have unique expiring storage', async () => {
        const f = await failedUpload();
        await Notification.updateOne({ _id: f.event._id }, { $set: { state: 'sending', claimedAt: new Date(Date.now() - 600000) } });
        const before = mails.length;
        const notice = await notifications.getBuyerDocumentNotification(admin, f.result.entry.id);
        assert.equal(notice.retryable, false);
        await assert.rejects(notifications.retryBuyerDocumentNotification(admin, f.result.entry.id), error => error.status === 409);
        assert.equal(mails.length, before);
        const indexes = await Notification.collection.indexes();
        assert.ok(indexes.some(index => index.unique && index.key.documentId === 1));
        assert.ok(indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0));
        assert.ok(f.event.expiresAt.getTime() <= Date.now() + 31 * 86400000);
    });
    console.log(`PASS: ${passed} administrator document-upload notification scenarios; ${attempts.length} fake email attempts.`);
} finally { await env.stop(); }
