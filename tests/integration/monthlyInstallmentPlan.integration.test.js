import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMonthlyPlan } from '../../src/services/monthlyInstallmentPlan.js';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';

test('el plan mensual conserva el día original y usa el último día cuando el mes es más corto', () => {
    const input = { installmentsCount: 3, amount: 1000.5, currency: 'ARS', firstDueDate: '2028-01-31' };
    const rows = buildMonthlyPlan(input);
    assert.deepEqual(rows.map(i => i.dueDate.toISOString()), [
        '2028-01-31T03:00:00.000Z', '2028-02-29T03:00:00.000Z', '2028-03-31T03:00:00.000Z'
    ]);
    for (const invalid of [{ firstDueDate: '2028-02-30' }, { installmentsCount: 121 }, { amount: 1.234 }, { currency: 'EUR' }]) {
        assert.throws(() => buildMonthlyPlan({ ...input, ...invalid }));
    }
});

test('el CRM crea el plan, filtra por mes y cambia el estado sin crear movimientos', async () => {
    const env = await bootIsolatedReplica();
    try {
        const { seedMobileCrm } = await import('../fixtures/mobileCrmFixtures.js');
        const fixtures = await seedMobileCrm(env.models);
        const [admin, seller] = fixtures.sessions;
        const endpoint = '/api/admin/installments';
        const planId = String(new env.mongoose.Types.ObjectId());
        const plan = { planId, clientId: String(fixtures.client._id), installmentsCount: 3, amount: 1000.50,
            currency: 'ARS', firstDueDate: '2028-01-31' };
        const denied = await env.call('POST', endpoint + '/monthly-plan', plan, seller.token);
        assert.equal(denied.status, 403);
        const created = await env.call('POST', endpoint + '/monthly-plan', plan, admin.token);
        assert.equal(created.status, 201, JSON.stringify(created.json));
        assert.equal(created.json.count, 3);
        assert.equal((await env.call('POST', endpoint + '/monthly-plan', plan, admin.token)).status, 200);
        assert.equal((await env.call('POST', endpoint + '/monthly-plan', { ...plan, amount: 2000 }, admin.token)).status, 409);
        const rows = await env.models.Installment.find({ monthlyPlanId: planId }).sort('installmentNumber').lean();
        assert.equal(rows.length, 3);
        assert.ok(rows.every(row => String(row.clientId) === plan.clientId));
        const month = async (n, status = 'todas') => {
            const response = await env.call('GET', endpoint + '/monthly?year=2028&month=' + n + '&status=' + status, undefined, admin.token);
            assert.equal(response.status, 200);
            return response.json.items.filter(row => row.monthlyPlanId === planId);
        };
        for (const n of [1, 2, 3]) assert.equal((await month(n))[0].installmentNumber, n);
        const state = endpoint + '/' + rows[0]._id + '/monthly-plan-status';
        const marked = await env.call('PATCH', state, { collected: true }, admin.token);
        assert.equal(marked.status, 200, JSON.stringify(marked.json));
        assert.equal(marked.json.paidAmount, plan.amount);
        assert.equal((await month(1, 'pagada')).length, 1);
        assert.equal((await month(1, 'pendiente')).length, 0);
        assert.equal(await env.models.Transaction.countDocuments({ installmentId: rows[0]._id }), 0);
        const undone = await env.call('PATCH', state, { collected: false }, admin.token);
        assert.equal(undone.status, 200, JSON.stringify(undone.json));
        assert.equal((await month(1, 'pendiente')).length, 1);
        assert.equal((await month(1, 'pagada')).length, 0);
    } finally {
        await env.stop();
    }
});
