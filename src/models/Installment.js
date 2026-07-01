import mongoose from 'mongoose';

const installmentAuditSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['CUOTA_CREADA', 'CUOTA_EDITADA', 'CUOTA_ANULADA', 'CUOTA_MARCADA_PAGADA_MANUAL', 'PLAN_GENERADO', 'COBRO_REGISTRADO']
    },
    user: { type: String, required: true },
    date: { type: Date, default: Date.now },
    details: { type: String }
}, { _id: false });

const installmentSchema = new mongoose.Schema({
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    },
    source: {
        type: String,
        enum: ['venta', 'manual'],
        default: 'venta'
    },
    customerName: {
        type: String
    },
    customerPhone: {
        type: String
    },
    concept: {
        type: String
    },
    paymentMethod: {
        type: String
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car'
    },
    installmentNumber: {
        type: Number,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        enum: ['ARS', 'USD']
    },
    status: {
        type: String,
        required: true,
        enum: ['pendiente', 'parcial', 'pagada', 'vencida', 'pagada_manual', 'anulada'],
        default: 'pendiente'
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    paymentDate: {
        type: Date
    },
    notes: {
        type: String
    },
    createdBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    installmentAuditLog: [installmentAuditSchema]
}, { timestamps: true });

const Installment = mongoose.models.Installment || mongoose.model('Installment', installmentSchema);
export default Installment;
