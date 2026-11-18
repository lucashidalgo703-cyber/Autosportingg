import assert from 'node:assert/strict';
import { canReadStockNegotiation as read, canConfigureStockNegotiation as write, hasPermission, PERMISSIONS as P,
    canAccessCrmPath, crmHomeFor } from '../src/utils/adminPermissions.js';

assert.equal(read(null), false);
assert.equal(read({ role: 'ventas' }), true);
assert.equal(write({ role: 'ventas' }), false);
assert.equal(hasPermission({ role: 'ventas' }, P.FINANZAS_READ), false, 'negotiation must not grant general finance access');
assert.equal(read({ role: 'solo_lectura' }), false);
assert.equal(read({ role: 'solo_lectura', permissions: [P.STOCK_READ, P.STOCK_NEGOTIATION_READ] }), true);
assert.equal(write({ role: 'solo_lectura', permissions: [P.STOCK_READ, P.STOCK_NEGOTIATION_READ, P.STOCK_WRITE] }), false);
assert.equal(read({ role: 'ventas', permissions: [P.STOCK_READ] }), true, 'legacy stock grants permit negotiation consultation only');
assert.equal(read({ role: 'ventas', permissions: [P.STOCK_NEGOTIATION_READ] }), true, 'negotiation is independent from general inventory access');
assert.equal(read({ role: 'ventas', permissions: [P.CLIENTES_READ] }), false, 'an explicit unrelated grant does not invent negotiation access');
assert.equal(read({ role: 'admin', permissions: [P.STOCK_READ] }), true, 'existing restricted administrators can manage this Stock feature');
assert.equal(write({ role: 'admin', permissions: [P.STOCK_READ] }), true);
assert.equal(read({ role: 'admin', permissions: [P.CLIENTES_READ] }), false);
assert.equal(write({ role: 'owner' }), true);
assert.equal(hasPermission({ role: 'ventas' }, P.VENTAS_WRITE), true);
assert.equal(hasPermission({ role: 'ventas' }, P.RESERVAS_WRITE), true);
for (const user of [{ role: 'ventas' }, { role: 'ventas', permissions: Object.values(P) }]) {
    for (const permission of [P.STOCK_READ, P.STOCK_WRITE, P.ASIGNACIONES_WRITE]) assert.equal(hasPermission(user, permission), false);
    assert.equal(write(user), false); assert.equal(crmHomeFor(user), '/admin/mis-ventas');
    for (const route of ['/admin', '/admin/', '/admin?legacy=1', '/admin/ventas', '/admin/ventas/123', '/admin/stock/123', '/admin/legacy', '/admin/analitica']) {
        assert.equal(canAccessCrmPath(user, route), false, route);
    }
    for (const route of ['/admin/mis-ventas', '/admin/stock', '/admin/stock?tab=inventory', '/admin/clientes', '/admin/agenda', '/admin/cotizaciones']) {
        assert.equal(canAccessCrmPath(user, route), true, route);
    }
}
for (const role of ['owner', 'admin']) {
    assert.equal(crmHomeFor({ role }), '/admin');
    assert.equal(canAccessCrmPath({ role }, '/admin'), true);
    assert.equal(canAccessCrmPath({ role }, '/admin/stock/123'), true);
}
console.log('PASS: seller route caps, home, inventory restrictions and negotiation-only grants remain enforced with custom permissions.');
