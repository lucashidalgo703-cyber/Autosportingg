import mongoose from 'mongoose';

const treasuryBoxSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: ['operativa', 'personal', 'impuestos', 'deudas', 'postventa', 'reserva', 'stock', 'crecimiento']
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    balanceARS: {
        type: Number,
        default: 0
    },
    balanceUSD: {
        type: Number,
        default: 0
    },
    pendingCommitmentsARS: {
        type: Number,
        default: 0
    },
    pendingCommitmentsUSD: {
        type: Number,
        default: 0
    },
    targetPercent: {
        type: Number,
        default: 0
    },
    monthlyBudgetARS: {
        type: Number,
        default: 0
    },
    monthlyBudgetUSD: {
        type: Number,
        default: 0
    },
    monthlyTargetARS: {
        type: Number,
        default: 0
    },
    monthlyTargetUSD: {
        type: Number,
        default: 0
    },
    reserveMonths: {
        type: Number,
        default: 1
    },
    priority: {
        type: Number,
        default: 1
    },
    color: {
        type: String,
        default: 'emerald'
    },
    icon: {
        type: String,
        default: 'Briefcase'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    history: [{
        date: { type: Date, default: Date.now },
        type: {
            type: String,
            enum: [
                'asignacion_inicial',
                'ajuste',
                'transferencia_entre_cajas',
                'retiro',
                'ingreso',
                'distribucion_cobro',
                'recuperacion_capital',
                'extra_reinversion',
                'reserva_costos_operacion',
                'reversion_cobro',
                'asignacion',
                'egreso_finanzas',
                'reversion_egreso',
                'redistribucion_explicita'
            ]
        },
        step: String,
        amount: Number,
        currency: { type: String, enum: ['ARS', 'USD'] },
        fromBox: String,
        toBox: String,
        reason: String,
        user: String,
        saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
        sourceIncomeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        sourceExpenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
    }]
}, { timestamps: true });

const TreasuryBox = mongoose.models.TreasuryBox || mongoose.model('TreasuryBox', treasuryBoxSchema);

export default TreasuryBox;
