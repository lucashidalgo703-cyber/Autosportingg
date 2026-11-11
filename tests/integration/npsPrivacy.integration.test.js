// Loopback API and disposable MongoDB only; no real contacts, credentials or provider calls.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { access } from 'node:fs/promises';
import { after, before, beforeEach, describe, test } from 'node:test';
import { WhatsAppAdapter } from '../../src/lib/whatsappAdapter.js';
import { EmailAdapter } from '../../src/lib/emailAdapter.js';
import { npsPeriodRange } from '../../src/utils/nps.js';

const nativeFetch = globalThis.fetch;
const dbName = `autosporting_nps_test_${crypto.randomBytes(6).toString('hex')}`;
let replSet, mongoose, jwt, server, base, models, seller, client;
const token = permissions => jwt.sign({ id: String(seller._id), role: 'ventas', username: 'qa_nps', permissions }, process.env.JWT_SECRET, { expiresIn: '10m' });
async function call(method, route, body, auth = token(['nps.read', 'nps.write'])) {
    const response = await fetch(`${base}${route}`, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
}
const createSurvey = overrides => models.NpsSurvey.create({ token: crypto.randomBytes(24).toString('hex'), client: client._id, seller: seller._id, generatedBy: seller._id, expiresAt: new Date(Date.now() + 86400000), ...overrides });

describe('NPS compatibility and least-data API responses', { concurrency: false }, () => {
    before(async () => {
        for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) assert.equal(await access(name).then(() => true, () => false), false, 'Run in an isolated checkout without active .env credentials');
        const { MongoMemoryReplSet } = await import('mongodb-memory-server');
        replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger', ip: '127.0.0.1', spawn: { windowsHide: true }, args: ['--wiredTigerCacheSizeGB', '0.25', '--oplogSize', '16'] }, instanceOpts: [{ ip: '127.0.0.1', launchTimeout: 180000 }] });
        process.env.MONGODB_URI = replSet.getUri(dbName);
        process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
        process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        process.env.NODE_ENV = 'production'; process.env.ENABLE_DAILY_SUMMARY_SCHEDULER = 'false';
        for (const key of ['REDIS_URL', 'REDIS_TOKEN', 'MONGODB_DNS_SERVERS', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) process.env[key] = '';
        globalThis.fetch = (input, options) => {
            const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
            assert.equal(target.origin, base, 'No NPS test can call an external provider');
            return nativeFetch(input, options);
        };
        mongoose = (await import('mongoose')).default; mongoose.set('autoCreate', false);
        jwt = (await import('jsonwebtoken')).default;
        const app = (await import('../../server.js')).default;
        models = Object.fromEntries(await Promise.all(['Client', 'Sale', 'AdminUser', 'NpsSurvey', 'NpsResponse', 'AuditLog', 'CommunicationLog', 'Lead'].map(async name => [name, (await import(`../../src/models/${name}.js`)).default])));
        await (await import('../../src/config/db.js')).default();
        assert.equal(mongoose.connection.host, '127.0.0.1'); assert.equal(mongoose.connection.name, dbName);
        await Promise.all(Object.values(models).map(Model => Model.createCollection()));
        server = app.listen({ port: 0, host: '127.0.0.1' }); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
    }, { timeout: 300000 });
    beforeEach(async () => {
        await Promise.all(Object.values(models).map(Model => Model.deleteMany({})));
        for (const key of ['WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'NPS_WHATSAPP_TEMPLATE_NAME', 'NPS_WHATSAPP_TEMPLATE_COMPONENTS_JSON']) delete process.env[key];
        process.env.NEXT_PUBLIC_BASE_URL = 'https://autosporting.example.invalid';
        seller = await models.AdminUser.create({ name: 'Vendedor ficticio NPS', email: 'nps-seller@example.invalid', role: 'ventas', passwordHash: 'qa-not-a-real-password-hash', twoFactorSecret: 'qa-not-a-real-2fa-secret', recoveryCodes: ['qa-not-a-real-recovery-code'] });
        client = await models.Client.create({ fullName: 'Persona ficticia NPS', firstName: 'Persona', lastName: 'Ficticia', phone: '02975550101', email: 'nps-client@example.invalid', notes: 'qa-private-client-notes', dniCuit: 'QA-DOCUMENT' });
    });
    after(async () => {
        globalThis.fetch = nativeFetch;
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        if (mongoose) await mongoose.disconnect();
        if (replSet) await replSet.stop();
    });

    test('NPS read excludes staff secrets, client contact data and unauthorized sale queries', async () => {
        const sale = await models.Sale.create({ clientId: client._id, status: 'entregada', salePrice: 12345, saleCurrency: 'USD', notes: 'qa-private-sale-notes' });
        const survey = await createSurvey({ sale: sale._id, status: 'completed' });
        await models.NpsResponse.create({ survey: survey._id, score: 0, comment: 'Respuesta ficticia', followUpStatus: 'pending' });
        assert.equal((await call('GET', '/api/admin/nps/dashboard', undefined, null)).status, 401);
        assert.equal((await call('GET', '/api/admin/nps/dashboard', undefined, token(['clientes.read']))).status, 403);
        const saleQueries = [], previousDebug = mongoose.get('debug');
        let limited;
        try {
            mongoose.set('debug', (collection, method) => { if (collection === models.Sale.collection.name) saleQueries.push(method); });
            limited = await call('GET', '/api/admin/nps/dashboard', undefined, token(['nps.read']));
        } finally { mongoose.set('debug', previousDebug); }
        assert.equal(limited.status, 200); assert.equal(saleQueries.length, 0);
        assert.match(limited.headers.get('cache-control'), /no-store/);
        const entry = limited.body.recentResponses[0];
        assert.deepEqual(Object.keys(entry.survey.client).sort(), ['_id', 'firstName', 'fullName', 'lastName']);
        assert.deepEqual(entry.survey.seller, { _id: String(seller._id), name: seller.name });
        assert.equal(Object.hasOwn(entry.survey, 'sale'), false);
        assert.equal(Object.hasOwn(entry.survey, 'token'), false);
        const json = JSON.stringify(limited.body);
        for (const value of ['passwordHash', 'twoFactorSecret', 'recoveryCodes', seller.email, client.email, client.phone, client.dniCuit, client.notes, 'salePrice', 'qa-private-sale-notes', survey.token]) assert.equal(json.includes(value), false, value);
        const allowed = await call('GET', '/api/admin/nps/dashboard', undefined, token(['nps.read', 'ventas.read']));
        assert.equal(allowed.status, 200);
        assert.deepEqual(allowed.body.recentResponses[0].survey.sale, { _id: String(sale._id), status: 'entregada' });
        assert.equal(JSON.stringify(allowed.body).includes('salePrice'), false);
    });
    test('manual NPS saves score zero and rejects out-of-range input without orphan surveys', async () => {
        assert.equal((await call('POST', '/api/admin/nps/manual', { clientId: String(client._id), score: 7 }, token(['nps.read']))).status, 403);
        const result = await call('POST', '/api/admin/nps/manual', { clientId: String(client._id), score: 0, comment: 'Nota ficticia', callDate: '2026-11-10' }, token(['nps.write']));
        assert.equal(result.status, 201, JSON.stringify(result.body));
        assert.equal(result.body.response.score, 0); assert.equal(result.body.response.classification, 'detractor');
        assert.equal(result.body.response.followUpStatus, 'pending');
        assert.equal((await models.NpsSurvey.findById(result.body.survey._id)).status, 'completed');
        const invalid = await call('POST', '/api/admin/nps/manual', { clientId: String(client._id), score: 11 });
        assert.equal(invalid.status, 400); assert.equal(await models.NpsSurvey.countDocuments(), 1); assert.equal(await models.NpsResponse.countDocuments(), 1);
    });
    test('a generated public link exposes only validity and saves one classified response', async () => {
        const generated = await call('POST', '/api/admin/nps/generate', { clientId: String(client._id) }, token(['nps.write']));
        assert.equal(generated.status, 201, JSON.stringify(generated.body));
        const invitation = new URL(generated.body.url).pathname.split('/').at(-1);
        const publicView = await call('GET', `/api/public/nps/${invitation}`, undefined, null);
        assert.equal(publicView.status, 200); assert.deepEqual(Object.keys(publicView.body).sort(), ['expiresAt', 'valid']);
        assert.equal(publicView.body.valid, true); assert.match(publicView.headers.get('cache-control'), /no-store/);
        assert.equal((await call('POST', `/api/public/nps/${invitation}`, { score: 11 }, null)).status, 400);
        const submitted = await call('POST', `/api/public/nps/${invitation}`, { score: 9, comment: 'Comentario público ficticio' }, null);
        assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
        assert.deepEqual(Object.keys(submitted.body), ['message']);
        assert.equal((await models.NpsResponse.findOne()).classification, 'promoter');
        assert.equal((await models.NpsSurvey.findOne()).status, 'completed');
        assert.equal((await call('POST', `/api/public/nps/${invitation}`, { score: 10 }, null)).status, 400);
        assert.equal(await models.NpsResponse.countDocuments(), 1);
    });
    test('public expired, completed and missing links reveal no private survey fields', async () => {
        const expired = await createSurvey({ expiresAt: new Date(Date.now() - 1000) });
        const completed = await createSurvey({ status: 'completed' });
        for (const [invitation, code] of [[expired.token, 'EXPIRED'], [completed.token, 'ALREADY_COMPLETED']]) {
            const result = await call('GET', `/api/public/nps/${invitation}`, undefined, null);
            assert.equal(result.status, 400); assert.deepEqual(Object.keys(result.body).sort(), ['code', 'message']); assert.equal(result.body.code, code);
            assert.equal((await call('POST', `/api/public/nps/${invitation}`, { score: 7 }, null)).status, 400);
        }
        assert.equal((await call('GET', '/api/public/nps/missing-qa-link', undefined, null)).status, 404);
        assert.equal(await models.NpsResponse.countDocuments(), 0);
    });

    test('contextual manual response separates seller from author, permits opt-out and replays safely', async () => {
        const otherSeller = await models.AdminUser.create({ name: 'Otra vendedora ficticia', email: 'nps-other@example.invalid', role: 'ventas', passwordHash: 'qa-no-real-hash' });
        await models.Client.updateOne({ _id: client._id }, { $set: { doNotContact: true } });
        const input = { clientId: String(client._id), sellerId: String(otherSeller._id), context: 'postvisita', score: 7, comment: 'Respuesta ya recibida', idempotencyKey: crypto.randomUUID() };
        const first = await call('POST', '/api/admin/nps/manual', input);
        assert.equal(first.status, 201, JSON.stringify(first.body));
        const saved = await models.NpsSurvey.findById(first.body.survey._id).lean();
        assert.equal(String(saved.seller), String(otherSeller._id)); assert.equal(String(saved.generatedBy), String(seller._id)); assert.equal(saved.context, 'postvisita');
        const replay = await call('POST', '/api/admin/nps/manual', input); assert.equal(replay.status, 201); assert.equal(replay.body.replayed, true);
        assert.equal(await models.NpsSurvey.countDocuments(), 1); assert.equal(await models.NpsResponse.countDocuments(), 1);
        assert.equal((await call('POST', '/api/admin/nps/manual', { ...input, score: 9 })).status, 409);
        assert.equal((await call('POST', '/api/admin/nps/manual', { ...input, idempotencyKey: crypto.randomUUID(), context: 0 })).status, 400);
        assert.equal((await call('POST', '/api/admin/nps/manual', { ...input, idempotencyKey: crypto.randomUUID(), sellerId: '' })).status, 400);
        const history = await call('GET', `/api/admin/clients/${client._id}/nps`);
        assert.equal(history.status, 200); assert.equal(history.body.contactBlocked, true); assert.equal(history.body.surveys[0].seller.name, otherSeller.name); assert.equal(history.body.metrics.averageScore, 7);
        assert.equal((await call('POST', '/api/admin/nps/generate', input)).status, 409);
    });
    test('dashboard filters real response dates, seller and context and returns average zero honestly', async () => {
        const current = await createSurvey({ context: 'postvisita' });
        const earlier = await createSurvey({ context: 'postvisita' });
        const otherContext = await createSurvey({ context: 'postventa' });
        const range = npsPeriodRange('Este mes');
        await models.NpsResponse.create([{ survey: current._id, score: 0 }, { survey: earlier._id, score: 7, createdAt: new Date(range.$gte.getTime() - 86400000) }, { survey: otherContext._id, score: 10 }]);
        const filtered = await call('GET', `/api/admin/nps/dashboard?period=Este%20mes&sellerId=${seller._id}&context=postvisita`);
        assert.equal(filtered.status, 200); assert.equal(filtered.body.metrics.total, 1); assert.equal(filtered.body.metrics.averageScore, 0); assert.equal(filtered.body.metrics.npsScore, -100);
        const all = await call('GET', `/api/admin/nps/dashboard?period=Hist%C3%B3rico&clientId=${client._id}`);
        assert.equal(all.body.metrics.total, 3); assert.equal(all.body.metrics.averageScore, 5.7); assert.equal(all.body.metrics.npsScore, 0);
        assert.equal((await call('GET', '/api/admin/nps/dashboard?context=inventado')).status, 400);
    });
    test('configured WhatsApp sends require consent and permissions and an identical retry never resends', async t => {
        process.env.WHATSAPP_API_TOKEN = 'qa-fake-token'; process.env.WHATSAPP_PHONE_NUMBER_ID = 'qa-fake-number';
        await models.CommunicationLog.create({ entityType: 'client', entityId: client._id, clientId: client._id, createdBy: seller._id, channel: 'whatsapp', direction: 'inbound', title: 'Ventana QA', contactDate: new Date() });
        let calls = 0;
        t.mock.method(WhatsAppAdapter, 'sendMessage', async () => { calls++; return { messages: [{ id: 'qa-provider-id' }] }; });
        const auth = token(['nps.read', 'nps.write', 'whatsapp.write']);
        const input = { clientId: String(client._id), sellerId: String(seller._id), context: 'postentrega', idempotencyKey: crypto.randomUUID(), consentConfirmed: true };
        assert.equal((await call('POST', '/api/admin/nps/send', input, token(['nps.write']))).status, 403);
        assert.equal((await call('POST', '/api/admin/nps/send', { ...input, consentConfirmed: false }, auth)).status, 400);
        assert.equal(calls, 0);
        const sent = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(sent.status, 200, JSON.stringify(sent.body)); assert.equal(sent.body.sent, true);
        const replay = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(replay.status, 200); assert.equal(replay.body.replayed, true); assert.equal(calls, 1);
        assert.equal(await models.NpsSurvey.countDocuments(), 1);
        assert.equal(await models.CommunicationLog.countDocuments({ direction: 'outbound' }), 1);
        assert.equal(await models.AuditLog.countDocuments({ action: 'NPS_SENT' }), 1);
        const config = await call('GET', `/api/admin/nps/config?clientId=${client._id}`, undefined, auth); assert.equal(config.body.whatsapp.available, true); assert.equal(config.body.whatsapp.mode, 'session');
    });
    test('a definite rejection can retry the same survey without duplicate invitation records', async t => {
        process.env.WHATSAPP_API_TOKEN = 'qa-fake-token'; process.env.WHATSAPP_PHONE_NUMBER_ID = 'qa-fake-number';
        await models.CommunicationLog.create({ entityType: 'client', entityId: client._id, clientId: client._id, createdBy: seller._id, channel: 'whatsapp', direction: 'inbound', title: 'Ventana QA' });
        let calls = 0;
        t.mock.method(WhatsAppAdapter, 'sendMessage', async () => { if (++calls === 1) throw Object.assign(new Error('QA provider rejected'), { deliveryUncertain: false }); return { messages: [{ id: 'qa-retry-id' }] }; });
        const auth = token(['nps.read', 'nps.write', 'whatsapp.write']);
        const input = { clientId: String(client._id), context: 'atencion_lead', idempotencyKey: crypto.randomUUID(), consentConfirmed: true };
        const failed = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(failed.status, 502); assert.equal(failed.body.code, 'NPS_PROVIDER_REJECTED');
        const retried = await call('POST', `/api/admin/nps/surveys/${failed.body.surveyId}/retry`, { consentConfirmed: true }, auth); assert.equal(retried.status, 200, JSON.stringify(retried.body));
        assert.equal(calls, 2); assert.equal(await models.NpsSurvey.countDocuments(), 1);
        const survey = await models.NpsSurvey.findOne().lean(); assert.equal(survey.delivery.attempts, 2); assert.equal(survey.delivery.status, 'sent');
    });
    test('uncertain provider outcomes are never resent until a human verifies non-delivery', async t => {
        process.env.WHATSAPP_API_TOKEN = 'qa-fake-token'; process.env.WHATSAPP_PHONE_NUMBER_ID = 'qa-fake-number';
        await models.CommunicationLog.create({ entityType: 'client', entityId: client._id, clientId: client._id, createdBy: seller._id, channel: 'whatsapp', direction: 'inbound', title: 'Ventana QA' });
        let calls = 0;
        t.mock.method(WhatsAppAdapter, 'sendMessage', async () => { calls++; if (calls === 1) throw Object.assign(new Error('QA timeout'), { deliveryUncertain: true }); return { messages: [{ id: 'qa-verified-retry' }] }; });
        const auth = token(['nps.read', 'nps.write', 'whatsapp.write']);
        const input = { clientId: String(client._id), context: 'postcotizacion', consentConfirmed: true, idempotencyKey: crypto.randomUUID() };
        const uncertain = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(uncertain.status, 502); assert.equal(uncertain.body.code, 'NPS_DELIVERY_UNCERTAIN');
        assert.equal((await call('POST', '/api/admin/nps/send', input, auth)).status, 409);
        assert.equal((await call('POST', '/api/admin/nps/send', { ...input, idempotencyKey: crypto.randomUUID() }, auth)).status, 409); assert.equal(calls, 1);
        const verification = { result: 'not_sent', note: 'Verificado en bandeja de prueba: no se envió.' };
        const verified = await call('PATCH', `/api/admin/nps/surveys/${uncertain.body.surveyId}/verify`, verification, auth); assert.equal(verified.status, 200);
        const repeated = await call('PATCH', `/api/admin/nps/surveys/${uncertain.body.surveyId}/verify`, verification, auth); assert.equal(repeated.status, 200); assert.equal(repeated.body.replayed, true);
        assert.equal((await call('POST', `/api/admin/nps/surveys/${uncertain.body.surveyId}/retry`, { consentConfirmed: true }, auth)).status, 200); assert.equal(calls, 2);
        assert.equal(await models.AuditLog.countDocuments({ action: 'NPS_DELIVERY_VERIFIED' }), 1);
    });
    test('concurrent duplicate requests lock a single outbound provider attempt', async t => {
        process.env.WHATSAPP_API_TOKEN = 'qa-fake-token'; process.env.WHATSAPP_PHONE_NUMBER_ID = 'qa-fake-number';
        await models.CommunicationLog.create({ entityType: 'client', entityId: client._id, clientId: client._id, createdBy: seller._id, channel: 'whatsapp', direction: 'inbound', title: 'Ventana QA' });
        let calls = 0, release, entered;
        const waiting = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
        t.mock.method(WhatsAppAdapter, 'sendMessage', async () => { calls++; entered(); await waiting; return { messages: [{ id: 'qa-single-concurrent' }] }; });
        const auth = token(['nps.read', 'nps.write', 'whatsapp.write']);
        const input = { clientId: String(client._id), context: 'postventa', consentConfirmed: true, idempotencyKey: crypto.randomUUID() };
        const first = call('POST', '/api/admin/nps/send', input, auth);
        try { await started; const second = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(second.status, 409); }
        finally { release(); }
        assert.equal((await first).status, 200); assert.equal(calls, 1); assert.equal(await models.NpsSurvey.countDocuments(), 1);
    });
    test('outside the session window only a configured approved NPS template can send', async t => {
        process.env.WHATSAPP_API_TOKEN = 'qa-fake-token'; process.env.WHATSAPP_PHONE_NUMBER_ID = 'qa-fake-number';
        const auth = token(['nps.read', 'nps.write', 'whatsapp.write']);
        const input = { clientId: String(client._id), context: 'postvisita', consentConfirmed: true, idempotencyKey: crypto.randomUUID() };
        const unavailable = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(unavailable.status, 503); assert.equal(unavailable.body.code, 'NPS_TEMPLATE_REQUIRED');
        assert.equal(await models.NpsSurvey.countDocuments(), 0);
        process.env.NPS_WHATSAPP_TEMPLATE_NAME = 'qa_nps'; process.env.WHATSAPP_TEMPLATES_JSON = JSON.stringify([{ name: 'qa_nps', language: 'es_AR' }]);
        process.env.NPS_WHATSAPP_TEMPLATE_COMPONENTS_JSON = JSON.stringify([{ type: 'body', parameters: [{ type: 'text', text: '{{surveyUrl}}' }] }]);
        let calls = 0;
        t.mock.method(WhatsAppAdapter, 'sendTemplateMessage', async (to, name, language, components, context) => {
            calls++; assert.equal(name, 'qa_nps'); assert.equal(language, 'es_AR'); assert.equal(String(context.clientId), String(client._id));
            assert.match(components[0].parameters[0].text, /^https:\/\/autosporting\.example\.invalid\/encuesta\/[a-f\d]{64}$/);
            return { messages: [{ id: 'qa-template-accepted' }] };
        });
        const sent = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(sent.status, 200, JSON.stringify(sent.body)); assert.equal(calls, 1);
    });
    test('the real adapter accepts only fake provider acknowledgements and checks opt-out before provider fetch', async t => {
        process.env.WHATSAPP_API_TOKEN = 'qa-fake-token'; process.env.WHATSAPP_PHONE_NUMBER_ID = 'qa-fake-number';
        let calls = 0, acknowledge = true, providerStatus = 200;
        t.mock.method(globalThis, 'fetch', async (input, options) => {
            const url = new URL(String(input));
            if (url.origin === base) return nativeFetch(input, options);
            assert.equal(url.hostname, 'graph.facebook.com'); calls++;
            return new Response(JSON.stringify(acknowledge ? { messages: [{ id: 'qa-local-fake-ack' }] } : {}), { status: providerStatus, headers: { 'Content-Type': 'application/json' } });
        });
        const accepted = await WhatsAppAdapter.sendMessage('02975550101', 'Mensaje ficticio', { clientId: client._id }); assert.equal(accepted.messages[0].id, 'qa-local-fake-ack');
        acknowledge = false;
        await assert.rejects(WhatsAppAdapter.sendMessage('02975550101', 'Mensaje ficticio'), error => error.code === 'WHATSAPP_DELIVERY_UNCERTAIN');
        providerStatus = 503;
        await assert.rejects(WhatsAppAdapter.sendMessage('02975550101', 'Mensaje ficticio'), error => error.deliveryUncertain === true);
        await models.Client.updateOne({ _id: client._id }, { $set: { doNotContact: true } });
        await assert.rejects(WhatsAppAdapter.sendMessage('02975550101', 'Mensaje ficticio'), error => error.code === 'CLIENT_DO_NOT_CONTACT'); assert.equal(calls, 3);
    });
    test('missing configuration never creates a fake send and central adapters honor normalized opt-out recipients', async () => {
        const auth = token(['nps.read', 'nps.write', 'whatsapp.write']);
        const input = { clientId: String(client._id), context: 'postventa', consentConfirmed: true, idempotencyKey: crypto.randomUUID() };
        const missing = await call('POST', '/api/admin/nps/send', input, auth); assert.equal(missing.status, 503); assert.equal(missing.body.code, 'NPS_WHATSAPP_NOT_CONFIGURED'); assert.equal(await models.NpsSurvey.countDocuments(), 0);
        await models.Client.updateOne({ _id: client._id }, { $set: { doNotContact: true } });
        assert.equal((await call('POST', '/api/admin/nps/send', input, auth)).status, 409);
        await assert.rejects(WhatsAppAdapter.sendMessage('02975550101', 'QA no enviar'), error => error.code === 'CLIENT_DO_NOT_CONTACT');
        await assert.rejects(EmailAdapter.sendEmail('Persona ficticia <NPS-CLIENT@EXAMPLE.INVALID>', 'QA', 'QA'), error => error.code === 'CLIENT_DO_NOT_CONTACT');
        await assert.rejects(EmailAdapter.sendEmail([{ name: 'QA', address: client.email }], 'QA', 'QA'), error => error.code === 'CLIENT_DO_NOT_CONTACT');
        let tooDeep = client.email; for (let depth = 0; depth < 8; depth++) tooDeep = { group: [tooDeep] };
        await assert.rejects(EmailAdapter.sendEmail(tooDeep, 'QA', 'QA'), error => error.code === 'CONTACT_RECIPIENT_INVALID');
        const lead = await models.Lead.create({ name: 'Lead ficticio', phone: '02975550101', clientId: client._id });
        await assert.rejects(WhatsAppAdapter.sendMessage('5491112345678', 'QA no enviar', { leadId: lead._id }), error => error.code === 'CLIENT_DO_NOT_CONTACT');
        assert.equal(await models.CommunicationLog.countDocuments(), 0);
    });
});
