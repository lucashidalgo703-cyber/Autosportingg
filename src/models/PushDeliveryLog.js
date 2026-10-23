import mongoose from 'mongoose';

/**
 * Registro de Trazabilidad y Entregas Web Push
 * Distingue: Alerta generada -> Notificación encolada -> Envío aceptado por servicio push -> Error/Expiración
 */
const pushDeliveryLogSchema = new mongoose.Schema({
    logId: {
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
        required: true
    },
    severity: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'accepted', 'failed', 'expired'],
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
        default: 1
    },
    dispatchedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

pushDeliveryLogSchema.index({ alertId: 1, subscriptionId: 1 });
pushDeliveryLogSchema.index({ dispatchedAt: -1 });

const PushDeliveryLog = mongoose.models.PushDeliveryLog || mongoose.model('PushDeliveryLog', pushDeliveryLogSchema);
export default PushDeliveryLog;
