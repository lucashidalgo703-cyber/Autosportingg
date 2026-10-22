import mongoose from 'mongoose';

/**
 * Esquema de Desafíos Criptográficos de Seguridad (Challenge-Response Handshake)
 * Utilizados para verificar posesión de la clave privada ECDSA P-256 no exportable.
 * Garantiza protección contra replay (uso único), asociación estricta a terminal y TTL corto.
 */
const securityChallengeSchema = new mongoose.Schema({
    challengeId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    deviceId: {
        type: String,
        required: true,
        index: true
    },
    nonce: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: ['login', 'device_authorization'],
        default: 'login'
    },
    used: {
        type: Boolean,
        default: false,
        index: true
    },
    usedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL automático de MongoDB al expirar el desafío
    }
}, {
    timestamps: true
});

securityChallengeSchema.index({ challengeId: 1, deviceId: 1, used: 1 });

const SecurityChallenge = mongoose.models.SecurityChallenge || mongoose.model('SecurityChallenge', securityChallengeSchema);
export default SecurityChallenge;
