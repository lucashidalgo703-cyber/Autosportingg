import mongoose from 'mongoose';

const npsResponseSchema = new mongoose.Schema({
    survey: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'NpsSurvey',
        required: true,
        unique: true // One response per survey
    },
    score: { 
        type: Number, 
        required: true,
        min: 0,
        max: 10
    },
    classification: { 
        type: String, 
        enum: ['promoter', 'passive', 'detractor'],
        required: true 
    },
    comment: { 
        type: String, 
        default: '',
        trim: true
    },
    followUpStatus: { 
        type: String, 
        enum: ['pending', 'in_progress', 'resolved'],
        default: 'pending' // Only really matters for detractors, but keep it on all just in case
    },
    followUpNotes: {
        type: String,
        default: ''
    }
}, { 
    timestamps: true 
});

// Middleware to calculate classification automatically before save
npsResponseSchema.pre('validate', function(next) {
    if (this.score >= 9) {
        this.classification = 'promoter';
    } else if (this.score >= 7) {
        this.classification = 'passive';
    } else {
        this.classification = 'detractor';
    }
    next();
});

const NpsResponse = mongoose.models.NpsResponse || mongoose.model('NpsResponse', npsResponseSchema);

export default NpsResponse;
