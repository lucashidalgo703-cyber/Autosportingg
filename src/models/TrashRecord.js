import mongoose from 'mongoose';

const trashRecordSchema = new mongoose.Schema({
    entityType: { 
        type: String, 
        required: true,
        // Ej: 'Client', 'Lead', 'Quote'
    },
    entityId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true 
    },
    snapshot: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true 
    },
    deletedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'AdminUser',
        required: true 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    }
}, { 
    timestamps: true 
});

const TrashRecord = mongoose.models.TrashRecord || mongoose.model('TrashRecord', trashRecordSchema);

export default TrashRecord;
