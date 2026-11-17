import mongoose from 'mongoose';

// One durable claim per collection request; the record and financial effects
// are committed in the same transaction. No file or customer data is stored.
const schema = new mongoose.Schema({
    _id: { type: String, required: true },
    fingerprint: { type: String, required: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    treasuryState: { type: String, enum: ['pending', 'running', 'done', 'uncertain', 'reversed'], default: 'pending' },
    treasuryReversalState: { type: String, enum: ['pending', 'running', 'done', 'uncertain'], default: 'pending' },
    treasuryResult: mongoose.Schema.Types.Mixed
}, { timestamps: true });
export default mongoose.models.CollectionRecordingOperation || mongoose.model('CollectionRecordingOperation', schema);
