import mongoose from 'mongoose';

const installmentAuditSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: ['CUOTA_CREADA', 'CUOTA_EDITADA', 'CUOTA_ANULADA', 'CUOTA_MARCADA_PAGADA_MANUAL', 'PLAN_GENERADO']
    },
    user: { type: String, required: true },
    date: { type: Date, default: Date.now },
    details: { type: String }
}, { _id: false });

const installmentSchema = new mongoose.Schema({
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale',
        required: true
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
        enum: ['pendiente', 'vencida', 'pagada_manual', 'anulada'],
        default: 'pendiente'
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
