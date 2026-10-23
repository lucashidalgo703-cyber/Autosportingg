import crypto from 'crypto';
import AdminUser from '../models/AdminUser.js';
import PasskeyCredential from '../models/PasskeyCredential.js';
import TrustedDevice from '../models/TrustedDevice.js';
import UserSession from '../models/UserSession.js';
import AuditLog, { computeAuditHash } from '../models/AuditLog.js';

/**
 * Procedimiento Administrativo de Recuperación Fuera de Banda (Out-of-Band Disaster Recovery)
 * Diseñado para ejecutarse exclusivamente desde la estación de trabajo confiable del propietario
 * mediante CLI con conexión directa y autenticada a MongoDB Atlas.
 *
 * CERO ENDPOINTS PÚBLICOS: No expone ninguna superficie de ataque en Vercel ni Express.
 * PRESERVACIÓN DE DATOS: No muta ventas, cobros, vehículos ni balances contables.
 */
export async function executeOwnerEmergencyRecovery({
    email,
    masterRecoveryKey,
    temporaryPassword = null,
    reason = 'Dispositivo extraviado y códigos de respaldo agotados'
} = {}) {
    // 1. Validar clave maestra fuera de banda
    const expectedKey = process.env.MASTER_RECOVERY_KEY || process.env.EMERGENCY_RECOVERY_KEY;
    if (!expectedKey) {
        const err = new Error('MASTER_RECOVERY_KEY no está configurada en las variables de entorno seguras.');
        err.code = 'MISSING_RECOVERY_CONFIG';
        throw err;
    }

    if (!masterRecoveryKey || typeof masterRecoveryKey !== 'string') {
        const err = new Error('Se requiere la clave maestra de recuperación.');
        err.code = 'INVALID_MASTER_RECOVERY_KEY';
        throw err;
    }

    // Comparación en tiempo constante para evitar ataques de temporización
    const inputHash = crypto.createHash('sha256').update(masterRecoveryKey.trim()).digest();
    const expectedHash = crypto.createHash('sha256').update(expectedKey.trim()).digest();
    if (!crypto.timingSafeEqual(inputHash, expectedHash)) {
        const err = new Error('Clave maestra de recuperación incorrecta.');
        err.code = 'INVALID_MASTER_RECOVERY_KEY';
        throw err;
    }

    // 2. Localizar y validar al usuario propietario
    if (!email || typeof email !== 'string') {
        const err = new Error('Correo electrónico del propietario requerido.');
        err.code = 'INVALID_EMAIL';
        throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const owner = await AdminUser.findOne({ email: normalizedEmail });

    if (!owner || owner.role !== 'owner' || !owner.active) {
        const err = new Error('El usuario especificado no existe, está inactivo o no posee el rol de Propietario.');
        err.code = 'OWNER_NOT_FOUND';
        throw err;
    }

    // 3. Resetear configuración de segundo factor en el modelo AdminUser
    owner.twoFactorEnabled = false;
    owner.twoFactorSecret = null;
    owner.recoveryCodes = [];
    owner.forcePasswordReset = true;
    owner.tokenVersion = (owner.tokenVersion || 0) + 1;

    let generatedTempPassword = null;
    if (temporaryPassword && typeof temporaryPassword === 'string') {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(temporaryPassword.trim(), salt, 64).toString('hex');
        owner.passwordHash = `${salt}:${hash}`;
        generatedTempPassword = temporaryPassword.trim();
    }

    await owner.save();

    // 4. Revocar todas las Passkeys activas del propietario
    const passkeysResult = await PasskeyCredential.updateMany(
        { userId: owner._id, status: 'active' },
        {
            $set: {
                status: 'revoked',
                revokedAt: new Date(),
                revocationReason: `EMERGENCY_RECOVERY: ${reason}`,
                revokedBy: {
                    userId: String(owner._id),
                    name: 'OWNER_CLI_RECOVERY'
                }
            }
        }
    );

    // 5. Revocar todas las terminales registradas previamente
    const devicesResult = await TrustedDevice.updateMany(
        {
            status: { $ne: 'revoked' },
            $or: [
                { 'registeredBy.userId': String(owner._id) },
                { 'registeredBy.userId': owner._id },
                { registeredBy: { $exists: false } },
                { 'registeredBy.userId': null },
                { 'registeredBy.userId': { $exists: false } }
            ]
        },
        {
            $set: {
                status: 'revoked',
                revokedAt: new Date(),
                revocationReason: `EMERGENCY_RECOVERY: ${reason}`
            },
            $push: {
                trustHistory: {
                    event: 'DISPOSITIVO_REVOCADO',
                    authMethod: 'system',
                    details: `Revocación por recuperación de emergencia: ${reason}`
                }
            }
        }
    );

    // 6. Invalidar todas las sesiones activas en MongoDB
    const sessionsResult = await UserSession.updateMany(
        { userId: owner._id, status: 'active' },
        {
            $set: {
                status: 'revoked',
                revokedAt: new Date(),
                revocationReason: `EMERGENCY_RECOVERY: ${reason}`
            }
        }
    );

    // 7. Generar registro inmutable de auditoría con HMAC
    const auditRecord = new AuditLog({
        userId: String(owner._id),
        userName: owner.name,
        userEmail: owner.email,
        userRole: owner.role,
        action: 'OWNER_MFA_EMERGENCY_RESET',
        module: 'seguridad',
        entityType: 'AdminUser',
        entityId: String(owner._id),
        entityLabel: owner.email,
        description: `Recuperación de emergencia fuera de banda ejecutada. 2FA restablecido y sesiones revocadas para ${owner.email}.`,
        metadata: {
            reason,
            executedBy: 'OWNER_CLI_RECOVERY',
            revokedPasskeysCount: passkeysResult.modifiedCount,
            revokedDevicesCount: devicesResult.modifiedCount,
            revokedSessionsCount: sessionsResult.modifiedCount
        }
    });
    await auditRecord.save();

    // 8. Disparar alerta automática de seguridad
    try {
        const { triggerEmergencyRecoveryAlert } = await import('./securityAlertService.js');
        await triggerEmergencyRecoveryAlert({ userEmail: owner.email, reason });
    } catch {}

    return {
        success: true,
        ok: true,
        email: owner.email,
        temporaryPassword: generatedTempPassword,
        action: 'OWNER_MFA_EMERGENCY_RESET',
        revokedPasskeys: passkeysResult.modifiedCount,
        revokedDevices: devicesResult.modifiedCount,
        revokedSessions: sessionsResult.modifiedCount,
        forcePasswordReset: true,
        auditLogId: auditRecord._id,
        auditHash: auditRecord.currentHash
    };
}

export const executeEmergencyRecovery = executeOwnerEmergencyRecovery;
