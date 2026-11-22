// src/models/AcademyNotification.js
import mongoose from 'mongoose';

const AcademyNotificationSchema = new mongoose.Schema({
    recipientRole: { type: String, default: 'owner', index: true },
    recipientUserId: { type: String, default: null, index: true },
    type: {
        type: String,
        enum: ['challenge_completed', 'new_intake_assigned', 'review_required'],
        default: 'challenge_completed'
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    sellerId: { type: String, required: true, index: true },
    sellerName: { type: String, required: true },
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyDailyChallenge' },
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyChallengeAttempt' },
    score: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 8 },
    weakCategories: [{ type: String }],
    recommendation: { type: String, default: '' },
    actionUrl: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    idempotencyKey: { type: String, unique: true, index: true }
}, { timestamps: true });

AcademyNotificationSchema.index({ read: 1, createdAt: -1 });

const AcademyNotification = mongoose.models.AcademyNotification || mongoose.model('AcademyNotification', AcademyNotificationSchema);
export default AcademyNotification;
