// src/models/AcademyChallengeAttempt.js
import mongoose from 'mongoose';

const UserAnswerSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    category: {
        type: String,
        enum: ['precio', 'kilometraje', 'version_equipamiento', 'reconocimiento', 'procedimiento', 'negociacion'],
        required: true
    },
    carId: { type: String, default: null },
    selectedOptionIndex: { type: Number, default: -1 },
    numericResponse: { type: Number, default: null },
    textResponse: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
    scoreAwarded: { type: Number, default: 0 },
    maxScore: { type: Number, default: 12.5 },
    feedback: { type: String, default: '' },
    rubricEvaluation: {
        score: Number,
        adheredToPolicy: Boolean,
        hasJustifiedRefusal: Boolean,
        criticalFaultDetected: Boolean,
        evaluationNotes: String
    },
    isInvalidated: { type: Boolean, default: false },
    invalidationReason: { type: String, default: null },
    invalidatedBy: { type: String, default: null },
    invalidatedAt: { type: Date, default: null }
}, { _id: true });

const AcademyChallengeAttemptSchema = new mongoose.Schema({
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademyDailyChallenge', required: true, index: true },
    challengeDate: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    type: {
        type: String,
        enum: ['daily', 'new_intake', 'custom_review'],
        default: 'daily'
    },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userRole: { type: String, default: 'ventas' },
    attemptType: {
        type: String,
        enum: ['official_daily', 'practice_review'],
        default: 'official_daily'
    },
    attemptNumber: { type: Number, default: 1 },
    status: {
        type: String,
        enum: ['en_curso', 'completado', 'abandonado'],
        default: 'en_curso'
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0 },
    score: { type: Number, default: 0, min: 0, max: 100 },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 8 },
    categoryScores: {
        precio: { score: Number, total: Number },
        kilometraje: { score: Number, total: Number },
        version_equipamiento: { score: Number, total: Number },
        reconocimiento: { score: Number, total: Number },
        procedimiento: { score: Number, total: Number },
        negociacion: { score: Number, total: Number }
    },
    weakCategories: [{ type: String }],
    recommendedReview: { type: String, default: '' },
    answers: [UserAnswerSchema],
    idempotencyKey: { type: String, unique: true, sparse: true }
}, { timestamps: true });

AcademyChallengeAttemptSchema.index({ userId: 1, challengeDate: 1, attemptType: 1 });

const AcademyChallengeAttempt = mongoose.models.AcademyChallengeAttempt || mongoose.model('AcademyChallengeAttempt', AcademyChallengeAttemptSchema);
export default AcademyChallengeAttempt;
