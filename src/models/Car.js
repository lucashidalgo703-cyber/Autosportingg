import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    name: { type: String, required: true },
    year: { type: Number, required: true },
    km: { type: Number, required: true },
    fuel: { type: String, required: true },
    condition: { type: String, required: true },
    description: { type: String }, // Free text description
    price: { type: Number, required: true },
    currency: { type: String, required: true }, // '$' or 'U$S'
    
    // New Sote CRM fields
    vehicleType: { type: String, default: 'Auto' },
    plateOrVin: { type: String },
    color: { type: String },
    purchasePrice: { type: Number },
    purchaseCurrency: { type: String, default: 'USD' },
    location: { type: String, default: 'Salón Principal' },
    owners: { type: Number, default: 1 },
    agencyOwned: { type: Boolean, default: false },
    investor: {
        name: { type: String },
        percentage: { type: Number, default: 0, min: 0, max: 100 }
    },
    ownerName: { type: String },
    linkedClient: { type: String },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    ownerPhone: { type: String },
    ownerEmail: { type: String },
    consignedBy: { type: String },
    consignmentStatus: { 
        type: String, 
        enum: ['pendiente_contacto', 'contactado', 'agendado', 'ingreso', 'tasacion', 'documentacion', 'publicado', 'reservado', 'vendido', 'cerrado', 'cancelado'],
        default: 'pendiente_contacto'
    },
    consignmentExpectedPrice: { type: Number },
    consignmentValuation: { type: Number },
    consignmentCommission: { type: Number },
    consignmentNextContact: { type: Date },
    consignmentSeller: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    consignmentGoal: { type: Number },
    engineNumber: { type: String },
    chassisNumber: { type: String },
    hasManuals: { type: String, default: 'No' },
    hasDuplicateKeys: { type: String, default: 'No' },
    hasOfficialServices: { type: String, default: 'No' },
    publishedOnML: { type: String, default: 'No' },
    publishedBy: { type: String },
    mlLink: { type: String },
    notes: { type: String },

    documentation: {
        tituloAutomotor: { type: String, enum: ['recibido', 'pendiente', 'no aplica'], default: 'pendiente' },
        cedulaVerde: { type: String, enum: ['recibido', 'pendiente', 'no aplica'], default: 'pendiente' },
        verificacionPolicial: { type: String, enum: ['recibido', 'pendiente', 'no aplica'], default: 'pendiente' },
        informeDominio: { type: String, enum: ['recibido', 'pendiente', 'no aplica'], default: 'pendiente' },
        formulario08: { type: String, enum: ['recibido', 'pendiente', 'no aplica'], default: 'pendiente' },
        libreDeudaPatentes: { type: String, enum: ['recibido', 'pendiente', 'no aplica'], default: 'pendiente' }
    },

    featured: { type: Boolean, default: false },
    sold: { type: Boolean, default: false },
    soldAt: { type: Date },
    status: { type: String, enum: ['Disponible', 'Vendido', 'Reservado', 'Pausado'], default: 'Disponible' },
    
    // Phase 2.4: Visibility and Expenses
    visibleEnWeb: { type: Boolean, default: true },
    expenses: [{
        concept: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, enum: ['ARS', 'USD'], required: true },
        date: { type: Date, default: Date.now },
        note: { type: String }
    }],
    auditLog: {
        type: [{
            action: { type: String, required: true }, // PRECIO, ESTADO, VISIBILIDAD, GASTO, OBSERVACION, EDICION
            field: { type: String },
            oldValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed,
            details: { type: String },
            date: { type: Date, default: Date.now },
            user: { type: String, default: 'Admin' },
            source: { type: String, default: 'CRM_V2' }
        }],
        default: []
    },

    order: { type: Number, default: 0 }, // For manual sorting
    imagePosition: { type: String, default: '50% 75%' }, // CSS object-position
    images: [{ type: String }], // Array of Cloudinary URLs
    coverImage: { type: String }, // specific cover image URL
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Indexes for search and sort optimization
carSchema.index({ brand: 1 });
carSchema.index({ status: 1 });
carSchema.index({ order: 1, createdAt: -1 });

// Middleware to update 'updatedAt' on save
carSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (typeof next === 'function') next();
});

const Car = mongoose.model('Car', carSchema);

export default Car;
