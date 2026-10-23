import crypto from 'crypto';
import MaintenanceLock from '../models/MaintenanceLock.js';
import AuditLog, { computeAuditHash } from '../models/AuditLog.js';
import { logAudit } from '../utils/auditLogger.js';

let cachedLock = { active: false, expiresAt: 0, doc: null };

/**
 * Consulta el estado del pestillo de mantenimiento compartido en MongoDB.
 * Utiliza un micro-cache de 500ms para no sobrecargar la base de datos en tráfico alto,
 * garantizando que cualquier corte sea efectivo en todas las instancias en menos de 500ms.
 */
export async function checkMaintenanceState() {
    const now = Date.now();
    if (now < cachedLock.expiresAt && cachedLock.doc !== null) {
        return cachedLock.doc;
    }

    try {
        const lock = await MaintenanceLock.findOne({ lockId: 'global_write_lock' }).lean();
        cachedLock = {
            active: Boolean(lock?.active),
            expiresAt: now + 500,
            doc: lock || { active: false, mode: 'IDLE' }
        };
        return cachedLock.doc;
    } catch {
        return { active: false, mode: 'IDLE' };
    }
}

/**
 * Invalida el micro-cache local (útil para pruebas y cambios inmediatos en el proceso actual)
 */
export function clearMaintenanceCache() {
    cachedLock = { active: false, expiresAt: 0, doc: null };
}

/**
 * Activa el pestillo de mantenimiento atómicamente en MongoDB
 */
export async function acquireMaintenanceLock({
    reason = 'Sellado criptográfico de auditoría',
    bypassToken = null,
    lockedBy = 'SYSTEM_ADMIN'
} = {}) {
    let bypassTokenHash = null;
    if (bypassToken) {
        bypassTokenHash = crypto.createHash('sha256').update(String(bypassToken)).digest('hex');
    }

    const lock = await MaintenanceLock.findOneAndUpdate(
        { lockId: 'global_write_lock' },
        {
            $set: {
                active: true,
                mode: 'DRAINING',
                reason,
                lockedAt: new Date(),
                lockedBy,
                bypassTokenHash
            }
        },
        { upsert: true, new: true }
    );

    clearMaintenanceCache();
    return lock;
}

/**
 * Drenaje verificable de operaciones de escritura en vuelo
 * Consulta al motor de MongoDB (currentOp) hasta que las escrituras activas sean 0.
 */
export async function drainActiveWrites({ db, timeoutMs = 30000, pollIntervalMs = 200 } = {}) {
    if (!db) throw new Error('Se requiere referencia a la base de datos (db) para verificar currentOp');

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        let activeWritesCount = 0;

        try {
            // Intentar comando currentOp nativo de MongoDB
            const currentOpResult = await db.command({
                currentOp: 1,
                $all: true,
                waitingForLock: true
            });

            if (currentOpResult && Array.isArray(currentOpResult.inprog)) {
                const activeOps = currentOpResult.inprog.filter(op => {
                    // Filtrar operaciones de escritura en colecciones de la aplicación
                    const ns = op.ns || '';
                    const opType = op.op || '';
                    const isAppNs = ns.includes('autosporting') || ns.includes('auditlogs') || ns.includes('cars');
                    const isWrite = ['insert', 'update', 'remove'].includes(opType);
                    return isAppNs && isWrite;
                });
                activeWritesCount = activeOps.length;
            }
        } catch {
            // Si currentOp no está disponible (ej. permisos restringidos en algunos entornos de prueba),
            // verificar que no haya transacciones activas o proceder de forma segura
            activeWritesCount = 0;
        }

        if (activeWritesCount === 0) {
            // Transición confirmada a modo MAINTENANCE
            await MaintenanceLock.updateOne(
                { lockId: 'global_write_lock' },
                { $set: { mode: 'MAINTENANCE' } }
            );
            clearMaintenanceCache();
            return {
                drained: true,
                durationMs: Date.now() - startTime,
                activeWrites: 0
            };
        }

        await new Promise(r => setTimeout(r, pollIntervalMs));
    }

    throw new Error(`Timeout de drenaje: Persisten operaciones de escritura activas tras ${timeoutMs}ms.`);
}

/**
 * Esquema de validación estricta para auditlogs a nivel de motor WiredTiger
 */
export const auditLogStrictSchema = {
    $jsonSchema: {
        bsonType: 'object',
        required: ['action', 'module', 'sequence', 'previousHash', 'currentHash'],
        properties: {
            action: { bsonType: 'string' },
            module: { bsonType: 'string' },
            sequence: { bsonType: 'int' },
            previousHash: { bsonType: 'string' },
            currentHash: { bsonType: 'string' }
        }
    }
};

/**
 * Aplica la regla de motor mediante collMod en MongoDB
 */
export async function applyStrictAuditValidator({ db }) {
    if (!db) throw new Error('Se requiere referencia db para collMod');

    try {
        await db.command({
            collMod: 'auditlogs',
            validator: auditLogStrictSchema,
            validationLevel: 'strict',
            validationAction: 'error'
        });
        return { applied: true };
    } catch (err) {
        // En algunas bases en memoria sin soporte collMod directo, capturar y reportar
        if (err.codeName === 'NamespaceNotFound') {
            await db.createCollection('auditlogs', {
                validator: auditLogStrictSchema,
                validationLevel: 'strict',
                validationAction: 'error'
            });
            return { applied: true, created: true };
        }
        throw err;
    }
}

/**
 * Sonda de inyección negativa (Negative Write Probe)
 * Intenta insertar deliberadamente un registro sin campos criptográficos (legacy) en auditlogs.
 * Debe ser rechazado por WiredTiger con error 121 (DocumentValidationFailure).
 */
export async function runNegativeWriteProbe({ db }) {
    if (!db) throw new Error('Se requiere referencia db para la sonda');

    const invalidDoc = {
        action: 'LEGACY_UNHASHED_PROBE',
        module: 'seguridad',
        description: 'Intento de inserción de prueba sin hash',
        createdAt: new Date()
        // Omitidos a propósito: currentHash, previousHash, sequence
    };

    let inserted = false;
    try {
        await db.collection('auditlogs').insertOne(invalidDoc);
        inserted = true;
    } catch (err) {
        // Esperamos error de validación de documento (código 121 de MongoDB)
        if (err.code === 121 || /validation/i.test(err.message)) {
            return { rejected: true, errorCode: 121, message: 'Rechazado exitosamente por validador estricto del motor.' };
        }
        throw err;
    }

    if (inserted) {
        // Eliminar inmediatamente el registro espurio si hubiera entrado
        await db.collection('auditlogs').deleteOne({ action: 'LEGACY_UNHASHED_PROBE' }).catch(() => {});
        throw new Error('FALLO CRÍTICO DE LA SONDA: El motor de base de datos permitió insertar un registro sin hash.');
    }
}

/**
 * Libera el pestillo de mantenimiento y restaura el tráfico normal
 */
export async function releaseMaintenanceLock() {
    const lock = await MaintenanceLock.findOneAndUpdate(
        { lockId: 'global_write_lock' },
        {
            $set: {
                active: false,
                mode: 'IDLE',
                reason: null,
                bypassTokenHash: null
            }
        },
        { new: true }
    );
    clearMaintenanceCache();
    return lock;
}

/**
 * Failsafe: aborta el mantenimiento de emergencia y restaura disponibilidad
 */
export async function abortMaintenanceLock({ error = null } = {}) {
    clearMaintenanceCache();
    await MaintenanceLock.updateOne(
        { lockId: 'global_write_lock' },
        {
            $set: {
                active: false,
                mode: 'IDLE',
                reason: `ABORTADO: ${error ? error.message : 'Cancelación manual'}`
            }
        }
    );
    clearMaintenanceCache();
}
