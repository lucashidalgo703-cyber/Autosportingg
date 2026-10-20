import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    type: { type: String, enum: ['Ingreso', 'Egreso'], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['USD', 'ARS'], required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' }, // Optional linked car
    notes: { type: String },
    
    // --- Campos CRM V2 (Opcionales para no romper legacy) ---
    module: { type: String, enum: ['legacy', 'crm_v2'], default: 'legacy' },
    source: { type: String, enum: ['manual', 'venta', 'reserva', 'cuota', 'otro'], default: 'manual' },
    concept: { type: String },
    paymentMethod: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro', 'transferencia BANCO GALICIA', 'transferencia BANCO SANTANDER', 'transferencia BANCO NACION'] },
    status: { type: String, enum: ['activo', 'anulado', 'pendiente'], default: 'activo' },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    installmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Installment' },
    installmentPaidAmountApplied: { type: Number, default: 0 },
    receiptReference: { type: String },
    paymentSplits: [{
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
        accountName: { type: String },
        accountType: { type: String },
        paymentMethod: { type: String },
        amount: { type: Number },
        currency: { type: String }
    }],
    payeeCompany: { type: String, enum: ['LHIVER', 'AUTOTERRA', 'AKAR', 'ALWAYS SAS'] },
    payeeVehicle: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
    targetUser: { type: String },
    transactionAuditLog: [{
        action: String,
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        date: { type: Date, default: Date.now },
        user: String,
        details: String,
        source: String
    }],
    // --- Campos AFIP/IVA ---
    fiscalCategory: { type: String, enum: ['A', 'B', 'C', 'Exenta', 'Sin clasificar'], default: 'Sin clasificar' },
    ivaRate: { type: Number, default: 0 },
    invoiceNumber: { type: String },
    taxNotes: { type: String },
    // --- Conversión ---
    exchangeRate: { type: Number },
    conversionDate: { type: Date },
    // --- Tesorería Estratégica ---
    treasuryBoxKey: { type: String, default: null },
    isTreasuryDistributed: { type: Boolean, default: false },
    isTreasuryDistributionReversed: { type: Boolean, default: false },
    isTreasuryExpenseSynced: { type: Boolean, default: false },
    distributedAt: { type: Date },
    distributedBy: { type: String },
    thirdPartyAmount: { type: Number, default: 0 },
    thirdPartyCapitalReturn: { type: Number, default: 0 },
    thirdPartyProfitShare: { type: Number, default: 0 },
    thirdPartyOwner: { type: String, default: null },
    thirdPartySettled: { type: Boolean, default: false },
    treasuryBreakdown: {
        totalCollected: { type: Number, default: 0 },
        ownGrossAmount: { type: Number, default: 0 },
        thirdPartyAmount: { type: Number, default: 0 },
        thirdPartyCapitalReturn: { type: Number, default: 0 },
        thirdPartyProfitShare: { type: Number, default: 0 },
        operationPendingCostsReserved: { type: Number, default: 0 },
        capitalRecoveredToStock: { type: Number, default: 0 },
        marginCollected: { type: Number, default: 0 },
        essentialShortfallsCovered: { type: Number, default: 0 },
        reserveCovered: { type: Number, default: 0 },
        extraReinvestmentToStock: { type: Number, default: 0 },
        remainderDistributed: { type: Number, default: 0 },
        unassignedRemainder: { type: Number, default: 0 },
        reinvestmentExtraPctApplied: { type: Number, default: null },
        unassignedReason: { type: String, default: null },
        obligationsSeparated: { type: Number, default: 0 },
        taxObligationsSeparated: { type: Number, default: 0 },
        distributableMargin: { type: Number, default: 0 },
        marginDistributed: { type: Number, default: 0 },
        pendingDistributionAmount: { type: Number, default: 0 },
        pendingReason: { type: String, default: null },
        schemeKey: { type: String, default: null },
        schemeName: { type: String, default: null },
        schemePercentages: { type: mongoose.Schema.Types.Mixed, default: null },
        destinationBreakdown: [{
            destinationKey: String,
            destinationLabel: String,
            boxKey: String,
            boxName: String,
            percentage: Number,
            amount: Number
        }],
        appliedAllocations: [{
            boxKey: String,
            boxName: String,
            amount: Number,
            step: String,
            historyType: String,
            reason: String
        }]
    },
    treasuryControl: {
        isBeforeCutoff: { type: Boolean, default: false },
        inboxStatus: { type: String, enum: ['pendiente', 'distribuido', 'excluido_corte', 'ignorado', 'revertido'], default: 'pendiente' }
    },
    idempotencyKey: { type: String, index: true, sparse: true },
    // --------------------------------------------------------

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

transactionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (typeof next === 'function') next();
});

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
