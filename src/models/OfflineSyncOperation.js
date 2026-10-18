import mongoose from 'mongoose';

const offlineSyncOperationSchema = new mongoose.Schema({
    idempotencyKey: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    username: {
        type: String,
        default: 'CRM_V2'
    },
    operationType: {
        type: String,
        required: true,
        enum: [
            'observation',
            'appraisal',
            'client_draft',
            'expense',
            'financial_draft'
        ]
    },
    entityType: {
        type: String,
        default: null
    },
    entityId: {
        type: String,
        default: null
    },
    payload: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    expectedUpdatedAt: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['applied', 'pending_confirmation', 'conflict', 'rejected'],
        required: true
    },
    requiresServerConfirmation: {
        type: Boolean,
        default: false
    },
    confirmationStatus: {
        type: String,
        enum: ['not_required', 'pending', 'confirmed', 'discarded'],
        default: 'not_required'
    },
    confirmedAt: {
        type: Date,
        default: null
    },
    confirmedBy: {
        type: String,
        default: null
    },
    resultData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    conflictDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    errorMessage: {
        type: String,
        default: null
    },
    clientCreatedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const OfflineSyncOperation = mongoose.models.OfflineSyncOperation || mongoose.model('OfflineSyncOperation', offlineSyncOperationSchema);

export default OfflineSyncOperation;
