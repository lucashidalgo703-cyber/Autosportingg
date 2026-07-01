import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
    personName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['ARS', 'USD'], required: true },
    date: { type: Date, default: Date.now },
    expectedReturnDate: { type: Date },
    returnedAt: { type: Date },
    reason: { type: String },
    status: { type: String, enum: ['pendiente', 'devuelto', 'anulado'], default: 'pendiente' },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    returnTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    createdBy: { type: String },
    updatedBy: { type: String }
}, { timestamps: true });

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
