import mongoose from 'mongoose';

// Opaque credentials are never persisted in clear text. All grants end with the
// verified CRM session that authorized them; refreshing cannot extend that session.
const codeSchema = new mongoose.Schema({
    _id: String,
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sessionId: { type: String, required: true },
    credentialFingerprint: { type: String, required: true },
    redirectUri: { type: String, required: true },
    clientId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    sessionExpiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null }
}, { timestamps: true });
codeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const grantSchema = new mongoose.Schema({
    _id: String,
    refreshHash: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sessionId: { type: String, required: true },
    credentialFingerprint: { type: String, required: true },
    clientId: { type: String, required: true },
    accessExpiresAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null }
}, { timestamps: true });
grantSchema.index({ refreshHash: 1 }, { unique: true });
grantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const limitSchema = new mongoose.Schema({ _id: String, count: Number, expiresAt: Date });
limitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const GptExpenseCode = mongoose.models.GptExpenseCode || mongoose.model('GptExpenseCode', codeSchema);
export const GptExpenseGrant = mongoose.models.GptExpenseGrant || mongoose.model('GptExpenseGrant', grantSchema);
export const GptExpenseRateLimit = mongoose.models.GptExpenseRateLimit || mongoose.model('GptExpenseRateLimit', limitSchema);
