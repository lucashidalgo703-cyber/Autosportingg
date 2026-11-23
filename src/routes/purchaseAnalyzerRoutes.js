import mongoose from 'mongoose';
import { evaluatePurchase } from '../services/purchaseAnalyzer.js';

const Evaluation = mongoose.model('PurchaseEvaluation', new mongoose.Schema({
    author: { type: String, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
    vehicleRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
    unavailableListings: [{
        _id: false,
        source: String,
        listingId: String,
        reportedAt: Date,
        author: String
    }]
}, { timestamps: true }));

export function registerPurchaseAnalyzer(app, { authenticate, unlockTreasury, isAuthorized, Car, Quote, Sale, getDashboard }) {
    const base = '/api/admin/tesoreria-estrategica/purchase-evaluations';
    const guard = [authenticate, (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        if (!isAuthorized(req.user)) return res.status(403).json({ message: 'Perfil sin autorización para evaluar compras.' });
        next();
    }, unlockTreasury];
    const protect = handler => async (req, res) => {
        try {
            await handler(req, res);
        } catch (error) {
            console.error('Analizador de compras:', error);
            res.status(500).json({ message: 'No se pudo completar la consulta del analizador.' });
        }
    };
    const validId = id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);

    app.get(base + '/vehicle/:id', ...guard, protect(async (req, res) => {
        if (!validId(req.params.id)) return res.status(400).json({ message: 'Identificador de vehículo inválido.' });
        const car = await Car.findById(req.params.id).select('brand name year km fuel condition location purchasePrice purchaseCurrency price currency jointOwnership').lean();
        if (!car) return res.status(404).json({ message: 'Vehículo del CRM no encontrado.' });
        res.json(car);
    }));

    app.get(base + '/quote/:number', ...guard, protect(async (req, res) => {
        const quoteNumber = Number(req.params.number);
        if (!/^\d+$/.test(req.params.number) || !Number.isSafeInteger(quoteNumber) || quoteNumber <= 0) {
            return res.status(400).json({ message: 'Número de cotización inválido.' });
        }
        const quote = await Quote.findOne({ quoteNumber }).select('quoteNumber tradeIn.brand tradeIn.model tradeIn.year tradeIn.mileage tradeIn.condition').lean();
        if (!quote?.tradeIn?.brand || !quote?.tradeIn?.model) return res.status(404).json({ message: 'Cotización sin un vehículo recibido en permuta.' });
        res.json(quote);
    }));

    app.post(base, ...guard, protect(async (req, res) => {
        const input = req.body ?? {};
        const evaluatedAt = new Date();
        try {
            evaluatePurchase(input, null, evaluatedAt);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }
        if (input.vehicleRecord && (!validId(input.vehicleRecord) || !await Car.exists({ _id: input.vehicleRecord }))) {
            return res.status(400).json({ message: 'Vehículo del CRM no encontrado.' });
        }
        let dashboard;
        try {
            dashboard = await getDashboard();
        } catch (error) {
            console.error('Tesorería no disponible para la evaluación:', error);
        }
        const snapshot = evaluatePurchase(input, dashboard, evaluatedAt);
        if (input.quoteNumber) {
            if (!Number.isSafeInteger(input.quoteNumber) || input.quoteNumber <= 0 || !await Quote.exists({ quoteNumber: input.quoteNumber })) {
                return res.status(400).json({ message: 'Cotización del CRM no encontrada.' });
            }
            snapshot.quoteNumber = input.quoteNumber;
        }
        const author = req.user.username || req.user.id || req.user.userId;
        const record = await Evaluation.create({ author, snapshot, vehicleRecord: input.vehicleRecord || undefined });
        res.status(201).json(record);
    }));

    app.get(base, ...guard, protect(async (req, res) => {
        const limit = 30;
        const offset = Number(req.query.offset ?? 0);
        if (!Number.isSafeInteger(offset) || offset < 0) return res.status(400).json({ message: 'Página inválida.' });
        res.json(await Evaluation.find().sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit)
            .select('createdAt author snapshot.vehicle snapshot.market.confidence').lean());
    }));

    app.get(base + '/:id', ...guard, protect(async (req, res) => {
        if (!validId(req.params.id)) return res.status(400).json({ message: 'Identificador de evaluación inválido.' });
        const record = await Evaluation.findById(req.params.id).lean();
        if (!record) return res.status(404).json({ message: 'Evaluación no encontrada.' });
        const outcomes = record.vehicleRecord ? await Promise.all([
            Car.findById(record.vehicleRecord).select('purchasePrice purchaseCurrency').lean(),
            Sale.find({ vehicleId: record.vehicleRecord, status: 'entregada' }).sort({ saleDate: -1 }).limit(10)
                .select('saleDate salePrice saleCurrency').lean()
        ]) : null;
        res.json({ ...record, outcomes });
    }));

    app.post(base + '/:id/unavailable-listings', ...guard, protect(async (req, res) => {
        const { id } = req.params;
        const { source, listingId } = req.body ?? {};
        if (!validId(id) || typeof source !== 'string' || typeof listingId !== 'string' || listingId.length > 64) {
            return res.status(400).json({ message: 'Identificador de publicación inválido.' });
        }
        const record = await Evaluation.findOneAndUpdate({
            _id: id,
            'snapshot.listings': { $elemMatch: { source, id: listingId } },
            unavailableListings: { $not: { $elemMatch: { source, listingId } } }
        }, {
            $push: { unavailableListings: { source, listingId, reportedAt: new Date(),
                author: req.user.username || req.user.id || req.user.userId } }
        }, { new: true }).select('unavailableListings');
        if (!record) return res.status(409).json({ message: 'Aviso inexistente o marcado sin disponibilidad.' });
        res.json(record);
    }));

    app.put(base + '/:id/vehicle', ...guard, protect(async (req, res) => {
        const { id } = req.params;
        const vehicleRecord = req.body?.vehicleRecord;
        if (!validId(id) || !validId(vehicleRecord) || !await Car.exists({ _id: vehicleRecord })) {
            return res.status(400).json({ message: 'Evaluación o vehículo inválido.' });
        }
        const record = await Evaluation.findOneAndUpdate({ _id: id, $or: [{ vehicleRecord: null }, { vehicleRecord }] },
            { $set: { vehicleRecord } }, { new: true });
        if (!record) return res.status(409).json({ message: 'La evaluación no existe o ya está vinculada a otro vehículo.' });
        res.json(record);
    }));
}
