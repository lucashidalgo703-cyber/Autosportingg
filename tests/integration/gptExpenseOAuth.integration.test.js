import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixtures = await seedMobileCrm(env.models);
    const input = { client_id: process.env.GPT_EXPENSE_CLIENT_ID, redirect_uri: process.env.GPT_EXPENSE_REDIRECT_URIS,
        response_type: 'code', scope: 'expenses.write', state: 'local-state-12345' };
    const tokenInput = { client_id: input.client_id, client_secret: process.env.GPT_EXPENSE_CLIENT_SECRET,
        grant_type: 'authorization_code', redirect_uri: input.redirect_uri };
    const authorize = (overrides = {}, token = fixtures.sessions[0].token) => env.call('POST', '/api/gpt/oauth/authorize', { ...input, ...overrides }, token);
    assert.equal((await authorize({}, null)).status, 401, 'pending/absent login cannot authorize');
    assert.equal((await authorize({}, fixtures.sessions[1].token)).status, 403, 'sales-only user cannot authorize expenses');
    assert.equal((await authorize({ redirect_uri: 'https://evil.example/callback' })).status, 400);
    assert.equal((await authorize({ state: '' })).status, 400);
    assert.equal((await authorize({ scope: 'stock.write' })).status, 400);
    const authorization = await authorize();
    assert.equal(authorization.status, 200, JSON.stringify(authorization.json));
    const callback = new URL(authorization.json.redirectUrl);
    assert.equal(callback.searchParams.get('state'), input.state);
    const code = callback.searchParams.get('code');
    assert.ok(code);
    const incorrect = await env.call('POST', '/api/gpt/oauth/token', { ...tokenInput, code, client_secret: 'incorrect' });
    assert.equal(incorrect.status, 401, 'wrong client must not consume code');
    const exchanges = await Promise.all([1, 2].map(() => env.call('POST', '/api/gpt/oauth/token', { ...tokenInput, code })));
    assert.deepEqual(exchanges.map(r => r.status).sort(), [200, 400], 'authorization code consumed once');
    const grant = exchanges.find(r => r.status === 200).json;
    assert.equal(grant.scope, 'expenses.write');
    assert.ok(grant.expires_in <= 900);
    assert.equal((await env.call('GET', '/api/admin/cars', undefined, grant.access_token)).status, 401, 'delegated token cannot access general CRM');
    const stored = await env.models.GptExpenseGrant.findOne().lean();
    assert.ok(!JSON.stringify(stored).includes(grant.access_token));
    assert.ok(!JSON.stringify(stored).includes(grant.refresh_token));
    const refreshRequest = { client_id: input.client_id, client_secret: tokenInput.client_secret, grant_type: 'refresh_token', refresh_token: grant.refresh_token };
    const originalCreate = env.models.GptExpenseGrant.create;
    env.models.GptExpenseGrant.create = async () => { throw new Error('Fallo ficticio al guardar grant'); };
    try {
        assert.equal((await env.call('POST', '/api/gpt/oauth/token', refreshRequest)).status, 503);
        const stillLive = await env.models.GptExpenseGrant.findById(stored._id).lean();
        assert.equal(stillLive.revokedAt, null, 'failed grant insertion must not consume the refresh');
    } finally { env.models.GptExpenseGrant.create = originalCreate; }
    const refreshed = await env.call('POST', '/api/gpt/oauth/token', refreshRequest);
    assert.equal(refreshed.status, 200);
    assert.equal((await env.call('POST', '/api/gpt/oauth/token', refreshRequest)).status, 400, 'refresh rotated once');
    const active = await env.models.GptExpenseGrant.findById(crypto.createHash('sha256').update(refreshed.json.access_token).digest('hex')).lean();
    const session = await env.models.LoginSession.findById(active.sessionId).lean();
    assert.equal(active.expiresAt.getTime(), session.expiresAt.getTime(), 'refresh cannot extend CRM session');
    const { authenticateGpt } = await import('../../src/services/gptExpenseOAuthService.js');
    const validate = async access => {
        let status = 200, nextCalled = false;
        await authenticateGpt({ headers: { authorization: 'Bearer ' + access } }, {
            status: value => ({ json: () => { status = value; } })
        }, () => { nextCalled = true; });
        return { status, nextCalled };
    };
    assert.equal((await validate(refreshed.json.access_token)).nextCalled, true);
    await env.models.AdminUser.updateOne({ _id: fixtures.users[0]._id }, { $set: { role: 'solo_lectura' } });
    assert.equal((await validate(refreshed.json.access_token)).status, 401, 'current permission revocation is immediate');
    await env.models.AdminUser.updateOne({ _id: fixtures.users[0]._id }, { $set: { role: 'admin' } });
    await env.models.LoginSession.updateOne({ _id: active.sessionId }, { $set: { revokedAt: new Date() } });
    assert.equal((await validate(refreshed.json.access_token)).status, 401, 'logout revokes delegated access');
    assert.equal((await env.call('POST', '/api/gpt/oauth/token', { ...refreshRequest, refresh_token: refreshed.json.refresh_token })).status, 400);
    console.log('OAuth GPT: login verificado, permisos, callback, state, un solo uso, rotación, hashes y revocación OK.');
} finally { await env.stop(); }
