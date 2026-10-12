import mongoose from 'mongoose';

const treasuryBoxSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: ['operativa', 'personal', 'impuestos', 'deudas', 'reserva']
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    balanceARS: {
        type: Number,
        default: 0
    },
    balanceUSD: {
        type: Number,
        default: 0
    },
    targetPercent: {
        type: Number,
        default: 0
    },
    color: {
        type: String,
        default: 'emerald'
    },
    icon: {
        type: String,
        default: 'Briefcase'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    history: [{
        date: { type: Date, default: Date.now },
        type: {
            type: String,
            enum: ['asignacion_inicial', 'ajuste', 'transferencia_entre_cajas', 'retiro', 'ingreso']
        },
        amount: Number,
        currency: { type: String, enum: ['ARS', 'USD'] },
        fromBox: String,
        toBox: String,
        reason: String,
        user: String
    }]
}, { timestamps: true });

const TreasuryBox = mongoose.models.TreasuryBox || mongoose.model('TreasuryBox', treasuryBoxSchema);

export default TreasuryBox;
