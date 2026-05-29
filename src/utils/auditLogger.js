import AuditLog from '../models/AuditLog.js';

const logAudit = async ({ req, action, module, entityType, entityId, entityLabel, description, metadata }) => {
    try {
        // Obtenemos los datos del request de forma segura
        const user = req?.user || {};
        const ip = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '';
        const userAgent = req?.headers?.['user-agent'] || '';

        // Sanitización estricta de metadata para no exponer información confidencial
        let safeMetadata = undefined;
        if (metadata) {
            safeMetadata = JSON.parse(JSON.stringify(metadata));
            const sensitiveKeys = ['password', 'passwordHash', 'token', 'authorization'];
            
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

        await logEntry.save();
    } catch (error) {
        // Es imperativo no interrumpir el flujo del sistema si falla el log de auditoría
        console.error('Error interno registrando auditoría:', error.message);
    }
};

export { logAudit };
