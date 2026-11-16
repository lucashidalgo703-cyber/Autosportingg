// Loopback-only disposable fixtures. No employee, customer or production data.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('hex');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { seedBuyerPortalFixtures } = await import('../fixtures/buyerPortalFixtures.js');
    const { createBuyerPortalIndexes } = await import('../../src/services/buyerPortalService.js');
    const { approximatePortalLocation, describePortalDevice } = await import('../../src/services/buyerPortalAccessService.js');
    const { createLoginSession } = await import('../../src/services/authSessionService.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const fixture = await seedMobileCrm(env.models);
    const buyers = await seedBuyerPortalFixtures(env.models, fixture);
    await createBuyerPortalIndexes();
    const mailbox = [];
    EmailAdapter.sendEmail = async (to, subject, html) => {
        assert.equal(to, buyers.buyerOneEmail);
        mailbox.push({ to, subject, html }); return { accepted: [to], rejected: [] };
    };
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const ownerToken = fixture.sessions[0].token;
    const status = (result, expected) => assert.equal(result.status, expected, JSON.stringify(result.json));
    const admin = (method, suffix, body, token = ownerToken) => env.call(method,
        '/api/admin/buyer-portal/sales/' + buyers.withTradeIn + suffix, body, token);
    const configured = await admin('PUT', '', { days: 30 }); status(configured, 200);
    const link = configured.json.url.split('/').at(-1);
    const ua = 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36';
    const buyer = async (method, suffix, body, token, extraHeaders = {}) => env.call(method,
        '/api/buyer-portal/' + link + suffix, body, token, { 'User-Agent': ua, ...extraHeaders });
    const verify = async () => {
        await env.models.BuyerPortal.updateOne({ _id: buyers.withTradeIn }, { $set: { nextChallengeAt: new Date(0) } });
        const challenge = await buyer('POST', '/challenge', {}); status(challenge, 200);
        const code = mailbox.at(-1).html.match(/>\s*(\d{6})\s*</)[1];
        const response = await fetch(env.base + '/api/buyer-portal/' + link + '/verify', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: challenge.json.challengeId, code }) });
        assert.equal(response.status, 200);
        const cookie = response.headers.getSetCookie().find(value => value.startsWith('autosporting_buyer_session='));
        return decodeURIComponent(cookie.split(';')[0].split('=').slice(1).join('='));
    };
    let sessionToken, sessionId;
    const history = async token => { const result = await admin('GET', '/access', undefined, token); status(result, 200); return result.json; };

    await test('only a verified purchase view is recorded, not opening the link or completing OTP', async () => {
        assert.equal((await history()).hasViewed, false);
        status(await buyer('GET', '/info'), 200);
        status(await buyer('GET', '/session'), 401);
        status(await admin('GET', ''), 200, 'administrator preview is not a buyer visit');
        sessionToken = await verify(); sessionId = crypto.createHash('sha256').update(jwt.decode(sessionToken).sid).digest('hex');
        const session = await env.models.BuyerPortalSession.findById(sessionId).lean();
        assert.equal(session.viewCount, 0); assert.equal(session.lastViewedAt, undefined);
        assert.equal((await history()).hasViewed, false);
        const head = await fetch(env.base + '/api/buyer-portal/' + link + '/session', { method: 'HEAD', headers: { Authorization: 'Bearer ' + sessionToken } });
        assert.equal(head.status, 200);
        assert.equal((await history()).hasViewed, false, 'automatic HEAD requests are not buyer consultations');
        const viewed = await buyer('GET', '/session', undefined, sessionToken, {
            'X-Vercel-IP-Country': 'AR', 'X-Vercel-IP-City': 'Ciudad%20inventada', 'X-Forwarded-For': '203.0.113.44' });
        status(viewed, 200);
        assert.equal(viewed.json.browserSessions, undefined, 'buyer DTO cannot expose access history');
        const access = await history();
        assert.equal(access.hasViewed, true); assert.equal(access.totalViews, 1); assert.equal(access.browserSessionCount, 1);
        assert.equal(access.browserSessions[0].browser, 'Chrome'); assert.equal(access.browserSessions[0].os, 'Android');
        assert.equal(access.browserSessions[0].deviceType, 'Celular'); assert.equal(access.browserSessions[0].location, null);
        assert.ok(access.firstViewedAt); assert.ok(access.lastViewedAt);
    });
    await test('quick concurrent refreshes are coalesced while the last consultation time remains current', async () => {
        const replies = await Promise.all([1, 2, 3].map(() => buyer('GET', '/session', undefined, sessionToken)));
        for (const result of replies) status(result, 200);
        assert.equal((await history()).totalViews, 1);
        await env.models.BuyerPortalSession.updateOne({ _id: sessionId }, { $set: { lastCountedViewAt: new Date(Date.now() - 31000) } });
        status(await buyer('GET', '/session', undefined, sessionToken), 200);
        assert.equal((await history()).totalViews, 2);
    });
    await test('history requires Gestoria permission and still enforces salesperson ownership', async () => {
        fixture.users[3].permissions = ['ventas.read']; await fixture.users[3].save();
        status(await admin('GET', '/access', undefined, fixture.sessions[3].token), 403);
        const gestor = await env.models.AdminUser.create({ name: 'Gestor ficticio', email: 'gestor@example.test',
            passwordHash: fixture.users[0].passwordHash, role: 'administrativo', active: true, permissions: ['gestoria.read'] });
        const gestorSession = await createLoginSession(gestor);
        assert.equal((await history(gestorSession.token)).hasViewed, true, 'Gestoria access must not require ventas.read');
        for (const user of [fixture.users[1], fixture.users[2]]) { user.permissions = ['gestoria.read']; await user.save(); }
        assert.equal((await history(fixture.sessions[1].token)).hasViewed, true);
        status(await admin('GET', '/access', undefined, fixture.sessions[2].token), 404);
        status(await admin('GET', '/access', undefined, sessionToken), 401);
        const anonymous = await fetch(env.base + '/api/admin/buyer-portal/sales/' + buyers.withTradeIn + '/access');
        assert.equal(anonymous.status, 401);
    });
    await test('metadata is bounded and coarse, without raw agent, IP, credentials or precise location', async () => {
        const headers = { 'x-vercel-ip-country': 'AR', 'x-vercel-ip-country-region': 'U', 'x-vercel-ip-city': 'Comodoro%20Rivadavia' };
        assert.equal(approximatePortalLocation({ headers }), null, 'local lookalike headers are not trusted');
        const previous = { VERCEL: process.env.VERCEL, VERCEL_ENV: process.env.VERCEL_ENV };
        try {
            process.env.VERCEL = '1'; process.env.VERCEL_ENV = 'production';
            assert.deepEqual(approximatePortalLocation({ headers }), { country: 'AR', region: 'U', city: 'Comodoro Rivadavia' });
            assert.equal(approximatePortalLocation({ headers: { ...headers, 'x-vercel-ip-city': '%3Cscript%3E' } }).city, '');
            assert.equal(approximatePortalLocation({ headers: { ...headers, 'x-vercel-ip-country': 'XX' } }), null);
        } finally { Object.assign(process.env, previous); }
        assert.deepEqual(describePortalDevice({ headers: { 'user-agent': '<script>private-data</script>' } }),
            { browser: 'Navegador desconocido', os: 'Sistema operativo desconocido', type: 'No identificado' });
        const record = await env.models.BuyerPortalSession.findById(sessionId).lean();
        assert.equal(record.ip, undefined); assert.equal(record.userAgent, undefined); assert.equal(record.latitude, undefined);
        const access = await history();
        const serialized = JSON.stringify(access);
        for (const secret of [sessionToken, sessionId, jwt.decode(sessionToken).sid, '203.0.113.44', ua, buyers.buyerOneEmail]) assert.equal(serialized.includes(secret), false);
        assert.deepEqual(Object.keys(access.browserSessions[0]).sort(), ['active', 'browser', 'deviceType', 'firstViewedAt', 'lastViewedAt', 'location', 'os', 'viewCount'].sort());
    });
    await test('telemetry failures cannot block a verified buyer', async () => {
        const original = env.models.BuyerPortalSession.updateOne;
        try {
            env.models.BuyerPortalSession.updateOne = () => { throw Error('Failure only in the disposable access audit'); };
            status(await buyer('GET', '/session', undefined, sessionToken), 200);
        } finally { env.models.BuyerPortalSession.updateOne = original; }
    });
    await test('logout retains the fact of a consultation, but a replaced buyer or new access generation cannot inherit it', async () => {
        const logout = await buyer('POST', '/logout', {}, sessionToken); status(logout, 200);
        const afterLogout = await history(); assert.equal(afterLogout.hasViewed, true); assert.equal(afterLogout.browserSessions[0].active, false);
        const sale = await env.models.Sale.findById(buyers.withTradeIn).lean();
        const other = await env.models.Client.create({ fullName: 'Otro cliente ficticio', email: buyers.buyerOneEmail });
        await env.models.Sale.updateOne({ _id: sale._id }, { $set: { clientId: other._id } });
        assert.equal((await history()).hasViewed, false);
        await env.models.Sale.updateOne({ _id: sale._id }, { $set: { clientId: sale.clientId } });
        status(await admin('PUT', '', { days: 30 }), 200);
        assert.equal((await history()).hasViewed, false);
    });
    console.log(`PASS: ${passed} private portal access-history scenarios.`);
} finally { await env.stop(); }
