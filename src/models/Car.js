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
    featured: { type: Boolean, default: false },
    sold: { type: Boolean, default: false },
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
