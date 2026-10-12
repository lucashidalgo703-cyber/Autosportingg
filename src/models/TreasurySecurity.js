import mongoose from 'mongoose';

const treasurySecuritySchema = new mongoose.Schema({
    pinHash: {
        type: String,
        default: null
    },
    pinConfigured: {
        type: Boolean,
        default: false
    },
    failedAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: {
        type: Date,
        default: null
    },
    lastUnlockedAt: {
        type: Date,
        default: null
    },
    lastPinChangeAt: {
        type: Date,
        default: null
    },
    updatedBy: {
        type: String,
        default: null
    }
}, { timestamps: true });

const TreasurySecurity = mongoose.models.TreasurySecurity || mongoose.model('TreasurySecurity', treasurySecuritySchema);

export default TreasurySecurity;
