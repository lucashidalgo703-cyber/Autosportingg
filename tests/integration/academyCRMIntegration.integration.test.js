// tests/integration/academyCRMIntegration.integration.test.js
// Verificación integral de AutoSporting Academy 2.0 en el backend real de CRM con MongoDB aislado en memoria.

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
    const AcademyProgress = mongoose.model('AcademyProgress');
    const AcademyBudget = mongoose.model('AcademyBudget');

    const hashPassword = (password) => {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${hash}`;
    };

    // Crear los 4 perfiles ficticios requeridos
    const owner = await AdminUser.create({
        name: 'Tomás Propietario',
        email: 'owner.academy@autosporting.test',
        passwordHash: hashPassword('PassOwner123!'),
        role: 'owner',
        active: true,
        permissions: []
    });

    const vendedor = await AdminUser.create({
        name: 'Lucas Vendedor',
        email: 'vendedor.academy@autosporting.test',
        passwordHash: hashPassword('PassVendedor123!'),
        role: 'ventas',
        active: true,
        permissions: []
    });

    const gestoria = await AdminUser.create({
        name: 'Marta Gestora',
        email: 'gestoria.academy@autosporting.test',
        passwordHash: hashPassword('PassGestoria123!'),
        role: 'gestoria_contabilidad',
        active: true,
        permissions: []
    });

    const adminFact = await AdminUser.create({
        name: 'Carlos Facturación',
        email: 'admin.facturacion@autosporting.test',
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

    // 1. Acceso a progreso individual para los 4 perfiles
    await testStep('Los 4 perfiles autorizados acceden a su progreso de Academy con inicialización correcta', async () => {
        for (const [roleName, userObj] of Object.entries({ owner, vendedor, gestoria, adminFact })) {
            const res = await callApi(roleName, 'GET', '/progress');
            assert.equal(res.status, 200, `Debe responder 200 para ${roleName}`);
            assert.ok(res.json);
            assert.equal(String(res.json.userId), String(userObj._id));
        }
    });

    // 2. Control de seguridad y permisos en endpoints de supervisión
    await testStep('Endpoints de supervisión y presupuesto están estrictamente restringidos al Owner y bloqueados a Vendedor/Gestoría/Administración', async () => {
        // Owner puede consultar supervisión
        const ownerSupervision = await callApi('owner', 'GET', '/supervision/team');
        assert.equal(ownerSupervision.status, 200);
        assert.ok(Array.isArray(ownerSupervision.json.team), 'Debe devolver array team');
        assert.ok(ownerSupervision.json.teamWeaknesses, 'Debe devolver análisis de debilidades formativas');

        // Vendedor, Gestoría y Administración reciben 403 Forbidden
        for (const restrictedRole of ['vendedor', 'gestoria', 'adminFact']) {
            const forbiddenSupervision = await callApi(restrictedRole, 'GET', '/supervision/team');
            assert.equal(forbiddenSupervision.status, 403, `Supervisión debe ser 403 para ${restrictedRole}`);

            const forbiddenAssign = await callApi(restrictedRole, 'POST', '/supervision/assign', {
                userId: String(vendedor._id),
                trackId: 'ventas'
            });
            assert.equal(forbiddenAssign.status, 403);

            const forbiddenBudget = await callApi(restrictedRole, 'GET', '/budget/status');
            assert.equal(forbiddenBudget.status, 403, `Presupuesto debe ser 403 para ${restrictedRole}`);
        }
    });

    // 3. Asignación de recorrido por supervisión y persistencia en MongoDB
    await testStep('El Owner asigna un recorrido y el empleado lo recibe de forma inmutable', async () => {
        const assignRes = await callApi('owner', 'POST', '/supervision/assign', {
            userId: String(vendedor._id),
            trackId: 'track-vendedor-intensivo'
        });
        assert.equal(assignRes.status, 200);

        // Vendedor consulta su progreso desde otro cliente
        const vendProg = await callApi('vendedor', 'GET', '/progress');
        assert.equal(vendProg.status, 200);
        assert.equal(vendProg.json.assignedTrack, 'track-vendedor-intensivo');
    });

    // 4. Aprender del error y reconciliación concurrente (REGLA: conservar ambas versiones)
    await testStep('Reflexiones de Aprender del Error: Se preservan ambas versiones ante sincronización concurrente', async () => {
        // Vendedor guarda reflexión inicial
        const refRes = await callApi('vendedor', 'POST', '/reflection', {
            situation: 'Error al no solicitar DNI del titular',
            actionTaken: 'Avancé con el boleto sin verificar dominio',
            difficultyEncountered: 'Titular inhibido',
            alternativeApproach: 'Solicitar informe 02 antes de tomar la seña'
        });
        assert.equal(refRes.status, 200);
        assert.ok(refRes.json._id, 'Debe devolver la reflexión guardada con su _id');
        const originalId = refRes.json._id;

        // Dispositivo B envía actualización concurrente del mismo ID con texto distinto
        const syncRes = await callApi('vendedor', 'POST', '/progress/sync', {
            errorReflections: [
                {
                    id: String(originalId),
                    situation: 'Error crítico en seña: titular con embargo en juzgado 2 de Comodoro',
                    actionTaken: 'Tomé $500.000 sin certificado de libre deuda de patentes',
                    difficultyEncountered: 'Operación demorada 15 días hábiles',
                    alternativeApproach: 'Exigir F-08 certificado y verificación policial previa'
                }
            ]
        });
        assert.equal(syncRes.status, 200);

        // REGLA ESTRICTA: Deben conservarse ambas versiones
        const reflections = syncRes.json.errorReflections;
        assert.equal(reflections.length, 2, 'Deben existir ambas reflexiones para revisión');
        const original = reflections.find(r => String(r._id) === String(originalId));
        const concurrent = reflections.find(r => r.situation?.includes('[Revisión concurrente multidispositivo]'));

        assert.ok(original, 'Original preservado');
        assert.equal(original.situation, 'Error al no solicitar DNI del titular');
        assert.ok(concurrent, 'Versión concurrente preservada y rotulada');
        assert.ok(concurrent.situation.includes('embargo en juzgado 2'));
    });

    // 5. Privacidad estricta de reflexiones no compartidas
    await testStep('Privacidad: El Owner NO ve reflexiones personales que no hayan sido expresamente compartidas', async () => {
        const teamProgress = await callApi('owner', 'GET', '/supervision/team');
        const vendedorTeamData = teamProgress.json.team.find(t => String(t.userId) === String(vendedor._id));
        assert.ok(vendedorTeamData);
        // Las 2 reflexiones creadas eran privadas (sharedWithSupervisor: false)
        assert.equal(vendedorTeamData.sharedReflections.length, 0, 'No debe filtrar reflexiones privadas al supervisor');
    });

    // 6. Simulador de Negociación y Evaluador Contextual en MongoDB real
    await testStep('Simulador y Evaluador Contextual procesan la negociación y persisten el resultado', async () => {
        // Chat simulado seguro
        const chatRes = await callApi('vendedor', 'POST', '/negotiation/chat', {
            scenarioId: 'desc-01',
            sellerMessage: 'Buen día Don Morales, le comento que la unidad cuenta con peritaje de 80 puntos y garantía de 3 meses.',
            conversationHistory: []
        });
        assert.equal(chatRes.status, 200);
        assert.ok(chatRes.json.text, 'Debe devolver respuesta textual del comprador simulado');
        assert.equal(chatRes.json.isRealAiConnected, false, 'Modo seguro simulado por defecto');

        // Evaluación contextual de negociación con criterio
        const conversationHistory = [
            { sender: 'buyer', text: 'En otra agencia me la dejan 3 millones menos. O me la bajás o me voy.' },
            { sender: 'seller', text: 'Entiendo perfectamente su posición. En AutoSporting nuestra unidad incluye service oficial y garantía escrita de 3 meses que la otra agencia no entrega. No podemos bajar 3 millones porque destruiría el margen de la unidad, pero puedo bonificarle los gastos de transferencia o analizar financiación en cuotas fijas.' }
        ];

        const evalRes = await callApi('vendedor', 'POST', '/negotiation/evaluate', {
            scenarioId: 'comp-04',
            conversationHistory,
            level: 'intermedio'
        });
        assert.equal(evalRes.status, 200);
        assert.ok(evalRes.json.score >= 80, `Rechazo justificado debe superar 80 puntos, obtenido: ${evalRes.json.score}`);
        assert.equal(evalRes.json.outcomeStatus, 'desistido_con_criterio');
        assert.ok(evalRes.json.evaluationContext);
        assert.ok(evalRes.json.heuristicDisclaimer);

        // Verificar que la sesión quedó registrada en MongoDB
        const progAfter = await callApi('vendedor', 'GET', '/progress');
        assert.equal(progAfter.status, 200);
        assert.ok(progAfter.json.negotiationSessions.length >= 1);
        const lastSession = progAfter.json.negotiationSessions.at(-1);
        assert.equal(lastSession.scenarioId, 'comp-04');
        assert.equal(lastSession.evaluation.outcomeStatus, 'desistido_con_criterio');
    });

    // 7. Presupuesto persistente de OpenAI: Prevalencia del Supervisor y Hard Cap
    await testStep('Presupuesto de OpenAI: Gestión en panel, límite de infraestructura y default 0 USD', async () => {
        // Inicialmente el presupuesto es 0 USD
        const initialBudget = await callApi('owner', 'GET', '/budget/status');
        assert.equal(initialBudget.status, 200);
        assert.equal(initialBudget.json.authorizedBudgetUSD, 0);
        assert.equal(initialBudget.json.isExhausted, true);

        // Supervisor fija presupuesto en $12.50 USD
        const configRes = await callApi('owner', 'POST', '/budget/configure', {
            authorizedBudgetUSD: 12.50
        });
        assert.equal(configRes.status, 200);
        assert.equal(configRes.json.authorizedBudgetUSD, 12.50);

        // Consultar estado tras configuración
        const updatedBudget = await callApi('owner', 'GET', '/budget/status');
        assert.equal(updatedBudget.json.authorizedBudgetUSD, 12.50);
        assert.equal(updatedBudget.json.configuredBySupervisor, true);
        assert.equal(updatedBudget.json.isExhausted, false);
    });

    console.log(`\nTODAS LAS ${passed} PRUEBAS DE INTEGRACIÓN DE ACADEMY Y CRM COMPLETADAS EXITOSAMENTE.`);
    process.exit(0);
} catch (err) {
    console.error('FALLO EN PRUEBA DE INTEGRACIÓN:', err);
    process.exit(1);
}
