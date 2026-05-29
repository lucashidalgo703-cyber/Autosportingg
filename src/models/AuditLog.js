import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    userId: { type: String },
    userName: { type: String },
    userEmail: { type: String },
    userRole: { type: String },
    action: { type: String, required: true },
    module: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: String },
    entityLabel: { type: String },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String }
}, { 
    timestamps: true 
});

// Índices para optimizar búsquedas frecuentes
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ module: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
