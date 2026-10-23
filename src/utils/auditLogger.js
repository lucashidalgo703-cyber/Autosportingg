import AuditLog from '../models/AuditLog.js';
import { getTrustedClientIp } from './securityIpResolver.js';

const logAudit = async ({ 
    req, 
    user: explicitUser,
    action, 
    module, 
    entityType, 
    entityId, 
    entityLabel, 
    description, 
    metadata, 
    deviceId: explicitDeviceId,
    deviceName: explicitDeviceName,
    deviceStatus: explicitDeviceStatus,
    sessionId: explicitSessionId,
    strict = false,
    session = null 
}) => {
    if (!action || !module) {
        throw new Error('Action and module are required for audit logs');
    }

    // Datos del usuario autenticado (priorizar explicitUser si se suministra, ej. en login antes de middleware)
    const user = explicitUser || req?.user || {};
    
    // Resolución de IP no manipulable
    const ip = req ? getTrustedClientIp(req) : 'system';
    const userAgent = req?.headers?.['user-agent'] || 'system';

    // Resolución de Dispositivo y Sesión (priorizar explícito, luego inyectados por middleware o cabeceras)
    const deviceId = explicitDeviceId || req?.deviceId || req?.headers?.['x-device-id'] || user?.deviceId || undefined;
    const deviceName = explicitDeviceName || req?.deviceName || user?.deviceName || (deviceId ? 'Dispositivo desconocido' : undefined);
    const deviceStatus = explicitDeviceStatus || req?.deviceStatus || user?.deviceStatus || (deviceId ? 'unknown' : undefined);
    const sessionId = explicitSessionId || req?.sessionId || user?.sessionId || undefined;

    // Sanitización estricta de metadata para no exponer información confidencial
    let safeMetadata = undefined;
    if (metadata) {
        try {
            safeMetadata = JSON.parse(JSON.stringify(metadata));
            const sensitiveKeys = ['password', 'passwordhash', 'token', 'authorization', 'secret', 'recoverycodes', 'privatekey'];
            
            const sanitizeObject = (obj) => {
                for (const key in obj) {
                    if (sensitiveKeys.includes(key.toLowerCase())) {
                        obj[key] = '***REDACTED***';
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        sanitizeObject(obj[key]);
                    }
                }
            };
            sanitizeObject(safeMetadata);
        } catch {
            safeMetadata = { error: 'No serializable metadata' };
        }
    }

    const logEntry = new AuditLog({
        userId: user._id || user.id || 'system',
        userName: user.username || user.name || 'System',
        userEmail: user.email || 'system',
        userRole: user.role || 'system',
        action,
        module,
        entityType,
        entityId: entityId ? String(entityId) : undefined,
        entityLabel,
        description,
        metadata: safeMetadata,
        ip,
        userAgent,
        deviceId,
        deviceName,
        deviceStatus,
        sessionId
    });

    try {
        const saveOptions = session ? { session } : {};
        await logEntry.save(saveOptions);
        return true;
    } catch (error) {
        console.error('Error interno registrando auditoría:', error.message);
        if (strict) {
            throw error;
        }
        return false;
    }
};

const logSystemAudit = async (params) => {
    return logAudit({ ...params, req: null });
};

export { logAudit, logSystemAudit };
export default logAudit;
