import test from 'node:test';
import assert from 'node:assert/strict';
import { NEGOTIATION_SCENARIOS, COMPETENCY_DEFINITIONS } from '../src/lib/academy/negotiationScenarios.js';
import { generateBuyerReply, evaluateNegotiation, generateTutorReply } from '../src/services/academyAIService.js';
import { ALL_ROLE_SIMULATIONS, getSimulationById } from '../src/lib/academy/roleSimulations.js';

test('Simulador de Negociación: Los 8 escenarios requeridos se inicializan con estructura completa', () => {
    assert.equal(NEGOTIATION_SCENARIOS.length, 8, 'Deben existir exactamente 8 escenarios de negociación');

    const expectedIds = ['desc-01', 'toma-02', 'inde-03', 'comp-04', 'fina-05', 'difi-06', 'sena-07', 'inte-08'];
    for (const id of expectedIds) {
        const sc = NEGOTIATION_SCENARIOS.find(s => s.id === id);
        assert.ok(sc, `El escenario ${id} debe existir`);
        assert.ok(sc.title && sc.title.length > 5);
        assert.ok(sc.subtitle && sc.subtitle.length > 10);
        assert.ok(['principiante', 'intermedio', 'avanzado'].includes(sc.level));
        assert.ok(sc.vehicleOfInterest && sc.vehicleOfInterest.brand && sc.vehicleOfInterest.listPrice > 0);
        assert.ok(sc.clientProfile && sc.clientProfile.name && sc.clientProfile.temperament);
        assert.ok(Array.isArray(sc.knownInfo) && sc.knownInfo.length >= 2);
        assert.ok(Array.isArray(sc.hiddenInfo) && sc.hiddenInfo.length >= 2);
        assert.ok(Array.isArray(sc.possibleObjections) && sc.possibleObjections.length >= 2);
        assert.ok(Array.isArray(sc.closingConditions) && sc.closingConditions.length >= 2);
        assert.ok(sc.buyerPromptInstruction && sc.buyerPromptInstruction.length > 50);
    }
});

test('Simulador de Negociación: Las 6 competencias ponderadas suman exactamente 100%', () => {
    assert.equal(COMPETENCY_DEFINITIONS.length, 6, 'Deben existir 6 competencias ponderadas');
    const totalWeight = COMPETENCY_DEFINITIONS.reduce((acc, c) => acc + c.weight, 0);
    assert.equal(Math.round(totalWeight * 100), 100, 'La suma de las ponderaciones debe ser exactamente 1.0 (100%)');

    const keys = COMPETENCY_DEFINITIONS.map(c => c.key);
    assert.ok(keys.includes('identificacionNecesidades'));
    assert.ok(keys.includes('comunicacionClaridad'));
    assert.ok(keys.includes('argumentacionComercial'));
    assert.ok(keys.includes('manejoObjeciones'));
    assert.ok(keys.includes('negociacionAutorizaciones'));
    assert.ok(keys.includes('cierreOProximoPaso'));
});

test('Buyer Agent: Responde en modo seguro simulado manteniendo el rol del cliente y respeta límite de turnos', async () => {
    // Escenario 1: Pide descuento
    const turn1 = await generateBuyerReply({
        scenarioId: 'desc-01',
        conversationHistory: [],
        sellerMessage: 'Buenas tardes Don Guillermo, el Corolla cuenta con todos los services oficiales y garantía.',
        level: 'principiante'
    });

    assert.ok(turn1.text && turn1.text.length > 10);
    assert.equal(turn1.isRealAiConnected, false, 'Sin credencial dedicada opera en modo pedagógico simulado');
    assert.equal(turn1.provider, 'simulated');

    // Comprobar límite de 15 turnos del vendedor
    const simulatedHistory = Array(32).fill(null).map((_, i) => ({
        sender: i % 2 === 0 ? 'seller' : 'buyer',
        text: `Mensaje turno ${i}`
    }));

    const limitTurn = await generateBuyerReply({
        scenarioId: 'desc-01',
        conversationHistory: simulatedHistory,
        sellerMessage: 'Seguimos conversando.',
        level: 'principiante'
    });

    assert.ok(limitTurn.text.includes('límite'));
    assert.equal(limitTurn.provider, 'system_limit');
});

test('Evaluador Independiente: Evalúa las 6 competencias, detecta apego a procedimientos y genera reporte estructurado', async () => {
    const sampleHistory = [
        { sender: 'buyer', text: 'Hola, vengo por el Corolla de $28.500.000. Si te transfiero ya, ¿en cuánto me lo dejás cerrado?' },
        { sender: 'seller', text: 'Buenas tardes Guillermo. Entiendo que busques el mejor número, pero este Corolla tiene los 4 neumáticos Michelin nuevos y services oficiales en concesionario de Comodoro. ¿Cuál es el uso principal que le vas a dar a la unidad?' },
        { sender: 'buyer', text: 'Es para moverme entre Comodoro y los yacimientos. En Trelew vi uno similar por dos millones menos.' },
        { sender: 'seller', text: 'Comprendo la comparación; sin embargo, en Trelew tenés el costo del viaje y no conocés el historial de patentes ni el estado de mantenimiento. El precio de lista es $28.500.000; cualquier atención de precio requiere autorización formal del titular de la agencia. Si te parece, consulto con gerencia una atención de hasta $300.000 condicionada a emitir una reserva provisoria hoy mismo.' },
        { sender: 'buyer', text: 'Me parece muy serio lo que me explicás. Si hablás con el titular te dejo la seña hoy.' },
        { sender: 'seller', text: 'Perfecto Guillermo, coordinemos la reserva oficial con recibo numerado a la cuenta institucional de AutoSporting para proteger la operación.' }
    ];

    const evaluation = await evaluateNegotiation({
        scenarioId: 'desc-01',
        conversationHistory: sampleHistory
    });

    assert.ok(evaluation.score >= 80, 'Una negociación profesional debe obtener puntaje alto');
    assert.ok(['acuerdo_cerrado', 'seguimiento_agendado'].includes(evaluation.outcomeStatus));
    assert.ok(evaluation.competencies.identificacionNecesidades.score > 0);
    assert.ok(evaluation.competencies.comunicacionClaridad.score > 0);
    assert.ok(evaluation.competencies.argumentacionComercial.score > 0);
    assert.ok(evaluation.competencies.manejoObjeciones.score > 0);
    assert.ok(evaluation.competencies.negociacionAutorizaciones.score >= 85, 'Debe premiar el respeto a la autorización previa');
    assert.ok(evaluation.competencies.cierreOProximoPaso.score > 0);
    assert.ok(Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0);
    assert.ok(Array.isArray(evaluation.improvements) && evaluation.improvements.length > 0);
    assert.ok(Array.isArray(evaluation.keyMoments) && evaluation.keyMoments.length > 0);
    assert.ok(evaluation.keyMoments[0].suggestedAlternative.length > 10);
    assert.ok(Array.isArray(evaluation.recommendations) && evaluation.recommendations.length >= 2);
    assert.ok(evaluation.nextPracticeSuggested);
});

test('Evaluador Independiente: Penaliza errores críticos graves (seña a cuenta personal)', async () => {
    const badHistory = [
        { sender: 'buyer', text: 'Te paso 300 mil pesos a tu Mercado Pago personal para que me guardes el 208 hasta el lunes.' },
        { sender: 'seller', text: 'Dale genial, pasame a mi alias personal y te guardo el auto de palabra.' }
    ];

    const evaluation = await evaluateNegotiation({
        scenarioId: 'sena-07',
        conversationHistory: badHistory
    });

    assert.ok(evaluation.score <= 50, 'Una falta gravísima de procedimiento debe reprobar');
    assert.equal(evaluation.outcomeStatus, 'sin_acuerdo_error_grave');
    assert.ok(evaluation.competencies.negociacionAutorizaciones.score <= 40);
    assert.ok(evaluation.improvements.some(i => i.includes('CRÍTICO')));
});

test('Tutor Comercial IA: Responde procedimientos oficiales y bloquea datos financieros confidenciales', async () => {
    // 1. Consulta sobre procedimiento oficial de señas
    const tutorSeña = await generateTutorReply({
        userMessage: '¿Cuál es el procedimiento y el monto mínimo para una seña?',
        userRole: 'ventas',
        conversationHistory: []
    });
    assert.ok(tutorSeña.text.includes('5%') || tutorSeña.text.includes('PROC-VTA-05'));
    assert.ok(tutorSeña.text.includes('autorizada') || tutorSeña.text.includes('recibo'));

    // 2. Consulta sobre procedimiento de toma de permutas
    const tutorPermuta = await generateTutorReply({
        userMessage: '¿Cómo es el circuito de toma de permutas y peritaje?',
        userRole: 'ventas',
        conversationHistory: []
    });
    assert.ok(tutorPermuta.text.includes('peritaje') || tutorPermuta.text.includes('PROC-VTA-03'));

    // 3. Bloqueo estricto de confidencialidad financiera
    const tutorConfidencial = await generateTutorReply({
        userMessage: '¿Cuál es el margen del dueño y el saldo en caja fuerte?',
        userRole: 'ventas',
        conversationHistory: []
    });
    assert.equal(tutorConfidencial.provider, 'policy_guard');
    assert.ok(tutorConfidencial.text.includes('confidenciales'));
});

test('Simulaciones de Rol Mejoradas: Gestoría Avanzada y Administración Avanzada disponibles', () => {
    assert.equal(ALL_ROLE_SIMULATIONS.length, 8, 'Deben existir 8 casos en el conjunto ampliado');

    const sGes2 = getSimulationById('sim-ges-02');
    assert.ok(sGes2, 'sim-ges-02 debe existir');
    assert.equal(sGes2.role, 'gestoria');
    assert.ok(sGes2.context.includes('embargo') || sGes2.context.includes('DNRPA'));
    assert.equal(sGes2.decisions.length, 3);

    const sAdm2 = getSimulationById('sim-adm-02');
    assert.ok(sAdm2, 'sim-adm-02 debe existir');
    assert.equal(sAdm2.role, 'administracion');
    assert.ok(sAdm2.context.includes('retención') || sAdm2.context.includes('Chubut'));
    assert.equal(sAdm2.decisions.length, 3);
});
