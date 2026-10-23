import mongoose from 'mongoose';

/**
 * Esquema de Configuración Persistente del Sistema Web Push
 * Garantiza que las claves VAPID y configuraciones del servidor sean persistentes
 * entre reinicios, instancias serverless (Vercel) y nuevos despliegues.
 */
const pushSystemConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    vapidPublicKey: {
        type: String,
        required: true
    },
    vapidPrivateKey: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true,
        default: 'mailto:seguridad@autosporting.com.ar'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const PushSystemConfig = mongoose.models.PushSystemConfig || mongoose.model('PushSystemConfig', pushSystemConfigSchema);
export default PushSystemConfig;
