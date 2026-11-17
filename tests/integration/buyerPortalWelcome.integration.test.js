// Disposable local clients, vehicles and mail only; never reads deployment settings.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    process.env.BUYER_PORTAL_DOCUMENT_KEY = crypto.randomBytes(48).toString('base64url');
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { seedBuyerPortalFixtures } = await import('../fixtures/buyerPortalFixtures.js');
    const { createBuyerPortalIndexes, portalData } = await import('../../src/services/buyerPortalService.js');
    const { EmailAdapter } = await import('../../src/lib/emailAdapter.js');
    const fixture = await seedMobileCrm(env.models);
    const buyers = await seedBuyerPortalFixtures(env.models, fixture);
    await createBuyerPortalIndexes();
    const mailbox = [];
    EmailAdapter.sendEmail = async (to, subject, html) => {
        assert.ok([buyers.buyerOneEmail, buyers.buyerTwoEmail].includes(to), 'no real recipient is permitted');
        mailbox.push({ to, subject, html });
        return { accepted: [to], rejected: [] };
    };
    const status = (result, expected) => assert.equal(result.status, expected, JSON.stringify(result.json));
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const admin = (method, route, body) => env.call(method, '/api/admin/buyer-portal' + route, body, fixture.sessions[0].token);
    const configured = [];
    for (const id of [buyers.withTradeIn, buyers.withoutTradeIn]) {
        const result = await admin('PUT', '/sales/' + id, {}); status(result, 200);
        configured.push(result.json);
    }
    const [withLink, withoutLink] = configured.map(item => item.url.split('/').at(-1));
    const buyer = (link, method, route, body, credential) => env.call(method, '/api/buyer-portal/' + link + route, body, credential);
    const login = async (link, email) => {
        const challenge = await buyer(link, 'POST', '/challenge', {}); status(challenge, 200);
        assert.doesNotMatch(JSON.stringify(challenge.json), /María|Juan|Pérez|Gómez|Duster|Cronos|buyerFirstName/);
        const code = mailbox.findLast(item => item.to === email).html.match(/>\s*(\d{6})\s*</)[1];
        const response = await fetch(env.base + '/api/buyer-portal/' + link + '/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challengeId: challenge.json.challengeId, code })
        });
        assert.equal(response.status, 200);
        const cookie = response.headers.getSetCookie().find(item => item.startsWith('autosporting_buyer_session='));
        assert.ok(cookie);
        return decodeURIComponent(cookie.split(';')[0].slice('autosporting_buyer_session='.length));
    };
    await test('public link information and challenges do not disclose names or purchased vehicles', async () => {
        for (const link of [withLink, withoutLink]) {
            const info = await buyer(link, 'GET', '/info'); status(info, 200);
            assert.deepEqual(Object.keys(info.json).sort(), ['maskedDestination', 'requiresVerification', 'verificationChannel'].sort());
            assert.doesNotMatch(JSON.stringify(info.json), /María|Juan|Pérez|Gómez|Duster|Cronos|buyerFirstName/);
            status(await buyer(link, 'GET', '/session'), 401);
        }
    });
    const [oneSession, twoSession] = await Promise.all([
        login(withLink, buyers.buyerOneEmail), login(withoutLink, buyers.buyerTwoEmail)
    ]);
    await test('each verified operation reads its linked buyer first name and purchased vehicle, never its trade-in', async () => {
        const one = await buyer(withLink, 'GET', '/session', undefined, oneSession); status(one, 200);
        const two = await buyer(withoutLink, 'GET', '/session', undefined, twoSession); status(two, 200);
        assert.equal(one.json.buyerFirstName, 'María José');
        assert.equal(two.json.buyerFirstName, 'Juan Ignacio');
        assert.equal(one.json.mode, 'with_trade_in');
        assert.equal(two.json.mode, 'without_trade_in');
        assert.equal(one.json.purchasedVehicle.brand, 'Renault');
        assert.equal(one.json.purchasedVehicle.model, fixture.cars[4].name);
        assert.equal(two.json.purchasedVehicle.brand, 'Fiat');
        assert.equal(two.json.purchasedVehicle.model, 'Cronos vendido portal prueba');
        assert.equal(one.json.tradeIns[0].brand, 'Toyota');
        assert.deepEqual(two.json.tradeIns, []);
        for (const data of [one.json, two.json]) {
            assert.equal(data.firstName, undefined);
            assert.equal(data.fullName, undefined);
            assert.equal(data.lastName, undefined);
            assert.equal(data.clientId, undefined);
            assert.doesNotMatch(JSON.stringify(data), /Pérez|Gómez/);
        }
        assert.equal(configured[0].preview.buyerFirstName, one.json.buyerFirstName);
        assert.equal(configured[1].preview.buyerFirstName, two.json.buyerFirstName);
    });
    await test('buyer credentials cannot read the name or vehicle behind the other operation link', async () => {
        status(await buyer(withoutLink, 'GET', '/session', undefined, oneSession), 401);
        status(await buyer(withLink, 'GET', '/session', undefined, twoSession), 401);
        const result = await buyer(withLink, 'GET', '/session?buyerFirstName=NombreInventado', undefined, oneSession);
        status(result, 200); assert.equal(result.json.buyerFirstName, 'María José');
    });
    await test('a CRM first-name correction is reflected by the same link and remembered session without regeneration', async () => {
        const before = await env.models.BuyerPortal.findById(buyers.withTradeIn).lean();
        const edited = await env.call('PATCH', '/api/admin/clients/' + buyers.buyerOneId,
            { firstName: 'María Fernanda' }, fixture.sessions[0].token);
        status(edited, 200);
        const current = await buyer(withLink, 'GET', '/session', undefined, oneSession); status(current, 200);
        assert.equal(current.json.buyerFirstName, 'María Fernanda');
        const stillOther = await buyer(withoutLink, 'GET', '/session', undefined, twoSession); status(stillOther, 200);
        assert.equal(stillOther.json.buyerFirstName, 'Juan Ignacio');
        const after = await env.models.BuyerPortal.findById(buyers.withTradeIn).lean();
        assert.equal(after.tokenHash, before.tokenHash);
        assert.equal(after.generation, before.generation);
        const configuration = await admin('GET', '/sales/' + buyers.withTradeIn); status(configuration, 200);
        assert.equal(configuration.json.url, configured[0].url);
        assert.equal(configuration.json.preview.buyerFirstName, 'María Fernanda');
    });
    await test('missing or blank firstName stays empty instead of guessing from fullName or surname', async () => {
        await env.models.Client.updateOne({ _id: buyers.buyerOneId }, { $unset: { firstName: '' } });
        let result = await buyer(withLink, 'GET', '/session', undefined, oneSession); status(result, 200);
        assert.equal(result.json.buyerFirstName, '');
        await env.models.Client.collection.updateOne({ _id: new env.mongoose.Types.ObjectId(buyers.buyerOneId) }, { $set: { firstName: '   ' } });
        result = await buyer(withLink, 'GET', '/session', undefined, oneSession); status(result, 200);
        assert.equal(result.json.buyerFirstName, '');
        const sale = await env.models.Sale.findById(buyers.withTradeIn).lean();
        assert.equal((await portalData({ ...sale, clientId: null }, { mode: 'with_trade_in' })).buyerFirstName, '');
    });
    await test('compound first names remain complete and retain their recorded internal spacing and case', async () => {
        await env.models.Client.collection.updateOne({ _id: new env.mongoose.Types.ObjectId(buyers.buyerOneId) }, { $set: { firstName: '  María  José  ' } });
        const result = await buyer(withLink, 'GET', '/session', undefined, oneSession); status(result, 200);
        assert.equal(result.json.buyerFirstName, 'María  José');
    });
    console.log(`PASS: ${passed} buyer welcome scenarios, using disposable CRM clients and no production access.`);
} finally { await env.stop(); }
