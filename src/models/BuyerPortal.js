import mongoose from 'mongoose';
const encrypted = new mongoose.Schema({ iv: String, tag: String, data: String }, { _id: false });
const portalSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    tokenHash: { type: String, required: true, unique: true },
    encryptedToken: { type: encrypted, required: true },
    enabled: { type: Boolean, default: true },
    mode: { type: String, enum: ['with_trade_in', 'without_trade_in'], required: true },
    generation: { type: Number, default: 1 },
    uploadSequence: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
    nextChallengeAt: { type: Date, default: () => new Date(0) },
    createdBy: String, revokedAt: Date
}, { timestamps: true });
const challengeSchema = new mongoose.Schema({
    portalId: { type: mongoose.Schema.Types.ObjectId, required: true }, generation: Number,
    contactHash: String, codeHash: String, attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null }, expiresAt: { type: Date, required: true }
}, { timestamps: true });
challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const sessionSchema = new mongoose.Schema({
    // Only a hash of the random browser credential is stored in the database.
    _id: { type: String, required: true },
    portalId: { type: mongoose.Schema.Types.ObjectId, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    generation: { type: Number, required: true },
    contactHash: { type: String, required: true },
    uploadSequence: { type: Number, default: 0 },
    // Access history shares the session TTL; no IP, raw user agent or device ID.
    firstViewedAt: Date,
    lastViewedAt: Date,
    lastCountedViewAt: Date,
    viewCount: { type: Number, default: 0 },
    device: new mongoose.Schema({ browser: String, os: String, type: String }, { _id: false }),
    approximateLocation: { country: String, region: String, city: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null }
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const documentSchema = new mongoose.Schema({
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    tradeInId: { type: mongoose.Schema.Types.ObjectId, required: true },
    requirementKey: { type: String, required: true }, slot: { type: String, required: true },
    description: String, side: { type: String, enum: ['front', 'back', 'page', 'other'] },
    issuedAt: Date, fileName: String, mimeType: String, byteLength: Number,
    encryptedFile: { type: encrypted, required() { return !this.removedAt; }, select: false }, fileHash: String,
    requestId: { type: String, required: true }, version: { type: Number, default: 1 },
    isCurrent: { type: Boolean, default: true }, replacesId: mongoose.Schema.Types.ObjectId,
    status: { type: String, enum: ['received', 'reviewed', 'correction_requested'], default: 'received' },
    correctionReason: String, origin: { type: String, default: 'buyer', immutable: true },
    removedAt: { type: Date, default: null }, removedBy: String,
    history: [{ status: String, reason: String, at: Date, by: String }]
}, { timestamps: true });
documentSchema.index({ saleId: 1, requestId: 1 }, { unique: true });
documentSchema.index({ saleId: 1, tradeInId: 1, requirementKey: 1, slot: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } });
const originalSchema = new mongoose.Schema({
    saleId: { type: mongoose.Schema.Types.ObjectId, required: true }, tradeInId: { type: mongoose.Schema.Types.ObjectId, required: true },
    requirementKey: { type: String, required: true }, received: Boolean, receivedAt: Date, receivedBy: String,
    history: [{ received: Boolean, at: Date, by: String }]
});
originalSchema.index({ saleId: 1, tradeInId: 1, requirementKey: 1 }, { unique: true });
export const BuyerPortal = mongoose.models.BuyerPortal || mongoose.model('BuyerPortal', portalSchema);
export const BuyerPortalChallenge = mongoose.models.BuyerPortalChallenge || mongoose.model('BuyerPortalChallenge', challengeSchema);
export const BuyerPortalSession = mongoose.models.BuyerPortalSession || mongoose.model('BuyerPortalSession', sessionSchema);
export const BuyerPortalDocument = mongoose.models.BuyerPortalDocument || mongoose.model('BuyerPortalDocument', documentSchema);
export const BuyerPortalOriginal = mongoose.models.BuyerPortalOriginal || mongoose.model('BuyerPortalOriginal', originalSchema);
const rateSchema = new mongoose.Schema({ _id: String, count: Number, expiresAt: Date });
rateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const BuyerPortalRate = mongoose.models.BuyerPortalRate || mongoose.model('BuyerPortalRate', rateSchema);
