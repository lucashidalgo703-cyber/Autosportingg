import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientInsightRange } from '../src/utils/clientInsights.js';

test('hoy y ayer usan el corte de medianoche de Argentina incluso antes de las03UTC', () => {
    const now = new Date('2026-11-11T01:30:00Z');
    const today = clientInsightRange('hoy', now);
    assert.equal(today.from.toISOString(), '2026-11-10T03:00:00.000Z'); assert.equal(today.to.toISOString(), '2026-11-11T03:00:00.000Z');
    assert.equal(today.previousFrom.toISOString(), '2026-11-09T03:00:00.000Z');
    assert.equal(clientInsightRange('ayer', now).from.toISOString(), '2026-11-09T03:00:00.000Z');
});
test('7 y30 incluyen hoy y comparan ventanas anteriores del mismo tamaño', () => {
    for (const days of [7, 30]) {
        const range = clientInsightRange(String(days), new Date('2026-11-10T12:00:00Z'));
        assert.equal(range.to - range.from, days * 86400000); assert.equal(range.previousTo - range.previousFrom, days * 86400000);
        assert.equal(range.previousTo.getTime(), range.from.getTime()); assert.equal(range.toKey, '2026-11-11');
    }
});
test('mes y mes pasado respetan duración real, cambio de año y febrero bisiesto', () => {
    const january = clientInsightRange('mes', new Date('2026-01-10T12:00:00Z'));
    assert.equal(january.previousFromKey, '2025-12-01'); assert.equal(january.toKey, '2026-02-01');
    const february = clientInsightRange('mes_pasado', new Date('2024-03-10T12:00:00Z'));
    assert.equal(february.fromKey, '2024-02-01'); assert.equal(february.toKey, '2024-03-01'); assert.equal(february.to - february.from, 29 * 86400000);
});
test('todos no inventa un período anterior y los filtros desconocidos se rechazan', () => {
    const range = clientInsightRange('todos'); assert.equal(range.from, null); assert.equal(range.previousFrom, null);
    for (const value of ['999', 'todo', ['30'], {}]) assert.throws(() => clientInsightRange(value));
});
