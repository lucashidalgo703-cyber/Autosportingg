import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { _id: false });

const leadAuditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    field: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    details: { type: String },
    date: { type: Date, default: Date.now },
    user: { type: String, default: 'CRM_V2' },
    source: { type: String, default: 'CRM_V2' }
}, { _id: false });

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    dueDate: { type: Date },
    status: { type: String, enum: ['pendiente', 'completada', 'cancelada'], default: 'pendiente' },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    user: { type: String, default: 'CRM_V2' }
});

const leadSchema = new mongoose.Schema({
    // Legacy / Mandatory Fields
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pipelineStage: { 
        type: String, 
        enum: [
            'Nuevo Contacto', 
            'Seguimiento Activo', 
            'Visita / Test Drive', 
            'Evaluación de Usado', 
            'Señado', 
            'Entregado / Vendido'
        ], 
        default: 'Nuevo Contacto' 
    },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null },
    notes: [noteSchema],
    
    // CRM V2 New Fields (Optional / Defaulted for compatibility)
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    
    phoneNormalized: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    emailNormalized: { type: String, trim: true, lowercase: true, index: true },
    
    source: { 
        type: String, 
        enum: ['web', 'whatsapp', 'instagram', 'local', 'referido', 'mercadolibre', 'otro'], 
        default: 'otro' 
    },
    crmStatus: { 
        type: String, 
        enum: ['nuevo', 'contactado', 'interesado', 'seguimiento', 'reservado', 'perdido', 'convertido'], 
        default: 'nuevo' 
    },
    priority: { 
        type: String, 
        enum: ['baja', 'media', 'alta'], 
        default: 'media' 
    },
    
    assignedTo: { type: String, default: '' },
    nextActionDate: { type: Date },
    lastActivityAt: { type: Date, default: Date.now },
    
    tasks: [taskSchema],
    leadAuditLog: [leadAuditSchema],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Sync Middleware for validation (No `next` parameter to avoid async issues)
leadSchema.pre('validate', function() {
    if (this.phone) {
        this.phoneNormalized = this.phone.replace(/\D/g, '');
    }
    if (this.email) {
        this.emailNormalized = this.email.toLowerCase().trim();
    }
});

// Sync Middleware to update timestamps
leadSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

export default Lead;
