import test from 'node:test';
import assert from 'node:assert/strict';
import { getMobileNavigation, getCrmRoleLabel, isNavigationActive } from '../src/utils/crmNavigation.js';

test('la navegación móvil conserva los cinco destinos observados para dirección', () => {
    assert.deepEqual(getMobileNavigation({ role: 'owner' }).map(item => item.path), ['/admin', '/admin/stock', '/admin/clientes', '/admin/finanzas', '/admin/mi-espacio']);
});

test('un vendedor no recibe el acceso financiero y una sesión ausente no conserva accesos', () => {
    assert.equal(getMobileNavigation({ role: 'ventas' }).some(item => item.path === '/admin/finanzas'), false);
    assert.deepEqual(getMobileNavigation(null), []);
});

test('los permisos explícitos limitan los accesos de lectura sin sustituir la autorización de API', () => {
    assert.deepEqual(getMobileNavigation({ role: 'admin', permissions: ['finanzas.read'] }).map(item => item.path), ['/admin', '/admin/finanzas', '/admin/mi-espacio']);
});

test('las rutas anidadas y reservas activan el área correcta sin aceptar prefijos ajenos', () => {
    assert.equal(isNavigationActive('/admin/stock/vehiculo-demo', '/admin/stock'), true);
    assert.equal(isNavigationActive('/admin/stockholm', '/admin/stock'), false);
    assert.equal(isNavigationActive('/admin/reservas/reserva-demo', '/admin/ventas'), true);
    assert.equal(isNavigationActive('/admin/stock', '/admin'), false);
});

test('el rol visible corresponde a la sesión y no convierte vendedores en administradores', () => {
    assert.equal(getCrmRoleLabel('owner'), 'Propietario');
    assert.equal(getCrmRoleLabel('ventas'), 'Ventas');
    assert.equal(getCrmRoleLabel('solo_lectura'), 'Solo lectura');
    assert.equal(getCrmRoleLabel(null), 'Usuario');
});
