import mongoose from 'mongoose';

const dailySummaryLogSchema = new mongoose.Schema({
    dateString: { 
        type: String, 
        required: true 
    }, // Format: YYYY-MM-DD
    channel: { 
        type: String, 
        required: true,
        enum: ['internal', 'email', 'whatsapp']
    },
    status: { 
        type: String, 
        enum: ['sent', 'failed'], 
        required: true 
    },
    payload: { 
        type: String, // The generated markdown/text
        required: true 
    },
    errorMessage: { 
        type: String 
    },
    metrics: {
        newLeads: Number,
        unansweredConversations: Number,
        dailySales: Number,
        dueInstallments: Number,
        openComplaints: Number,
        criticalAlerts: Number
    }
}, {
    timestamps: true
});

// Idempotencia: Índice único compuesto para evitar dobles envíos el mismo día por el mismo canal
dailySummaryLogSchema.index({ dateString: 1, channel: 1 }, { unique: true });

const DailySummaryLog = mongoose.models.DailySummaryLog || mongoose.model('DailySummaryLog', dailySummaryLogSchema);

export default DailySummaryLog;
