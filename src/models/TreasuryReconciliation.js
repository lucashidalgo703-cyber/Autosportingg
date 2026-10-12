import mongoose from 'mongoose';

const treasuryReconciliationSchema = new mongoose.Schema({
    cutoffDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['confirmado', 'anulado'],
        default: 'confirmado'
    },
    accountsSnapshot: [{
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
        accountName: String,
        accountType: String,
        currency: { type: String, enum: ['ARS', 'USD'] },
        previousBalance: { type: Number, default: 0 },
        realBalance: { type: Number, default: 0 },
        difference: { type: Number, default: 0 }
    }],
    totalPreviousARS: { type: Number, default: 0 },
    totalRealARS: { type: Number, default: 0 },
    totalDiffARS: { type: Number, default: 0 },
    totalPreviousUSD: { type: Number, default: 0 },
    totalRealUSD: { type: Number, default: 0 },
    totalDiffUSD: { type: Number, default: 0 },
    referenceLiquidityUSD: { type: Number, default: 5000 },
    reason: { type: String, default: 'Conciliación inicial de saldos reales' },
    notes: { type: String, default: '' },
    regularizedInstallmentsCount: { type: Number, default: 0 },
    confirmedBy: { type: String, default: '' },
    confirmedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });

const TreasuryReconciliation = mongoose.models.TreasuryReconciliation || mongoose.model('TreasuryReconciliation', treasuryReconciliationSchema);

export default TreasuryReconciliation;
