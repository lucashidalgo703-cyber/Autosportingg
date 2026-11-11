import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    name: { type: String, required: true, maxlength: 80 },
    nameKey: { type: String, required: true },
    filters: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

export default mongoose.models.SavedStockView || mongoose.model('SavedStockView', schema);
