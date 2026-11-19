import assert from 'node:assert/strict';
import { ROLES, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, canReadCapitalHistory, canWriteCapitalHistory,
    hasPermission, canAccessCrmPath, roleAccessSummary } from '../src/utils/adminPermissions.js';

const section = '/admin/capital-mensual';
for (const role of Object.values(ROLES)) {
    for (const permissions of [[], Object.values(PERMISSIONS)]) {
        const user = { id: '000000000000000000000001', role, permissions };
        const allowed = role === ROLES.OWNER;
        assert.equal(canReadCapitalHistory(user), allowed, role);
        assert.equal(canWriteCapitalHistory(user), allowed, role);
        assert.equal(hasPermission(user, PERMISSIONS.CAPITAL_HISTORY_READ), allowed, role);
        assert.equal(hasPermission(user, PERMISSIONS.CAPITAL_HISTORY_WRITE), allowed, role);
        for (const path of [section, section + '/', section + '?from=2026-01', '/ADMIN/CAPITAL-MENSUAL', '/admin/capital-mensual/detalle']) {
            assert.equal(canAccessCrmPath(user, path), allowed, role + ': ' + path);
        }
        assert.equal(roleAccessSummary(user).some(entry => entry.label === 'Capital mensual'), allowed, role);
    }
}
for (const permission of [PERMISSIONS.CAPITAL_HISTORY_READ, PERMISSIONS.CAPITAL_HISTORY_WRITE]) {
    assert.ok(DEFAULT_ROLE_PERMISSIONS[ROLES.OWNER].includes(permission));
    assert.ok(!DEFAULT_ROLE_PERMISSIONS[ROLES.ADMIN].includes(permission));
}
assert.equal(canReadCapitalHistory(null), false);
assert.equal(canWriteCapitalHistory({ role: 'legacy', permissions: Object.values(PERMISSIONS) }), false);
console.log('PASS: monthly agency capital is owner-only in permission checks, navigation and role details, including custom broad grants.');
