import mongoose from 'mongoose';

const encrypted = new mongoose.Schema({ iv: String, tag: String, data: String }, { _id: false });
const schema = new mongoose.Schema({
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    logicalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['title', 'registration_front', 'registration_back', 'transfer_certificate', 'other'], required: true },
    description: { type: String, default: '' },
    state: { type: String, enum: ['draft', 'published', 'withdrawn', 'replaced'], default: 'draft' },
    isCurrent: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    revision: { type: Number, default: 1 },
    replacesId: mongoose.Schema.Types.ObjectId,
    requestId: { type: String, required: true },
    requestFingerprint: { type: String, required: true },
    encryptedFile: { type: encrypted, required: true, select: false },
    fileHash: String, mimeType: String, byteLength: Number, fileName: String,
    createdBy: String, publishedAt: Date, publishedBy: String, withdrawnAt: Date, withdrawnBy: String,
    history: [{ action: String, at: Date, by: String, revision: Number }]
}, { timestamps: true });
schema.index({ saleId: 1, requestId: 1 }, { unique: true });
schema.index({ logicalId: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } });
schema.index({ saleId: 1, clientId: 1, vehicleId: 1, isCurrent: 1, state: 1 });
export default mongoose.models.BuyerDeliveryDocument || mongoose.model('BuyerDeliveryDocument', schema);
