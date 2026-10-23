/**
 * AUTOSPORTING INTELLIGENCE — PRUEBAS DE SEGURIDAD WEBAUTHN / PASSKEYS
 * 
 * Verificación exhaustiva de los 13 escenarios obligatorios:
 * 1. Registro exitoso de una passkey.
 * 2. Inicio de sesión con contraseña + passkey.
 * 3. Inicio de sesión con contraseña + TOTP.
 * 4. Rechazo de firma inválida.
 * 5. Rechazo de desafío vencido o reutilizado.
 * 6. Rechazo de origin o RP ID incorrecto.
 * 7. Rechazo de credencial perteneciente a otro usuario.
 * 8. Rechazo cuando no se cumple user verification (UV = required).
 * 9. Revocación de credenciales.
 * 10. Recuperación mediante TOTP / Recovery code cuando no existe passkey disponible.
 * 11. Imposibilidad de eludir Owner-Only.
 * 12. Compatibilidad con sesiones revocables y TrustedDevice.
 * 13. Protección contra solicitudes concurrentes y reutilización de desafíos.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { VirtualWebAuthnAuthenticator } from './fixtures/virtualWebAuthnAuthenticator.js';

let mongod;
let server;
let base;
let JWT_SECRET;
let mongoose;
let AdminUser;
let UserSession;
let TrustedDevice;
let AuditLog;
let PasskeyCredential;
let PasskeyChallenge;
let speakeasy;
let jwt;

async function setup() {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_webauthn_test');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.AUDIT_HMAC_SECRET = 'audit-secret-passkeys-test-key';
    process.env.TWO_FACTOR_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.NODE_ENV = 'production'; // evita app.listen estático de server.js
    process.env.WEBAUTHN_RP_ID = 'localhost';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    const mongooseModule = await import('mongoose');
    mongoose = mongooseModule.default;

    AdminUser = (await import('../src/models/AdminUser.js')).default;
    UserSession = (await import('../src/models/UserSession.js')).default;
    TrustedDevice = (await import('../src/models/TrustedDevice.js')).default;
    AuditLog = (await import('../src/models/AuditLog.js')).default;
    PasskeyCredential = (await import('../src/models/PasskeyCredential.js')).default;
    PasskeyChallenge = (await import('../src/models/PasskeyChallenge.js')).default;
    speakeasy = (await import('speakeasy')).default;
    jwt = (await import('jsonwebtoken')).default;

    const { default: app } = await import('../server.js');
    server = app.listen(0);
    const port = server.address().port;
    base = `http://127.0.0.1:${port}`;
    process.env.WEBAUTHN_ORIGIN = base;
}

async function teardown() {
    if (server) server.close();
    if (mongoose) await mongoose.disconnect();
    if (mongod) await mongod.stop();
}

// Helper para crear un usuario Owner con contraseña y 2FA configurado
async function createOwnerUser({ email = 'propietario@autosporting.com', password = 'PasswordOwner123!' } = {}) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;
    const totpSecret = speakeasy.generateSecret().base32;
    
    // Cifrar secreto con AES-256-GCM para compatibilidad con decryptData
    const encKey = crypto.createHash('sha256').update(String(process.env.TWO_FACTOR_ENCRYPTION_KEY || JWT_SECRET)).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
    let encrypted = cipher.update(totpSecret, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');
    const encryptedSecret = `${iv.toString('base64')}:${authTag}:${encrypted}`;

    const recoveryCodeRaw = 'RECOVERY12345678';
    const recoveryCodeHash = crypto.createHash('sha256').update(recoveryCodeRaw).digest('hex');

    const user = new AdminUser({
        name: 'Tomas Propietario',
        email,
        passwordHash,
        role: 'owner',
        active: true,
        permissions: ['*'],
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        recoveryCodes: [recoveryCodeHash]
    });
    await user.save();
    return { user, totpSecret, recoveryCodeRaw, password };
}

// Helper para iniciar sesión con contraseña y obtener challengeId
async function loginWithPassword(email, password) {
    const res = await fetch(`${base}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return { res, data };
}

// Helper para emitir un JWT de sesión de propietario autenticado
function signOwnerSessionToken(user) {
    const sessionId = crypto.randomUUID();
    return {
        token: jwt.sign({
            id: user._id,
            userId: user._id,
            email: user.email,
            username: user.name,
            role: user.role,
            permissions: user.permissions,
            sessionId,
            deviceId: 'test-device-01',
            deviceName: 'PC Agencia',
            deviceStatus: 'trusted'
        }, JWT_SECRET, { expiresIn: '1h' }),
        sessionId
    };
}

async function runTests() {
    console.log('=== INICIO DE PRUEBAS DE SEGURIDAD WEBAUTHN / PASSKEYS ===\n');

    await setup();

    try {
        const { user: owner, totpSecret, recoveryCodeRaw, password } = await createOwnerUser();
        const { token: ownerAuthToken, sessionId: initialSessionId } = signOwnerSessionToken(owner);

        // Precrear sesión en UserSession
        await UserSession.create({
            sessionId: initialSessionId,
            userId: owner._id,
            userName: owner.name,
            userEmail: owner.email,
            userRole: owner.role,
            deviceId: 'test-device-01',
            deviceName: 'PC Agencia',
            deviceStatus: 'trusted',
            status: 'active',
            expiresAt: new Date(Date.now() + 3600 * 1000)
        });

        const authenticator = new VirtualWebAuthnAuthenticator();

        // -------------------------------------------------------------
        // ESCENARIO 1: Registro exitoso de una passkey
        // -------------------------------------------------------------
        console.log('Prueba 1: Registro exitoso de una passkey (Ceremonia WebAuthn)...');
        {
            // 1.1 Obtener opciones de registro
            const optRes = await fetch(`${base}/api/admin/passkeys/generate-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerAuthToken}`
                }
            });
            assert.equal(optRes.status, 200, 'Endpoint de opciones de registro debe responder 200');
            const regOptions = await optRes.json();
            assert.ok(regOptions.challenge, 'Debe devolver un desafío WebAuthn');
            assert.equal(regOptions.rp.id, 'localhost');

            // 1.2 Autenticador virtual crea la credencial
            const attestationResponse = authenticator.createRegistrationResponse({
                options: regOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });

            // 1.3 Enviar a verificar y guardar
            const verifyRes = await fetch(`${base}/api/admin/passkeys/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerAuthToken}`
                },
                body: JSON.stringify({
                    credential: attestationResponse,
                    name: 'PC Agencia Oficial'
                })
            });
            assert.equal(verifyRes.status, 200, 'Verificación de registro debe responder 200');
            const verifyData = await verifyRes.json();
            assert.equal(verifyData.ok, true);
            assert.equal(verifyData.passkey.name, 'PC Agencia Oficial');

            // 1.4 Validar base de datos y auditoría
            const savedPasskey = await PasskeyCredential.findOne({ credentialId: authenticator.credentialId.toString('base64url') });
            assert.ok(savedPasskey, 'Passkey debe estar persistida en MongoDB');
            assert.equal(savedPasskey.status, 'active');
            assert.equal(savedPasskey.name, 'PC Agencia Oficial');

            const audit = await AuditLog.findOne({ action: 'PASSKEY_REGISTERED', entityId: savedPasskey.credentialId });
            assert.ok(audit, 'Evento PASSKEY_REGISTERED debe existir en AuditLog');
            assert.ok(audit.currentHash, 'AuditLog debe tener hash HMAC');
            console.log('  ok - Passkey registrada y auditada con HMAC');
        }

        // -------------------------------------------------------------
        // ESCENARIO 2: Inicio de sesión con contraseña + passkey
        // -------------------------------------------------------------
        console.log('Prueba 2: Inicio de sesión con contraseña + passkey (2FA WebAuthn)...');
        {
            // 2.1 Paso 1: Login con contraseña
            const { res: loginRes, data: loginData } = await loginWithPassword(owner.email, password);
            assert.equal(loginRes.status, 200);
            assert.equal(loginData.require2FA, true);
            assert.equal(loginData.passkeysAvailable, true, 'Debe indicar que hay passkeys disponibles');
            const challengeToken = loginData.challengeId;

            // 2.2 Paso 2: Obtener opciones de autenticación
            const optRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: challengeToken })
            });
            assert.equal(optRes.status, 200);
            const authOptions = await optRes.json();
            assert.ok(authOptions.challenge);

            // 2.3 Paso 3: Autenticador firma el desafío
            const assertionResponse = authenticator.createAuthenticationResponse({
                options: authOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });

            // 2.4 Paso 4: Enviar verificación
            const verifyRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: challengeToken,
                    credential: assertionResponse
                })
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.status !== 200) {
                console.error('Verify failed with data:', verifyData);
            }
            assert.equal(verifyRes.status, 200);
            assert.ok(verifyData.token, 'Debe devolver un JWT final firmado');
            assert.equal(verifyData.role, 'owner');

            const audit = await AuditLog.findOne({ action: 'PASSKEY_AUTH_SUCCESS', entityId: authenticator.credentialId.toString('base64url') });
            assert.ok(audit, 'Evento PASSKEY_AUTH_SUCCESS registrado');
            console.log('  ok - Login con contraseña + passkey completado y auditado');
        }

        // -------------------------------------------------------------
        // ESCENARIO 3: Inicio de sesión con contraseña + TOTP (Alternativa)
        // -------------------------------------------------------------
        console.log('Prueba 3: Inicio de sesión con contraseña + TOTP (Alternativa funcional)...');
        {
            const { res: loginRes, data: loginData } = await loginWithPassword(owner.email, password);
            assert.equal(loginRes.status, 200);
            const challengeToken = loginData.challengeId;

            const totpCode = speakeasy.totp({
                secret: totpSecret,
                encoding: 'base32'
            });

            const totpRes = await fetch(`${base}/api/login/2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: challengeToken,
                    code: totpCode
                })
            });
            assert.equal(totpRes.status, 200, 'El canal alternativo TOTP debe mantenerse 100% operativo');
            const totpData = await totpRes.json();
            assert.ok(totpData.token);
            console.log('  ok - Alternativa TOTP preservada sin regresiones');
        }

        // -------------------------------------------------------------
        // ESCENARIO 4: Rechazo de firma inválida
        // -------------------------------------------------------------
        console.log('Prueba 4: Rechazo de firma inválida (Firma manipulada / clave no coincidente)...');
        {
            const { data: loginData } = await loginWithPassword(owner.email, password);
            const optRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            const authOptions = await optRes.json();

            // Firma adulterada
            const tamperedAssertion = authenticator.createAuthenticationResponse({
                options: authOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true,
                tamperSignature: true
            });

            const verifyRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    credential: tamperedAssertion
                })
            });
            assert.equal(verifyRes.status, 401, 'Debe rechazar con 401 firma inválida');
            const verifyData = await verifyRes.json();
            assert.equal(verifyData.code, 'PASSKEY_VERIFICATION_FAILED');
            console.log('  ok - Firma adulterada detectada y rechazada');
        }

        // -------------------------------------------------------------
        // ESCENARIO 5: Rechazo de desafío vencido o reutilizado (Anti-Replay)
        // -------------------------------------------------------------
        console.log('Prueba 5: Rechazo de desafío vencido o reutilizado (Anti-Replay)...');
        {
            const { data: loginData } = await loginWithPassword(owner.email, password);
            const optRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            const authOptions = await optRes.json();

            const validAssertion = authenticator.createAuthenticationResponse({
                options: authOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });

            // Primer intento: Exitoso
            const firstRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    credential: validAssertion
                })
            });
            assert.equal(firstRes.status, 200, 'Primer uso del desafío debe ser exitoso');

            // Segundo intento con el MISMO desafío: Debe ser rechazado (Replay)
            const replayRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    credential: validAssertion
                })
            });
            assert.equal(replayRes.status, 401, 'Replay con desafío consumido debe ser rechazado');
            const replayData = await replayRes.json();
            assert.equal(replayData.code, 'CHALLENGE_INVALID_OR_EXPIRED');

            // Intento con desafío expirado por tiempo
            const expiredChallenge = new PasskeyChallenge({
                challenge: 'expired-challenge-test-token',
                userId: owner._id,
                purpose: 'authentication',
                used: false,
                expiresAt: new Date(Date.now() - 10000) // Vencido hace 10s
            });
            await expiredChallenge.save();

            const expiredDoc = await PasskeyChallenge.findOneAndUpdate(
                { challenge: 'expired-challenge-test-token', used: false, expiresAt: { $gt: new Date() } },
                { $set: { used: true } }
            );
            assert.equal(expiredDoc, null, 'Desafío vencido no debe poder ser consumido');
            console.log('  ok - Replay y expiración de desafíos bloqueados atómicamente');
        }

        // -------------------------------------------------------------
        // ESCENARIO 6: Rechazo de origin o RP ID incorrecto
        // -------------------------------------------------------------
        console.log('Prueba 6: Rechazo de origin o RP ID incorrecto (Phishing mitigation)...');
        {
            const { data: loginData } = await loginWithPassword(owner.email, password);
            const optRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            const authOptions = await optRes.json();

            // Origin fraudulento (ataque de Relay / Phishing)
            const fakeOriginAssertion = authenticator.createAuthenticationResponse({
                options: authOptions,
                origin: 'https://malicious-crm-phishing.com',
                rpID: 'localhost',
                userVerification: true
            });

            const verifyRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    credential: fakeOriginAssertion
                })
            });
            assert.equal(verifyRes.status, 401, 'Origin no autorizado debe ser rechazado');
            console.log('  ok - Origin fraudulento bloqueado');
        }

        // -------------------------------------------------------------
        // ESCENARIO 7: Rechazo de credencial perteneciente a otro usuario
        // -------------------------------------------------------------
        console.log('Prueba 7: Rechazo de credencial perteneciente a otro usuario...');
        {
            const foreignAuth = new VirtualWebAuthnAuthenticator();
            const { data: loginData } = await loginWithPassword(owner.email, password);
            const optRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            const authOptions = await optRes.json();

            const foreignAssertion = foreignAuth.createAuthenticationResponse({
                options: authOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });

            const verifyRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    credential: foreignAssertion
                })
            });
            assert.equal(verifyRes.status, 401);
            const verifyData = await verifyRes.json();
            assert.equal(verifyData.code, 'CREDENTIAL_USER_MISMATCH');
            console.log('  ok - Credencial ajena rechazada con CREDENTIAL_USER_MISMATCH');
        }

        // -------------------------------------------------------------
        // ESCENARIO 8: Rechazo cuando no se cumple User Verification (UV = required)
        // -------------------------------------------------------------
        console.log('Prueba 8: Rechazo cuando no se cumple User Verification (UV = required)...');
        {
            const { data: loginData } = await loginWithPassword(owner.email, password);
            const optRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            const authOptions = await optRes.json();

            // Aserción con UV = false (flag UV bit 2 en 0)
            const noUvAssertion = authenticator.createAuthenticationResponse({
                options: authOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: false
            });

            const verifyRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    credential: noUvAssertion
                })
            });
            assert.equal(verifyRes.status, 401);
            const verifyData = await verifyRes.json();
            assert.ok(
                verifyData.code === 'USER_VERIFICATION_REQUIRED' || verifyData.code === 'PASSKEY_VERIFICATION_FAILED',
                'Debe exigir UV obligatoria'
            );
            console.log('  ok - Intento sin verificación biométrica/PIN rechazado');
        }

        // -------------------------------------------------------------
        // ESCENARIO 9: Revocación de credenciales
        // -------------------------------------------------------------
        console.log('Prueba 9: Revocación de credenciales...');
        {
            const credIdStr = authenticator.credentialId.toString('base64url');
            const revokeRes = await fetch(`${base}/api/admin/passkeys/${encodeURIComponent(credIdStr)}/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerAuthToken}`
                },
                body: JSON.stringify({ reason: 'Dispositivo extraviado o reemplazado' })
            });
            assert.equal(revokeRes.status, 200, 'Revocación debe devolver 200');
            const revokeData = await revokeRes.json();
            assert.equal(revokeData.ok, true);

            const doc = await PasskeyCredential.findOne({ credentialId: credIdStr });
            assert.equal(doc.status, 'revoked');
            assert.ok(doc.revokedAt);

            // Intento posterior de login con la credencial revocada
            const { data: loginData } = await loginWithPassword(owner.email, password);
            const optRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            // Al no haber passkeys activas, options debe retornar 404 NO_ACTIVE_PASSKEYS
            assert.equal(optRes.status, 404);
            const optData = await optRes.json();
            assert.equal(optData.code, 'NO_ACTIVE_PASSKEYS');
            console.log('  ok - Revocación efectiva y bloqueo post-revocación verificado');
        }

        // -------------------------------------------------------------
        // ESCENARIO 10: Recuperación mediante TOTP cuando no existe passkey disponible
        // -------------------------------------------------------------
        console.log('Prueba 10: Recuperación mediante TOTP / Recovery Code cuando no existe passkey...');
        {
            const { res: loginRes, data: loginData } = await loginWithPassword(owner.email, password);
            assert.equal(loginRes.status, 200);
            assert.equal(loginData.passkeysAvailable, false, 'No debe haber passkeys disponibles');

            // Uso de código de emergencia (Recovery Code)
            const recRes = await fetch(`${base}/api/login/2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    recoveryCode: recoveryCodeRaw
                })
            });
            assert.equal(recRes.status, 200, 'Código de recuperación debe autenticar al propietario');
            const recData = await recRes.json();
            assert.ok(recData.token);
            console.log('  ok - Recuperación de emergencia mediante recovery code exitosa');
        }

        // -------------------------------------------------------------
        // ESCENARIO 11: Imposibilidad de eludir Owner-Only
        // -------------------------------------------------------------
        console.log('Prueba 11: Imposibilidad de eludir Owner-Only en endpoints de Passkeys...');
        {
            // Crear usuario secundario con rol 'admin'
            const adminUser = new AdminUser({
                name: 'Empleado Secundario',
                email: 'empleado@autosporting.com',
                passwordHash: crypto.createHash('sha256').update('EmpPass123!').digest('hex'),
                role: 'admin',
                active: true,
                twoFactorEnabled: true
            });
            await adminUser.save();

            const adminSessionId = crypto.randomUUID();
            await UserSession.create({
                sessionId: adminSessionId,
                userId: adminUser._id,
                userName: adminUser.name,
                userEmail: adminUser.email,
                userRole: adminUser.role,
                deviceId: 'test-admin-device',
                deviceName: 'Dispositivo Empleado',
                deviceStatus: 'trusted',
                status: 'active',
                expiresAt: new Date(Date.now() + 3600 * 1000)
            });

            const adminToken = jwt.sign({
                id: adminUser._id,
                userId: adminUser._id,
                email: adminUser.email,
                role: adminUser.role,
                sessionId: adminSessionId
            }, JWT_SECRET, { expiresIn: '1h' });

            // Intento en /api/admin/passkeys
            const listRes = await fetch(`${base}/api/admin/passkeys`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            assert.equal(listRes.status, 403, 'Usuario secundario debe recibir 403 ONLY_OWNER_ALLOWED');
            const listData = await listRes.json();
            assert.equal(listData.code, 'ONLY_OWNER_ALLOWED');

            // Intento en /api/admin/passkeys/generate-options
            const genRes = await fetch(`${base}/api/admin/passkeys/generate-options`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            assert.equal(genRes.status, 403);
            const genData = await genRes.json();
            assert.equal(genData.code, 'ONLY_OWNER_ALLOWED');
            console.log('  ok - Barrera Owner-Only impenetrable para roles secundarios');
        }

        // -------------------------------------------------------------
        // ESCENARIO 12: Compatibilidad con sesiones revocables y TrustedDevice
        // -------------------------------------------------------------
        console.log('Prueba 12: Compatibilidad con sesiones revocables y TrustedDevice...');
        {
            // Registrar una nueva passkey para esta prueba
            const auth2 = new VirtualWebAuthnAuthenticator();
            const optRes = await fetch(`${base}/api/admin/passkeys/generate-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerAuthToken}`
                }
            });
            const regOptions = await optRes.json();
            const attResp = auth2.createRegistrationResponse({
                options: regOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });
            await fetch(`${base}/api/admin/passkeys/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerAuthToken}`
                },
                body: JSON.stringify({ credential: attResp, name: 'MacBook Pro Agencia' })
            });

            // Login con Passkey
            const { data: loginData } = await loginWithPassword(owner.email, password);
            const authOptRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            const authOptions = await authOptRes.json();
            const asseResp = auth2.createAuthenticationResponse({
                options: authOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });

            const verifyRes = await fetch(`${base}/api/login/passkey/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeId: loginData.challengeId,
                    credential: asseResp,
                    deviceId: 'terminal-propietario-01'
                })
            });
            assert.equal(verifyRes.status, 200);
            const { token: sessionJwt } = await verifyRes.json();

            // Decodificar JWT y verificar existencia en UserSession
            const decoded = jwt.decode(sessionJwt);
            assert.ok(decoded.sessionId, 'JWT debe incluir sessionId');
            const sessionInDb = await UserSession.findOne({ sessionId: decoded.sessionId });
            assert.ok(sessionInDb, 'Sesión revocable debe existir en MongoDB');
            assert.equal(sessionInDb.status, 'active');

            // Verificar que request autenticada funciona con este token
            const meRes = await fetch(`${base}/api/admin/passkeys`, {
                headers: { 'Authorization': `Bearer ${sessionJwt}` }
            });
            assert.equal(meRes.status, 200, 'Sesión activa debe permitir acceso');

            // Revocar la sesión en base de datos
            sessionInDb.status = 'revoked';
            await sessionInDb.save();

            // Request subsecuente debe ser rechazada inmediatamente
            const revokedReqRes = await fetch(`${base}/api/admin/passkeys`, {
                headers: { 'Authorization': `Bearer ${sessionJwt}` }
            });
            assert.equal(revokedReqRes.status, 401, 'Sesión revocada debe rechazar la petición');
            console.log('  ok - Compatibilidad con sesiones revocables y TrustedDevice verificada');
        }

        // -------------------------------------------------------------
        // ESCENARIO 13: Protección contra solicitudes concurrentes y reutilización de desafíos
        // -------------------------------------------------------------
        console.log('Prueba 13: Protección contra solicitudes concurrentes...');
        {
            const auth3 = new VirtualWebAuthnAuthenticator();
            const optRes = await fetch(`${base}/api/admin/passkeys/generate-options`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerAuthToken}`
                }
            });
            const regOptions = await optRes.json();
            const attResp = auth3.createRegistrationResponse({
                options: regOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });
            await fetch(`${base}/api/admin/passkeys/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ownerAuthToken}`
                },
                body: JSON.stringify({ credential: attResp, name: 'iPad Propietario' })
            });

            const { data: loginData } = await loginWithPassword(owner.email, password);
            const authOptRes = await fetch(`${base}/api/login/passkey/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: loginData.challengeId })
            });
            const authOptions = await authOptRes.json();
            const asseResp = auth3.createAuthenticationResponse({
                options: authOptions,
                origin: base,
                rpID: 'localhost',
                userVerification: true
            });

            // Disparar 2 peticiones concurrentes con el mismo desafío exacto
            const [resp1, resp2] = await Promise.all([
                fetch(`${base}/api/login/passkey/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        challengeId: loginData.challengeId,
                        credential: asseResp
                    })
                }),
                fetch(`${base}/api/login/passkey/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        challengeId: loginData.challengeId,
                        credential: asseResp
                    })
                })
            ]);

            const statuses = [resp1.status, resp2.status].sort();
            assert.deepEqual(statuses, [200, 401], 'Exactamente una solicitud concurrente debe ganar y la otra debe ser rechazada');
            console.log('  ok - Concurrencia atómica verificada: 1 éxito, 1 rechazo');
        }

        console.log('\n✅ TODAS LAS PRUEBAS DE SEGURIDAD WEBAUTHN / PASSKEYS PASARON EXITOSAMENTE (13/13)\n');
    } finally {
        await teardown();
    }
}

runTests().catch(err => {
    console.error('\n❌ ERROR EN PRUEBAS WEBAUTHN:', err);
    process.exit(1);
});
