import assert from 'node:assert/strict';
import AdminUser from '../src/models/AdminUser.js';
import { ROLES, PERMISSIONS as P, ROLE_DEFINITIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission,
    isSalesRole, canAccessCrmPath, crmHomeFor, canReadStockNegotiation,
    canConfigureStockNegotiation, roleAccessSummary, roleLabel } from '../src/utils/adminPermissions.js';

const expectedModules = ['Gestoría', 'Clientes', 'Negociación', 'Mis ventas', 'Expedientes',
    'Mis comisiones', 'Oportunidades', 'Calendario', 'Alertas', 'Reportes', 'Mi espacio'];
for (const role of [ROLES.VENTAS, ROLES.GESTORIA_CONTABILIDAD]) {
    const user = { role };
    assert.ok(isSalesRole(user));
    assert.equal(crmHomeFor(user), '/admin/mis-ventas');
    for (const module of expectedModules) assert.ok(roleAccessSummary(user).some(item => item.label === module), `${role} includes ${module}`);
    for (const permission of [P.GESTORIA_READ, P.GESTORIA_WRITE, P.CLIENTES_READ, P.CLIENTES_WRITE,
        P.STOCK_NEGOTIATION_READ, P.VENTAS_READ, P.DOCUMENTACION_READ, P.DOCUMENTACION_WRITE,
        P.COMISIONES_READ, P.OPORTUNIDADES_READ, P.OPORTUNIDADES_WRITE, P.AGENDA_READ, P.AGENDA_WRITE, P.REPORTES_READ]) {
        assert.ok(hasPermission(user, permission), `${role} has ${permission}`);
    }
    for (const permission of [P.CAJA_READ, P.CAJA_WRITE, P.FINANZAS_READ, P.FINANZAS_WRITE,
        P.USUARIOS_WRITE, P.SETTINGS_WRITE, P.APPROVALS_WRITE]) assert.equal(hasPermission(user, permission), false, `${role} must not gain ${permission}`);
    assert.ok(canReadStockNegotiation(user));
    assert.equal(canConfigureStockNegotiation(user), false);
    for (const candidate of [user, { role, permissions: Object.values(P) }]) {
        for (const permission of [P.STOCK_READ, P.STOCK_WRITE, P.ASIGNACIONES_WRITE, P.FINANZAS_READ, P.FINANZAS_WRITE,
            P.CAJA_READ, P.CAJA_WRITE, P.LIQUIDACIONES_READ, P.LIQUIDACIONES_WRITE, P.SETTINGS_READ,
            P.SETTINGS_WRITE, P.USUARIOS_READ, P.USUARIOS_WRITE]) assert.equal(hasPermission(candidate, permission), false);
        for (const path of ['/admin', '/admin/ventas', '/admin/ventas/123', '/admin/legacy', '/admin/analitica', '/admin/stock/123']) {
            assert.equal(canAccessCrmPath(candidate, path), false, `${role} cannot reopen ${path} with custom grants`);
        }
        for (const path of ['/admin/gestoria', '/admin/clientes', '/admin/stock', '/admin/mis-ventas',
            '/admin/expedientes', '/admin/mis-comisiones', '/admin/oportunidades', '/admin/agenda', '/admin/alertas', '/admin/reportes', '/admin/mi-espacio']) {
            assert.equal(canAccessCrmPath(candidate, path), true, `${role} route ${path}`);
        }
    }
    const custom = { role, permissions: [P.CLIENTES_READ] };
    assert.equal(canReadStockNegotiation(custom), false, 'unrelated explicit permissions must not grant negotiation');
    assert.equal(hasPermission(custom, P.GESTORIA_WRITE), false, 'custom permissions remain authoritative');
}

assert.ok(hasPermission({ role: ROLES.VENTAS }, P.STOCK_SUBMIT));
assert.ok(hasPermission({ role: ROLES.VENTAS }, P.CLIENTES_SUBMIT));
assert.equal(hasPermission({ role: ROLES.GESTORIA_CONTABILIDAD }, P.STOCK_SUBMIT), false);
assert.equal(hasPermission({ role: ROLES.GESTORIA_CONTABILIDAD }, P.CLIENTES_SUBMIT), false);
assert.equal(hasPermission({ role: ROLES.VENTAS }, P.APPROVALS_WRITE), false);
assert.equal(hasPermission({ role: ROLES.OWNER }, P.APPROVALS_WRITE), true);

// Every selectable role must be accepted by the persistent user schema and have
// a human-readable description, including the original roles.
assert.deepEqual(new Set(AdminUser.schema.path('role').enumValues), new Set(Object.values(ROLES)));
for (const role of Object.values(ROLES)) {
    assert.ok(DEFAULT_ROLE_PERMISSIONS[role]);
    assert.ok(ROLE_DEFINITIONS[role]?.description);
    assert.equal(roleLabel(role), ROLE_DEFINITIONS[role].label);
    assert.ok(roleAccessSummary({ role }).length > 0);
}
for (const role of [ROLES.OWNER, ROLES.ADMIN]) {
    assert.equal(crmHomeFor({ role }), '/admin');
    assert.equal(canConfigureStockNegotiation({ role }), true);
}
assert.deepEqual(roleAccessSummary(null), []);
console.log('PASS: 2 restricted profiles expose requested modules, retain approval separation and legacy roles, and enforce route/inventory limits with custom permissions.');
