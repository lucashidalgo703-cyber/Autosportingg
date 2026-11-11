import mongoose from 'mongoose';

const adminUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'ventas', 'administrativo', 'solo_lectura'],
        default: 'solo_lectura'
    },
    active: {
        type: Boolean,
        default: true
    },
    permissions: {
        type: [String],
        default: []
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String, // Secreto encriptado o hash dependiendo de la implementacion
        default: null
    },
    recoveryCodes: {
        type: [String], // Hash de los codigos
        default: []
    },
    lastLoginAt: {
        type: Date
    }
}, { timestamps: true });

// Prevent sending passwordHash in JSON
adminUserSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.passwordHash;
    delete user.twoFactorSecret;
    delete user.recoveryCodes;
    return user;
};

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

export default AdminUser;
