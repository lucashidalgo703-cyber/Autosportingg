import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, gradeAssessment } from '../src/lib/academy/assessments.js';
import { courses } from '../src/lib/academy/curriculum.js';

test('40 preguntas cubren todos los cursos, formatos y tres niveles', () => {
    assert.equal(questions.length, 40);
    assert.equal(new Set(questions.map(q => q.id)).size, 40);
    for (const course of courses) {
        const items = questions.filter(q => q.courseId === course.id);
        assert.equal(items.length, 5);
        assert.deepEqual(new Set(items.map(q => q.level)), new Set(['Inicial', 'Intermedio', 'Avanzado']));
        for (const item of items) assert.ok(item.explanation);
    }
});
test('Corrección completa, parcial, equivocada e incompleta', () => {
    const correct = Object.fromEntries(questions.map(q => [q.id, q.correct]));
    assert.equal(gradeAssessment(questions, correct).score, 100);
    const wrong = Object.fromEntries(questions.map(q => [q.id, q.type === 'choice' ? (q.correct + 1) % 3 : q.correct + 100]));
    const result = gradeAssessment(questions, wrong);
    assert.equal(result.score, 0); assert.equal(result.review.length, 8);
    const pair = questions.slice(0, 2);
    assert.equal(gradeAssessment(pair, { [pair[0].id]: pair[0].correct, [pair[1].id]: -100 }).score, 50);
    assert.throws(() => gradeAssessment(questions, {}));
    assert.throws(() => gradeAssessment([], {}));
    assert.throws(() => gradeAssessment([questions[0]], { [questions[0].id]: 99 }));
});
