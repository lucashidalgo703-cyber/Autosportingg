import mongoose from 'mongoose';

const monthlyInstanceSchema = new mongoose.Schema({
    period: { type: String, required: true }, // Format "YYYY-MM"
    amount: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: ['pendiente', 'pagado', 'anulado'],
        default: 'pendiente'
    },
    dueDay: { type: Number, min: 1, max: 31 },
    dueDate: { type: Date },
    paidAt: { type: Date },
    paidAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, default: 'efectivo' },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    notes: { type: String, default: '' },
    isModified: { type: Boolean, default: false }
}, { _id: true, timestamps: true });

const fixedExpenseSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, default: 'Servicios' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    dueDay: { type: Number, required: true, min: 1, max: 31, default: 10 },
    defaultAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    instances: [monthlyInstanceSchema],
    createdBy: { type: String },
    updatedBy: { type: String }
}, { timestamps: true });

fixedExpenseSchema.index({ isActive: 1, 'instances.period': 1 });

const FixedExpense = mongoose.models.FixedExpense || mongoose.model('FixedExpense', fixedExpenseSchema);
export default FixedExpense;
