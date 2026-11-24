import test from 'node:test';
import assert from 'node:assert/strict';
import { ROLE_MODULES, MODULE_STATUS, getRoleModuleById } from '../src/lib/academy/roleModules.js';
import { TUTOR_PROCEDURES, searchTutorKnowledge } from '../src/lib/academy/roleTutorKnowledge.js';

test('Matriz Oficial ARCA — MOD-ADM-01: Estado pendiente de validación contable y contenido actualizado', () => {
    const mod = getRoleModuleById('admin-preparacion-validacion');
    assert.ok(mod, 'El módulo admin-preparacion-validacion debe existir');

    // 1. Verificación de estado de aprobación y validación
    assert.equal(mod.status, MODULE_STATUS.IN_REVIEW, 'El módulo debe quedar en revisión antes de la validación del contador');
    assert.equal(mod.requiresProfessionalValidation, true);
    assert.ok(mod.validationNote.toLowerCase().includes('contador público'), 'Debe indicar que está pendiente de validación por contador');

    // 2. Verificación de las 3 reglas de la Matriz Oficial de ARCA en la explicación
    const exp = mod.explanation;
    assert.ok(exp.includes('Responsable Inscripto'), 'Debe identificar al emisor como Responsable Inscripto');
    assert.ok(exp.includes('Monotributista'), 'Debe contemplar al receptor Monotributista');
    assert.ok(exp.includes('Factura "A"'), 'Debe dictar Factura A para Monotributista');
    assert.ok(exp.includes('Factura "B"'), 'Debe dictar Factura B para Consumidor Final o Exento');
    assert.ok(exp.includes('Factura "C"'), 'Debe dictar Factura C para emisor Monotributista');
    assert.ok(!exp.includes('rechaza la emisión de Factura A a Monotributistas'), 'No debe afirmar que ARCA rechaza Factura A a monotributistas');
});

test('Matriz Oficial ARCA — Quiz adm-pre-q1: Evalúa correctamente los tres casos y fundamenta las devoluciones', () => {
    const mod = getRoleModuleById('admin-preparacion-validacion');
    const q1 = mod.situationalQuestions.find(q => q.id === 'adm-pre-q1');
    assert.ok(q1, 'La pregunta adm-pre-q1 debe existir');

    // Identificación explícita de la condición fiscal de emisor y receptor
    assert.ok(q1.question.includes('Responsable Inscripto'), 'La pregunta debe identificar la condición del emisor (Responsable Inscripto)');
    assert.ok(q1.question.includes('Monotributista'), 'La pregunta debe identificar la condición del receptor (Monotributista)');

    // Exactamente 3 opciones y solo 1 correcta
    assert.equal(q1.options.length, 3, 'Debe contener 3 opciones');
    const correctOptions = q1.options.filter(o => o.isCorrect === true);
    assert.equal(correctOptions.length, 1, 'Debe haber exactamente 1 opción correcta');

    // Caso 1: Responsable Inscripto -> Monotributista debe ser Factura A
    const optCorrect = correctOptions[0];
    assert.ok(optCorrect.text.includes('Factura tipo "A"') || optCorrect.text.includes('Factura "A"'), 'La opción correcta debe indicar Factura A');
    assert.ok(optCorrect.text.includes('leyenda'), 'Debe mencionar la leyenda reglamentaria obligatoria');
    assert.ok(optCorrect.feedback.includes('matriz oficial de comprobantes de ARCA'), 'El feedback debe fundamentar con la matriz de ARCA');

    // Opción Factura B debe ser incorrecta y explicar por qué
    const optB = q1.options.find(o => o.text.includes('Factura tipo "B"'));
    assert.ok(optB, 'Debe existir la opción de Factura B');
    assert.equal(optB.isCorrect, false, 'Factura B debe ser incorrecta');
    assert.ok(optB.feedback.includes('Consumidores Finales o Sujetos Exentos'), 'Debe aclarar que Factura B es para Consumidores Finales o Exentos');

    // Opción Factura C debe ser incorrecta y explicar por qué
    const optC = q1.options.find(o => o.text.includes('Factura tipo "C"'));
    assert.ok(optC, 'Debe existir la opción de Factura C');
    assert.equal(optC.isCorrect, false, 'Factura C debe ser incorrecta');
    assert.ok(optC.feedback.includes('emisor es Monotributista'), 'Debe aclarar que Factura C aplica si el emisor es Monotributista');
});

test('Matriz Oficial ARCA — Tutor PROC-ADM-01: Estado pendiente y respuestas coherentes a consultas sobre monotributo', () => {
    const proc = TUTOR_PROCEDURES.find(p => p.id === 'PROC-ADM-01');
    assert.ok(proc, 'PROC-ADM-01 debe existir en TUTOR_PROCEDURES');

    // Estado del procedimiento en el tutor
    assert.equal(proc.status, 'Pendiente de validación por Contador Público', 'El estado del procedimiento no debe figurar como aprobado');

    // Verificación de contenido normativo
    assert.ok(proc.content.includes('Factura "A"'));
    assert.ok(proc.content.includes('Monotributista'));
    assert.ok(proc.content.includes('Factura "B"'));
    assert.ok(proc.content.includes('Factura "C"'));

    // Búsqueda en el tutor de la consulta clave sobre Monotributista
    const results = searchTutorKnowledge('que factura emitir a un monotributista');
    assert.ok(results.length > 0, 'El tutor debe responder a la consulta sobre facturación a monotributistas');
    assert.equal(results[0].procedureCode, 'PROC-ADM-01');
    assert.ok(results[0].summary.includes('Factura "A"'), 'El resumen del tutor debe dictar Factura A');
    assert.ok(results[0].summary.includes('Consumidores Finales o Sujetos Exentos'), 'Debe delimitar Factura B');
    assert.ok(results[0].summary.includes('Pendiente de validación por Contador Público'), 'Debe indicar que está pendiente de validación');
});

test('Matriz Oficial ARCA — Prueba de los 3 casos ficticios con datos sintéticos completos', () => {
    const mockCases = [
        {
            id: 'CASO-01',
            emisor: { razonSocial: 'AutoSporting SA', cuit: '30-71122334-9', condicionIva: 'Responsable Inscripto' },
            receptor: { nombre: 'Juan Carlos Gómez', cuit: '20-28456123-4', condicionIva: 'Monotributista Categoría C' },
            concepto: 'Venta de camioneta usada Ford Ranger 2020 de stock propio',
            tipoComprobanteEsperado: 'Factura A',
            leyendaObligatoria: true
        },
        {
            id: 'CASO-02',
            emisor: { razonSocial: 'AutoSporting SA', cuit: '30-71122334-9', condicionIva: 'Responsable Inscripto' },
            receptor: { nombre: 'María Laura Rossi', dni: '34.567.890', condicionIva: 'Consumidor Final' },
            concepto: 'Venta de automóvil Chevrolet Cruze 2019 de stock propio',
            tipoComprobanteEsperado: 'Factura B',
            leyendaObligatoria: false
        },
        {
            id: 'CASO-03',
            emisor: { nombre: 'Transportes Rápidos', cuit: '27-31222333-8', condicionIva: 'Monotributista' },
            receptor: { razonSocial: 'AutoSporting SA', cuit: '30-71122334-9', condicionIva: 'Responsable Inscripto' },
            concepto: 'Servicio de flete y traslado de unidad',
            tipoComprobanteEsperado: 'Factura C',
            leyendaObligatoria: false
        }
    ];

    // Función de resolución canónica basada en la matriz de ARCA
    function resolverComprobanteARCA(emisor, receptor) {
        if (emisor.condicionIva === 'Monotributista') {
            return { tipo: 'Factura C', leyenda: null };
        }
        if (emisor.condicionIva === 'Responsable Inscripto') {
            if (receptor.condicionIva.includes('Monotributista') || receptor.condicionIva.includes('Responsable Inscripto')) {
                return {
                    tipo: 'Factura A',
                    leyenda: receptor.condicionIva.includes('Monotributista')
                        ? 'El crédito fiscal discriminado en el presente comprobante, sólo podrá ser computado a efectos del Régimen de Sostenimiento e Inclusión Fiscal para Pequeños Contribuyentes de la Ley Nº 27.618'
                        : null
                };
            }
            return { tipo: 'Factura B', leyenda: null };
        }
        return { tipo: 'Factura B', leyenda: null };
    }

    for (const c of mockCases) {
        const res = resolverComprobanteARCA(c.emisor, c.receptor);
        assert.equal(res.tipo, c.tipoComprobanteEsperado, `Fallo en resolución para ${c.id}`);
        if (c.leyendaObligatoria) {
            assert.ok(res.leyenda && res.leyenda.length > 20, `Debe incluir leyenda obligatoria en ${c.id}`);
        }
    }
});

test('Identificación de intentos anteriores sin modificación destructiva de registros', () => {
    // Simulación de registros históricos de alumnos en localStorage / state
    const historicalAnswers = {
        'user-101': { isCorrect: true, optionIndex: 1, at: '2026-11-19T14:30:00.000Z' }, // Alumno que respondió bajo la pauta anterior (Factura B)
        'user-102': { isCorrect: false, optionIndex: 0, at: '2026-11-20T10:15:00.000Z' }, // Alumno que respondió Factura A y fue calificado false
        'user-103': { isCorrect: true, optionIndex: 0, at: '2026-11-22T04:10:00.000Z' }  // Alumno evaluado con la versión corregida
    };

    const auditDate = '2026-11-22T04:00:00.000Z';

    function identifyAffectedAttempts(answers, questionId, cutoffDate) {
        const affected = [];
        for (const [userId, record] of Object.entries(answers)) {
            if (record && record.at < cutoffDate) {
                // En la versión anterior: optionIndex 1 era 'Factura B' (marcado true) y optionIndex 0 era 'Factura A' (marcado false)
                if (record.optionIndex === 1 && record.isCorrect === true) {
                    affected.push({ userId, issue: 'CALIFICACION_VALIDA_CON_CRITERIO_OBSOLETO', record });
                } else if (record.optionIndex === 0 && record.isCorrect === false) {
                    affected.push({ userId, issue: 'CALIFICACION_INCORRECTA_POR_CRITERIO_OBSOLETO', record });
                }
            }
        }
        return affected;
    }

    const affected = identifyAffectedAttempts(historicalAnswers, 'adm-pre-q1', auditDate);
    assert.equal(affected.length, 2, 'Debe identificar los 2 registros previos afectados');
    assert.equal(affected[0].issue, 'CALIFICACION_VALIDA_CON_CRITERIO_OBSOLETO');
    assert.equal(affected[1].issue, 'CALIFICACION_INCORRECTA_POR_CRITERIO_OBSOLETO');

    // Garantizar que la estructura no modifica los datos históricos
    assert.equal(historicalAnswers['user-101'].optionIndex, 1);
    assert.equal(historicalAnswers['user-102'].optionIndex, 0);
});
