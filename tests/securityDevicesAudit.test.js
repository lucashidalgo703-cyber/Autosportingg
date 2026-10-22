import assert from 'assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import TrustedDevice from '../src/models/TrustedDevice.js';
import UserSession from '../src/models/UserSession.js';
import AuditLog from '../src/models/AuditLog.js';
import AdminUser from '../src/models/AdminUser.js';
import SecurityChallenge from '../src/models/SecurityChallenge.js';
import { getTrustedClientIp } from '../src/utils/securityIpResolver.js';
import { 
    resolveDeviceOnLogin, 
    createUserSession, 
    authorizeDeviceAsTrusted, 
    revokeDevice, 
    getDeviceForensicAudit,
    validateSessionAndDevice,
    createSecurityChallenge,
    verifyDeviceSignature
} from '../src/services/deviceSecurityBackend.js';
import speakeasy from 'speakeasy';
import crypto from 'crypto';

let mongod;

async function setup() {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
}

async function teardown() {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
}

async function runTests() {
    console.log('=== INICIO PRUEBAS DE SEGURIDAD Y AUDITORÍA DE DISPOSITIVOS ===');
    await setup();

    try {
        // 1. Inmutabilidad de AuditLog
        console.log('Test 1: Inmutabilidad estricta de AuditLog...');
        const log = new AuditLog({
            action: 'TEST_ACTION',
            module: 'seguridad',
            description: 'Log de prueba'
        });
        await log.save();
        assert.ok(log._id, 'Log guardado');

        let mutationBlocked = false;
        try {
            await AuditLog.updateOne({ _id: log._id }, { description: 'Intento de edición' });
        } catch (e) {
            mutationBlocked = true;
            assert.ok(e.message.includes('inmutables'), 'Mensaje de inmutabilidad correcto');
        }
        assert.ok(mutationBlocked, 'updateOne fue bloqueado');

        let deleteBlocked = false;
        try {
            await AuditLog.deleteOne({ _id: log._id });
        } catch (e) {
            deleteBlocked = true;
            assert.ok(e.message.includes('inmutables') || e.message.includes('eliminarse'), 'Mensaje de borrado bloqueado');
        }
        assert.ok(deleteBlocked, 'deleteOne fue bloqueado');
        console.log('  ok - AuditLog es estrictamente inmutable');

        // 2. Resolución de IP Segura (Anti-Spoofing en Vercel)
        console.log('Test 2: Resolución segura de IP...');
        const mockReqSpoofed = {
            headers: {
                'x-forwarded-for': '198.51.100.1, 203.0.113.195', // IP falsificada inyectada por cliente
                'x-real-ip': '203.0.113.195'                        // IP real garantizada por Vercel
            }
        };
        const resolvedIp = getTrustedClientIp(mockReqSpoofed);
        assert.strictEqual(resolvedIp, '203.0.113.195', 'Debe preferir x-real-ip sobre x-forwarded-for falsificado');

        const mockReqLocal = { socket: { remoteAddress: '127.0.0.1' }, headers: {} };
        assert.strictEqual(getTrustedClientIp(mockReqLocal), '127.0.0.1', 'Fallback correcto en local');
        console.log('  ok - Resolución de IP protege contra spoofing');

        // 3. Crear usuario Propietario con 2FA configurado
        console.log('Test 3: Creación de usuario Owner y secreto 2FA...');
        const secret = speakeasy.generateSecret({ length: 20 });
        const { encrypt2FaSecret } = await import('../src/services/deviceSecurityBackend.js');
        const encryptedSecret = encrypt2FaSecret(secret.base32);

        const ownerUser = new AdminUser({
            name: 'Lucas Owner',
            email: 'owner@autosporting.test',
            passwordHash: 'hash:fake',
            role: 'owner',
            active: true,
            twoFactorEnabled: true,
            twoFactorSecret: encryptedSecret,
            recoveryCodes: [crypto.createHash('sha256').update('RECOVERY-1234').digest('hex')]
        });
        await ownerUser.save();
        assert.ok(ownerUser._id, 'Owner creado');

        // 4. Registro inicial desde navegador nuevo -> Estado unknown / pending
        console.log('Test 4: Registro inicial desde dispositivo desconocido...');
        const mockReqLogin = {
            headers: {
                'x-real-ip': '181.44.120.10',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36'
            }
        };

        const { device: dev1, isUnknown } = await resolveDeviceOnLogin({
            deviceId: 'browser-pc-agencia-uuid',
            publicKey: 'public-key-mock-p256',
            user: ownerUser,
            req: mockReqLogin
        });

        assert.strictEqual(isUnknown, true, 'Debe marcarse como desconocido inicialmente');
        assert.strictEqual(dev1.status, 'unknown', 'Estado inicial unknown');
        assert.strictEqual(dev1.clientInfo.os, 'Windows 10/11', 'OS parseado');
        assert.strictEqual(dev1.clientInfo.browser, 'Google Chrome', 'Navegador parseado');
        console.log('  ok - Dispositivo nuevo detectado como desconocido con cliente parseado');

        // 5. Creación de sesión revocable
        console.log('Test 5: Creación de sesión revocable...');
        const session1 = await createUserSession({
            user: ownerUser,
            device: dev1,
            req: mockReqLogin
        });
        assert.ok(session1.sessionId, 'SessionId generado');
        assert.strictEqual(session1.status, 'active', 'Sesión activa');
        assert.strictEqual(session1.deviceStatus, 'unknown', 'Refleja estado del dispositivo');
        console.log('  ok - Sesión creada y vinculada al dispositivo');

        // 6. Intento de autorizar dispositivo sin MFA (debe fallar)
        console.log('Test 6: Intento de registrar PC Agencia sin MFA...');
        let mfaFailed = false;
        try {
            await authorizeDeviceAsTrusted({
                deviceId: dev1.deviceId,
                targetName: 'PC Agencia',
                verificationCode: '000000', // Código erróneo
                ownerUser,
                req: mockReqLogin
            });
        } catch (e) {
            mfaFailed = true;
            assert.ok(e.message.includes('MFA'), 'Exige MFA');
        }
        assert.ok(mfaFailed, 'Bloqueó registro sin MFA válido');
        console.log('  ok - Registro sin MFA fue rechazado');

        // 7. Autorización válida de PC Agencia con código TOTP
        console.log('Test 7: Autorización válida de PC Agencia con TOTP...');
        const validTotp = speakeasy.totp({
            secret: secret.base32,
            encoding: 'base32'
        });

        const trustedPcAgencia = await authorizeDeviceAsTrusted({
            deviceId: dev1.deviceId,
            targetName: 'PC Agencia',
            verificationCode: validTotp,
            ownerUser,
            req: mockReqLogin
        });

        assert.strictEqual(trustedPcAgencia.status, 'trusted', 'Estado promovido a trusted');
        assert.strictEqual(trustedPcAgencia.deviceName, 'PC Agencia', 'Nombre asignado correctamente');
        assert.strictEqual(trustedPcAgencia.trustHistory.length, 2, 'Historial de confianza actualizado');
        assert.strictEqual(trustedPcAgencia.trustHistory[1].event, 'REGISTRO_AUTORIZADO', 'Evento de autorización registrado');

        // Verificar que la sesión activa se actualizó a 'trusted'
        const updatedSession = await UserSession.findOne({ sessionId: session1.sessionId });
        assert.strictEqual(updatedSession.deviceStatus, 'trusted', 'Sesión sincronizada a trusted');
        assert.strictEqual(updatedSession.deviceName, 'PC Agencia', 'Nombre de sesión sincronizado');
        console.log('  ok - PC Agencia autorizada y sesiones sincronizadas');

        // 8. Registro y Autorización de PC Privada con Código de Recuperación
        console.log('Test 8: Registro de PC Privada con código de recuperación...');
        const { device: dev2 } = await resolveDeviceOnLogin({
            deviceId: 'browser-pc-privada-uuid',
            publicKey: 'public-key-privada-mock',
            user: ownerUser,
            req: { headers: { 'x-real-ip': '181.44.120.50', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } }
        });

        const trustedPcPrivada = await authorizeDeviceAsTrusted({
            deviceId: dev2.deviceId,
            targetName: 'PC Privada',
            recoveryCode: 'RECOVERY-1234',
            ownerUser,
            req: mockReqLogin
        });

        assert.strictEqual(trustedPcPrivada.status, 'trusted', 'PC Privada autorizada');
        assert.strictEqual(trustedPcPrivada.deviceName, 'PC Privada');
        console.log('  ok - PC Privada autorizada con código de recuperación');

        // 9. Detección de Cambio de IP en PC Agencia
        console.log('Test 9: Detección de cambio de IP...');
        const { device: devAgenciaUpdated } = await resolveDeviceOnLogin({
            deviceId: 'browser-pc-agencia-uuid',
            user: ownerUser,
            req: { headers: { 'x-real-ip': '190.220.10.99', 'user-agent': mockReqLogin.headers['user-agent'] } }
        });
        const ipChangedEvent = devAgenciaUpdated.trustHistory.find(e => e.event === 'IP_CAMBIADA');
        assert.ok(ipChangedEvent, 'Registró evento de cambio de IP en el historial de confianza');
        console.log('  ok - Cambio de IP registrado en historial de confianza');

        // 10. Revocación Inmediata de Dispositivo y Terminación de Sesiones
        console.log('Test 10: Revocación de dispositivo y sesiones...');
        const revokeResult = await revokeDevice({
            deviceId: 'browser-pc-privada-uuid',
            reason: 'Equipo comprometido o reemplazado',
            ownerUser,
            req: mockReqLogin
        });
        assert.strictEqual(revokeResult.device.status, 'revoked', 'Estado revocado');

        // Comprobar que cualquier sesión activa de ese dispositivo quedó terminada
        const sessionsRevoked = await UserSession.find({ deviceId: 'browser-pc-privada-uuid' });
        sessionsRevoked.forEach(s => {
            assert.strictEqual(s.status, 'revoked', 'Sesión invalidada');
        });

        // Intento de login posterior desde el dispositivo revocado debe ser rechazado
        let loginBlocked = false;
        try {
            await resolveDeviceOnLogin({
                deviceId: 'browser-pc-privada-uuid',
                user: ownerUser,
                req: mockReqLogin
            });
        } catch (e) {
            loginBlocked = true;
            assert.strictEqual(e.code, 'DEVICE_REVOKED', 'Código de error DEVICE_REVOKED');
        }
        assert.ok(loginBlocked, 'Acceso bloqueado en dispositivo revocado');
        console.log('  ok - Revocación inmediata y bloqueo post-revocación funcionando');

        // 11. Consulta Forense Completa (12 Puntos)
        console.log('Test 11: Consulta forense del dispositivo...');
        const auditData = await getDeviceForensicAudit('browser-pc-agencia-uuid');
        assert.strictEqual(auditData.device.deviceName, 'PC Agencia');
        assert.ok(Array.isArray(auditData.sessions), 'Historial de sesiones presente');
        assert.ok(Array.isArray(auditData.trustHistory), 'Historial de confianza presente');
        assert.ok(auditData.summary.users.includes('Lucas Owner'), 'Usuario identificado');
        console.log('  ok - Consulta forense devuelve estructura completa');

        // 12. FASE 1: Rechazo estricto de JWT Legacy sin sessionId
        console.log('Test 12: Rechazo estricto de JWT Legacy sin sessionId...');
        const legacyCheck = await validateSessionAndDevice({
            sessionId: null,
            user: { id: ownerUser._id, role: 'owner' }
        });
        assert.strictEqual(legacyCheck.valid, false, 'JWT legacy sin sessionId no es válido');
        assert.strictEqual(legacyCheck.code, 'LEGACY_TOKEN_REJECTED', 'Código LEGACY_TOKEN_REJECTED');
        console.log('  ok - JWT Legacy sin sessionId rechazado con código 401 LEGACY_TOKEN_REJECTED');

        // 13. FASE 1: Rechazo de sesión revocada en validador unificado
        console.log('Test 13: Rechazo de sesión revocada en validador unificado...');
        const sessionToRevoke = new UserSession({
            sessionId: 'session-to-revoke-test',
            userId: ownerUser._id,
            userName: ownerUser.name,
            deviceId: 'browser-pc-agencia-uuid',
            deviceStatus: 'trusted',
            status: 'revoked',
            expiresAt: new Date(Date.now() + 3600000)
        });
        await sessionToRevoke.save();

        const revokedSessionCheck = await validateSessionAndDevice({
            sessionId: sessionToRevoke.sessionId,
            user: { id: ownerUser._id, role: 'owner' }
        });
        assert.strictEqual(revokedSessionCheck.valid, false, 'Sesión revocada no es válida');
        assert.strictEqual(revokedSessionCheck.code, 'SESSION_REVOKED', 'Código SESSION_REVOKED');
        console.log('  ok - Sesión revocada rechazada con código 401 SESSION_REVOKED');

        // 14. FASE 1: Rechazo de dispositivo revocado en validador unificado
        console.log('Test 14: Rechazo de dispositivo revocado en validador unificado...');
        const activeSessionOnRevokedDev = new UserSession({
            sessionId: 'active-session-revoked-dev',
            userId: ownerUser._id,
            userName: ownerUser.name,
            deviceId: 'browser-pc-privada-uuid',
            deviceStatus: 'revoked',
            status: 'active',
            expiresAt: new Date(Date.now() + 3600000)
        });
        await activeSessionOnRevokedDev.save();

        const deviceRevokedCheck = await validateSessionAndDevice({
            sessionId: activeSessionOnRevokedDev.sessionId,
            user: { id: ownerUser._id, role: 'owner' },
            deviceId: 'browser-pc-privada-uuid'
        });
        assert.strictEqual(deviceRevokedCheck.valid, false, 'Dispositivo revocado no es válido');
        assert.strictEqual(deviceRevokedCheck.code, 'DEVICE_REVOKED', 'Código DEVICE_REVOKED');
        console.log('  ok - Dispositivo revocado rechazado con código 401 DEVICE_REVOKED');

        // 15. FASE 2: Handshake de desafío ECDSA P-256 y firma válida
        console.log('Test 15: Handshake de desafío ECDSA P-256 y verificación de firma...');
        const challengeDevId = 'ecdsa-device-uuid-test';
        const challenge = await createSecurityChallenge({ deviceId: challengeDevId, purpose: 'login' });
        assert.ok(challenge.challengeId, 'Desafío generado con challengeId');
        assert.ok(challenge.nonce && challenge.nonce.length >= 64, 'Nonce criptográfico aleatorio presente');

        // Generar par de claves ECDSA P-256
        const { privateKey: devPrivKey, publicKey: devPubKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
        const devPubKeyJwk = devPubKey.export({ format: 'jwk' });

        // Firmar nonce del desafío
        const signer = crypto.createSign('SHA256');
        signer.update(challenge.nonce);
        const validSig = signer.sign({ key: devPrivKey, dsaEncoding: 'ieee-p1363' }, 'hex');

        const verification = await verifyDeviceSignature({
            challengeId: challenge.challengeId,
            deviceId: challengeDevId,
            signature: validSig,
            publicKeyJwk: devPubKeyJwk
        });
        assert.strictEqual(verification.valid, true, 'Firma ECDSA válida verificada');
        console.log('  ok - Handshake ECDSA P-256 verificado con éxito');

        // 16. FASE 2: Protección contra Replay de desafíos
        console.log('Test 16: Prevención de Replay Attack con desafíos consumidos...');
        const replayVerification = await verifyDeviceSignature({
            challengeId: challenge.challengeId,
            deviceId: challengeDevId,
            signature: validSig,
            publicKeyJwk: devPubKeyJwk
        });
        assert.strictEqual(replayVerification.valid, false, 'Desafío reutilizado debe ser rechazado');
        assert.strictEqual(replayVerification.reason, 'CHALLENGE_INVALIDO_O_EXPIRADO', 'Razón esperada de desafío consumido');
        console.log('  ok - Intento de Replay Attack bloqueado atómicamente');

        // 17. FASE 2: Rechazo de firma inválida / clonación de dispositivo
        console.log('Test 17: Detección y rechazo de firma inválida (intento de clonación)...');
        const challenge2 = await createSecurityChallenge({ deviceId: challengeDevId, purpose: 'login' });
        const { privateKey: fakePrivKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
        const fakeSigner = crypto.createSign('SHA256');
        fakeSigner.update(challenge2.nonce);
        const invalidSig = fakeSigner.sign({ key: fakePrivKey, dsaEncoding: 'ieee-p1363' }, 'hex');

        const invalidVerification = await verifyDeviceSignature({
            challengeId: challenge2.challengeId,
            deviceId: challengeDevId,
            signature: invalidSig,
            publicKeyJwk: devPubKeyJwk
        });
        assert.strictEqual(invalidVerification.valid, false, 'Firma generada con clave distinta debe rechazarse');
        assert.strictEqual(invalidVerification.reason, 'FIRMA_NO_COINCIDE', 'Razón esperada: FIRMA_NO_COINCIDE');
        console.log('  ok - Firma con clave clonada/falsa rechazada');

        // 18. FASE 2: Bloqueo de sustitución de clave pública en terminal confiable
        console.log('Test 18: Bloqueo de sustitución arbitraria de clave pública en terminal confiable...');
        const trustedWithKey = new TrustedDevice({
            deviceId: 'pc-con-clave-fija-uuid',
            deviceName: 'PC Con Clave Fija',
            status: 'trusted',
            publicKey: JSON.stringify(devPubKeyJwk),
            registeredBy: { userId: String(ownerUser._id), name: ownerUser.name, email: ownerUser.email }
        });
        await trustedWithKey.save();

        const { publicKey: attackerPubKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
        const attackerPubKeyJwk = attackerPubKey.export({ format: 'jwk' });

        let substitutionBlocked = false;
        try {
            await resolveDeviceOnLogin({
                deviceId: 'pc-con-clave-fija-uuid',
                publicKey: JSON.stringify(attackerPubKeyJwk),
                user: ownerUser,
                req: { headers: {}, ip: '127.0.0.1' }
            });
        } catch (e) {
            substitutionBlocked = true;
            assert.strictEqual(e.code, 'INTENTO_SUSTITUCION_CLAVE', 'Código INTENTO_SUSTITUCION_CLAVE');
        }
        assert.ok(substitutionBlocked, 'Intento de sustitución de clave pública bloqueado');
        console.log('  ok - Intento de sustitución de clave pública bloqueado con alerta de seguridad');

        console.log('\n✅ TODAS LAS PRUEBAS DE SEGURIDAD Y AUDITORÍA PASARON EXITOSAMENTE (18/18)');

    } finally {
        await teardown();
    }
}

runTests().catch(err => {
    console.error('Error en pruebas de seguridad:', err);
    process.exit(1);
});
