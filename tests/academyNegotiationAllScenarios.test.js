import test from 'node:test';
import assert from 'node:assert/strict';
import { NEGOTIATION_SCENARIOS } from '../src/lib/academy/negotiationScenarios.js';
import { hasBuyerReply } from '../src/lib/academy/negotiationConversation.js';
import { generateBuyerReply } from '../src/services/academyAIService.js';
import { getBudgetStatus, resetBudgetForTesting } from '../src/services/academyBudgetService.js';

process.env.ACADEMY_AI_ENABLED = 'false';
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const scripts = {
    'desc-01': ['¿Qué uso le vas a dar?', 'Revisemos el historial de servicios.', 'Cualquier atención requiere autorización del titular.', 'Revisemos las condiciones de la reserva oficial.'],
    'toma-02': ['¿Qué buscás con el cambio?', 'Revisemos juntos el peritaje y el reacondicionamiento.', 'La diferencia neta de la permuta y cualquier excepción necesitan autorización.', 'Dejemos la propuesta escrita y coordinemos el próximo paso.'],
    'inde-03': ['¿Qué te preocupa antes de decidir?', 'Revisemos mantenimiento y patentes sin apurarte.', 'Podés revisar el detalle con tu familia.', 'Coordinemos un llamado con fecha y hora para retomar la propuesta.'],
    'comp-04': ['Comparemos las unidades con datos verificables.', 'Revisemos el kilometraje, el historial y las cubiertas.', 'La gestoría permite revisar las condiciones documentales.', 'Dejemos por escrito qué incluye cada propuesta.'],
    'fina-05': ['¿Qué ingresos podés demostrar?', 'La aprobación depende del análisis crediticio del banco.', 'Podemos evaluar documentación de tu cónyuge como alternativa.', 'Revisemos la documentación y una propuesta sujeta a aprobación.'],
    'difi-06': ['Entiendo tu preocupación por la procedencia.', 'Podés traer a tu mecánico para revisar y escanear la Hilux.', 'Revisemos juntos el informe de dominio y la documentación disponible.', 'Coordinemos la inspección antes de confirmar la operación.'],
    'sena-07': ['La reserva necesita recibo y cuenta oficial de la agencia.', 'Cualquier excepción de monto o plazo requiere autorización.', 'Confirmemos las condiciones por escrito antes de transferir.', 'Revisemos el monto, el plazo y el recibo oficial.'],
    'inte-08': ['Vamos paso a paso y desglosamos la operación.', 'Primero revisamos el peritaje del Gol y la diferencia.', 'El crédito necesita análisis y aprobación de la entidad.', 'La entrega requiere validación de gestoría y documentación aprobada.']
};
const topics = {
    'desc-01': /corolla|historial|gastos|titular/,
    'toma-02': /ecosport|amarok|peritaje|diferencia|toma/,
    'inde-03': /cruze|mantenimiento|patentes|familia|llamado/,
    'comp-04': /renegade|compar|kilometraje|gestoria/,
    'fina-05': /kangoo|credito|banco|ingresos|aprobacion|cuota/,
    'difi-06': /hilux|mecanico|documentacion|informe|dominio/,
    'sena-07': /208|reserva|recibo|cuenta|sena/,
    'inte-08': /ranger|gol|peritaje|credito|entrega|transferencia/
};

for (const scenario of NEGOTIATION_SCENARIOS) {
    test(scenario.clientProfile.name + ': avanza sin repetir en quince turnos, tanto con respuestas neutras como con el diálogo del caso', async () => {
        for (const messages of [['Bueno, decime.'], scripts[scenario.id]]) {
            const history = [{ sender: 'buyer', text: 'Hola, vengo a consultar por la unidad.' }];
            const replies = [];
            for (let turn = 1; turn <= 15; turn++) {
                const sellerMessage = messages[Math.min(turn - 1, messages.length - 1)];
                history.push({ sender: 'seller', text: sellerMessage });
                const response = await generateBuyerReply({ scenarioId: scenario.id, conversationHistory: history.slice(-31), sellerMessage });
                assert.equal(response.provider, 'simulated');
                assert.equal(response.turnsCount, turn);
                assert.ok(response.text.trim().length > 20);
                assert.equal(hasBuyerReply(history, response.text), false, 'No debe reciclar una respuesta anterior: ' + response.text);
                if (scenario.id !== 'desc-01') assert.doesNotMatch(response.text, /Guillermo|Morales|Corolla/i);
                replies.push(response.text);
                history.push({ sender: 'buyer', text: response.text });
            }
            assert.match(normalize(replies.slice(0, 4).join(' ')), topics[scenario.id], 'Las primeras intervenciones deben corresponder a la operación');
            const sellerMessage = 'Continuamos con el próximo paso.';
            history.push({ sender: 'seller', text: sellerMessage });
            const limit = await generateBuyerReply({ scenarioId: scenario.id, conversationHistory: history.slice(-31), sellerMessage });
            assert.equal(limit.provider, 'system_limit');
            assert.equal(limit.turnsCount, 16);
        }
    });
}

test('La detección de respuestas repetidas ignora tildes, mayúsculas, puntuación y espacios', () => {
    assert.equal(hasBuyerReply([{ sender: 'buyer', text: '¿Podemos revisar la documentación?' }], '¡PODEMOS   REVISAR LA DOCUMENTACION!'), true);
    assert.equal(hasBuyerReply([{ sender: 'seller', text: 'Podemos revisar la documentación.' }], 'Podemos revisar la documentación.'), false);
});

test('La IA conserva toda la conversación y una respuesta repetida pasa al siguiente paso de cada escenario sin perder el consumo registrado', async t => {
    const envNames = ['ACADEMY_OPENAI_API_KEY', 'ACADEMY_AI_ENABLED', 'ACADEMY_AI_BUDGET_USD'];
    const oldEnv = Object.fromEntries(envNames.map(key => [key, process.env[key]]));
    t.after(async () => {
        for (const key of envNames) { if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key]; }
        await resetBudgetForTesting(0);
    });
    process.env.ACADEMY_OPENAI_API_KEY = 'sk-offline-negotiation-fixture-only';
    process.env.ACADEMY_AI_ENABLED = 'true';
    process.env.ACADEMY_AI_BUDGET_USD = '1';
    await resetBudgetForTesting(1);
    let reply = '', calls = [];
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, 'https://api.openai.com/v1/chat/completions');
        calls.push(JSON.parse(options.body));
        return new Response(JSON.stringify({ choices: [{ message: { content: reply } }], usage: { prompt_tokens: 100, completion_tokens: 20 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    for (const scenario of NEGOTIATION_SCENARIOS) {
        const history = Array.from({ length: 9 }, (_, index) => [
            { sender: 'seller', text: 'Dato ya aclarado ' + index },
            { sender: 'buyer', text: 'Intervención anterior ' + index }
        ]).flat();
        const sellerMessage = scripts[scenario.id][0];
        history.push({ sender: 'seller', text: sellerMessage });
        reply = 'Revisemos una propuesta para ' + scenario.clientProfile.name + '.';
        const first = await generateBuyerReply({ scenarioId: scenario.id, conversationHistory: history, sellerMessage, userId: scenario.id });
        assert.equal(first.provider, 'openai');
        assert.equal(calls.at(-1).messages[1].content, 'Dato ya aclarado 0', 'La IA debe recordar lo conversado antes de los últimos cuatro turnos');
        assert.equal(calls.at(-1).messages.filter(message => message.content === sellerMessage).length, 1);
        history.push({ sender: 'buyer', text: first.text });
        history.push({ sender: 'seller', text: 'Sigamos con el detalle.' });
        reply = '¡' + normalize(first.text).toUpperCase().replace(/\.$/, '') + '!';
        const next = await generateBuyerReply({ scenarioId: scenario.id, conversationHistory: history, sellerMessage: 'Sigamos con el detalle.', userId: scenario.id });
        assert.equal(next.provider, 'simulated');
        assert.equal(next.aiStatusReason, 'repeated_buyer_reply');
        assert.equal(hasBuyerReply(history, next.text), false);
        assert.equal(next.turnsCount, 11);
        if (scenario.id !== 'desc-01') assert.doesNotMatch(next.text, /Guillermo|Corolla/i);
    }
    const budget = await getBudgetStatus();
    assert.equal(calls.length, 16);
    assert.equal(budget.totalTokensUsed, 16 * 120, 'Incluso las respuestas descartadas consumieron tokens');
    assert.equal(budget.reservedUSD, 0);
    assert.equal(budget.uncertainSpentUSD, 0);
});


test('Un historial largo sin saldo suficiente usa el simulador antes de contactar al proveedor', async t => {
    const keys = ['ACADEMY_OPENAI_API_KEY', 'ACADEMY_AI_ENABLED', 'ACADEMY_AI_BUDGET_USD'];
    const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    t.after(async () => {
        for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; }
        await resetBudgetForTesting(0);
    });
    Object.assign(process.env, { ACADEMY_OPENAI_API_KEY: 'sk-offline-budget-fixture-only', ACADEMY_AI_ENABLED: 'true', ACADEMY_AI_BUDGET_USD: '0.0006' });
    await resetBudgetForTesting(0.0006);
    let providerCalls = 0;
    t.mock.method(globalThis, 'fetch', async () => { providerCalls++; throw new Error('No debe llamarse al proveedor sin saldo para el historial.'); });
    const history = Array.from({ length: 9 }, () => [
        { sender: 'seller', text: 'x'.repeat(500) }, { sender: 'buyer', text: 'y'.repeat(250) }
    ]).flat();
    const response = await generateBuyerReply({ scenarioId: 'inte-08', conversationHistory: history, sellerMessage: 'Revisemos el detalle de la propuesta.', userId: 'contexto-largo-sin-saldo' });
    assert.equal(response.provider, 'simulated');
    assert.equal(response.aiStatusReason, 'budget_exhausted');
    assert.equal(providerCalls, 0);
    const budget = await getBudgetStatus();
    assert.equal(budget.confirmedSpentUSD, 0);
    assert.equal(budget.reservedUSD, 0);
});
