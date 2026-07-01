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
    status: { type: String, enum: ['activo', 'anulado'], default: 'activo' },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    installmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Installment' },
    payeeCompany: { type: String, enum: ['LHIVER', 'AUTOTERRA', 'AKAR'] },
    payeeVehicle: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
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
