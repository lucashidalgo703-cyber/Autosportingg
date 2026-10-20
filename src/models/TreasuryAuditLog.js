import mongoose from 'mongoose';

const treasuryAuditLogSchema = new mongoose.Schema({
    operationId: {
        type: String,
        required: true,
        index: true
    },
    actionType: {
        type: String,
        required: true,
        enum: [
            'ajuste_saldo',
            'transferencia_entre_cajas',
            'edicion_configuracion',
            'cambio_esquema',
            'distribucion_cobro',
            'recuperacion_capital',
            'reversion_cobro',
            'reversion_ajuste',
            'asignacion_inicial',
            'alta_caja',
            'desactivacion_caja'
        ],
        index: true
    },
    boxKey: {
        type: String,
        index: true
    },
    boxName: {
        type: String
    },
    targetBoxKey: {
        type: String,
        default: null
    },
    targetBoxName: {
        type: String,
        default: null
    },
    currency: {
        type: String,
        enum: ['ARS', 'USD', null],
        default: 'ARS'
    },
    amount: {
        type: Number,
        default: 0
    },
    balanceBefore: {
        type: Number,
        default: null
    },
    balanceAfter: {
        type: Number,
        default: null
    },
    fieldsModified: [{
        fieldName: String,
        fieldLabel: String,
        previousValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed
    }],
    reason: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: String,
        required: true,
        index: true
    },
    userRole: {
        type: String,
        default: 'Admin'
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        default: null,
        index: true
    },
    saleIdentifier: {
        type: String,
        default: null
    },
    incomeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        default: null
    },
    installmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Installment',
        default: null
    },
    revertedLogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TreasuryAuditLog',
        default: null
    },
    isReversal: {
        type: Boolean,
        default: false
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

const TreasuryAuditLog = mongoose.models.TreasuryAuditLog || mongoose.model('TreasuryAuditLog', treasuryAuditLogSchema);

export default TreasuryAuditLog;
