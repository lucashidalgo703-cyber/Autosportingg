// tests/integration/academy3Integration.test.js
// Verificación integral de AutoSporting Academy 3.0:
// Desafíos diarios de stock, repetición espaciada, control de capacitación e invalidación auditada.

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { bootIsolatedReplica } from './isolatedReplicaHarness.js';
import { createLoginSession } from '../../src/services/authSessionService.js';

const env = await bootIsolatedReplica();
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
    assert.match(String(input?.url || input), /^http:\/\/127\.0\.0\.1:/, 'Solo el servidor aislado loopback puede ser contactado');
    return originalFetch(input, options);
};

let passed = 0;

try {
    const mongoose = (await import('mongoose')).default;
    const AdminUser = mongoose.model('AdminUser');
    const Car = mongoose.model('Car');
    const AcademyDailyChallenge = mongoose.model('AcademyDailyChallenge');
    const AcademyChallengeAttempt = mongoose.model('AcademyChallengeAttempt');
    const AcademyKnowledgeMemory = mongoose.model('AcademyKnowledgeMemory');
    const AcademyNotification = mongoose.model('AcademyNotification');

    const hashPassword = (password) => {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    };

    // 1. Crear usuarios de prueba
    const owner = await AdminUser.create({
        name: 'Tomás Propietario',
        email: 'owner.academy3@autosporting.test',
        passwordHash: hashPassword('PassOwner123!'),
        role: 'owner',
        active: true,
        permissions: []
    });

    const vendedor = await AdminUser.create({
        name: 'Rodrigo Vendedor',
        email: 'vendedor.academy3@autosporting.test',
        passwordHash: hashPassword('PassVendedor123!'),
        role: 'ventas',
        active: true,
        permissions: []
    });

    const gestoria = await AdminUser.create({
        name: 'Marta Gestora',
        email: 'gestoria.academy3@autosporting.test',
        passwordHash: hashPassword('PassGestoria123!'),
        role: 'gestoria_contabilidad',
        active: true,
        permissions: []
    });

    const adminFact = await AdminUser.create({
        name: 'Carlos Facturación',
        email: 'admin.facturacion3@autosporting.test',
        passwordHash: hashPassword('PassAdminFact123!'),
        role: 'administrativo',
        active: true,
        permissions: []
    });

    const sessions = {
        owner: await createLoginSession(owner),
        vendedor: await createLoginSession(vendedor),
        gestoria: await createLoginSession(gestoria),
        adminFact: await createLoginSession(adminFact)
    };

    const tokens = {
        owner: sessions.owner.token,
        vendedor: sessions.vendedor.token,
        gestoria: sessions.gestoria.token,
        adminFact: sessions.adminFact.token
    };

    const callApi = async (roleName, method, path, body) => {
        return env.call(method, `/api/admin/academy${path}`, body, tokens[roleName]);
    };

    const testStep = async (name, fn) => {
        await fn();
        passed++;
        console.log(`ok ${passed} - ${name}`);
    };

    // 2. Poblar stock en MongoDB con datos comerciales y datos privados confidenciales
    const car1 = await Car.create({
        brand: 'Volkswagen',
        name: 'Amarok V6 Extreme 4x4',
        year: 2023,
        km: 28500,
        price: 43500000,
        currency: 'ARS',
        fuel: 'Diésel',
        color: 'Gris Indio',
        vehicleType: 'Pickup',
        hasManuals: 'Si',
        hasDuplicateKeys: 'Si',
        hasOfficialServices: 'Si',
        condition: 'Usado',
        status: 'Disponible',
        coverImage: 'https://images.autosporting.test/amarok-v6-cover.jpg',
        images: ['https://images.autosporting.test/amarok-v6-cover.jpg', 'https://images.autosporting.test/amarok-interior.jpg'],
        // Campos estrictamente confidenciales que JAMÁS deben filtrarse:
        purchasePrice: 34000000,
        investor: { name: 'Inversor Privado Confidencial', percentage: 50 },
        jointOwnership: { hasPartner: true, partnerPercentage: 50, agencyPercentage: 50, partnerName: 'Socio Secreto' }
    });

    const car2 = await Car.create({
        brand: 'Toyota',
        name: 'Corolla Cross SEG Hybrid',
        year: 2022,
        km: 34000,
        price: 36800000,
        currency: 'ARS',
        fuel: 'Híbrido',
        color: 'Blanco Perlado',
        vehicleType: 'SUV',
        hasManuals: 'Si',
        hasDuplicateKeys: 'Si',
        hasOfficialServices: 'Si',
        condition: 'Usado',
        status: 'Disponible',
        coverImage: 'https://images.autosporting.test/corolla-cross-cover.jpg',
        images: ['https://images.autosporting.test/corolla-cross-cover.jpg'],
        purchasePrice: 28000000
    });

    const car3 = await Car.create({
        brand: 'Ford',
        name: 'Ranger Limited V6 4WD',
        year: 2024,
        km: 12000,
        price: 52000000,
        currency: 'ARS',
        fuel: 'Diésel',
        color: 'Azul Belice',
        vehicleType: 'Pickup',
        hasManuals: 'Si',
        hasDuplicateKeys: 'Si',
        hasOfficialServices: 'Si',
        condition: 'Usado',
        status: 'Disponible',
        coverImage: 'https://images.autosporting.test/ranger-cover.jpg',
        images: ['https://images.autosporting.test/ranger-cover.jpg'],
        purchasePrice: 41000000
    });

    const car4 = await Car.create({
        brand: 'Peugeot',
        name: '208 Feline Tiptronic',
        year: 2023,
        km: 19500,
        price: 24500000,
        currency: 'ARS',
        fuel: 'Nafta',
        color: 'Gris Artense',
        vehicleType: 'Hatchback',
        hasManuals: 'Si',
        hasDuplicateKeys: 'Si',
        hasOfficialServices: 'Si',
        condition: 'Usado',
        status: 'Disponible',
        coverImage: 'https://images.autosporting.test/208-cover.jpg',
        images: ['https://images.autosporting.test/208-cover.jpg'],
        purchasePrice: 18000000
    });

    // Auto vendido: NO debe ser usado para preguntas
    const carVendido = await Car.create({
        brand: 'Chevrolet',
        name: 'Cruze LTZ',
        year: 2021,
        km: 45000,
        price: 19500000,
        currency: 'ARS',
        condition: 'Usado',
        fuel: 'Nafta',
        status: 'Vendido',
        purchasePrice: 14000000
    });

    let generatedChallenge = null;

    // STEP 1: Vendedor obtiene el desafío diario
    await testStep('Vendedor obtiene el Desafío Diario del día generado con vehículos reales y sin datos confidenciales', async () => {
        const res = await callApi('vendedor', 'GET', '/daily-challenge/today');
        assert.equal(res.status, 200);
        assert.ok(res.json.challenge, 'Debe devolver el desafío del día');
        assert.equal(res.json.challenge.questions.length, 8, 'Debe tener exactamente 8 preguntas balanceadas');
        assert.equal(res.json.status.status, 'pendiente', 'Estado inicial debe ser pendiente');

        generatedChallenge = res.json.challenge;

        // Verificar que no se incluye ningún dato confidencial (purchasePrice, expenses, investor)
        const payloadStr = JSON.stringify(res.json);
        assert.ok(!payloadStr.includes('purchasePrice'), 'PROHIBICIÓN: purchasePrice no debe figurar en el payload');
        assert.ok(!payloadStr.includes('Inversor Privado Confidencial'), 'PROHIBICIÓN: investor no debe figurar en el payload');
        assert.ok(!payloadStr.includes('Cruze LTZ'), 'PROHIBICIÓN: autos vendidos no deben figurar en las preguntas');
    });

    // STEP 2: Bloqueo de seguridad a roles no autorizados para el panel de supervisión
    await testStep('Endpoints de supervisión (/control/*, /notifications/*, /intake/*) retornan 403 para vendedor, gestoría y administración', async () => {
        for (const unauthorizedRole of ['vendedor', 'gestoria', 'adminFact']) {
            const overviewRes = await callApi(unauthorizedRole, 'GET', '/control/overview');
            assert.equal(overviewRes.status, 403, `Debe bloquear /control/overview para ${unauthorizedRole}`);

            const notifRes = await callApi(unauthorizedRole, 'GET', '/notifications');
            assert.equal(notifRes.status, 403, `Debe bloquear /notifications para ${unauthorizedRole}`);

            const intakeRes = await callApi(unauthorizedRole, 'POST', '/intake/generate', { carId: String(car1._id) });
            assert.equal(intakeRes.status, 403, `Debe bloquear /intake/generate para ${unauthorizedRole}`);
        }
    });

    // STEP 3: Vendedor completa y envía el examen
    let submittedAttempt = null;
    await testStep('Vendedor envía respuestas con parser numérico flexible y obtiene autocorrección inmediata', async () => {
        // Preparar respuestas: responder correctamente a las preguntas
        const answers = generatedChallenge.questions.map((q, idx) => {
            if (q.questionFormat === 'multiple_choice' || q.questionFormat === 'reconocimiento' || q.questionFormat === 'procedimiento' || q.questionFormat === 'negociacion') {
                return {
                    questionId: q.questionId,
                    selectedOptionIndex: q.correctOptionIndex
                };
            } else if (q.questionFormat === 'numeric_input') {
                // Formato argentino con símbolo pesos y puntos
                const numStr = `$ ${Number(q.correctNumericValue).toLocaleString('es-AR')}`;
                return {
                    questionId: q.questionId,
                    numericResponse: numStr
                };
            }
            return { questionId: q.questionId, selectedOptionIndex: 0 };
        });

        const submitRes = await callApi('vendedor', 'POST', '/daily-challenge/submit', {
            challengeId: generatedChallenge._id,
            answers,
            durationSeconds: 145,
            attemptType: 'official_daily'
        });

        assert.equal(submitRes.status, 200);
        assert.ok(submitRes.json.attemptId);
        assert.equal(submitRes.json.score, 100, 'Debe calificar con 100 puntos al acertar todas');
        assert.equal(submitRes.json.correctCount, 8);
        assert.equal(submitRes.json.answers.length, 8);

        submittedAttempt = submitRes.json;

        // Comprobar estado del vendedor
        const statusRes = await callApi('vendedor', 'GET', '/daily-challenge/status');
        assert.equal(statusRes.status, 200);
        assert.equal(statusRes.json.status, 'completado');
        assert.equal(statusRes.json.officialScore, 100);
        assert.equal(statusRes.json.attemptId, submitRes.json.attemptId);
    });

    // STEP 4: Notificación automática al propietario
    await testStep('Al finalizar el examen oficial, se genera automáticamente una notificación interna para el Propietario', async () => {
        const notifRes = await callApi('owner', 'GET', '/notifications');
        assert.equal(notifRes.status, 200);
        assert.ok(Array.isArray(notifRes.json.notifications));
        assert.ok(notifRes.json.notifications.length >= 1, 'Debe haber al menos 1 notificación');

        const latestNotif = notifRes.json.notifications[0];
        assert.equal(latestNotif.type, 'challenge_completed');
        assert.ok(latestNotif.message.includes('Rodrigo Vendedor'));
        assert.ok(latestNotif.message.includes('100/100'));

        // Propietario marca notificación como leída
        const readRes = await callApi('owner', 'POST', `/notifications/${latestNotif._id}/read`);
        assert.equal(readRes.status, 200);
        assert.equal(readRes.json.read ?? readRes.json.isRead, true);
    });

    // STEP 5: Control de Capacitación - Tablero general del Propietario
    await testStep('Propietario consulta el Tablero General (/control/overview) con métricas consolidadas', async () => {
        const overviewRes = await callApi('owner', 'GET', '/control/overview');
        assert.equal(overviewRes.status, 200);
        assert.ok(overviewRes.json.metrics, 'Debe contener bloque metrics');
        assert.ok(overviewRes.json.metrics.completedCount >= 1, 'Al menos 1 vendedor completó hoy');
        assert.ok(overviewRes.json.metrics.averageScore > 0, 'Promedio debe ser positivo');
        assert.ok(Array.isArray(overviewRes.json.sellersList), 'Debe listar vendedores');

        const foundSeller = overviewRes.json.sellersList.find(s => String(s.userId) === String(vendedor._id));
        assert.ok(foundSeller, 'Vendedor Rodrigo debe figurar en la lista del tablero');
        assert.equal(foundSeller.status, 'completado');
        assert.equal(foundSeller.todayScore, 100);
    });

    // STEP 6: Ficha individual del Vendedor
    await testStep('Propietario consulta la Ficha Individual del Vendedor (/control/seller/:id)', async () => {
        const cardRes = await callApi('owner', 'GET', `/control/seller/${vendedor._id}`);
        assert.equal(cardRes.status, 200);
        assert.ok(cardRes.json.seller);
        assert.equal(cardRes.json.seller.name, 'Rodrigo Vendedor');
        assert.ok(cardRes.json.metrics);
        assert.ok(Array.isArray(cardRes.json.attemptsHistory));
        assert.ok(cardRes.json.attemptsHistory.length >= 1);
        assert.ok(cardRes.json.categoryRadar);
    });

    // STEP 7: Revisión pregunta por pregunta e invalidación autorizada con recálculo
    await testStep('Propietario revisa el examen pregunta por pregunta e invalida una con auditoría y recálculo', async () => {
        // Consultar detalle del examen
        const detailRes = await callApi('owner', 'GET', `/control/attempt/${submittedAttempt.attemptId}`);
        assert.equal(detailRes.status, 200);
        assert.ok(Array.isArray(detailRes.json.questions));
        assert.equal(detailRes.json.questions.length, 8);

        const firstQuestion = detailRes.json.questions[0];
        assert.ok(firstQuestion.questionId);

        // Invalidar la primera pregunta con motivo fundamentado
        const invalidRes = await callApi('owner', 'POST', `/control/attempt/${submittedAttempt.attemptId}/invalidate`, {
            questionId: firstQuestion.questionId,
            reason: 'El vehículo tuvo actualización de precio en sistema mientras el vendedor respondía.'
        });

        assert.equal(invalidRes.status, 200);
        assert.ok(invalidRes.json.isInvalidated, 'La pregunta debe quedar marcada como invalidada');
        assert.equal(invalidRes.json.invalidatedBy?.role, 'owner');
        assert.ok(invalidRes.json.invalidatedReason.includes('actualización de precio'));

        // Verificar recálculo de puntaje en el intento
        const attemptAfter = await AcademyChallengeAttempt.findById(submittedAttempt.attemptId);
        assert.ok(attemptAfter);
        const ans = attemptAfter.answers.find(a => a.questionId === firstQuestion.questionId);
        assert.equal(ans.isInvalidated, true);
        assert.equal(ans.scoreAwarded, 12.5, 'La pregunta invalidada debe otorgar los puntos al vendedor');
    });

    // STEP 8: Nuevos Ingresos - Validación previa y generación de mini-examen
    await testStep('Propietario valida vehículo recién ingresado y genera mini-examen de 5 preguntas', async () => {
        // Validar car1 (completo)
        const valRes = await callApi('owner', 'GET', `/intake/validate/${car1._id}`);
        assert.equal(valRes.status, 200);
        assert.equal(valRes.json.isComplete, true);
        assert.equal(valRes.json.missingFields.length, 0);

        // Generar mini-examen de 5 preguntas
        const genRes = await callApi('owner', 'POST', '/intake/generate', {
            carId: String(car1._id),
            title: 'Inducción de Nuevo Ingreso: Amarok V6 Extreme',
            assignedUserIds: [String(vendedor._id)]
        });

        assert.equal(genRes.status, 200);
        assert.ok(genRes.json.challenge);
        assert.equal(genRes.json.challenge.type, 'new_intake');
        assert.equal(genRes.json.challenge.questions.length, 5, 'Mini examen debe tener exactamente 5 preguntas');
        assert.equal(genRes.json.challenge.targetCarId, String(car1._id));
    });

    console.log(`\nTODAS LAS ${passed} PRUEBAS DE INTEGRACIÓN DE ACADEMY 3.0 COMPLETADAS EXITOSAMENTE.`);
    await env.stop();
    process.exit(0);
} catch (err) {
    console.error('FALLO EN PRUEBA DE INTEGRACIÓN ACADEMY 3.0:', err);
    await env.stop();
    process.exit(1);
}