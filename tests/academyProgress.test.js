import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, normalizeProgress, createLocalProgressRepository, summarizeProgress, learningLink } from '../src/lib/academy/progress.js';

test('Progreso local por usuario, recarga, aislamiento y borrado selectivo', () => {
    const values = new Map();
    const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
    const a = createLocalProgressRepository(storage, 'alumno-a');
    const b = createLocalProgressRepository(storage, 'alumno-b');
    a.save({ ...emptyProgress(), completed: ['fundamentos-1'] });
    assert.equal(a.load().completed.length, 1); assert.equal(b.load().completed.length, 0);
    b.save({ ...emptyProgress(), completed: ['liquidez-1'] });
    a.clear(); assert.equal(a.load().completed.length, 0); assert.equal(b.load().completed.length, 1);
});
test('Normaliza entradas obsoletas o corruptas y limita historial', () => {
    assert.deepEqual(normalizeProgress({ version: 99 }), emptyProgress());
    const attempt = { courseId: 'fundamentos', level: 'Todos', score: 80, total: 5, at: '2026-10-22T12:00:00Z', secret: 'descartar' };
    const progress = normalizeProgress({ version: 1, completed: ['fundamentos-1', 'fundamentos-1', 'incorrecto'], lastLesson: 'incorrecto', attempts: Array(150).fill(attempt) });
    assert.deepEqual(progress.completed, ['fundamentos-1']); assert.equal(progress.attempts.length, 100);
    assert.equal(progress.attempts[0].secret, undefined); assert.equal(progress.lastLesson, null);
    assert.equal(summarizeProgress(progress).percent, 4);
    assert.equal(learningLink('capital-2'), '/admin/academy/cursos?curso=capital&leccion=capital-2');
    assert.equal(learningLink('incorrecto'), '/admin/academy/cursos');
    assert.throws(() => createLocalProgressRepository({ getItem: () => '{' }, 'a').load());
    assert.throws(() => createLocalProgressRepository({ setItem: () => { throw new Error('Sin espacio'); } }, 'a').save(emptyProgress()));
});
