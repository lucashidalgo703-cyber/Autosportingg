import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Función canónica y determinística para calcular el HMAC-SHA256 de un registro de auditoría.
 * Protege contra manipulación offline al requerir la clave secreta de servidor.
 */
export function computeAuditHash({ previousHash, action, module, userId, deviceId, description, timestamp }) {
    const auditSecret = process.env.AUDIT_HMAC_SECRET || process.env.JWT_SECRET || 'autosporting-audit-internal-salt';
    const tsStr = timestamp ? (typeof timestamp === 'string' ? timestamp : (timestamp.toISOString ? timestamp.toISOString() : String(timestamp))) : '';
    const payloadToHash = [
        previousHash || 'GENESIS',
        action || '',
        module || '',
        userId || '',
        deviceId || '',
        description || '',
        tsStr
    ].join('|');

    return crypto.createHmac('sha256', auditSecret).update(payloadToHash).digest('hex');
}

const auditLogSchema = new mongoose.Schema({
    userId: { type: String, index: true },
    userName: { type: String },
    userEmail: { type: String },
    userRole: { type: String },
    action: { type: String, required: true, index: true },
    module: { type: String, required: true, index: true },
    entityType: { type: String },
    entityId: { type: String },
    entityLabel: { type: String },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
    // Identificación de Terminal y Sesión
    deviceId: { type: String, index: true },
    deviceName: { type: String, index: true }, // 'PC Agencia' | 'PC Privada' | 'Dispositivo desconocido'
    deviceStatus: { 
        type: String, 
        enum: ['trusted', 'pending_verification', 'revoked', 'unknown'], 
        default: 'unknown',
        index: true 
    },
    sessionId: { type: String, index: true },
    // Cadena de Custodia Criptográfica (HMAC-SHA256)
    sequence: { type: Number, index: true },
    previousHash: { type: String, default: 'GENESIS', index: true },
    currentHash: { type: String, index: true }
}, { 
    timestamps: true 
});

// Índices para optimizar búsquedas frecuentes y forensia por dispositivo
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ deviceId: 1, createdAt: -1 });
auditLogSchema.index({ sessionId: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, action: 1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

// Encadenamiento criptográfico HMAC-SHA256 garantizando cadena de custodia detectable
auditLogSchema.pre('save', async function () {
    if (this.isNew && !this.currentHash) {
        const lastLog = await mongoose.models.AuditLog
            .findOne({}, { currentHash: 1, sequence: 1 })
            .sort({ _id: -1 })
            .lean();

        this.previousHash = lastLog?.currentHash || 'GENESIS';
        this.sequence = (lastLog?.sequence || 0) + 1;

        const ts = this.createdAt || new Date();
        this.currentHash = computeAuditHash({
            previousHash: this.previousHash,
            action: this.action,
            module: this.module,
            userId: this.userId,
            deviceId: this.deviceId,
            description: this.description,
            timestamp: ts
        });
    }
});

// PROTECCIÓN DE INTEGRIDAD: Inmutabilidad a nivel de esquema Mongoose (Append-Only)
const blockMutation = function (next) {
    const err = new Error('Violación de Integridad: Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse mediante la API.');
    err.status = 403;
    if (typeof next === 'function') next(err);
    else throw err;
};

auditLogSchema.pre('updateOne', blockMutation);
auditLogSchema.pre('updateMany', blockMutation);
auditLogSchema.pre('findOneAndUpdate', blockMutation);
auditLogSchema.pre('deleteOne', blockMutation);
auditLogSchema.pre('deleteMany', blockMutation);
auditLogSchema.pre('findOneAndDelete', blockMutation);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
