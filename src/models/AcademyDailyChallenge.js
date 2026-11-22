// src/models/AcademyDailyChallenge.js
import mongoose from 'mongoose';

const QuestionSnapshotSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    category: {
        type: String,
        enum: ['precio', 'kilometraje', 'version_equipamiento', 'reconocimiento', 'procedimiento', 'negociacion'],
        required: true
    },
    questionText: { type: String, required: true },
    imageUrl: { type: String, default: null },
    carId: { type: String, default: null },
    carSnapshot: {
        brand: String,
        name: String,
        year: Number,
        km: Number,
        price: Number,
        currency: String,
        fuel: String,
        color: String,
        vehicleType: String,
        hasManuals: Boolean,
        hasDuplicateKeys: Boolean,
        hasOfficialServices: Boolean,
        coverImage: String
    },
    questionFormat: {
        type: String,
        enum: ['multiple_choice', 'numeric_input', 'open_negotiation'],
        default: 'multiple_choice'
    },
    options: [{ type: String }],
    correctOptionIndex: { type: Number, default: -1 },
    correctNumericValue: { type: Number, default: null },
    numericTolerancePercent: { type: Number, default: 0 },
    openRubric: {
        scenarioDescription: String,
        mustIncludeConcepts: [{ type: String }],
        mustAvoidConcepts: [{ type: String }],
        acceptableRefusal: Boolean,
        guidance: String
    },
    explanation: { type: String, required: true },
    isInvalidated: { type: Boolean, default: false },
    invalidationReason: { type: String, default: null },
    invalidatedBy: { type: String, default: null },
    invalidatedAt: { type: Date, default: null }
}, { _id: true });

const AcademyDailyChallengeSchema = new mongoose.Schema({
    challengeDate: { type: String, required: true, index: true }, // Format 'YYYY-MM-DD' en hora local Argentina
    type: {
        type: String,
        enum: ['daily', 'new_intake', 'custom_review'],
        default: 'daily',
        index: true
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    targetCarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null },
    targetCarTitle: { type: String, default: null },
    assignedRoles: [{ type: String, default: ['ventas'] }],
    assignedUserIds: [{ type: String }],
    questions: [QuestionSnapshotSchema],
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

AcademyDailyChallengeSchema.index({ challengeDate: 1, type: 1 });

const AcademyDailyChallenge = mongoose.models.AcademyDailyChallenge || mongoose.model('AcademyDailyChallenge', AcademyDailyChallengeSchema);
export default AcademyDailyChallenge;
