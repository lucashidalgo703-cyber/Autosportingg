import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getBudgetDoc,
    getBudgetStatus,
    reserveAICall,
    settleAICall,
    incrementUserQuota,
    setAuthorizedBudget,
    resetBudgetForTesting,
    USER_QUOTA_LIMITS
} from '../src/services/academyBudgetService.js';
import {
    evaluateNegotiation,
    generateBuyerReply,
    generateTutorReply,
    checkConfidentialityPolicy,
    getAIConnectionStatus
} from '../src/services/academyAIService.js';
import {
    getUserProgress,
    syncLocalProgress,
    saveErrorReflection,
    assignTrack,
    recommendActivity
} from '../src/services/academyProgressService.js';

// ============================================================================
// 1. PRESUPUESTO PERSISTENTE DE OPENAI E INDEPENDIENTE DE CODEX (SECCIÓN 2)
// ============================================================================

test('Presupuesto Persistente: El presupuesto por defecto es estrictamente 0 USD', async () => {
    delete process.env.ACADEMY_AI_BUDGET_USD;
    await resetBudgetForTesting(0);
    const status = await getBudgetStatus();
    assert.equal(status.authorizedBudgetUSD, 0, 'El presupuesto por defecto no debe ser positivo');
    assert.equal(status.isExhausted, true);
    assert.equal(status.availableUSD, 0);
});

test('Presupuesto Persistente: Reserva atómica, confirmación de consumo y cálculo de remanente', async () => {
    // Autorizar $2.00 USD para pruebas
    await resetBudgetForTesting(2.00);

    // Habilitar temporalmente variables dedicadas para probar la reserva
    process.env.ACADEMY_OPENAI_API_KEY = 'sk-academy-dedicated-live-test-key-999';
    process.env.ACADEMY_AI_ENABLED = 'true';

    const res1 = await reserveAICall({ userId: 'vendedor-test-1', callType: 'buyer' });
    assert.equal(res1.allowed, true);
    assert.ok(res1.reservationId);
    assert.equal(res1.estimatedCostUSD, 0.0005);

    // Comprobar estado con reserva activa
    const statusReserved = await getBudgetStatus('vendedor-test-1');
    assert.equal(statusReserved.reservedUSD, 0.0005);
    assert.ok(statusReserved.availableUSD < 2.00);

    // Confirmar consumo real
    await settleAICall({
        reservationId: res1.reservationId,
        tokensIn: 200,
        tokensOut: 50,
        actualCostUSD: 0.00006,
        status: 'success',
        userId: 'vendedor-test-1',
        callType: 'buyer'
    });

    const statusSettled = await getBudgetStatus('vendedor-test-1');
    assert.equal(statusSettled.reservedUSD, 0, 'La reserva debe liberarse tras liquidar');
    assert.equal(statusSettled.confirmedSpentUSD, 0.00006);
    assert.equal(statusSettled.totalTokensUsed, 250);

    // Limpieza
    delete process.env.ACADEMY_OPENAI_API_KEY;
    delete process.env.ACADEMY_AI_ENABLED;
    await resetBudgetForTesting(0);
});

test('Presupuesto Persistente: Timeout o fallo incierto se registra en uncertainSpentUSD', async () => {
    await resetBudgetForTesting(1.00);
    process.env.ACADEMY_OPENAI_API_KEY = 'sk-academy-dedicated-test-key-uncertain';
    process.env.ACADEMY_AI_ENABLED = 'true';

    const resTimeout = await reserveAICall({ userId: 'vendedor-timeout', callType: 'evaluator' });
    assert.equal(resTimeout.allowed, true);

    // Simular que la llamada externa aborta por timeout
    await settleAICall({
        reservationId: resTimeout.reservationId,
        status: 'uncertain',
        errorMessage: 'AbortError: Request timed out after 12000ms',
        userId: 'vendedor-timeout',
        callType: 'evaluator'
    });

    const statusUncertain = await getBudgetStatus('vendedor-timeout');
    assert.equal(statusUncertain.reservedUSD, 0, 'Reserva liberada');
    assert.equal(statusUncertain.uncertainSpentUSD, 0.0020, 'Costo estimado queda registrado como gasto incierto');
    assert.equal(statusUncertain.confirmedSpentUSD, 0);

    // Limpieza
    delete process.env.ACADEMY_OPENAI_API_KEY;
    delete process.env.ACADEMY_AI_ENABLED;
    await resetBudgetForTesting(0);
});

test('Presupuesto Persistente: Bloqueo de llamadas al agotarse el saldo sin error de servidor', async () => {
    // Presupuesto diminuto que se agota en 1 llamada
    await resetBudgetForTesting(0.0004);
    process.env.ACADEMY_OPENAI_API_KEY = 'sk-academy-dedicated-key-exhaust';
    process.env.ACADEMY_AI_ENABLED = 'true';

    // Se intenta reservar llamada de buyer (requiere 0.0005)
    const res = await reserveAICall({ userId: 'vendedor-exhaust', callType: 'buyer' });
    assert.equal(res.allowed, false);
    assert.equal(res.simulated, true);
    assert.equal(res.reason, 'budget_exhausted');

    delete process.env.ACADEMY_OPENAI_API_KEY;
    delete process.env.ACADEMY_AI_ENABLED;
    await resetBudgetForTesting(0);
});

// ============================================================================
// 2. CUOTAS POR EMPLEADO Y LÍMITES DIARIOS (SECCIÓN 3)
// ============================================================================

test('Cuotas de Usuario: Límite diario de 10 sesiones de negociación y 20 consultas de tutor', async () => {
    await resetBudgetForTesting(10.00);
    process.env.ACADEMY_OPENAI_API_KEY = 'sk-academy-quota-test-key';
    process.env.ACADEMY_AI_ENABLED = 'true';

    const userId = 'usr-quota-test';

    // Simular 10 prácticas completadas en el día
    for (let i = 0; i < USER_QUOTA_LIMITS.MAX_SESSIONS_PER_DAY; i++) {
        await incrementUserQuota(userId, 'session');
    }

    const quotaStatus = await getBudgetStatus(userId);
    assert.equal(quotaStatus.userQuota.sessionsToday, 10);
    assert.equal(quotaStatus.userQuota.sessionsRemaining, 0);

    // La práctica número 11 es denegada en OpenAI pero redirige a modo pedagógico simulado
    const nextSessionRes = await reserveAICall({ userId, callType: 'buyer' });
    assert.equal(nextSessionRes.allowed, false);
    assert.equal(nextSessionRes.simulated, true);
    assert.equal(nextSessionRes.reason, 'user_session_quota_reached');
    assert.ok(nextSessionRes.message.toLowerCase().includes('límite diario'));

    delete process.env.ACADEMY_OPENAI_API_KEY;
    delete process.env.ACADEMY_AI_ENABLED;
    await resetBudgetForTesting(0);
});

test('Cuotas de Usuario: Límite de concurrencia por usuario (máx. 1 llamada pendiente)', async () => {
    await resetBudgetForTesting(10.00);
    process.env.ACADEMY_OPENAI_API_KEY = 'sk-academy-concurrency-test-key';
    process.env.ACADEMY_AI_ENABLED = 'true';

    const userId = 'usr-concurrency-test';

    // Primera reserva pendiente
    const res1 = await reserveAICall({ userId, callType: 'buyer' });
    assert.equal(res1.allowed, true);

    // Segunda reserva inmediata con la primera aún pendiente
    const res2 = await reserveAICall({ userId, callType: 'buyer' });
    assert.equal(res2.allowed, false);
    assert.equal(res2.reason, 'user_concurrency_limit');

    // Liquidar res1
    await settleAICall({ reservationId: res1.reservationId, status: 'failed', userId, callType: 'buyer' });

    delete process.env.ACADEMY_OPENAI_API_KEY;
    delete process.env.ACADEMY_AI_ENABLED;
    await resetBudgetForTesting(0);
});

// ============================================================================
// 3. SINCRONIZACIÓN MULTIDISPOSITIVO Y PRIVACIDAD MULTIUSUARIO (SECCIÓN 4)
// ============================================================================

test('Sincronización Multidispositivo: Unión de lecciones y mejor calificación en simulaciones', async () => {
    const user = { id: 'usr-sync-devices-01', role: 'ventas', name: 'Facundo Móvil' };

    // Dispositivo A: Completa lección 1 y simulación con 70 puntos
    await syncLocalProgress(user, {
        completedLessons: ['l-01'],
        completedRoleModules: ['VTA-01'],
        simulationAttempts: [
            { simulationId: 'sim-vta-01', score: 70, passed: true }
        ]
    });

    // Dispositivo B: Completa lección 2 y la misma simulación con 95 puntos
    const synced = await syncLocalProgress(user, {
        completedLessons: ['l-02'],
        completedRoleModules: ['VTA-02'],
        simulationAttempts: [
            { simulationId: 'sim-vta-01', score: 95, passed: true }
        ]
    });

    const lessonIds = synced.completedLessons.map(l => l.lessonId);
    assert.ok(lessonIds.includes('l-01') && lessonIds.includes('l-02'), 'Debe unir lecciones de ambos dispositivos');

    const moduleIds = synced.completedRoleModules.map(m => m.moduleId);
    assert.ok(moduleIds.includes('VTA-01') && moduleIds.includes('VTA-02'), 'Debe unir módulos de ambos dispositivos');

    const sim = synced.simulationAttempts.find(s => s.simulationId === 'sim-vta-01');
    assert.equal(sim.score, 95, 'Debe conservar la calificación más alta obtenida');
});

test('Sincronización Multidispositivo: Las asignaciones del supervisor tienen autoridad sobre el cliente', async () => {
    const supervisor = { id: 'usr-owner-sup', role: 'owner', name: 'Titular' };
    const employee = { id: 'usr-sync-sup-emp', role: 'ventas', name: 'Empleado' };

    // Supervisor asigna recorrido de Gestoría
    await assignTrack(supervisor, employee.id, 'track-gestoria');
    await recommendActivity(supervisor, employee.id, { id: 'GES-01', title: 'Documentación inicial', type: 'module' });

    // Empleado sincroniza desde el celular con un track local obsoleto
    const synced = await syncLocalProgress(employee, {
        assignedTrack: 'track-vendedor-antiguo',
        completedLessons: ['l-01']
    });

    assert.equal(synced.assignedTrack, 'track-gestoria', 'La asignación del supervisor tiene autoridad inmutable');
    assert.equal(synced.recommendedActivities.length, 1);
});

test('Sincronización Multidispositivo: Edición concurrente de reflexión preserva el contenido más extenso', async () => {
    const employee = { id: 'usr-reflection-sync', role: 'ventas', name: 'Rodrigo' };

    // Guardar reflexión inicial
    const initialRef = await saveErrorReflection(employee, {
        situation: 'Error breve inicial',
        actionTaken: 'No indagué',
        difficultyEncountered: 'Objeción',
        alternativeApproach: 'Mejorar'
    });

    // Dispositivo B envía versión más desarrollada con el mismo situation
    const synced = await syncLocalProgress(employee, {
        errorReflections: [
            {
                id: String(initialRef._id),
                situation: 'Error en negociación: el cliente Don Guillermo pidió 3M y no desglosé el informe de dominio',
                actionTaken: 'Rechacé de plano sin fundamentar el peritaje oficial de la agencia',
                difficultyEncountered: 'El comprador se sintió poco escuchado y se retiró a comparar en otra agencia',
                alternativeApproach: 'Explicar los 80 puntos de revisión y la garantía de transferencia al día'
            }
        ]
    });

    const updatedRef = synced.errorReflections.id(initialRef._id);
    assert.ok(updatedRef.situation.includes('Don Guillermo'), 'Debe preservar el contenido de mayor desarrollo');
    assert.ok(updatedRef.alternativeApproach.includes('80 puntos'));
});

// ============================================================================
// 4. CONTEXTO Y CALIFICACIONES DEL EVALUADOR (SECCIONES 5 Y 6)
// ============================================================================

test('Evaluador Contextual: Rechazo justificado obtiene calificación alta (>= 80) y resultado "desistido_con_criterio"', async () => {
    const session = [
        { sender: 'buyer', text: 'Tienen la Renegade a 24M, en otra agencia me la dejan a 21M. O me igualan o me voy.' },
        { sender: 'seller', text: 'Entiendo perfectamente su postura Don Morales. Sin embargo, nuestra Renegade cuenta con 42.000 km reales, services oficiales y cubiertas nuevas, mientras que la otra unidad tiene 85.000 km. Por política de rentabilidad de AutoSporting no podemos acceder a esa rebaja de 3 millones porque destruiría el margen de la unidad. Si le parece, le propongo evaluar una alternativa de financiación prendaria o una bonificación en los gastos de transferencia.' }
    ];

    const evalResult = await evaluateNegotiation({ scenarioId: 'comp-04', conversationHistory: session });

    assert.equal(evalResult.outcomeStatus, 'desistido_con_criterio');
    assert.ok(evalResult.score >= 80, `Score esperado >= 80, obtenido: ${evalResult.score}`);
    assert.ok(evalResult.evaluationContext, 'Debe incluir evaluationContext con demandas, diagnóstico y alternativas');
    assert.ok(evalResult.evaluationContext.buyerDemands);
    assert.ok(evalResult.evaluationContext.refusalExplanation);
    assert.ok(evalResult.heuristicDisclaimer.includes('Aviso pedagógico'));
    assert.ok(evalResult.competencies.negociacionAutorizaciones.score >= 90);
});

test('Evaluador Contextual: Rechazo injustificado/prematuro obtiene calificación menor (<= 65) y "desistido_injustificado"', async () => {
    const bluntDeclineSession = [
        { sender: 'buyer', text: '¿Me hacés una rebaja de $1.000.000 si te pago de contado hoy?' },
        { sender: 'seller', text: 'No. El precio es fijo y no se baja ni un peso.' }
    ];

    const evalResult = await evaluateNegotiation({ scenarioId: 'desc-01', conversationHistory: bluntDeclineSession });

    assert.equal(evalResult.outcomeStatus, 'desistido_injustificado');
    assert.ok(evalResult.score <= 65, `Score esperado <= 65 para rechazo sin diagnóstico ni explicación, obtenido: ${evalResult.score}`);
    assert.ok(evalResult.competencies.identificacionNecesidades.score <= 65);
});

test('Evaluador Contextual: Falta grave institucional reprueba de forma terminante (score <= 40)', async () => {
    const criticalBreaches = [
        // 1. Cobro en cuenta personal
        [
            { sender: 'buyer', text: '¿Dónde te transfiero la seña?' },
            { sender: 'seller', text: 'Con gusto Don Guillermo, transferime a mi cuenta personal de Mercado Pago y te aseguro el auto.' }
        ],
        // 2. Entrega sin transferencia
        [
            { sender: 'buyer', text: 'Necesito la camioneta hoy para salir al campo.' },
            { sender: 'seller', text: 'Firmamos el boleto y llevátela hoy mismo sin transferencia, después hacemos los papeles.' }
        ],
        // 3. Confirmación de crédito sin scoring bancario
        [
            { sender: 'buyer', text: 'Tengo muchas deudas en el Veraz y no tengo recibo de sueldo.' },
            { sender: 'seller', text: 'No te preocupes por el veraz, te lo apruebo yo y sale con DNI sí o sí sin bancos.' }
        ]
    ];

    for (const breachHistory of criticalBreaches) {
        const evalResult = await evaluateNegotiation({ scenarioId: 'fina-05', conversationHistory: breachHistory });
        assert.equal(evalResult.outcomeStatus, 'sin_acuerdo_error_grave');
        assert.ok(evalResult.score <= 40, `Falta grave no puede superar 40 puntos, obtenido: ${evalResult.score}`);
        assert.ok(evalResult.competencies.negociacionAutorizaciones.score <= 30);
    }
});
