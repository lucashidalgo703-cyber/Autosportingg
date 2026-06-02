import mongoose from 'mongoose';

const saleAuditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    field: { type: String },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    details: { type: String },
    date: { type: Date, default: Date.now },
    user: { type: String, default: 'Admin' },
    source: { type: String, default: 'CRM_V2' }
}, { _id: false });

const checklistItemSchema = new mongoose.Schema({
    key: { type: String, required: true },
    label: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: String }
}, { _id: false });

const safeNumberSetter = (val) => {
    if (val === '' || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
};

const safeRequiredNumberSetter = (val) => {
    if (val === '' || val === null || val === undefined) return 0; // Or let validation catch it
    const num = Number(val);
    return isNaN(num) ? 0 : num;
};

const tradeInVehicleSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: String, required: true },
    version: { type: String },
    year: { type: Number, required: true, set: safeNumberSetter },
    plate: { type: String },
    mileage: { type: Number, set: safeNumberSetter },
    color: { type: String },
    vin: { type: String },
    engineNumber: { type: String },
    ownerName: { type: String },
    ownerDocument: { type: String },
    estimatedValue: { type: Number, required: true, min: 0, set: safeNumberSetter },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    conditionNotes: { type: String },
    mechanicalNotes: { type: String },
    documentationStatus: { type: String, enum: ['pendiente', 'parcial', 'completo'], default: 'pendiente' },
    hasDebt: { type: Boolean, default: false },
    debtAmount: { type: Number, default: 0, set: safeNumberSetter },
    hasLien: { type: Boolean, default: false },
    transferStatus: { type: String, enum: ['pendiente', 'en_tramite', 'transferido'], default: 'pendiente' },
    receivedAt: { type: Date },
    receivedBy: { type: String },
    linkedStockCarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    shouldEnterStock: { type: Boolean, default: false },
    enteredStockAt: { type: Date }
});

const saleSchema = new mongoose.Schema({
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    
    status: { 
        type: String, 
        enum: ['borrador', 'confirmada', 'pendiente_entrega', 'entregada', 'cancelada'], 
        default: 'confirmada' 
    },
    
    saleDate: { type: Date, default: Date.now },
    salesperson: { type: String },
    
    salePrice: { type: Number, required: true, min: 0 },
    saleCurrency: { type: String, enum: ['ARS', 'USD'], required: true },
    
    depositAppliedAmount: { type: Number, default: 0, min: 0 },
    depositAppliedCurrency: { type: String, enum: ['ARS', 'USD'] },
    
    paymentMethod: { 
        type: String, 
        enum: ['contado', 'financiado', 'mixto', 'otro'], 
        default: 'contado' 
    },
    
    // Trade-ins / Permutas
    tradeIns: { type: [tradeInVehicleSchema], default: [] },
    tradeInTotalAmount: { type: Number, default: 0 },
    balanceAfterTradeIn: { type: Number, default: 0 },
    paymentBreakdown: { type: String }, // Detalles opcionales de cómo se paga la diferencia
    
    notes: { type: String },

    documentationStatus: { 
        type: String, 
        enum: ['pendiente', 'parcial', 'completo'], 
        default: 'pendiente' 
    },
    deliveryStatus: { 
        type: String, 
        enum: ['pendiente', 'preparando', 'listo_para_entregar', 'entregado'], 
        default: 'pendiente' 
    },
    estimatedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    
    documentationChecklist: { type: [checklistItemSchema], default: [] },
    deliveryChecklist: { type: [checklistItemSchema], default: [] },
    
    createdBy: { type: String },
    updatedBy: { type: String },
    
    cancelledAt: { type: Date },
    cancelledBy: { type: String },
    cancellationReason: { type: String },
    cancellationNotes: { type: String },
    
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    assignedAt: { type: Date },
    
    // POSTVENTA
    postSaleStatus: { 
        type: String, 
        enum: ['pendiente', 'contactado', 'conforme', 'incidencia', 'cerrado'], 
        default: 'pendiente' 
    },
    postSaleChecklist: {
        seguimiento24h: { type: Boolean, default: false },
        seguimiento7d: { type: Boolean, default: false },
        seguimiento30d: { type: Boolean, default: false },
        obsequioEntregado: { type: Boolean, default: false },
        resenaSolicitada: { type: Boolean, default: false },
        resenaRecibida: { type: Boolean, default: false },
        incidenciaResuelta: { type: Boolean, default: false }
    },
    postSaleNotes: { type: String },
    satisfactionRating: { type: Number, min: 1, max: 5 },

    saleAuditLog: { type: [saleAuditSchema], default: [] }
}, {
    timestamps: true
});

// Preventive Index: Find active sales for a vehicle quickly
saleSchema.index({ vehicleId: 1, status: 1 });

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
