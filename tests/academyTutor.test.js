import test from 'node:test';
import assert from 'node:assert/strict';
import { courses } from '../src/lib/academy/curriculum.js';
import { structuredTutor, tutorPrompts } from '../src/lib/academy/tutor.js';

test('Tutor responde las cuatro preguntas de cada lección con fuente y sin IA', () => {
    assert.equal(structuredTutor.kind, 'structured');
    for (const course of courses) for (const lesson of course.lessons) for (const prompt of tutorPrompts) {
        const reply = structuredTutor.respond({ courseId: course.id, lessonId: lesson.id, promptId: prompt.id });
        assert.equal(reply.kind, 'structured'); assert.ok(reply.text.length > 30);
        assert.ok(reply.source.includes(lesson.title)); assert.ok(reply.href.includes(lesson.id));
        assert.deepEqual(structuredTutor.respond({ courseId: course.id, lessonId: lesson.id, promptId: prompt.id }), reply);
    }
    assert.throws(() => structuredTutor.respond({ courseId: 'fundamentos', lessonId: 'inexistente', promptId: 'explicar' }));
    assert.throws(() => structuredTutor.respond({ courseId: 'fundamentos', lessonId: 'fundamentos-1', promptId: 'inventar' }));
});
