import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['Efectivo', 'Banco', 'Tarjeta', 'Billetera'], default: 'Efectivo' },
    currency: { type: String, enum: ['USD', 'ARS'], required: true },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

accountSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (typeof next === 'function') next();
});

const Account = mongoose.model('Account', accountSchema);
export default Account;
