// Real authorization and persistence against disposable local MongoDB only.
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
    const { ROLES } = await import('../../src/utils/adminPermissions.js');
    const { invoicePng, invoiceJpeg, invoiceWebp } = await import('../fixtures/vehicleInvoicesFixtures.js');
    const passwordHash = () => {
        const salt = crypto.randomBytes(16).toString('hex');
        return `${salt}:${crypto.scryptSync(crypto.randomBytes(32), salt, 64).toString('hex')}`;
    };
    const users = await env.models.AdminUser.create(Object.values(ROLES).map((role, index) => ({
        name: `Equipo reportes QA ${index}`, email: `reportes-${index}@example.test`, role, passwordHash: passwordHash(), permissions: []
    })));
    const sessions = await Promise.all(users.map(user => createLoginSession(user)));
    const owner = users.findIndex(user => user.role === 'owner'), admin = users.findIndex(user => user.role === 'admin');
    const seller = users.findIndex(user => user.role === 'ventas'), reader = users.findIndex(user => user.role === 'solo_lectura');
    const endpoint = '/api/admin/issue-reports';
    const api = (index, method, route, body) => env.call(method, route, body, sessions[index].token);
    const check = (response, status, context = '') => assert.equal(response.status, status, `${context} ${JSON.stringify(response.json)}`);
    const reportOf = response => response.json.report || response.json;
    const idOf = report => String(report._id || report.id);
    const test = async (name, callback) => { await callback(); console.log(`ok ${++passed} - ${name}`); };
    const noPrivateBytes = value => assert.doesNotMatch(JSON.stringify(value), /passwordHash|twoFactorSecret|recoveryCodes|"data"\s*:|"type":"Buffer"/);
    const base = { title: 'No se guarda el formulario QA', description: 'Al guardar un formulario ficticio, aparece un error y no se conservan los cambios.',
        category: 'bug', priority: 'medium', module: 'Stock', steps: 'Abrir una unidad ficticia y presionar Guardar.',
        expectedBehavior: 'Los cambios quedan registrados.', actualBehavior: 'El formulario muestra un error.', pageUrl: '/admin/stock' };
    const reports = [];
    async function upload(index, files, input = {}) {
        const form = new FormData();
        for (const [key, value] of Object.entries({ ...base, ...input })) form.set(key, String(value));
        for (const file of files) form.append('attachments', new Blob([file.bytes], { type: file.type || 'image/png' }), file.name || 'captura-qa.png');
        const response = await fetch(env.base + endpoint, { method: 'POST', headers: { Authorization: 'Bearer ' + sessions[index].token }, body: form });
        return { status: response.status, json: await response.json().catch(() => ({})) };
    }
    const attachmentUrl = (report, attachment) => attachment.url || `${endpoint}/${idOf(report)}/attachments/${attachment._id || attachment.id}`;

    await test('report creation and listing require a current authenticated CRM session', async () => {
        check(await env.call('GET', endpoint), 401);
        check(await env.call('POST', endpoint, base), 401);
        check(await env.call('GET', endpoint, undefined, 'invalid-session'), 401);
    });
    await test('every internal role, including read-only, can submit and reload its own report', async () => {
        for (let index = 0; index < users.length; index++) {
            const response = await api(index, 'POST', endpoint, { ...base, title: `${base.title} ${users[index].role}` });
            check(response, 201, users[index].role);
            const report = reportOf(response); reports[index] = report;
            assert.equal(String(report.author?._id || report.author), String(users[index]._id));
            assert.equal(report.status, 'new'); assert.equal(report.category, 'bug');
            assert.equal(report.description, base.description); assert.equal(report.steps, base.steps);
            const reloaded = await api(index, 'GET', `${endpoint}/${idOf(report)}`); check(reloaded, 200);
            assert.equal(reportOf(reloaded).title, `${base.title} ${users[index].role}`); noPrivateBytes(reloaded.json);
        }
    });
    await test('regular profiles cannot read another author or broaden ownership through query parameters', async () => {
        for (let index = 0; index < users.length; index++) {
            if ([owner, admin].includes(index)) continue;
            const response = await api(index, 'GET', endpoint + `?scope=all&mine=false&author=${users[owner]._id}&userId=${users[owner]._id}`);
            check(response, 200); assert.equal(response.json.canManage, false);
            assert.equal(response.json.total, 1);
            assert.deepEqual(response.json.reports.map(idOf), [idOf(reports[index])]); noPrivateBytes(response.json);
            check(await api(index, 'GET', `${endpoint}/${idOf(reports[owner])}`), 404);
            check(await api(index, 'PATCH', `${endpoint}/${idOf(reports[index])}`, { status: 'resolved', commentText: 'Cambio no autorizado QA' }), 403);
        }
    });
    await test('owner and administrator can inspect all reports without exposing credentials or file bytes', async () => {
        for (const index of [owner, admin]) {
            const response = await api(index, 'GET', endpoint); check(response, 200);
            assert.equal(response.json.canManage, true); assert.equal(response.json.total, users.length);
            assert.equal(response.json.reports.length, users.length); noPrivateBytes(response.json);
            const detail = await api(index, 'GET', `${endpoint}/${idOf(reports[reader])}`); check(detail, 200);
            assert.equal(idOf(reportOf(detail)), idOf(reports[reader])); noPrivateBytes(detail.json);
        }
    });
    await test('validation rejects malformed content, unsupported enums, oversized text and invalid identifiers', async () => {
        for (const input of [{ title: '' }, { description: '   ' }, { title: { $ne: '' } }, { description: ['QA'] },
            { category: 'unknown' }, { priority: 'urgent' }, { title: 'x'.repeat(1000) }, { description: 'x'.repeat(50000) },
            { pageUrl: 'javascript:alert(1)' }]) {
            check(await api(reader, 'POST', endpoint, { ...base, ...input }), 400, JSON.stringify(input).slice(0, 90));
        }
        for (const suffix of ['/not-an-id', '/' + new env.mongoose.Types.ObjectId()]) {
            const response = await api(reader, 'GET', endpoint + suffix);
            assert.ok([400, 404].includes(response.status), JSON.stringify(response.json));
        }
        check(await api(admin, 'PATCH', `${endpoint}/${idOf(reports[reader])}`, { status: 'invented' }), 400);
        check(await api(admin, 'PATCH', `${endpoint}/${idOf(reports[reader])}`, { commentText: { $ne: '' } }), 400);
        assert.equal((await api(admin, 'GET', endpoint)).json.total, users.length, 'invalid submissions must not be saved');
    });
    await test('a requester cannot impersonate an author or pre-resolve a report', async () => {
        const response = await api(reader, 'POST', endpoint, { ...base, title: 'Autor desde sesión QA', author: String(users[owner]._id),
            status: 'resolved', comments: [{ text: 'Respuesta falsificada QA', author: String(users[owner]._id) }],
            attachments: [{ name: 'Falsa captura QA', url: 'https://example.test/falsa.png', data: 'datos-falsificados' }] });
        check(response, 201);
        const report = reportOf(response);
        assert.equal(String(report.author?._id || report.author), String(users[reader]._id));
        assert.equal(report.status, 'new'); assert.equal(report.comments.length, 0); assert.equal(report.attachments.length, 0);
    });
    await test('administrative status and response persist and are visible when the author reloads', async () => {
        const route = `${endpoint}/${idOf(reports[seller])}`;
        const response = await api(admin, 'PATCH', route, { status: 'in_review', commentText: 'Revisamos el caso ficticio QA.' }); check(response, 200);
        const reloaded = await api(seller, 'GET', route); check(reloaded, 200);
        const report = reportOf(reloaded); assert.equal(report.status, 'in_review');
        assert.equal(report.comments.at(-1).text, 'Revisamos el caso ficticio QA.');
        assert.equal(String(report.comments.at(-1).author?._id || report.comments.at(-1).author), String(users[admin]._id));
        check(await api(owner, 'PATCH', route, { status: 'resolved', commentText: 'Solución aplicada QA.' }), 200);
        assert.equal(reportOf(await api(seller, 'GET', route)).status, 'resolved');
    });
    await test('filtering and pagination preserve totals and return stable disjoint pages', async () => {
        const filtered = await api(admin, 'GET', endpoint + '?status=resolved&category=bug&priority=medium'); check(filtered, 200);
        assert.equal(filtered.json.total, 1); assert.equal(idOf(filtered.json.reports[0]), idOf(reports[seller]));
        const searched = await api(admin, 'GET', endpoint + '?search=' + encodeURIComponent('Autor desde sesión QA')); check(searched, 200);
        assert.equal(searched.json.total, 1); assert.equal(searched.json.reports[0].title, 'Autor desde sesión QA');
        const first = await api(admin, 'GET', endpoint + '?page=1&limit=2'), second = await api(admin, 'GET', endpoint + '?page=2&limit=2');
        check(first, 200); check(second, 200); assert.equal(first.json.page, 1); assert.equal(second.json.page, 2);
        assert.equal(first.json.pageSize, 2); assert.equal(first.json.total, users.length + 1);
        assert.equal(first.json.reports.length, 2); assert.equal(second.json.reports.length, 2);
        assert.ok(second.json.reports.every(report => !first.json.reports.some(other => idOf(report) === idOf(other))));
    });
    await test('screenshots persist privately and require the report author or a manager to read bytes', async () => {
        const response = await upload(reader, [{ bytes: invoicePng }], { title: 'Captura privada QA' }); check(response, 201);
        const report = reportOf(response); assert.equal(report.attachments.length, 1); noPrivateBytes(response.json);
        const attachment = report.attachments[0], url = attachmentUrl(report, attachment);
        assert.equal(attachment.contentType, 'image/png'); assert.equal(attachment.size, invoicePng.length);
        const unauthorized = await fetch(env.base + url); assert.equal(unauthorized.status, 401);
        const other = await fetch(env.base + url, { headers: { Authorization: 'Bearer ' + sessions[seller].token } }); assert.equal(other.status, 404);
        for (const index of [reader, owner, admin]) {
            const file = await fetch(env.base + url, { headers: { Authorization: 'Bearer ' + sessions[index].token } });
            assert.equal(file.status, 200); assert.match(file.headers.get('content-type') || '', /^image\/png/);
            assert.match(file.headers.get('cache-control') || '', /private|no-store/); assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
            assert.deepEqual(Buffer.from(await file.arrayBuffer()), invoicePng);
        }
        const list = await api(reader, 'GET', endpoint); check(list, 200); noPrivateBytes(list.json);
        assert.equal(list.json.reports.find(item => idOf(item) === idOf(report)).attachments[0].size, invoicePng.length);
    });
    await test('all supported screenshot formats work and malformed, oversized or excessive attachments are rejected', async () => {
        for (const [bytes, type] of [[invoiceJpeg, 'image/jpeg'], [invoiceWebp, 'image/webp']]) {
            const response = await upload(seller, [{ bytes, type }]); check(response, 201);
            assert.equal(reportOf(response).attachments[0].contentType, type);
        }
        for (const files of [[{ bytes: Buffer.from('not a PNG'), type: 'image/png' }],
            [{ bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), type: 'image/svg+xml', name: 'capture.svg' }],
            Array.from({ length: 4 }, () => ({ bytes: invoicePng })),
            Array.from({ length: 2 }, () => ({ bytes: Buffer.concat([invoicePng, Buffer.alloc(2 * 1024 * 1024)]), type: 'image/png' })),
            [{ bytes: Buffer.concat([invoicePng, Buffer.alloc(3 * 1024 * 1024)]), type: 'image/png' }]]) {
            const response = await upload(seller, files);
            assert.ok([400, 413].includes(response.status), JSON.stringify(response.json));
        }
    });
    await test('disabled users cannot submit reports and read failures do not revoke healthy sessions', async () => {
        await env.models.AdminUser.updateOne({ _id: users[reader]._id }, { $set: { active: false } });
        check(await api(reader, 'POST', endpoint, base), 401);
        check(await api(reader, 'GET', endpoint), 401);
        check(await api(seller, 'GET', '/api/admin/auth/me'), 200);
        assert.equal(env.mailbox.length, 0, 'report testing must not send mail');
    });
    console.log(`PASS: ${passed} isolated issue-report scenarios; only synthetic users and loopback traffic.`);
} finally {
    globalThis.fetch = originalFetch;
    await env.stop();
}
