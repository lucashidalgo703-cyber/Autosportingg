import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Esquema de Suscripciones Web Push del Propietario
 * Conforme a estándares W3C Push API, RFC 8291 (Message Encryption) y RFC 8292 (VAPID).
 * Vinculación exclusiva a cuentas con rol de Propietario ('owner').
 */
const pushSubscriptionSchema = new mongoose.Schema({
    subscriptionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        required: true,
        index: true
    },
    endpoint: {
        type: String,
        required: true
    },
    endpointHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    keys: {
        p256dh: {
            type: String,
            required: true
        },
        auth: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        enum: ['active', 'revoked', 'expired'],
        default: 'active',
        index: true
    },
    revokedAt: {
        type: Date,
        default: null
    },
    revokedReason: {
        type: String,
        default: null
    },
    deviceInfo: {
        deviceId: { type: String, default: null },
        deviceName: { type: String, default: 'Dispositivo móvil' },
        os: { type: String, default: 'unknown' },
        browser: { type: String, default: 'unknown' },
        ip: { type: String, default: null },
        userAgent: { type: String, default: null }
    },
    preferences: {
        nonCriticalEnabled: {
            type: Boolean,
            default: true
        }
    },
    stats: {
        sentCount: { type: Number, default: 0 },
        failureCount: { type: Number, default: 0 },
        lastDeliveredAt: { type: Date, default: null },
        lastFailureAt: { type: Date, default: null },
        lastFailureReason: { type: String, default: null }
    },
    lastSeenAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

pushSubscriptionSchema.index({ userId: 1, status: 1 });
pushSubscriptionSchema.index({ createdAt: -1 });

/**
 * Genera el hash determinístico del endpoint para búsquedas rápidas e índices eficientes
 */
pushSubscriptionSchema.statics.hashEndpoint = function(endpoint) {
    if (!endpoint || typeof endpoint !== 'string') return '';
    return crypto.createHash('sha256').update(endpoint.trim()).digest('hex');
};

const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);
export default PushSubscription;
