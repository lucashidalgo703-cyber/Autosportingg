import test from 'node:test';
import assert from 'node:assert/strict';
import { clientLocation, readClientLocation, safeClientReturnTo, clientDetailHref } from '../src/utils/clientNavigation.js';

test('la ubicación comercial recupera vista, filtros combinados y segunda página', () => {
    const initial = readClientLocation('?vista=tabla&search=QA&assignedTo=abc&gender=mujer&tier=vip&sort=name_desc&pagina=2');
    assert.equal(initial.view, 'tabla'); assert.equal(initial.filters.search, 'QA'); assert.equal(initial.filters.tier, 'vip'); assert.equal(initial.page, 2);
    assert.equal(initial.filters.attention, 'todos');
    const restored = readClientLocation(new URL(clientLocation(initial.filters, initial.view, initial.page), 'https://example.invalid').search);
    assert.deepEqual(restored.filters, initial.filters); assert.equal(restored.page, 2);
    const explicit = { ...initial.filters, attention: 'primera' };
    assert.deepEqual(readClientLocation(new URL(clientLocation(explicit, 'tabla'), 'https://example.invalid').search).filters, explicit);
});
test('mantiene enlaces antiguos de atención y sólo acepta vistas y períodos válidos', () => {
    assert.equal(readClientLocation('?atencion=hoy').filters.attention, 'hoy');
    assert.equal(readClientLocation('?vista=ajena&periodo=2099&pagina=-2').view, 'lista');
    assert.equal(readClientLocation('?vista=ajena&periodo=2099&pagina=-2').period, 'hoy');
    assert.equal(readClientLocation('?vista=ajena&periodo=2099&pagina=-2').page, 1);
});
test('el retorno de una ficha sólo permite el directorio de clientes', () => {
    const expected = '/admin/clientes?vista=seguimientos&search=QA';
    assert.equal(safeClientReturnTo(expected), expected);
    for (const value of ['//example.com', '/admin/clientes/otro', '/admin/clientes?x=1#secreto', '/admin/clientes?x=\\evil', '/admin/clientes?x=\u0000']) assert.equal(safeClientReturnTo(value), '/admin/clientes');
    assert.equal(new URL(clientDetailHref('cliente QA', expected), 'https://example.invalid').searchParams.get('returnTo'), expected);
});
