import mongoose from 'mongoose';

const personalAssetSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    createdByUsername: { type: String },
    type: { type: String, enum: ['auto', 'otro'], default: 'auto' },
    title: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    year: { type: Number },
    plate: { type: String },
    estimatedValue: { type: Number, default: 0 },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'USD' },
    notes: { type: String },
    status: { type: String, enum: ['activo', 'borrado'], default: 'activo' }
}, {
    timestamps: true
});

const PersonalAsset = mongoose.models.PersonalAsset || mongoose.model('PersonalAsset', personalAssetSchema);
export default PersonalAsset;
