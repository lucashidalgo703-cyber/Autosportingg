import mongoose from 'mongoose';

const SecurityRateLimitSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    points: {
        type: Number,
        default: 1
    },
    expiresAt: {
        type: Date,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false
});

// TTL index para purga automática de documentos expirados por MongoDB
SecurityRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SecurityRateLimit = mongoose.models.SecurityRateLimit || mongoose.model('SecurityRateLimit', SecurityRateLimitSchema);

export default SecurityRateLimit;
