import { courses } from './curriculum.js';

export const allLessonIds = courses.flatMap(course => course.lessons.map(lesson => lesson.id));
export const emptyProgress = () => ({ version: 1, completed: [], attempts: [], decisions: [], lastLesson: null });

export function normalizeProgress(value) {
    if (!value || value.version !== 1) return emptyProgress();
    const validCourses = new Set(courses.map(c => c.id));
    const completed = [...new Set((Array.isArray(value.completed) ? value.completed : []).filter(id => allLessonIds.includes(id)))];
    const attempts = (Array.isArray(value.attempts) ? value.attempts : []).filter(a => a && validCourses.has(a.courseId) && ['Todos', 'Inicial', 'Intermedio', 'Avanzado'].includes(a.level) && Number.isFinite(a.score) && a.score >= 0 && a.score <= 100 && Number.isInteger(a.total) && a.total > 0 && a.total <= 5 && typeof a.at === 'string' && Number.isFinite(Date.parse(a.at))).slice(-100).map(a => ({ courseId: a.courseId, level: a.level, score: a.score, total: a.total, at: a.at }));
    const decisions = (Array.isArray(value.decisions) ? value.decisions : []).filter(d => d && typeof d.scenarioId === 'string' && d.scenarioId.length < 80 && Number.isInteger(d.option) && d.option >= 0 && d.option <= 2 && typeof d.at === 'string' && Number.isFinite(Date.parse(d.at))).slice(-50).map(d => ({ scenarioId: d.scenarioId, option: d.option, at: d.at }));
    return { version: 1, completed, attempts, decisions, lastLesson: allLessonIds.includes(value.lastLesson) ? value.lastLesson : null };
}

// Contrato sustituible por un repositorio remoto autorizado en una etapa futura.
// Solo contiene avance educativo; nunca guarda token, nombre ni datos comerciales.
export function createLocalProgressRepository(storage, learnerId) {
    const key = `autosporting.academy.v1:${encodeURIComponent(learnerId)}`;
    return {
        load() {
            const raw = storage.getItem(key);
            if (!raw) return emptyProgress();
            try { return normalizeProgress(JSON.parse(raw)); } catch { throw new Error('El progreso local no se pudo leer. Podés restablecerlo desde Mi progreso.'); }
        },
        save(value) { storage.setItem(key, JSON.stringify(normalizeProgress(value))); },
        clear() { storage.removeItem(key); },
    };
}

export function summarizeProgress(progress) {
    const completed = new Set(progress.completed);
    return {
        completed: completed.size,
        total: allLessonIds.length,
        percent: Math.round(completed.size / allLessonIds.length * 100),
        courses: courses.map(course => ({ ...course, completed: course.lessons.filter(lesson => completed.has(lesson.id)).length, total: course.lessons.length })),
    };
}

export function learningLink(lessonId) {
    const course = courses.find(item => item.lessons.some(lesson => lesson.id === lessonId));
    return course ? `/admin/academy/cursos?curso=${course.id}&leccion=${lessonId}` : '/admin/academy/cursos';
}
