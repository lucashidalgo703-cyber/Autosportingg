import assert from 'node:assert/strict';
import test from 'node:test';
import { formSaleDate, formatSaleDate, saleCalendarKey } from '../src/utils/saleCalendarDate.js';

test('el día de venta conserva la fecha calendario antes y después de serializarse en Mongo', () => {
    const entered = '2026-11-10';
    const persisted = new Date(entered).toISOString();
    assert.equal(persisted, '2026-11-10T00:00:00.000Z');
    assert.equal(formSaleDate(persisted), entered);
    assert.equal(saleCalendarKey({ saleDate: persisted }), entered);
    assert.equal(formatSaleDate({ saleDate: entered }), '10/11/2026');
    assert.equal(formatSaleDate({ saleDate: persisted }), '10/11/2026');
});

test('una venta conserva su fecha escrita aunque el ISO tenga otro huso horario', () => {
    const saleDate = '2026-11-10T00:30:00+05:00';
    assert.equal(new Date(saleDate).toISOString().slice(0, 10), '2026-11-09');
    assert.equal(saleCalendarKey({ saleDate }), '2026-11-10');
    assert.equal(formatSaleDate({ saleDate }), '10/11/2026');
});

test('la fecha de creación de respaldo sí representa un instante en Argentina', () => {
    assert.equal(saleCalendarKey({ createdAt: '2026-11-10T02:59:59Z' }), '2026-11-09');
    assert.equal(formatSaleDate({ createdAt: '2026-11-10T02:59:59Z' }), '9/11/2026');
    assert.equal(saleCalendarKey({ createdAt: '2026-11-10T03:00:00Z' }), '2026-11-10');
    assert.equal(saleCalendarKey({ saleDate: '', createdAt: new Date('2026-11-10T02:00:00Z') }), '2026-11-09');
});

test('saleDate tiene prioridad sobre el instante de creación, sin sustituir una fecha inválida', () => {
    const createdAt = '2026-11-10T12:00:00Z';
    assert.equal(saleCalendarKey({ saleDate: '2026-10-01', createdAt }), '2026-10-01');
    assert.equal(saleCalendarKey({ saleDate: '2026-11-31', createdAt }), '');
    assert.equal(formatSaleDate({ saleDate: '2026-11-31', createdAt }), 'Sin fecha');
});

test('rechaza fechas inexistentes, formatos incompletos y horas inválidas sin normalizarlos', () => {
    for (const value of ['2026-02-29', '1900-02-29', '2026-11-31', '2026-13-01', '2026-00-10', '2026-11-00', '0000-01-01', '2026-1-2', '10/11/2026', '2026-11-10basura', '2026-11-10T99:00:00Z', new Date(NaN)]) {
        assert.equal(formSaleDate(value), '', String(value));
        assert.equal(formatSaleDate({ saleDate: value }), 'Sin fecha', String(value));
    }
    assert.equal(formSaleDate('2024-02-29'), '2024-02-29');
    assert.equal(formSaleDate('2000-02-29'), '2000-02-29');
});

test('datos ausentes o creación inválida no producen una fecha inventada', () => {
    for (const sale of [undefined, {}, { createdAt: null }, { createdAt: 'no-es-fecha' }, { createdAt: '2026-02-31T00:00:00Z' }]) {
        assert.equal(saleCalendarKey(sale), '');
        assert.equal(formatSaleDate(sale), 'Sin fecha');
    }
});

test('objetos Date de una fecha de venta usan el calendario UTC persistido', () => {
    const saleDate = new Date('2026-11-10T00:00:00Z');
    assert.equal(formSaleDate(saleDate), '2026-11-10');
    assert.equal(formatSaleDate({ saleDate }), '10/11/2026');
});
