import mongoose from 'mongoose';

const treasuryBatchLogSchema = new mongoose.Schema({
    batchId: {
        type: String,
        required: true,
        unique: true
    },
    actionType: {
        type: String,
        enum: ['regularizacion_cuotas', 'organizacion_saldo_inicial'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    count: {
        type: Number,
        default: 0
    },
    totalARS: {
        type: Number,
        default: 0
    },
    totalUSD: {
        type: Number,
        default: 0
    },
    affectedSalesCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['aplicado', 'revertido'],
        default: 'aplicado'
    },
    appliedBy: {
        type: String,
        required: true
    },
    appliedAt: {
        type: Date,
        default: Date.now
    },
    revertedBy: {
        type: String
    },
    revertedAt: {
        type: Date
    },
    revertReason: {
        type: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, { timestamps: true });

const TreasuryBatchLog = mongoose.models.TreasuryBatchLog || mongoose.model('TreasuryBatchLog', treasuryBatchLogSchema);

export default TreasuryBatchLog;
