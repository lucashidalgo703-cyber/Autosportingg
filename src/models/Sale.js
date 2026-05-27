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
    
    notes: { type: String },
    
    createdBy: { type: String },
    updatedBy: { type: String },
    
    saleAuditLog: { type: [saleAuditSchema], default: [] }
}, {
    timestamps: true
});

// Preventive Index: Find active sales for a vehicle quickly
saleSchema.index({ vehicleId: 1, status: 1 });

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
