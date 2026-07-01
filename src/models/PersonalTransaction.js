import mongoose from 'mongoose';

const personalTransactionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['ingreso', 'egreso'], 
        required: true 
    },
    concept: { 
        type: String, 
        required: true 
    },
    category: { 
        type: String, 
        required: true 
    },
    amount: { 
        type: Number, 
        required: true,
        min: 0 
    },
    currency: { 
        type: String, 
        enum: ['ARS', 'USD'], 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pendiente', 'pagado', 'vencido', 'cancelado'], 
        default: 'pagado' 
    },
    expenseType: { 
        type: String, 
        enum: ['fijo', 'eventual'], 
        default: 'eventual' 
    },
    frequency: { 
        type: String, 
        enum: ['unica', 'semanal', 'mensual', 'anual'], 
        default: 'unica' 
    },
    paymentMethod: { 
        type: String 
    },
    transactionDate: { 
        type: Date, 
        default: Date.now 
    },
    notes: { 
        type: String 
    },
    createdBy: { 
        type: String 
    },
    updatedBy: { 
        type: String 
    }
}, {
    timestamps: true
});

const PersonalTransaction = mongoose.models.PersonalTransaction || mongoose.model('PersonalTransaction', personalTransactionSchema);

export default PersonalTransaction;
