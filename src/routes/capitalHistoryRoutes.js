import { Router } from 'express';
import crypto from 'node:crypto';
import connectDB from '../config/db.js';
import { canReadCapitalHistory } from '../utils/adminPermissions.js';
import { queryCapitalHistory, captureCapitalObservation, captureScheduledCapitalObservation } from '../services/capitalHistoryService.js';
import { previewStockRecovery, importStockRecovery } from '../services/stockRecoveryService.js';
const headers = (_req, res, next) => { res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow' }); next(); };
const endpoint = callback => async (req, res) => {
    try { await connectDB(); res.json(await callback(req)); }
    catch (error) { res.status(error.status || 503).json({ message: error.status ? error.message : 'No se pudo consultar o registrar el capital. Reintentá.' }); }
};
export function createCapitalHistoryRouter({ authenticate }) {
    const router = Router(); router.use(headers, authenticate,
        (req, res, next) => canReadCapitalHistory(req.user) ? next() : res.status(403).json({ message: 'Sólo el propietario puede consultar el capital mensual.' }));
    router.get('/', endpoint(req => queryCapitalHistory(req.user, req.query)));
    router.get('/recovery', endpoint(req => previewStockRecovery(req.user, req.query)));
    router.post('/recovery', endpoint(req => importStockRecovery(req.user, req.body, req)));
    router.post('/capture', endpoint(req => {
        const input = req.body;
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => key !== 'period')) {
            throw Object.assign(new Error('El capital se calcula en el servidor. No se pueden cargar importes ni fechas históricas.'), { status: 400 });
        }
        return captureCapitalObservation({ user: req.user, requestKey: req.get('Idempotency-Key'), period: input.period, req });
    }));
    return router;
}
export function capitalHistoryCronHandler(req, res) {
    headers(req, res, () => {});
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) return res.status(503).json({ message: 'Falta configurar CRON_SECRET.' });
    const expected = Buffer.from('Bearer ' + secret), received = Buffer.from(req.get('authorization') || '');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return res.status(401).json({ message: 'Solicitud programada no autorizada.' });
    // No request parameter can select a month, date, amount or formula.
    return endpoint(request => captureScheduledCapitalObservation({ req: request }))(req, res);
}
