import mongoose from 'mongoose';

const checkSchema = new mongoose.Schema({
    number: { type: String, required: true },
    bank: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },

    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },

    status: {
        type: String,
        enum: ['en_cartera', 'depositado', 'cobrado', 'rechazado', 'entregado_a_tercero', 'anulado'],
        default: 'en_cartera'
    },

    direction: {
        type: String,
        enum: ['recibido', 'emitido'],
        default: 'recibido'
    },

    // Opcionales para trazabilidad
    issuerName: { type: String }, // Quién emitió el cheque (titular de la cuenta)
    issuerCuit: { type: String },
    beneficiaryName: { type: String }, // A quién se emitió el cheque (si es emitido)

    // Vinculación
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // Dónde está depositado o de dónde se emitió
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }, // Movimiento generado al cobrar/depositar

    depositedAt: { type: Date },
    paidAt: { type: Date },

    notes: { type: String },

    createdBy: { type: String },
    updatedBy: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

checkSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (typeof next === 'function') next();
});

const Check = mongoose.model('Check', checkSchema);
export default Check;
