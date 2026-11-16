import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    tramiteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gestoria', required: true },
    revision: { type: Number, required: true },
    fromStatus: { type: String, required: true },
    toStatus: { type: String, required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    recipientClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    // Never persist the recipient address, private portal URL or rendered mail.
    contactHash: String,
    portalGeneration: { type: Number, default: null },
    state: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'skipped', 'uncertain'], required: true },
    reason: String,
    attempts: { type: Number, default: 0 },
    nextAttemptAt: Date,
    claimedAt: Date,
    claimId: String,
    sentAt: Date,
    expiresAt: { type: Date, required: true }
}, { timestamps: true });
schema.index({ tramiteId: 1, revision: 1 }, { unique: true });
schema.index({ state: 1, nextAttemptAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.GestoriaStatusNotification || mongoose.model('GestoriaStatusNotification', schema);
