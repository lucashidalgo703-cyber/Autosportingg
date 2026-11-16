// Disposable loopback database and mailbox only. Exercises the HTTP cookie boundary.
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
    const fixture = await seedMobileCrm(env.models);
    const buyers = await seedBuyerPortalFixtures(env.models, fixture);
    await createBuyerPortalIndexes();
    const mails = [];
    EmailAdapter.sendEmail = async (to, subject, html) => {
        assert.ok([buyers.buyerOneEmail, buyers.buyerTwoEmail].includes(to));
        mails.push({ to, subject, html });
        return { accepted: [to], rejected: [] };
    };
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const status = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.json));
    const admin = (method, route, body) => env.call(method, '/api/admin/buyer-portal' + route, body, fixture.sessions[0].token);
    // Production runs behind TLS termination; the isolated listener stays loopback HTTP.
    const sameOrigin = 'https://' + new URL(env.base).host;
    const request = async (token, method, suffix, { body, cookie, bearer, origin = sameOrigin } = {}) => {
        const response = await fetch(env.base + '/api/buyer-portal/' + token + suffix, { method,
            headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}),
                ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}), ...(origin ? { Origin: origin } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, json: await response.json().catch(() => ({})), headers: response.headers };
    };
    const clearThrottle = async () => {
        await env.models.GptExpenseRateLimit.deleteMany({});
        await env.models.BuyerPortal.updateMany({}, { $set: { nextChallengeAt: new Date(0) } });
        await env.models.BuyerPortalRate.deleteMany({});
    };
    const begin = async (token, email) => {
        await clearThrottle();
        const challenge = await request(token, 'POST', '/challenge', { body: {} }); status(challenge, 200);
        const code = mails.filter(item => item.to === email).at(-1).html.match(/>\s*(\d{6})\s*</)[1];
        return { challengeId: challenge.json.challengeId, code };
    };
    const login = async (token, email) => {
        const input = await begin(token, email);
        const verified = await request(token, 'POST', '/verify', { body: input }); status(verified, 200);
        const setCookie = verified.headers.getSetCookie().find(value => value.startsWith('autosporting_buyer_session='));
        assert.ok(setCookie, 'verification must set the remembered-device cookie');
        const cookie = setCookie.split(';')[0];
        const bearer = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
        return { cookie, bearer, setCookie, verified, claims: jwt.decode(bearer) };
    };
    const configured = await admin('PUT', '/sales/' + buyers.withTradeIn, { days: 7 }); status(configured, 200);
    const configuredOther = await admin('PUT', '/sales/' + buyers.withoutTradeIn, { days: 90 }); status(configuredOther, 200);
    const token = configured.json.url.split('/').at(-1), otherToken = configuredOther.json.url.split('/').at(-1);
    let deviceOne, deviceTwo, otherDevice, fileId, signedUrl;

    await test('a device is remembered only after a valid one-use code', async () => {
        status(await request(token, 'GET', '/session'), 401);
        const beforeMessages = mails.length;
        const beforeSessions = await env.models.BuyerPortalSession.countDocuments();
        status(await request(token, 'POST', '/challenge', { body: {}, origin: 'https://otra.autosportingg.com' }), 403);
        status(await request(token, 'POST', '/verify', { body: { challengeId: '000000000000000000000000', code: '123456' }, origin: 'https://otra.autosportingg.com' }), 403);
        for (const suffix of ['/challenge', '/verify']) {
            const foreign = await fetch(env.base + '/api/buyer-portal/' + token + suffix, { method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' }, body: '{}' });
            assert.equal(foreign.status, 403);
        }
        assert.equal(mails.length, beforeMessages, 'cross-origin requests cannot cause verification emails');
        assert.equal(await env.models.BuyerPortalSession.countDocuments(), beforeSessions, 'cross-origin verification cannot create a session');
        const input = await begin(token, buyers.buyerOneEmail);
        const wrong = await request(token, 'POST', '/verify', { body: { ...input, code: input.code === '000000' ? '000001' : '000000' } });
        status(wrong, 401); assert.equal(wrong.headers.getSetCookie().length, 0);
        const verified = await request(token, 'POST', '/verify', { body: input }); status(verified, 200);
        assert.equal(verified.json.sessionToken, undefined, 'the browser must not receive an auth token in JSON');
        status(await request(token, 'POST', '/verify', { body: input }), 401);
        status(await request(token, 'GET', '/session'), 401, 'a request without its device cookie stays anonymous');
    });
    await test('persistent HttpOnly cookies are scoped to one portal and expire within its link and 30 days', async () => {
        deviceOne = await login(token, buyers.buyerOneEmail);
        deviceTwo = await login(token, buyers.buyerOneEmail);
        otherDevice = await login(otherToken, buyers.buyerTwoEmail);
        assert.match(deviceOne.setCookie, /HttpOnly/i);
        assert.match(deviceOne.setCookie, /Secure/i);
        assert.match(deviceOne.setCookie, /SameSite=Lax/i);
        assert.ok(deviceOne.setCookie.includes('Path=/api/buyer-portal/' + token));
        assert.match(deviceOne.setCookie, /Expires=/i);
        assert.match(deviceOne.setCookie, /Max-Age=\d+/i);
        assert.ok(deviceOne.claims.sid);
        assert.ok(deviceOne.claims.exp * 1000 <= Date.parse(configured.json.expiresAt));
        assert.ok(deviceOne.claims.exp * 1000 > Date.now() + 6 * 86400000);
        assert.ok(otherDevice.claims.exp * 1000 <= Date.now() + 30 * 86400000);
        assert.ok(otherDevice.claims.exp * 1000 > Date.now() + 29 * 86400000);
        const restored = await request(token, 'GET', '/session', { cookie: deviceOne.cookie }); status(restored, 200);
        assert.equal(Date.parse(restored.json.sessionExpiresAt), deviceOne.claims.exp * 1000);
        assert.ok(restored.json.purchasedVehicle);
        status(await request(otherToken, 'GET', '/session', { cookie: deviceOne.cookie }), 401);
        status(await request(token, 'GET', '/session', { cookie: 'autosporting_buyer_session=invalid' }), 401);
        const adminResponse = await fetch(env.base + '/api/admin/cars', { headers: { Cookie: deviceOne.cookie } });
        assert.equal(adminResponse.status, 401, 'remembering a buyer never signs them into the CRM');
    });
    await test('cookie-backed uploads require a same-origin request and preserve private document access', async () => {
        const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
        const data = new FormData();
        for (const [name, value] of Object.entries({ requirementKey: 'title', tradeInId: buyers.tradeInId,
            slot: 'title-page-1', side: 'page', description: 'Título ficticio', requestId: crypto.randomUUID() })) data.set(name, value);
        data.set('file', new Blob([photo], { type: 'image/jpeg' }), 'titulo-ficticio.jpg');
        const uploaded = await fetch(env.base + '/api/buyer-portal/' + token + '/documents', { method: 'POST',
            headers: { Cookie: deviceOne.cookie, Origin: sameOrigin }, body: data });
        assert.equal(uploaded.status, 200); fileId = (await uploaded.json()).entry.id;
        const before = await env.models.BuyerPortalDocument.countDocuments();
        status(await request(token, 'POST', '/documents/' + fileId + '/access', { body: {}, cookie: deviceOne.cookie, origin: 'https://otra.autosportingg.com' }), 403);
        status(await request(token, 'POST', '/documents/' + fileId + '/access', { body: {}, cookie: deviceOne.cookie, origin: null }), 403);
        assert.equal(await env.models.BuyerPortalDocument.countDocuments(), before);
        const access = await request(token, 'POST', '/documents/' + fileId + '/access', { body: {}, cookie: deviceOne.cookie }); status(access, 200);
        signedUrl = access.json.url;
        const file = await fetch(env.base + signedUrl); assert.equal(file.status, 200);
        assert.deepEqual(Buffer.from(await file.arrayBuffer()), photo);
    });
    await test('closing one device revokes its cookie, copied bearer and signed files while another device remains active', async () => {
        const logout = await request(token, 'POST', '/logout', { body: {}, cookie: deviceOne.cookie }); status(logout, 200);
        assert.match(logout.headers.getSetCookie().join(';'), /Expires=Thu, 01 Jan 1970/i);
        status(await request(token, 'GET', '/session', { cookie: deviceOne.cookie }), 401);
        status(await request(token, 'GET', '/session', { bearer: deviceOne.bearer }), 401);
        assert.equal((await fetch(env.base + signedUrl)).status, 401, 'logout must revoke already-issued signed access');
        status(await request(token, 'GET', '/session', { cookie: deviceTwo.cookie }), 200);
        status(await request(otherToken, 'GET', '/session', { cookie: otherDevice.cookie }), 200);
        status(await request(token, 'POST', '/logout', { body: {}, cookie: deviceOne.cookie }), 200, 'closing an already closed device is harmless');
    });
    await test('expired records, replaced clients, changed email and revoked links reject remembered devices and signed files', async () => {
        const expiring = await login(token, buyers.buyerOneEmail);
        await env.models.BuyerPortalSession.updateOne({ _id: crypto.createHash('sha256').update(expiring.claims.sid).digest('hex') }, { $set: { expiresAt: new Date(0) } });
        status(await request(token, 'GET', '/session', { cookie: expiring.cookie }), 401);
        const sale = await env.models.Sale.findById(buyers.withTradeIn).lean();
        const sameEmailClient = await env.models.Client.create({ fullName: 'Otro comprador con el mismo correo ficticio', email: buyers.buyerOneEmail, status: 'activo' });
        const access = await request(token, 'POST', '/documents/' + fileId + '/access', { body: {}, cookie: deviceTwo.cookie }); status(access, 200);
        await env.models.Sale.updateOne({ _id: sale._id }, { $set: { clientId: sameEmailClient._id } });
        status(await request(token, 'GET', '/session', { cookie: deviceTwo.cookie }), 401);
        assert.equal((await fetch(env.base + access.json.url)).status, 401, 'replacing the buyer must revoke files even when their email is unchanged');
        await env.models.Sale.updateOne({ _id: sale._id }, { $set: { clientId: sale.clientId } });
        await env.models.Client.updateOne({ _id: sale.clientId }, { $set: { email: 'nuevo@example.test' } });
        status(await request(token, 'GET', '/session', { cookie: deviceTwo.cookie }), 401);
        status(await admin('DELETE', '/sales/' + buyers.withoutTradeIn), 200);
        status(await request(otherToken, 'GET', '/session', { cookie: otherDevice.cookie }), 404);
    });
    console.log(`PASS: ${passed} remembered buyer-device HTTP scenarios.`);
} finally { await env.stop(); }
