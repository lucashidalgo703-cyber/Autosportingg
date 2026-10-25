import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, normalizeProgress, createLocalProgressRepository, summarizeProgress, learningLink } from '../src/lib/academy/progress.js';

function setup() {
    const values = new Map(); let queue = Promise.resolve();
    const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
    const locks = { request: (_key, action) => { const task = queue.then(action); queue = task.catch(() => {}); return task; } };
    const repo = id => createLocalProgressRepository(storage, id, locks);
    return { values, storage, locks, repo };
}
const complete = id => p => ({ ...p, completed: [...p.completed, id] });

test('Concurrencia: dos pestañas conservan ambas lecciones e historiales', async () => {
    const { repo } = setup(); const a = repo('a'), tab = repo('a'), b = repo('b');
    await Promise.all([a.update(complete('fundamentos-1'), 'initial'), tab.update(complete('fundamentos-2'), 'initial')]);
    assert.deepEqual(a.load().completed, ['fundamentos-1', 'fundamentos-2']);
    assert.deepEqual(tab.load(), a.load()); assert.deepEqual(b.load(), emptyProgress());
    const attempt = { courseId: 'fundamentos', level: 'Todos', score: 80, total: 5, at: '2026-10-22T12:00:00Z' };
    await Promise.all([a.update(p => ({ ...p, attempts: [...p.attempts, attempt] }), 'initial'), tab.update(p => ({ ...p, attempts: [...p.attempts, attempt] }), 'initial')]);
    assert.equal(a.load().attempts.length, 2);
});

test('Reset serializado invalida escrituras pendientes y no afecta otro usuario', async () => {
    const { repo } = setup(); const a = repo('a'), tab = repo('a'), b = repo('b');
    await a.update(complete('fundamentos-1'), 'initial');
    await b.update(complete('liquidez-1'), 'initial');
    const results = await Promise.allSettled([a.reset('initial'), tab.update(complete('fundamentos-2'), 'initial')]);
    assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
    assert.deepEqual(a.load().completed, []); assert.deepEqual(b.load().completed, ['liquidez-1']);
    const generation = a.snapshot().generation;
    assert.notEqual(generation, 'initial');
    await tab.update(complete('fundamentos-3'), generation);
    assert.deepEqual(a.load().completed, ['fundamentos-3']);
    await assert.rejects(a.reset('initial'), /restablecido/);
});

test('Migración local conserva v1; corrupción requiere reset explícito y se informan fallos', async () => {
    const { storage, locks, repo } = setup();
    const a = repo('a'); storage.setItem(a.key, JSON.stringify({ ...emptyProgress(), completed: ['fundamentos-1'] }));
    assert.deepEqual(a.load().completed, ['fundamentos-1']);
    await a.update(complete('fundamentos-2'), 'initial');
    assert.equal(JSON.parse(storage.getItem(a.key)).schema, 2);
    storage.setItem(a.key, '{'); assert.throws(() => a.load());
    await assert.rejects(a.update(complete('fundamentos-3'), null));
    await a.reset(null); assert.deepEqual(a.load(), emptyProgress());
    assert.throws(() => createLocalProgressRepository(storage, 'a'), /temporal/);
    const failing = createLocalProgressRepository({ getItem: () => null, setItem: () => { throw new Error('Sin espacio'); } }, 'a', locks);
    await assert.rejects(failing.update(complete('fundamentos-1'), 'initial'), /Sin espacio/);
});

test('Normaliza historial y enlaces sin campos ajenos al aprendizaje', () => {
    assert.deepEqual(normalizeProgress({ version: 99 }), emptyProgress());
    const attempt = { courseId: 'fundamentos', level: 'Todos', score: 80, total: 5, at: '2026-10-22T12:00:00Z', secret: 'descartar' };
    const p = normalizeProgress({ version: 1, completed: ['fundamentos-1', 'fundamentos-1', 'inexistente'], attempts: Array(150).fill(attempt) });
    assert.equal(p.attempts.length, 100); assert.equal(p.attempts[0].secret, undefined);
    assert.equal(summarizeProgress(p).percent, 4);
    assert.equal(learningLink('capital-2'), '/admin/academy/cursos?curso=capital&leccion=capital-2');
});
