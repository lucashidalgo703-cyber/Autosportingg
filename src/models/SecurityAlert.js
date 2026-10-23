import mongoose from 'mongoose';

/**
 * Esquema de Alertas Automáticas de Seguridad
 * Registra eventos sensibles, anomalías criptográficas e intentos de intrusión.
 * Permite marcar alertas como revisadas sin alterar ni eliminar los eventos originales de auditoría.
 */
const securityAlertSchema = new mongoose.Schema({
    alertId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'UNRECOGNIZED_DEVICE_LOGIN',
            'FAILED_LOGINS_FLOOD',
            'MFA_REPEATED_FAILURES',
            'REVOKED_DEVICE_ACCESS',
            'INVALID_SESSION_ACCESS',
            'PASSKEY_REGISTERED',
            'PASSKEY_REVOKED',
            'TRUSTED_DEVICE_REGISTERED',
            'AUTH_CONFIG_CHANGED',
            'EMERGENCY_RECOVERY_EXECUTED',
            'AUDIT_INTEGRITY_ANOMALY',
            'EXTERNAL_CHECKPOINT_FAILED'
        ],
        index: true
    },
    severity: {
        type: String,
        required: true,
        enum: ['info', 'warning', 'critical'],
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed'],
        default: 'pending',
        index: true
    },
    ip: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    userEmail: {
        type: String,
        default: null,
        index: true
    },
    deviceId: {
        type: String,
        default: null,
        index: true
    },
    sessionId: {
        type: String,
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    reviewedBy: {
        userId: String,
        name: String,
        email: String
    },
    reviewNotes: {
        type: String,
        default: null
    },
    notifiedChannels: {
        type: [String],
        default: ['internal']
    }
}, {
    timestamps: true
});

securityAlertSchema.index({ createdAt: -1 });
securityAlertSchema.index({ status: 1, severity: 1, createdAt: -1 });

const SecurityAlert = mongoose.models.SecurityAlert || mongoose.model('SecurityAlert', securityAlertSchema);
export default SecurityAlert;
