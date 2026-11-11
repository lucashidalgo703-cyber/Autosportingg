import mongoose from 'mongoose';
const schema = new mongoose.Schema({
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true, index: true },
    slot: { type: String, required: true, enum: ['buyer_id_front', 'buyer_id_back', 'vehicle_card_front', 'vehicle_card_back', 'deposit_receipt', 'trade_in_card_front', 'trade_in_card_back'] },
    depositId: mongoose.Schema.Types.ObjectId, tradeInId: mongoose.Schema.Types.ObjectId,
    filename: { type: String, required: true, maxlength: 180 }, contentType: { type: String, required: true }, size: { type: Number, required: true, min: 1, max: 15 * 1024 * 1024 },
    data: { type: Buffer, required: true, select: false }, sha256: { type: String, required: true, select: false },
    uploadBatch: { type: String, required: true, select: false }, createdBy: { type: String, required: true }, createdByName: String,
    deletedAt: { type: Date, default: null }, deletedBy: { type: String, default: null }
}, { timestamps: true });
schema.index({ saleId: 1, slot: 1, depositId: 1, tradeInId: 1, deletedAt: 1 });
export default mongoose.models.SaleDocument || mongoose.model('SaleDocument', schema);
