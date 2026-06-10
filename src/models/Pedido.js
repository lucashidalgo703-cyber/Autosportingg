import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: [true, 'El nombre del cliente es requerido'],
        trim: true
    },
    clientPhone: {
        type: String,
        required: [true, 'El teléfono del cliente es requerido'],
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
        enum: ['Pendiente', 'Buscando', 'Encontrado', 'Cancelado', 'Completado'],
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
    }
}, {
    timestamps: true
});

const Pedido = mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);
export default Pedido;
