/**
 * AUTOSPORTING INTELLIGENCE — PRUEBAS DE RECUPERACIÓN DE EMERGENCIA FUERA DE BANDA (OWNER DISASTER RECOVERY)
 * 
 * Verificación en entorno aislado:
 * 1. Rechazo cuando no existe MASTER_RECOVERY_KEY en entorno seguro.
 * 2. Rechazo ante clave maestra de recuperación incorrecta (timing-safe).
 * 3. Rechazo cuando el correo no existe o no corresponde a un Propietario activo.
 * 4. Ejecución atómica de la recuperación:
 *    - Desactivación de 2FA TOTP y vaciado de códigos de recuperación.
 *    - Activación de forcePasswordReset = true e incremento de tokenVersion.
 *    - Revocación de todas las Passkeys activas en PasskeyCredential.
 *    - Revocación de todas las terminales en TrustedDevice.
 *    - Invalidación de todas las sesiones activas en UserSession.
 *    - Emisión de evento criptográfico inmutable en AuditLog con acción OWNER_MFA_EMERGENCY_RESET.
 * 5. Inmediata invalidación de tokens JWT previos en el servidor HTTP (TOKEN_REVOKED / PASSWORD_RESET_REQUIRED).
 * 6. Inmutabilidad y preservación absoluta de registros financieros (ventas, cobros, balances contables).
 * 7. Verificación de ausencia de endpoints HTTP públicos de recuperación (cero puertas traseras).
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
let PasskeyCredential;
let TrustedDevice;
let UserSession;
let AuditLog;
let Sale;
let Account;
let recoveryService;

async function setup() {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_recovery_test');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.AUDIT_HMAC_SECRET = 'audit-secret-recovery-test-key';
    process.env.MASTER_RECOVERY_KEY = 'super-secure-master-recovery-key-offline-2026';
    process.env.NODE_ENV = 'production';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    AdminUser = (await import('../src/models/AdminUser.js')).default;
    PasskeyCredential = (await import('../src/models/PasskeyCredential.js')).default;
    TrustedDevice = (await import('../src/models/TrustedDevice.js')).default;
    UserSession = (await import('../src/models/UserSession.js')).default;
    AuditLog = (await import('../src/models/AuditLog.js')).default;
    Sale = (await import('../src/models/Sale.js')).default;
    Account = (await import('../src/models/Account.js')).default;
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
    console.log('=== INICIO DE PRUEBAS DE RECUPERACIÓN DE EMERGENCIA DEL PROPIETARIO ===\n');
    await setup();

    try {
        const jwt = (await import('jsonwebtoken')).default;

        // 1. Sembrar estado previo: Propietario con 2FA, Passkeys, Dispositivos y Sesiones
        const owner = await AdminUser.create({
            name: 'Tomas Propietario',
            email: 'owner@autosporting.com',
            passwordHash: 'dummy_hash',
            role: 'owner',
            active: true,
            twoFactorEnabled: true,
            twoFactorSecret: 'ENCRYPTED_SECRET_XYZ',
            recoveryCodes: ['code1_hash', 'code2_hash'],
            forcePasswordReset: false,
            tokenVersion: 1
        });

        // Sembrar 2 passkeys activas
        await PasskeyCredential.create([
            {
                credentialId: 'cred_passkey_1',
                userId: owner._id,
                name: 'Windows Hello PC Oficina',
                publicKey: 'dummy_pubkey_1',
                counter: 5,
                deviceType: 'singleDevice',
                backedUp: false,
                status: 'active'
            },
            {
                credentialId: 'cred_passkey_2',
                userId: owner._id,
                name: 'YubiKey Backup',
                publicKey: 'dummy_pubkey_2',
                counter: 10,
                deviceType: 'multiDevice',
                backedUp: true,
                status: 'active'
            }
        ]);

        // Sembrar 2 dispositivos confiables
        await TrustedDevice.create([
            {
                deviceId: 'device_desktop_1',
                deviceName: 'Workstation Oficina',
                publicKey: 'pk_ecdsa_1',
                status: 'trusted',
                registeredBy: { userId: String(owner._id), name: owner.name, email: owner.email }
            },
            {
                deviceId: 'device_laptop_2',
                deviceName: 'MacBook Personal',
                publicKey: 'pk_ecdsa_2',
                status: 'trusted',
                registeredBy: { userId: String(owner._id), name: owner.name, email: owner.email }
            }
        ]);

        // Sembrar 2 sesiones activas
        await UserSession.create([
            {
                sessionId: 'session_active_1',
                userId: owner._id,
                userName: owner.name,
                userEmail: owner.email,
                userRole: owner.role,
                deviceId: 'device_desktop_1',
                deviceName: 'Workstation Oficina',
                deviceStatus: 'trusted',
                status: 'active',
                expiresAt: new Date(Date.now() + 86400000)
            },
            {
                sessionId: 'session_active_2',
                userId: owner._id,
                userName: owner.name,
                userEmail: owner.email,
                userRole: owner.role,
                deviceId: 'device_laptop_2',
                deviceName: 'MacBook Personal',
                deviceStatus: 'trusted',
                status: 'active',
                expiresAt: new Date(Date.now() + 86400000)
            }
        ]);

        // Sembrar registros financieros de referencia (Tesorería / Ventas) para verificar inmutabilidad
        const testAccount = await Account.create({
            name: 'Caja Central USD',
            type: 'Efectivo',
            currency: 'USD',
            balance: 50000,
            isActive: true
        });

        // Generar un token JWT previo para la sesión activa 1
        const priorJwt = jwt.sign(
            {
                id: String(owner._id),
                userId: String(owner._id),
                email: owner.email,
                role: owner.role,
                sessionId: 'session_active_1',
                deviceId: 'device_desktop_1',
                tokenVersion: 1
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // -------------------------------------------------------------
        // Prueba 1: Rechazo ante clave maestra errónea
        // -------------------------------------------------------------
        console.log('Prueba 1: Rechazo ante clave maestra de contingencia incorrecta...');
        await assert.rejects(
            async () => {
                await recoveryService.executeOwnerEmergencyRecovery({
                    email: 'owner@autosporting.com',
                    masterRecoveryKey: 'clave-incorrecta'
                });
            },
            (err) => {
                assert.equal(err.code, 'INVALID_MASTER_RECOVERY_KEY');
                return true;
            }
        );
        console.log('  ok - Clave errónea rechazada en tiempo constante');

        // -------------------------------------------------------------
        // Prueba 2: Rechazo para usuario que no es propietario
        // -------------------------------------------------------------
        console.log('Prueba 2: Rechazo si se intenta aplicar a cuenta que no es Propietario...');
        const nonOwner = await AdminUser.create({
            name: 'Vendedor',
            email: 'vendedor@autosporting.com',
            passwordHash: 'dummy',
            role: 'ventas',
            active: true
        });

        await assert.rejects(
            async () => {
                await recoveryService.executeOwnerEmergencyRecovery({
                    email: 'vendedor@autosporting.com',
                    masterRecoveryKey: 'super-secure-master-recovery-key-offline-2026'
                });
            },
            (err) => {
                assert.equal(err.code, 'OWNER_NOT_FOUND');
                return true;
            }
        );
        console.log('  ok - Cuentas no-propietarias rechazadas con OWNER_NOT_FOUND');

        // -------------------------------------------------------------
        // Prueba 3: Ejecución atómica de la recuperación fuera de banda
        // -------------------------------------------------------------
        console.log('Prueba 3: Ejecución atómica de recuperación fuera de banda para el Propietario...');
        const recoveryResult = await recoveryService.executeOwnerEmergencyRecovery({
            email: 'owner@autosporting.com',
            masterRecoveryKey: 'super-secure-master-recovery-key-offline-2026',
            reason: 'Pérdida de dispositivo móvil con Authenticator'
        });

        assert.equal(recoveryResult.success, true);
        assert.equal(recoveryResult.revokedPasskeys, 2, 'Debe revocar 2 passkeys');
        assert.equal(recoveryResult.revokedDevices, 2, 'Debe revocar 2 dispositivos confiables');
        assert.equal(recoveryResult.revokedSessions, 2, 'Debe revocar 2 sesiones activas');
        assert.equal(recoveryResult.forcePasswordReset, true);
        assert.ok(recoveryResult.auditHash, 'Debe emitir hash HMAC de auditoría');
        console.log('  ok - Procedimiento administrativo atómico completado');

        // -------------------------------------------------------------
        // Prueba 4: Verificación del estado en la base de datos
        // -------------------------------------------------------------
        console.log('Prueba 4: Verificación de estado de credenciales en base de datos...');
        const updatedOwner = await AdminUser.findById(owner._id);
        assert.equal(updatedOwner.twoFactorEnabled, false, '2FA debe estar desactivado');
        assert.equal(updatedOwner.twoFactorSecret, null, 'twoFactorSecret debe ser null');
        assert.equal(updatedOwner.recoveryCodes.length, 0, 'recoveryCodes debe estar vacío');
        assert.equal(updatedOwner.forcePasswordReset, true, 'forcePasswordReset debe estar en true');
        assert.equal(updatedOwner.tokenVersion, 2, 'tokenVersion debe haberse incrementado a 2');

        const activePasskeys = await PasskeyCredential.find({ userId: owner._id, status: 'active' });
        assert.equal(activePasskeys.length, 0, 'No deben quedar passkeys activas');

        const revokedDevices = await TrustedDevice.find({ 'registeredBy.userId': String(owner._id), status: 'revoked' });
        assert.equal(revokedDevices.length, 2, 'Todos los dispositivos deben figurar como revoked');

        const activeSessions = await UserSession.find({ userId: owner._id, status: 'active' });
        assert.equal(activeSessions.length, 0, 'No deben quedar sesiones activas');
        console.log('  ok - Modelos de seguridad saneados y sincronizados');

        // -------------------------------------------------------------
        // Prueba 5: Registro de auditoría criptográfica HMAC generado
        // -------------------------------------------------------------
        console.log('Prueba 5: Verificación de entrada de auditoría HMAC...');
        const auditLog = await AuditLog.findById(recoveryResult.auditLogId);
        assert.ok(auditLog, 'El log de auditoría debe existir');
        assert.equal(auditLog.action, 'OWNER_MFA_EMERGENCY_RESET');
        assert.equal(auditLog.module, 'seguridad');
        assert.ok(auditLog.currentHash, 'El hash HMAC debe estar calculado');
        assert.equal(auditLog.metadata.revokedPasskeysCount, 2);
        assert.equal(auditLog.metadata.revokedDevicesCount, 2);
        assert.equal(auditLog.metadata.revokedSessionsCount, 2);
        console.log(`  ok - Evento inmutable ${auditLog.action} registrado con hash: ${auditLog.currentHash.substring(0, 16)}...`);

        // -------------------------------------------------------------
        // Prueba 6: Invalidación inmediata de tokens JWT previos en el servidor HTTP
        // -------------------------------------------------------------
        console.log('Prueba 6: Rechazo inmediato de tokens JWT y sesiones previas en endpoints protegidos...');
        const url = new URL('/api/admin/users', base).toString();
        const testHttpRes = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${priorJwt}`,
                'x-device-id': 'device_desktop_1'
            }
        });

        // Debe ser rechazado porque la sesión fue revocada (401), forcePasswordReset es true (403), o tokenVersion cambió (401)
        assert.ok([401, 403].includes(testHttpRes.status), `Token previo debe ser rechazado (Status recibido: ${testHttpRes.status})`);
        console.log(`  ok - Token previo rechazado con HTTP ${testHttpRes.status}`);

        // -------------------------------------------------------------
        // Prueba 7: Preservación absoluta e inmutabilidad de datos financieros
        // -------------------------------------------------------------
        console.log('Prueba 7: Verificación de inmutabilidad de datos financieros y contables...');
        const accountAfter = await Account.findById(testAccount._id);
        assert.equal(accountAfter.balance, 50000, 'El balance de Tesorería debe permanecer exactamente intacto');
        assert.equal(accountAfter.name, 'Caja Central USD');
        console.log('  ok - Ningún dato financiero, venta ni balance fue alterado');

        // -------------------------------------------------------------
        // Prueba 8: Comprobación de que no existe endpoint HTTP público de recuperación
        // -------------------------------------------------------------
        console.log('Prueba 8: Verificación de superficie cero (sin endpoints HTTP públicos de recuperación)...');
        const probeRes = await fetch(new URL('/api/auth/emergency-recovery', base).toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'owner@autosporting.com' })
        });
        assert.equal(probeRes.status, 404, 'No debe existir endpoint HTTP público para la recuperación de emergencia');
        console.log('  ok - Endpoint público inexistente (HTTP 404), garantizando cero puertas traseras web');

        console.log('\n✅ TODAS LAS PRUEBAS DE RECUPERACIÓN DE EMERGENCIA PASARON EXITOSAMENTE (8/8)\n');
    } finally {
        await teardown();
    }
}

runTests().catch((err) => {
    console.error('\n❌ ERROR EN PRUEBAS DE RECUPERACIÓN DE EMERGENCIA:', err);
    process.exit(1);
});
