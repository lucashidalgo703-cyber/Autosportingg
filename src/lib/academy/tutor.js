import { courses } from './curriculum.js';
import { learningLink } from './progress.js';

export const tutorPrompts = [
    { id: 'explicar', title: 'Explicame el concepto' },
    { id: 'ejemplo', title: 'Mostrame un ejemplo numérico' },
    { id: 'practicar', title: 'Dame un ejercicio resuelto' },
    { id: 'glosario', title: 'Repasemos el glosario' },
];

// Adaptador educativo determinista. Un futuro proveedor podrá implementar este
// contrato sin cambiar la UI; su conexión requiere autorización posterior.
export const structuredTutor = {
    kind: 'structured',
    name: 'Guía de contenidos · sin IA conectada',
    respond({ courseId, lessonId, promptId }) {
        const course = courses.find(item => item.id === courseId);
        const lesson = course?.lessons.find(item => item.id === lessonId);
        if (!lesson || !tutorPrompts.some(item => item.id === promptId)) throw new Error('Elegí un curso, una lección y una pregunta disponibles.');
        const replies = {
            explicar: [lesson.body, lesson.reading.title, ...lesson.reading.paragraphs].join('\n\n'),
            ejemplo: `Ejemplo ficticio: ${lesson.example}`,
            practicar: `${lesson.exercise.question}\n\nResolución: ${lesson.exercise.explanation}`,
            glosario: Object.entries(course.glossary).map(([term, definition]) => `${term}: ${definition}`).join('\n\n'),
        };
        return { text: replies[promptId], source: `${course.title} · ${lesson.title}`, href: learningLink(lesson.id), kind: 'structured' };
    },
};
