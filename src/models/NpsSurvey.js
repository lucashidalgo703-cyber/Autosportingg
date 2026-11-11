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
    },
    context: { type: String, enum: ['postventa', 'postvisita', 'postentrega', 'postcotizacion', 'atencion_lead', null], default: null },
    channel: { type: String, enum: ['manual', 'link', 'whatsapp'], default: undefined },
    idempotencyKey: { type: String, maxlength: 120 },
    requestHash: { type: String },
    consentConfirmedAt: { type: Date },
    delivery: {
        status: { type: String, enum: ['not_sent', 'sending', 'sent', 'failed', 'uncertain'], default: 'not_sent' },
        attempts: { type: Number, default: 0 },
        attemptedAt: Date,
        sentAt: Date,
        providerMessageId: String,
        errorCode: String,
        errorMessage: String,
        verificationNote: String,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
        verifiedAt: Date
    }
}, { 
    timestamps: true 
});
npsSurveySchema.index({ generatedBy: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
npsSurveySchema.index({ client: 1, createdAt: -1 });

const NpsSurvey = mongoose.models.NpsSurvey || mongoose.model('NpsSurvey', npsSurveySchema);

export default NpsSurvey;
