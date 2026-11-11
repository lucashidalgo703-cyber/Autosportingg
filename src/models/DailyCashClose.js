import mongoose from 'mongoose';

const dailyCashCloseSchema = new mongoose.Schema({
    date: { type: String, required: true }, // Format YYYY-MM-DD
    sequence: { type: Number, default: 1 },
    accountSnapshots: [{
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
        name: { type: String },
        currency: { type: String },
        balance: { type: Number },
        type: { type: String }
    }],
    totalsARS: { type: Number, default: 0 },
    totalsUSD: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: String },
    closedAt: { type: Date, default: Date.now }
}, { timestamps: true });

dailyCashCloseSchema.index({ date: 1, sequence: 1 }, { unique: true });

const DailyCashClose = mongoose.model('DailyCashClose', dailyCashCloseSchema);
export default DailyCashClose;
