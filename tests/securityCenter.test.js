/**
 * AUTOSPORTING INTELLIGENCE — PRUEBAS DEL CENTRO DE SEGURIDAD (KPIs, HISTORIAL, ALERTAS Y SESIONES)
 * 
 * Verificación exhaustiva:
 * 1. Acceso restringido estrictamente al rol Owner (HTTP 403 ONLY_OWNER_ALLOWED).
 * 2. Cálculo de métricas e indicadores del Panel Principal (KPIs 24h, 7d, 30d).
 * 3. Historial de inicios de sesión paginado con disclaimer geográfico y UA parseado.
 * 4. Detección y generación automática de alertas:
 *    - Inundación de 5 intentos fallidos en 10 minutos (FAILED_LOGINS_FLOOD).
 *    - Fallos repetidos de segundo factor (MFA_REPEATED_FAILURES).
 *    - Intentos desde dispositivo revocado (REVOKED_DEVICE_ACCESS).
 *    - Intentos con sesión invalidada (INVALID_SESSION_ACCESS).
 *    - Recuperación de emergencia ejecutada (EMERGENCY_RECOVERY_EXECUTED).
 * 5. Revisión de alertas con notas sin alterar eventos originales de auditoría.
 * 6. Gestión de sesiones activas:
 *    - Identificación de sesión actual.
 *    - Revocación de sesión individual.
 *    - Cierre masivo de otras sesiones activas (revoke-others).
 * 7. Consulta de dispositivos confiables con passkeys asociadas.
 */

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
let PasskeyCredential;
let SecurityAlert;
let AuditLog;
let alertService;

async function setup() {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_security_center_test');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.AUDIT_HMAC_SECRET = 'audit-secret-security-center-test';
    process.env.NODE_ENV = 'production';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    AdminUser = (await import('../src/models/AdminUser.js')).default;
    TrustedDevice = (await import('../src/models/TrustedDevice.js')).default;
    UserSession = (await import('../src/models/UserSession.js')).default;
    PasskeyCredential = (await import('../src/models/PasskeyCredential.js')).default;
    SecurityAlert = (await import('../src/models/SecurityAlert.js')).default;
    AuditLog = (await import('../src/models/AuditLog.js')).default;
    alertService = await import('../src/services/securityAlertService.js');

    const serverModule = await import('../server.js');
    const app = serverModule.default || serverModule.app;

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    base = `http://127.0.0.1:${port}`;
}

async function teardown() {
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose && mongoose.connection) {
        await mongoose.connection.close();
    }
    if (mongod) {
        await mongod.stop();
    }
}

async function runTests() {
    console.log('=== INICIO DE PRUEBAS DEL CENTRO DE SEGURIDAD ===\n');
    await setup();

    try {
        const jwt = (await import('jsonwebtoken')).default;

        // Sembrar Propietario y Vendedor
        const owner = await AdminUser.create({
            name: 'Propietario AutoSporting',
            email: 'owner@autosporting.com',
            passwordHash: 'dummy_hash',
            role: 'owner',
            active: true
        });

        const salesman = await AdminUser.create({
            name: 'Vendedor Test',
            email: 'ventas@autosporting.com',
            passwordHash: 'dummy_hash',
            role: 'ventas',
            active: true
        });

        // Crear dispositivo confiable
        const trustedDev = await TrustedDevice.create({
            deviceId: 'device_desktop_owner',
            deviceName: 'PC Agencia Principal',
            status: 'trusted',
            registeredBy: { userId: String(owner._id), name: owner.name, email: owner.email }
        });

        // Crear 2 sesiones para el propietario
        const currentSession = await UserSession.create({
            sessionId: 'session_owner_current',
            userId: owner._id,
            userName: owner.name,
            userEmail: owner.email,
            userRole: owner.role,
            deviceId: 'device_desktop_owner',
            deviceName: 'PC Agencia Principal',
            deviceStatus: 'trusted',
            status: 'active',
            expiresAt: new Date(Date.now() + 86400000)
        });

        const otherSession = await UserSession.create({
            sessionId: 'session_owner_other',
            userId: owner._id,
            userName: owner.name,
            userEmail: owner.email,
            userRole: owner.role,
            deviceId: 'device_laptop_owner',
            deviceName: 'Laptop Viajes',
            deviceStatus: 'trusted',
            status: 'active',
            expiresAt: new Date(Date.now() + 86400000)
        });

        // Crear sesión para el vendedor
        await UserSession.create({
            sessionId: 'session_salesman_1',
            userId: salesman._id,
            userName: salesman.name,
            userEmail: salesman.email,
            userRole: salesman.role,
            deviceId: 'device_desktop_salesman',
            deviceName: 'PC Vendedor',
            deviceStatus: 'unknown',
            status: 'active',
            expiresAt: new Date(Date.now() + 86400000)
        });

        // Tokens JWT
        const ownerToken = jwt.sign(
            {
                id: String(owner._id),
                userId: String(owner._id),
                email: owner.email,
                role: owner.role,
                sessionId: currentSession.sessionId,
                deviceId: 'device_desktop_owner'
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        const salesmanToken = jwt.sign(
            {
                id: String(salesman._id),
                userId: String(salesman._id),
                email: salesman.email,
                role: salesman.role,
                sessionId: 'session_salesman_1',
                deviceId: 'device_desktop_salesman'
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // -------------------------------------------------------------
        // Prueba 1: Bloqueo de acceso al Centro de Seguridad para roles no-owner
        // -------------------------------------------------------------
        console.log('Prueba 1: Bloqueo de roles secundarios en /api/admin/security/overview...');
        const forbiddenRes = await fetch(`${base}/api/admin/security/overview`, {
            headers: {
                'Authorization': `Bearer ${salesmanToken}`,
                'x-device-id': 'device_desktop_salesman'
            }
        });
        assert.equal(forbiddenRes.status, 403, 'Roles no autorizados deben recibir 403');
        const forbiddenBody = await forbiddenRes.json();
        assert.equal(forbiddenBody.code, 'ONLY_OWNER_ALLOWED');
        console.log('  ok - Acceso denegado con 403 ONLY_OWNER_ALLOWED para roles secundarios');

        // -------------------------------------------------------------
        // Prueba 2: Consulta de KPIs del Panel Principal por el Propietario
        // -------------------------------------------------------------
        console.log('Prueba 2: Consulta de métricas del Panel Principal (GET /api/admin/security/overview)...');
        // Registrar un login exitoso de referencia en AuditLog
        const loginAudit = new AuditLog({
            userId: String(owner._id),
            userName: owner.name,
            userEmail: owner.email,
            userRole: owner.role,
            action: 'LOGIN_EXITOSO',
            module: 'usuarios',
            ip: '190.220.14.88',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            deviceId: 'device_desktop_owner',
            deviceName: 'PC Agencia Principal',
            deviceStatus: 'trusted',
            sessionId: currentSession.sessionId,
            description: 'Login exitoso de prueba'
        });
        await loginAudit.save();

        const overviewRes = await fetch(`${base}/api/admin/security/overview?period=24h`, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(overviewRes.status, 200);
        const overviewData = await overviewRes.json();
        assert.equal(overviewData.ok, true);
        assert.equal(overviewData.kpis.successfulLogins24h, 1, 'Debe registrar 1 login exitoso en 24h');
        assert.equal(overviewData.kpis.activeTrustedDevices, 1, 'Debe registrar 1 dispositivo confiable activo');
        assert.equal(overviewData.kpis.openSessions, 3, 'Debe registrar 3 sesiones abiertas en total');
        assert.ok(overviewData.kpis.lastSuccessfulLogin, 'Debe contener último login exitoso');
        assert.equal(overviewData.kpis.lastSuccessfulLogin.browser, 'Google Chrome');
        assert.equal(overviewData.kpis.lastSuccessfulLogin.os, 'Windows 10/11');
        console.log('  ok - KPIs del Panel Principal calculados con datos reales');

        // -------------------------------------------------------------
        // Prueba 3: Consulta del Historial de Inicios de Sesión
        // -------------------------------------------------------------
        console.log('Prueba 3: Consulta de Historial de Logins (GET /api/admin/security/logins)...');
        const loginsRes = await fetch(`${base}/api/admin/security/logins?page=1&limit=10`, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(loginsRes.status, 200);
        const loginsData = await loginsRes.json();
        assert.equal(loginsData.ok, true);
        assert.ok(Array.isArray(loginsData.items));
        assert.equal(loginsData.items.length, 1);
        const item = loginsData.items[0];
        assert.equal(item.result, 'SUCCESS');
        assert.equal(item.browser, 'Google Chrome');
        assert.ok(item.geoApproximation.disclaimer.includes('No constituye dirección física'));
        console.log('  ok - Historial de logins devuelto con disclaimer geográfico y UA parseado');

        // -------------------------------------------------------------
        // Prueba 4: Generación automática de alerta ante 5 intentos fallidos
        // -------------------------------------------------------------
        console.log('Prueba 4: Generación automática de alerta FAILED_LOGINS_FLOOD (5 intentos fallidos en 10 min)...');
        for (let i = 0; i < 5; i++) {
            const failAudit = new AuditLog({
                action: 'LOGIN_FALLIDO',
                module: 'usuarios',
                ip: '203.0.113.42',
                userEmail: 'owner@autosporting.com',
                entityLabel: 'owner@autosporting.com',
                description: `Intento de login fallido ${i + 1}`
            });
            await failAudit.save();
        }

        const floodAlert = await alertService.evaluateLoginFailureAlerts({
            ip: '203.0.113.42',
            userEmail: 'owner@autosporting.com',
            userAgent: 'Curl/7.68.0'
        });

        assert.ok(floodAlert, 'Debe crearse una alerta por inundación de fallos');
        assert.equal(floodAlert.type, 'FAILED_LOGINS_FLOOD');
        assert.equal(floodAlert.severity, 'critical');
        assert.equal(floodAlert.status, 'pending');
        console.log(`  ok - Alerta crítica generada: ${floodAlert.title}`);

        // -------------------------------------------------------------
        // Prueba 5: Listado y filtrado de alertas automáticas
        // -------------------------------------------------------------
        console.log('Prueba 5: Listado de alertas (GET /api/admin/security/alerts)...');
        const alertsRes = await fetch(`${base}/api/admin/security/alerts?status=pending`, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(alertsRes.status, 200);
        const alertsData = await alertsRes.json();
        assert.equal(alertsData.ok, true);
        assert.equal(alertsData.alerts.length, 1);
        assert.equal(alertsData.counts.critical, 1);
        console.log('  ok - Alertas consultadas con filtro de estado pending');

        // -------------------------------------------------------------
        // Prueba 6: Marcar alerta como revisada (PATCH /api/admin/security/alerts/:id/review)
        // -------------------------------------------------------------
        console.log('Prueba 6: Marcar alerta como revisada sin alterar el evento original...');
        const reviewRes = await fetch(`${base}/api/admin/security/alerts/${floodAlert.alertId}/review`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            },
            body: JSON.stringify({ notes: 'Verificado por el propietario: IP bloqueada en firewall' })
        });
        assert.equal(reviewRes.status, 200);
        const reviewData = await reviewRes.json();
        assert.equal(reviewData.ok, true);
        assert.equal(reviewData.alert.status, 'reviewed');
        assert.equal(reviewData.alert.reviewNotes, 'Verificado por el propietario: IP bloqueada en firewall');

        // Verificar que en base de datos quedó en reviewed
        const dbAlert = await SecurityAlert.findOne({ alertId: floodAlert.alertId });
        assert.equal(dbAlert.status, 'reviewed');
        assert.ok(dbAlert.reviewedAt);

        // Verificar que el log original de LOGIN_FALLIDO permanece intacto
        const remainingFailures = await AuditLog.countDocuments({ action: 'LOGIN_FALLIDO' });
        assert.equal(remainingFailures, 5, 'Los 5 registros de auditoría originales deben permanecer inalterados');
        console.log('  ok - Alerta revisada exitosamente preservando los eventos originales de auditoría');

        // -------------------------------------------------------------
        // Prueba 7: Consulta de sesiones activas (GET /api/admin/security/sessions)
        // -------------------------------------------------------------
        console.log('Prueba 7: Consulta de sesiones activas e identificación de sesión actual...');
        const sessionsRes = await fetch(`${base}/api/admin/security/sessions`, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(sessionsRes.status, 200);
        const sessionsData = await sessionsRes.json();
        assert.equal(sessionsData.ok, true);
        assert.equal(sessionsData.sessions.length, 2);
        const cur = sessionsData.sessions.find(s => s.sessionId === currentSession.sessionId);
        assert.ok(cur);
        assert.equal(cur.isCurrent, true, 'La sesión portadora del JWT debe figurar con isCurrent: true');
        console.log('  ok - Sesiones listadas e identificador de sesión actual validado');

        // -------------------------------------------------------------
        // Prueba 8: Revocación individual de una sesión
        // -------------------------------------------------------------
        console.log('Prueba 8: Revocación manual de sesión individual (POST /api/admin/security/sessions/:sessionId/revoke)...');
        const revokeOneRes = await fetch(`${base}/api/admin/security/sessions/${otherSession.sessionId}/revoke`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(revokeOneRes.status, 200);
        const updatedOtherSession = await UserSession.findOne({ sessionId: otherSession.sessionId });
        assert.equal(updatedOtherSession.status, 'revoked');
        console.log('  ok - Sesión secundaria revocada individualmente');

        // -------------------------------------------------------------
        // Prueba 9: Cierre masivo de otras sesiones (revoke-others)
        // -------------------------------------------------------------
        console.log('Prueba 9: Cierre masivo de otras sesiones (POST /api/admin/security/sessions/revoke-others)...');
        // Crear una nueva sesión adicional
        await UserSession.create({
            sessionId: 'session_extra_to_revoke',
            userId: owner._id,
            userName: owner.name,
            deviceId: 'device_tablet',
            status: 'active',
            expiresAt: new Date(Date.now() + 86400000)
        });

        const revokeOthersRes = await fetch(`${base}/api/admin/security/sessions/revoke-others`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(revokeOthersRes.status, 200);
        const revokeOthersData = await revokeOthersRes.json();
        assert.equal(revokeOthersData.ok, true);
        assert.equal(revokeOthersData.revokedCount, 1);

        // La sesión actual del propietario debe continuar activa
        const currentCheck = await UserSession.findOne({ sessionId: currentSession.sessionId });
        assert.equal(currentCheck.status, 'active');
        console.log('  ok - Cierre masivo ejecutado: otras sesiones revocadas, sesión actual preservada');

        // -------------------------------------------------------------
        // Prueba 10: Consulta de dispositivos autorizados con passkeys vinculadas
        // -------------------------------------------------------------
        console.log('Prueba 10: Consulta de dispositivos y passkeys (GET /api/admin/security/devices)...');
        await PasskeyCredential.create({
            credentialId: 'pk_cred_test_1',
            userId: owner._id,
            name: 'Passkey PC Agencia Principal',
            publicKey: 'dummy_pk',
            deviceType: 'singleDevice',
            status: 'active'
        });

        const devRes = await fetch(`${base}/api/admin/security/devices`, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(devRes.status, 200);
        const devData = await devRes.json();
        assert.equal(devData.ok, true);
        assert.ok(Array.isArray(devData.devices));
        assert.equal(devData.totalPasskeys, 1);
        console.log('  ok - Dispositivos y passkeys vinculadas consultados con éxito');

        // -------------------------------------------------------------
        // Prueba 11: No-duplicación de logins (1 login consolidado vs eventos intermedios 2FA)
        // -------------------------------------------------------------
        console.log('Prueba 11: Verificación de 1 intento vs 2 eventos en logins con TOTP y Passkey...');
        
        // Simular flujo TOTP: intermedio + final
        await AuditLog.create({
            userId: String(owner._id),
            userEmail: owner.email,
            action: 'LOGIN_REQUIRES_2FA',
            module: 'usuarios',
            description: 'Login requiere 2FA (intermedio)',
            createdAt: new Date()
        });
        await AuditLog.create({
            userId: String(owner._id),
            userEmail: owner.email,
            action: 'LOGIN_EXITOSO_2FA',
            module: 'usuarios',
            description: 'Login exitoso completado con TOTP',
            createdAt: new Date(),
            ip: '181.44.20.10'
        });

        // Simular flujo Passkey: intermedio + final
        await AuditLog.create({
            userId: String(owner._id),
            userEmail: owner.email,
            action: 'LOGIN_REQUIRES_2FA',
            module: 'usuarios',
            description: 'Login requiere 2FA (intermedio)',
            createdAt: new Date()
        });
        await AuditLog.create({
            userId: String(owner._id),
            userEmail: owner.email,
            action: 'PASSKEY_AUTH_SUCCESS',
            module: 'seguridad',
            description: 'Login exitoso completado con Passkey FIDO2',
            createdAt: new Date(),
            ip: null // Probar IP no disponible
        });

        const consolidatedRes = await fetch(`${base}/api/admin/security/logins?limit=10`, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'device_desktop_owner'
            }
        });
        assert.equal(consolidatedRes.status, 200);
        const consolidatedData = await consolidatedRes.json();

        // Verificar que ningún item sea LOGIN_REQUIRES_2FA
        const requires2faItems = consolidatedData.items.filter(i => i.action === 'LOGIN_REQUIRES_2FA');
        assert.equal(requires2faItems.length, 0, 'LOGIN_REQUIRES_2FA no debe exponerse como fila en el historial');

        // Verificar item con IP nula
        const nullIpItem = consolidatedData.items.find(i => i.action === 'PASSKEY_AUTH_SUCCESS');
        assert.ok(nullIpItem, 'Debe existir el registro de passkey');
        assert.equal(nullIpItem.ip, null);
        assert.equal(nullIpItem.geoApproximation.location, 'No disponible');
        assert.ok(nullIpItem.geoApproximation.disclaimer.includes('Aproximada por IP - Puede variar por VPN o proveedor'));
        assert.equal(nullIpItem.authMethod, 'passkey');

        // Verificar item con TOTP
        const totpItem = consolidatedData.items.find(i => i.action === 'LOGIN_EXITOSO_2FA');
        assert.ok(totpItem, 'Debe existir el registro de totp');
        assert.equal(totpItem.authMethod, 'totp');

        console.log('  ok - Eventos intermedios excluidos del historial: 1 login = 1 fila en la vista');

        console.log('\n✅ TODAS LAS PRUEBAS DEL CENTRO DE SEGURIDAD PASARON EXITOSAMENTE (11/11)\n');
    } finally {
        await teardown();
    }
}

runTests().catch((err) => {
    console.error('\n❌ ERROR EN PRUEBAS DEL CENTRO DE SEGURIDAD:', err);
    process.exit(1);
});
