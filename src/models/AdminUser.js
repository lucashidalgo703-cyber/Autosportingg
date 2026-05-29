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
    lastLoginAt: {
        type: Date
    }
}, { timestamps: true });

// Prevent sending passwordHash in JSON
adminUserSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.passwordHash;
    return user;
};

const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);

export default AdminUser;
