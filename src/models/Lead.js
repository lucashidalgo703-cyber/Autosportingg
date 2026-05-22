import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    pipelineStage: { 
        type: String, 
        enum: [
            'Nuevo Contacto', 
            'Seguimiento Activo', 
            'Visita / Test Drive', 
            'Evaluación de Usado', 
            'Señado', 
            'Entregado / Vendido'
        ], 
        default: 'Nuevo Contacto' 
    },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    notes: [noteSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update 'updatedAt' on save
leadSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (typeof next === 'function') next();
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

export default Lead;
