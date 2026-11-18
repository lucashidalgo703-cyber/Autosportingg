import { Router } from 'express';
import connectDB from '../config/db.js';
import { getStockNegotiation, simulateStockNegotiation, setGeneralNegotiationRule, setVehicleNegotiationRule, clearVehicleNegotiationRule } from '../services/stockNegotiationService.js';

const endpoint = callback => async (req, res) => {
    try { await connectDB(); res.json(await callback(req)); }
    catch (error) { res.status(error.status || 503).json({ message: error.status ? error.message : 'No se pudo consultar la negociación. Actualizá y volvé a intentar.' }); }
};

export function createStockNegotiationRouter({ authenticate }) {
    const router = Router();
    router.use((_req, res, next) => {
        res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'X-Content-Type-Options': 'nosniff' }); next();
    }, authenticate);
    router.get('/', endpoint(req => getStockNegotiation(req.user, req.query)));
    router.put('/rule', endpoint(req => setGeneralNegotiationRule(req.user, req.body)));
    router.put('/:id/rule', endpoint(req => setVehicleNegotiationRule(req.user, req.params.id, req.body)));
    router.delete('/:id/rule', endpoint(req => clearVehicleNegotiationRule(req.user, req.params.id, req.body)));
    router.post('/:id/simulate', endpoint(req => simulateStockNegotiation(req.user, req.params.id, req.body)));
    return router;
}
