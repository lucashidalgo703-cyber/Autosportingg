import mongoose from 'mongoose';

const treasuryCategoryRuleSchema = new mongoose.Schema({
    category: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    boxKey: {
        type: String,
        required: true,
        enum: ['operativa', 'personal', 'impuestos', 'deudas', 'postventa', 'reserva', 'stock', 'crecimiento', 'sin_asignar']
    },
    notes: {
        type: String,
        default: ''
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    updatedBy: {
        type: String
    }
}, { timestamps: true });

const TreasuryCategoryRule = mongoose.models.TreasuryCategoryRule || mongoose.model('TreasuryCategoryRule', treasuryCategoryRuleSchema);

export default TreasuryCategoryRule;
