import mongoose from 'mongoose';

const ruleSchema = new mongoose.Schema({
    mode: { type: String, enum: ['amount', 'percent'], required: true },
    value: { type: Number, min: 0, required: true }
}, { _id: false });

// Separate from Car/CrmSettings so internal floors and minimums never become
// part of catalog DTOs or the public vehicle API. A cleared override keeps its
// revision, preventing a stale editor from recreating an older policy (ABA).
const schema = new mongoose.Schema({
    _id: { type: String, required: true },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    rule: { type: ruleSchema, default: null },
    revision: { type: Number, min: 1, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    audit: [{
        before: { type: ruleSchema, default: null },
        after: { type: ruleSchema, default: null },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.models.StockNegotiationPolicy || mongoose.model('StockNegotiationPolicy', schema);
