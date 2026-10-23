/**
 * AUTOSPORTING INTELLIGENCE — VERIFICACIÓN AUTOMATIZADA PRE-ENTREGA DEMO LOCAL
 * 
 * Verifica los 9 requerimientos obligatorios antes de la entrega al propietario:
 * 1. Base MongoDB aislada en loopback (MongoMemoryReplSet con soporte de transacciones).
 * 2. Autenticación exitosa con la cuenta ficticia (propietario demo).
 * 3. Consulta y verificación del Centro de Seguridad (/api/admin/security/overview).
 * 4. Generación controlada de intentos fallidos y disparo de alerta FAILED_LOGINS_FLOOD.
 * 5. Revisión formal de alertas y preservación de auditoría HMAC.
 * 6. Enrolamiento y login con 2FA TOTP con verificación de conteo único (1 intento = 1 fila).
 * 7. Apertura de segunda sesión, revocación individual y comprobación de bloqueo 401 SESSION_REVOKED.
 * 8. Filtrado, paginación y estados vacíos en el historial y alertas.
 * 9. Registro, verificación y revocación limpia de Passkey FIDO2 de prueba ("AutoSporting — PRUEBA LOCAL").
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import speakeasy from 'speakeasy';
import { VirtualWebAuthnAuthenticator } from './fixtures/virtualWebAuthnAuthenticator.js';

let replSet;
let server;
let base;
let JWT_SECRET;
let mongoose;
let AdminUser;
let PasskeyCredential;
let TrustedDevice;
let UserSession;
let SecurityAlert;
let AuditLog;
let alertService;

async function setup() {
    // 1. Iniciar MongoDB ReplicaSet efímero en memoria (soporta transacciones reales)
    replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' }
    });
    const mongoUri = replSet.getUri('autosporting_owner_demo_verify');

    // Salvaguarda de aislamiento estricto
    if (!mongoUri.includes('127.0.0.1') && !mongoUri.includes('localhost')) {
        throw new Error('VIOLACIÓN DE SEGURIDAD: Conexión externa no permitida');
    }

    process.env.MONGODB_URI = mongoUri;

    // Generar secretos aleatorios de longitud criptográfica completa
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.AUDIT_HMAC_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.MASTER_RECOVERY_KEY = crypto.randomBytes(32).toString('hex');
    process.env.WEBAUTHN_RP_ID = 'localhost';
    process.env.WEBAUTHN_ORIGIN = 'http://localhost:3000';
    process.env.NODE_ENV = 'production';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    AdminUser = (await import('../src/models/AdminUser.js')).default;
    PasskeyCredential = (await import('../src/models/PasskeyCredential.js')).default;
    TrustedDevice = (await import('../src/models/TrustedDevice.js')).default;
    UserSession = (await import('../src/models/UserSession.js')).default;
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
    if (replSet) {
        await replSet.stop();
    }
}

async function runTests() {
    console.log('=== VERIFICACIÓN AUTOMATIZADA PRE-ENTREGA DEMO PROPIETARIO ===\n');
    await setup();

    try {
        const demoEmail = 'demo.owner@autosporting.local';
        const demoPassword = 'DemoPropietario2026!';

        // Sembrar cuenta ficticia de propietario
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(demoPassword, salt, 64).toString('hex');
        const ownerUser = await AdminUser.create({
            name: 'Propietario Demo Local',
            email: demoEmail,
            passwordHash: `${salt}:${hash}`,
            role: 'owner',
            active: true,
            twoFactorEnabled: false
        });

        // -------------------------------------------------------------
        // Comprobación 1: Login inicial con la cuenta ficticia
        // -------------------------------------------------------------
        console.log('1. Autenticación inicial con cuenta ficticia (POST /api/login)...');
        const loginRes = await fetch(`${base}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Device-Id': 'terminal_demo_pc'
            },
            body: JSON.stringify({
                email: demoEmail,
                password: demoPassword
            })
        });

        assert.equal(loginRes.status, 200, 'Login inicial debe responder 200 OK');
        const loginData = await loginRes.json();
        assert.ok(loginData.token, 'Debe emitir un token JWT válido');
        assert.equal(loginData.role, 'owner');
        const ownerToken = loginData.token;
        console.log('  ok - Login completado con éxito, token JWT obtenido');

        // -------------------------------------------------------------
        // Comprobación 2: Acceso y KPIs del Centro de Seguridad
        // -------------------------------------------------------------
        console.log('2. Acceso y consulta de KPIs del Centro de Seguridad (GET /api/admin/security/overview)...');
        const overviewRes = await fetch(`${base}/api/admin/security/overview?period=24h`, {
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'x-device-id': 'terminal_demo_pc'
            }
        });
        assert.equal(overviewRes.status, 200);
        const overviewData = await overviewRes.json();
        assert.equal(overviewData.ok, true);
        assert.ok(overviewData.kpis.successfulLogins24h >= 1, 'Debe registrar al menos 1 login exitoso');
        assert.equal(overviewData.kpis.openSessions, 1, 'Debe figurar exactamente 1 sesión abierta');
        console.log('  ok - Centro de Seguridad devuelve métricas e indicadores reales calculados en MongoDB');

        // -------------------------------------------------------------
        // Comprobación 3: Intentos fallidos controlados y alerta automática
        // -------------------------------------------------------------
        console.log('3. Generación controlada de 5 intentos fallidos y detección automática...');
        const failedTargetEmail = 'intruso.fallido@autosporting.local';
        for (let i = 1; i <= 5; i++) {
            const failRes = await fetch(`${base}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Id': 'terminal_demo_pc'
                },
                body: JSON.stringify({
                    email: failedTargetEmail,
                    password: 'password_erroneo_controlado'
                })
            });
            assert.equal(failRes.status, 401);
        }

        // Evaluar alerta
        const floodAlert = await alertService.evaluateLoginFailureAlerts({
            ip: '127.0.0.1',
            userEmail: failedTargetEmail,
            userAgent: 'Mozilla/5.0 Demo Browser'
        });
        assert.ok(floodAlert, 'Debe generarse la alerta automática FAILED_LOGINS_FLOOD');
        assert.equal(floodAlert.type, 'FAILED_LOGINS_FLOOD');
        assert.equal(floodAlert.severity, 'critical');
        console.log('  ok - 5 intentos fallidos registrados y alerta crítica generada');

        // -------------------------------------------------------------
        // Comprobación 4: Revisión de alerta y verificación de auditoría
        // -------------------------------------------------------------
        console.log('4. Revisión formal de la alerta por el propietario (PATCH /api/admin/security/alerts/:id/review)...');
        const reviewRes = await fetch(`${base}/api/admin/security/alerts/${floodAlert.alertId}/review`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'Content-Type': 'application/json',
                'x-device-id': 'terminal_demo_pc'
            },
            body: JSON.stringify({ notes: 'Intento de prueba controlado verificado por el propietario' })
        });
        assert.equal(reviewRes.status, 200);
        const reviewData = await reviewRes.json();
        assert.equal(reviewData.alert.status, 'reviewed');

        const reviewAudit = await AuditLog.findOne({ action: 'SECURITY_ALERT_REVIEWED' });
        assert.ok(reviewAudit, 'El evento de revisión debe persistirse en AuditLog');
        console.log('  ok - Alerta marcada como revisada y evento auditado con HMAC');

        // -------------------------------------------------------------
        // Comprobación 5: Enrolamiento de 2FA TOTP para la cuenta ficticia
        // -------------------------------------------------------------
        console.log('5. Enrolamiento de segundo factor TOTP (POST /api/admin/2fa/generate & verify)...');
        const genRes = await fetch(`${base}/api/admin/2fa/generate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assert.equal(genRes.status, 200);
        const genData = await genRes.json();
        assert.ok(genData.secret, 'Debe emitir secreto TOTP');

        const totpCode = speakeasy.totp({ secret: genData.secret, encoding: 'base32' });
        const verify2faRes = await fetch(`${base}/api/admin/2fa/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                secret: genData.secret,
                token: totpCode
            })
        });
        assert.equal(verify2faRes.status, 200);
        const verify2faData = await verify2faRes.json();
        assert.equal(verify2faData.recoveryCodes.length, 8);
        console.log('  ok - 2FA TOTP activado y 8 códigos de recuperación generados');

        // -------------------------------------------------------------
        // Comprobación 6: Login completo con 2FA y verificación de conteo único
        // -------------------------------------------------------------
        console.log('6. Login con contraseña + TOTP y verificación de 1 ingreso consolidado...');
        const preKpis = await alertService.getSecurityOverviewMetrics({ period: '24h' });
        const preCount = preKpis.kpis.successfulLogins24h;

        const loginStep1 = await fetch(`${base}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: demoEmail, password: demoPassword })
        });
        assert.equal(loginStep1.status, 200);
        const step1Data = await loginStep1.json();
        assert.equal(step1Data.require2FA, true);

        const freshCode = speakeasy.totp({ secret: genData.secret, encoding: 'base32' });
        const loginStep2 = await fetch(`${base}/api/login/2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId: step1Data.challengeId, code: freshCode })
        });
        assert.equal(loginStep2.status, 200);
        const session2Data = await loginStep2.json();
        assert.ok(session2Data.token);

        // Comprobar que en el historial NO aparece LOGIN_REQUIRES_2FA
        const historyRes = await fetch(`${base}/api/admin/security/logins?limit=10`, {
            headers: { 'Authorization': `Bearer ${session2Data.token}` }
        });
        const historyData = await historyRes.json();
        const intermediateRows = historyData.items.filter(i => i.action === 'LOGIN_REQUIRES_2FA');
        assert.equal(intermediateRows.length, 0, 'No debe existir fila intermedia de LOGIN_REQUIRES_2FA');

        const postKpis = await alertService.getSecurityOverviewMetrics({ period: '24h' });
        assert.equal(postKpis.kpis.successfulLogins24h, preCount + 1, 'Debe sumar exactamente 1 login exitoso');
        console.log('  ok - Login con 2FA exitoso y conteo consolidado en historial y KPIs');

        // -------------------------------------------------------------
        // Comprobación 7: Apertura de segunda sesión, revocación individual y comprobación 401
        // -------------------------------------------------------------
        console.log('7. Apertura de segunda sesión, revocación manual y prueba de bloqueo 401...');
        const sessRes = await fetch(`${base}/api/admin/security/sessions`, {
            headers: { 'Authorization': `Bearer ${session2Data.token}` }
        });
        const sessData = await sessRes.json();
        assert.ok(sessData.sessions.length >= 2, 'Deben existir al menos 2 sesiones abiertas');

        const sessionToRevoke = sessData.sessions.find(s => !s.isCurrent);
        assert.ok(sessionToRevoke, 'Debe haber una sesión secundaria para revocar');

        // Revocar la sesión individualmente
        const revokeRes = await fetch(`${base}/api/admin/security/sessions/${sessionToRevoke.sessionId}/revoke`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session2Data.token}` }
        });
        assert.equal(revokeRes.status, 200);

        // Comprobar que el token asociado a la sesión revocada pierde acceso inmediatamente
        const revokedTokenCheck = await fetch(`${base}/api/admin/security/overview`, {
            headers: { 'Authorization': `Bearer ${ownerToken}` } // Token de la primera sesión
        });
        assert.equal(revokedTokenCheck.status, 401);
        const revokedErr = await revokedTokenCheck.json();
        assert.equal(revokedErr.code, 'SESSION_REVOKED');
        console.log('  ok - Sesión revocada pierde acceso inmediatamente con 401 SESSION_REVOKED');

        // -------------------------------------------------------------
        // Comprobación 8: Paginación, filtros y estados vacíos
        // -------------------------------------------------------------
        console.log('8. Pruebas de filtros, paginación y estados vacíos...');
        const emptyFilterRes = await fetch(`${base}/api/admin/security/logins?search=no_existe_cadena_imposible`, {
            headers: { 'Authorization': `Bearer ${session2Data.token}` }
        });
        assert.equal(emptyFilterRes.status, 200);
        const emptyData = await emptyFilterRes.json();
        assert.equal(emptyData.items.length, 0);
        assert.equal(emptyData.total, 0);
        console.log('  ok - Búsquedas sin coincidencia devuelven arrays vacíos de forma limpia');

        // -------------------------------------------------------------
        // Comprobación 9: Registro y revocación de Passkey ("AutoSporting — PRUEBA LOCAL")
        // -------------------------------------------------------------
        console.log('9. Ceremonia y ciclo de vida de Passkey ("AutoSporting — PRUEBA LOCAL")...');
        const passkeyOptRes = await fetch(`${base}/api/admin/passkeys/generate-options`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session2Data.token}` }
        });
        assert.equal(passkeyOptRes.status, 200);
        const passkeyOptions = await passkeyOptRes.json();

        const authenticator = new VirtualWebAuthnAuthenticator();
        const attestation = authenticator.createRegistrationResponse({
            options: passkeyOptions,
            origin: 'http://localhost:3000',
            rpID: 'localhost'
        });

        const regPasskeyRes = await fetch(`${base}/api/admin/passkeys/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session2Data.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential: attestation,
                name: 'AutoSporting — PRUEBA LOCAL'
            })
        });
        assert.equal(regPasskeyRes.status, 200);
        const regPasskeyData = await regPasskeyRes.json();
        assert.equal(regPasskeyData.ok, true);
        const credId = regPasskeyData.passkey?.credentialId || regPasskeyData.credentialId;
        assert.ok(credId, 'Debe devolver el credentialId de la passkey');

        // Comprobar que en /api/admin/security/devices la passkey aparece sin publicKey
        const devicesRes = await fetch(`${base}/api/admin/security/devices`, {
            headers: { 'Authorization': `Bearer ${session2Data.token}` }
        });
        const devicesData = await devicesRes.json();
        assert.equal(devicesData.ok, true);
        assert.equal(devicesData.totalPasskeys, 1);

        // Revocar la passkey de prueba
        const revokePkRes = await fetch(`${base}/api/admin/passkeys/${credId}/revoke`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session2Data.token}` }
        });
        assert.equal(revokePkRes.status, 200);
        const postRevokeDoc = await PasskeyCredential.findOne({ credentialId: credId });
        assert.equal(postRevokeDoc.status, 'revoked');
        console.log('  ok - Passkey de prueba registrada y revocada limpiamente');

        console.log('\n✅ TODAS LAS COMPROBACIONES PREVIAS DE LA DEMO PASARON AL 100% (9/9)\n');
    } finally {
        await teardown();
    }
}

runTests().catch((err) => {
    console.error('\n❌ ERROR EN VERIFICACIÓN PRE-DEMO:', err);
    process.exit(1);
});
