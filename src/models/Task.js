import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['Pendiente', 'Completada'], default: 'Pendiente' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
