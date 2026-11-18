import mongoose from 'mongoose';
const schema = new mongoose.Schema({
    // Store only the digest of the random bearer challenge.
    _id: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    credentialFingerprint: { type: String, required: true },
    // Bind pending attempts to their current delivery policy without storing
    // another copy of the recipient's email. Legacy attempts must restart.
    recipientFingerprint: String,
    emailRecipientType: { type: String, enum: ['account', 'administrator'] },
    status: { type: String, enum: ['pending', 'email_verified', 'completed'], default: 'pending' },
    codeHash: String,
    generation: String,
    attempts: { type: Number, default: 0 },
    totpAttempts: { type: Number, default: 0 },
    emailSent: { type: Boolean, default: false },
    codeExpiresAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    resendAvailableAt: { type: Date, required: true },
    emailVerifiedAt: Date,
    completedAt: Date
}, { timestamps: true });
// Expiry is checked explicitly; TTL is housekeeping only.
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.LoginChallenge || mongoose.model('LoginChallenge', schema);
