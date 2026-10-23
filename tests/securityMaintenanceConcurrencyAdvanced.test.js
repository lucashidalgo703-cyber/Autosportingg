/**
 * AUTOSPORTING INTELLIGENCE — PRUEBAS DE CONCURRENCIA AVANZADA Y RESILIENCIA DEL PESTILLO DE MANTENIMIENTO
 * 
 * Verificación exhaustiva de 6 escenarios de concurrencia y límites:
 * 1. Dos workers/procesos independientes con microcaché desacoplada (aislamiento de instancias serverless).
 * 2. Petición en vuelo que cruza la compuerta antes del lock con demora artificial de I/O (drenaje limpio y seguro).
 * 3. Petición que llega en la ventana de transición ('DRAINING') rechazada inmediatamente con 503 y Retry-After: 30.
 * 4. Fallo/timeout de base de datos durante la verificación del lock (postura de seguridad fail-closed con 503).
 * 5. Reintento de webhooks entrantes (Meta WhatsApp) durante y post mantenimiento (procesamiento único e idempotencia).
 * 6. Auditoría de métodos mutativos no-POST (PUT, PATCH, DELETE) bloqueados vs métodos GET permitidos.
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
let CommunicationLog;
let Lead;
let drainService;

async function setup() {
    mongod = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongod.getUri('autosporting_maintenance_concurrency_test');
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.AUDIT_HMAC_SECRET = 'audit-secret-concurrency-test-key';
    process.env.MASTER_RECOVERY_KEY = 'master-recovery-key-concurrency-test';
    process.env.NODE_ENV = 'production';

    const dbModule = await import('../src/config/db.js');
    await dbModule.default();

    mongoose = (await import('mongoose')).default;
    AdminUser = (await import('../src/models/AdminUser.js')).default;
    MaintenanceLock = (await import('../src/models/MaintenanceLock.js')).default;
    CommunicationLog = (await import('../src/models/CommunicationLog.js')).default;
    Lead = (await import('../src/models/Lead.js')).default;
    drainService = await import('../src/services/maintenanceDrainService.js');

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
    console.log('=== INICIO DE PRUEBAS DE CONCURRENCIA AVANZADA DE MANTENIMIENTO ===\n');
    await setup();

    try {
        const jwt = (await import('jsonwebtoken')).default;

        const owner = await AdminUser.create({
            name: 'Tomas Propietario',
            email: 'owner@autosporting.com',
            passwordHash: 'dummy_hash',
            role: 'owner',
            active: true
        });

        const ownerToken = jwt.sign(
            {
                id: String(owner._id),
                userId: String(owner._id),
                email: owner.email,
                role: 'owner'
            },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // -------------------------------------------------------------
        // Escenario 1: Dos workers independientes con microcaché desacoplada
        // -------------------------------------------------------------
        console.log('Escenario 1: Dos workers independientes con microcaché desacoplada (simulación serverless)...');
        // Worker 1 adquiere el lock en base de datos
        await drainService.acquireMaintenanceLock({
            reason: 'Mantenimiento preventivo cluster',
            lockedBy: 'WORKER_1'
        });

        // Worker 2 (con su propio caché independiente) consulta MongoDB
        drainService.clearMaintenanceCache(); // Simula caché no inicializado de Worker 2
        const worker2State = await drainService.checkMaintenanceState();
        assert.equal(worker2State.active, true, 'Worker 2 debe leer el estado activo desde MongoDB');
        assert.equal(worker2State.mode, 'DRAINING', 'Worker 2 debe ver el modo DRAINING');

        // Petición mutativa a la API atendida por Worker 2
        const w2Res = await fetch(`${base}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'Usuario Prueba', email: 'test@auto.com' })
        });
        assert.equal(w2Res.status, 503, 'Worker 2 debe rechazar escrituras con 503');
        assert.equal(w2Res.headers.get('retry-after'), '30');
        console.log('  ok - Microcaché desacoplada sincronizada: Worker 2 rechaza escrituras con 503 y Retry-After: 30');

        // Liberar para el siguiente escenario
        await drainService.releaseMaintenanceLock();
        drainService.clearMaintenanceCache();

        // -------------------------------------------------------------
        // Escenario 2: Petición en vuelo con demora artificial de I/O
        // -------------------------------------------------------------
        console.log('Escenario 2: Petición que pasa la compuerta antes del lock con demora artificial de I/O...');
        // Simular operación de base de datos que inició antes del lock
        let writeCompleted = false;
        const delayedWritePromise = (async () => {
            // Chequeo de lock pre-compuerta (estaba IDLE)
            const preState = await drainService.checkMaintenanceState();
            assert.equal(preState.active, false);

            // Simular demora artificial de red / I/O de 100ms
            await new Promise(r => setTimeout(r, 100));

            // Escritura completada limpiamente
            await Lead.create({
                name: 'Cliente En Vuelo',
                firstName: 'Cliente En Vuelo',
                phone: '+5491199998888',
                source: 'web'
            });
            writeCompleted = true;
        })();

        // Inmediatamente después de cruzar la compuerta, se adquiere el lock
        await drainService.acquireMaintenanceLock({ reason: 'Drenaje de prueba' });

        // Esperar a que la operación en vuelo termine
        await delayedWritePromise;
        assert.equal(writeCompleted, true, 'La operación que cruzó antes de la compuerta debe completar');

        // Drenaje confirma cero escrituras activas y pasa a MAINTENANCE
        const drainResult = await drainService.drainActiveWrites({ db: mongoose.connection.db, timeoutMs: 5000 });
        assert.equal(drainResult.drained, true);
        const postDrainLock = await drainService.checkMaintenanceState();
        assert.equal(postDrainLock.mode, 'MAINTENANCE');
        console.log('  ok - Operación en vuelo completó limpiamente y el drenaje verificó 0 escrituras activas');

        // Liberar lock
        await drainService.releaseMaintenanceLock();
        drainService.clearMaintenanceCache();

        // -------------------------------------------------------------
        // Escenario 3: Petición en ventana de transición 'DRAINING' rechazada con 503
        // -------------------------------------------------------------
        console.log('Escenario 3: Petición que llega durante la transición DRAINING rechazada con 503...');
        await MaintenanceLock.updateOne(
            { lockId: 'global_write_lock' },
            { $set: { active: true, mode: 'DRAINING', reason: 'Drenando operaciones previas' } },
            { upsert: true }
        );
        drainService.clearMaintenanceCache();

        const drainingReq = await fetch(`${base}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'Falla Draining' })
        });

        assert.equal(drainingReq.status, 503);
        assert.equal(drainingReq.headers.get('retry-after'), '30');
        const drainingBody = await drainingReq.json();
        assert.equal(drainingBody.error, 'SYSTEM_MAINTENANCE');
        assert.equal(drainingBody.mode, 'DRAINING');
        console.log('  ok - Rechazo inmediato en fase DRAINING con Retry-After: 30');

        await drainService.releaseMaintenanceLock();
        drainService.clearMaintenanceCache();

        // -------------------------------------------------------------
        // Escenario 4: Fallo de base de datos durante la verificación del lock (Fail-Closed)
        // -------------------------------------------------------------
        console.log('Escenario 4: Fallo/timeout simulado de DB durante verificación de lock (postura fail-closed)...');
        // Sobrescribir temporalmente findOne de MaintenanceLock para simular timeout/desconexión
        const originalFindOne = MaintenanceLock.findOne;
        MaintenanceLock.findOne = function() {
            return {
                lean: async () => {
                    throw new Error('MongoServerSelectionError: Server selection timed out after 5000 ms');
                }
            };
        };
        drainService.clearMaintenanceCache();

        const dbFailReq = await fetch(`${base}/api/admin/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ownerToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'Intento durante fallo DB' })
        });

        // Debe fallar de forma segura (fail-closed) con 503 sin dejar escribir en estado indeterminado
        assert.equal(dbFailReq.status, 503);
        assert.equal(dbFailReq.headers.get('retry-after'), '10');
        const dbFailBody = await dbFailReq.json();
        assert.equal(dbFailBody.error, 'LOCK_CHECK_DATABASE_UNAVAILABLE');
        console.log('  ok - Comportamiento determinístico y seguro ante caída de DB (Fail-Closed con 503)');

        // Restaurar findOne
        MaintenanceLock.findOne = originalFindOne;
        drainService.clearMaintenanceCache();

        // -------------------------------------------------------------
        // Escenario 5: Reintento de webhook de WhatsApp e idempotencia
        // -------------------------------------------------------------
        console.log('Escenario 5: Reintento de webhook Meta WhatsApp (idempotencia y 0 duplicados)...');
        const uniqueMessageId = `wam_test_concurrency_${Date.now()}`;
        const webhookPayload = {
            object: 'whatsapp_business_account',
            entry: [{
                id: 'WHATSAPP_ACC_1',
                changes: [{
                    value: {
                        messaging_product: 'whatsapp',
                        metadata: { display_phone_number: '12345678', phone_number_id: 'PN_1' },
                        contacts: [{ profile: { name: 'Comprador WhatsApp' }, wa_id: '5491112345678' }],
                        messages: [{
                            from: '5491112345678',
                            id: uniqueMessageId,
                            timestamp: String(Math.floor(Date.now() / 1000)),
                            text: { body: 'Hola quiero consultar por un auto financiado' },
                            type: 'text'
                        }]
                    },
                    field: 'messages'
                }]
            }]
        };

        // 5.1 Enviar durante mantenimiento -> Debe ser rechazado con 503
        await drainService.acquireMaintenanceLock({ reason: 'Mantenimiento programado' });
        const webhookDuringMaint = await fetch(`${base}/api/webhooks/whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });
        assert.equal(webhookDuringMaint.status, 503, 'Webhook debe recibir 503 para que Meta reintente');

        // 5.2 Levantar mantenimiento
        await drainService.releaseMaintenanceLock();
        drainService.clearMaintenanceCache();

        // 5.3 Primer intento post-mantenimiento -> Se procesa exitosamente
        const webhookPostMaint1 = await fetch(`${base}/api/webhooks/whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });
        assert.equal(webhookPostMaint1.status, 200);

        const logsFirstCount = await CommunicationLog.countDocuments({ externalId: uniqueMessageId });
        assert.equal(logsFirstCount, 1, 'Debe crearse exactamente 1 registro de comunicación');

        // 5.4 Reintento posterior de Meta con el mismo messageId -> Debe responder 200 pero omitir duplicado
        const webhookRetryMeta = await fetch(`${base}/api/webhooks/whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });
        assert.equal(webhookRetryMeta.status, 200);

        const logsSecondCount = await CommunicationLog.countDocuments({ externalId: uniqueMessageId });
        assert.equal(logsSecondCount, 1, 'No deben crearse registros duplicados en reintentos de Meta');
        console.log('  ok - Webhook procesado con idempotencia estricta: exactamente 1 mensaje registrado');

        // -------------------------------------------------------------
        // Escenario 6: Auditoría de métodos mutativos no-POST (PUT, PATCH, DELETE) vs GET
        // -------------------------------------------------------------
        console.log('Escenario 6: Bloqueo de rutas mutativas no-POST (PUT, PATCH, DELETE) vs GET...');
        await drainService.acquireMaintenanceLock({ reason: 'Sellado de seguridad' });

        // PUT debe recibir 503
        const putRes = await fetch(`${base}/api/admin/cars/dummy_car_id`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assert.equal(putRes.status, 503, 'PUT debe ser bloqueado con 503');

        // PATCH debe recibir 503
        const patchRes = await fetch(`${base}/api/admin/users/dummy_user_id/password`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assert.equal(patchRes.status, 503, 'PATCH debe ser bloqueado con 503');

        // DELETE debe recibir 503
        const deleteRes = await fetch(`${base}/api/admin/cars/dummy_car_id`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${ownerToken}` }
        });
        assert.equal(deleteRes.status, 503, 'DELETE debe ser bloqueado con 503');

        // GET (lectura) debe estar permitido (no 503)
        const getRes = await fetch(`${base}/api/public/cars`);
        assert.notEqual(getRes.status, 503, 'GET no debe ser bloqueado por el pestillo');
        assert.equal(getRes.status, 200, 'GET debe responder 200 OK');

        console.log('  ok - Todos los verbos mutativos (PUT, PATCH, DELETE) bloqueados con 503, GET permitido con 200');

        await drainService.releaseMaintenanceLock();
        drainService.clearMaintenanceCache();

        console.log('\n✅ TODAS LAS PRUEBAS DE CONCURRENCIA AVANZADA PASARON EXITOSAMENTE (6/6)\n');
    } finally {
        await teardown();
    }
}

runTests().catch((err) => {
    console.error('\n❌ ERROR EN PRUEBAS DE CONCURRENCIA AVANZADA:', err);
    process.exit(1);
});
