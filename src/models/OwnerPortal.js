import mongoose from 'mongoose';
const accessSchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    expiresAt: { type: Date, required: true }, revokedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' }
}, { timestamps: true });
const requestSchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
    accessId: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnerPortal', required: true },
    message: { type: String, required: true, maxlength: 5000 },
    proposedPrice: { type: Number, min: 0, default: null }, currency: { type: String, enum: ['ARS', 'USD', ''], default: '' },
    status: { type: String, enum: ['pendiente', 'resuelta'], default: 'pendiente' }, resolution: { type: String, maxlength: 5000 }, resolvedBy: String, resolvedAt: Date
}, { timestamps: true });
export const OwnerPortalRequest = mongoose.models.OwnerPortalRequest || mongoose.model('OwnerPortalRequest', requestSchema);
export default mongoose.models.OwnerPortal || mongoose.model('OwnerPortal', accessSchema);
