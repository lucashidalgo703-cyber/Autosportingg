import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_MODULES, getRoleModuleById, getRoleModulesByRole } from '../src/lib/academy/roleModules.js';
import { ROLE_SIMULATIONS, getSimulationById, getSimulationsByRole } from '../src/lib/academy/roleSimulations.js';
import { TUTOR_PROCEDURES, searchTutorKnowledge } from '../src/lib/academy/roleTutorKnowledge.js';
import { createErrorReflection, validateErrorReflection, IMPROVEMENT_STATUS } from '../src/lib/academy/aprenderDelError.js';
import { ROLE_TRACKS, getTrackByRole, roleTrainingSections } from '../src/lib/academy/catalog.js';
import { emptyProgress, normalizeProgress, summarizeRoleProgress } from '../src/lib/academy/progress.js';

// =============================================================================
// 1. VERIFICACIÓN DE LOS ONCE MÓDULOS COMPLETOS
// =============================================================================
test('Academy expone exactamente once módulos completos distribuidos por rol', () => {
    assert.equal(ROLE_MODULES.length, 11, 'Deben existir exactamente 11 módulos');

    const ids = new Set(ROLE_MODULES.map(m => m.id));
    assert.equal(ids.size, 11, 'Todos los módulos deben tener un id único');

    const codes = new Set(ROLE_MODULES.map(m => m.code));
    assert.equal(codes.size, 11, 'Todos los módulos deben tener un código único');

    // Distribución por rol: 1 común, 4 ventas, 3 gestoría, 3 administración
    const comun = ROLE_MODULES.filter(m => m.role === 'comun');
    const ventas = ROLE_MODULES.filter(m => m.role === 'ventas');
    const gestoria = ROLE_MODULES.filter(m => m.role === 'gestoria');
    const administracion = ROLE_MODULES.filter(m => m.role === 'administracion');

    assert.equal(comun.length, 1, 'Debe haber exactamente 1 módulo común');
    assert.equal(ventas.length, 4, 'Deben haber exactamente 4 módulos para vendedores');
    assert.equal(gestoria.length, 3, 'Deben haber exactamente 3 módulos para gestoría');
    assert.equal(administracion.length, 3, 'Deben haber exactamente 3 módulos para administración/facturación');

    // Módulo común específico
    assert.equal(comun[0].id, 'comun-trabajo');
    assert.ok(comun[0].title.includes('Cómo trabajamos en AutoSporting'));

    // Módulos de ventas específicos
    assert.ok(ventas.some(m => m.id === 'ventas-consulta-presentacion'));
    assert.ok(ventas.some(m => m.id === 'ventas-negociacion-objeciones'));
    assert.ok(ventas.some(m => m.id === 'ventas-permutas-financiacion-autorizaciones'));
    assert.ok(ventas.some(m => m.id === 'ventas-seguimiento-entrega'));

    // Módulos de gestoría específicos
    assert.ok(gestoria.some(m => m.id === 'gestoria-lectura-expediente'));
    assert.ok(gestoria.some(m => m.id === 'gestoria-control-faltantes'));
    assert.ok(gestoria.some(m => m.id === 'gestoria-transferencias-coordinacion'));

    // Módulos de administración específicos
    assert.ok(administracion.some(m => m.id === 'admin-preparacion-validacion'));
    assert.ok(administracion.some(m => m.id === 'admin-cobros-comprobantes'));
    assert.ok(administracion.some(m => m.id === 'admin-observaciones-contador'));
});

test('Cada uno de los 11 módulos contiene todos los campos obligatorios y al menos 3 preguntas situacionales con devolución', () => {
    for (const mod of ROLE_MODULES) {
        assert.ok(mod.id && mod.id.length > 3, `ID inválido en ${mod.id}`);
        assert.ok(mod.code && mod.code.startsWith('MOD-'), `Código inválido en ${mod.id}`);
        assert.ok(mod.version && mod.version.length >= 3, `Versión inválida en ${mod.id}`);
        assert.ok(mod.title && mod.title.length > 5, `Título inválido en ${mod.id}`);
        assert.ok(mod.objective && mod.objective.length > 30, `Objetivo insuficiente en ${mod.id}`);
        assert.ok(mod.importance && mod.importance.length > 50, `Importancia insuficiente en ${mod.id}`);
        assert.ok(mod.explanation && mod.explanation.length > 150, `Explicación insuficiente en ${mod.id}`);
        assert.ok(mod.example && mod.example.length > 50, `Ejemplo insuficiente en ${mod.id}`);

        // Checklist de aplicación
        assert.ok(Array.isArray(mod.checklist) && mod.checklist.length >= 4, `Checklist insuficiente en ${mod.id}`);

        // Errores frecuentes
        assert.ok(Array.isArray(mod.frequentErrors) && mod.frequentErrors.length >= 2, `Errores frecuentes insuficientes en ${mod.id}`);
        for (const err of mod.frequentErrors) {
            assert.ok(err.error && err.error.length > 10);
            assert.ok(err.correction && err.correction.length > 10);
        }

        // Actividad práctica
        assert.ok(mod.practicalActivity && mod.practicalActivity.length > 30, `Actividad práctica insuficiente en ${mod.id}`);

        // Al menos 3 preguntas situacionales con devolución
        assert.ok(Array.isArray(mod.situationalQuestions) && mod.situationalQuestions.length >= 3, `Preguntas situacionales insuficientes en ${mod.id}`);
        for (const q of mod.situationalQuestions) {
            assert.ok(q.id && q.question && q.question.length > 20);
            assert.ok(Array.isArray(q.options) && q.options.length >= 3, `Opciones insuficientes en pregunta ${q.id}`);

            const correctOptions = q.options.filter(o => o.isCorrect === true);
            assert.equal(correctOptions.length, 1, `Debe haber exactamente una opción correcta en pregunta ${q.id}`);

            for (const opt of q.options) {
                assert.ok(opt.text && opt.text.length > 5);
                assert.ok(opt.feedback && opt.feedback.length > 15, `Feedback insuficiente en opción de ${q.id}`);
            }
        }

        // Criterios de evaluación y material de refuerzo
        assert.ok(Array.isArray(mod.evaluationCriteria) && mod.evaluationCriteria.length >= 3, `Criterios insuficientes en ${mod.id}`);
        assert.ok(mod.reinforcement && mod.reinforcement.length > 15, `Refuerzo insuficiente en ${mod.id}`);
    }
});

// =============================================================================
// 2. VERIFICACIÓN DE LAS SEIS SIMULACIONES / CASOS PRÁCTICOS
// =============================================================================
test('Academy expone exactamente seis casos prácticos completos con rúbrica explícita', () => {
    assert.equal(ROLE_SIMULATIONS.length, 6, 'Deben existir exactamente 6 casos');

    const ids = new Set(ROLE_SIMULATIONS.map(s => s.id));
    assert.equal(ids.size, 6, 'Cada caso debe tener un id único');

    // Casos requeridos por el encargo:
    // 1. Venta: caro vs otra agencia
    const c1 = getSimulationById('sim-vta-01');
    assert.ok(c1 && c1.role === 'ventas' && c1.context.includes('Trelew'));

    // 2. Venta: toma del usado y descuento
    const c2 = getSimulationById('sim-vta-02');
    assert.ok(c2 && c2.role === 'ventas' && c2.context.includes('EcoSport') && c2.context.includes('Amarok'));

    // 3. Venta: seña o excepción no autorizada
    const c3 = getSimulationById('sim-vta-03');
    assert.ok(c3 && c3.role === 'ventas' && c3.context.includes('500.000'));

    // 4. Venta: postergación y seguimiento útil
    const c4 = getSimulationById('sim-vta-04');
    assert.ok(c4 && c4.role === 'ventas' && c4.context.includes('Cruze'));

    // 5. Gestoría: datos contradictorios y presión
    const c5 = getSimulationById('sim-ges-01');
    assert.ok(c5 && c5.role === 'gestoria' && c5.context.includes('Duster') && c5.context.includes('cónyuge'));

    // 6. Facturación: pago sin validar y consignación
    const c6 = getSimulationById('sim-adm-01');
    assert.ok(c6 && c6.role === 'administracion' && c6.context.includes('26.000.000') && c6.context.includes('consignación'));

    for (const sim of ROLE_SIMULATIONS) {
        assert.ok(sim.title && sim.title.length > 10);
        assert.ok(sim.context && sim.context.length > 100);
        assert.ok(sim.objective && sim.objective.length > 30);
        assert.ok(Array.isArray(sim.availableInfo) && sim.availableInfo.length >= 3);
        assert.ok(Array.isArray(sim.decisions) && sim.decisions.length >= 3, `Decisiones insuficientes en ${sim.id}`);
        assert.ok(Array.isArray(sim.rubricCriteria) && sim.rubricCriteria.length === 4, `Debe haber 4 criterios de rúbrica en ${sim.id}`);

        // Al menos una decisión debe tener puntaje sobresaliente (>= 90) y una de riesgo (< 40)
        const hasTop = sim.decisions.some(d => d.score >= 90);
        const hasRisk = sim.decisions.some(d => d.score < 40);
        assert.ok(hasTop, `El caso ${sim.id} debe incluir una decisión correcta ejemplar`);
        assert.ok(hasRisk, `El caso ${sim.id} debe incluir una decisión con consecuencias adversas`);

        for (const dec of sim.decisions) {
            assert.ok(dec.id && dec.title && dec.action && dec.outcome);
            assert.ok(Number.isFinite(dec.score) && dec.score >= 0 && dec.score <= 100);
            assert.ok(dec.rubricBreakdown && typeof dec.rubricBreakdown === 'object');
            assert.ok(dec.feedback && dec.feedback.length > 20);
        }
    }
});

// =============================================================================
// 3. VERIFICACIÓN DEL TUTOR Y BASE DE CONOCIMIENTOS DE PROCEDIMIENTOS
// =============================================================================
test('Tutor de procedimientos responde las cuatro consultas obligatorias citando fuentes y versiones oficiales', () => {
    // Consulta 1: Bajar precio
    const q1 = 'El cliente me pide bajar el precio. ¿Qué preguntas puedo hacer antes de responder?';
    const r1 = searchTutorKnowledge(q1);
    assert.ok(r1.length > 0, 'Debe responder a la consulta de objeción de precio');
    assert.ok(r1[0].summary.includes('comparando'), 'Debe incluir preguntas de precisión');
    assert.equal(r1[0].procedureCode, 'PROC-VTA-02');
    assert.ok(r1[0].isOfficialProcedure);

    // Consulta 2: Práctica de objeción por la toma
    const q2 = 'Quiero practicar una objeción por el valor de la toma.';
    const r2 = searchTutorKnowledge(q2);
    assert.ok(r2.length > 0, 'Debe responder a la consulta de valor de la toma');
    assert.ok(r2[0].summary.includes('permuta') || r2[0].summary.includes('peritaje'));
    assert.equal(r2[0].procedureCode, 'PROC-VTA-02');

    // Consulta 3: Qué revisar antes de derivar expediente
    const q3 = '¿Qué tengo que revisar antes de derivar este expediente?';
    const r3 = searchTutorKnowledge(q3);
    assert.ok(r3.length > 0, 'Debe responder al checklist de expediente');
    assert.ok(r3[0].summary.includes('Asentimiento Conyugal') || r3[0].summary.includes('DNRPA'));
    assert.equal(r3[0].procedureCode, 'PROC-GES-01');

    // Consulta 4: Comprobante recibido pero pago no validado
    const q4 = 'Recibí un comprobante, pero el pago todavía no está validado. ¿Qué procedimiento debo consultar?';
    const r4 = searchTutorKnowledge(q4);
    assert.ok(r4.length > 0, 'Debe responder al procedimiento de acreditación bancaria');
    assert.ok(r4[0].summary.includes('PROC-ADM-02'));
    assert.equal(r4[0].procedureCode, 'PROC-ADM-02');

    // Aislamiento: El tutor no responde inventando reglas inexistentes
    const unknown = searchTutorKnowledge('¿Cuál es la clave del home banking de Galicia?');
    assert.equal(unknown.length, 0, 'No debe filtrar datos bancarios ni secretos');
});

// =============================================================================
// 4. VERIFICACIÓN DE "APRENDER DEL ERROR" Y PRIVACIDAD POR USUARIO
// =============================================================================
test('Aprender del error estructura las cinco preguntas y garantiza privacidad predeterminada', () => {
    const valid = createErrorReflection({
        learnerId: 'usr-123',
        learnerRole: 'ventas',
        titulo: 'Discrepancia en cotización de permuta',
        quePaso: 'Le pasé un valor de toma de palabra al cliente antes del peritaje en taller para apurar el cierre.',
        informacion: 'Tenía la foto del auto pero no el informe de dominio ni el estado de cubiertas.',
        otraManera: 'Haberle explicado que toda tasación preliminar es sujeta a la revisión técnica obligatoria.',
        criterio: 'PROC-VTA-03 Toma de permutas y peritaje oficial.',
        planMejora: 'Practicaré explicar el protocolo de toma en el simulador y nunca confirmaré precio sin peritaje.',
        compartidoConSupervisor: false
    });

    const check = validateErrorReflection(valid);
    assert.ok(check.isValid, 'La reflexión completa debe ser válida');
    assert.equal(valid.compartidoConSupervisor, false, 'Por defecto la reflexión debe ser estrictamente privada');
    assert.equal(valid.status, IMPROVEMENT_STATUS.EN_PRACTICA);

    // Validación rechaza campos vacíos o insuficientes
    const invalid = createErrorReflection({
        learnerId: 'usr-123',
        titulo: 'Error',
        quePaso: 'Corto',
        informacion: '',
        otraManera: '',
        criterio: '',
        planMejora: ''
    });

    const invalidCheck = validateErrorReflection(invalid);
    assert.equal(invalidCheck.isValid, false, 'Debe rechazar reflexiones incompletas');
    assert.ok(invalidCheck.errors.length >= 4);
});

// =============================================================================
// 5. VERIFICACIÓN DE PROGRESO POR ROL Y RECORRIDOS ASIGNADOS
// =============================================================================
test('SummarizeRoleProgress calcula el avance triple: módulos, prácticas y competencias', () => {
    const p = normalizeProgress({
        version: 1,
        completed: [],
        attempts: [],
        decisions: [],
        lastLesson: null,
        roleModulesCompleted: ['comun-trabajo', 'ventas-consulta-presentacion'],
        roleSimulations: [
            { simulationId: 'sim-vta-01', selectedOption: 'opt-c', score: 100, at: '2026-11-20T10:00:00Z' },
            { simulationId: 'sim-vta-02', selectedOption: 'opt-a', score: 15, at: '2026-11-20T11:00:00Z' }
        ],
        roleQuestionsAnswered: {
            'comun-q1': { isCorrect: true, optionIndex: 1, at: '2026-11-20T10:00:00Z' },
            'comun-q2': { isCorrect: true, optionIndex: 1, at: '2026-11-20T10:01:00Z' },
            'comun-q3': { isCorrect: false, optionIndex: 0, at: '2026-11-20T10:02:00Z' }
        },
        errorReflections: [
            { id: 'err-1', titulo: 'Reflexión privada', compartidoConSupervisor: false }
        ],
        sharedErrorReflections: []
    });

    const trackVentas = ROLE_TRACKS.ventas;
    const summary = summarizeRoleProgress(p, trackVentas);

    // Módulos completados (2 de 5)
    assert.equal(summary.modulesCompleted, 2);
    assert.equal(summary.modulesTotal, 5);
    assert.equal(summary.modulesPercent, 40);

    // Simulaciones: 2 intentadas, 1 aprobada (score >= 70)
    assert.equal(summary.simulationsAttempted, 2);
    assert.equal(summary.simulationsPassed, 1);

    // Preguntas: 2 correctas de 3 (67%)
    assert.equal(summary.totalQuestionsAnswered, 3);
    assert.equal(summary.correctQuestions, 2);
    assert.equal(summary.questionAccuracy, 67);

    // Módulos pendientes para reforzar (3 restantes)
    assert.equal(summary.weakModules.length, 3);
    assert.ok(summary.weakModules.some(m => m.id === 'ventas-negociacion-objeciones'));

    // Reflexiones
    assert.equal(summary.errorReflectionsCount, 1);
    assert.equal(summary.sharedReflectionsCount, 0);
});

test('Role Tracks y navegación de Academy mapean correctamente según roles', () => {
    assert.equal(getTrackByRole('ventas').id, 'ventas');
    assert.equal(getTrackByRole('gestoria_contabilidad').id, 'gestoria');
    assert.equal(getTrackByRole('administrativo').id, 'administracion');
    assert.equal(getTrackByRole('solo_lectura').id, 'comun');

    // Espacios de navegación requeridos por el encargo (8 espacios con Simulador de Negociación)
    assert.ok(roleTrainingSections.length >= 7);
    const spaceIds = roleTrainingSections.map(([id]) => id);
    assert.ok(spaceIds.includes('mi-capacitacion'));
    assert.ok(spaceIds.includes('aprender'));
    assert.ok(spaceIds.includes('practicar'));
    assert.ok(spaceIds.includes('negociacion'));
    assert.ok(spaceIds.includes('tutor'));
    assert.ok(spaceIds.includes('aprender-del-error'));
    assert.ok(spaceIds.includes('progreso'));
    assert.ok(spaceIds.includes('gestion'));
});
