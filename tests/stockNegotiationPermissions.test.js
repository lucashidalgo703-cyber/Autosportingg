import assert from 'node:assert/strict';
import { canReadStockNegotiation as read, canConfigureStockNegotiation as write, hasPermission, PERMISSIONS as P } from '../src/utils/adminPermissions.js';

assert.equal(read(null), false);
assert.equal(read({ role: 'ventas' }), true);
assert.equal(write({ role: 'ventas' }), false);
assert.equal(hasPermission({ role: 'ventas' }, P.FINANZAS_READ), false, 'negotiation must not grant general finance access');
assert.equal(read({ role: 'solo_lectura' }), false);
assert.equal(read({ role: 'solo_lectura', permissions: [P.STOCK_READ, P.STOCK_NEGOTIATION_READ] }), true);
assert.equal(write({ role: 'solo_lectura', permissions: [P.STOCK_READ, P.STOCK_NEGOTIATION_READ, P.STOCK_WRITE] }), false);
assert.equal(read({ role: 'ventas', permissions: [P.STOCK_READ] }), false, 'explicit restrictions remain effective');
assert.equal(read({ role: 'ventas', permissions: [P.STOCK_NEGOTIATION_READ] }), false, 'Stock access is also required');
assert.equal(read({ role: 'admin', permissions: [P.STOCK_READ] }), true, 'existing restricted administrators can manage this Stock feature');
assert.equal(write({ role: 'admin', permissions: [P.STOCK_READ] }), true);
assert.equal(read({ role: 'admin', permissions: [P.CLIENTES_READ] }), false);
assert.equal(write({ role: 'owner' }), true);
assert.equal(hasPermission({ role: 'ventas' }, P.VENTAS_WRITE), true);
assert.equal(hasPermission({ role: 'ventas' }, P.RESERVAS_WRITE), true);
console.log('PASS: negotiation access is separate from finance and never grants sellers configuration rights.');
