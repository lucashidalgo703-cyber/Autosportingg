import mongoose from 'mongoose';

const ORDER_STATUSES = [
    'ingresado', 'cotizando', 'esperando_aprobacion', 'aprobado',
    'enviado_proveedor', 'en_trabajo', 'terminado_proveedor',
    'recibido', 'listo', 'entregado', 'cancelado', 'en_garantia'
];

export const VALID_TRANSITIONS = {
    'ingresado': ['cotizando', 'cancelado'],
    'cotizando': ['esperando_aprobacion', 'cancelado'],
    'esperando_aprobacion': ['aprobado', 'cotizando', 'cancelado'],
    'aprobado': ['enviado_proveedor', 'cancelado'],
    'enviado_proveedor': ['en_trabajo', 'cancelado'],
    'en_trabajo': ['terminado_proveedor', 'cancelado'],
    'terminado_proveedor': ['recibido'],
    'recibido': ['listo'],
    'listo': ['entregado'],
    'entregado': ['en_garantia'],
    'en_garantia': ['enviado_proveedor'],
    'cancelado': []
};

export const canTransition = (from, to) => {
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
};

const workshopCounterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});
const WorkshopCounter = mongoose.models.WorkshopCounter || mongoose.model('WorkshopCounter', workshopCounterSchema, 'workshopCounters');

const workshopOrderSchema = new mongoose.Schema({
    orderNumber: {
        type: Number,
        required: true,
        unique: true,
        immutable: true
    },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    customerVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerVehicle', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopProvider' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    activeVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerVehicle' },

    status: {
        type: String,
        enum: ORDER_STATUSES,
        required: true,
        default: 'ingresado'
    },

    vehicleSnapshot: {
        plate: { type: String },
        brand: { type: String },
        model: { type: String },
        km: { type: Number, min: 0 }
    },

    km: { type: Number, min: 0 },
    fuelLevel: { type: String },
    checklist: [{ type: String }],
    damage: { type: String },
    accessories: { type: String },
    photos: [{
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        name: { type: String, required: true },
        contentType: { type: String, required: true },
        size: { type: Number, required: true }
    }],
    requestedWork: { type: String },

    admissionDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date },

    stateHistory: [{
        status: {
            type: String,
            enum: ORDER_STATUSES,
            required: true
        },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
        actorLabel: { type: String },
        date: { type: Date, default: Date.now },
        note: { type: String }
    }]
}, { timestamps: true });

workshopOrderSchema.index(
    { activeVehicleId: 1 },
    { unique: true, partialFilterExpression: { activeVehicleId: { $type: 'objectId' } } }
);

workshopOrderSchema.pre('validate', async function() {
    if (this.isNew) {
        const counter = await WorkshopCounter.findByIdAndUpdate(
            { _id: 'workshopOrderId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.orderNumber = counter.seq;
        if (this.status !== 'entregado' && this.status !== 'cancelado') {
            this.activeVehicleId = this.customerVehicleId;
        } else {
            this.activeVehicleId = undefined;
        }
    } else {
        if (this.status === 'entregado' || this.status === 'cancelado') {
            this.activeVehicleId = undefined;
        } else if (this.customerVehicleId) {
            this.activeVehicleId = this.customerVehicleId;
        }
    }
});

const WorkshopOrder = mongoose.models.WorkshopOrder || mongoose.model('WorkshopOrder', workshopOrderSchema);

export default WorkshopOrder;
