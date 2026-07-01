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
        ref: 'Client' // Comprador
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client' // Propietario / Vendedor
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sale'
    },
    organismo: {
        type: String,
        trim: true
    },
    chargedToClient: {
        type: Boolean,
        default: false
    },
    gestorName: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Pendiente', 'Documentación', 'Presentado', 'Observado', 'Transferido', 'Finalizado', 'Cancelado'],
        default: 'Pendiente'
    },
    cost: {
        type: Number,
        default: 0 // Costo real
    },
    chargedAmount: {
        type: Number,
        default: 0 // Cobro al cliente
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
    documents: [{
        name: String,
        url: String,
        type: String
    }],
    createdBy: {
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

const Gestoria = mongoose.models.Gestoria || mongoose.model('Gestoria', GestoriaSchema);
export default Gestoria;
