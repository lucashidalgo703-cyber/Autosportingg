import mongoose from 'mongoose';
const encrypted = new mongoose.Schema({ iv: String, tag: String, data: String }, { _id: false });
const schema = new mongoose.Schema({
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    requestId: { type: String, required: true }, dedupeHash: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 }, currency: { type: String, enum: ['ARS', 'USD'], required: true },
    paymentDate: { type: Date, required: true }, concept: { type: String, required: true },
    targetType: { type: String, enum: ['purchase', 'deposit', 'installment', 'gestoria'], required: true },
    targetId: mongoose.Schema.Types.ObjectId,
    status: { type: String, enum: ['pending', 'correction_requested', 'confirmed', 'linked', 'superseded'], default: 'pending' },
    comment: String, transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    fileName: String, mimeType: String, byteLength: Number, fileHash: String,
    encryptedFile: { type: encrypted, required: true, select: false },
    version: { type: Number, default: 1 }, replacesId: mongoose.Schema.Types.ObjectId,
    history: [{ status: String, comment: String, at: Date, by: String }]
}, { timestamps: true });
schema.index({ saleId: 1, requestId: 1 }, { unique: true });
schema.index({ saleId: 1, dedupeHash: 1 }, { unique: true });
schema.index({ saleId: 1, createdAt: -1 });
export default mongoose.models.BuyerPaymentProof || mongoose.model('BuyerPaymentProof', schema);
