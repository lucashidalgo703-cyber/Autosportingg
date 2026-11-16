import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica({ listen: false });
let passed = 0;
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    const { validateLoginSession } = await import('../../src/services/authSessionService.js');
    const { createExpenseMovement } = await import('../../src/services/expenseCreationService.js');
    const { mutateLinkedExpense } = await import('../../src/services/linkedExpenseMutationService.js');
    const user = await validateLoginSession(fixture.sessions[0].token);
    const { Transaction, Account, Car, TreasuryBox } = env.models;
    const accountId = String(fixture.accounts[0]._id);
    const otherAccountId = String(fixture.accounts[1]._id);
    const vehicleId = String(fixture.cars[0]._id);
    const balances = async () => (await Account.find().sort({ _id: 1 }).lean()).map(account => [String(account._id), account.balance]);
    const balance = async id => (await Account.findById(id).lean()).balance;
    const current = id => Transaction.findById(id).lean();
    const mutate = (id, patch) => mutateLinkedExpense({ id: String(id), patch, user });
    const annul = id => mutateLinkedExpense({ id: String(id), annul: true, user });
    const cost = async id => (await Car.findById(vehicleId).lean()).expenses.filter(expense => String(expense._id) === String(id));
    const test = async (name, fn) => { await fn(); console.log(`ok ${++passed} - ${name}`); };
    const create = async (overrides = {}) => {
        const session = await env.mongoose.startSession();
        let tx;
        try {
            await session.withTransaction(async () => {
                tx = await createExpenseMovement({ payload: { kind: 'workshop', amount: 1000, currency: 'ARS',
                    date: '2026-11-16', concept: 'Reparación prueba sin cuenta', paymentMethod: 'efectivo',
                    accountUnassigned: true, vehicleId, category: 'Taller', ...overrides },
                    user, draftId: crypto.randomUUID(), origin: 'crm_dictation', session });
            });
            return await current(tx._id);
        } finally { await session.endSession(); }
    };

    let boxKey;
    await test('paid expense without account remains active and records its cost without changing any account', async () => {
        const before = await balances();
        const item = await create();
        boxKey = item.treasuryBoxKey;
        assert.equal(item.status, 'activo');
        assert.equal(item.accountAssignmentStatus, 'pending');
        assert.equal(item.accountDebitApplied, false);
        assert.equal(item.accountId, undefined);
        assert.equal(item.linkedExpenseTreasuryEffect.recorded, true);
        assert.deepEqual(await balances(), before);
        assert.equal((await cost(item._id)).length, 1);
        await annul(item._id);
    });
    await test('editing an unassigned expense preserves the absence of an account and synchronizes its cost', async () => {
        const item = await create();
        const before = await balances();
        const updated = await mutate(item._id, { amount: 1500, concept: 'Reparación corregida' });
        assert.equal(updated.amount, 1500);
        assert.equal(updated.accountAssignmentStatus, 'pending');
        assert.equal(updated.accountDebitApplied, false);
        assert.equal((await cost(item._id))[0].amount, 1500);
        assert.deepEqual(await balances(), before);
        await annul(item._id);
    });
    await test('wrong currency, inactive account and conflicting assignment are rejected without partial effects', async () => {
        const item = await create();
        const before = await balances();
        await assert.rejects(mutate(item._id, { accountId: String(fixture.accounts[3]._id) }), /moneda/);
        await Account.updateOne({ _id: otherAccountId }, { $set: { isActive: false } });
        await assert.rejects(mutate(item._id, { accountId: otherAccountId }), /activa/);
        await Account.updateOne({ _id: otherAccountId }, { $set: { isActive: true } });
        await assert.rejects(mutate(item._id, { accountId, accountUnassigned: true }), /Elegí una cuenta/);
        assert.deepEqual(await balances(), before);
        assert.equal((await current(item._id)).accountAssignmentStatus, 'pending');
        await annul(item._id);
    });
    await test('concurrent assignment requests debit the selected account once and leave Treasury untouched', async () => {
        await TreasuryBox.updateOne({ key: boxKey }, { $set: { balanceARS: 50000 } });
        const item = await create();
        const before = await balance(accountId);
        const strategicBefore = await TreasuryBox.findOne({ key: boxKey }).lean();
        await Promise.all([mutate(item._id, { accountId }), mutate(item._id, { accountId })]);
        assert.equal(await balance(accountId), before - item.amount);
        assert.equal((await current(item._id)).accountDebitApplied, true);
        assert.equal((await current(item._id)).accountAssignmentStatus, 'assigned');
        assert.equal((await TreasuryBox.findOne({ key: boxKey }).lean()).balanceARS, strategicBefore.balanceARS);
        assert.equal((await cost(item._id)).length, 1);
        await annul(item._id);
        assert.equal(await balance(accountId), before);
    });
    await test('concurrent different assignments leave a single debit on the final account', async () => {
        const item = await create();
        const beforeFirst = await balance(accountId), beforeOther = await balance(otherAccountId);
        await Promise.all([mutate(item._id, { accountId }), mutate(item._id, { accountId: otherAccountId })]);
        const updated = await current(item._id);
        assert.equal((beforeFirst - await balance(accountId)) + (beforeOther - await balance(otherAccountId)), item.amount);
        assert.equal(await balance(String(updated.accountId)), (String(updated.accountId) === accountId ? beforeFirst : beforeOther) - item.amount);
        await annul(item._id);
        assert.equal(await balance(accountId), beforeFirst);
        assert.equal(await balance(otherAccountId), beforeOther);
    });
    await test('explicit unassignment refunds once and reassignment debits once without changing payment status', async () => {
        const before = await balance(accountId);
        const item = await create({ accountId, accountUnassigned: false });
        assert.equal(await balance(accountId), before - item.amount);
        await assert.rejects(mutate(item._id, { accountId: null }), /moneda/);
        await mutate(item._id, { accountId: null, accountUnassigned: true });
        await mutate(item._id, { accountUnassigned: true });
        const unassigned = await current(item._id);
        assert.equal(unassigned.status, 'activo');
        assert.equal(unassigned.accountDebitApplied, false);
        assert.equal(await balance(accountId), before);
        await mutate(item._id, { accountId, accountUnassigned: false });
        await mutate(item._id, { accountId, accountUnassigned: false });
        assert.equal(await balance(accountId), before - item.amount);
        await annul(item._id);
        assert.equal(await balance(accountId), before);
    });
    await test('deferred card spending stays unpaid independently of account assignment', async () => {
        const before = await balance(accountId);
        const item = await create({ paymentMethod: 'tarjeta', cardTiming: 'deferred' });
        assert.equal(item.status, 'pendiente');
        assert.equal(item.linkedExpenseTreasuryEffect.pendingApplied, item.amount);
        await mutate(item._id, { accountId });
        assert.equal(await balance(accountId), before);
        assert.equal((await current(item._id)).accountDebitApplied, false);
        await mutate(item._id, { status: 'activo' });
        await mutate(item._id, { status: 'activo' });
        assert.equal(await balance(accountId), before - item.amount);
        await annul(item._id);
        assert.equal(await balance(accountId), before);
    });
    await test('annulling an unassigned paid expense refunds only its recorded Treasury effect and never an account', async () => {
        await TreasuryBox.updateOne({ key: boxKey }, { $set: { balanceARS: 500 } });
        const before = await balances();
        const item = await create();
        assert.equal(item.linkedExpenseTreasuryEffect.debitApplied, 500);
        await TreasuryBox.updateOne({ key: boxKey }, { $inc: { balanceARS: 700 } });
        await annul(item._id);
        await annul(item._id);
        assert.equal((await TreasuryBox.findOne({ key: boxKey }).lean()).balanceARS, 1200);
        assert.deepEqual(await balances(), before);
        assert.equal((await cost(item._id)).length, 0);
    });
    await test('existing managed debits without the new field still refund and unrelated transactions still require an account', async () => {
        const before = await balance(accountId);
        const item = await create({ accountId, accountUnassigned: false });
        await Transaction.updateOne({ _id: item._id }, { $unset: { accountDebitApplied: 1, accountAssignmentStatus: 1 } });
        assert.equal((await Transaction.findById(item._id)).accountDebitApplied, undefined);
        await annul(item._id);
        assert.equal(await balance(accountId), before);
        const invalid = new Transaction({ type: 'Egreso', amount: 1, currency: 'ARS', description: 'Manual',
            concept: 'Manual', category: 'Otros', module: 'crm_v2', accountAssignmentStatus: 'pending', idempotencyKey: 'manual:123' });
        await assert.rejects(invalid.validate(), /accountId/);
    });
    console.log(`Passed ${passed} isolated linked expense account-assignment groups.`);
} finally { await env.stop(); }
