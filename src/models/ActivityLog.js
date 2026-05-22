import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
    user: { type: String, default: 'Sistema' }, // Or Admin name
    action: { type: String, required: true },
    target: { type: String, required: true },
    details: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);
