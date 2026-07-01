import mongoose from 'mongoose';

const quoteAuditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    details: { type: String },
    date: { type: Date, default: Date.now },
    user: { type: String, default: 'CRM_V2' }
}, { _id: false });

const quoteSchema = new mongoose.Schema({
    quoteNumber: { type: Number, unique: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null },
    
    vehicleDescription: { type: String, default: '' },
    price: { type: Number, default: 0 },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'USD' },
    
    issueDate: { type: Date, default: Date.now },
    validUntil: { type: Date },
    paymentTerms: { type: String, default: '' },
    notes: { type: String, default: '' },
    
    tradeIn: {
        brand: { type: String, default: '' },
        model: { type: String, default: '' },
        year: { type: Number, default: null },
        plate: { type: String, default: '' },
        mileage: { type: Number, default: null },
        value: { type: Number, default: 0 },
        currency: { type: String, enum: ['ARS', 'USD'], default: 'USD' }
    },
    
    status: {
        type: String,
        enum: ['pendiente', 'enviada', 'en_revision', 'aprobada', 'modificada', 'rechazada'],
        default: 'pendiente'
    },
    
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    createdBy: { type: String, default: 'CRM_V2' },
    updatedBy: { type: String, default: 'CRM_V2' },
    
    quoteAuditLog: [quoteAuditSchema],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Sync Middleware to handle defaults and updates
quoteSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Set validUntil to 7 days from issueDate if not set
    if (this.isNew && !this.validUntil) {
        const date = new Date(this.issueDate || Date.now());
        date.setDate(date.getDate() + 7);
        this.validUntil = date;
    }
    
    if (typeof next === 'function') next();
});

const Quote = mongoose.models.Quote || mongoose.model('Quote', quoteSchema);
export default Quote;
