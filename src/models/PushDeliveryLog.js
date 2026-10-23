import mongoose from 'mongoose';

/**
 * Registro de Trazabilidad y Cola Persistente de Entregas Web Push
 * Distingue formalmente los estados del ciclo de vida:
 * 'pending' (Encolada en BD) -> 'processing' (En despacho) -> 'accepted' (201 Proveedor Push) 
 * | 'failed' (Reintentable con backoff) | 'exhausted' (Límite de reintentos alcanzado) | 'expired' (404/410 Suscripción baja)
 */
const pushDeliveryLogSchema = new mongoose.Schema({
    logId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    alertId: {
        type: String,
        required: true,
        index: true
    },
    subscriptionId: {
        type: String,
        required: true,
        index: true
    },
    endpointHash: {
        type: String,
        required: true,
        index: true
    },
    eventType: {
        type: String,
        required: true,
        index: true
    },
    severity: {
        type: String,
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'accepted', 'failed', 'exhausted', 'expired'],
        default: 'pending',
        required: true,
        index: true
    },
    statusCode: {
        type: Number,
        default: null
    },
    error: {
        type: String,
        default: null
    },
    attempt: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 3
    },
    nextRetryAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    attemptsHistory: [{
        attempt: Number,
        statusCode: Number,
        error: String,
        timestamp: { type: Date, default: Date.now }
    }],
    dispatchedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

pushDeliveryLogSchema.index({ status: 1, nextRetryAt: 1 });
pushDeliveryLogSchema.index({ alertId: 1, subscriptionId: 1 });
pushDeliveryLogSchema.index({ createdAt: -1 });

const PushDeliveryLog = mongoose.models.PushDeliveryLog || mongoose.model('PushDeliveryLog', pushDeliveryLogSchema);
export default PushDeliveryLog;
