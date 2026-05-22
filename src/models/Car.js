import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    name: { type: String, required: true },
    year: { type: Number, required: true },
    km: { type: Number, required: true },
    fuel: { type: String, required: true },
    condition: { type: String, required: true },
    description: { type: String }, // Free text description
    price: { type: Number, required: true },
    currency: { type: String, required: true }, // '$' or 'U$S'
    
    // New Sote CRM fields
    vehicleType: { type: String, default: 'Auto' },
    plateOrVin: { type: String },
    color: { type: String },
    purchasePrice: { type: Number },
    purchaseCurrency: { type: String, default: 'USD' },
    location: { type: String, default: 'Salón Principal' },
    owners: { type: Number, default: 1 },
    agencyOwned: { type: Boolean, default: false },
    ownerName: { type: String },
    linkedClient: { type: String },
    ownerPhone: { type: String },
    ownerEmail: { type: String },
    consignedBy: { type: String },
    engineNumber: { type: String },
    chassisNumber: { type: String },
    hasManuals: { type: String, default: 'No' },
    hasDuplicateKeys: { type: String, default: 'No' },
    hasOfficialServices: { type: String, default: 'No' },
    publishedOnML: { type: String, default: 'No' },
    publishedBy: { type: String },
    mlLink: { type: String },
    notes: { type: String },

    featured: { type: Boolean, default: false },
    sold: { type: Boolean, default: false },
    status: { type: String, enum: ['Disponible', 'Vendido', 'Reservado'], default: 'Disponible' },
    order: { type: Number, default: 0 }, // For manual sorting
    imagePosition: { type: String, default: '50% 75%' }, // CSS object-position
    images: [{ type: String }], // Array of Cloudinary URLs
    coverImage: { type: String }, // specific cover image URL
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update 'updatedAt' on save
carSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (typeof next === 'function') next();
});

const Car = mongoose.model('Car', carSchema);

export default Car;
