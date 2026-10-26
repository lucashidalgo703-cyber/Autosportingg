import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { boot } from './harness.js';

const { call, test, finish, makeToken, ownerId } = await boot();

await test('Auth real: sin token responde 401', async () => {
    assert.equal((await call('GET', '/api/admin/auth/me', null, '')).status, 401);
});
await test('Auth real: firma fabricada responde 403', async () => {
    const fake = jwt.sign({ id: ownerId, role: 'owner' }, 'fixture-wrong-signing-key', { expiresIn: '1h' });
    assert.equal((await call('GET', '/api/admin/auth/me', null, fake)).status, 403);
});
await test('Auth real: token expirado responde 403', async () => {
    const expired = jwt.sign({ id: ownerId, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: -60 });
    assert.equal((await call('GET', '/api/admin/auth/me', null, expired)).status, 403);
});
await test('Auth real: sesión legítima responde 200 y contrato publicado', async () => {
    const result = await call('GET', '/api/admin/auth/me', null, makeToken('owner'));
    assert.equal(result.status, 200);
    assert.equal(result.json.ok, true);
    assert.equal(result.json.user.id, ownerId);
    assert.equal(result.json.user.role, 'owner');
    assert.equal(result.json.hasValidObjectId, true);
});
await finish();
