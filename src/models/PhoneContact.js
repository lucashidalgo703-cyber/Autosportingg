import mongoose from 'mongoose';

const PhoneContactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true
    },
    category: {
        type: String,
        enum: ['Gestoría', 'Seguro', 'Taller', 'Repuestos', 'Grúa', 'Administración', 'Escribanía', 'Otro'],
        default: 'Otro'
    },
    phone: {
        type: String,
        required: [true, 'El teléfono es requerido'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    notes: {
        type: String,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AdminUser'
    }
}, {
    timestamps: true
});

const PhoneContact = mongoose.models.PhoneContact || mongoose.model('PhoneContact', PhoneContactSchema);
export default PhoneContact;
