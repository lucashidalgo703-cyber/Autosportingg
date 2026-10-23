/**
 * AUTOSPORTING INTELLIGENCE — PRUEBAS DE PESTILLO DE MANTENIMIENTO Y DRENAJE DE ESCRITURAS
 * 
 * Verificación exhaustiva en entorno aislado:
 * 1. Activación atómica del pestillo de mantenimiento (acquireMaintenanceLock).
 * 2. Consulta distribuida y micro-cache multi-instancia (checkMaintenanceState).
 * 3. Inundación concurrente: 50 solicitudes mutativas simultáneas rechazadas con HTTP 503 SYSTEM_MAINTENANCE.
 * 4. Peticiones de solo lectura (GET/HEAD) permitidas durante el mantenimiento.
 * 5. Bypass administrativo con token SHA-256 verificado (x-maintenance-bypass).
 * 6. Rechazo de token de bypass fraudulento o manipulado.
 * 7. Bloqueo de webhooks mutativos entrantes con Retry-After.
 * 8. Drenaje verificable de escrituras en vuelo (currentOp).
 * 9. Regla de motor WiredTiger (collMod strict schema) aplicada en MongoDB.
 * 10. Sonda de inyección negativa: Inserción directa sin hash rechazada por el motor con error 121.
 * 11. Liberación del pestillo y restitución completa del tráfico mutativo normal.
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
let MaintenanceLock;
let AuditLog;
let maintenanceService;

async function setup() {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_maintenance_test');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.AUDIT_HMAC_SECRET = 'audit-secret-maintenance-test-key';
    process.env.NODE_ENV = 'production';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    AdminUser = (await import('../src/models/AdminUser.js')).default;
    MaintenanceLock = (await import('../src/models/MaintenanceLock.js')).default;
    AuditLog = (await import('../src/models/AuditLog.js')).default;
    maintenanceService = await import('../src/services/maintenanceDrainService.js');

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

async function request(path, options = {}) {
    const url = new URL(path, base).toString();
    const res = await fetch(url, options);
    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        body = await res.json().catch(() => null);
    } else {
        body = await res.text().catch(() => null);
    }
    return { status: res.status, headers: res.headers, body };
}

async function runTests() {
    console.log('=== INICIO DE PRUEBAS DE MANTENIMIENTO Y DRENAJE DE ESCRITURAS ===\n');
    await setup();

    try {
        // Sembrar usuario propietario
        const owner = await AdminUser.create({
            name: 'Propietario AutoSporting',
            email: 'owner@autosporting.com',
            passwordHash: 'dummy_hash',
            role: 'owner',
            active: true
        });

        // -------------------------------------------------------------
        // Prueba 1: Estado inicial IDLE
        // -------------------------------------------------------------
        console.log('Prueba 1: Verificación de estado inicial del sistema (IDLE)...');
        const initialState = await maintenanceService.checkMaintenanceState();
        assert.equal(initialState.active, false, 'El pestillo debe estar inactivo inicialmente');
        console.log('  ok - Sistema en estado IDLE');

        // -------------------------------------------------------------
        // Prueba 2: Peticiones mutativas operan normalmente en estado IDLE
        // -------------------------------------------------------------
        console.log('Prueba 2: Solicitudes mutativas procesadas normalmente en estado IDLE...');
        const idleRes = await request('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'owner@autosporting.com', password: 'wrong' })
        });
        // 400 o 401 por credencial incorrecta, pero NO 503
        assert.notEqual(idleRes.status, 503, 'En IDLE no debe responder 503 SYSTEM_MAINTENANCE');
        console.log('  ok - Solicitud mutativa aceptada por el middleware de mantenimiento');

        // -------------------------------------------------------------
        // Prueba 3: Activación atómica del pestillo de mantenimiento
        // -------------------------------------------------------------
        console.log('Prueba 3: Activación atómica del pestillo con token de bypass...');
        const bypassSecret = 'super-secret-bypass-key-2026';
        const lockDoc = await maintenanceService.acquireMaintenanceLock({
            reason: 'Prueba de drenaje y sellado criptográfico',
            bypassToken: bypassSecret,
            lockedBy: 'TEST_RUNNER'
        });

        assert.equal(lockDoc.active, true, 'El pestillo debe estar activo');
        assert.equal(lockDoc.mode, 'DRAINING', 'El modo inicial debe ser DRAINING');
        assert.ok(lockDoc.bypassTokenHash, 'Debe registrarse el hash SHA-256 del bypass');

        const activeState = await maintenanceService.checkMaintenanceState();
        assert.equal(activeState.active, true, 'checkMaintenanceState debe reflejar el pestillo activo');
        console.log('  ok - Pestillo activado atómicamente y sincronizado');

        // -------------------------------------------------------------
        // Prueba 4: Inundación concurrente (50 peticiones concurrentes rechazadas con 503)
        // -------------------------------------------------------------
        console.log('Prueba 4: Inundación concurrente: 50 mutaciones concurrentes durante mantenimiento...');
        const concurrentPromises = Array.from({ length: 50 }, (_, i) => {
            const method = i % 3 === 0 ? 'POST' : (i % 3 === 1 ? 'PUT' : 'DELETE');
            return request('/api/auth/login', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ floodIndex: i })
            });
        });

        const responses = await Promise.all(concurrentPromises);
        let blockedCount = 0;
        for (const res of responses) {
            if (res.status === 503 && res.body?.error === 'SYSTEM_MAINTENANCE') {
                blockedCount++;
                assert.equal(res.headers.get('retry-after'), '30', 'Debe incluir encabezado Retry-After: 30');
            }
        }

        assert.equal(blockedCount, 50, `Las 50 peticiones mutativas deben ser bloqueadas con 503 (Bloqueadas: ${blockedCount})`);
        console.log(`  ok - 50/50 peticiones concurrentes rechazadas atómicamente con HTTP 503 y Retry-After: 30`);

        // -------------------------------------------------------------
        // Prueba 5: Bloqueo de webhooks mutativos entrantes
        // -------------------------------------------------------------
        console.log('Prueba 5: Webhooks mutativos externos bloqueados para forzar retry del proveedor...');
        const webhookRes = await request('/api/webhooks/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ object: 'whatsapp_business_account' })
        });
        assert.equal(webhookRes.status, 503, 'Los webhooks mutativos deben responder 503 durante mantenimiento');
        assert.equal(webhookRes.body?.error, 'SYSTEM_MAINTENANCE');
        console.log('  ok - Webhook rechazado con 503 para reintento transparente del proveedor');

        // -------------------------------------------------------------
        // Prueba 6: Peticiones de solo lectura (GET/HEAD) permitidas
        // -------------------------------------------------------------
        console.log('Prueba 6: Peticiones de solo lectura (GET) procesadas sin bloqueo...');
        const getRes = await request('/api/health'); // o cualquier ruta GET
        assert.notEqual(getRes.status, 503, 'Las solicitudes de lectura no deben ser bloqueadas');
        console.log('  ok - Tráfico de solo lectura preservado');

        // -------------------------------------------------------------
        // Prueba 7: Bypass administrativo con token SHA-256 verificado
        // -------------------------------------------------------------
        console.log('Prueba 7: Solicitud mutativa con token administrativo de bypass...');
        const bypassRes = await request('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-maintenance-bypass': bypassSecret
            },
            body: JSON.stringify({ email: 'owner@autosporting.com', password: 'wrong' })
        });
        // Debe atravesar el middleware de mantenimiento y llegar a la autenticación (no dar 503)
        assert.notEqual(bypassRes.status, 503, 'Con token de bypass válido no debe dar 503');
        console.log('  ok - Bypass administrativo autorizado exitosamente');

        // -------------------------------------------------------------
        // Prueba 8: Rechazo de token de bypass inválido
        // -------------------------------------------------------------
        console.log('Prueba 8: Rechazo de token de bypass apócrifo...');
        const fakeBypassRes = await request('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-maintenance-bypass': 'clave-falsa-maliciosa'
            },
            body: JSON.stringify({ email: 'owner@autosporting.com', password: 'wrong' })
        });
        assert.equal(fakeBypassRes.status, 503, 'Con token falso debe ser rechazado con 503');
        console.log('  ok - Token apócrifo rechazado con HTTP 503');

        // -------------------------------------------------------------
        // Prueba 9: Drenaje verificable de operaciones activas (drainActiveWrites)
        // -------------------------------------------------------------
        console.log('Prueba 9: Verificación de drenaje de escrituras en vuelo (currentOp)...');
        const db = mongoose.connection.db;
        const drainResult = await maintenanceService.drainActiveWrites({ db, timeoutMs: 5000 });
        assert.equal(drainResult.drained, true, 'El drenaje debe completarse exitosamente');
        assert.equal(drainResult.activeWrites, 0, 'No deben persistir operaciones de escritura activas');

        const stateAfterDrain = await maintenanceService.checkMaintenanceState();
        assert.equal(stateAfterDrain.mode, 'MAINTENANCE', 'El modo debe haber transicionado a MAINTENANCE tras drenar');
        console.log(`  ok - Drenaje confirmado (0 escrituras activas) en ${drainResult.durationMs}ms`);

        // -------------------------------------------------------------
        // Prueba 10: Aplicación de validador estricto a nivel de motor (collMod)
        // -------------------------------------------------------------
        console.log('Prueba 10: Aplicación de regla de motor WiredTiger (collMod) en auditlogs...');
        const collModResult = await maintenanceService.applyStrictAuditValidator({ db });
        assert.equal(collModResult.applied, true, 'El validador de motor debe aplicarse');
        console.log('  ok - Regla de motor WiredTiger configurada para validación estricta');

        // -------------------------------------------------------------
        // Prueba 11: Sonda de inyección negativa (Negative Write Probe)
        // -------------------------------------------------------------
        console.log('Prueba 11: Sonda de inyección negativa (intento de inserción directa sin hash)...');
        const probeResult = await maintenanceService.runNegativeWriteProbe({ db });
        assert.equal(probeResult.rejected, true, 'La inserción sin campos HMAC debe ser rechazada por el motor');
        assert.equal(probeResult.errorCode, 121, 'El código de error debe ser 121 (DocumentValidationFailure)');
        console.log(`  ok - ${probeResult.message}`);

        // -------------------------------------------------------------
        // Prueba 12: Inserción válida de auditoría aceptada por el motor
        // -------------------------------------------------------------
        console.log('Prueba 12: Verificación de que registros HMAC válidos son aceptados por el motor...');
        const validAudit = new AuditLog({
            userId: String(owner._id),
            userName: owner.name,
            userEmail: owner.email,
            userRole: owner.role,
            action: 'MAINTENANCE_SEAL_TEST',
            module: 'seguridad',
            description: 'Registro de auditoría sellado de prueba'
        });
        await validAudit.save();
        assert.ok(validAudit.currentHash, 'Debe calcularse y persistirse el hash');
        console.log('  ok - Inserción válida con HMAC persistida con éxito en el motor validado');

        // -------------------------------------------------------------
        // Prueba 13: Liberación del pestillo y restitución de operatividad
        // -------------------------------------------------------------
        console.log('Prueba 13: Liberación del pestillo y restitución completa...');
        const releasedLock = await maintenanceService.releaseMaintenanceLock();
        assert.equal(releasedLock.active, false, 'El pestillo debe quedar inactivo');
        assert.equal(releasedLock.mode, 'IDLE', 'El modo debe volver a IDLE');

        const postReleaseRes = await request('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'owner@autosporting.com', password: 'wrong' })
        });
        assert.notEqual(postReleaseRes.status, 503, 'Tras la liberación no debe responder 503');
        console.log('  ok - Sistema restituido a operatividad plena (IDLE)');

        console.log('\n✅ TODAS LAS PRUEBAS DE MANTENIMIENTO Y DRENAJE PASARON EXITOSAMENTE (13/13)\n');
    } finally {
        await teardown();
    }
}

runTests().catch((err) => {
    console.error('\n❌ ERROR EN PRUEBAS DE MANTENIMIENTO Y DRENAJE:', err);
    process.exit(1);
});
