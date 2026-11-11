import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commercialDate, inspectionInput, deduplicateVehiclePeople } from '../src/utils/vehicleCommercial.js';

test('peritaje conserva sin evaluar, falso y cero sin fabricar evaluaciones', () => {
    assert.deepEqual(inspectionInput({ mechanic: { status: 'sin_evaluar' }, verifiedKm: null, singleOwner: false, tiresPercent: 0, keyCount: 0 }), { mechanic: { status: 'sin_evaluar' }, verifiedKm: null, singleOwner: false, tiresPercent: 0, keyCount: 0 });
    assert.deepEqual(inspectionInput({ generalNotes: '  Revisar documentación  ' }), { generalNotes: 'Revisar documentación' });
});
test('peritaje rechaza porcentajes, cantidades, booleanos y campos inventados', () => {
    for (const input of [{ tiresPercent: 101 }, { tiresPercent: 'NaN' }, { keyCount: 1.5 }, { keyCount: -1 }, { keyCount: true }, { verifiedKm: 'false' }, { mechanic: { status: 'aprobado' } }, { mechanic: { score: 100 } }, { updatedBy: 'Otro' }, {}]) assert.throws(() => inspectionInput(input));
});
test('las fechas calendario no retroceden un día en Argentina y rechazan días inexistentes', () => {
    assert.equal(commercialDate('2026-11-10', 'dueDate').toISOString(), '2026-11-10T00:00:00.000Z');
    assert.equal(commercialDate('2026-11-10T00:00:00.000Z', 'dueDate').toISOString(), '2026-11-10T00:00:00.000Z');
    for (const value of ['2026-02-30', '2026-11-10T99:00Z', 123, null]) assert.throws(() => commercialDate(value, 'dueDate'));
});
test('personas se unen por teléfono o DNI exactos, incluido un puente, nunca solo por nombre', () => {
    const people = deduplicateVehiclePeople([
        { clientId: 'c1', fullName: 'Mismo nombre', phone: '+54 9 11 1234 5678', source: 'client' },
        { leadId: 'l2', fullName: 'Mismo nombre', dniCuit: '30-12345678-1', source: 'lead' },
        { fullName: 'Otro nombre', phone: '11 1234 5678', dniCuit: '30123456781', source: 'contact' },
        { clientId: 'c3', fullName: 'Mismo nombre', phone: '11 9999 9999', source: 'client' },
        { fullName: 'Mismo nombre', source: 'contact' }
    ]);
    assert.equal(people.length, 2);
    assert.deepEqual(new Set(people[0].sources), new Set(['client', 'lead', 'contact']));
});
