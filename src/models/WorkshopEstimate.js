import mongoose from 'mongoose';

const workshopEstimateItemSchema = new mongoose.Schema({
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
        default: 0,
        min: [0, 'El costo no puede ser negativo.']
    },
    clientPrice: {
        type: Number,
        required: [true, 'El precio al cliente es obligatorio.'],
        min: [0, 'El precio no puede ser negativo.']
    }
}, { _id: false });

const workshopEstimateSchema = new mongoose.Schema({
    workshopOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopOrder',
        required: [true, 'La orden de taller asociada es obligatoria.'],
        index: true
    },
    providerQuoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WorkshopProviderQuote',
        default: null
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
    items: [workshopEstimateItemSchema],
    totalCost: {
        type: Number,
        required: [true, 'El costo total es obligatorio.']
    },
    totalPrice: {
        type: Number,
        required: [true, 'El precio total al cliente es obligatorio.']
    },
    profit: {
        type: Number,
        required: [true, 'La ganancia total calculada es obligatoria.']
    },
    margin: {
        type: Number,
        required: [true, 'El margen total calculado es obligatorio.']
    },
    status: {
        type: String,
        enum: ['borrador', 'listo_para_enviar', 'enviado', 'parcialmente_aprobado', 'aprobado', 'rechazado', 'vencido', 'reemplazado'],
        default: 'borrador'
    },
    notes: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Índice compuesto para asegurar unicidad de versión por orden
workshopEstimateSchema.index({ workshopOrderId: 1, version: 1 }, { unique: true });

const WorkshopEstimate = mongoose.models.WorkshopEstimate || mongoose.model('WorkshopEstimate', workshopEstimateSchema);

export default WorkshopEstimate;
