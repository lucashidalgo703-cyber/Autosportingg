// src/models/StockDecision.js
// Registro de decisiones comerciales estratégicas tomadas por el propietario sobre el stock.
// Permite evaluar posteriormente el impacto real de las reducciones de precio y rotación.

import mongoose from 'mongoose';

const stockDecisionSchema = new mongoose.Schema({
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        required: true,
        index: true
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    user: {
        type: String,
        default: 'Propietario'
    },
    userRole: {
        type: String,
        default: 'owner'
    },
    decisionType: {
        type: String,
        enum: [
            'ajuste_precio',
            'mantener_precio',
            'priorizar_difusion',
            'autorizacion_oferta',
            'evaluar_liquidacion',
            'mejora_publicacion',
            'revision_taller'
        ],
        required: true
    },
    previousPrice: {
        type: Number,
        required: true,
        min: 0
    },
    newAuthorizedPrice: {
        type: Number,
        min: 0
    },
    currency: {
        type: String,
        enum: ['ARS', 'USD'],
        default: 'ARS'
    },
    reason: {
        type: String,
        required: true
    },
    marketEvidence: {
        hasMarketData: { type: Boolean, default: false },
        marketMedian: { type: Number },
        comparablesCount: { type: Number, default: 0 },
        percentDifferenceVsMarket: { type: Number },
        notes: { type: String }
    },
    projectedResult: {
        projectedMargin: { type: Number },
        projectedMarginPct: { type: Number },
        projectedCashRecovery: { type: Number }
    },
    // Vinculación posterior con la venta real (cuando se venda)
    outcome: {
        sold: { type: Boolean, default: false },
        saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
        soldAt: { type: Date },
        actualSalePrice: { type: Number },
        actualNetMargin: { type: Number },
        daysFromDecisionToSale: { type: Number },
        strategyEffective: { type: Boolean },
        auditNotes: { type: String }
    }
}, {
    timestamps: true
});

const StockDecision = mongoose.models.StockDecision || mongoose.model('StockDecision', stockDecisionSchema);

export default StockDecision;
