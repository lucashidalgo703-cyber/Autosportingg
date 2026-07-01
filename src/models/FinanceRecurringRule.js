import mongoose from 'mongoose';

const financeRecurringRuleSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Ingreso', 'Egreso'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['ARS', 'USD'], required: true },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String },
    updatedBy: { type: String }
}, { timestamps: true });

const FinanceRecurringRule = mongoose.model('FinanceRecurringRule', financeRecurringRuleSchema);
export default FinanceRecurringRule;
