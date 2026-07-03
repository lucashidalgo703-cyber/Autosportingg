import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        index: true 
    },
    event: { 
        type: String, 
        required: true,
        index: true
    },
    path: { 
        type: String 
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        default: null,
        index: true,
        set: v => v === '' ? null : v
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // flexible for search queries, filters applied, etc.
        default: {}
    },
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },
    timestamp: { 
        type: Date, 
        default: Date.now,
        index: true
    }
}, {
    timestamps: false // We use timestamp field manually
});

// Compound index for funnel aggregation
analyticsEventSchema.index({ event: 1, timestamp: -1 });
analyticsEventSchema.index({ sessionId: 1, event: 1 });

const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
