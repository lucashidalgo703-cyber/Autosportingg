import mongoose from 'mongoose';

const treasuryConfigSchema = new mongoose.Schema({
    operationalHorizonDays: { type: Number, default: 30 },
    reserveMonths: { type: Number, default: 2 },
    personalMonthlyBudgetARS: { type: Number, default: 0 }, // Retiros personales del propietario exclusivamente
    personalMonthlyBudgetUSD: { type: Number, default: 0 },
    postventaProvisionARS: { type: Number, default: 0 },
    postventaProvisionUSD: { type: Number, default: 0 },
    postventaProvisionPerVehicleARS: { type: Number, default: 0 }, // Provisión fija por vehículo vendido/entregado
    reinvestmentExtraConfigured: { type: Boolean, default: false },
    reinvestmentExtraPct: { type: Number, default: null, min: 0, max: 100 }, // Extra de reinversión sobre inversión real (%), destino de ganancia hacia Stock
    surplusRule: {
        configured: { type: Boolean, default: false },
        stockPercent: { type: Number, default: 0 },
        crecimientoPercent: { type: Number, default: 0 }
    },
    priorityOrder: {
        type: [String],
        default: ['operativa', 'impuestos', 'deudas', 'postventa', 'reserva', 'personal', 'stock', 'crecimiento']
    },
    autoDistributeIncomes: { type: Boolean, default: false },
    requirePinForAutoDistribution: { type: Boolean, default: false },
    isSetupCompleted: { type: Boolean, default: false },
    lastSetupAt: { type: Date },
    updatedBy: { type: String }
}, { timestamps: true });

const TreasuryConfig = mongoose.models.TreasuryConfig || mongoose.model('TreasuryConfig', treasuryConfigSchema);

export default TreasuryConfig;
