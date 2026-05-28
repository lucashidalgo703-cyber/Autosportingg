import mongoose from 'mongoose';

const crmTaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String }, // notes
    type: { 
        type: String, 
        enum: ['cobranza', 'lead', 'venta', 'general'], 
        default: 'general' 
    },
    status: { 
        type: String, 
        enum: ['pendiente', 'completada', 'cancelada'], 
        default: 'pendiente' 
    },
    priority: { 
        type: String, 
        enum: ['baja', 'media', 'alta'], 
        default: 'media' 
    },
    dueDate: { type: Date, required: true },
    dueTime: { type: String }, // optional time e.g., "14:30"
    
    // Optional timestamps
    completedAt: { type: Date },
    canceledAt: { type: Date },

    // Optional Links
    installmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Installment' },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

    source: { 
        type: String, 
        enum: ['cobranzas', 'agenda', 'ventas', 'leads', 'manual'], 
        default: 'manual' 
    },

    // Audit trace
    createdAt: { type: Date, default: Date.now },
    user: { type: String, default: 'CRM_V2' }
});

const CrmTask = mongoose.models.CrmTask || mongoose.model('CrmTask', crmTaskSchema);

export default CrmTask;
