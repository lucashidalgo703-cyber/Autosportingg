import AuditLog from '../models/AuditLog.js';

const logAudit = async ({ req, action, module, entityType, entityId, entityLabel, description, metadata, strict = false }) => {
    if (!action || !module) {
        throw new Error('Action and module are required for audit logs');
    }

    // Obtenemos los datos del request de forma segura
    const user = req?.user || {};
    const ip = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || 'system';
    const userAgent = req?.headers?.['user-agent'] || 'system';

    // Sanitización estricta de metadata para no exponer información confidencial
    let safeMetadata = undefined;
    if (metadata) {
        safeMetadata = JSON.parse(JSON.stringify(metadata));
        const sensitiveKeys = ['password', 'passwordhash', 'token', 'authorization', 'secret'];
        
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
        userAgent
    });

    try {
        await logEntry.save();
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
