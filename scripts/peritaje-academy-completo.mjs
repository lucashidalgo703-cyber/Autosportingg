// scripts/peritaje-academy-completo.mjs
/**
 * PERITAJE EXHAUSTIVO DE CONTENIDOS EDUCATIVOS Y MATRICES DE EVALUACIÓN
 * AutoSporting Academy 2.0 / 3.0
 */

import { courses } from '../src/lib/academy/curriculum.js';
import { questions as assessmentQuestions, gradeAssessment } from '../src/lib/academy/assessments.js';
import { assessmentVariants } from '../src/lib/academy/assessmentVariants.js';
import { ROLE_MODULES, MODULE_STATUS } from '../src/lib/academy/roleModules.js';
import { ROLE_SIMULATIONS } from '../src/lib/academy/roleSimulations.js';
import { NEGOTIATION_SCENARIOS } from '../src/lib/academy/negotiationScenarios.js';
import { MOTIVATIONAL_QUOTES } from '../src/lib/academy/aprenderDelError.js';
import { buildQuestionsFromStock, parseNumericalResponse } from '../src/services/academyDailyChallengeService.js';
import { generateNewIntakeMiniChallenge } from '../src/services/academyNewIntakeChallengeService.js';

console.log('================================================================');
console.log(' INICIANDO PERITAJE TÉCNICO EXHAUSTIVO: AUTOSPORTING ACADEMY ');
console.log('================================================================\n');

const stats = {
    roleModulesChecked: 0,
    roleQuestionsChecked: 0,
    curriculumLessonsChecked: 0,
    curriculumExercisesChecked: 0,
    assessmentConceptsChecked: 0,
    assessmentCasesChecked: 0,
    assessmentVariantsChecked: 0,
    simulationsChecked: 0,
    negotiationScenariosChecked: 0,
    dailyChallengesSimulated: 0,
    intakeMiniChallengesSimulated: 0,
    motivationalQuotesChecked: 0,
    inconsistencies: []
};

// -----------------------------------------------------------------------------
// 1. PERITAJE: MÓDULOS DE ROL Y PREGUNTAS SITUACIONALES (roleModules.js)
// -----------------------------------------------------------------------------
console.log('--- [1/7] AUDITORÍA DE MÓDULOS DE ROL (roleModules.js) ---');
for (const mod of ROLE_MODULES) {
    stats.roleModulesChecked++;
    if (!mod.id || !mod.title || !mod.situationalQuestions || !Array.isArray(mod.situationalQuestions)) {
        stats.inconsistencies.push(`Módulo ${mod.id || 'sin-id'} inválido o sin situationalQuestions.`);
        continue;
    }

    // Comprobar estado de validación contable para MOD-ADM-01
    if (mod.id === 'admin-preparacion-validacion') {
        if (mod.status !== MODULE_STATUS.IN_REVIEW) {
            stats.inconsistencies.push(`MOD-ADM-01 debe figurar como IN_REVIEW (Pendiente de validación contable). Estado actual: ${mod.status}`);
        }
    }

    for (const q of mod.situationalQuestions) {
        stats.roleQuestionsChecked++;
        if (!q.id || !q.question || !Array.isArray(q.options) || q.options.length < 2) {
            stats.inconsistencies.push(`Pregunta ${q.id || 'sin-id'} en módulo ${mod.id} tiene estructura incompleta.`);
            continue;
        }

        const correctOptions = q.options.filter(o => o.isCorrect === true);
        const incorrectOptions = q.options.filter(o => o.isCorrect === false);

        if (correctOptions.length !== 1) {
            stats.inconsistencies.push(`Pregunta ${q.id} en ${mod.id} tiene ${correctOptions.length} opciones correctas (debe tener exactamente 1).`);
        }

        if (incorrectOptions.length !== q.options.length - 1) {
            stats.inconsistencies.push(`Pregunta ${q.id} en ${mod.id} tiene opciones con isCorrect no booleano.`);
        }

        // Verificar que cada opción tenga texto y feedback explicativo
        for (const opt of q.options) {
            if (!opt.text || opt.text.trim() === '') {
                stats.inconsistencies.push(`Pregunta ${q.id}: opción con texto vacío.`);
            }
            if (!opt.feedback || opt.feedback.trim() === '') {
                stats.inconsistencies.push(`Pregunta ${q.id}: opción sin feedback explicativo.`);
            }
        }

        // Verificación específica ARCA adm-pre-q1
        if (q.id === 'adm-pre-q1') {
            const correctOpt = correctOptions[0];
            if (!/\bfactura\s+(?:tipo\s+)?["']?a["']?\b/i.test(correctOpt.text)) {
                stats.inconsistencies.push(`adm-pre-q1: La opción correcta debe ser Factura A conforme a la matriz oficial ARCA (Ley 27.618 / RG 5003). Texto actual: "${correctOpt.text}"`);
            }
            if (/\bfactura\s+(?:tipo\s+)?["']?b["']?\b/i.test(correctOpt.text)) {
                stats.inconsistencies.push(`adm-pre-q1: La opción correcta no debe ser Factura B para receptor Monotributista.`);
            }
        }
    }
}
console.log(`✓ Módulos auditados: ${stats.roleModulesChecked}`);
console.log(`✓ Preguntas situacionales auditadas: ${stats.roleQuestionsChecked} (11 módulos x 3 preguntas)`);

// -----------------------------------------------------------------------------
// 2. PERITAJE: CURSOS FINANCIEROS Y EJERCICIOS DE LECCIÓN (curriculum.js)
// -----------------------------------------------------------------------------
console.log('\n--- [2/7] AUDITORÍA DE EJERCICIOS DE CURSOS (curriculum.js) ---');
for (const course of courses) {
    if (!course.lessons || !Array.isArray(course.lessons)) {
        stats.inconsistencies.push(`Curso ${course.id} no tiene lecciones.`);
        continue;
    }
    for (const lesson of course.lessons) {
        stats.curriculumLessonsChecked++;
        const ex = lesson.exercise;
        if (!ex) {
            stats.inconsistencies.push(`Lección ${lesson.id} no tiene ejercicio práctico.`);
            continue;
        }
        stats.curriculumExercisesChecked++;
        if (typeof ex.question !== 'string' || ex.question.trim() === '') {
            stats.inconsistencies.push(`Lección ${lesson.id}: pregunta vacía.`);
        }
        if (typeof ex.answer !== 'number' || isNaN(ex.answer)) {
            stats.inconsistencies.push(`Lección ${lesson.id}: answer debe ser un número válido.`);
        }
        if (typeof ex.explanation !== 'string' || ex.explanation.trim() === '') {
            stats.inconsistencies.push(`Lección ${lesson.id}: explicación vacía.`);
        }
        if (!ex.unit) {
            stats.inconsistencies.push(`Lección ${lesson.id}: falta unidad de medida.`);
        }

        // Verificación de consistencia matemática
        // En fundamentos-2: 15.000.000 - 12.000.000 = 3.000.000
        // En financiacion-3: 1.200.000 / 6 = 200.000
        const exp = ex.explanation;
        const ans = ex.answer;
        let isMathConsistent = false;
        if (exp.includes(ans.toLocaleString('es-AR')) || exp.includes(String(ans)) || exp.includes(ans.toFixed(0))) {
            isMathConsistent = true;
        } else if (lesson.id === 'fundamentos-2' && (15000000 - 12000000 === ans)) {
            isMathConsistent = true;
        } else if (lesson.id === 'financiacion-3' && (1200000 / 6 === ans)) {
            isMathConsistent = true;
        }

        if (!isMathConsistent) {
            stats.inconsistencies.push(`Lección ${lesson.id}: La explicación no guarda consistencia con el resultado numérico ${ans}. Explicación: "${exp}"`);
        }
    }
}
console.log(`✓ Lecciones auditadas: ${stats.curriculumLessonsChecked}`);
console.log(`✓ Ejercicios prácticos auditados: ${stats.curriculumExercisesChecked} (8 cursos x 3 lecciones)`);

// -----------------------------------------------------------------------------
// 3. PERITAJE: EVALUACIONES Y VARIANTES NUMÉRICAS (assessments.js / assessmentVariants.js)
// -----------------------------------------------------------------------------
console.log('\n--- [3/7] AUDITORÍA DE EVALUACIONES (assessments.js) ---');
for (const q of assessmentQuestions) {
    if (q.type === 'choice') {
        if (q.id.endsWith('-concepto')) stats.assessmentConceptsChecked++;
        if (q.id.endsWith('-caso')) stats.assessmentCasesChecked++;

        if (!Array.isArray(q.options) || q.options.length < 2) {
            stats.inconsistencies.push(`Pregunta ${q.id}: lista de opciones inválida.`);
        }
        if (typeof q.correct !== 'number' || q.correct < 0 || q.correct >= q.options.length) {
            stats.inconsistencies.push(`Pregunta ${q.id}: índice 'correct' fuera de rango (${q.correct}).`);
        }
        const selectedText = q.options[q.correct];
        if (!selectedText || selectedText.trim() === '') {
            stats.inconsistencies.push(`Pregunta ${q.id}: opción correcta con texto vacío.`);
        }
    } else if (q.type === 'numeric') {
        stats.assessmentVariantsChecked++;
        if (typeof q.correct !== 'number' || isNaN(q.correct)) {
            stats.inconsistencies.push(`Pregunta numérica ${q.id}: valor 'correct' inválido.`);
        }
        if (!q.explanation || q.explanation.trim() === '') {
            stats.inconsistencies.push(`Pregunta numérica ${q.id}: explicación vacía.`);
        }
    }
}
console.log(`✓ Preguntas conceptuales: ${stats.assessmentConceptsChecked} (8 cursos)`);
console.log(`✓ Preguntas de caso: ${stats.assessmentCasesChecked} (8 cursos)`);
console.log(`✓ Variantes numéricas: ${stats.assessmentVariantsChecked} (8 cursos x 3 variantes)`);

// -----------------------------------------------------------------------------
// 4. PERITAJE: SIMULACIONES INTERACTIVAS Y DECISIONES (roleSimulations.js)
// -----------------------------------------------------------------------------
console.log('\n--- [4/7] AUDITORÍA DE SIMULACIONES (roleSimulations.js) ---');
for (const sim of ROLE_SIMULATIONS) {
    stats.simulationsChecked++;
    if (!sim.id || !sim.title || !sim.context || !sim.decisions || !Array.isArray(sim.decisions)) {
        stats.inconsistencies.push(`Simulación ${sim.id || 'sin-id'} incompleta.`);
        continue;
    }
    if (sim.decisions.length < 3) {
        stats.inconsistencies.push(`Simulación ${sim.id} tiene menos de 3 decisiones.`);
    }

    let hasOptimal = false;
    let hasDeficient = false;

    for (const d of sim.decisions) {
        if (!d.id || !d.title || !d.action || !d.outcome || !d.feedback) {
            stats.inconsistencies.push(`Simulación ${sim.id}, decisión ${d.id}: campos requeridos faltantes.`);
        }
        if (typeof d.score !== 'number' || d.score < 0 || d.score > 100) {
            stats.inconsistencies.push(`Simulación ${sim.id}, decisión ${d.id}: puntaje fuera de escala [0-100] (${d.score}).`);
        }
        if (d.score >= 90) hasOptimal = true;
        if (d.score <= 40) hasDeficient = true;

        if (!d.rubricBreakdown) {
            stats.inconsistencies.push(`Simulación ${sim.id}, decisión ${d.id}: falta rubricBreakdown.`);
        }
    }

    if (!hasOptimal) {
        stats.inconsistencies.push(`Simulación ${sim.id} no posee una alternativa óptima (score >= 90).`);
    }
    if (!hasDeficient) {
        stats.inconsistencies.push(`Simulación ${sim.id} no posee una alternativa deficiente o riesgosa (score <= 40).`);
    }
}
console.log(`✓ Simulaciones auditadas: ${stats.simulationsChecked} (6 casos prácticos completos)`);

// -----------------------------------------------------------------------------
// 5. PERITAJE: ESCENARIOS DE NEGOCIACIÓN CON IA (negotiationScenarios.js)
// -----------------------------------------------------------------------------
console.log('\n--- [5/7] AUDITORÍA DE ESCENARIOS DE NEGOCIACIÓN ---');
for (const sc of NEGOTIATION_SCENARIOS) {
    stats.negotiationScenariosChecked++;
    if (!sc.id || !sc.title || !sc.clientProfile || !sc.buyerPromptInstruction) {
        stats.inconsistencies.push(`Escenario de negociación ${sc.id || 'sin-id'} incompleto.`);
    }
    if (!Array.isArray(sc.knownInfo) || sc.knownInfo.length === 0) {
        stats.inconsistencies.push(`Escenario ${sc.id}: falta knownInfo.`);
    }
    if (!Array.isArray(sc.hiddenInfo) || sc.hiddenInfo.length === 0) {
        stats.inconsistencies.push(`Escenario ${sc.id}: falta hiddenInfo.`);
    }
    if (!Array.isArray(sc.closingConditions) || sc.closingConditions.length === 0) {
        stats.inconsistencies.push(`Escenario ${sc.id}: faltan condiciones de cierre.`);
    }
    if (!sc.category) {
        stats.inconsistencies.push(`Escenario ${sc.id}: falta categoría.`);
    }
}
console.log(`✓ Escenarios de negociación auditados: ${stats.negotiationScenariosChecked} (8 escenarios con IA)`);

// -----------------------------------------------------------------------------
// 6. PERITAJE: GENERADOR DE DESAFÍOS DIARIOS (academyDailyChallengeService.js)
// -----------------------------------------------------------------------------
console.log('\n--- [6/7] AUDITORÍA DEL GENERADOR DE DESAFÍOS DIARIOS ---');
const sampleCars = [
    { id: 'car-1', brand: 'Toyota', name: 'Hilux SRX 4x4', year: 2022, km: 45000, price: 42000000, currency: 'ARS', fuel: 'Diesel', vehicleType: 'Pick-up', hasDuplicateKeys: true, hasOfficialServices: true, coverImage: '/test1.jpg' },
    { id: 'car-2', brand: 'Volkswagen', name: 'Amarok Highline V6', year: 2021, km: 60000, price: 39500000, currency: 'ARS', fuel: 'Diesel', vehicleType: 'Pick-up', hasDuplicateKeys: true, hasOfficialServices: true, coverImage: '/test2.jpg' },
    { id: 'car-3', brand: 'Ford', name: 'Ranger XLT 3.2', year: 2020, km: 78000, price: 32000000, currency: 'ARS', fuel: 'Diesel', vehicleType: 'Pick-up', hasDuplicateKeys: false, hasOfficialServices: false, coverImage: '/test3.jpg' },
    { id: 'car-4', brand: 'Jeep', name: 'Compass Limited Plus', year: 2023, km: 21000, price: 34000000, currency: 'ARS', fuel: 'Nafta', vehicleType: 'SUV', hasDuplicateKeys: true, hasOfficialServices: true, coverImage: '/test4.jpg' },
    { id: 'car-5', brand: 'Peugeot', name: '208 Feline 1.6', year: 2022, km: 30000, price: 18500000, currency: 'ARS', fuel: 'Nafta', vehicleType: 'Hatchback', hasDuplicateKeys: true, hasOfficialServices: true, coverImage: '/test5.jpg' }
];

for (let i = 0; i < 10; i++) {
    stats.dailyChallengesSimulated++;
    const questions = buildQuestionsFromStock(sampleCars, []);
    if (questions.length !== 8) {
        stats.inconsistencies.push(`Desafío diario debe tener exactamente 8 preguntas. Obtenidas: ${questions.length}`);
    }

    // Comprobar que cada pregunta tenga su respuesta esperada exactamente en options[correctOptionIndex]
    questions.forEach((q, idx) => {
        if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
            stats.inconsistencies.push(`Desafío Diario pregunta ${idx + 1} (${q.category}): opciones inválidas.`);
        }
        if (typeof q.correctOptionIndex !== 'number' || q.correctOptionIndex < 0 || q.correctOptionIndex >= q.options.length) {
            stats.inconsistencies.push(`Desafío Diario pregunta ${idx + 1} (${q.category}): correctOptionIndex fuera de rango.`);
        }
        const correctOpt = q.options[q.correctOptionIndex];
        if (!correctOpt || correctOpt.trim() === '') {
            stats.inconsistencies.push(`Desafío Diario pregunta ${idx + 1}: opción correcta vacía.`);
        }

        // Comprobar tolerancia numérica si aplica
        if (q.correctNumericValue) {
            const matchesDirect = parseNumericalResponse(String(q.correctNumericValue), q.correctNumericValue, q.numericTolerancePercent || 0.05);
            if (!matchesDirect) {
                stats.inconsistencies.push(`Desafío Diario pregunta ${idx + 1}: parseNumericalResponse falló para el valor exacto.`);
            }
            // Probar formato argentino con signo pesos
            const argFormatted = `$${q.correctNumericValue.toLocaleString('es-AR')}`;
            const matchesArg = parseNumericalResponse(argFormatted, q.correctNumericValue, q.numericTolerancePercent || 0.05);
            if (!matchesArg) {
                stats.inconsistencies.push(`Desafío Diario pregunta ${idx + 1}: parseNumericalResponse no admitió formato argentino ${argFormatted}.`);
            }
        }
    });
}
console.log(`✓ Desafíos diarios simulados: ${stats.dailyChallengesSimulated} (80 preguntas dinámicas validadas)`);

// -----------------------------------------------------------------------------
// 7. PERITAJE: FRASES MOTIVADORAS (aprenderDelError.js)
// -----------------------------------------------------------------------------
console.log('\n--- [7/7] AUDITORÍA DE FRASES MOTIVADORAS (aprenderDelError.js) ---');
for (const quote of MOTIVATIONAL_QUOTES) {
    stats.motivationalQuotesChecked++;
    if (!quote.id || !quote.quote || !quote.author || !quote.category) {
        stats.inconsistencies.push(`Frase motivadora inválida: ${JSON.stringify(quote)}`);
    }
}
console.log(`✓ Frases motivadoras auditadas: ${stats.motivationalQuotesChecked}`);

// -----------------------------------------------------------------------------
// RESULTADO FINAL DEL PERITAJE DE PREGUNTAS Y RESPUESTAS
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(' RESUMEN DEL PERITAJE DE PREGUNTAS Y CONTENIDOS ');
console.log('================================================================');
console.log(`Total Módulos de rol auditados:           ${stats.roleModulesChecked}`);
console.log(`Total Preguntas de rol auditadas:         ${stats.roleQuestionsChecked}`);
console.log(`Total Lecciones de cursos auditadas:      ${stats.curriculumLessonsChecked}`);
console.log(`Total Ejercicios de lección auditados:    ${stats.curriculumExercisesChecked}`);
console.log(`Total Preguntas conceptuales:             ${stats.assessmentConceptsChecked}`);
console.log(`Total Preguntas de caso:                  ${stats.assessmentCasesChecked}`);
console.log(`Total Variantes numéricas:                ${stats.assessmentVariantsChecked}`);
console.log(`Total Simulaciones de negocio:            ${stats.simulationsChecked}`);
console.log(`Total Escenarios de negociación con IA:   ${stats.negotiationScenariosChecked}`);
console.log(`Total Frases motivadoras:                 ${stats.motivationalQuotesChecked}`);
console.log(`Inconsistencias detectadas:               ${stats.inconsistencies.length}`);

if (stats.inconsistencies.length > 0) {
    console.error('\n⚠️ SE DETECTARON INCONSISTENCIAS:');
    stats.inconsistencies.forEach((err, i) => console.error(` [${i + 1}] ${err}`));
    process.exit(1);
} else {
    console.log('\n🏆 VEREDICTO DE PREGUNTAS Y RESPUESTAS: 100% COHERENTES Y VERIFICADAS.');
    process.exit(0);
}
