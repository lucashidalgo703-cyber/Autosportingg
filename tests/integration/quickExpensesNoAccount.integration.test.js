import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

// This harness replaces every external connection with a disposable loopback
// replica set and a fake mailbox. No employee accounts or real money are used.
const env = await bootIsolatedReplica();
let passed = 0;
try {
    const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
    const { createExpenseDraft, createGptExpenseIndexes } = await import('../../src/services/gptExpenseService.js');
    const { getCapitalSummary } = await import('../../src/services/capitalSummaryService.js');
    const fixture = await seedMobileCrm(env.models);
    await createGptExpenseIndexes();
    const { Account, Car, Transaction, AuditLog, GptExpenseDraft, BankReconciliation } = env.models;
    const token = fixture.sessions[0].token;
    const call = (method, route, body) => env.call(method, route, body, token);
    const quick = (method, path, body) => call(method, '/api/admin/quick-expenses' + path, body);
    const status = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.json));
    const test = async (name, fn) => { await fn(); passed++; console.log(`ok ${passed} - ${name}`); };
    const balances = async () => (await Account.find({}).sort({ _id: 1 }).lean()).map(({ _id, balance }) => [String(_id), balance]);
    const confirm = draft => quick('POST', `/drafts/${draft.draftId}/confirm`, { version: draft.version, confirmed: true });
    const baseline = await getCapitalSummary();
    const initialBalances = await balances();
    // Model the draft the user already reviewed before this release: it has no
    // account and no new accountUnassigned field, and must remain the same draft.
    const legacyDraft = await GptExpenseDraft.create({ userId: fixture.users[0]._id,
        requestId: crypto.randomUUID(), origin: 'crm_dictation', expiresAt: new Date(Date.now() + 3600000),
        payload: { kind: 'workshop', amount: 85000, currency: 'ARS', date: '2026-11-16',
            concept: 'Alineación QA001AA', category: 'Taller', paymentMethod: 'efectivo', vehicleId: fixture.cars[0]._id } });
    await Account.updateMany({}, { $set: { isActive: false } });
    let recovered, saved;

    await test('the existing blocked draft becomes confirmable on reload without a new request', async () => {
        const response = await quick('GET', `/drafts/${legacyDraft._id}`);
        status(response, 200); recovered = response.json;
        assert.equal(recovered.draftId, String(legacyDraft._id));
        assert.equal(recovered.payload.accountId, undefined);
        assert.equal(recovered.payload.accountUnassigned, true);
        assert.equal(recovered.readyToConfirm, true);
        assert.equal(recovered.missingFields.some(field => field.field === 'accountId'), false);
        assert.match(recovered.summary, /cuenta.*asignar/i);
        const retry = await quick('POST', '/interpret', { requestId: legacyDraft.requestId,
            text: 'Pagué 99 mil pesos por otro concepto que no debe reemplazar el borrador' });
        assert.ok([200, 201].includes(retry.status), JSON.stringify(retry));
        assert.equal(retry.json.draftId, recovered.draftId);
        assert.equal(retry.json.payload.amount, 85000);
        assert.equal(await Transaction.countDocuments(), 0);
    });

    await test('simultaneous confirmation saves one paid expense and one unit cost without debiting a random account', async () => {
        const [one, two] = await Promise.all([confirm(recovered), confirm(recovered)]);
        status(one, 200); status(two, 200); saved = one.json;
        assert.equal(one.json.movementId, two.json.movementId);
        assert.equal(saved.accountDebited, false);
        assert.equal(saved.accountAssignmentPending, true);
        assert.equal(saved.movementStatus, 'activo', 'already paid must not become unpaid');
        const tx = await Transaction.findById(saved.movementId).lean();
        assert.equal(tx.accountId == null, true);
        assert.equal(tx.accountAssignmentStatus, 'pending');
        assert.equal(tx.accountDebitApplied, false);
        assert.equal(tx.status, 'activo');
        assert.equal(await Transaction.countDocuments(), 1);
        assert.deepEqual(await balances(), initialBalances);
        const expenses = (await Car.findById(fixture.cars[0]._id).lean()).expenses;
        assert.equal(expenses.length, 1);
        assert.equal(String(expenses[0]._id), saved.movementId);
        assert.equal(expenses[0].amount, 85000);
        assert.equal(await AuditLog.countDocuments({ entityId: saved.movementId, action: 'MOVIMIENTO_CREADO' }), 1);
        const retry = await quick('GET', `/drafts/${recovered.draftId}`);
        status(retry, 200);
        assert.equal(retry.json.movementId, saved.movementId);
        assert.equal(retry.json.accountAssignmentPending, true);
    });

    await test('finance APIs and CSV include the expense and capital clears its paid cash effect without creating a debt', async () => {
        const list = await call('GET', '/api/admin/transactions'); status(list, 200);
        assert.ok(list.json.some(tx => tx._id === saved.movementId));
        status(await call('GET', '/api/admin/transactions/' + saved.movementId), 200);
        const monthly = await call('GET', '/api/admin/transactions/monthly-close'); status(monthly, 200);
        assert.equal(monthly.json.reduce((sum, month) => sum + month.ARS.expense, 0), 85000);
        const exported = await fetch(env.base + '/api/admin/transactions/export', { headers: { Authorization: 'Bearer ' + token } });
        assert.equal(exported.status, 200);
        const csv = await exported.text();
        assert.match(csv, /Alineación QA001AA/);
        assert.match(csv, /Cuenta sin asignar/);
        const capital = await getCapitalSummary();
        assert.equal(capital.componentes.pagosSinCuenta.byCurrency.ARS, 85000);
        assert.equal(capital.componentes.pagosSinCuenta.byCurrency.USD, 0);
        assert.equal(capital.componentes.deudasPropia.byCurrency.ARS, 0);
        assert.equal(capital.componentes.efectivoPropio.byCurrency.ARS, baseline.componentes.efectivoPropio.byCurrency.ARS);
        assert.equal(capital.totalsByCurrency.ARS.efectivoDisponible, baseline.totalsByCurrency.ARS.efectivoDisponible - 85000);
        assert.equal(capital.totalsByCurrency.ARS.capitalPropioCosto, baseline.totalsByCurrency.ARS.capitalPropioCosto);
        assert.equal(capital.totalsByCurrency.ARS.capitalPropioPublicado, baseline.totalsByCurrency.ARS.capitalPropioPublicado - 85000);
        assert.equal(capital.conciliacionStatus, 'parcial_datos_pendientes');
    });

    await test('bank reconciliation rejects an accountless expense match without crashing or changing balances', async () => {
        await Account.updateOne({ _id: fixture.accounts[1]._id }, { $set: { isActive: true } });
        try {
            const reconciliation = await BankReconciliation.create({ accountId: fixture.accounts[1]._id, currency: 'ARS',
                lines: [{ rowIndex: 1, csvDate: new Date('2026-11-16T12:00:00Z'), csvDescription: 'Pago QA', csvAmount: -85000, matchStatus: 'unmatched' }] });
            const result = await call('POST', `/api/admin/finance/reconciliation/${reconciliation._id}/confirm`, {
                decisions: [{ index: 1, action: 'match', matchedTransactionId: saved.movementId }] });
            status(result, 400);
            assert.match(result.json.message, /inválida para match/i);
            assert.equal((await BankReconciliation.findById(reconciliation._id).lean()).status, 'pendiente');
            assert.deepEqual(await balances(), initialBalances);
        } finally { await Account.updateOne({ _id: fixture.accounts[1]._id }, { $set: { isActive: false } }); }
    });

    await test('a fresh dictated expense with no matching account is ready and cancellation never refunds an untouched balance', async () => {
        const draftResponse = await quick('POST', '/interpret', { requestId: crypto.randomUUID(),
            text: 'Pagué 100 dólares en efectivo por alineación de la Amarok QA001AA' });
        assert.ok([200, 201].includes(draftResponse.status), JSON.stringify(draftResponse));
        assert.equal(draftResponse.json.readyToConfirm, true, JSON.stringify(draftResponse.json));
        assert.equal(draftResponse.json.payload.accountUnassigned, true);
        const response = await confirm(draftResponse.json); status(response, 200);
        const id = response.json.movementId;
        const capital = await getCapitalSummary();
        assert.equal(capital.componentes.pagosSinCuenta.byCurrency.USD, 100);
        assert.equal(capital.componentes.pagosSinCuenta.byCurrency.ARS, 85000);
        status(await call('DELETE', '/api/admin/transactions/' + id), 200);
        status(await call('DELETE', '/api/admin/transactions/' + id), 200);
        assert.deepEqual(await balances(), initialBalances);
        assert.equal((await getCapitalSummary()).componentes.pagosSinCuenta.byCurrency.USD, 0);
        assert.equal((await quick('GET', `/drafts/${draftResponse.json.draftId}`)).json.movementStatus, 'anulado');
    });

    await test('deferred card payment becomes paid before account assignment without double debt, clearing or debit', async () => {
        const cardDraft = await GptExpenseDraft.create({ userId: fixture.users[0]._id,
            requestId: crypto.randomUUID(), origin: 'crm_dictation', expiresAt: new Date(Date.now() + 3600000),
            payload: { kind: 'workshop', amount: 1500, currency: 'ARS', date: '2026-11-16',
                concept: 'Repuestos QA001AA', category: 'Taller', paymentMethod: 'tarjeta', cardTiming: 'deferred',
                vehicleId: fixture.cars[0]._id } });
        const reviewed = await quick('GET', `/drafts/${cardDraft._id}`); status(reviewed, 200);
        assert.equal(reviewed.json.readyToConfirm, true);
        const response = await confirm(reviewed.json); status(response, 200);
        assert.equal(response.json.movementStatus, 'pendiente');
        assert.equal(response.json.accountDebited, false);
        const capital = await getCapitalSummary();
        assert.equal(capital.componentes.deudasPropia.byCurrency.ARS, 1500);
        assert.equal(capital.componentes.pagosSinCuenta.byCurrency.ARS, 85000);
        assert.deepEqual(await balances(), initialBalances);
        for (let attempt = 0; attempt < 2; attempt++) {
            status(await call('PATCH', '/api/admin/transactions/' + response.json.movementId, { status: 'activo' }), 200);
        }
        const paid = await Transaction.findById(response.json.movementId).lean();
        assert.equal(paid.status, 'activo');
        assert.equal(paid.accountAssignmentStatus, 'pending');
        assert.equal(paid.accountDebitApplied, false);
        assert.deepEqual(await balances(), initialBalances);
        const paidCapital = await getCapitalSummary();
        assert.equal(paidCapital.componentes.deudasPropia.byCurrency.ARS, 0);
        assert.equal(paidCapital.componentes.pagosSinCuenta.byCurrency.ARS, 86500);
        status(await call('DELETE', '/api/admin/transactions/' + response.json.movementId), 200);
        const annulledCapital = await getCapitalSummary();
        assert.equal(annulledCapital.componentes.deudasPropia.byCurrency.ARS, 0);
        assert.equal(annulledCapital.componentes.pagosSinCuenta.byCurrency.ARS, 85000);
        assert.deepEqual(await balances(), initialBalances);
    });

    await test('assigning the real account later debits exactly once and preserves the capital total', async () => {
        const before = await getCapitalSummary();
        await Account.updateOne({ _id: fixture.accounts[0]._id }, { $set: { isActive: true } });
        for (let attempt = 0; attempt < 2; attempt++) {
            status(await call('PATCH', '/api/admin/transactions/' + saved.movementId, { accountId: String(fixture.accounts[0]._id) }), 200);
        }
        const tx = await Transaction.findById(saved.movementId).lean();
        assert.equal(tx.accountAssignmentStatus, 'assigned');
        assert.equal(tx.accountDebitApplied, true);
        assert.equal((await Account.findById(fixture.accounts[0]._id).lean()).balance, 915000);
        const after = await getCapitalSummary();
        assert.equal(after.componentes.pagosSinCuenta.byCurrency.ARS, 0);
        assert.equal(after.totalsByCurrency.ARS.capitalPropioCosto, before.totalsByCurrency.ARS.capitalPropioCosto);
        assert.equal(after.totalsByCurrency.ARS.capitalPropioPublicado, before.totalsByCurrency.ARS.capitalPropioPublicado);
        assert.equal(after.totalsByCurrency.ARS.efectivoDisponible, before.totalsByCurrency.ARS.efectivoDisponible);
        const recoveredResult = await quick('GET', `/drafts/${recovered.draftId}`); status(recoveredResult, 200);
        assert.equal(recoveredResult.json.accountAssignmentPending, false);
        assert.equal(recoveredResult.json.accountDebited, true);
        assert.equal(recoveredResult.json.movementId, saved.movementId);
    });

    await test('multiple accounts can be skipped explicitly and a later real selection clears the unassigned flag', async () => {
        await Account.updateMany({ _id: { $in: [fixture.accounts[1]._id, fixture.accounts[2]._id] } }, { $set: { isActive: true } });
        const response = await quick('POST', '/interpret', { requestId: crypto.randomUUID(),
            text: 'Transferí 120.500 pesos ayer por repuestos de la Amarok QA001AA' });
        assert.ok([200, 201].includes(response.status), JSON.stringify(response));
        let draft = response.json;
        assert.equal(draft.readyToConfirm, false);
        assert.deepEqual(draft.missingFields.map(field => field.field), ['accountId']);
        const edit = async expense => {
            const updated = await quick('PATCH', `/drafts/${draft.draftId}`, { version: draft.version, expense });
            status(updated, 200); draft = updated.json; return draft;
        };
        await edit({ accountUnassigned: true });
        assert.equal(draft.readyToConfirm, true);
        assert.equal(draft.payload.accountUnassigned, true);
        assert.equal(draft.payload.accountId, undefined);
        await edit({ accountId: String(fixture.accounts[1]._id) });
        assert.equal(draft.payload.accountUnassigned, false);
        assert.equal(draft.payload.accountId, String(fixture.accounts[1]._id));
        for (const invalidFlag of ['true', 'false', 0, 1, {}]) {
            status(await quick('PATCH', `/drafts/${draft.draftId}`, { version: draft.version, expense: { accountUnassigned: invalidFlag } }), 400);
        }
        await edit({ accountUnassigned: true });
        await edit({ paymentMethod: 'efectivo' });
        assert.equal(draft.payload.accountUnassigned, false);
        assert.equal(draft.payload.accountId, String(fixture.accounts[0]._id));
        await edit({ accountUnassigned: true });
        await edit({ paymentMethod: 'transferencia', accountQuery: 'Banco prueba uno' });
        assert.equal(draft.payload.accountUnassigned, false);
        assert.equal(draft.payload.accountId, String(fixture.accounts[1]._id));
        assert.equal(await Transaction.countDocuments({ status: 'activo' }), 1, 'draft corrections cannot create a financial movement');
    });

    await test('the GPT origin keeps requiring a real account instead of gaining the native CRM opt-out', async () => {
        const before = await GptExpenseDraft.countDocuments();
        await assert.rejects(() => createExpenseDraft(fixture.users[0], { requestId: crypto.randomUUID(), expense: {
            kind: 'workshop', amount: 1000, currency: 'ARS', date: '2026-11-16', concept: 'Alineación QA',
            category: 'Taller', paymentMethod: 'efectivo', accountUnassigned: true, vehicleId: String(fixture.cars[0]._id)
        } }, { origin: 'gpt' }), error => error.status === 400 && error.code === 'ACCOUNT_REQUIRED');
        assert.equal(await GptExpenseDraft.countDocuments(), before);
    });
    console.log(`PASS: ${passed} isolated accountless quick expense scenarios.`);
} finally {
    await env.stop();
}
