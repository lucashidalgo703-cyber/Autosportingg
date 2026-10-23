/**
 * AUTOSPORTING INTELLIGENCE — PRUEBA DE CICLO DE VIDA COMPLETO DE RECUPERACIÓN DE EMERGENCIA
 * 
 * Verificación end-to-end sin mocks:
 * 1. Ejecución del script/servicio de recuperación CLI para el propietario con clave maestra.
 * 2. Inmediata invalidación de todos los JWTs y sesiones previas (TOKEN_REVOKED / PASSWORD_RESET_REQUIRED).
 * 3. Uso de la contraseña temporal para autenticar el primer factor y requerimiento forzado de reseteo.
 * 4. Cambio de contraseña por una nueva elegida por el propietario (POST /api/auth/reset-password), liberando forcePasswordReset.
 * 5. Re-enrolamiento del segundo factor TOTP (nuevo secreto, escaneo QR y validación del primer token de 6 dígitos).
 * 6. Autorización de nueva terminal como dispositivo confiable (PC Agencia) mediante MFA.
 * 7. Re-registro de nueva passkey WebAuthn FIDO2 en hardware.
 * 8. Inicio de sesión completo con las nuevas credenciales (contraseña + TOTP/Passkey) y acceso validado al Centro de Seguridad.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import speakeasy from 'speakeasy';
import { VirtualWebAuthnAuthenticator } from './fixtures/virtualWebAuthnAuthenticator.js';

let mongod;
let server;
let base;
let JWT_SECRET;
let MASTER_RECOVERY_KEY;
let mongoose;
let AdminUser;
let PasskeyCredential;
let TrustedDevice;
let UserSession;
let AuditLog;
let recoveryService;

async function setup() {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_recovery_lifecycle_test');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    MASTER_RECOVERY_KEY = 'master-disaster-recovery-key-offline-2026';
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.MASTER_RECOVERY_KEY = MASTER_RECOVERY_KEY;
    process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.AUDIT_HMAC_SECRET = 'audit-secret-recovery-lifecycle-key';
    process.env.NODE_ENV = 'production';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    AdminUser = (await import('../src/models/AdminUser.js')).default;
    PasskeyCredential = (await import('../src/models/PasskeyCredential.js')).default;
    TrustedDevice = (await import('../src/models/TrustedDevice.js')).default;
    UserSession = (await import('../src/models/UserSession.js')).default;
    AuditLog = (await import('../src/models/AuditLog.js')).default;
    recoveryService = await import('../src/services/emergencyRecoveryService.js');

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
    console.log('=== INICIO DE PRUEBA DE CICLO DE VIDA COMPLETO DE RECUPERACIÓN ===\n');
    await setup();

    try {
        const jwt = (await import('jsonwebtoken')).default;

        // -------------------------------------------------------------
        // FASE 0: Sembrar estado inicial del Propietario antes del desastre
        // -------------------------------------------------------------
        console.log('Fase 0: Sembrando estado previo (Propietario activo con 2FA, Passkey y Dispositivo)...');
        const initialSalt = crypto.randomBytes(16).toString('hex');
        const initialHash = crypto.scryptSync('PasswordInicial123!', initialSalt, 64).toString('hex');

        const owner = await AdminUser.create({
            name: 'Tomas Propietario',
            email: 'owner@autosporting.com',
            passwordHash: `${initialSalt}:${initialHash}`,
            role: 'owner',
            active: true,
            twoFactorEnabled: true,
            twoFactorSecret: 'DUMMY_ENCRYPTED_SECRET',
            recoveryCodes: ['code_hash_1', 'code_hash_2'],
            forcePasswordReset: false,
            tokenVersion: 1
        });

        const oldSession = await UserSession.create({
            sessionId: 'session_pre_disaster_001',
            userId: owner._id,
            userName: owner.name,
            userEmail: owner.email,
            deviceId: 'device_old_agencia',
            status: 'active',
            expiresAt: new Date(Date.now() + 86400000)
        });

        const oldDevice = await TrustedDevice.create({
            deviceId: 'device_old_agencia',
            deviceName: 'PC Agencia Original',
            status: 'trusted',
            lastSeenAt: new Date(),
            registeredBy: {
                userId: String(owner._id),
                name: owner.name
            }
        });

        const oldPasskey = await PasskeyCredential.create({
            credentialId: 'pk_old_agencia_001',
            userId: owner._id,
            name: 'Windows Hello Antigua',
            publicKey: 'dummy_pub_key',
            status: 'active'
        });

        // Emitir JWT previo (simulando token en manos de un atacante o sesión antigua)
        const oldToken = jwt.sign(
            {
                id: String(owner._id),
                userId: String(owner._id),
                email: owner.email,
                role: 'owner',
                sessionId: oldSession.sessionId,
                tokenVersion: 1
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Comprobar que el token previo funciona antes del desastre
        const preCheckRes = await fetch(`${base}/api/admin/security/overview`, {
            headers: { 'Authorization': `Bearer ${oldToken}` }
        });
        assert.equal(preCheckRes.status, 200, 'El token previo debe ser válido inicialmente');
        console.log('  ok - Estado previo verificado: Propietario operativo con sesión activa');

        // -------------------------------------------------------------
        // FASE 1: Ejecución del procedimiento administrativo de emergencia
        // -------------------------------------------------------------
        console.log('Fase 1: Ejecutando procedimiento de recuperación fuera de banda (CLI)...');
        const recoveryResult = await recoveryService.executeEmergencyRecovery({
            email: owner.email,
            reason: 'Pérdida total de hardware y autenticador 2FA',
            masterRecoveryKey: MASTER_RECOVERY_KEY,
            temporaryPassword: 'TempDisasterPass2026!'
        });

        assert.equal(recoveryResult.ok, true);
        assert.ok(recoveryResult.temporaryPassword, 'Debe generarse una contraseña temporal');
        const tempPassword = recoveryResult.temporaryPassword;
        console.log(`  ok - Recuperación ejecutada: Contraseña temporal emitida (${tempPassword.substring(0, 4)}****)`);

        // -------------------------------------------------------------
        // FASE 2: Inmediata invalidación de tokens y sesiones previas
        // -------------------------------------------------------------
        console.log('Fase 2: Verificando invalidación total de sesiones y tokens previos...');
        const postRecoveryTokenCheck = await fetch(`${base}/api/admin/security/overview`, {
            headers: { 'Authorization': `Bearer ${oldToken}` }
        });

        // Debe ser rechazado (401 TOKEN_REVOKED o 403 PASSWORD_RESET_REQUIRED)
        assert.ok([401, 403].includes(postRecoveryTokenCheck.status), 'El token previo debe ser inmediatamente revocado');

        // Comprobar estado en MongoDB
        const updatedSession = await UserSession.findOne({ sessionId: oldSession.sessionId });
        assert.equal(updatedSession.status, 'revoked', 'La sesión anterior debe figurar como revocada');

        const updatedDevice = await TrustedDevice.findOne({ deviceId: oldDevice.deviceId });
        assert.equal(updatedDevice.status, 'revoked', 'El dispositivo anterior debe figurar como revocado');

        const updatedPasskey = await PasskeyCredential.findOne({ credentialId: oldPasskey.credentialId });
        assert.equal(updatedPasskey.status, 'revoked', 'La passkey anterior debe figurar como revocada');

        console.log('  ok - Invalidation confirmada: JWT caducado, sesiones, passkeys y terminales revocadas');

        // -------------------------------------------------------------
        // FASE 3: Autenticación del primer factor con contraseña temporal
        // -------------------------------------------------------------
        console.log('Fase 3: Autenticación de primer factor con contraseña temporal...');
        const tempLoginRes = await fetch(`${base}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: owner.email,
                password: tempPassword
            })
        });

        assert.equal(tempLoginRes.status, 200);
        const tempLoginData = await tempLoginRes.json();
        assert.ok(tempLoginData.token, 'Debe devolver token de acceso temporal');
        assert.equal(tempLoginData.forcePasswordReset, true, 'Debe exigir forzosamente reseteo de contraseña');
        const tempAccessToken = tempLoginData.token;
        console.log('  ok - Primer factor aceptado, flag forcePasswordReset: true recibido');

        // -------------------------------------------------------------
        // FASE 4: Requerimiento estricto y cambio forzado de contraseña
        // -------------------------------------------------------------
        console.log('Fase 4: Verificando bloqueo de navegación y reseteo forzado de contraseña...');
        // Cualquier intento de acceder a recursos regulares debe rebotar con 403 PASSWORD_RESET_REQUIRED
        const blockedResourceRes = await fetch(`${base}/api/admin/security/overview`, {
            headers: { 'Authorization': `Bearer ${tempAccessToken}` }
        });
        assert.equal(blockedResourceRes.status, 403);
        const blockedBody = await blockedResourceRes.json();
        assert.equal(blockedBody.code, 'PASSWORD_RESET_REQUIRED');

        // Ejecutar cambio de contraseña
        const newStrongPassword = 'TomasSeguridadTotal#2026!';
        const resetPasswordRes = await fetch(`${base}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tempAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword: newStrongPassword })
        });

        assert.equal(resetPasswordRes.status, 200);
        const resetPasswordData = await resetPasswordRes.json();
        assert.equal(resetPasswordData.ok, true);

        // Verificar en base de datos que forcePasswordReset se liberó
        const userAfterReset = await AdminUser.findById(owner._id);
        assert.equal(userAfterReset.forcePasswordReset, false, 'forcePasswordReset debe ser false');
        console.log('  ok - Contraseña actualizada exitosamente y bloqueo liberado');

        // -------------------------------------------------------------
        // FASE 5: Re-enrolamiento del segundo factor TOTP
        // -------------------------------------------------------------
        console.log('Fase 5: Re-enrolamiento del segundo factor TOTP (nuevo secreto y validación)...');
        // 5.1 Generar secreto
        const gen2faRes = await fetch(`${base}/api/admin/2fa/generate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${tempAccessToken}` }
        });
        assert.equal(gen2faRes.status, 200);
        const gen2faData = await gen2faRes.json();
        assert.ok(gen2faData.secret, 'Debe devolver nuevo secreto base32');
        assert.ok(gen2faData.qrCode, 'Debe devolver URL de código QR');

        // 5.2 Calcular token TOTP válido
        const freshTotpToken = speakeasy.totp({
            secret: gen2faData.secret,
            encoding: 'base32'
        });

        // 5.3 Verificar y activar 2FA
        const verify2faRes = await fetch(`${base}/api/admin/2fa/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tempAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                secret: gen2faData.secret,
                token: freshTotpToken
            })
        });
        assert.equal(verify2faRes.status, 200);
        const verify2faData = await verify2faRes.json();
        assert.ok(Array.isArray(verify2faData.recoveryCodes), 'Debe devolver 8 nuevos códigos de recuperación');
        assert.equal(verify2faData.recoveryCodes.length, 8);

        const userWith2fa = await AdminUser.findById(owner._id);
        assert.equal(userWith2fa.twoFactorEnabled, true, '2FA debe figurar como activo');
        console.log('  ok - Segundo factor TOTP reactivado y 8 códigos de recuperación generados');

        // -------------------------------------------------------------
        // FASE 6: Autorización de nueva terminal como dispositivo confiable
        // -------------------------------------------------------------
        console.log('Fase 6: Autorización de nueva PC de la agencia como dispositivo confiable...');
        // Registrar terminal detectada en estado inicial 'unknown'
        await TrustedDevice.create({
            deviceId: 'pc_agencia_nueva_2026',
            deviceName: 'Terminal Detectada',
            status: 'unknown',
            publicKey: 'dummy_ecdsa_p256_key',
            registeredBy: {
                userId: String(owner._id),
                name: owner.name
            }
        });

        const newDeviceTotp = speakeasy.totp({
            secret: gen2faData.secret,
            encoding: 'base32'
        });

        const authDevRes = await fetch(`${base}/api/admin/devices/authorize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tempAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId: 'pc_agencia_nueva_2026',
                targetName: 'PC Agencia',
                verificationCode: newDeviceTotp
            })
        });
        assert.equal(authDevRes.status, 200);
        const authDevData = await authDevRes.json();
        assert.equal(authDevData.ok, true);
        assert.equal(authDevData.device.status, 'trusted');
        console.log('  ok - Nueva terminal PC Agencia autorizada como confiable');

        // -------------------------------------------------------------
        // FASE 7: Re-registro de nueva passkey WebAuthn en hardware
        // -------------------------------------------------------------
        console.log('Fase 7: Re-enrolamiento de Passkey WebAuthn (FIDO2)...');
        const optRes = await fetch(`${base}/api/admin/passkeys/generate-options`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tempAccessToken}`,
                'Content-Type': 'application/json'
            }
        });
        assert.equal(optRes.status, 200);
        const options = await optRes.json();

        const authenticator = new VirtualWebAuthnAuthenticator();
        const attestationResponse = authenticator.createRegistrationResponse({
            options,
            origin: 'http://localhost:3000',
            rpID: 'localhost'
        });

        const verifyPasskeyRes = await fetch(`${base}/api/admin/passkeys/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tempAccessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                credential: attestationResponse,
                name: 'Windows Hello PC Agencia Nueva'
            })
        });
        assert.equal(verifyPasskeyRes.status, 200);
        const verifyPasskeyData = await verifyPasskeyRes.json();
        assert.equal(verifyPasskeyData.ok, true);
        console.log('  ok - Nueva passkey registrada exitosamente en hardware');

        // -------------------------------------------------------------
        // FASE 8: Inicio de sesión regular con las nuevas credenciales y acceso al Centro de Seguridad
        // -------------------------------------------------------------
        console.log('Fase 8: Inicio de sesión formal con nueva contraseña + TOTP y acceso al Centro de Seguridad...');
        // 8.1 Paso 1: Login con la nueva contraseña
        const finalLoginRes = await fetch(`${base}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: owner.email,
                password: newStrongPassword
            })
        });
        assert.equal(finalLoginRes.status, 200);
        const finalLoginData = await finalLoginRes.json();
        assert.equal(finalLoginData.require2FA, true, 'Debe requerir 2FA');
        assert.equal(finalLoginData.passkeysAvailable, true, 'Debe reportar passkey disponible');

        // 8.2 Paso 2: Validación del segundo factor con TOTP
        const finalTotp = speakeasy.totp({
            secret: gen2faData.secret,
            encoding: 'base32'
        });

        const verifyFinalLoginRes = await fetch(`${base}/api/login/2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                challengeId: finalLoginData.challengeId,
                code: finalTotp,
                deviceId: 'pc_agencia_nueva_2026'
            })
        });
        assert.equal(verifyFinalLoginRes.status, 200);
        const finalAuthData = await verifyFinalLoginRes.json();
        assert.ok(finalAuthData.token, 'Debe emitir JWT final autenticado');
        const finalToken = finalAuthData.token;

        // 8.3 Consulta completa al Centro de Seguridad
        const secCenterOverviewRes = await fetch(`${base}/api/admin/security/overview`, {
            headers: {
                'Authorization': `Bearer ${finalToken}`,
                'x-device-id': 'pc_agencia_nueva_2026'
            }
        });
        assert.equal(secCenterOverviewRes.status, 200);
        const secOverview = await secCenterOverviewRes.json();
        assert.equal(secOverview.ok, true);
        assert.equal(secOverview.kpis.activeTrustedDevices, 1);
        assert.ok(secOverview.kpis.successfulLogins24h >= 1);

        // 8.4 Historial de accesos
        const secCenterLoginsRes = await fetch(`${base}/api/admin/security/logins?limit=10`, {
            headers: {
                'Authorization': `Bearer ${finalToken}`,
                'x-device-id': 'pc_agencia_nueva_2026'
            }
        });
        assert.equal(secCenterLoginsRes.status, 200);
        const secLogins = await secCenterLoginsRes.json();
        assert.ok(secLogins.items.length > 0);

        // Comprobar que en auditoría se preserva el evento de recuperación
        const recoveryAudit = await AuditLog.findOne({ action: 'OWNER_MFA_EMERGENCY_RESET' });
        assert.ok(recoveryAudit, 'El evento criptográfico OWNER_MFA_EMERGENCY_RESET debe estar intacto en la auditoría HMAC');

        console.log('  ok - Acceso completo concedido al Centro de Seguridad con credenciales renovadas');

        console.log('\n✅ CICLO DE VIDA COMPLETO DE RECUPERACIÓN VALIDADO EXITOSAMENTE (8/8 FASES)\n');
    } finally {
        await teardown();
    }
}

runTests().catch((err) => {
    console.error('\n❌ ERROR EN CICLO DE VIDA DE RECUPERACIÓN:', err);
    process.exit(1);
});
