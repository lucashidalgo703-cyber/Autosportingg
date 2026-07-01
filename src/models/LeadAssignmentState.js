import mongoose from 'mongoose';

const leadAssignmentStateSchema = new mongoose.Schema({
    channelKey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    sequence: {
        type: Number,
        default: 0,
        min: 0
    },
    lastAssignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null
    },
    lastAssignedAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

const LeadAssignmentState = mongoose.models.LeadAssignmentState
    || mongoose.model('LeadAssignmentState', leadAssignmentStateSchema);

export default LeadAssignmentState;
