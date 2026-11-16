import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('base64url');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { seedBuyerPortalFixtures } = await import('../fixtures/buyerPortalFixtures.js');
    const { createBuyerPortalIndexes } = await import('../../src/services/buyerPortalService.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const { BuyerPortal, BuyerPortalDocument, BuyerPortalChallenge, BuyerPortalOriginal, BuyerPortalRate } = env.models;
    const fixture = await seedMobileCrm(env.models), portalFixture = await seedBuyerPortalFixtures(env.models, fixture);
    await createBuyerPortalIndexes();
    const mails = [];
    EmailAdapter.sendEmail = async (to, subject, html) => {
        assert.ok([portalFixture.buyerOneEmail, portalFixture.buyerTwoEmail].includes(to));
        mails.push({ to, subject, html }); return { accepted: [to], rejected: [] };
    };
    const adminToken = fixture.sessions[0].token;
    const admin = (method, route, body, token = adminToken) => env.call(method, '/api/admin/buyer-portal' + route, body, token);
    const status = (response, value) => assert.equal(response.status, value, JSON.stringify(response.json));
    const test = async (name, fn) => { await fn(); passed++; console.log(`ok ${passed} - ${name}`); };
    const sid = portalFixture.withTradeIn, otherSid = portalFixture.withoutTradeIn;
    const tid = portalFixture.tradeInId;
    const api = (token, path) => '/api/buyer-portal/' + token + path;
    const pub = (linkToken, method, path, body, sessionToken) => env.call(method, api(linkToken, path), body, sessionToken);
    let withToken, withoutToken, buyerOne, buyerTwo, firstDoc, cardBack, policeOne, policeTwo;
    const clearThrottle = async () => {
        await env.models.GptExpenseRateLimit.deleteMany({});
        await BuyerPortal.updateMany({}, { $set: { nextChallengeAt: new Date(0) } });
    };
    const login = async (linkToken, email) => {
        await clearThrottle();
        const challenge = await pub(linkToken, 'POST', '/challenge', {}); status(challenge, 200);
        const mail = mails.filter(item => item.to === email).at(-1);
        const code = mail.html.match(/>\s*(\d{6})\s*</)[1];
        const verified = await fetch(env.base + api(linkToken, '/verify'), { method: 'POST',
            headers: { 'Content-Type': 'application/json', Origin: 'https://' + new URL(env.base).host },
            body: JSON.stringify({ challengeId: challenge.json.challengeId, code }) });
        assert.equal(verified.status, 200);
        const verification = await verified.json();
        assert.equal(verification.sessionToken, undefined, 'browser authentication stays in its HttpOnly cookie');
        const cookie = verified.headers.getSetCookie().find(value => value.startsWith('autosporting_buyer_session='));
        assert.ok(cookie);
        status(await pub(linkToken, 'POST', '/verify', { challengeId: challenge.json.challengeId, code }), 401);
        // Node's isolated HTTP client intentionally extracts its own cookie here
        // to retain the existing bearer-boundary and document regression checks.
        return decodeURIComponent(cookie.split(';')[0].slice('autosporting_buyer_session='.length));
    };
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
    const upload = async ({ link = withToken, session = buyerOne, key = 'registration_cards', slot, side, description,
        tradeInId = tid, requestId = crypto.randomUUID(), replacesId, issuedAt, buffer = photo, name = 'foto.jpg' }) => {
        const data = new FormData();
        for (const [keyName, value] of Object.entries({ requirementKey: key, tradeInId, slot, side, description, requestId, replacesId, issuedAt })) if (value) data.set(keyName, value);
        data.set('file', new Blob([buffer], { type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' }), name);
        const response = await fetch(env.base + api(link, '/documents'), { method: 'POST', headers: session ? { Authorization: 'Bearer ' + session } : {}, body: data });
        return { status: response.status, json: await response.json() };
    };
    await test('admin scopes and one link per sale; preview excludes internal notes and financial fields', async () => {
        status(await admin('GET', '/sales/' + sid, undefined, null), 401);
        status(await admin('PUT', '/sales/' + sid, {}, fixture.sessions[2].token), 404);
        const first = await admin('PUT', '/sales/' + sid, {}); status(first, 200);
        const second = await admin('PUT', '/sales/' + sid, {}); status(second, 200);
        assert.equal(first.json.url, second.json.url);
        withToken = first.json.url.split('/').at(-1);
        const other = await admin('PUT', '/sales/' + otherSid, {}); status(other, 200);
        withoutToken = other.json.url.split('/').at(-1);
        assert.equal(first.json.mode, 'with_trade_in'); assert.equal(other.json.mode, 'without_trade_in');
        assert.equal(await BuyerPortal.countDocuments(), 2);
        const preview = JSON.stringify(first.json.preview);
        assert.equal(preview.includes('NOTA INTERNA'), false); assert.equal(preview.includes('GESTOR INTERNA'), false);
        for (const key of ['salePrice', 'purchasePrice', 'ownerDni', 'estimatedValue', 'clientId']) assert.equal(preview.includes('"' + key + '"'), false);
        assert.equal(first.json.preview.procedureStatus, 'Presentado');
        assert.equal(first.json.preview.requirements.length, 6);
        assert.equal(preview.includes('formulario08'), false);
    });
    await test('the private link reveals no operation or documents before registered-email verification', async () => {
        const info = await pub(withToken, 'GET', '/info'); status(info, 200);
        assert.equal(info.json.requiresVerification, true); assert.equal(info.json.saleId, undefined);
        status(await pub(withToken, 'GET', '/session'), 401);
        status(await upload({ slot: 'cedula-1-front', side: 'front', description: 'Cédula 1 · Frente', session: '' }), 401);
        const challenge = await pub(withToken, 'POST', '/challenge', { email: 'atacante@example.test' }); status(challenge, 200);
        assert.equal(mails.at(-1).to, portalFixture.buyerOneEmail);
        status(await pub(withToken, 'POST', '/challenge', {}), 429);
        for (let i = 0; i < 5; i++) status(await pub(withToken, 'POST', '/verify', { challengeId: challenge.json.challengeId, code: 'no-code' }), 401);
        const actual = mails.at(-1).html.match(/>\s*(\d{6})\s*</)[1];
        const wrong = actual === '000000' ? '000001' : '000000';
        for (let i = 0; i < 5; i++) status(await pub(withToken, 'POST', '/verify', { challengeId: challenge.json.challengeId, code: wrong }), 401);
        status(await pub(withToken, 'POST', '/verify', { challengeId: challenge.json.challengeId, code: actual }), 401);
        buyerOne = await login(withToken, portalFixture.buyerOneEmail);
        buyerTwo = await login(withoutToken, portalFixture.buyerTwoEmail);
        status(await pub(withoutToken, 'GET', '/session', undefined, buyerOne), 401);
        status(await env.call('GET', '/api/admin/cars', undefined, buyerOne), 401);
    });
    await test('four individual images persist on the correct pre-entry vehicle and complete two of six requirements', async () => {
        const before = await env.models.Car.countDocuments();
        const requests = [
            { slot: 'cedula-1-front', side: 'front' },
            { slot: 'cedula-1-back', side: 'back' },
            { key: 'police_check', slot: 'police-page-1', side: 'page' },
            { key: 'police_check', slot: 'police-page-2', side: 'page' }
        ];
        const docs = [];
        for (const request of requests) { const result = await upload(request); status(result, 200); docs.push(result.json.entry); }
        [firstDoc, cardBack, policeOne, policeTwo] = docs;
        assert.equal(firstDoc.description, 'Cédula 1 · Frente');
        assert.equal(cardBack.description, 'Cédula 1 · Dorso');
        assert.ok(docs.every(doc => typeof doc.description === 'string' && doc.description.length > 0));
        assert.ok(docs.every(doc => !doc.issuedAt), 'the buyer no longer needs to declare issuance dates');
        const data = await pub(withToken, 'GET', '/session', undefined, buyerOne); status(data, 200);
        assert.equal(data.json.tradeIns[0].id, tid); assert.equal(data.json.tradeIns[0].carId, null);
        assert.deepEqual(data.json.progress, { completed: 2, total: 6 });
        const groups = data.json.tradeIns[0].groups;
        assert.equal(groups.filter(group => group.entries.length > 0).length, 2);
        assert.equal(groups.flatMap(group => group.entries).length, 4);
        assert.equal(await env.models.Car.countDocuments(), before, 'documents do not create available stock');
        assert.equal((await pub(withToken, 'GET', '/session', undefined, buyerOne)).json.tradeIns[0].groups.flatMap(group => group.entries).length, 4);
        const adminData = await admin('GET', `/documents?saleId=${sid}&tradeInId=${tid}`); status(adminData, 200);
        assert.equal(adminData.json.groups.flatMap(group => group.entries).length, 4);
        const stored = await BuyerPortalDocument.findById(firstDoc.id).select('+encryptedFile').lean();
        assert.equal(stored.encryptedFile.data.includes(photo.toString('base64')), false);
        assert.equal(JSON.stringify(data.json).includes('encryptedFile'), false);
    });
    await test('each file has its own review, correction, version and physical-original state', async () => {
        status(await admin('PATCH', '/documents/' + firstDoc.id, { status: 'correction_requested' }), 400);
        status(await admin('PATCH', '/documents/' + firstDoc.id, { status: 'correction_requested', reason: 'La esquina del frente está cortada.' }), 200);
        const original = await BuyerPortalDocument.findById(cardBack.id).lean();
        const replacement = await upload({ slot: 'cedula-1-front', side: 'front', description: 'Cédula 1 · Frente corregido', replacesId: firstDoc.id }); status(replacement, 200);
        assert.equal(replacement.json.entry.version, 2);
        assert.equal((await BuyerPortalDocument.findById(firstDoc.id).lean()).isCurrent, false);
        assert.equal((await BuyerPortalDocument.findById(cardBack.id).lean()).status, original.status);
        status(await admin('PATCH', '/documents/' + replacement.json.entry.id, { status: 'reviewed', reason: '' }), 200);
        status(await admin('PATCH', '/requirements/original', { saleId: sid, tradeInId: tid, requirementKey: 'title', received: true }), 200);
        assert.equal(await BuyerPortalOriginal.countDocuments({ saleId: sid, received: true }), 1);
        const data = await pub(withToken, 'GET', '/session', undefined, buyerOne); status(data, 200);
        assert.deepEqual(data.json.progress, { completed: 2, total: 6 });
        assert.equal(data.json.tradeIns[0].groups.find(group => group.key === 'title').originalReceived, true);
    });
    await test('simultaneous retries create one file; dates and descriptions are optional while invalid supplied dates and cross-sale replacements fail', async () => {
        const requestId = crypto.randomUUID(), input = { requestId, slot: 'traffic-page-1', side: 'page', description: 'SUATS · Página 1', key: 'traffic_report' };
        const [a, b] = await Promise.all([upload(input), upload(input)]); status(a, 200); status(b, 200);
        assert.equal(a.json.entry.id, b.json.entry.id);
        assert.equal(await BuyerPortalDocument.countDocuments({ saleId: sid, requestId }), 1);
        status(await upload({ key: 'title', slot: 'bad', side: 'page', description: 'archivo', buffer: Buffer.from('<svg onload="alert(1)">') }), 400);
        const domain = await upload({ key: 'domain_report', slot: 'domain-1', side: 'page' }); status(domain, 200);
        assert.ok(domain.json.entry.description);
        assert.equal(Boolean(domain.json.entry.issuedAt), false);
        status(await upload({ key: 'domain_report', slot: 'domain-bad-date', side: 'page', issuedAt: '2026-99-99' }), 400);
        const optionalData = await pub(withToken, 'GET', '/session', undefined, buyerOne); status(optionalData, 200);
        assert.equal(optionalData.json.tradeIns[0].groups.find(group => group.key === 'domain_report').complete, true);
        status(await upload({ key: 'formulario08', slot: '08', side: 'page', description: '08' }), 400);
        status(await upload({ link: withoutToken, session: buyerTwo, slot: 'cedula-1-front', side: 'front', description: 'intento de otra venta' }), 403);
        status(await pub(withoutToken, 'POST', '/documents/' + cardBack.id + '/access', {}, buyerTwo), 404);
        assert.equal((await pub(withoutToken, 'GET', '/session', undefined, buyerTwo)).json.tradeIns.length, 0);
    });
    await test('signed access expires and is revoked immediately; admin logout invalidates its signed access', async () => {
        const access = await pub(withToken, 'POST', '/documents/' + cardBack.id + '/access', {}, buyerOne); status(access, 200);
        const response = await fetch(env.base + access.json.url); assert.equal(response.status, 200);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), photo);
        assert.match(response.headers.get('cache-control'), /no-store/);
        assert.match(response.headers.get('content-security-policy'), /sandbox/);
        const parsedAccess = new URL(access.json.url, env.base), claims = jwt.decode(parsedAccess.searchParams.get('access'));
        const documentKey = crypto.createHash('sha256').update(process.env.BUYER_PORTAL_DOCUMENT_KEY).digest();
        const portalSigningKey = crypto.createHmac('sha256', documentKey).update('autosporting:buyer-portal-signing:v1').digest('hex');
        const expiredAccess = jwt.sign({ ...claims, exp: Math.floor(Date.now() / 1000) - 1 }, portalSigningKey, { algorithm: 'HS256' });
        parsedAccess.searchParams.set('access', expiredAccess);
        assert.equal((await fetch(parsedAccess)).status, 401);
        status(await env.call('GET', '/api/buyer-portal/files/' + cardBack.id), 401);
        const adminAccess = await admin('POST', '/documents/' + cardBack.id + '/access', {}); status(adminAccess, 200);
        assert.equal((await fetch(env.base + adminAccess.json.url)).status, 200);
        status(await admin('DELETE', '/sales/' + sid), 200);
        assert.equal((await fetch(env.base + access.json.url)).status, 401);
        status(await pub(withToken, 'GET', '/session', undefined, buyerOne), 404);
        const renewed = await admin('PUT', '/sales/' + sid, {}); status(renewed, 200);
        assert.notEqual(renewed.json.url.split('/').at(-1), withToken);
        withToken = renewed.json.url.split('/').at(-1);
        buyerOne = await login(withToken, portalFixture.buyerOneEmail);
        assert.equal((await pub(withToken, 'GET', '/session', undefined, buyerOne)).json.tradeIns[0].groups.flatMap(group => group.entries).length, 7);
        status(await env.call('POST', '/api/logout', {}, fixture.sessions[0].token), 204);
        assert.equal((await fetch(env.base + adminAccess.json.url)).status, 401);
    });
    await test('the same legajo follows the trade-in into stock and reflects real Sale/Gestoria updates once', async () => {
        const session = await (await import('../../src/services/authSessionService.js')).createLoginSession(fixture.users[0]);
        const received = await env.call('POST', `/api/admin/sales/${sid}/trade-ins/0/create-stock-car`, {}, session.token); status(received, 200);
        const carId = String(received.json.car._id);
        const legajo = await admin('GET', '/documents?carId=' + carId, undefined, session.token); status(legajo, 200);
        assert.equal(legajo.json.saleId, sid); assert.equal(legajo.json.tradeInId, tid);
        assert.equal(legajo.json.groups.flatMap(group => group.entries).length, 7);
        await env.models.Sale.updateOne({ _id: sid }, { $set: { deliveryStatus: 'listo_para_entregar' } });
        await env.models.Gestoria.updateOne({ saleId: sid }, { $set: { status: 'Transferido' } });
        const updated = await pub(withToken, 'GET', '/session', undefined, buyerOne); status(updated, 200);
        assert.equal(updated.json.deliveryStatus, 'listo_para_entregar'); assert.equal(updated.json.procedureStatus, 'Transferido');
        assert.equal(updated.json.tradeIns[0].carId, carId);
        status(await admin('PATCH', '/sales/' + sid + '/tracking', { latestUpdate: 'Tu vehículo está listo.', nextStep: 'Coordiná la entrega.', actionRequired: true }, session.token), 200);
        assert.equal((await pub(withToken, 'GET', '/session', undefined, buyerOne)).json.latestUpdate, 'Tu vehículo está listo.');
    });
    await test('mail failure, expired challenges and changed buyer contact never grant access', async () => {
        await clearThrottle();
        EmailAdapter.sendEmail = async () => { throw new Error('test mail failure'); };
        status(await pub(withoutToken, 'POST', '/challenge', {}), 503);
        assert.equal(await BuyerPortalChallenge.countDocuments({ portalId: otherSid, consumedAt: null }), 0);
        EmailAdapter.sendEmail = async (to, subject, html) => { mails.push({ to, subject, html }); return { accepted: [to], rejected: [] }; };
        await clearThrottle();
        const challenge = await pub(withoutToken, 'POST', '/challenge', {}); status(challenge, 200);
        const code = mails.at(-1).html.match(/>\s*(\d{6})\s*</)[1];
        await BuyerPortalChallenge.updateOne({ _id: challenge.json.challengeId }, { $set: { expiresAt: new Date(0) } });
        status(await pub(withoutToken, 'POST', '/verify', { challengeId: challenge.json.challengeId, code }), 401);
        const sale = await env.models.Sale.findById(otherSid).lean();
        await env.models.Client.updateOne({ _id: sale.clientId }, { $set: { email: 'nuevo@example.test' } });
        status(await pub(withoutToken, 'GET', '/session', undefined, buyerTwo), 401);
        const day = Math.floor(Date.now() / 86400000);
        const bucketId = crypto.createHash('sha256').update(`buyer-code:nuevo@example.test:${day}`).digest('hex');
        await BuyerPortalRate.create({ _id: bucketId, count: 10, expiresAt: new Date(Date.now() + 86400000) });
        await clearThrottle(); status(await pub(withoutToken, 'POST', '/challenge', {}), 429);
    });
    console.log(`PASS: ${passed} isolated buyer portal scenarios.`);
} finally { await env.stop(); }
