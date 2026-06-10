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
    currency: {
        type: String,
        enum: ['ARS', 'USD'],
        default: 'ARS'
    },
    status: {
        type: String,
        enum: ['Pendiente', 'En Plan de Pago', 'Pagada', 'Desestimada'],
        default: 'Pendiente'
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
    }
}, {
    timestamps: true
});

const Infraccion = mongoose.models.Infraccion || mongoose.model('Infraccion', InfraccionSchema);
export default Infraccion;
