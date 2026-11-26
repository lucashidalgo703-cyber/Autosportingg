// Disposable MongoDB and a simulated email adapter; no real mailboxes or SMTP.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica(), originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Only the disposable loopback server may be contacted');
    return originalFetch(input, options);
};
let passed = 0;
try {
    const { createLoginSession } = await import('../../src/services/authSessionService.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const passwordHash = () => {
        const salt = crypto.randomBytes(16).toString('hex');
        return `${salt}:${crypto.scryptSync(crypto.randomBytes(32), salt, 64).toString('hex')}`;
    };
    const users = await env.models.AdminUser.create(['owner', 'owner', 'admin', 'ventas', 'solo_lectura'].map((role, index) => ({
        name: `Notificaciones fallas QA ${index}`, email: `fallas-notificacion-${index}@example.test`, role,
        passwordHash: passwordHash(), permissions: []
    })));
    const sessions = await Promise.all(users.map(user => createLoginSession(user)));
    const owner = 0, secondOwner = 1, admin = 2, seller = 3, reader = 4;
    const endpoint = '/api/admin/issue-reports', recipient = process.env.SECURITY_ALERT_EMAIL;
    process.env.NEXT_PUBLIC_BASE_URL = env.base;
    const attempts = [], accepted = [];
    let failure = '';
    EmailAdapter.sendEmail = async (to, subject, html, attachments = [], options = {}, messageOptions = {}) => {
        assert.match(String(to), /^[^\s@]+@example\.test$/, 'never send an email to a real mailbox');
        attempts.push({ to, subject, messageId: messageOptions.messageId });
        if (failure === 'known') throw Object.assign(new Error('Fictional SMTP rejection'), { responseCode: 550 });
        if (failure === 'after-data') throw Object.assign(new Error('Fictional acknowledgement lost after DATA'), { code: 'ECONNECTION', command: 'DATA' });
        if (failure === 'unknown') throw new Error('Fictional uncertain provider result');
        if (failure === 'not-accepted') return { accepted: [], rejected: [to] };
        accepted.push({ to, subject, html, attachments, options, ...messageOptions });
        return { accepted: [to], rejected: [], messageId: messageOptions.messageId || crypto.randomUUID() };
    };
    const api = (index, method, route, body) => env.call(method, route, body, sessions[index].token);
    const check = (response, status, context = '') => assert.equal(response.status, status, `${context} ${JSON.stringify(response.json)}`);
    const reportOf = response => response.json.report || response.json;
    const idOf = report => String(report._id || report.id);
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
    const base = { title: 'No se guarda el formulario QA', description: 'Al guardar datos ficticios aparece un error.', category: 'bug',
        priority: 'high', module: 'Stock', steps: 'Abrir y guardar una unidad ficticia.', pageUrl: '/admin/stock?token=TOKEN_PRIVADO_QA#fragmento' };
    const create = async (input = {}, index = seller) => {
        const response = await api(index, 'POST', endpoint, { ...base, ...input }); check(response, 201);
        return reportOf(response);
    };
    const detail = async (report, index = owner) => {
        const response = await api(index, 'GET', `${endpoint}/${idOf(report)}`); check(response, 200);
        return reportOf(response);
    };
    const retry = (report, index = owner) => api(index, 'POST', `${endpoint}/${idOf(report)}/email/retry`, {});
    const stored = report => env.models.IssueReport.findById(idOf(report)).lean();
    const notices = async (index = owner) => {
        const response = await api(index, 'GET', '/api/admin/notifications'); check(response, 200);
        assert.ok(Array.isArray(response.json));
        return response.json.filter(item => item.type === 'issue_report_created');
    };
    const privateMetadataAbsent = value => assert.doesNotMatch(JSON.stringify(value), /recipientHash|recipientEmail|"recipient"\s*:|claimId|claimedAt|nextAttemptAt|TOKEN_PRIVADO_QA|passwordHash/);
    let first;

    await test('new reports persist and send exactly one accepted notice to the configured administrator', async () => {
        const before = accepted.length;
        first = await create({ emailNotification: { status: 'sent', recipient: 'attacker@example.test' } });
        assert.equal(accepted.length, before + 1); assert.equal(accepted.at(-1).to, recipient);
        assert.equal(first.emailNotification, undefined, 'ordinary authors do not see operational email metadata');
        const saved = await detail(first); assert.equal(saved.emailNotification.status, 'sent');
        assert.equal(saved.emailNotification.attempts, 1); assert.equal(saved.emailNotification.retryable, false);
        assert.ok(saved.emailNotification.sentAt); assert.ok(await stored(first)); privateMetadataAbsent(saved);
        assert.ok(accepted.at(-1).messageId, 'the notice needs a deterministic message id');
    });
    await test('mail content escapes user text and links to the exact report behind CRM login without files or secrets', async () => {
        const report = await create({ title: 'Falla <img src=x onerror=alert(1)> & "QA"', description: 'Descripción <script>QA</script> & prueba.' });
        const mail = accepted.at(-1); assert.equal(mail.to, recipient); assert.equal(mail.attachments.length, 0);
        assert.match(mail.html, /&lt;img/); assert.doesNotMatch(mail.html, /<img src=x|<script>QA/);
        assert.doesNotMatch(mail.subject, /[\r\n]/); assert.match(mail.html, /&lt;script&gt;QA&lt;\/script&gt;/);
        const expected = env.base + '/admin/reportar-problema?reportId=' + idOf(report);
        const links = [...mail.html.matchAll(/href="([^"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'));
        assert.ok(links.includes(expected), JSON.stringify(links));
        assert.doesNotMatch(mail.html + (mail.text || ''), /TOKEN_PRIVADO_QA|Bearer |access=|attachments\/|"type":"Buffer"/);
        const unauthenticated = await env.call('GET', `${endpoint}/${idOf(report)}`); check(unauthenticated, 401);
    });
    await test('only owners receive CRM notifications and read state is durable and isolated per owner', async () => {
        const all = await notices(), notice = all.find(item => String(item.entityId) === idOf(first));
        assert.ok(notice); assert.equal(notice.module, 'fallas'); assert.equal(notice.read, false);
        assert.equal(notice.href, '/admin/reportar-problema?reportId=' + idOf(first));
        assert.equal(new Date(notice.dueDate).getTime(), new Date(first.createdAt).getTime());
        assert.equal(all.filter(item => String(item.entityId) === idOf(first)).length, 1);
        const again = (await notices()).find(item => String(item.entityId) === idOf(first)); assert.equal(again.id, notice.id);
        for (const index of [admin, seller, reader]) assert.equal((await notices(index)).length, 0);
        check(await api(owner, 'PATCH', '/api/admin/notifications/' + encodeURIComponent(notice.id) + '/read', {}), 200);
        assert.equal((await notices()).find(item => item.id === notice.id).read, true);
        assert.equal((await notices(secondOwner)).find(item => item.id === notice.id).read, false);
        const unread = (await notices()).filter(item => !item.read);
        check(await api(owner, 'PATCH', '/api/admin/notifications/read-all', { keys: unread.map(item => item.id) }), 200);
        assert.ok((await notices()).every(item => item.read));
        assert.ok((await notices(secondOwner)).every(item => !item.read));
    });
    await test('listing, reopening, editing status, and refreshing notifications never send a second email', async () => {
        const before = attempts.length;
        for (const index of [owner, admin, seller]) {
            check(await api(index, 'GET', endpoint), 200); await detail(first, index); await notices(index);
        }
        check(await api(admin, 'PATCH', `${endpoint}/${idOf(first)}`, { status: 'in_review', commentText: 'Revisamos el caso ficticio QA.' }), 200);
        await detail(first); await notices();
        assert.equal(attempts.length, before);
        const after = await detail(first); assert.equal(after.status, 'in_review'); assert.equal(after.emailNotification.status, 'sent');
        const same = (await notices()).find(item => String(item.entityId) === idOf(first));
        assert.equal(same.read, true, 'changing the report must not reset its stable notification key');
    });
    await test('an unread new issue remains visible when more than one hundred other notifications have later dates', async () => {
        const report = await create({ title: 'No ocultar nueva falla QA' });
        const dueDate = new Date(); dueDate.setHours(23, 59, 59, 999);
        const tasks = await env.models.CrmTask.insertMany(Array.from({ length: 101 }, (_, index) => ({
            title: `Tarea ficticia para límite de notificaciones QA ${index}`, dueDate, status: 'pendiente', assignedTo: users[owner]._id
        })));
        try {
            const response = await api(owner, 'GET', '/api/admin/notifications'); check(response, 200);
            assert.equal(response.json.length, 100);
            assert.ok(response.json.some(item => item.type === 'issue_report_created' && String(item.entityId) === idOf(report) && !item.read));
        } finally { await env.models.CrmTask.deleteMany({ _id: { $in: tasks.map(task => task._id) } }); }
    });
    await test('a confirmed SMTP rejection preserves HTTP 201, the report and the owner notification', async () => {
        failure = 'known'; const before = accepted.length, beforeAttempts = attempts.length;
        const report = await create({ title: 'Rechazo SMTP ficticio QA' }); failure = '';
        const reloaded = await detail(report); assert.equal(reloaded.emailNotification.status, 'failed');
        assert.equal(reloaded.emailNotification.retryable, true); assert.equal(reloaded.emailNotification.attempts, 1);
        assert.equal(accepted.length, before); assert.ok(await stored(report));
        assert.ok((await notices()).some(item => String(item.entityId) === idOf(report)));
        for (const index of [admin, seller, reader]) check(await retry(report, index), 403);
        const results = await Promise.all([retry(report), retry(report)]);
        assert.ok(results.some(result => result.status === 200));
        results.forEach(result => assert.ok([200, 409].includes(result.status), JSON.stringify(result.json)));
        assert.equal(accepted.length, before + 1, 'concurrent retry must claim one send');
        assert.equal((await detail(report)).emailNotification.status, 'sent');
        assert.equal((await detail(report)).emailNotification.attempts, 2);
        const dispatches = attempts.slice(beforeAttempts);
        assert.ok(dispatches.length >= 2); assert.equal(new Set(dispatches.map(item => item.messageId)).size, 1);
        const alreadySent = await retry(report); assert.ok([200, 409].includes(alreadySent.status), JSON.stringify(alreadySent.json));
        assert.equal(accepted.length, before + 1, 'retrying an already sent event must not send again');
    });
    await test('recipient rejection remains recoverable but all deliveries stop after three attempts', async () => {
        failure = 'not-accepted'; const report = await create({ title: 'Destinatario rechazado QA' });
        assert.equal((await detail(report)).emailNotification.status, 'failed');
        check(await retry(report), 200); check(await retry(report), 200);
        const status = (await detail(report)).emailNotification;
        assert.equal(status.attempts, 3); assert.equal(status.retryable, false);
        const before = attempts.length; check(await retry(report), 409); assert.equal(attempts.length, before); failure = '';
    });
    await test('ambiguous delivery is recorded and cannot be blindly resent', async () => {
        for (const mode of ['unknown', 'after-data']) {
            failure = mode; const report = await create({ title: 'Entrega incierta QA ' + mode }); failure = '';
            const status = (await detail(report)).emailNotification;
            assert.equal(status.status, 'uncertain'); assert.equal(status.retryable, false);
            const before = attempts.length; check(await retry(report), 409);
            await detail(report); await notices(); assert.equal(attempts.length, before); assert.ok(await stored(report));
        }
    });
    await test('missing SMTP configuration cannot discard a report or its CRM notification', async () => {
        const isConfigured = EmailAdapter.isConfigured, before = attempts.length;
        EmailAdapter.isConfigured = () => false;
        try {
            const report = await create({ title: 'SMTP sin configurar QA' });
            const status = (await detail(report)).emailNotification;
            assert.notEqual(status.status, 'sent'); assert.equal(status.reason, 'mail_unconfigured');
            assert.ok(await stored(report)); assert.ok((await notices()).some(item => String(item.entityId) === idOf(report)));
            assert.equal(attempts.length, before);
        } finally { EmailAdapter.isConfigured = isConfigured; }
    });
    await test('a stale in-flight delivery remains durable and cannot produce a duplicate after interruption', async () => {
        failure = 'known'; const report = await create({ title: 'Envío interrumpido QA' }); failure = '';
        await env.models.IssueReport.updateOne({ _id: idOf(report) }, { $set: {
            'emailNotification.state': 'sending', 'emailNotification.claimedAt': new Date(Date.now() - 180000),
            'emailNotification.claimId': crypto.randomUUID()
        } });
        const before = attempts.length;
        const reloaded = await detail(report); assert.equal(reloaded.emailNotification.status, 'uncertain');
        assert.equal(reloaded.emailNotification.retryable, false); check(await retry(report), 409);
        assert.equal(attempts.length, before); assert.ok(await stored(report));
        assert.ok((await notices()).some(item => String(item.entityId) === idOf(report)));
    });
    await test('changed or invalid configured recipients never redirect a pending notice or lose a report', async () => {
        failure = 'known'; const report = await create({ title: 'Cambio destinatario QA' }); failure = '';
        const before = attempts.length;
        process.env.SECURITY_ALERT_EMAIL = 'otro-administrador@example.test';
        const response = await retry(report); assert.ok([200, 409].includes(response.status), JSON.stringify(response.json));
        assert.equal(attempts.length, before, 'a stored event must not silently switch recipients');
        let missingRecipient;
        for (const invalid of ['', 'invalid-address', 'admin@example.test\r\nBcc: stranger@example.test']) {
            process.env.SECURITY_ALERT_EMAIL = invalid;
            const created = await create({ title: 'Sin destinatario válido QA' }); assert.ok(await stored(created));
            if (!invalid) missingRecipient = created;
            const info = (await detail(created)).emailNotification; assert.notEqual(info.status, 'sent'); assert.equal(info.retryable, false);
            assert.ok((await notices()).some(item => String(item.entityId) === idOf(created)));
        }
        assert.equal(attempts.length, before); process.env.SECURITY_ALERT_EMAIL = recipient;
        assert.equal((await detail(missingRecipient)).emailNotification.retryable, true);
        assert.equal(attempts.length, before, 'configuration or reads alone must not dispatch');
        for (const index of [admin, seller, reader]) check(await retry(missingRecipient, index), 403);
        check(await retry(missingRecipient), 200);
        assert.equal(attempts.length, before + 1);
        assert.equal((await detail(missingRecipient)).emailNotification.status, 'sent');
    });
    await test('historic reports never trigger a backfill email when opened or surfaced as notifications', async () => {
        const id = new env.mongoose.Types.ObjectId(), at = new Date(Date.now() - 3600000);
        await env.models.IssueReport.collection.insertOne({ _id: id, ...base, pageUrl: '/admin/stock', author: users[reader]._id,
            status: 'new', attachments: [], comments: [], createdAt: at, updatedAt: at });
        const before = attempts.length;
        const historic = await detail({ _id: id }); assert.equal(historic.emailNotification.status, 'not_needed');
        await notices(); check(await api(owner, 'GET', endpoint), 200);
        const response = await retry({ _id: id }); assert.ok([200, 409].includes(response.status), JSON.stringify(response.json));
        assert.equal(attempts.length, before);
        const ordinary = await detail(first, seller); assert.equal(ordinary.emailNotification, undefined);
        const managed = await detail(first, admin); assert.equal(managed.emailNotification.status, 'sent'); privateMetadataAbsent(managed);
        assert.ok(accepted.every(mail => mail.to === recipient && /@example\.test$/.test(mail.to)));
    });
    console.log(`PASS: ${passed} isolated issue-report notification scenarios; ${accepted.length} simulated deliveries and no real emails.`);
} finally {
    globalThis.fetch = originalFetch;
    await env.stop();
}
