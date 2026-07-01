import mongoose from 'mongoose';

const customerVehicleSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    version: { type: String },
    year: {
        type: Number,
        required: true,
        min: 1900,
        max: new Date().getFullYear() + 1
    },
    plate: {
        type: String,
        required: true,
        set: (v) => {
            if (v === null || v === undefined) return v;
            return String(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
        },
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'La patente no puede estar vacía.'
        }
    },
    vin: { type: String },
    color: { type: String },
    km: {
        type: Number,
        min: 0
    },
    active: { type: Boolean, default: true },
    ownersHistory: [{
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
        date: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

customerVehicleSchema.index({ plate: 1 }, { unique: true });

const CustomerVehicle = mongoose.models.CustomerVehicle || mongoose.model('CustomerVehicle', customerVehicleSchema);

export default CustomerVehicle;
