import mongoose from 'mongoose';

const workshopProviderQuoteItemSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['labor', 'part', 'subcontracted'],
        required: [true, 'El tipo de ítem es obligatorio (labor, part, subcontracted).']
    },
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria.'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'La cantidad es obligatoria.'],
        min: [1, 'La cantidad mínima es 1.']
    },
    providerCost: {
        type: Number,
        required: [true, 'El costo del proveedor es obligatorio.'],
        min: [0, 'El costo no puede ser negativo.']
    }
}, { _id: false });

const workshopProviderQuoteSchema = new mongoose.Schema({
    workshopOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopOrder',
        required: [true, 'La orden de taller asociada es obligatoria.'],
        index: true
    },
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopProvider',
        required: [true, 'El proveedor es obligatorio.']
    },
    version: {
        type: Number,
        required: [true, 'El número de versión es obligatorio.']
    },
    currency: {
        type: String,
        enum: ['ARS', 'USD'],
        required: [true, 'La moneda es obligatoria.']
    },
    items: [workshopProviderQuoteItemSchema],
    totalCost: {
        type: Number,
        required: [true, 'El costo total es obligatorio.']
    },
    status: {
        type: String,
        enum: ['borrador', 'aprobado', 'rechazado', 'reemplazado'],
        default: 'borrador'
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Índice compuesto para asegurar unicidad de versión por orden
workshopProviderQuoteSchema.index({ workshopOrderId: 1, version: 1 }, { unique: true });

const WorkshopProviderQuote = mongoose.models.WorkshopProviderQuote || mongoose.model('WorkshopProviderQuote', workshopProviderQuoteSchema);

export default WorkshopProviderQuote;
