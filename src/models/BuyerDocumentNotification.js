import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerPortalDocument', required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    tradeInId: { type: mongoose.Schema.Types.ObjectId, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    generation: { type: Number, required: true },
    // No addresses, private links, rendered messages or file contents are saved.
    recipientHash: String,
    clientContactHash: String,
    state: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'skipped', 'uncertain'], required: true },
    reason: String,
    attempts: { type: Number, default: 0 },
    nextAttemptAt: Date,
    claimedAt: Date,
    claimId: String,
    sentAt: Date,
    expiresAt: { type: Date, required: true }
}, { timestamps: true });
schema.index({ documentId: 1 }, { unique: true });
schema.index({ state: 1, nextAttemptAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.BuyerDocumentNotification || mongoose.model('BuyerDocumentNotification', schema);
