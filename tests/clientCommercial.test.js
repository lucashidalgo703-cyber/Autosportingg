import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clientCalendarKey, clientTodayKey, getClientPipelineStage, getClientPriorities, formatClientNextAction } from '../src/utils/clientCommercial.js';

test('las etapas anteriores siguen visibles mediante equivalencias, sin modificar el documento', () => {
    const record = { pipelineStage: 'propuesta_enviada', notes: 'Conservar' };
    assert.equal(getClientPipelineStage(record), 'negociacion');
    assert.equal(record.pipelineStage, 'propuesta_enviada');
    assert.equal(getClientPipelineStage({ pipelineStage: 'cita_agendada' }), 'visita');
    assert.equal(getClientPipelineStage({ pipelineStage: 'sin_interes' }), 'perdido');
    assert.equal(getClientPipelineStage({}), 'sin_contactar');
    assert.equal(getClientPipelineStage({ pipelineStage: 'etapa_desconocida' }), 'etapa_desconocida');
});
test('primera atención equivale a Sin contactar y hoy incluye vencidos y hoy, no los futuros', () => {
    const today = '2026-11-10';
    assert.deepEqual(getClientPriorities({ pipelineStage: 'nuevo' }, today), { primera: true, hoy: true, sinfecha: false });
    assert.equal(getClientPriorities({ pipelineStage: 'contactado' }, today).sinfecha, true);
    assert.equal(getClientPriorities({ pipelineStage: 'contactado', nextActionDate: '2026-11-09' }, today).hoy, true);
    assert.equal(getClientPriorities({ pipelineStage: 'contactado', nextActionDate: '2026-11-10' }, today).hoy, true);
    assert.equal(getClientPriorities({ pipelineStage: 'contactado', nextActionDate: '2026-11-11' }, today).hoy, false);
});
test('cerrados, perdidos e inactivos no abren prioridades comerciales', () => {
    for (const record of [{ pipelineStage: 'cerrado' }, { pipelineStage: 'sin_interes' }, { status: 'inactivo' }, { status: 'bloqueado' }]) {
        assert.deepEqual(getClientPriorities({ ...record, nextActionDate: '2020-01-01' }, '2026-11-10'), { primera: false, hoy: false, sinfecha: false });
    }
});
test('fecha calendario conserva el día persistido y el corte se calcula en Argentina', () => {
    assert.equal(clientCalendarKey('2026-11-10T00:00:00.000Z'), '2026-11-10');
    assert.equal(formatClientNextAction({ nextActionDate: '2026-11-10T00:00:00.000Z' }), '10/11/2026');
    assert.equal(clientTodayKey(new Date('2026-11-10T01:00:00.000Z')), '2026-11-09');
});
test('una fecha inválida se informa y no aparenta ausencia de fecha ni obligación de hoy', () => {
    for (const value of ['2026-02-30', '2026-11-10T99:00:00Z', 'desconocida', 0, false]) {
        assert.equal(clientCalendarKey(value), '');
        assert.equal(formatClientNextAction({ nextActionDate: value }), 'Fecha a revisar');
        assert.deepEqual(getClientPriorities({ pipelineStage: 'contactado', nextActionDate: value }, '2026-11-10'), { primera: false, hoy: false, sinfecha: false });
    }
});
