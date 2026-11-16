import mongoose from 'mongoose';

const payloadSchema = new mongoose.Schema({
    kind: { type: String, enum: ['operational', 'workshop', 'vehicle', 'card'] },
    amount: Number,
    currency: { type: String, enum: ['ARS', 'USD'] },
    date: String,
    concept: String,
    paymentMethod: String,
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    accountQuery: String,
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    vehicleQuery: String,
    category: String,
    notes: String,
    cardTiming: { type: String, enum: ['paid', 'deferred'] },
    dueDate: String
}, { _id: false });

const draftSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, immutable: true },
    requestId: { type: String, required: true, immutable: true },
    origin: { type: String, enum: ['gpt', 'crm_dictation'], default: 'gpt', immutable: true },
    version: { type: Number, default: 1, required: true },
    status: { type: String, enum: ['draft', 'confirmed'], default: 'draft', required: true },
    payload: { type: payloadSchema, required: true },
    expiresAt: { type: Date, required: true },
    confirmedAt: Date,
    movementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    result: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// Confirmed drafts remain durable: deleting them by TTL would break retry idempotency.
draftSchema.index({ userId: 1, requestId: 1 }, { unique: true });
draftSchema.index({ userId: 1, status: 1, createdAt: -1 });
export default mongoose.models.GptExpenseDraft || mongoose.model('GptExpenseDraft', draftSchema);
