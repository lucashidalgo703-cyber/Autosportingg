import test from 'node:test';
import assert from 'node:assert/strict';
import {
    estimateBuyerCallCost,
    getBudgetDoc,
    getBudgetStatus,
    reserveAICall,
    resetBudgetForTesting,
    settleAICall
} from '../src/services/academyBudgetService.js';

async function setup(t, amount = 1) {
    const keys = ['ACADEMY_OPENAI_API_KEY', 'ACADEMY_AI_ENABLED', 'ACADEMY_AI_BUDGET_USD',
        'ACADEMY_AI_MAX_BUDGET_CAP_USD', 'ACADEMY_AI_FORCE_BUDGET_USD', 'ACADEMY_AI_BUDGET_OVERRIDE'];
    const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    for (const key of keys) delete process.env[key];
    process.env.ACADEMY_OPENAI_API_KEY = 'sk-offline-context-budget-fixture';
    process.env.ACADEMY_AI_ENABLED = 'true';
    await getBudgetDoc();
    await resetBudgetForTesting(amount);
    t.after(async () => {
        await resetBudgetForTesting(0);
        for (const key of keys) {
            if (original[key] === undefined) delete process.env[key];
            else process.env[key] = original[key];
        }
    });
}
const longContext = () => Array.from({ length: 31 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user', content: 'Información de la operación y documentación pendiente. '.repeat(12)
}));

test('La estimación crece con el historial, los bytes UTF-8 y la respuesta máxima, preservando el mínimo anterior', () => {
    assert.equal(estimateBuyerCallCost([]), 0.0005);
    const short = [{ role: 'user', content: 'Hola' }];
    assert.ok(estimateBuyerCallCost(longContext()) > estimateBuyerCallCost(short));
    const ascii = [{ role: 'user', content: 'a'.repeat(10000) }];
    const accented = [{ role: 'user', content: 'á'.repeat(10000) }];
    assert.ok(estimateBuyerCallCost(accented) > estimateBuyerCallCost(ascii));
    assert.ok(estimateBuyerCallCost(ascii, 1000) > estimateBuyerCallCost(ascii, 250));
});

test('La estimación rechaza contextos o límites de respuesta malformados', () => {
    for (const messages of [null, {}, [{ content: null }], [null], [{ content: {} }]]) {
        assert.throws(() => estimateBuyerCallCost(messages), TypeError);
    }
    for (const maxTokens of [-1, NaN, Infinity, 1.5, '250']) {
        assert.throws(() => estimateBuyerCallCost([], maxTokens), TypeError);
    }
});

test('La reserva sin estimación conserva 0.0005 USD y una estimación menor no reduce ese mínimo', async t => {
    await setup(t);
    const unchanged = await reserveAICall({ userId: 'default-buyer', callType: 'buyer' });
    assert.equal(unchanged.estimatedCostUSD, 0.0005);
    const low = await reserveAICall({ userId: 'low-estimate-buyer', callType: 'buyer', estimatedCostUSD: 0.00001 });
    assert.equal(low.estimatedCostUSD, 0.0005);
    const fraction = await reserveAICall({ userId: 'fraction-buyer', callType: 'buyer', estimatedCostUSD: 0.0005001 });
    assert.equal(fraction.estimatedCostUSD, 0.000501, 'La reserva se redondea hacia arriba');
});

test('Estimaciones negativas, no numéricas, infinitas o desbordadas nunca crean reservas', async t => {
    await setup(t);
    for (const estimatedCostUSD of [0, -1, NaN, Infinity, -Infinity, null, '0.0001', {}, 1e300]) {
        await assert.rejects(reserveAICall({ userId: 'invalid-buyer', callType: 'buyer', estimatedCostUSD }), TypeError);
    }
    const status = await getBudgetStatus();
    assert.equal(status.reservedUSD, 0);
    assert.equal(status.confirmedSpentUSD, 0);
});

test('Un saldo superior al mínimo pero insuficiente para treinta mensajes no permite despachar la llamada larga', async t => {
    await setup(t, 0.0006);
    const estimate = estimateBuyerCallCost(longContext());
    assert.ok(estimate > 0.0006);
    const permittedShort = await reserveAICall({ userId: 'short-buyer', callType: 'buyer' });
    assert.equal(permittedShort.allowed, true);
    await settleAICall({ reservationId: permittedShort.reservationId, status: 'failed', userId: 'short-buyer', callType: 'buyer' });
    const deniedLong = await reserveAICall({ userId: 'long-buyer', callType: 'buyer', estimatedCostUSD: estimate });
    assert.equal(deniedLong.allowed, false);
    assert.equal(deniedLong.reason, 'budget_exhausted');
    assert.equal((await getBudgetStatus()).reservedUSD, 0);
});

test('Liquidar una reserva de contexto completo libera todo lo reservado y contabiliza el consumo real una sola vez', async t => {
    await setup(t);
    const estimate = estimateBuyerCallCost(longContext());
    const reservation = await reserveAICall({ userId: 'settled-buyer', callType: 'buyer', estimatedCostUSD: estimate });
    assert.equal(reservation.allowed, true);
    assert.equal((await getBudgetStatus()).reservedUSD, estimate);
    await settleAICall({ reservationId: reservation.reservationId, tokensIn: 3500, tokensOut: 250, status: 'success', userId: 'settled-buyer', callType: 'buyer' });
    const status = await getBudgetStatus();
    assert.equal(status.reservedUSD, 0);
    assert.equal(status.confirmedSpentUSD, 0.000675);
    assert.equal(status.totalTokensUsed, 3750);
    assert.equal(status.uncertainSpentUSD, 0);
});

test('Un timeout de contexto completo conserva como gasto incierto la estimación de esa llamada', async t => {
    await setup(t);
    const estimate = estimateBuyerCallCost(longContext());
    const reservation = await reserveAICall({ userId: 'timeout-buyer', callType: 'buyer', estimatedCostUSD: estimate });
    await settleAICall({ reservationId: reservation.reservationId, status: 'uncertain', userId: 'timeout-buyer', callType: 'buyer' });
    const status = await getBudgetStatus();
    assert.equal(status.reservedUSD, 0);
    assert.equal(status.uncertainSpentUSD, estimate);
    assert.equal(status.confirmedSpentUSD, 0);
});
