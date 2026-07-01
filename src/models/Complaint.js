import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['abierto', 'en_curso', 'cerrado'], default: 'abierto' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }, // Optional reference to a client
    phone: { type: String },
    reference: { type: String },
    type: { type: String, enum: ['Mecánico', 'Administrativo', 'Documentación', 'Atención', 'Otro'], default: 'Otro' },
    sla: { type: Date },
    notes: [{
        text: String,
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
        createdAt: { type: Date, default: Date.now }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    lastActivityAt: { type: Date, default: Date.now },
    closedAt: { type: Date }
}, { 
    timestamps: true 
});

// Update lastActivityAt on specific changes
complaintSchema.pre('save', function() {
    if (this.isModified('status') || this.isModified('priority') || this.isModified('notes') || this.isModified('assignedTo')) {
        this.lastActivityAt = new Date();
    }
    
    // Auto-set closedAt
    if (this.isModified('status')) {
        if (this.status === 'cerrado' && !this.closedAt) {
            this.closedAt = new Date();
        } else if (this.status !== 'cerrado') {
            this.closedAt = undefined;
        }
    }
});

const Complaint = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

export default Complaint;
