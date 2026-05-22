import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['Ingreso', 'Egreso'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'ARS'], required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' }, // Optional linked car
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

transactionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (typeof next === 'function') next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
