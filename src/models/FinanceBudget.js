import mongoose from 'mongoose';

const financeBudgetSchema = new mongoose.Schema({
    period: { type: String, required: true }, // Format: YYYY-MM
    category: { type: String, required: true },
    plannedAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['ARS', 'USD'], required: true },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String },
    updatedBy: { type: String }
}, { timestamps: true });

financeBudgetSchema.index({ period: 1, category: 1, currency: 1 }, { unique: true });

const FinanceBudget = mongoose.model('FinanceBudget', financeBudgetSchema);
export default FinanceBudget;
