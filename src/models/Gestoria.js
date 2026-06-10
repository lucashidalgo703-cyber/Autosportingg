import mongoose from 'mongoose';

const GestoriaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'El título del trámite es requerido'],
        trim: true
    },
    type: {
        type: String,
        enum: ['Transferencia Ingreso', 'Transferencia Egreso', '08 Blanco', 'Informe Dominio', 'Alta Patente', 'Baja Patente', 'Duplicado Título', 'Cédula Azul', 'Otro'],
        required: [true, 'El tipo de trámite es requerido']
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car'
    },
    vehiclePlate: {
        type: String,
        trim: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    gestorName: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Iniciado', 'En Registro', 'Observado', 'Para Retirar', 'Finalizado', 'Cancelado'],
        default: 'Iniciado'
    },
    cost: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        enum: ['ARS', 'USD'],
        default: 'ARS'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    estimatedEndDate: {
        type: Date
    },
    actualEndDate: {
        type: Date
    },
    notes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    }
}, {
    timestamps: true
});

const Gestoria = mongoose.models.Gestoria || mongoose.model('Gestoria', GestoriaSchema);
export default Gestoria;
