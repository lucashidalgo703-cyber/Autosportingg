import mongoose from 'mongoose';

/**
 * Modelo de Presupuesto Persistente para AutoSporting Academy 2.0.
 * Almacena el saldo autorizado, reservas activas, consumo confirmado y consumo incierto.
 * Totalmente independiente del piloto financiero de Codex.
 */

const ReservationSchema = new mongoose.Schema({
    reservationId: { type: String, required: true },
    userId: { type: String, required: true },
    callType: { type: String, enum: ['buyer', 'evaluator', 'tutor'], required: true },
    estimatedCostUSD: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'settled', 'released', 'uncertain'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const CallLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    userId: { type: String, required: true },
    callType: { type: String, enum: ['buyer', 'evaluator', 'tutor'], required: true },
    tokensIn: { type: Number, default: 0 },
    tokensOut: { type: Number, default: 0 },
    costUSD: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'failed', 'uncertain'], required: true },
    errorMessage: { type: String, default: null }
}, { _id: false });

const UserQuotaSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    periodDate: { type: String, required: true }, // formato YYYY-MM-DD
    negotiationSessionsCount: { type: Number, default: 0 },
    tutorRequestsCount: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now }
}, { _id: false });

const AcademyBudgetSchema = new mongoose.Schema({
    budgetConfigId: { type: String, required: true, unique: true, default: 'academy-primary' },
    // El presupuesto por defecto NO debe tener importe positivo (regla estricta)
    authorizedBudgetUSD: { type: Number, required: true, default: 0, min: 0 },
    confirmedSpentUSD: { type: Number, required: true, default: 0, min: 0 },
    reservedUSD: { type: Number, required: true, default: 0, min: 0 },
    uncertainSpentUSD: { type: Number, required: true, default: 0, min: 0 },
    totalTokensUsed: { type: Number, required: true, default: 0, min: 0 },
    reservations: [ReservationSchema],
    callLogs: [CallLogSchema],
    userQuotas: [UserQuotaSchema],
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.AcademyBudget || mongoose.model('AcademyBudget', AcademyBudgetSchema);
