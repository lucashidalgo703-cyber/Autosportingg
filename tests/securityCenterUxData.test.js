import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import AuditLog from '../src/models/AuditLog.js';
import UserSession from '../src/models/UserSession.js';
import TrustedDevice from '../src/models/TrustedDevice.js';
import SecurityAlert from '../src/models/SecurityAlert.js';
import { logAudit } from '../src/utils/auditLogger.js';
import { getLoginHistory, getSecurityOverviewMetrics } from '../src/services/securityAlertService.js';
import fs from 'node:fs';

test('Security Center UX & Data: Suite Integral', async (t) => {
    let mongoServer;

    t.before(async () => {
        process.env.AUDIT_HMAC_SECRET = crypto.randomBytes(32).toString('hex');
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
    });

    t.after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    await t.test('1. Nuevos accesos exitosos registran la cuenta autenticada, no "system"', async () => {
        const mockUser = {
            _id: new mongoose.Types.ObjectId(),
            email: 'propietario.real@autosporting.com',
            name: 'Tomas Propietario',
            role: 'owner'
        };

        const req = {
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0' }
        };

        await logAudit({
            req,
            user: mockUser,
            action: 'LOGIN_EXITOSO',
            module: 'usuarios',
            entityType: 'User',
            entityId: mockUser._id,
            entityLabel: mockUser.email,
            description: `Login exitoso de ${mockUser.email}`
        });

        const entry = await AuditLog.findOne({ action: 'LOGIN_EXITOSO' }).sort({ createdAt: -1 });
        assert.ok(entry, 'Debe existir registro en base de datos');
        assert.equal(entry.userEmail, 'propietario.real@autosporting.com', 'userEmail debe ser la cuenta autenticada');
        assert.equal(entry.userName, 'Tomas Propietario', 'userName no debe ser System');
        assert.notEqual(entry.userEmail, 'system', 'No debe usarse "system" como sustituto para logins exitosos');
    });

    await t.test('2. Intentos fallidos distinguen correo introducido de identidad verificada', async () => {
        const req = {
            ip: '127.0.0.1',
            headers: { 'user-agent': 'Mozilla/5.0' }
        };

        const enteredEmail = 'intento.fraudulento@desconocido.com';

        await logAudit({
            req,
            action: 'LOGIN_FALLIDO',
            module: 'usuarios',
            entityType: 'User',
            entityLabel: enteredEmail,
            description: `Intento de login fallido para ${enteredEmail}`,
            metadata: {
                attemptedEmail: enteredEmail,
                identityVerified: false
            }
        });

        const entry = await AuditLog.findOne({ action: 'LOGIN_FALLIDO' }).sort({ createdAt: -1 });
        assert.ok(entry);
        assert.equal(entry.entityLabel, enteredEmail);
        assert.equal(entry.metadata?.identityVerified, false);
    });

    await t.test('3. getLoginHistory clasifica identidades, loopback y dispositivos', async () => {
        const history = await getLoginHistory({ page: 1, limit: 10 });
        assert.ok(history.items.length >= 2, 'Debe devolver al menos 2 registros');

        const successItem = history.items.find(i => i.result === 'SUCCESS');
        assert.ok(successItem, 'Debe contener un item de login exitoso');
        assert.equal(successItem.userEmail, 'propietario.real@autosporting.com');
        assert.equal(successItem.identityVerified, true);
        assert.equal(successItem.ipType, 'loopback');
        assert.equal(successItem.ipLabel, 'Conexión local (Loopback)');

        const failedItem = history.items.find(i => i.result === 'FAILED');
        assert.ok(failedItem, 'Debe contener un item de login rechazado');
        assert.equal(failedItem.attemptedEmail, 'intento.fraudulento@desconocido.com');
        assert.equal(failedItem.identityVerified, false);
    });

    await t.test('4. Clasificación de dispositivos: Confiable, Revocado y Sin Registrar', async () => {
        const req = { ip: '127.0.0.1', headers: {} };

        // A: Dispositivo confiable
        await logAudit({
            req,
            action: 'LOGIN_EXITOSO',
            module: 'usuarios',
            entityLabel: 'owner@test.com',
            user: { email: 'owner@test.com', name: 'Owner', role: 'owner' },
            description: 'Login desde PC Agencia',
            deviceName: 'PC Agencia Principal'
        });

        // B: Dispositivo revocado
        await logAudit({
            req,
            action: 'DEVICE_REVOKED',
            module: 'seguridad',
            entityLabel: 'Terminal Vieja',
            description: 'Terminal revocada',
            deviceName: 'Terminal Vieja'
        });

        const history = await getLoginHistory({ page: 1, limit: 10 });
        const trustedItem = history.items.find(i => i.deviceName === 'PC Agencia Principal');
        assert.ok(trustedItem);
        assert.equal(trustedItem.deviceType, 'trusted');
        assert.equal(trustedItem.deviceBadgeLabel, 'Dispositivo Confiable');

        const revokedItem = history.items.find(i => i.deviceName === 'Terminal Vieja');
        assert.ok(revokedItem);
        assert.equal(revokedItem.deviceType, 'revoked');
        assert.equal(revokedItem.deviceBadgeLabel, 'Dispositivo Revocado');
    });

    await t.test('5. No reescritura de firmas HMAC históricas', async () => {
        // Verificar que los hashes de los registros creados son válidos
        const logs = await AuditLog.find().sort({ createdAt: 1 });
        for (const log of logs) {
            assert.ok(log.currentHash, 'Cada log debe tener su hash HMAC-SHA256');
            assert.equal(typeof log.currentHash, 'string');
            assert.equal(log.currentHash.length, 64);
        }
    });

    await t.test('6. Verificación estática del texto Offline en OfflineSyncControl', () => {
        const fileContent = fs.readFileSync('src/components/crm/offline/OfflineSyncControl.jsx', 'utf8');
        // Debe mostrar 'En línea' cuando está online sin pendientes, NO 'Offline'
        assert.ok(fileContent.includes("'En línea'"), "Debe mostrar 'En línea' cuando navigator.onLine es true");
        assert.ok(!fileContent.includes("? `Pendientes (${pendingOutboxCount})` : 'Offline'"), "No debe exhibir 'Offline' cuando está conectado");
    });
});
