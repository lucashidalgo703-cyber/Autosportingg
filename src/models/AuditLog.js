import mongoose from 'mongoose';
import crypto from 'crypto';

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
    // FASE 4: Integridad Criptográfica y Hash Chaining
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

// FASE 4: Hash Chaining criptográfico (SHA-256) garantizando cadena de custodia inmutable
auditLogSchema.pre('save', async function () {
    if (this.isNew && !this.currentHash) {
        const lastLog = await mongoose.models.AuditLog
            .findOne({}, { currentHash: 1 })
            .sort({ _id: -1 })
            .lean();

        this.previousHash = lastLog?.currentHash || 'GENESIS';

        const payloadToHash = [
            this.previousHash,
            this.action || '',
            this.module || '',
            this.userId || '',
            this.deviceId || '',
            this.description || '',
            this.createdAt ? this.createdAt.toISOString() : new Date().toISOString()
        ].join('|');

        this.currentHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
    }
});

// PROTECCIÓN DE INTEGRIDAD: Inmutabilidad estricta a nivel de esquema (Append-Only)
const blockMutation = function (next) {
    const err = new Error('Violación de Integridad: Los registros de auditoría son inmutables y no pueden modificarse ni eliminarse.');
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
