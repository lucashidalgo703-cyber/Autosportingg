import mongoose from 'mongoose';

const clientAuditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    field: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    details: { type: String },
    date: { type: Date, default: Date.now },
    user: { type: String, default: 'CRM_V2' },
    source: { type: String, default: 'CRM_V2' }
}, { _id: false });

const interactionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        enum: ['llamada', 'whatsapp', 'email', 'visita', 'nota', 'otro'],
        required: true 
    },
    date: { type: Date, default: Date.now },
    note: { type: String, required: true },
    user: { type: String, default: 'CRM_V2' },
    relatedLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null }
}, { _id: false });

const clientSchema = new mongoose.Schema({
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true, default: '' },
    fullName: { type: String, trim: true, required: true }, // Calculado
    
    phone: { type: String, trim: true },
    phoneNormalized: { type: String, trim: true, index: true },
    
    email: { type: String, trim: true, lowercase: true },
    emailNormalized: { type: String, trim: true, lowercase: true, index: true },
    
    dniCuit: { type: String, trim: true, default: '' },
    
    locality: { type: String, trim: true, default: '' },
    province: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    
    type: {
        type: String,
        enum: ['comprador', 'vendedor', 'ambos', 'potencial'],
        default: 'potencial'
    },
    source: {
        type: String,
        enum: ['web', 'whatsapp', 'instagram', 'referido', 'local', 'mercadolibre', 'otro'],
        default: 'otro'
    },
    status: {
        type: String,
        enum: ['activo', 'inactivo', 'bloqueado'],
        default: 'activo'
    },
    
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: '' },
    
    createdBy: { type: String, default: 'CRM_V2' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    assignedAt: { type: Date },
    
    lastActivityAt: { type: Date, default: Date.now },
    
    interactions: [interactionSchema],
    clientAuditLog: [clientAuditSchema]
}, { timestamps: true });

// Índices no destructivos (sin unique)
clientSchema.index({ fullName: 1 });
clientSchema.index({ createdAt: -1 });
clientSchema.index({ phoneNormalized: 1 });
clientSchema.index({ emailNormalized: 1 });

// Middleware para asegurar fullName y fields normalizados antes de guardar
clientSchema.pre('validate', function() {
    if (this.firstName && !this.fullName) {
        this.fullName = `${this.firstName} ${this.lastName || ''}`.trim();
    } else if (this.fullName && !this.firstName) {
        // Fallback simple si solo viene fullName
        const parts = this.fullName.split(' ');
        this.firstName = parts[0];
        if (parts.length > 1) {
            this.lastName = parts.slice(1).join(' ');
        }
    }
    
    if (this.phone) {
        this.phoneNormalized = this.phone.replace(/\D/g, ''); // Deja solo números
    }
    
    if (this.email) {
        this.emailNormalized = this.email.toLowerCase().trim();
    }
});

clientSchema.pre('save', function() {
    this.lastActivityAt = Date.now();
});

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);

export default Client;
