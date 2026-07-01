import mongoose from 'mongoose';

const approvalHistorySchema = new mongoose.Schema({
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true },
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now }
}, { _id: false });

const approvalRequestSchema = new mongoose.Schema({
    requester: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'AdminUser',
        required: true 
    },
    approver: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'AdminUser',
        default: null 
    },
    actionType: { 
        type: String, 
        required: true,
        // Ej: 'CANCEL_SALE', 'VOID_SETTLEMENT', 'DELETE_FINANCIAL_RECORD'
    },
    entityType: { 
        type: String, 
        required: true,
        // Ej: 'Sale', 'Settlement', 'Transaction'
    },
    entityId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
    },
    summary: { 
        type: String, 
        required: true 
    },
    reason: { 
        type: String, 
        required: true 
    },
    resolutionNotes: { 
        type: String, 
        default: '' 
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected', 'cancelled', 'executed'],
        default: 'pending'
    },
    history: [approvalHistorySchema]
}, { 
    timestamps: true 
});

const ApprovalRequest = mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);

export default ApprovalRequest;
