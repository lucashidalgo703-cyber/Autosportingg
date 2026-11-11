import mongoose from 'mongoose';
import { normalizePhoneToWhatsApp } from '../utils/phoneNormalizer.js';


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
        enum: ['llamada', 'whatsapp', 'email', 'visita', 'cita_agendada', 'cotizacion_enviada', 'nota', 'otro'],
        required: true 
    },
    date: { type: Date, default: Date.now },
    note: { type: String, required: true },
    outboundNoReply: { type: Boolean, default: false },
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
        enum: ['web', 'whatsapp', 'instagram', 'facebook', 'referido', 'local', 'mercadolibre', 'otro'],
        default: 'otro'
    },
    status: {
        type: String,
        enum: ['activo', 'inactivo', 'bloqueado'],
        default: 'activo'
    },
    doNotContact: { type: Boolean, default: false },
    contactConfirmed: { type: Boolean, default: null },
    
    tags: [{ type: String, trim: true }],
    notes: { type: String, default: '' },
    pipelineStage: {
        type: String,
        enum: ['sin_contactar', 'contactado', 'con_pedido', 'visita', 'negociacion', 'cerrado', 'perdido',
            'nuevo', 'cita_agendada', 'mostrando_autos', 'en_negociacion', 'propuesta_enviada', 'sin_interes'],
        default: 'sin_contactar'
    },
    reason: { type: String, enum: ['lead_digital', 'entro_puerta'], default: 'lead_digital' },
    vehicleOfInterest: { type: String, default: '' },
    interestedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null },
    notificationRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', default: null },
    segment: { type: String, enum: ['regular', 'vip'], default: 'regular' },
    gender: { type: String, enum: ['', 'mujer', 'hombre'], default: '' },
    birthDate: { type: Date, default: null },
    occupation: { type: String, maxlength: 300, default: '' },
    purchaseMethod: { type: String, enum: ['', 'contado', 'financiacion'], default: '' },
    purchaseTiming: { type: String, enum: ['', 'ahora', '1_3_meses', 'mas_adelante', 'explorando'], default: '' },
    availableDownPayment: { type: Number, min: 0, default: null },
    downPaymentCurrency: { type: String, enum: ['ARS', 'USD', null], default: null },
    tradeInIntent: { type: String, enum: ['', 'si', 'no'], default: '' },
    description: { type: String, default: '' },
    brand: { type: String, default: '' },
    model: { type: String, default: '' },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'USD' },
    maxBudget: { type: Number, min: 0, default: null },
    yearFrom: { type: Number, default: null },
    yearTo: { type: Number, default: null },
    lastContactDate: { type: Date, default: null },
    nextAction: { type: String, default: '' },
    nextActionDate: { type: Date, default: null },
    
    createdBy: { type: String, default: 'CRM_V2' },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null,
        set: v => v === '' ? null : v
    },
    assignedAt: { type: Date },
    
    lastActivityAt: { type: Date, default: Date.now },
    
    interactions: [interactionSchema],
    clientAuditLog: [clientAuditSchema]
}, { timestamps: true });

// Índices no destructivos (sin unique)
clientSchema.index({ fullName: 1 });
clientSchema.index({ createdAt: -1 });
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
        this.phone = normalizePhoneToWhatsApp(this.phone);
        this.phoneNormalized = this.phone.replace(/\D/g, ''); // Deja solo números
    } else if (this.isModified('phone')) this.phoneNormalized = undefined;
    
    if (this.email) {
        this.emailNormalized = this.email.toLowerCase().trim();
    } else if (this.isModified('email')) this.emailNormalized = undefined;
});

clientSchema.pre('save', function() {
    this.lastActivityAt = Date.now();
});

const Client = mongoose.models.Client || mongoose.model('Client', clientSchema);

export default Client;
