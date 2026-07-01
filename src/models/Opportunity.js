import mongoose from 'mongoose';

const inspectionSchema = new mongoose.Schema({
    mechanical: { type: Number, min: 0, max: 100, default: 0 },
    suspension: { type: Number, min: 0, max: 100, default: 0 },
    brakes: { type: Number, min: 0, max: 100, default: 0 },
    paint: { type: Number, min: 0, max: 100, default: 0 },
    interior: { type: Number, min: 0, max: 100, default: 0 },
    tires: { type: Number, min: 0, max: 100, default: 0 }
}, { _id: false });

const documentationSchema = new mongoose.Schema({
    title: { type: Boolean, default: false },
    vtv: { type: Boolean, default: false },
    debtFree: { type: Boolean, default: false },
    transferable: { type: Boolean, default: false }
}, { _id: false });

const opportunitySchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['ofrece', 'busca', 'permuta'],
        required: true
    },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number },
    mileage: { type: Number },
    price: { type: Number },
    currency: { type: String, enum: ['ARS', 'USD'], default: 'ARS' },
    fuel: { type: String },
    transmission: { type: String },
    color: { type: String },
    plate: { type: String },
    inspection: { type: inspectionSchema, default: () => ({}) },
    documentation: { type: documentationSchema, default: () => ({}) },
    notes: { type: String },
    photos: [{ type: String }],
    status: {
        type: String,
        enum: ['activa', 'pausada', 'cerrada', 'borrada'],
        default: 'activa'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    },
    createdByUsername: { type: String },
    agencyName: { type: String }
}, { timestamps: true });

// Soft-delete query middleware
opportunitySchema.pre('find', function() {
    if (this.getQuery().status !== 'borrada') {
        this.where({ status: { $ne: 'borrada' } });
    }
});

const Opportunity = mongoose.models.Opportunity || mongoose.model('Opportunity', opportunitySchema);

export default Opportunity;
