import assert from 'node:assert/strict';
import { BUYER_PROCEDURE_STAGES, buyerProcedureTimeline } from '../src/utils/buyerProcedureTimeline.js';

assert.deepEqual(BUYER_PROCEDURE_STAGES.map(stage => stage.key), ['pendiente', 'documentacion', 'presentado', 'transferido', 'finalizado']);
for (const [status, currentIndex] of [['Pendiente', 0], ['Documentación', 1], ['Presentado', 2], ['Transferido', 3], ['Finalizado', 4]]) {
    const state = buyerProcedureTimeline(status, 'Transferencia Egreso');
    assert.equal(state.currentIndex, currentIndex);
    assert.equal(state.complete, currentIndex === 4);
    assert.equal(state.inProgress, currentIndex < 4);
    assert.equal(state.progress, currentIndex * 25);
}
for (const status of ['Observado', 'Cancelado', 'en_proceso', 'listo', 'entregado', 'Presentado · Pendiente', '', null]) {
    const state = buyerProcedureTimeline(status);
    assert.equal(state.currentIndex, -1, `${status} cannot invent a specific completed stage`);
    assert.equal(state.progress, 0);
    assert.equal(state.complete, false);
    assert.equal(state.inProgress, false);
}
assert.equal(buyerProcedureTimeline('Observado').observed, true);
assert.equal(buyerProcedureTimeline('Cancelado').cancelled, true);
assert.equal(buyerProcedureTimeline('en_proceso').label, 'En proceso');
for (const type of ['Informe Dominio', '08 Blanco', 'Alta Patente', 'Baja Patente', 'Duplicado Título', 'Cédula Azul', 'Otro', '']) {
    const state = buyerProcedureTimeline('Finalizado', type);
    assert.equal(state.stages.some(stage => stage.key === 'transferido'), false, `${type} must not claim a vehicle transfer happened`);
    assert.equal(state.currentIndex, 3);
    assert.equal(state.complete, true);
    assert.equal(state.progress, 100);
}
assert.equal(buyerProcedureTimeline('Transferido', 'Informe Dominio').stages.some(stage => stage.key === 'transferido'), true, 'an explicit recorded transfer status stays visible');
assert.equal(buyerProcedureTimeline('Finalizado', 'Transferencia Ingreso').stages.length, 5);
console.log('PASS: procedure stages respect transfer/report types and exceptional/unknown statuses never imply unsupported progress.');
