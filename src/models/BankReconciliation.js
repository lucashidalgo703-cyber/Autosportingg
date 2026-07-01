import mongoose from 'mongoose';

const bankReconciliationSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    accountName: { type: String },
    currency: { type: String, enum: ['ARS', 'USD'], required: true },
    status: { type: String, enum: ['pendiente', 'confirmado', 'anulado'], default: 'pendiente' },
    sourceFileName: { type: String },
    createdBy: { type: String },
    confirmedBy: { type: String },
    confirmedAt: { type: Date },
    lines: [{
        rowIndex: { type: Number },
        rawLine: { type: String },
        csvDate: { type: Date },
        csvDescription: { type: String },
        csvAmount: { type: Number },
        matchStatus: { type: String, enum: ['matched', 'unmatched', 'ignored', 'created'] },
        matchedTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        createdTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        actionCategory: { type: String },
        errorMessage: { type: String }
    }]
}, { timestamps: true });

const BankReconciliation = mongoose.model('BankReconciliation', bankReconciliationSchema);
export default BankReconciliation;
