import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    clientName: {
        type: String,
        trim: true
    },
    clientPhone: {
        type: String,
        trim: true
    },
    requestedBrand: {
        type: String,
        required: [true, 'La marca solicitada es requerida'],
        trim: true
    },
    requestedModel: {
        type: String,
        required: [true, 'El modelo solicitado es requerido'],
        trim: true
    },
    yearRange: {
        type: String,
        trim: true
    },
    budget: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        enum: ['ARS', 'USD'],
        default: 'ARS'
    },
    status: {
        type: String,
        enum: ['Pendiente', 'Buscando', 'Cumplido', 'Cancelado'],
        default: 'Pendiente'
    },
    notes: {
        type: String,
        trim: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    },
    nextActionDate: {
        type: Date
    },
    auditLog: {
        type: [{
            action: { type: String, required: true },
            field: { type: String },
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed,
            details: { type: String },
            date: { type: Date, default: Date.now },
            user: { type: String, default: 'Admin' }
        }],
        default: []
    }
}, {
    timestamps: true
});

const Pedido = mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);
export default Pedido;
