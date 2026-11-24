import mongoose from 'mongoose';

const observation = new mongoose.Schema({
    _id: { type: String, required: true },
    period: { type: String, required: true, match: /^\d{4}-(?:0[1-9]|1[0-2])$/ },
    capturedAt: { type: Date, required: true },
    source: { type: String, enum: ['manual', 'cron', 'reconstructed'], required: true },
    asOf: { type: Date },
    recovery: { type: mongoose.Schema.Types.Mixed },
    formulaVersion: { type: String, required: true },
    totalsByCurrency: { type: mongoose.Schema.Types.Mixed, required: true },
    stockCapital: { type: mongoose.Schema.Types.Mixed, default: null },
    components: { type: mongoose.Schema.Types.Mixed, required: true },
    quality: { type: mongoose.Schema.Types.Mixed, required: true },
    createdBy: String,
    requestFingerprint: { type: String, required: true, select: false }
}, { minimize: false, timestamps: { createdAt: true, updatedAt: false } });
export const CapitalObservation = mongoose.models.CapitalObservation || mongoose.model('CapitalObservation', observation);

const month = new mongoose.Schema({
    _id: { type: String, required: true, match: /^\d{4}-(?:0[1-9]|1[0-2])$/ },
    observationId: { type: String, ref: 'CapitalObservation', required: true },
    revision: { type: Number, required: true, default: 1 },
    firstCapturedAt: { type: Date, required: true }
}, { timestamps: true });
export const CapitalMonth = mongoose.models.CapitalMonth || mongoose.model('CapitalMonth', month);
