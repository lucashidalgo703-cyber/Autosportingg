import test from 'node:test';
import assert from 'node:assert/strict';
import { NEGOTIATION_SCENARIOS } from '../src/lib/academy/negotiationScenarios.js';
import { getPreviousNegotiationHistory, simulateDiscountBuyerReply, buildNegotiationKeyMoments } from '../src/lib/academy/negotiationConversation.js';
import { generateBuyerReply } from '../src/services/academyAIService.js';

process.env.ACADEMY_AI_ENABLED = 'false';

test('Guillermo no repite respuestas durante los quince turnos del request real de la UI', async () => {
    const history = [{ sender: 'buyer', text: 'Me gusta el Corolla. ¿Qué propuesta me podés hacer?' }];
    const replies = new Set();
    for (let turn = 1; turn <= 15; turn++) {
        const sellerMessage = 'El historial de servicios oficiales está disponible y cualquier atención requiere autorización del titular.';
        history.push({ sender: 'seller', text: sellerMessage });
        const response = await generateBuyerReply({ scenarioId: 'desc-01', conversationHistory: history.slice(-31), sellerMessage });
        assert.equal(response.provider, 'simulated');
        assert.equal(response.turnsCount, turn, 'el mensaje actual no cuenta dos veces');
        assert.ok(!replies.has(response.text), 'la respuesta debe aportar un próximo paso sin repetir una frase anterior');
        replies.add(response.text);
        history.push({ sender: 'buyer', text: response.text });
    }
    history.push({ sender: 'seller', text: 'Seguimos conversando.' });
    const limit = await generateBuyerReply({ scenarioId: 'desc-01', conversationHistory: history.slice(-31), sellerMessage: 'Seguimos conversando.' });
    assert.equal(limit.provider, 'system_limit');
    assert.equal(limit.turnsCount, 16);
});

test('Las respuestas genéricas tampoco entran en bucle si el vendedor insiste', () => {
    const history = [];
    for (let turn = 1; turn <= 15; turn++) {
        const reply = simulateDiscountBuyerReply(history, 'Bueno, decime.');
        assert.ok(!history.some(message => message.text === reply));
        history.push({ sender: 'seller', text: 'Bueno, decime.' }, { sender: 'buyer', text: reply });
    }
});

test('Guillermo responde necesidades, valida valor y pasa a reserva sin reiniciar la objeción', () => {
    const history = [];
    const needs = simulateDiscountBuyerReply(history, '¿Qué uso le vas a dar?');
    assert.match(needs, /Comodoro|trabajo/);
    history.push({ sender: 'seller', text: '¿Qué uso le vas a dar?' }, { sender: 'buyer', text: needs });
    const value = simulateDiscountBuyerReply(history, 'Podemos revisar el historial de servicios oficiales.');
    assert.match(value, /historial|gastos/);
    history.push({ sender: 'seller', text: 'Podemos revisar el historial de servicios oficiales.' }, { sender: 'buyer', text: value });
    const proposal = simulateDiscountBuyerReply(history, 'Puedo consultar al titular una atención de $300.000 sujeta a autorización.');
    assert.match(proposal, /titular autoriza/);
    history.push({ sender: 'seller', text: 'Puedo consultar al titular una atención de $300.000 sujeta a autorización.' }, { sender: 'buyer', text: proposal });
    const closing = simulateDiscountBuyerReply(history, 'Repasemos las condiciones de la reserva oficial y el recibo.');
    assert.match(closing, /reserva oficial|monto|plazo/);
    assert.doesNotMatch(closing, /Trelew|precio me hace ruido/);
});

test('Una rebaja sin consulta genera desconfianza; mencionar autorización no la da por aprobada', () => {
    const reply = simulateDiscountBuyerReply([], 'Te hago un descuento ahora mismo.');
    assert.match(reply, /dudas|consultar/);
    const conditional = simulateDiscountBuyerReply([{ sender: 'seller', text: 'El historial de servicios está disponible.' }], 'Te hago un descuento solo si lo autoriza el titular.');
    assert.match(conditional, /si el titular autoriza/i);
    assert.doesNotMatch(conditional, /genera dudas/);
});

test('Historial compatible con clientes que incluyen o separan el mensaje actual', async () => {
    const previous = [{ sender: 'buyer', text: '¿En cuánto me queda el Corolla?' }];
    const sellerMessage = '¿Qué uso le vas a dar?';
    const included = [...previous, { sender: 'seller', text: sellerMessage }];
    assert.deepEqual(getPreviousNegotiationHistory(included, sellerMessage), previous);
    assert.equal(included.length, 2, 'normalizar no modifica el array recibido');
    const [a, b] = await Promise.all([previous, included].map(conversationHistory => generateBuyerReply({ scenarioId: 'desc-01', conversationHistory, sellerMessage })));
    assert.equal(a.text, b.text);
    assert.equal(a.turnsCount, 1);
    assert.equal(b.turnsCount, 1);
});

test('Los ejemplos de evaluación cambian según el diagnóstico y la intervención de cierre', () => {
    const scenario = NEGOTIATION_SCENARIOS[0];
    const initial = buildNegotiationKeyMoments(scenario, [{ text: 'Hola, está en precio de lista.' }], { hasDiagnosis: false });
    const progressed = buildNegotiationKeyMoments(scenario, [{ text: '¿Qué uso le vas a dar?' }, { text: 'Revisemos el historial y después la reserva oficial.' }], { hasDiagnosis: true, quoteArgumentacion: 'Revisemos el historial.' });
    assert.match(initial[0].suggestedAlternative, /qué uso/);
    assert.match(progressed[0].suggestedAlternative, /consultarla con el titular/);
    assert.match(progressed[1].suggestedAlternative, /recibo oficial/);
    assert.notEqual(initial[0].suggestedAlternative, progressed[0].suggestedAlternative);
    assert.notEqual(initial[1].suggestedAlternative, progressed[1].suggestedAlternative);
    assert.doesNotMatch(JSON.stringify(progressed), /800\.000|24 hs/);
});

test('Los ejemplos corresponden al cliente y la operación de cada escenario', () => {
    const firstExamples = new Set();
    for (const scenario of NEGOTIATION_SCENARIOS) {
        const moments = buildNegotiationKeyMoments(scenario, [{ text: '¿Qué uso le vas a dar?' }, { text: 'Revisemos la propuesta.' }], { hasDiagnosis: true });
        assert.ok(moments.every(moment => moment.suggestedAlternative.startsWith(scenario.clientProfile.name.split(' ')[0] + ',')));
        assert.doesNotMatch(moments[0].suggestedAlternative, /Don Morales/);
        firstExamples.add(moments[0].suggestedAlternative);
    }
    assert.equal(firstExamples.size, 8);
});

test('El ejemplo prioriza corregir la cuenta personal y no invita a una reserva irregular', () => {
    const moments = buildNegotiationKeyMoments(NEGOTIATION_SCENARIOS[6], [{ text: 'Transferime a mi alias.' }], { hasDiagnosis: true, hasCriticalError: true });
    assert.match(moments[0].suggestedAlternative, /cuentas autorizadas/);
    assert.match(moments[1].suggestedAlternative, /circuito oficial/);
});
