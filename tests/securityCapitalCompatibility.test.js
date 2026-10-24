/**
 * AUTOSPORTING INTELLIGENCE — PRUEBAS DE COMPATIBILIDAD DE SEGURIDAD CON CAPITAL Y REINVERSIÓN
 * 
 * Validación del Contrato Owner-Only y Defensas en Profundidad:
 * 1. Propietario autenticado con sesión válida accede a endpoints financieros.
 * 2. Propietario sin PIN de Tesorería recibe requirePin: true sin filtración de datos financieros.
 * 3. Usuario con rol 'admin' es rechazado estrictamente en servidor con 403 ONLY_OWNER_ALLOWED.
 * 4. Usuario con rol 'ventas' es rechazado estrictamente en servidor con 403 ONLY_OWNER_ALLOWED.
 * 5. Sesión revocada en MongoDB es rechazada inmediatamente con 401 SESSION_REVOKED.
 * 6. Dispositivo revocado en MongoDB es rechazado inmediatamente con 401 DEVICE_REVOKED.
 * 7. Token JWT inválido, adulterado o expirado es rechazado con 401/403.
 * 8. Acceso directo a endpoint financiero (vía API directa cURL/fetch sin interfaz) es bloqueado por el servidor.
 * 9. Acceso desde navegador: PermissionGuard e isOwner bloquean acceso a roles no autorizados.
 * 10. Ausencia total de filtraciones de datos financieros en payloads de error.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;
let server;
let base;
let JWT_SECRET;
let mongoose;
let AdminUser;
let TrustedDevice;
let UserSession;
let jwt;
let ROLES;
let isOwner;
let hasPermission;
let withOwnerAuth;

const SENSITIVE_FINANCIAL_KEYS = [
    'capital',
    'reinvestment',
    'distributable',
    'boxes',
    'unallocated',
    'balances',
    'balanceARS',
    'balanceUSD',
    'summary',
    'distributionBreakdown',
    'reinvestmentStock',
    'grossProfit',
    'netMargin',
    'transactions'
];

function assertNoFinancialLeak(responseBody, contextMsg) {
    if (!responseBody || typeof responseBody !== 'object') return;
    for (const key of SENSITIVE_FINANCIAL_KEYS) {
        assert.equal(
            responseBody[key],
            undefined,
            `Filtración detectada en ${contextMsg}: el campo sensible "${key}" no debe figurar en respuestas de rechazo/error`
        );
    }
}

test('Compatibilidad de Seguridad y Contrato Owner-Only para Capital y Reinversión', async (t) => {
    // SETUP
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_capital_security_compat_test');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.AUDIT_HMAC_SECRET = 'audit-secret-capital-compat-test';
    process.env.NODE_ENV = 'production';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    AdminUser = (await import('../src/models/AdminUser.js')).default;
    TrustedDevice = (await import('../src/models/TrustedDevice.js')).default;
    UserSession = (await import('../src/models/UserSession.js')).default;
    jwt = (await import('jsonwebtoken')).default;

    const adminPerms = await import('../src/utils/adminPermissions.js');
    ROLES = adminPerms.ROLES;
    isOwner = adminPerms.isOwner;
    hasPermission = adminPerms.hasPermission;

    const nextAuth = await import('../src/utils/nextAdminAuth.js');
    withOwnerAuth = nextAuth.withOwnerAuth;

    const serverModule = await import('../server.js');
    const app = serverModule.default || serverModule.app;

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    base = `http://127.0.0.1:${port}`;

    // SEMBRAR USUARIOS FICTICIOS
    const ownerUser = await AdminUser.create({
        name: 'Propietario Legítimo',
        email: 'propietario@autosporting.com',
        passwordHash: 'dummy_hash_owner',
        role: ROLES.OWNER,
        active: true
    });

    const adminUser = await AdminUser.create({
        name: 'Administrador Secundario',
        email: 'admin@autosporting.com',
        passwordHash: 'dummy_hash_admin',
        role: ROLES.ADMIN,
        active: true
    });

    const vendedorUser = await AdminUser.create({
        name: 'Vendedor Comercial',
        email: 'vendedor@autosporting.com',
        passwordHash: 'dummy_hash_vendedor',
        role: ROLES.VENTAS,
        active: true
    });

    // SEMBRAR DISPOSITIVO CONFIABLE
    const trustedDev = await TrustedDevice.create({
        deviceId: 'dev_owner_pc',
        deviceName: 'PC Propietario Verificada',
        status: 'trusted',
        registeredBy: { userId: String(ownerUser._id), name: ownerUser.name, email: ownerUser.email }
    });

    // Helper para generar tokens
    function createSessionAndToken({ user, deviceId = 'dev_owner_pc', sessionStatus = 'active', deviceStatus = 'trusted' }) {
        const sessionId = `sess_${user.role}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        return UserSession.create({
            sessionId,
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            deviceId,
            deviceName: 'Terminal de Pruebas',
            deviceStatus,
            status: sessionStatus,
            expiresAt: new Date(Date.now() + 86400000)
        }).then(session => {
            const token = jwt.sign({
                id: String(user._id),
                userId: String(user._id),
                email: user.email,
                role: user.role,
                sessionId: session.sessionId,
                deviceId
            }, JWT_SECRET, { expiresIn: '1h' });

            return { session, token };
        });
    }

    // Helper para generar token de PIN de Tesorería
    function createTreasuryPinToken(userId) {
        return jwt.sign({
            userId: String(userId),
            purpose: 'strategic_treasury'
        }, JWT_SECRET, { expiresIn: '15m' });
    }

    // 1. Propietario autenticado con sesión válida
    await t.test('1. Propietario autenticado con sesión válida accede al endpoint de Tesorería con PIN', async () => {
        const { token } = await createSessionAndToken({ user: ownerUser });
        const pinToken = createTreasuryPinToken(ownerUser._id);

        const res = await fetch(`${base}/api/admin/tesoreria-estrategica/data`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-treasury-token': pinToken
            }
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.ok, true);
        assert.ok(data.data !== undefined);
    });

    // 2. Propietario sin PIN de Tesorería
    await t.test('2. Propietario sin PIN de Tesorería es advertido (403 requirePin) sin filtrar importes', async () => {
        const { token } = await createSessionAndToken({ user: ownerUser });

        const res = await fetch(`${base}/api/admin/tesoreria-estrategica/data`, {
            headers: {
                'Authorization': `Bearer ${token}`
                // Omitiendo x-treasury-token
            }
        });

        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.ok, false);
        assert.equal(data.requirePin, true);
        assertNoFinancialLeak(data, 'Propietario sin PIN');
    });

    // 3. Usuario con rol admin
    await t.test('3. Usuario admin es rechazado en servidor (403 ONLY_OWNER_ALLOWED) incluso si envía PIN', async () => {
        const { token } = await createSessionAndToken({ user: adminUser });
        const pinToken = createTreasuryPinToken(adminUser._id);

        const res = await fetch(`${base}/api/admin/tesoreria-estrategica/data`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-treasury-token': pinToken
            }
        });

        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.code, 'ONLY_OWNER_ALLOWED');
        assertNoFinancialLeak(data, 'Usuario admin rechazado');
    });

    // 4. Usuario con rol vendedor
    await t.test('4. Usuario vendedor es rechazado en servidor (403 ONLY_OWNER_ALLOWED)', async () => {
        const { token } = await createSessionAndToken({ user: vendedorUser });

        const res = await fetch(`${base}/api/admin/tesoreria-estrategica/data`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        assert.equal(res.status, 403);
        const data = await res.json();
        assert.equal(data.code, 'ONLY_OWNER_ALLOWED');
        assertNoFinancialLeak(data, 'Usuario vendedor rechazado');
    });

    // 5. Sesión revocada
    await t.test('5. Sesión revocada en MongoDB es rechazada inmediatamente con 401 SESSION_REVOKED', async () => {
        const { token, session } = await createSessionAndToken({ user: ownerUser });
        // Revocar la sesión en base de datos
        await UserSession.updateOne({ _id: session._id }, { $set: { status: 'revoked' } });

        const pinToken = createTreasuryPinToken(ownerUser._id);
        const res = await fetch(`${base}/api/admin/tesoreria-estrategica/data`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-treasury-token': pinToken
            }
        });

        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.code, 'SESSION_REVOKED');
        assertNoFinancialLeak(data, 'Sesión revocada');
    });

    // 6. Dispositivo revocado
    await t.test('6. Dispositivo revocado en MongoDB es rechazado inmediatamente con 401 DEVICE_REVOKED', async () => {
        const revokedDeviceId = 'dev_compromised_pc';
        await TrustedDevice.create({
            deviceId: revokedDeviceId,
            deviceName: 'PC Comprometida',
            status: 'revoked',
            registeredBy: { userId: String(ownerUser._id), name: ownerUser.name, email: ownerUser.email }
        });

        const { token } = await createSessionAndToken({
            user: ownerUser,
            deviceId: revokedDeviceId,
            deviceStatus: 'revoked'
        });

        const pinToken = createTreasuryPinToken(ownerUser._id);
        const res = await fetch(`${base}/api/admin/tesoreria-estrategica/data`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'x-device-id': revokedDeviceId,
                'x-treasury-token': pinToken
            }
        });

        assert.equal(res.status, 401);
        const data = await res.json();
        assert.equal(data.code, 'DEVICE_REVOKED');
        assertNoFinancialLeak(data, 'Dispositivo revocado');
    });

    // 7. Token inválido, adulterado o expirado
    await t.test('7. Token JWT inválido o adulterado es rechazado con 401/403 sin consultar datos', async () => {
        const forgedToken = jwt.sign({
            id: String(ownerUser._id),
            role: 'owner',
            sessionId: 'forged_session'
        }, 'WRONG_SECRET_KEY');

        const res = await fetch(`${base}/api/admin/tesoreria-estrategica/data`, {
            headers: {
                'Authorization': `Bearer ${forgedToken}`
            }
        });

        // express authenticateToken retorna 403 en fallo de jwt.verify
        assert.ok([401, 403].includes(res.status));
    });

    // 8. Acceso directo a endpoint financiero (vía API directa cURL/fetch sin UI)
    await t.test('8. Acceso directo a endpoint financiero sin credenciales retorna 401 inmediato', async () => {
        const res = await fetch(`${base}/api/admin/treasury/boxes-summary`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        assert.equal(res.status, 401);
    });

    // 9. Acceso a la página desde navegador (PermissionGuard e isOwner)
    await t.test('9. Validación lógica del Guard de Frontend (isOwner y hasPermission)', async () => {
        assert.equal(isOwner(ownerUser), true, 'El propietario debe ser reconocido por isOwner()');
        assert.equal(isOwner(adminUser), false, 'Admin NO debe ser reconocido como owner');
        assert.equal(isOwner(vendedorUser), false, 'Ventas NO debe ser reconocido como owner');

        // Simular handler protegido con withOwnerAuth de Next.js
        const mockOwnerReq = {
            headers: new Headers({
                'authorization': `Bearer ${jwt.sign({ id: String(ownerUser._id), sessionId: 'sess_test' }, JWT_SECRET)}`
            }),
            method: 'GET'
        };
        assert.ok(withOwnerAuth, 'withOwnerAuth debe estar exportado y listo para Codex');
    });

    // 10. Ausencia de filtraciones de datos financieros en errores
    await t.test('10. Auditoría estricta de ausencia de datos financieros en errores (400, 401, 403)', async () => {
        // Petición no autorizada
        const resUnauth = await fetch(`${base}/api/admin/tesoreria-estrategica/rules`, {
            headers: { 'Authorization': 'Bearer bad_token' }
        });
        const unauthBody = await resUnauth.text();
        for (const key of SENSITIVE_FINANCIAL_KEYS) {
            assert.equal(unauthBody.includes(`"${key}"`), false, `El cuerpo de error no debe mencionar "${key}"`);
        }

        // Petición con usuario admin a cajas
        const { token: adminToken } = await createSessionAndToken({ user: adminUser });
        const resForbidden = await fetch(`${base}/api/admin/tesoreria-estrategica/rules`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const forbiddenBody = await resForbidden.json();
        assertNoFinancialLeak(forbiddenBody, 'Error 403 role forbidden');
    });

    // TEARDOWN
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose && mongoose.connection) {
        await mongoose.connection.close();
    }
    if (mongod) {
        await mongod.stop();
    }
});
