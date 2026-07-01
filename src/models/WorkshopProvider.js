import mongoose from 'mongoose';

const workshopProviderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    businessName: { type: String },
    cuit: {
        type: String,
        set: (v) => {
            if (v === null || v === undefined) return undefined;
            const digits = String(v).replace(/\D/g, '');
            return digits || undefined;
        },
        validate: {
            validator: function(v) {
                if (!v) return true;
                return v.length === 11;
            },
            message: 'El CUIT debe tener exactamente 11 dígitos.'
        }
    },
    specialties: [{ type: String }],
    contacts: [{
        name: { type: String },
        phone: { type: String },
        email: { type: String },
        role: { type: String }
    }],
    paymentConditions: { type: String },
    acceptedCurrencies: [{ type: String, enum: ['ARS', 'USD'] }],
    defaultWarranty: { type: String },
    notes: { type: String },
    active: { type: Boolean, default: true }
}, { timestamps: true });

workshopProviderSchema.index(
    { cuit: 1 },
    { unique: true, partialFilterExpression: { cuit: { $type: 'string' } } }
);

const WorkshopProvider = mongoose.models.WorkshopProvider || mongoose.model('WorkshopProvider', workshopProviderSchema);

export default WorkshopProvider;
