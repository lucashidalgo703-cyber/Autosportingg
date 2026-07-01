import mongoose from 'mongoose';

const reservationAuditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    field: { type: String },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    details: { type: String },
    date: { type: Date, default: Date.now },
    user: { type: String, default: 'Admin' },
    source: { type: String, default: 'CRM_V2' }
}, { _id: false });

const reservationSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    
    salesperson: { type: String },
    
    status: { 
        type: String, 
        enum: ['activa', 'convertida', 'vencida', 'cancelada', 'devuelta', 'retenida'], 
        default: 'activa' 
    },
    
    agreedPrice: { type: Number, required: true, min: 0 },
    agreedCurrency: { type: String, enum: ['ARS', 'USD'], required: true },
    
    depositAmount: { type: Number, required: true, min: 0 },
    depositCurrency: { type: String, enum: ['ARS', 'USD'], required: true },
    depositMethod: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta', 'otro'], required: true },
    depositDate: { type: Date, default: Date.now },
    
    expiresAt: { type: Date, required: true },
    
    conditions: { type: String },
    notes: { type: String },
    
    createdBy: { type: String },
    updatedBy: { type: String },
    
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', default: null },
    assignedAt: { type: Date },
    
    reservationAuditLog: { type: [reservationAuditSchema], default: [] }
}, {
    timestamps: true
});

const Reservation = mongoose.model('Reservation', reservationSchema);

export default Reservation;
