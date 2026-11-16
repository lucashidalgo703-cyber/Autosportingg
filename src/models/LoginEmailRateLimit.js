import mongoose from 'mongoose';
const schema = new mongoose.Schema({
    // The built-in unique _id gives every account one shared send quota.
    _id: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
    windowStartedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true }
}, { versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.models.LoginEmailRateLimit || mongoose.model('LoginEmailRateLimit', schema);
