import mongoose from 'mongoose';
const schema = new mongoose.Schema({
    gestoriaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gestoria', required: true, immutable: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', immutable: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', immutable: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', immutable: true },
    vehiclePlate: { type: String, maxlength: 100, immutable: true },
    vehicleName: { type: String, maxlength: 600, immutable: true },
    clientName: { type: String, maxlength: 300, immutable: true },
    gestorName: { type: String, maxlength: 300, immutable: true },
    amount: { type: Number, required: true, min: 0.01, immutable: true },
    currency: { type: String, enum: ['ARS', 'USD'], required: true, immutable: true },
    date: { type: Date, required: true, immutable: true },
    notes: { type: String, maxlength: 5000, immutable: true },
    status: { type: String, enum: ['por_confirmar', 'acreditada', 'devuelta_cliente'], default: 'por_confirmar', required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    resolvedAt: Date, resolvedBy: String, resolutionNote: { type: String, maxlength: 5000 },
    createdBy: { type: String, required: true },
    idempotencyKey: { type: String, required: true, select: false }, payloadHash: { type: String, required: true, select: false },
    auditLog: [{ action: String, user: String, date: { type: Date, default: Date.now }, details: String }]
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ gestoriaId: 1, createdBy: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ status: 1, date: -1 });
export default mongoose.models.RegistryRefund || mongoose.model('RegistryRefund', schema);
