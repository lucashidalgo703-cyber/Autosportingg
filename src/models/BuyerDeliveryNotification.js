import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'BuyerDeliveryDocument', required: true },
    revision: { type: Number, required: true },
    action: { type: String, enum: ['published', 'withdrawn'], required: true },
    documentState: { type: String, enum: ['published', 'withdrawn', 'draft'], required: true },
    documentType: { type: String, required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    // No address, private URL, file bytes or rendered mail is persisted here.
    contactHash: String,
    generation: Number,
    state: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'skipped', 'uncertain'], required: true },
    reason: String,
    attempts: { type: Number, default: 0 },
    nextAttemptAt: Date,
    claimedAt: Date,
    claimId: String,
    sentAt: Date,
    expiresAt: { type: Date, required: true }
}, { timestamps: true });
schema.index({ documentId: 1, revision: 1 }, { unique: true });
schema.index({ state: 1, nextAttemptAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.BuyerDeliveryNotification || mongoose.model('BuyerDeliveryNotification', schema);
