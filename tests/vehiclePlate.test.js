import assert from 'node:assert/strict';
import { isMissingVehiclePlate, normalizeVehiclePlate } from '../src/utils/vehiclePlate.js';
import { canCompleteStockPlate, canReadVehicleInvoices, canWriteVehicleInvoices, hasPermission,
    PERMISSIONS as P, ROLES, canAccessCrmPath, roleAccessSummary } from '../src/utils/adminPermissions.js';

for (const value of [undefined, null, '', '  ', 'S/D', 'S/P', 'sin dominio', 'Sin patente', 'No especificado', '---']) {
    assert.equal(isMissingVehiclePlate(value), true, `missing ${value}`);
}
for (const value of ['ABC123', 'AA123BB', '8AFHR42EXJ1234567', 'ESPECIAL0123', 'ＡＢＣ１２３', 'ع١٢٣']) {
    assert.equal(isMissingVehiclePlate(value), false, `preserve ${value}`);
}
for (const [raw, normalized] of [[' abc 123 ', 'ABC123'], ['aa-123-bb', 'AA123BB'], ['A123BCD', 'A123BCD'], ['123ABC', '123ABC'], ['C123456', 'C123456']]) {
    assert.equal(normalizeVehiclePlate(raw), normalized);
}
for (const value of ['', null, 123, {}, 'ABC', '123456', '<ABC123>', '8AFHR42EXJ1234567', 'ABC123\nDEF456', 'A'.repeat(50)]) assert.equal(normalizeVehiclePlate(value), null);

for (const role of Object.values(ROLES)) {
    const invoiceRole = [ROLES.OWNER, ROLES.GESTORIA_CONTABILIDAD].includes(role);
    for (const user of [{ role }, { role, permissions: Object.values(P) }]) {
        assert.equal(canReadVehicleInvoices(user), invoiceRole, `${role} invoice read`);
        assert.equal(canWriteVehicleInvoices(user), invoiceRole, `${role} invoice write`);
        assert.equal(hasPermission(user, P.FACTURACION_READ), invoiceRole);
        assert.equal(hasPermission(user, P.FACTURACION_WRITE), invoiceRole);
        assert.equal(canAccessCrmPath(user, '/admin/facturacion'), invoiceRole);
        assert.equal(canAccessCrmPath(user, '/admin/facturacion/registro'), invoiceRole);
        assert.equal(canAccessCrmPath(user, '/admin/facturacion/%2e%2e/ventas'), false);
    }
    assert.equal(roleAccessSummary({ role }).some(value => value.label === 'Facturación / ARCA'), invoiceRole);
    assert.equal(canCompleteStockPlate({ role }), [ROLES.OWNER, ROLES.VENTAS, ROLES.GESTORIA_CONTABILIDAD].includes(role));
}
assert.equal(canReadVehicleInvoices({ role: ROLES.GESTORIA_CONTABILIDAD, permissions: [P.CLIENTES_READ] }), false);
assert.equal(canWriteVehicleInvoices({ role: ROLES.GESTORIA_CONTABILIDAD, permissions: [P.FACTURACION_READ] }), false);
assert.equal(canCompleteStockPlate({ role: ROLES.VENTAS, permissions: [P.CLIENTES_READ] }), false);
assert.equal(canCompleteStockPlate(null), false);
console.log('PASS: plate normalization preserves existing identifiers, and invoice/plate permissions remain scoped with broad custom grants.');
