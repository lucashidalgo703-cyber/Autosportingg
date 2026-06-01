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
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser',
        default: null
    }
}, { timestamps: true });

// Ensure only one document ever exists
crmSettingsSchema.pre('save', async function(next) {
    if (this.isNew) {
        const count = await this.constructor.countDocuments();
        if (count > 0) {
            return next(new Error('Only one CrmSettings document can exist'));
        }
    }
    next();
});

const CrmSettings = mongoose.models.CrmSettings || mongoose.model('CrmSettings', crmSettingsSchema);

export default CrmSettings;
