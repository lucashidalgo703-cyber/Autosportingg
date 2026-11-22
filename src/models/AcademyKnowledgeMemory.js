// src/models/AcademyKnowledgeMemory.js
import mongoose from 'mongoose';

const AcademyKnowledgeMemorySchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    category: {
        type: String,
        enum: ['precio', 'kilometraje', 'version_equipamiento', 'reconocimiento', 'procedimiento', 'negociacion'],
        required: true,
        index: true
    },
    conceptKey: { type: String, required: true, index: true }, // e.g. 'car-km-67389a' or 'car-price-67389a'
    entityId: { type: String, default: null }, // e.g. carId
    entityLabel: { type: String, required: true }, // e.g. 'Volkswagen Amarok V6 Extreme 2022'
    errorCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    consecutiveCorrect: { type: Number, default: 0 },
    lastEvaluatedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['debilitado', 'en_progreso', 'dominado'],
        default: 'en_progreso',
        index: true
    },
    nextReviewDate: { type: String, required: true, index: true } // 'YYYY-MM-DD'
}, { timestamps: true });

AcademyKnowledgeMemorySchema.index({ userId: 1, conceptKey: 1 }, { unique: true });

const AcademyKnowledgeMemory = mongoose.models.AcademyKnowledgeMemory || mongoose.model('AcademyKnowledgeMemory', AcademyKnowledgeMemorySchema);
export default AcademyKnowledgeMemory;
