import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    proofId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerPaymentProof', required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    generation: { type: Number, required: true },
    // Operational references only. No mail addresses, private links or files.
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
schema.index({ proofId: 1 }, { unique: true });
schema.index({ state: 1, nextAttemptAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.BuyerPaymentNotification || mongoose.model('BuyerPaymentNotification', schema);
