import mongoose from 'mongoose';

const crmSettingsSchema = new mongoose.Schema({
    agencyName: {
        type: String,
        default: "AutoSporting",
        trim: true
    },
    mainPhone: {
        type: String,
        default: "",
        trim: true
    },
    commercialEmail: {
        type: String,
        default: "",
        trim: true
    },
    address: {
        type: String,
        default: "",
        trim: true
    },
    googleReviewsUrl: {
        type: String,
        default: "",
        trim: true
    },
    defaultCurrency: {
        type: String,
        enum: ["ARS", "USD"],
        default: "ARS"
    },
    businessHours: {
        mondayToFriday: { type: String, default: "09:00 - 18:00" },
        saturday: { type: String, default: "09:00 - 13:00" },
        sunday: { type: String, default: "Cerrado" }
    },
    thresholds: {
        leadWithoutFollowupDays: { type: Number, default: 7, min: 1, max: 60 },
        oldReservationDays: { type: Number, default: 7, min: 1, max: 60 },
        postSalePendingDays: { type: Number, default: 7, min: 1, max: 90 },
        installmentDueSoonDays: { type: Number, default: 3, min: 1, max: 30 },
        stockCriticalDays: { type: Number, default: 90, min: 15, max: 365 },
        taskOverdueGraceDays: { type: Number, default: 0, min: 0 }
    },
    notifications: {
        enableGoalAlerts: { type: Boolean, default: true },
        enableInstallmentAlerts: { type: Boolean, default: true },
        enableTaskAlerts: { type: Boolean, default: true },
        enableDataQualityAlerts: { type: Boolean, default: false }
    },
    featureFlags: {
        enableNps: { type: Boolean, default: true },
        enableApprovals: { type: Boolean, default: true },
        enableTrash: { type: Boolean, default: true },
        enableWhatsapp: { type: Boolean, default: true }
    },
    assistantConfig: {
        enabled: { type: Boolean, default: false },
        provider: { type: String, enum: ['openai', 'anthropic', 'custom'], default: 'openai' }
    },
    emailConfig: {
        provider: { type: String, enum: ['smtp', 'gmail-oauth'], default: 'smtp' },
        clientId: { type: String, default: "" },
        connectedBy: { type: String, default: "" },
        connectedAt: { type: Date, default: null },
        status: { type: String, enum: ['disconnected', 'connected'], default: 'disconnected' }
    },
    dailySummary: {
        enabled: { type: Boolean, default: false },
        sendTime: { type: String, default: "08:00" },
        recipients: [{ type: String }],
        channel: { type: String, enum: ['internal', 'email', 'whatsapp'], default: 'internal' },
        sections: {
            newLeads: { type: Boolean, default: true },
            unansweredConversations: { type: Boolean, default: true },
            dailySales: { type: Boolean, default: true },
            dueInstallments: { type: Boolean, default: true },
            openComplaints: { type: Boolean, default: true },
            criticalAlerts: { type: Boolean, default: true }
        }
    },
    leadRouting: {
        enabled: { type: Boolean, default: false },
        rules: [{
            channel: { type: String, required: true },
            enabled: { type: Boolean, default: true },
            participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }],
            pausedParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }],
            fallbackUser: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
            slaMinutes: { type: Number, default: 60 }
        }]
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null
    }
}, { timestamps: true });

// Ensure only one document ever exists
crmSettingsSchema.pre('save', async function() {
    if (this.isNew) {
        const count = await this.constructor.countDocuments();
        if (count > 0) {
            throw new Error('Only one CrmSettings document can exist');
        }
    }
});

const CrmSettings = mongoose.models.CrmSettings || mongoose.model('CrmSettings', crmSettingsSchema);

export default CrmSettings;
