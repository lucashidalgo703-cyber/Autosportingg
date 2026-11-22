// tests/academy3DailyChallenges.test.js
// Pruebas unitarias e integrales para AutoSporting Academy 3.0:
// Desafíos diarios, conocimiento del stock, repetición espaciada y supervisión inteligente.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    sanitizeCommercialCar,
    validateCarCompleteness
} from '../src/services/academyStockAdapter.js';
import {
    parseNumericalResponse,
    buildQuestionsFromStock,
    getOrCreateDailyChallenge,
    submitChallengeAttempt,
    getSellerDailyStatus,
    resetDailyChallengesForTesting
} from '../src/services/academyDailyChallengeService.js';
import {
    recordConceptOutcome,
    getWeakConceptsForUser,
    getMasteredConceptsForUser,
    getDueConceptsForReview,
    getTodayArgentinaDate,
    resetMemoryForTesting
} from '../src/services/academyMemoryService.js';
import {
    createChallengeCompletedNotification,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    resetNotificationsForTesting
} from '../src/services/academyNotificationService.js';
import {
    validateIntakeCarForEvaluation,
    generateNewIntakeMiniChallenge
} from '../src/services/academyNewIntakeChallengeService.js';
import {
    getDailyControlOverview,
    getSellerIndividualCard,
    getAttemptQuestionDetail,
    invalidateAttemptQuestion
} from '../src/services/academySupervisionService.js';

// ============================================================================
// 1. ADAPTADOR DE STOCK COMERCIAL Y SEGURIDAD FINANCIERA (SECCIÓN 3)
// ============================================================================

test('Adaptador de Stock: Sanitiza vehículos y jamás expone costos de compra, márgenes ni datos confidenciales', () => {
    const rawCarFromDB = {
        _id: 'car-test-01',
        brand: 'Volkswagen',
        name: 'Amarok V6 Extreme 4x4 AT',
        year: 2022,
        km: 45000,
        price: 38000000,
        currency: 'ARS',
        fuel: 'Diesel',
        color: 'Gris Plata',
        vehicleType: 'Pick-up',
        hasManuals: 'Si',
        hasDuplicateKeys: 'Si',
        hasOfficialServices: 'Si',
        status: 'Disponible',
        coverImage: 'https://res.cloudinary.com/demo/image/upload/amarok.jpg',
        images: ['https://res.cloudinary.com/demo/image/upload/amarok-1.jpg'],
        // Datos confidenciales internos que deben filtrarse terminantemente
        purchasePrice: 28000000,
        purchaseCurrency: 'ARS',
        agencyOwned: true,
        investor: { name: 'Socio Inversor SA', percentage: 40 },
        jointOwnership: { partnerPercentage: 50, agencyCost: 14000000 },
        expenses: [{ concept: 'Pulido y frenos', amount: 450000, currency: 'ARS' }],
        purchasePaymentState: { totalCost: 28450000, pendingDebt: 0 }
    };

    const sanitized = sanitizeCommercialCar(rawCarFromDB);

    // Campos comerciales autorizados presentes
    assert.equal(sanitized.id, 'car-test-01');
    assert.equal(sanitized.brand, 'Volkswagen');
    assert.equal(sanitized.name, 'Amarok V6 Extreme 4x4 AT');
    assert.equal(sanitized.price, 38000000);
    assert.equal(sanitized.currency, 'ARS');
    assert.equal(sanitized.km, 45000);
    assert.equal(sanitized.hasManuals, true);
    assert.equal(sanitized.hasDuplicateKeys, true);
    assert.equal(sanitized.hasOfficialServices, true);
    assert.equal(sanitized.images.length, 1);

    // REGLA DE ORO DE SEGURIDAD: Ningún dato financiero privado se filtra
    assert.equal(sanitized.purchasePrice, undefined, 'No debe existir purchasePrice');
    assert.equal(sanitized.investor, undefined, 'No debe existir investor');
    assert.equal(sanitized.jointOwnership, undefined, 'No debe existir jointOwnership');
    assert.equal(sanitized.expenses, undefined, 'No debe existir expenses');
    assert.equal(sanitized.purchasePaymentState, undefined, 'No debe existir purchasePaymentState');
});

test('Validación de Stock Completo: Detecta campos faltantes antes de generar examen', () => {
    const incompleteCar = {
        brand: 'Ford',
        name: '', // Falta nombre
        year: 2021,
        km: 50000,
        price: 0, // Falta precio publicado
        currency: 'ARS',
        fuel: 'Diesel',
        images: [] // Faltan imágenes
    };

    const validation = validateCarCompleteness(incompleteCar);
    assert.equal(validation.isComplete, false);
    assert.ok(validation.missingFields.includes('Modelo y Versión'));
    assert.ok(validation.missingFields.includes('Precio publicado'));
    assert.ok(validation.missingFields.includes('Fotografía comercial'));

    const completeCar = {
        brand: 'Toyota',
        name: 'Hilux SRX 4x4',
        year: 2023,
        km: 25000,
        price: 42000000,
        currency: 'ARS',
        fuel: 'Diesel',
        coverImage: 'https://res.cloudinary.com/hilux.jpg'
    };
    const validCheck = validateCarCompleteness(completeCar);
    assert.equal(validCheck.isComplete, true);
    assert.equal(validCheck.missingFields.length, 0);
});

// ============================================================================
// 2. PARSER NUMÉRICO TOLERANTE (SECCIÓN 3)
// ============================================================================

test('Parser Numérico Tolerante: Admite separadores argentinos, sufijo M y formatos flexibles sin marcar incorrecto por formato', () => {
    const targetPrice = 36500000;

    // Distintas formas válidas en que un vendedor argentino ingresa el precio
    assert.ok(parseNumericalResponse('36500000', targetPrice));
    assert.ok(parseNumericalResponse('36.500.000', targetPrice));
    assert.ok(parseNumericalResponse('$ 36.500.000', targetPrice));
    assert.ok(parseNumericalResponse('ARS $ 36.500.000', targetPrice));
    assert.ok(parseNumericalResponse('36,5M', targetPrice));
    assert.ok(parseNumericalResponse('36.5 M', targetPrice));
    assert.ok(parseNumericalResponse('36.5 millones', targetPrice));

    // Valor fuera de tolerancia (> 5%)
    assert.equal(parseNumericalResponse('30.000.000', targetPrice), false);
    assert.equal(parseNumericalResponse('45000000', targetPrice), false);
    assert.equal(parseNumericalResponse('no se', targetPrice), false);
});

// ============================================================================
// 3. GENERACIÓN AUTOMÁTICA DEL DESAFÍO DIARIO (SECCIÓN 4 Y 5)
// ============================================================================

test('Generación Diaria: Construye exactamente 8 preguntas con distribución balanceada y congelamiento histórico', () => {
    const testCars = [
        {
            id: 'car-a',
            brand: 'Volkswagen',
            name: 'Amarok V6 Extreme 4x4 AT',
            year: 2022,
            km: 42000,
            price: 36500000,
            currency: 'ARS',
            fuel: 'Diesel',
            color: 'Gris Plata',
            vehicleType: 'Pick-up',
            hasManuals: true,
            hasDuplicateKeys: true,
            hasOfficialServices: true,
            coverImage: '/photos/amarok.jpg'
        },
        {
            id: 'car-b',
            brand: 'Toyota',
            name: 'Hilux SRX 4x4 AT',
            year: 2021,
            km: 55000,
            price: 38000000,
            currency: 'ARS',
            fuel: 'Diesel',
            color: 'Blanco Perlado',
            vehicleType: 'Pick-up',
            hasManuals: true,
            hasDuplicateKeys: true,
            hasOfficialServices: true,
            coverImage: '/photos/hilux.jpg'
        },
        {
            id: 'car-c',
            brand: 'Jeep',
            name: 'Renegade Longitude 1.8 AT6',
            year: 2023,
            km: 18000,
            price: 24500000,
            currency: 'ARS',
            fuel: 'Nafta',
            color: 'Rojo Colorado',
            vehicleType: 'SUV',
            hasManuals: true,
            hasDuplicateKeys: true,
            hasOfficialServices: true,
            coverImage: '/photos/renegade.jpg'
        }
    ];

    const questions = buildQuestionsFromStock(testCars, []);

    // Exactamente 8 preguntas
    assert.equal(questions.length, 8, 'El examen diario debe tener exactamente 8 preguntas');

    // Distribución por categoría
    const categories = questions.map(q => q.category);
    assert.equal(categories.filter(c => c === 'precio').length, 2, '2 preguntas de precio');
    assert.equal(categories.filter(c => c === 'kilometraje').length, 1, '1 pregunta de kilometraje');
    assert.equal(categories.filter(c => c === 'version_equipamiento').length, 2, '2 preguntas de versión y equipamiento');
    assert.equal(categories.filter(c => c === 'reconocimiento').length, 1, '1 pregunta de reconocimiento fotográfico');
    assert.equal(categories.filter(c => c === 'procedimiento').length, 1, '1 pregunta de procedimientos oficiales');
    assert.equal(categories.filter(c => c === 'negociacion').length, 1, '1 situación de negociación');

    // Congelamiento de datos (snapshot): cada pregunta contiene el estado del vehículo en carSnapshot
    const qPrecio = questions.find(q => q.category === 'precio');
    assert.ok(qPrecio.carSnapshot, 'Debe registrar carSnapshot');
    assert.equal(qPrecio.carSnapshot.price, 36500000);
    assert.equal(qPrecio.carSnapshot.brand, 'Volkswagen');

    // Negociación: incluye rúbrica de negativa comercial fundamentada
    const qNeg = questions.find(q => q.category === 'negociacion');
    assert.ok(qNeg.openRubric);
    assert.equal(qNeg.openRubric.acceptableRefusal, true, 'Una negativa bien fundamentada debe ser considerada válida');
});

// ============================================================================
// 4. MEMORIZACIÓN, REPETICIÓN ESPACIADA Y DEBILIDADES (SECCIÓN 6)
// ============================================================================

test('Repetición Espaciada: Recuerda errores recurrentes del vendedor y programa su repaso', async () => {
    resetMemoryForTesting();
    const userId = 'seller-memory-qa';
    const today = getTodayArgentinaDate();

    // 1. Vendedor se equivoca con el kilometraje de la Amarok
    const failedOutcome = await recordConceptOutcome(userId, {
        category: 'kilometraje',
        conceptKey: 'km-amarok-v6',
        entityId: 'car-amarok',
        entityLabel: 'Volkswagen Amarok V6',
        isCorrect: false,
        dateStr: today
    });

    assert.equal(failedOutcome.status, 'debilitado');
    assert.equal(failedOutcome.errorCount, 1);
    assert.equal(failedOutcome.consecutiveCorrect, 0);

    // Debe figurar en la lista de conceptos débiles del vendedor
    const weakList = await getWeakConceptsForUser(userId);
    assert.equal(weakList.length, 1);
    assert.equal(weakList[0].conceptKey, 'km-amarok-v6');

    // 2. En el repaso posterior, el vendedor responde correctamente
    await recordConceptOutcome(userId, {
        category: 'kilometraje',
        conceptKey: 'km-amarok-v6',
        entityId: 'car-amarok',
        entityLabel: 'Volkswagen Amarok V6',
        isCorrect: true,
        dateStr: today
    });

    // 3. Responde correctamente dos veces consecutivas más -> Concepto pasa a 'dominado'
    await recordConceptOutcome(userId, {
        category: 'kilometraje',
        conceptKey: 'km-amarok-v6',
        entityId: 'car-amarok',
        entityLabel: 'Volkswagen Amarok V6',
        isCorrect: true,
        dateStr: today
    });
    const masteredOutcome = await recordConceptOutcome(userId, {
        category: 'kilometraje',
        conceptKey: 'km-amarok-v6',
        entityId: 'car-amarok',
        entityLabel: 'Volkswagen Amarok V6',
        isCorrect: true,
        dateStr: today
    });

    assert.equal(masteredOutcome.status, 'dominado');
    assert.equal(masteredOutcome.consecutiveCorrect, 3);

    const masteredList = await getMasteredConceptsForUser(userId);
    assert.ok(masteredList.some(m => m.conceptKey === 'km-amarok-v6'));
});

// ============================================================================
// 5. ENVÍO DE EXAMEN Y NOTIFICACIÓN AL PROPIETARIO (SECCIONES 2 Y 10)
// ============================================================================

test('Entrega de Desafío: Corrige automáticamente, calcula puntaje y notifica al propietario', async () => {
    resetDailyChallengesForTesting();
    resetNotificationsForTesting();
    resetMemoryForTesting();

    const seller = { id: 'seller-rodrigo', name: 'Rodrigo Vendedor', role: 'ventas' };
    const today = getTodayArgentinaDate();

    // Obtener desafío del día
    const challenge = await getOrCreateDailyChallenge(today);
    assert.ok(challenge.questions);
    assert.equal(challenge.questions.length, 8);

    // Vendedor responde 6 correctas de 8 (falla las 2 primeras)
    const answers = challenge.questions.map((q, idx) => ({
        questionId: q.questionId,
        selectedOptionIndex: idx < 2 ? 2 : q.correctOptionIndex, // 0 y 1 incorrectas, 2 a 7 correctas
        numericResponse: q.correctNumericValue
    }));

    const result = await submitChallengeAttempt(seller, {
        challengeId: challenge._id,
        answers,
        durationSeconds: 180,
        attemptType: 'official_daily'
    });

    assert.equal(result.correctCount, 6);
    assert.equal(result.totalQuestions, 8);
    assert.equal(result.score, 75, '6/8 debe otorgar exactamente 75/100');
    assert.equal(result.attemptType, 'official_daily');
    assert.ok(result.weakCategories.length > 0);

    // Comprobar estado del vendedor hoy
    const status = await getSellerDailyStatus(seller, today);
    assert.equal(status.status, 'completado');
    assert.equal(status.officialScore, 75);

    // NOTIFICACIÓN AUTOMÁTICA AL PROPIETARIO
    const notifs = await getNotifications({ role: 'owner' });
    assert.equal(notifs.unreadCount, 1, 'Debe existir 1 notificación no leída');
    const notif = notifs.notifications[0];
    assert.ok(notif.title.includes('Desafío completado'));
    assert.ok(notif.message.includes('Rodrigo Vendedor'));
    assert.ok(notif.message.includes('75/100'));
    assert.ok(notif.message.includes('6 de 8'));
    assert.ok(notif.actionUrl.includes('attemptId='));

    // Marcar como leída
    await markNotificationRead(notif._id);
    const afterRead = await getNotifications({ role: 'owner' });
    assert.equal(afterRead.unreadCount, 0);
});

// ============================================================================
// 6. CONTROL DE CAPACITACIÓN DEL PROPIETARIO (SECCIONES 7, 8 Y 9)
// ============================================================================

test('Control de Capacitación: Tablero general, ficha del vendedor y auditoría de invalidación', async () => {
    // 1. Tablero General
    const overview = await getDailyControlOverview();
    assert.ok(overview.totalSellers >= 1);
    assert.ok(overview.participationPercentage !== undefined);
    assert.ok(Array.isArray(overview.weeklyEvolution));

    // 2. Ficha Individual del Vendedor
    const sellerCard = await getSellerIndividualCard('seller-rodrigo');
    assert.equal(sellerCard.seller.name, 'Rodrigo Vendedor');
    assert.ok(Array.isArray(sellerCard.categoryPerformance));
    assert.ok(Array.isArray(sellerCard.history));

    // 3. Revisión Pregunta por Pregunta e Invalidación Autorizada
    const attemptId = sellerCard.history[0]?.attemptId;
    if (attemptId) {
        const detail = await getAttemptQuestionDetail(attemptId);
        assert.equal(detail.sellerName, 'Rodrigo Vendedor');
        assert.equal(detail.questions.length, 8);

        // Cada pregunta contiene su snapshot histórico de datos
        const q1 = detail.questions[0];
        assert.ok(q1.questionText);
        assert.ok(q1.explanation);

        // Invalidación de una pregunta por error tipográfico
        const supervisorUser = { role: 'owner', name: 'Tomás Propietario' };
        const invalidation = await invalidateAttemptQuestion(
            attemptId,
            q1.questionId,
            supervisorUser,
            'Opción ambigua en redacción del precio'
        );

        assert.equal(invalidation.success, true);
        assert.ok(invalidation.newScore > 75, 'El puntaje debe recalcularse a favor del vendedor al invalidar pregunta defectuosa');
    }
});

// ============================================================================
// 7. EVALUACIÓN DE VEHÍCULOS RECIÉN INGRESADOS (SECCIÓN 12)
// ============================================================================

test('Nuevos Ingresos: Rechaza unidades incompletas y genera mini-examen de 5 preguntas sobre la unidad', async () => {
    // 1. Unidad incompleta es rechazada
    const incompleteCar = { id: 'car-incomplete-intake', brand: 'Fiat', name: '', price: 0 };
    const validIncomplete = validateCarCompleteness(incompleteCar);
    assert.equal(validIncomplete.isComplete, false);

    // 2. Unidad completa genera mini-examen de 5 preguntas
    const carIntakeComplete = {
        id: 'car-intake-amarok-v6',
        brand: 'Volkswagen',
        name: 'Amarok V6 Extreme 4x4 AT',
        year: 2023,
        km: 15000,
        price: 41000000,
        currency: 'ARS',
        fuel: 'Diesel',
        vehicleType: 'Pick-up',
        hasManuals: true,
        hasDuplicateKeys: true,
        hasOfficialServices: true,
        coverImage: '/photos/amarok-v6-new.jpg'
    };

    const intakeChallenge = await generateNewIntakeMiniChallenge(carIntakeComplete, {
        title: 'Evaluación de Ingreso: Amarok V6 2023'
    });

    assert.equal(intakeChallenge.type, 'new_intake');
    assert.equal(intakeChallenge.questions.length, 5, 'Mini examen de nuevo ingreso debe tener exactamente 5 preguntas');
    assert.ok(intakeChallenge.questions.every(q => q.carSnapshot));
    assert.equal(intakeChallenge.questions[0].category, 'version_equipamiento');
    assert.equal(intakeChallenge.questions[1].category, 'kilometraje');
    assert.equal(intakeChallenge.questions[2].category, 'precio');
});
