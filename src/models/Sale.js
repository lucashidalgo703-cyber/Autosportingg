import mongoose from 'mongoose';

const saleExpenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    status: { type: String, enum: ['Pendiente', 'En Proceso', 'Pagado'], default: 'Pendiente' },
    date: { type: Date, default: Date.now }
});

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

const vehicleChangeHistorySchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    user: { type: String, required: true },
    reason: { type: String, required: true },
    previousVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    previousVehicleSnapshot: {
        brand: String,
        model: String,
        year: Number,
        plate: String,
        price: Number,
        currency: String,
        purchasePrice: Number,
        purchaseCurrency: String,
        investorPercentage: Number
    },
    newVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    newVehicleSnapshot: {
        brand: String,
        model: String,
        year: Number,
        plate: String,
        price: Number,
        currency: String,
        purchasePrice: Number,
        purchaseCurrency: String,
        investorPercentage: Number
    },
    documentsChecklist: [{
        key: { type: String },
        label: { type: String },
        checked: { type: Boolean, default: false }
    }],
    notes: { type: String }
}, { _id: true });

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
    ownerDni: { type: String },
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

const financingDetailsSchema = new mongoose.Schema({
    hasFinancing: { type: Boolean, default: false },
    cashPrice: { type: Number, min: 0 },
    downPayment: { type: Number, min: 0, default: 0 },
    // Sin financiación (contado o entrega que cubre el total): el campo no existe (undefined).
    // Con saldo financiado debe ser 3, 6, 12, 18 o 24.
    installmentsCount: {
        type: Number,
        enum: [3, 6, 12, 18, 24],
        set: (val) => (val === '' || val === null || val === undefined || Number(val) === 0 ? undefined : Number(val)),
        required: [
            function () { return Boolean(this.hasFinancing) && Number(this.financedBalance) > 0; },
            'Indicá la cantidad de cuotas (3, 6, 12, 18 o 24) para el saldo financiado.'
        ]
    },
    interestRate: { type: Number, min: 0, default: 0 },
    financedBalance: { type: Number, min: 0, default: 0 },
    interestAmount: { type: Number, min: 0, default: 0 },
    totalFinancedWithInterest: { type: Number, min: 0, default: 0 },
    installmentAmount: { type: Number, min: 0, default: 0 },
    lastInstallmentAmount: { type: Number, min: 0, default: 0 },
    totalOperationPrice: { type: Number, min: 0, default: 0 },
    roundingAdjustment: { type: Number, default: 0 },
    includesDeposit: { type: Boolean, default: false },
    calculationMode: { type: String, enum: ['by_rate', 'by_installment'], default: 'by_installment' },
    customInstallmentAmount: { type: Number, min: 0 }
}, { _id: false });

const saleSchema = new mongoose.Schema({
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    
    status: { 
        type: String, 
        enum: ['borrador', 'señado', 'confirmada', 'pendiente_entrega', 'entregada', 'cancelada'], 
        default: 'confirmada' 
    },
    
    saleDate: { type: Date, default: Date.now },
    salesperson: { type: String },
    
    salePrice: { type: Number, required: true, min: 0 },
    saleCurrency: { type: String, enum: ['ARS', 'USD'], required: true },
    exchangeRate: { type: Number, min: 0, set: safeNumberSetter },

    depositAppliedAmount: { type: Number, default: 0, min: 0 },
    depositAppliedCurrency: { type: String, enum: ['ARS', 'USD'] },
    
    paymentMethod: { 
        type: String, 
        enum: ['contado', 'financiado', 'mixto', 'leasing', 'permuta', 'criptomonedas', 'otro'], 
        default: 'contado' 
    },
    
    // Financiación / Condiciones Comerciales
    financingDetails: { type: financingDetailsSchema, default: null },
    
    // Trade-ins / Permutas
    tradeIns: { type: [tradeInVehicleSchema], default: [] },
    tradeInTotalAmount: { type: Number, default: 0 },
    balanceAfterTradeIn: { type: Number, default: 0 },
    paymentBreakdown: { type: String }, // Detalles opcionales de cómo se paga la diferencia

    saleExpenses: { type: [saleExpenseSchema], default: [] },

    notes: { type: String },

    documentationStatus: { 
        type: String, 
        enum: ['pendiente', 'parcial', 'completo'], 
        default: 'pendiente' 
    },

    // EXPEDIENTE UNIFICADO
    expedienteStatus: {
        type: String,
        enum: ['pendiente', 'en_proceso', 'observado', 'listo', 'transferido', 'finalizado', 'entregado', 'cancelado'],
        default: 'en_proceso'
    },
    expedienteResponsible: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    expedienteDueDate: { type: Date },

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
    
    // CARGA MANUAL Y PROPIETARIO
    isManualImport: { type: Boolean, default: false },
    vehicleOwnerName: { type: String },
    vehicleOwnerPhone: { type: String },
    
    // CONSIGNACIÓN
    consignationOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    consignationManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    
    // COMISIONES
    commissionSettings: {
        isManual: { type: Boolean, default: false },
        sellerPct: { type: Number, default: 1 },
        consignationPct: { type: Number, default: 0.5 },
        extraAmount: { type: Number, default: 0 },
        extraCurrency: { type: String, enum: ['ARS', 'USD'], default: 'USD' },
        isSplit: { type: Boolean, default: false },
        // Comisión adicional: 'fixed' (importe fijo, también para todo lo histórico sin este campo)
        // o 'percent' (extraAmount = base × percent / 100, recalculado en el servidor).
        mode: { type: String, enum: ['fixed', 'percent'] },
        percent: { type: Number, min: 0, max: 100 },
        base: { type: Number, min: 0 },
        baseCurrency: { type: String, enum: ['ARS', 'USD'] }
    },
    
    // ITEMS FÍSICOS DE ENTREGA
    deliveryItems: {
        securityNut: { type: Boolean, default: false },
        spareKey: { type: Boolean, default: false },
        manuals: { type: Boolean, default: false },
        vehicleCard: { type: Boolean, default: false }
    },
    
    // PAGO EXTENDIDO
    installmentsCount: { type: Number, default: 0 },
    
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    assignedAt: { type: Date },
    
    // POSTVENTA
    postSaleStatus: { 
        type: String, 
        enum: ['pendiente', 'contactado', 'conforme', 'incidencia', 'cerrado'], 
        default: 'pendiente' 
    },
    postSaleResponsible: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    postSaleNextContact: { type: Date },
    postSaleType: { type: String, enum: ['Llamado', 'WhatsApp', 'Email', 'Presencial', 'Otro'], default: 'WhatsApp' },
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

    vehicleChangeHistory: { type: [vehicleChangeHistorySchema], default: [] },
    saleAuditLog: { type: [saleAuditSchema], default: [] }
}, {
    timestamps: true
});

// Preventive Index: Find active sales for a vehicle quickly
saleSchema.index({ vehicleId: 1, status: 1 });

// Datos anteriores guardaban installmentsCount = 0 para "sin financiación": se normaliza a "sin valor".
saleSchema.pre('validate', function () {
    const fin = this.financingDetails;
    if (fin && fin.installmentsCount === 0) {
        fin.installmentsCount = undefined;
    }
});

const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);

export default Sale;
