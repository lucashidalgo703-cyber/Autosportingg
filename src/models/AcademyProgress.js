import mongoose from 'mongoose';

/**
 * Esquema de persistencia para AutoSporting Academy 2.0.
 * Almacena el progreso de capacitación por usuario del CRM.
 * 
 * Regla de privacidad estricta:
 * Las reflexiones privadas ('errorReflections') NUNCA se exponen a supervisión
 * a menos que 'sharedWithSupervisor' sea explícitamente true.
 */

const AssessmentAttemptSchema = new mongoose.Schema({
    assessmentId: { type: String, required: true },
    courseId: { type: String, required: true },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    totalQuestions: { type: Number, default: 5 },
    correctAnswers: { type: Number, default: 0 },
    completedAt: { type: Date, default: Date.now }
}, { _id: true });

const SimulationAttemptSchema = new mongoose.Schema({
    simulationId: { type: String, required: true },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    decisions: [mongoose.Schema.Types.Mixed],
    feedback: { type: String, default: '' },
    completedAt: { type: Date, default: Date.now }
}, { _id: true });

const NegotiationEvaluationSchema = new mongoose.Schema({
    scenarioId: { type: String, required: true },
    score: { type: Number, required: true },
    outcomeStatus: { 
        type: String, 
        enum: ['acuerdo_cerrado', 'seguimiento_agendado', 'desistido_con_criterio', 'sin_acuerdo_error_grave', 'en_curso'], 
        default: 'en_curso' 
    },
    competencies: {
        identificacionNecesidades: { score: Number, feedback: String, quote: String },
        comunicacionClaridad: { score: Number, feedback: String, quote: String },
        argumentacionComercial: { score: Number, feedback: String, quote: String },
        manejoObjeciones: { score: Number, feedback: String, quote: String },
        negociacionAutorizaciones: { score: Number, feedback: String, quote: String },
        cierreOProximoPaso: { score: Number, feedback: String, quote: String }
    },
    strengths: [{ type: String }],
    improvements: [{ type: String }],
    keyMoments: [{
        sellerQuote: String,
        critique: String,
        suggestedAlternative: String
    }],
    recommendations: [{ type: String }],
    nextPracticeSuggested: { type: String },
    completedAt: { type: Date, default: Date.now }
}, { _id: true });

const NegotiationSessionSchema = new mongoose.Schema({
    scenarioId: { type: String, required: true },
    level: { type: String, enum: ['principiante', 'intermedio', 'avanzado'], default: 'intermedio' },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    turnsCount: { type: Number, default: 0 },
    messages: [{
        sender: { type: String, enum: ['seller', 'buyer', 'system'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    evaluation: { type: NegotiationEvaluationSchema, default: null },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
}, { _id: true });

const ErrorReflectionSchema = new mongoose.Schema({
    situation: { type: String, required: true },
    actionTaken: { type: String, required: true },
    difficultyEncountered: { type: String, required: true },
    alternativeApproach: { type: String, required: true },
    reinforcementModuleId: { type: String, default: '' },
    sharedWithSupervisor: { type: Boolean, default: false },
    sharedAt: { type: Date },
    relatedNegotiationId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const AcademyProgressSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    userName: { type: String, default: '' },
    userEmail: { type: String, default: '' },
    userRole: { type: String, default: 'vendedor' },
    assignedTrack: { type: String, default: 'track-vendedor' },
    assignedModules: [{ type: String }],
    recommendedActivities: [{
        id: String,
        title: String,
        type: { type: String, enum: ['module', 'simulation', 'negotiation'] },
        assignedBy: String,
        assignedAt: { type: Date, default: Date.now },
        completed: { type: Boolean, default: false }
    }],
    completedLessons: [{
        lessonId: String,
        courseId: String,
        completedAt: { type: Date, default: Date.now }
    }],
    completedRoleModules: [{
        moduleId: String,
        trackId: String,
        completedAt: { type: Date, default: Date.now }
    }],
    assessmentAttempts: [AssessmentAttemptSchema],
    simulationAttempts: [SimulationAttemptSchema],
    negotiationSessions: [NegotiationSessionSchema],
    errorReflections: [ErrorReflectionSchema],
    lastActiveAt: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.AcademyProgress || mongoose.model('AcademyProgress', AcademyProgressSchema);
