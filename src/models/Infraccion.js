import mongoose from 'mongoose';

const InfraccionSchema = new mongoose.Schema({
    plate: {
        type: String,
        required: [true, 'La patente es requerida'],
        trim: true,
        uppercase: true
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car'
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    },
    issueDate: {
        type: Date
    },
    jurisdiction: {
        type: String,
        trim: true
    },
    reason: {
        type: String,
        required: [true, 'El motivo es requerido'],
        trim: true
    },
    actNumber: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        default: 0
    },
    cost: {
        type: Number,
        default: 0
    },
    chargedAmount: {
        type: Number,
        default: 0
    },
    grossProfit: {
        type: Number,
        default: 0
    },
    agencyPercentage: {
        type: Number,
        default: 100
    },
    paymentStatus: {
        type: String,
        enum: ['Pendiente', 'Pagado', 'Parcial'],
        default: 'Pendiente'
    },
    receiptImage: {
        type: String
    },
    chargedToClient: {
        type: Boolean,
        default: false
    },
    currency: {
        type: String,
        enum: ['ARS', 'USD'],
        default: 'ARS'
    },
    status: {
        type: String,
        enum: ['detectada', 'informada', 'en_gestion', 'pagada', 'resuelta', 'cancelada'],
        default: 'detectada'
    },
    dueDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    },
    responsible: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    },
    auditLog: [{
        action: { type: String, required: true },
        details: { type: String },
        date: { type: Date, default: Date.now },
        user: { type: String, default: 'Admin' }
    }]
}, {
    timestamps: true
});

const Infraccion = mongoose.models.Infraccion || mongoose.model('Infraccion', InfraccionSchema);
export default Infraccion;
