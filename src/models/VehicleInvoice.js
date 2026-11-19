import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    direction: { type: String, enum: ['sale', 'purchase'], required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    vehicleSnapshot: { brand: String, name: String, year: Number, plate: String },
    partyName: { type: String, required: true }, partyTaxId: { type: String, default: '' },
    invoiceType: { type: String, enum: ['A', 'B', 'C', 'M', 'E', 'otro'], required: true },
    pointOfSale: { type: String, required: true }, invoiceNumber: { type: String, required: true },
    invoiceDate: { type: String, required: true }, totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['ARS', 'USD'], required: true },
    authorizationCode: { type: String, default: '' }, authorizationDueDate: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'annulled'], default: 'active' },
    annulmentReason: String, annulledAt: Date, annulledBy: String,
    revision: { type: Number, default: 1 },
    identityKey: { type: String, required: true, select: false },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleInvoiceFile' },
    createdBy: { type: String, required: true }, updatedBy: String,
    history: [{ action: String, at: Date, by: String, changes: mongoose.Schema.Types.Mixed }]
}, { timestamps: true });
export default mongoose.models.VehicleInvoice || mongoose.model('VehicleInvoice', schema);

// Built-in _id uniqueness provides the durable claims without depending on
// background index creation or modifying any existing business collection.
const identity = new mongoose.Schema({ _id: String, invoiceId: { type: mongoose.Schema.Types.ObjectId, required: true } });
export const VehicleInvoiceIdentity = mongoose.models.VehicleInvoiceIdentity || mongoose.model('VehicleInvoiceIdentity', identity);
const request = new mongoose.Schema({ _id: String, fingerprint: { type: String, required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, required: true } }, { timestamps: true });
export const VehicleInvoiceRequest = mongoose.models.VehicleInvoiceRequest || mongoose.model('VehicleInvoiceRequest', request);
const file = new mongoose.Schema({ invoiceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    version: { type: Number, required: true }, fileName: String, mimeType: String, byteLength: Number,
    fileHash: { type: String, select: false }, uploadedBy: String,
    encryptedFile: { type: new mongoose.Schema({ iv: String, tag: String, data: String }, { _id: false }), required: true, select: false }
}, { timestamps: true });
export const VehicleInvoiceFile = mongoose.models.VehicleInvoiceFile || mongoose.model('VehicleInvoiceFile', file);
