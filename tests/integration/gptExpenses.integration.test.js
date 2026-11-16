import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'node:crypto';
import { once } from 'node:events';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica({ listen: false });
const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
const fixture = await seedMobileCrm(env.models);
const { createGptExpenseRouter } = await import('../../src/routes/gptExpenseRoutes.js');
const { createGptExpenseIndexes } = await import('../../src/services/gptExpenseService.js');
await createGptExpenseIndexes();
const { Account, Car, Transaction, TreasuryBox, AuditLog, GptExpenseDraft, AdminUser } = env.models;
const app = express();
app.use(express.json());
app.use('/api/gpt', createGptExpenseRouter({ publicOrigin: 'https://crm.example.test', authenticateGpt: async (req, res, next) => {
    // This test adapter only supplies actors. Root's consolidated test exercises
    // the production OAuth/email-session authentication on the real server.
    const id = req.get('x-fixture-user');
    const user = id && /^[a-f0-9]{24}$/.test(id) ? await AdminUser.findById(id).lean() : null;
    if (!user) return res.status(401).json({ message: 'Login requerido' });
    req.user = { ...user, id: String(user._id), username: user.name };
    next();
} }));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const user = fixture.users[0];
const call = async (method, route, body, actor = user) => {
    const r = await fetch(base + '/api/gpt' + route, { method, headers: { 'Content-Type': 'application/json',
        ...(actor ? { 'x-fixture-user': String(actor._id) } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json() };
};
const expense = { kind: 'workshop', amount: 85000, currency: 'ARS', concept: 'Alineación', paymentMethod: 'efectivo',
    vehicleQuery: 'Amarok Extreme', category: 'Taller' };
const create = (payload = expense, requestId = crypto.randomUUID()) => call('POST', '/expenses/drafts', { requestId, expense: payload });
const confirm = (draft, overrides = {}) => call('POST', `/expenses/drafts/${draft.draftId}/confirm`, { version: draft.version, confirmed: true, ...overrides });
const assertStatus = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.json));
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log(`ok ${passed} - ${name}`); }
try {
    await test('anonymous and sales accounts cannot read or write financial action data', async () => {
        assertStatus(await call('GET', '/expenses/context', undefined, null), 401);
        assertStatus(await call('GET', '/expenses/context', undefined, fixture.users[1]), 403);
        assertStatus(await call('POST', '/expenses/drafts', { requestId: crypto.randomUUID(), expense }, fixture.users[3]), 403);
    });
    await test('context searches every inventory page by version/year/plate and discloses no balances', async () => {
        const first = await call('GET', '/expenses/context?vehicleQuery=Amarok%20Extreme&limit=1&page=1');
        const second = await call('GET', '/expenses/context?vehicleQuery=Amarok%20Extreme&limit=1&page=2');
        assertStatus(first, 200); assertStatus(second, 200);
        assert.equal(first.json.vehiclePagination.total, 2);
        assert.equal(first.json.vehiclePagination.hasMore, true);
        assert.notEqual(first.json.vehicles[0].id, second.json.vehicles[0].id);
        assert(first.json.vehicles[0].label.includes('2022')); assert(second.json.vehicles[0].label.includes('QA002AA'));
        assert.equal(Object.hasOwn(first.json.accounts[0], 'balance'), false);
        const version = await call('GET', '/expenses/context?vehicleQuery=V6%202022');
        assert.equal(version.json.vehicles.length, 1);
        const plate = await call('GET', '/expenses/context?vehicleQuery=QA005AA');
        assert.equal(plate.json.vehicles[0].status, 'Vendido');
    });
    let draft;
    const requestId = crypto.randomUUID();
    await test('dictated workshop draft requests only the ambiguous unit, preserving year and plate', async () => {
        const created = await create(expense, requestId); assertStatus(created, 201); draft = created.json;
        assert.deepEqual(draft.missingFields.map((x) => x.field), ['vehicleId']);
        assert.equal(draft.missingFields[0].total, 2);
        assert(draft.missingFields[0].candidates[0].label.includes('QA001AA'));
        assert.equal(draft.payload.accountId, String(fixture.accounts[0]._id));
        const duplicate = await create(expense, requestId); assert.equal(duplicate.json.draftId, draft.draftId);
        const ready = await call('PATCH', `/expenses/drafts/${draft.draftId}`, { version: draft.version, expense: { vehicleId: String(fixture.cars[0]._id) } });
        assertStatus(ready, 200); draft = ready.json;
        assert.equal(draft.readyToConfirm, true); assert.equal(draft.missingFields.length, 0);
        assert(draft.summary.includes('$85.000 ARS')); assert(draft.summary.includes('Alineación'));
        assertStatus(await confirm(draft, { version: 1 }), 409);
        assertStatus(await confirm(draft, { confirmed: false }), 400);
    });
    await test('workshop double tap commits one expense, one unit cost, one account debit and one treasury effect', async () => {
        const box = await TreasuryBox.create({ key: 'postventa', name: 'Taller prueba', balanceARS: 150000 });
        const [first, second] = await Promise.all([confirm(draft), confirm(draft)]);
        assertStatus(first, 200); assertStatus(second, 200);
        assert.equal(first.json.movementId, second.json.movementId);
        assert.equal(first.json.url, second.json.url);
        assert(first.json.url.startsWith('https://crm.example.test/admin/finanzas?tab=taller&movement='));
        assert.equal(first.json.accountDebited, true);
        assert.equal(await Transaction.countDocuments({ idempotencyKey: `gpt-expense:${draft.draftId}` }), 1);
        assert.equal((await Account.findById(fixture.accounts[0]._id)).balance, 915000);
        const car = await Car.findById(fixture.cars[0]._id);
        assert.equal(car.expenses.length, 1); assert.equal(String(car.expenses[0]._id), first.json.movementId);
        assert.equal(car.expenses[0].amount, 85000);
        assert.equal(car.auditLog.filter((e) => e.action === 'GASTO').length, 1);
        const treasury = await TreasuryBox.findById(box._id);
        assert.equal(treasury.balanceARS, 65000);
        assert.equal(treasury.history.filter((h) => h.sourceExpenseId?.toString() === first.json.movementId).length, 1);
        assert.equal(await AuditLog.countDocuments({ entityId: first.json.movementId, action: 'MOVIMIENTO_CREADO' }), 1);
        const replay = await create(expense, requestId); assert.equal(replay.json.movementId, first.json.movementId);
        const other = fixture.users[2];
        await AdminUser.updateOne({ _id: other._id }, { $set: { role: 'admin' } });
        assertStatus(await call('POST', `/expenses/drafts/${draft.draftId}/confirm`, { version: draft.version, confirmed: true }, other), 404);
    });
    await test('transfer ambiguity asks only which real bank account paid', async () => {
        const created = await create({ kind: 'operational', amount: 12000, currency: 'ARS', concept: 'Internet prueba',
            paymentMethod: 'transferencia', category: 'Gastos Varios' });
        assertStatus(created, 201);
        assert.deepEqual(created.json.missingFields.map((m) => m.field), ['accountId']);
        assert.equal(created.json.nextQuestion.candidates.length, 2);
        const edited = await call('PATCH', `/expenses/drafts/${created.json.draftId}`, { version: created.json.version,
            expense: { accountId: String(fixture.accounts[1]._id), amount: 12500 } });
        assertStatus(edited, 200); assert.equal(edited.json.readyToConfirm, true);
        assert(edited.json.summary.includes('$12.500 ARS'));
    });
    await test('distinct simultaneous expenses debit their shared account without lost updates', async () => {
        const common = { kind: 'operational', currency: 'ARS', concept: 'Servicios concurrentes prueba',
            paymentMethod: 'transferencia', category: 'Gastos Varios', accountId: String(fixture.accounts[2]._id) };
        const [a, b] = await Promise.all([create({ ...common, amount: 101.5 }), create({ ...common, amount: 202.5 })]);
        assertStatus(a, 201); assertStatus(b, 201);
        const [ar, br] = await Promise.all([confirm(a.json), confirm(b.json)]);
        assertStatus(ar, 200); assertStatus(br, 200);
        assert.notEqual(ar.json.movementId, br.json.movementId);
        assert.equal((await Account.findById(fixture.accounts[2]._id)).balance, 2999696);
        const requestId = crypto.randomUUID();
        const [first, retry] = await Promise.all([create({ ...common, amount: 300 }, requestId), create({ ...common, amount: 300 }, requestId)]);
        assertStatus(first, 201); assertStatus(retry, 201);
        assert.equal(first.json.draftId, retry.json.draftId);
        assert.equal(await GptExpenseDraft.countDocuments({ userId: user._id, requestId }), 1);
    });
    await test('editing a version invalidates an earlier confirmation and expired drafts cannot be committed', async () => {
        const created = await create({ kind: 'operational', amount: 1500, currency: 'ARS', concept: 'Prueba vencimiento',
            paymentMethod: 'efectivo', category: 'Gastos Varios' });
        assertStatus(created, 201);
        await GptExpenseDraft.updateOne({ _id: created.json.draftId }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        assertStatus(await confirm(created.json), 410);
        assert.equal(await Transaction.countDocuments({ idempotencyKey: `gpt-expense:${created.json.draftId}` }), 0);
    });
    await test('a failed mandatory audit rolls back the draft, financial movement, account, vehicle and treasury', async () => {
        const created = await create({ ...expense, vehicleQuery: 'QA002AA' });
        assertStatus(created, 201); assert.equal(created.json.readyToConfirm, true);
        const original = AuditLog.prototype.save;
        AuditLog.prototype.save = async function(...args) {
            if (this.metadata?.draftId === created.json.draftId) throw new Error('Simulated isolated audit persistence failure');
            return original.apply(this, args);
        };
        let failed;
        try { failed = await confirm(created.json); } finally { AuditLog.prototype.save = original; }
        assertStatus(failed, 500);
        assert.equal((await Account.findById(fixture.accounts[0]._id)).balance, 915000);
        assert.equal((await Car.findById(fixture.cars[1]._id)).expenses.length, 0);
        assert.equal((await TreasuryBox.findOne({ key: 'postventa' })).balanceARS, 65000);
        assert.equal((await GptExpenseDraft.findById(created.json.draftId)).status, 'draft');
        assert.equal(await Transaction.countDocuments({ idempotencyKey: `gpt-expense:${created.json.draftId}` }), 0);
        // Same draft can safely be retried after the transient downstream failure.
        assertStatus(await confirm(created.json), 200);
        assert.equal((await Account.findById(fixture.accounts[0]._id)).balance, 830000);
    });
    await test('deferred card expenses remain pending without a bank debit and paid card expenses debit once', async () => {
        const card = { kind: 'card', amount: 1000, currency: 'ARS', concept: 'Insumos tarjeta prueba',
            paymentMethod: 'tarjeta', accountId: String(fixture.accounts[1]._id) };
        let created = await create(card); assertStatus(created, 201);
        assert.deepEqual(created.json.missingFields.map((m) => m.field), ['cardTiming']);
        const edited = await call('PATCH', `/expenses/drafts/${created.json.draftId}`, { version: created.json.version, expense: { cardTiming: 'deferred' } });
        const result = await confirm(edited.json); assertStatus(result, 200);
        assert.equal(result.json.accountDebited, false); assert.equal(result.json.movementStatus, 'pendiente');
        assert(result.json.summary.includes('sin débito'));
        assert.equal((await Account.findById(fixture.accounts[1]._id)).balance, 2000000);
        assert.equal((await TreasuryBox.findOne({ key: 'deudas' })).pendingCommitmentsARS, 1000);
        created = await create({ ...card, amount: 2000, cardTiming: 'paid' }); assertStatus(created, 201);
        const [first, retry] = await Promise.all([confirm(created.json), confirm(created.json)]);
        assertStatus(first, 200); assert.equal(first.json.movementId, retry.json.movementId);
        assert.equal(first.json.movementStatus, 'activo');
        assert.equal((await Account.findById(fixture.accounts[1]._id)).balance, 1998000);
        assert.equal((await Transaction.findById(first.json.movementId)).category, 'Tarjeta');
    });
    await test('server validates amounts, currencies, active references, version and current permissions', async () => {
        assertStatus(await create({ ...expense, amount: 0 }), 400);
        assertStatus(await create({ ...expense, amount: true }), 400);
        assertStatus(await create({ ...expense, currency: 'EUR' }), 400);
        assertStatus(await create({ ...expense, status: 'activo' }), 400);
        const created = await create({ kind: 'operational', amount: 200, currency: 'ARS', concept: 'Cuenta inactiva',
            category: 'Gastos Varios', paymentMethod: 'transferencia', accountId: String(fixture.accounts[2]._id) });
        await Account.updateOne({ _id: fixture.accounts[2]._id }, { $set: { isActive: false } });
        const response = await confirm(created.json); assertStatus(response, 409);
        assert.equal(await Transaction.countDocuments({ idempotencyKey: `gpt-expense:${created.json.draftId}` }), 0);
        await AdminUser.updateOne({ _id: user._id }, { $set: { role: 'solo_lectura' } });
        assertStatus(await confirm(draft), 403);
    });
    console.log(`\n${passed} focused expense integration checks passed against disposable replica set.`);
} finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await env.stop();
}
