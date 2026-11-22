// src/lib/academy/progress.js
import { courses } from './curriculum.js';
import { ROLE_MODULES } from './roleModules.js';
import { ROLE_SIMULATIONS } from './roleSimulations.js';

export const allLessonIds = courses.flatMap(course => course.lessons.map(lesson => lesson.id));
export const allRoleModuleIds = ROLE_MODULES.map(m => m.id);
export const allSimulationIds = ROLE_SIMULATIONS.map(s => s.id);

export const emptyProgress = () => ({
    version: 1,
    completed: [],
    attempts: [],
    decisions: [],
    lastLesson: null,
    roleModulesCompleted: [],
    roleSimulations: [],
    roleQuestionsAnswered: {},
    errorReflections: [],
    sharedErrorReflections: [],
    assignedTrack: null,
    assignedModules: [],
    recommendedActivities: []
});

export function normalizeProgress(value) {
    if (!value || value.version !== 1) return emptyProgress();
    const validCourses = new Set(courses.map(c => c.id));
    const completed = [...new Set((Array.isArray(value.completed) ? value.completed : []).filter(id => allLessonIds.includes(id)))];
    const attempts = (Array.isArray(value.attempts) ? value.attempts : []).filter(a => a && validCourses.has(a.courseId) && ['Todos', 'Inicial', 'Intermedio', 'Avanzado'].includes(a.level) && Number.isFinite(a.score) && a.score >= 0 && a.score <= 100 && Number.isInteger(a.total) && a.total > 0 && a.total <= 5 && typeof a.at === 'string' && Number.isFinite(Date.parse(a.at))).slice(-100).map(a => ({ courseId: a.courseId, level: a.level, score: a.score, total: a.total, at: a.at }));
    const decisions = (Array.isArray(value.decisions) ? value.decisions : []).filter(d => d && typeof d.scenarioId === 'string' && d.scenarioId.length < 80 && Number.isInteger(d.option) && d.option >= 0 && d.option <= 2 && typeof d.at === 'string' && Number.isFinite(Date.parse(d.at))).slice(-50).map(d => ({ scenarioId: d.scenarioId, option: d.option, at: d.at }));

    // Normalización de campos de capacitación práctica por rol
    const roleModulesCompleted = [...new Set((Array.isArray(value.roleModulesCompleted) ? value.roleModulesCompleted : []).filter(id => allRoleModuleIds.includes(id)))];
    const roleSimulations = (Array.isArray(value.roleSimulations) ? value.roleSimulations : [])
        .filter(s => s && allSimulationIds.includes(s.simulationId) && Number.isFinite(s.score) && typeof s.at === 'string')
        .slice(-50)
        .map(s => ({
            simulationId: s.simulationId,
            selectedOption: s.selectedOption,
            score: s.score,
            at: s.at,
            rubricBreakdown: s.rubricBreakdown || {}
        }));
    const roleQuestionsAnswered = typeof value.roleQuestionsAnswered === 'object' && value.roleQuestionsAnswered !== null
        ? value.roleQuestionsAnswered
        : {};
    const errorReflections = (Array.isArray(value.errorReflections) ? value.errorReflections : [])
        .slice(-50);
    const sharedErrorReflections = (Array.isArray(value.sharedErrorReflections) ? value.sharedErrorReflections : [])
        .slice(-50);
    const assignedTrack = typeof value.assignedTrack === 'string' ? value.assignedTrack : null;
    const assignedModules = Array.isArray(value.assignedModules) ? value.assignedModules.filter(id => allRoleModuleIds.includes(id)) : [];
    const recommendedActivities = Array.isArray(value.recommendedActivities) ? value.recommendedActivities.slice(-20) : [];

    return {
        version: 1,
        completed,
        attempts,
        decisions,
        lastLesson: allLessonIds.includes(value.lastLesson) ? value.lastLesson : null,
        roleModulesCompleted,
        roleSimulations,
        roleQuestionsAnswered,
        errorReflections,
        sharedErrorReflections,
        assignedTrack,
        assignedModules,
        recommendedActivities
    };
}

// Repositorio local versionado y seguro con Web Locks
export function createLocalProgressRepository(storage, learnerId, locks) {
    if (!locks?.request) throw new Error('Este navegador no ofrece bloqueo entre pestañas. El avance será temporal para evitar sobrescrituras.');
    const key = 'autosporting.academy.v1:' + encodeURIComponent(learnerId);
    const snapshot = () => {
        const raw = storage.getItem(key);
        if (!raw) return { generation: 'initial', progress: emptyProgress() };
        try {
            const value = JSON.parse(raw);
            if (value.schema === 2 && typeof value.generation === 'string' && value.progress?.version === 1) return { generation: value.generation, progress: normalizeProgress(value.progress) };
            if (value.version === 1) return { generation: 'initial', progress: normalizeProgress(value) };
            throw new Error('Formato desconocido');
        } catch { throw new Error('El progreso local no se pudo leer. Podés restablecerlo desde Mi progreso.'); }
    };
    const write = state => storage.setItem(key, JSON.stringify({ schema: 2, ...state }));
    const stale = () => { throw new Error('El progreso fue restablecido en otra pestaña. Revisá el estado actualizado y repetí la acción si corresponde.'); };
    return {
        key, snapshot,
        load: () => snapshot().progress,
        update: (reducer, expectedGeneration) => locks.request(key, () => {
            const latest = snapshot();
            if (latest.generation !== expectedGeneration) stale();
            const next = { generation: latest.generation, progress: normalizeProgress(reducer(latest.progress)) };
            write(next);
            return next;
        }),
        reset: expectedGeneration => locks.request(key, () => {
            let latest;
            try { latest = snapshot(); } catch (error) { if (expectedGeneration !== null) throw error; }
            if (latest && latest.generation !== expectedGeneration) stale();
            const next = { generation: globalThis.crypto.randomUUID(), progress: emptyProgress() };
            write(next);
            return next;
        }),
    };
}

export function summarizeProgress(progress) {
    const completed = new Set(progress?.completed || []);
    return {
        completed: completed.size,
        total: allLessonIds.length,
        percent: Math.round(completed.size / allLessonIds.length * 100),
        courses: courses.map(course => ({ ...course, completed: course.lessons.filter(lesson => completed.has(lesson.id)).length, total: course.lessons.length })),
    };
}

// Resumen del progreso de capacitación práctica por rol
export function summarizeRoleProgress(progress, track) {
    const completedSet = new Set(progress?.roleModulesCompleted || []);
    const trackModuleIds = track?.moduleIds || allRoleModuleIds;
    const completedInTrack = trackModuleIds.filter(id => completedSet.has(id)).length;
    const totalInTrack = trackModuleIds.length;
    const percent = totalInTrack > 0 ? Math.round((completedInTrack / totalInTrack) * 100) : 0;

    // Prácticas realizadas (simulaciones)
    const simulations = progress?.roleSimulations || [];
    const passedSimulations = simulations.filter(s => s.score >= 70);
    const trackCaseIds = track?.caseIds || allSimulationIds;
    const completedCasesInTrack = trackCaseIds.filter(cid => simulations.some(s => s.simulationId === cid));

    // Competencias demostradas calculadas desde las preguntas y simulaciones
    const questionsAnswered = progress?.roleQuestionsAnswered || {};
    const totalQuestions = Object.keys(questionsAnswered).length;
    const correctQuestions = Object.values(questionsAnswered).filter(q => q.isCorrect).length;
    const questionAccuracy = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;

    // Puntos de refuerzo recomendados
    const weakModules = [];
    for (const modId of trackModuleIds) {
        if (!completedSet.has(modId)) {
            const mod = ROLE_MODULES.find(m => m.id === modId);
            if (mod) weakModules.push({ id: mod.id, title: mod.title, code: mod.code });
        }
    }

    return {
        modulesCompleted: completedInTrack,
        modulesTotal: totalInTrack,
        modulesPercent: percent,
        simulationsAttempted: simulations.length,
        simulationsPassed: passedSimulations.length,
        casesTotal: trackCaseIds.length,
        casesCompleted: completedCasesInTrack.length,
        questionAccuracy,
        totalQuestionsAnswered: totalQuestions,
        correctQuestions,
        weakModules,
        errorReflectionsCount: (progress?.errorReflections || []).length,
        sharedReflectionsCount: (progress?.sharedErrorReflections || []).length
    };
}

export function learningLink(lessonId) {
    const course = courses.find(item => item.lessons.some(lesson => lesson.id === lessonId));
    return course ? `/admin/academy/cursos?curso=${course.id}&leccion=${lessonId}` : '/admin/academy/cursos';
}
