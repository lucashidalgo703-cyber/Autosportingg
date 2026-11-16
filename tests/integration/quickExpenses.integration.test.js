import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

const env = await bootIsolatedReplica();
const prefix = '/api/admin/quick-expenses';
let passed = 0;
try {
    const { seedMobileCrm, localPassword } = await import('../fixtures/mobileCrmFixtures.js');
    const { createLoginSession } = await import('../../src/services/authSessionService.js');
    const { createGptExpenseIndexes } = await import('../../src/services/gptExpenseService.js');
    const fixture = await seedMobileCrm(env.models);
    await createGptExpenseIndexes();
    const { Account, Car, Transaction, AdminUser, AuditLog, GptExpenseDraft, LoginSession } = env.models;
    const token = fixture.sessions[0].token;
    const route = (method, path, body, actor = token) => env.call(method, prefix + path, body, actor);
    const interpret = (text, requestId = crypto.randomUUID(), actor = token) => route('POST', '/interpret', { text, requestId }, actor);
    const successfulDraft = response => assert.ok([200, 201].includes(response.status), JSON.stringify(response));
    const status = (response, expected) => assert.equal(response.status, expected, JSON.stringify(response.json));
    const test = async (name, fn) => { await fn(); passed++; console.log(`ok ${passed} - ${name}`); };
    const phrase = 'Pagué 85 mil pesos en efectivo por la alineación de la Amarok Extreme';
    let draft, requestId;

    await test('wrong credentials send no email and a pending email challenge cannot access quick expenses', async () => {
        const previousMessages = env.mailbox.length;
        status(await env.call('POST', '/api/login', { email: 'admin@example.test', password: 'incorrecta' }), 401);
        assert.equal(env.mailbox.length, previousMessages);
        const pending = await env.call('POST', '/api/login', { email: 'admin@example.test', password: localPassword });
        status(pending, 200);
        assert.equal(pending.json.requireEmailVerification, true);
        assert.ok(pending.json.challengeId);
        assert.equal(pending.json.token, undefined);
        status(await route('GET', '/context', undefined, null), 401);
        status(await route('GET', '/context', undefined, pending.json.challengeId), 401);
        status(await interpret(phrase, crypto.randomUUID(), pending.json.challengeId), 401);
        assert.equal(await Transaction.countDocuments(), 0);
    });

    await test('sales users, read-only users and administrators with restricted permissions cannot interpret expenses', async () => {
        for (const session of [fixture.sessions[1], fixture.sessions[3]]) {
            status(await route('GET', '/context', undefined, session.token), 403);
            status(await interpret(phrase, crypto.randomUUID(), session.token), 403);
        }
        await AdminUser.updateOne({ _id: fixture.users[0]._id }, { $set: { permissions: ['stock.read'] } });
        try { status(await interpret(phrase), 403); }
        finally { await AdminUser.updateOne({ _id: fixture.users[0]._id }, { $set: { permissions: [] } }); }
    });

    await test('dictated phrase becomes a preview and only asks which Amarok by year and plate', async () => {
        requestId = crypto.randomUUID();
        const result = await interpret(phrase, requestId);
        successfulDraft(result);
        draft = result.json;
        assert.equal(draft.payload.amount, 85000);
        assert.equal(draft.payload.currency, 'ARS');
        assert.equal(draft.payload.paymentMethod, 'efectivo');
        assert.equal(draft.payload.kind, 'workshop');
        assert.equal(draft.payload.category, 'Taller');
        assert.match(draft.payload.concept, /alineaci[oó]n/i);
        assert.equal(draft.payload.accountId, String(fixture.accounts[0]._id));
        assert.deepEqual(draft.missingFields.map(field => field.field), ['vehicleId']);
        assert.equal(draft.nextQuestion.candidates.length, 2);
        assert.ok(draft.nextQuestion.candidates.some(candidate => candidate.year === 2022 && candidate.plate === 'QA001AA'));
        assert.ok(draft.nextQuestion.candidates.some(candidate => candidate.year === 2020 && candidate.plate === 'QA002AA'));
        assert.equal(draft.readyToConfirm, false);
        assert.equal(await Transaction.countDocuments(), 0, 'interpretation must not create financial records');
        assert.equal((await Account.findById(fixture.accounts[0]._id)).balance, 1000000);
        assert.equal((await Car.findById(fixture.cars[0]._id)).expenses.length, 0);
        const retry = await interpret(phrase, requestId);
        successfulDraft(retry);
        assert.equal(retry.json.draftId, draft.draftId);
        const edited = await route('PATCH', `/drafts/${draft.draftId}`, { version: draft.version, expense: { vehicleId: String(fixture.cars[0]._id) } });
        status(edited, 200);
        draft = edited.json;
        assert.equal(draft.readyToConfirm, true);
        assert.match(draft.summary, /85\.000 ARS/);
        assert.match(draft.summary, /QA001AA/);
        assert.match(draft.summary, /Caja efectivo prueba/);
        status(await route('POST', `/drafts/${draft.draftId}/confirm`, { version: draft.version - 1, confirmed: true }), 409);
        status(await route('POST', `/drafts/${draft.draftId}/confirm`, { version: draft.version, confirmed: false }), 400);
        assert.equal(await Transaction.countDocuments(), 0);
    });

    await test('two confirm taps return one movement and debit the account exactly once', async () => {
        const [a, b] = await Promise.all([1, 2].map(() => route('POST', `/drafts/${draft.draftId}/confirm`, { version: draft.version, confirmed: true })));
        status(a, 200); status(b, 200);
        assert.equal(a.json.movementId, b.json.movementId);
        assert.equal(a.json.movementNumber, b.json.movementNumber);
        assert.equal(a.json.accountDebited, true);
        assert.equal(await Transaction.countDocuments(), 1);
        assert.equal((await Account.findById(fixture.accounts[0]._id)).balance, 915000);
        const car = await Car.findById(fixture.cars[0]._id);
        assert.equal(car.expenses.length, 1);
        assert.equal(car.expenses[0].amount, 85000);
        assert.equal(String(car.expenses[0]._id), a.json.movementId);
        const movement = await Transaction.findById(a.json.movementId);
        assert.equal(movement.category, 'Taller');
        assert.equal(String(movement.accountId), String(fixture.accounts[0]._id));
        assert.equal(String(movement.vehicleId), String(fixture.cars[0]._id));
        assert.equal(/GPT AutoSporting/.test(movement.notes || ''), false, 'native CRM record must identify its real origin');
        assert.equal(await AuditLog.countDocuments({ entityId: a.json.movementId, action: 'MOVIMIENTO_CREADO' }), 1);
        assert.match(a.json.url, /\/admin\/finanzas\?tab=taller&movement=/);
        const retry = await interpret('Un texto cambiado que no debe reinterpretar el gasto guardado', requestId);
        successfulDraft(retry);
        assert.equal(retry.json.movementId, a.json.movementId);
        assert.equal(retry.json.duplicate, true);
        assert.equal(await Transaction.countDocuments(), 1);
        status(await route('PATCH', `/drafts/${draft.draftId}`, { version: draft.version, expense: { amount: 1 } }), 409);
    });

    await test('the transfer phrase resolves the exact plate and asks only which bank paid', async () => {
        const context = await route('GET', '/context'); status(context, 200);
        const result = await interpret('Transferí 120.500 pesos ayer por repuestos de la Amarok QA001AA');
        successfulDraft(result);
        assert.equal(result.json.payload.amount, 120500);
        assert.equal(result.json.payload.paymentMethod, 'transferencia');
        assert.equal(result.json.payload.vehicleId, String(fixture.cars[0]._id));
        const expectedYesterday = new Date(Date.parse(context.json.todayArgentina + 'T15:00:00Z') - 86400000).toISOString().slice(0, 10);
        assert.equal(result.json.payload.date, expectedYesterday);
        assert.deepEqual(result.json.missingFields.map(field => field.field), ['accountId']);
        assert.equal(result.json.nextQuestion.candidates.length, 2);
        assert.ok(result.json.nextQuestion.candidates.every(account => account.type === 'Banco'));
        assert.equal(await Transaction.countDocuments(), 1);
    });

    await test('incomplete or ambiguous text never invents an amount or creates a movement', async () => {
        const initialCount = await Transaction.countDocuments();
        const ambiguous = await interpret('Pagué 5.000 o 7.000 pesos en efectivo por limpieza');
        successfulDraft(ambiguous);
        assert.equal(ambiguous.json.payload.amount, undefined);
        assert.ok(ambiguous.json.missingFields.some(field => field.field === 'amount'));
        assert.equal(ambiguous.json.readyToConfirm, false);
        const noMoney = await interpret('La Amarok es año 2022 patente QA001AA');
        successfulDraft(noMoney);
        assert.equal(noMoney.json.payload.amount, undefined);
        assert.equal(noMoney.json.readyToConfirm, false);
        assert.equal(await Transaction.countDocuments(), initialCount);
        status(await route('POST', '/interpret', { text: '', requestId: crypto.randomUUID() }), 400);
        status(await route('POST', '/interpret', { text: 85000, requestId: crypto.randomUUID() }), 400);
        status(await route('POST', '/interpret', { text: phrase, requestId: 'short' }), 400);
        status(await route('POST', '/interpret', { text: phrase, requestId: { $ne: null } }), 400);
    });

    await test('missing durable idempotency index fails closed before creating a new draft', async () => {
        assert.equal(env.mongoose.connection.host, '127.0.0.1');
        assert.equal(env.mongoose.connection.name, 'autosporting_mobile_crm_test');
        const index = (await GptExpenseDraft.collection.indexes()).find(entry => entry.unique === true
            && entry.key.userId === 1 && entry.key.requestId === 1 && Object.keys(entry.key).length === 2);
        assert.ok(index, 'the disposable database starts with the durable idempotency index');
        const draftCount = await GptExpenseDraft.countDocuments();
        const movementCount = await Transaction.countDocuments();
        const accountBalance = (await Account.findById(fixture.accounts[0]._id)).balance;
        let partialCreated = false;
        try {
            // This collection belongs exclusively to the disposable loopback replica set above.
            await GptExpenseDraft.collection.dropIndex(index.name);
            const unavailable = await interpret(phrase);
            status(unavailable, 503);
            assert.equal(unavailable.json.error, 'EXPENSE_STORAGE_NOT_READY');
            assert.equal(await GptExpenseDraft.countDocuments(), draftCount);
            assert.equal(await Transaction.countDocuments(), movementCount);
            assert.equal((await Account.findById(fixture.accounts[0]._id)).balance, accountBalance);
            await GptExpenseDraft.collection.createIndex({ userId: 1, requestId: 1 }, {
                name: 'qa_partial_request_id', unique: true, partialFilterExpression: { status: 'confirmed' }
            });
            partialCreated = true;
            const partiallyProtected = await interpret(phrase);
            status(partiallyProtected, 503);
            assert.equal(partiallyProtected.json.error, 'EXPENSE_STORAGE_NOT_READY');
            assert.equal(await GptExpenseDraft.countDocuments(), draftCount);
            assert.equal(await Transaction.countDocuments(), movementCount);
        } finally {
            if (partialCreated) await GptExpenseDraft.collection.dropIndex('qa_partial_request_id');
            await createGptExpenseIndexes();
        }
    });

    await test('drafts remain user-bound and every endpoint checks the live CRM session', async () => {
        const other = fixture.users[2];
        await AdminUser.updateOne({ _id: other._id }, { $set: { role: 'admin' } });
        try {
            status(await route('GET', `/drafts/${draft.draftId}`, undefined, fixture.sessions[2].token), 404);
            status(await route('POST', `/drafts/${draft.draftId}/confirm`, { version: draft.version, confirmed: true }, fixture.sessions[2].token), 404);
        } finally { await AdminUser.updateOne({ _id: other._id }, { $set: { role: 'ventas' } }); }
        const freshUser = await AdminUser.findById(fixture.users[0]._id);
        const revoked = await createLoginSession(freshUser);
        const jwt = (await import('jsonwebtoken')).default;
        const claims = jwt.decode(revoked.token);
        const sessionId = crypto.createHash('sha256').update(claims.sid).digest('hex');
        await LoginSession.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } });
        status(await route('GET', '/context', undefined, revoked.token), 401);
        const expired = await createLoginSession(freshUser);
        const expiredClaims = jwt.decode(expired.token);
        await LoginSession.updateOne({ _id: crypto.createHash('sha256').update(expiredClaims.sid).digest('hex') }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
        status(await interpret(phrase, crypto.randomUUID(), expired.token), 401);
        await AdminUser.updateOne({ _id: freshUser._id }, { $set: { passwordHash: 'changed-fixture-password-hash' } });
        try { status(await route('GET', '/context', undefined, token), 401); }
        finally { await AdminUser.updateOne({ _id: freshUser._id }, { $set: { passwordHash: freshUser.passwordHash } }); }
        assert.equal(await GptExpenseDraft.countDocuments({ userId: fixture.users[0]._id, requestId }), 1);
        assert.equal(await Transaction.countDocuments(), 1);
    });
    console.log(`\n${passed} native CRM dictation integration checks passed against disposable replica set.`);
} finally { await env.stop(); }
