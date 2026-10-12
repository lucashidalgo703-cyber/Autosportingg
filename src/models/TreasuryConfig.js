import mongoose from 'mongoose';

const treasuryConfigSchema = new mongoose.Schema({
    operationalHorizonDays: { type: Number, default: 30 },
    reserveMonths: { type: Number, default: 2 },
    personalMonthlyBudgetARS: { type: Number, default: 0 },
    personalMonthlyBudgetUSD: { type: Number, default: 0 },
    postventaProvisionARS: { type: Number, default: 0 },
    postventaProvisionUSD: { type: Number, default: 0 },
    priorityOrder: {
        type: [String],
        default: ['operativa', 'impuestos', 'deudas', 'personal', 'postventa', 'reserva', 'stock', 'crecimiento']
    },
    isSetupCompleted: { type: Boolean, default: false },
    lastSetupAt: { type: Date },
    updatedBy: { type: String }
}, { timestamps: true });

const TreasuryConfig = mongoose.models.TreasuryConfig || mongoose.model('TreasuryConfig', treasuryConfigSchema);

export default TreasuryConfig;
