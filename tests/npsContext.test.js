import assert from 'node:assert/strict';
import test from 'node:test';
import { NPS_CONTEXTS, npsContextLabel, npsScore, npsPeriodRange, npsCalendarDate } from '../src/utils/nps.js';

test('the five observed NPS contexts are distinct and unknown legacy context is not invented', () => {
    assert.deepEqual(NPS_CONTEXTS.map(item => item.value), ['postventa', 'postvisita', 'postentrega', 'postcotizacion', 'atencion_lead']);
    assert.equal(npsContextLabel('postvisita'), 'Postvisita');
    assert.equal(npsContextLabel(null), 'Contexto no especificado');
});
test('contextual NPS accepts zero and rejects absent or fractional answers', () => {
    assert.equal(npsScore(0), 0); assert.equal(npsScore('10'), 10);
    for (const value of ['', '   ', null, undefined, false, NaN, -1, 11, 7.5]) assert.throws(() => npsScore(value));
});
test('NPS periods use Argentina calendar boundaries including UTC month rollover', () => {
    const now = new Date('2026-11-01T01:00:00Z');
    const today = npsPeriodRange('Hoy', now); assert.equal(today.$gte.toISOString(), '2026-10-31T03:00:00.000Z'); assert.equal(today.$lt.toISOString(), '2026-11-01T03:00:00.000Z');
    const month = npsPeriodRange('Este mes', now); assert.equal(month.$gte.toISOString(), '2026-10-01T03:00:00.000Z'); assert.equal(month.$lt.toISOString(), '2026-11-01T03:00:00.000Z');
    const week = npsPeriodRange('Esta semana', now); assert.equal(week.$gte.toISOString(), '2026-10-26T03:00:00.000Z'); assert.equal(week.$lt.toISOString(), '2026-11-02T03:00:00.000Z');
    assert.deepEqual(npsPeriodRange('Histórico', now), {});
    assert.throws(() => npsPeriodRange('invalid', now));
});
test('manual response calendar dates reject rollover rather than silently changing the date', () => {
    assert.equal(npsCalendarDate('2026-11-10').toISOString(), '2026-11-10T03:00:00.000Z');
    assert.throws(() => npsCalendarDate('2026-02-30'));
});
