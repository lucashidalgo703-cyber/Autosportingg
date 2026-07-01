import mongoose from 'mongoose';

const npsSurveySchema = new mongoose.Schema({
    token: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    client: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Client',
        required: true 
    },
    sale: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Sale',
        default: null 
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null
    },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'expired'], 
        default: 'pending' 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        required: true
    }
}, { 
    timestamps: true 
});

const NpsSurvey = mongoose.models.NpsSurvey || mongoose.model('NpsSurvey', npsSurveySchema);

export default NpsSurvey;
