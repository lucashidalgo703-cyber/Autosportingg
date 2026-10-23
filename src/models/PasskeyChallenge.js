import mongoose from 'mongoose';

/**
 * Esquema de Desafíos WebAuthn (Passkeys)
 * Desafíos criptográficos aleatorios de un solo uso con expiración y TTL en MongoDB.
 * Protege contra repetición (Replay Attack) y uso concurrente.
 */
const passkeyChallengeSchema = new mongoose.Schema({
    challenge: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: true,
        index: true
    },
    purpose: {
        type: String,
        enum: ['registration', 'authentication'],
        required: true,
        index: true
    },
    used: {
        type: Boolean,
        default: false,
        index: true
    },
    usedAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL automático en MongoDB
    }
}, {
    timestamps: true
});

passkeyChallengeSchema.index({ challenge: 1, userId: 1, used: 1 });

const PasskeyChallenge = mongoose.models.PasskeyChallenge || mongoose.model('PasskeyChallenge', passkeyChallengeSchema);
export default PasskeyChallenge;
