import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSaleBuyer, saleDeliveryKey, formatSaleDeliveryDate, mergeSaleResponse } from '../src/utils/salePresentation.js';
import { saleToForm } from '../src/utils/saleDraftForm.js';

test('el comprador manual sigue visible en una venta activa y nunca se transforma en referencia ficticia', () => {
    const sale = { status: 'confirmada', draftData: { buyerName: 'Persona ficticia', buyerPhone: '0000000', buyerEmail: 'qa@example.invalid', buyerDni: 'QA-001' } };
    const before = JSON.stringify(sale);
    assert.deepEqual(getSaleBuyer(sale), { name: 'Persona ficticia', phone: '0000000', email: 'qa@example.invalid', dni: 'QA-001', clientId: '', leadId: '' });
    assert.equal(JSON.stringify(sale), before);
});
test('DNI/CUIT usa el campo real del cliente y mantiene compatibilidad con referencias anteriores', () => {
    const id = 'a'.repeat(24);
    assert.equal(getSaleBuyer({ clientId: { _id: id, firstName: 'Persona', lastName: 'Ficticia', dniCuit: 'QA-CUIT' } }).dni, 'QA-CUIT');
    assert.equal(getSaleBuyer({ clientId: { _id: id, firstName: 'Persona', lastName: 'Ficticia' } }).name, 'Persona Ficticia');
    assert.equal(getSaleBuyer({ clientId: { _id: id, documentNumber: 'LEGACY' } }).dni, 'LEGACY');
    assert.equal(saleToForm({ clientId: { dniCuit: 'QA-CUIT' } }).buyerDni, 'QA-CUIT');
    assert.equal(getSaleBuyer({ clientId: 'javascript:alert(1)' }).clientId, '');
});
test('la entrega prevista conserva su fecha calendario aunque Mongo la serialice a medianoche UTC', () => {
    assert.equal(formatSaleDeliveryDate('2026-11-10T00:00:00.000Z'), '10/11/2026');
    assert.equal(formatSaleDeliveryDate('2026-11-10'), '10/11/2026');
    assert.equal(formatSaleDeliveryDate('2026-02-30'), 'Sin fecha');
});
test('la entrega efectiva distingue un instante registrado del calendario legacy', () => {
    assert.equal(saleDeliveryKey('2026-11-10T01:00:00.000Z', true), '2026-11-09');
    assert.equal(saleDeliveryKey('2026-11-10T00:00:00.000Z', true), '2026-11-10');
});
test('una respuesta parcial conserva poblados sólo para la misma referencia y respeta cambios o borrados', () => {
    const first = 'a'.repeat(24), second = 'b'.repeat(24), previous = { _id: 'venta', clientId: { _id: first, fullName: 'Persona anterior' }, vehicleId: { _id: first, brand: 'QA' } };
    assert.equal(mergeSaleResponse(previous, { clientId: first }).clientId.fullName, 'Persona anterior');
    assert.equal(mergeSaleResponse(previous, { clientId: second }).clientId, second);
    assert.equal(mergeSaleResponse(previous, { clientId: null }).clientId, null);
    assert.equal(previous.clientId._id, first);
});
