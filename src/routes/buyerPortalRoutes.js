import { Router } from 'express';
import multer from 'multer';
import connectDB from '../config/db.js';
import * as portal from '../services/buyerPortalService.js';
import { gptRequestQuota } from '../services/gptExpenseOAuthService.js';

const bearer = req => req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : '';
const endpoint = fn => async (req, res) => {
    try { await connectDB(); const result = await fn(req, res); if (!res.headersSent) res.json(result); }
    catch (error) {
        const status = error.status || (error instanceof multer.MulterError ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400) : 503);
        // Never log link tokens, verification codes, files, or buyer details.
        if (!res.headersSent) res.status(status).json({ message: error.status ? error.message : status === 413 ? 'Cada archivo admite hasta 3 MB.' : 'No se pudo completar la solicitud. Reintentá.' });
    }
};
const headers = (_req, res, next) => {
    res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
    next();
};
export function createAdminBuyerPortalRouter({ authenticate }) {
    const router = Router(); router.use(headers, authenticate);
    router.get('/sales/:id', endpoint(req => portal.portalConfiguration(req.user, req.params.id)));
    router.put('/sales/:id', endpoint(req => portal.configurePortal(req.user, req.params.id, req.body)));
    router.delete('/sales/:id', endpoint(req => portal.revokePortal(req.user, req.params.id)));
    router.patch('/sales/:id/tracking', endpoint(req => portal.updatePortalTracking(req.user, req.params.id, req.body)));
    router.get('/documents', endpoint(req => portal.adminDocuments(req.user, req.query)));
    router.patch('/documents/:id', endpoint(req => portal.reviewBuyerDocument(req.user, req.params.id, req.body)));
    router.post('/documents/:id/access', endpoint(req => portal.documentAccess(req.params.id, null, req.user)));
    router.patch('/requirements/original', endpoint(req => portal.markOriginal(req.user, req.body)));
    return router;
}
export function createBuyerPortalRouter() {
    const router = Router(); router.use(headers);
    router.get('/files/:id', endpoint(async (req, res) => {
        const doc = await portal.readPrivateDocument(req.params.id, req.query.access);
        res.set({ 'Content-Type': doc.mimeType, 'Content-Disposition': 'inline; filename="documento"',
            'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'self'", 'Cross-Origin-Resource-Policy': 'same-origin' });
        res.send(doc.buffer);
    }));
    router.get('/:token/info', endpoint(req => portal.portalInfo(req.params.token)));
    router.post('/:token/challenge', endpoint(req => portal.sendBuyerChallenge(req.params.token, req.ip)));
    router.post('/:token/verify', endpoint(req => portal.verifyBuyerChallenge(req.params.token, req.body, req.ip)));
    const authenticated = async (req, res, next) => {
        try {
            await connectDB();
            req.buyer = await portal.buyerSession(req.params.token, bearer(req));
            await gptRequestQuota('buyer-portal:' + req.buyer.portal._id, 90);
            next();
        } catch (error) { res.status(error.status || 503).json({ message: error.status ? error.message : 'No se pudo validar el acceso.' }); }
    };
    router.get('/:token/session', authenticated, endpoint(req => portal.portalData(req.buyer.sale, req.buyer.portal)));
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 15, parts: 17, fieldSize: 3000 } }).single('file');
    router.post('/:token/documents', authenticated, (req, res) => upload(req, res, error => {
        if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: 'Subí un archivo de hasta 3 MB por vez.' });
        void endpoint(request => portal.uploadBuyerDocument(request.buyer, request.body, request.file))(req, res);
    }));
    router.post('/:token/documents/:id/access', authenticated, endpoint(req => portal.documentAccess(req.params.id, req.buyer)));
    return router;
}
