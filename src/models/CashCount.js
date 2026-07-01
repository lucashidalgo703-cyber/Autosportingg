import mongoose from 'mongoose';

const cashCountSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    accountName: { type: String },
    currency: { type: String, enum: ['ARS', 'USD'], required: true },
    systemBalance: { type: Number, required: true },
    declaredBalance: { type: Number, required: true },
    difference: { type: Number, required: true },
    notes: { type: String },
    countedAt: { type: Date, default: Date.now },
    createdBy: { type: String }
}, { timestamps: true });

const CashCount = mongoose.model('CashCount', cashCountSchema);
export default CashCount;
