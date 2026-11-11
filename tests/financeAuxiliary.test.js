import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFinanceAuxiliary, financeAuxiliaryTotals, financeAuxiliaryDate } from '../src/utils/financeAuxiliary.js';
import { requestFinanceJson } from '../src/utils/financeRequest.js';
const accounts = [{ _id: 'ars', currency: 'ARS', isActive: true }, { _id: 'usd', currency: 'USD', isActive: true }, { _id: 'closed', currency: 'ARS', isActive: false }];
test('money forms and loan return reject inactive or other-currency accounts before submitting', () => {
    for (const kind of ['card', 'withdrawal', 'loan', 'recurrence']) for (const accountId of ['usd', 'closed', 'missing']) assert.ok(validateFinanceAuxiliary(kind, { amount: 10, currency: 'ARS', accountId, personName: 'QA', name: 'QA', category: 'QA', type: 'Egreso', dayOfMonth: 1 }, accounts).errors.accountId);
    const returned = validateFinanceAuxiliary('loan', { currency: 'USD', targetAccountId: 'usd' }, accounts, 'return'); assert.deepEqual(returned.errors, {}); assert.deepEqual(returned.payload, { status: 'devuelto', targetAccountId: 'usd' });
    assert.ok(validateFinanceAuxiliary('loan', { currency: 'USD', targetAccountId: 'ars' }, accounts, 'return').errors.targetAccountId);
});
test('zero planned budget is valid while blank budget, fractional recurrence day and nonfinite money are rejected', () => {
    assert.equal(financeAuxiliaryDate('2026-11-11T01:30:00Z'), '2026-11-10'); assert.equal(financeAuxiliaryDate('invalid'), null);
    assert.deepEqual(validateFinanceAuxiliary('budget', { plannedAmount: '0', category: 'QA', currency: 'USD' }, accounts).errors, {});
    assert.ok(validateFinanceAuxiliary('budget', { plannedAmount: '', category: 'QA', currency: 'USD' }, accounts).errors.plannedAmount);
    const result = validateFinanceAuxiliary('recurrence', { name: 'QA', category: 'QA', type: 'Egreso', amount: 'Infinity', currency: 'ARS', accountId: 'ars', dayOfMonth: '1.5' }, accounts); assert.ok(result.errors.dayOfMonth); assert.ok(result.errors.amount);
    assert.deepEqual(financeAuxiliaryTotals([{ amount: 10, currency: 'ARS' }, { amount: 5, currency: 'USD' }, { amount: 50, currency: 'USD', status: 'anulado' }, { amount: 5, currency: 'EUR' }]), { ARS: 10, USD: 5, excluded: 1 });
});
test('financial request cannot start or return data to a changed session', async t => {
    let session = 'qa', calls = 0; const oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => session }; t.after(() => { globalThis.localStorage = oldStorage; });
    t.mock.method(globalThis, 'fetch', async (path, options) => { calls++; assert.equal(options.headers.Authorization, 'Bearer qa'); session = 'changed'; return new Response(JSON.stringify([{ personName: 'QA only' }]), { status: 200, headers: { 'Content-Type': 'application/json' } }); });
    await assert.rejects(requestFinanceJson({ path: '/api/admin/finance/loans', token: 'qa' }), error => error.name === 'AbortError');
    await assert.rejects(requestFinanceJson({ path: '/api/admin/finance/loans', token: 'qa' }), error => error.name === 'AbortError'); assert.equal(calls, 1);
});
test('financial write failures preserve server errors and an uncertain network result is not retried', async t => {
    const oldStorage = globalThis.localStorage; globalThis.localStorage = { getItem: () => 'qa' }; t.after(() => { globalThis.localStorage = oldStorage; }); let calls = 0;
    t.mock.method(globalThis, 'fetch', async () => { calls++; if (calls === 1) return new Response(JSON.stringify({ message: 'Cuenta inactiva', errors: { accountId: 'Cuenta inactiva' } }), { status: 400, headers: { 'Content-Type': 'application/json' } }); throw TypeError('network failure'); });
    const args = { path: '/api/admin/finance/withdrawals', method: 'POST', token: 'qa', payload: { amount: 10, currency: 'ARS', accountId: 'ars' } };
    await assert.rejects(requestFinanceJson(args), error => error.status === 400 && error.errors.accountId === 'Cuenta inactiva');
    await assert.rejects(requestFinanceJson(args), /podría haberse guardado/); assert.equal(calls, 2);
});
