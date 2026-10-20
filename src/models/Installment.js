import mongoose from 'mongoose';

const rescheduleHistorySchema = new mongoose.Schema({
    previousDate: { type: Date, required: true },
    newDate: { type: Date, required: true },
    reason: { type: String, required: true },
    notes: { type: String },
    user: { type: String, required: true },
    date: { type: Date, default: Date.now },
    isCancelled: { type: Boolean, default: false },
    cancelReason: { type: String }
}, { _id: true });

const installmentAuditSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'CUOTA_CREADA',
            'CUOTA_EDITADA',
            'CUOTA_ANULADA',
            'CUOTA_MARCADA_PAGADA_MANUAL',
            'PLAN_GENERADO',
            'COBRO_REGISTRADO',
            'REGULARIZACION_CONCILIADA',
            'REGULARIZACION_REVERTIDA',
            'CUOTA_REPROGRAMADA',
            'CUOTA_REPROGRAMACION_CANCELADA'
        ]
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
    originalDueDate: {
        type: Date
    },
    isRescheduled: {
        type: Boolean,
        default: false
    },
    rescheduledDate: {
        type: Date
    },
    rescheduledReason: {
        type: String
    },
    rescheduledBy: {
        type: String
    },
    rescheduleHistory: {
        type: [rescheduleHistorySchema],
        default: []
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
        enum: ['pendiente', 'parcial', 'pagada', 'vencida', 'pagada_manual', 'anulada', 'reprogramada'],
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
    // Regularización histórica en lote
    isHistoricallyRegularized: {
        type: Boolean,
        default: false
    },
    regularizationBatchId: {
        type: String
    },
    regularizedAt: {
        type: Date
    },
    regularizedBy: {
        type: String
    },
    installmentAuditLog: [installmentAuditSchema]
}, { timestamps: true });

installmentSchema.pre('save', function (next) {
    if (!this.originalDueDate && this.dueDate) {
        this.originalDueDate = this.dueDate;
    }
    if (typeof next === 'function') next();
});

const Installment = mongoose.models.Installment || mongoose.model('Installment', installmentSchema);
export default Installment;
