import mongoose from 'mongoose';

const settlementHistorySchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g. CREADA, APROBADA, PAGADA, ANULADA
    date: { type: Date, default: Date.now },
    user: { type: String, required: true }, // username of the person who did the action
    notes: { type: String }
}, { _id: false });

const settlementSchema = new mongoose.Schema({
    period: { type: String, required: true }, // e.g. "2026-06"
    
    // Type of settlement
    type: { type: String, enum: ['ventas', 'gestoria', 'transferencia_manual'], default: 'ventas' },

    username: { type: String, index: true }, // The salesperson receiving the commission (optional for gestoria/manual)
    beneficiaryName: { type: String, index: true }, // The gestor or provider name
    
    // The sales included in this settlement
    includedSales: [{
        saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
        amount: { type: Number, required: true },
        notes: { type: String }
    }],

    // The gestoria files included in this settlement
    includedGestorias: [{
        gestoriaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gestoria', required: true },
        amount: { type: Number, required: true },
        notes: { type: String }
    }],

    // Manual adjustments (bonuses, penalties)
    adjustments: [{
        description: { type: String, required: true },
        amount: { type: Number, required: true }, // positive for bonus, negative for penalty
        type: { type: String, enum: ['bono', 'descuento'], required: true }
    }],
    
    totalAmount: { type: Number, required: true },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    
    status: {
        type: String,
        enum: ['borrador', 'revisada', 'aprobada', 'pagada', 'anulada'],
        default: 'borrador',
        index: true
    },
    
    paymentInfo: {
        paymentDate: { type: Date },
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
    },
    
    history: { type: [settlementHistorySchema], default: [] },
    
    createdBy: { type: String, required: true },
    updatedBy: { type: String }
}, {
    timestamps: true
});

const Settlement = mongoose.model('Settlement', settlementSchema);

export default Settlement;
