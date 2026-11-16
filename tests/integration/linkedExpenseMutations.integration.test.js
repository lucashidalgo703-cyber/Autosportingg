import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
let passed = 0;
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const fixture = await seedMobileCrm(env.models);
    const { createExpenseDraft, confirmExpenseDraft, createGptExpenseIndexes } = await import('../../src/services/gptExpenseService.js');
    const { validateLoginSession } = await import('../../src/services/authSessionService.js');
    await createGptExpenseIndexes();
    const user = await validateLoginSession(fixture.sessions[0].token);
    const { Transaction, Account, Car, TreasuryBox, AuditLog, AdminUser, ExpenseQuotaAssignment } = env.models;
    const call = (method, route, body) => env.call(method, route, body, fixture.sessions[0].token);
    const patch = (id, data) => call('PATCH', `/api/admin/transactions/${id}`, data);
    const annul = id => call('DELETE', `/api/admin/transactions/${id}`);
    const txById = id => Transaction.findById(id).lean();
    const cash = async () => (await Account.findById(fixture.accounts[0]._id).lean()).balance;
    const expenseOn = async (carId, txId) => (await Car.findById(carId).lean()).expenses.find(expense => String(expense._id) === String(txId));
    const test = async (name, fn) => { await fn(); passed++; console.log(`ok ${passed} - ${name}`); };
    const create = async (overrides = {}) => {
        const draft = await createExpenseDraft(user, { requestId: crypto.randomUUID(), expense: {
            kind: 'workshop', amount: 85000, currency: 'ARS', date: '2026-11-16', concept: 'Alineación seguimiento',
            paymentMethod: 'efectivo', accountId: String(fixture.accounts[0]._id), vehicleId: String(fixture.cars[0]._id), category: 'Taller', ...overrides
        } }, { origin: 'crm_dictation' });
        const result = await confirmExpenseDraft(user, draft.draftId, { version: draft.version, confirmed: true }, { req: { user } });
        return { ...result, tx: await txById(result.movementId) };
    };
    let boxKey;
    await test('annulling an unfunded strategic expense removes its unit cost and refunds cash once without inventing funds', async () => {
        const before = await cash();
        const item = await create();
        boxKey = item.tx.treasuryBoxKey;
        assert.equal(item.tx.linkedExpenseTreasuryEffect.debitApplied, 0);
        assert.equal((await annul(item.movementId)).status, 200);
        assert.equal(await cash(), before);
        assert.equal(await expenseOn(fixture.cars[0]._id, item.movementId), undefined);
        assert.equal((await TreasuryBox.findOne({ key: boxKey }).lean()).balanceARS, 0);
        assert.equal((await annul(item.movementId)).status, 200);
        assert.equal(await cash(), before);
        const recovered = await call('GET', '/api/admin/quick-expenses/drafts/' + item.draftId);
        assert.equal(recovered.json.movementStatus, 'anulado');
        assert.equal(recovered.json.accountDebited, false);
    });
    await test('partial strategic funding tracks real deltas when amount changes and refunds only actual funding', async () => {
        await TreasuryBox.updateOne({ key: boxKey }, { $set: { balanceARS: 10000 } });
        const before = await cash();
        const item = await create();
        assert.equal(item.tx.linkedExpenseTreasuryEffect.debitApplied, 10000);
        await TreasuryBox.updateOne({ key: boxKey }, { $inc: { balanceARS: 50000 } });
        assert.equal((await patch(item.movementId, { amount: 90000 })).status, 200);
        assert.equal((await txById(item.movementId)).linkedExpenseTreasuryEffect.debitApplied, 15000);
        assert.equal((await TreasuryBox.findOne({ key: boxKey }).lean()).balanceARS, 45000);
        assert.equal(await cash(), before - 90000);
        assert.equal((await expenseOn(fixture.cars[0]._id, item.movementId)).amount, 90000);
        assert.equal((await annul(item.movementId)).status, 200);
        assert.equal(await cash(), before);
        assert.equal((await TreasuryBox.findOne({ key: boxKey }).lean()).balanceARS, 60000);
    });
    await test('editing amount, concept and vehicle moves the linked cost and updates the recovered result', async () => {
        await TreasuryBox.updateOne({ key: boxKey }, { $set: { balanceARS: 200000 } });
        const before = await cash();
        const item = await create();
        const response = await patch(item.movementId, { amount: 90000, concept: 'Reparación frenos', vehicleId: String(fixture.cars[1]._id), date: '2026-11-17' });
        assert.equal(response.status, 200, JSON.stringify(response.json));
        assert.equal(await expenseOn(fixture.cars[0]._id, item.movementId), undefined);
        const target = await expenseOn(fixture.cars[1]._id, item.movementId);
        assert.equal(target.amount, 90000); assert.equal(target.concept, 'Reparación frenos');
        assert.equal(await cash(), before - 90000);
        const recovered = await call('GET', '/api/admin/quick-expenses/drafts/' + item.draftId);
        assert.ok(recovered.json.summary.includes('90.000'));
        assert.equal(recovered.json.vehicleUrl, '/admin/stock/' + fixture.cars[1]._id);
        assert.equal((await annul(item.movementId)).status, 200);
        assert.equal(await expenseOn(fixture.cars[1]._id, item.movementId), undefined);
        assert.equal(await cash(), before);
        assert.equal((await TreasuryBox.findOne({ key: boxKey }).lean()).balanceARS, 200000);
    });
    await test('pending card payment and repeated paid state debit once; cancellation refunds payment and clears cost', async () => {
        const accountId = fixture.accounts[1]._id;
        const before = (await Account.findById(accountId)).balance;
        const item = await create({ amount: 1000, paymentMethod: 'tarjeta', cardTiming: 'deferred', accountId: String(accountId) });
        assert.equal((await Account.findById(accountId)).balance, before);
        assert.equal(item.tx.linkedExpenseTreasuryEffect.pendingApplied, 1000);
        assert.equal((await patch(item.movementId, { status: 'activo' })).status, 200);
        assert.equal((await patch(item.movementId, { status: 'activo' })).status, 200);
        assert.equal((await Account.findById(accountId)).balance, before - 1000);
        assert.equal((await TreasuryBox.findOne({ key: boxKey })).pendingCommitmentsARS, 0);
        assert.equal((await annul(item.movementId)).status, 200);
        assert.equal((await Account.findById(accountId)).balance, before);
        assert.equal(await expenseOn(fixture.cars[0]._id, item.movementId), undefined);
        assert.equal((await patch(item.movementId, { status: 'activo' })).status, 409);
    });
    await test('annulling a still pending card commitment changes no cash or strategic balance', async () => {
        const before = await cash();
        const boxBefore = (await TreasuryBox.findOne({ key: boxKey })).balanceARS;
        const item = await create({ amount: 2000, paymentMethod: 'tarjeta', cardTiming: 'deferred', accountId: String(fixture.accounts[1]._id) });
        assert.equal((await annul(item.movementId)).status, 200);
        assert.equal(await cash(), before);
        const box = await TreasuryBox.findOne({ key: boxKey });
        assert.equal(box.pendingCommitmentsARS, 0); assert.equal(box.balanceARS, boxBefore);
    });
    await test('a mandatory audit failure rolls back account, transaction, unit and treasury changes', async () => {
        const item = await create();
        const before = await cash();
        const boxBefore = (await TreasuryBox.findOne({ key: boxKey })).balanceARS;
        const save = AuditLog.prototype.save;
        AuditLog.prototype.save = async () => { throw new Error('Isolated audit failure'); };
        try { assert.equal((await patch(item.movementId, { amount: 86000 })).status, 500); }
        finally { AuditLog.prototype.save = save; }
        assert.equal(await cash(), before); assert.equal((await txById(item.movementId)).amount, 85000);
        assert.equal((await expenseOn(fixture.cars[0]._id, item.movementId)).amount, 85000);
        assert.equal((await TreasuryBox.findOne({ key: boxKey })).balanceARS, boxBefore);
        assert.equal((await patch(item.movementId, { amount: 86000 })).status, 200);
        assert.equal((await annul(item.movementId)).status, 200);
    });
    await test('new-only bulk annul is atomic while a mixed legacy batch rejects before any write', async () => {
        const before = await cash();
        const one = await create({ amount: 500 }), two = await create({ amount: 700 });
        const legacy = await Transaction.create({ module: 'crm_v2', type: 'Egreso', amount: 20, currency: 'ARS', description: 'Fixture legacy', concept: 'Fixture legacy',
            category: 'Gastos Varios', accountId: fixture.accounts[0]._id, status: 'activo' });
        const mixed = await call('POST', '/api/admin/transactions/bulk-annul', { ids: [one.movementId, String(legacy._id)], confirmText: 'ANULAR MOVIMIENTOS' });
        assert.equal(mixed.status, 409); assert.equal((await txById(one.movementId)).status, 'activo');
        assert.equal((await txById(legacy._id)).status, 'activo'); assert.equal(await cash(), before - 1200);
        const batch = await call('POST', '/api/admin/transactions/bulk-annul', { ids: [one.movementId, two.movementId], confirmText: 'ANULAR MOVIMIENTOS' });
        assert.equal(batch.status, 200); assert.equal(batch.json.annulledCount, 2); assert.equal(await cash(), before);
        assert.equal(await expenseOn(fixture.cars[0]._id, one.movementId), undefined);
        assert.equal(await expenseOn(fixture.cars[0]._id, two.movementId), undefined);
    });
    await test('permissions, malformed fields and incomplete historical trace fail without financial changes', async () => {
        const item = await create({ amount: 1000 });
        const before = await cash();
        await AdminUser.updateOne({ _id: fixture.users[0]._id }, { $set: { permissions: ['finanzas.write'] } });
        try { assert.equal((await patch(item.movementId, { amount: 2000 })).status, 403); }
        finally { await AdminUser.updateOne({ _id: fixture.users[0]._id }, { $set: { permissions: [] } }); }
        assert.equal((await patch(item.movementId, { currency: 'USD' })).status, 409);
        assert.equal((await patch(item.movementId, { date: '2026-02-30' })).status, 400);
        assert.equal((await patch(item.movementId, { type: 'ingreso' })).status, 409);
        assert.equal((await patch(item.movementId, { isTreasuryExpenseSynced: false })).status, 400);
        await Transaction.updateOne({ _id: item.movementId }, { $unset: { linkedExpenseTreasuryEffect: 1 } });
        assert.equal((await patch(item.movementId, { amount: 1500 })).status, 409);
        assert.equal(await cash(), before);
        await Transaction.updateOne({ _id: item.movementId }, { $set: { linkedExpenseTreasuryEffect: item.tx.linkedExpenseTreasuryEffect } });
        assert.equal((await annul(item.movementId)).status, 200);
    });
    await test('simultaneous cancellation and edit cannot refund cash twice or leave a cost behind', async () => {
        const before = await cash();
        const item = await create({ amount: 1000 });
        const results = await Promise.all([patch(item.movementId, { amount: 1200 }), annul(item.movementId), annul(item.movementId)]);
        assert.ok(results.every(result => [200, 409].includes(result.status)), JSON.stringify(results));
        assert.equal((await txById(item.movementId)).status, 'anulado');
        assert.equal(await cash(), before); assert.equal(await expenseOn(fixture.cars[0]._id, item.movementId), undefined);
    });
    await test('active quota assignments must be released before correction or cancellation', async () => {
        const item = await create({ amount: 1000 });
        const before = await cash();
        const assignment = await ExpenseQuotaAssignment.create({ expenseId: item.movementId, installmentId: new env.mongoose.Types.ObjectId(), assignedAmount: 500, currency: 'ARS', status: 'activa' });
        assert.equal((await annul(item.movementId)).status, 409);
        assert.equal((await patch(item.movementId, { amount: 1500 })).status, 409);
        assert.equal(await cash(), before);
        await ExpenseQuotaAssignment.updateOne({ _id: assignment._id }, { $set: { status: 'liberada' } });
        assert.equal((await annul(item.movementId)).status, 200);
    });
    await test('legacy cancellation aliases use the atomic path and historical treasury reclassification cannot bypass it', async () => {
        const before = await cash();
        const item = await create({ amount: 700 });
        const { reclassifyExpense } = await import('../../src/services/treasuryStrategicService.js');
        await assert.rejects(() => reclassifyExpense({ transactionId: item.movementId, boxKey: 'personal', category: 'Gastos Personales', reason: 'Ficticio' }, user), error => error.status === 409);
        assert.equal((await txById(item.movementId)).category, 'Taller');
        assert.equal((await call('DELETE', '/api/transactions/' + item.movementId)).status, 200);
        assert.equal(await cash(), before);
        assert.equal(await expenseOn(fixture.cars[0]._id, item.movementId), undefined);
    });
    console.log(`${passed} linked expense mutation checks passed using disposable local data only.`);
} finally { await env.stop(); }
