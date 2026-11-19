import { Router } from 'express';
import multer from 'multer';
import connectDB from '../config/db.js';
import { canReadVehicleInvoices, canWriteVehicleInvoices } from '../utils/adminPermissions.js';
import * as invoices from '../services/vehicleInvoiceService.js';

const headers = (_req, res, next) => {
    res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow, noarchive' }); next();
};
const endpoint = callback => async (req, res) => {
    try { await connectDB(); const result = await callback(req, res); if (!res.headersSent) res.json(result); }
    catch (error) {
        const status = error.status || (error.name === 'ValidationError' ? 400 : 503);
        if (!res.headersSent) res.status(status).json({ message: error.status ? error.message : 'No se pudo completar la operación. Reintentá.' });
    }
};
const write = (req, res, next) => canWriteVehicleInvoices(req.user) ? next() : res.status(403).json({ message: 'No tenés permiso para administrar facturas.' });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 2, fieldSize: 100, parts: 4 } }).single('file');
export function createVehicleInvoiceRouter({ authenticate }) {
    const router = Router();
    router.use(headers, authenticate, (req, res, next) => canReadVehicleInvoices(req.user) ? next() : res.status(403).json({ message: 'No tenés acceso a Facturación / ARCA.' }));
    router.get('/operations', endpoint(req => invoices.invoiceOperations(req.user, req.query)));
    router.get('/', endpoint(req => invoices.listVehicleInvoices(req.user, req.query)));
    router.post('/', write, endpoint(async (req, res) => {
        const result = await invoices.registerVehicleInvoice(req.user, req.body, req.get('Idempotency-Key'), req);
        res.status(201).json(result);
    }));
    router.patch('/:id', write, endpoint(req => invoices.editVehicleInvoice(req.user, req.params.id, req.body, req.get('Idempotency-Key'), req)));
    router.post('/:id/file', write, (req, res) => upload(req, res, error => {
        if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: 'Subí un PDF o una imagen de hasta 3 MB por vez.' });
        void endpoint(request => invoices.uploadVehicleInvoiceFile(request.user, request.params.id, request.body, request.file, request.get('Idempotency-Key'), request))(req, res);
    }));
    router.post('/:id/file/access', endpoint(req => invoices.vehicleInvoiceFileAccess(req.user, req.params.id, req.body?.download === true)));
    return router;
}
export function createVehicleInvoiceFileRouter() {
    const router = Router(); router.use(headers);
    router.get('/:id', endpoint(async (req, res) => {
        const file = await invoices.readVehicleInvoiceFile(req.params.id, req.query.access);
        const extension = ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file.mimeType];
        const base = String(file.fileName || 'factura').replace(/[\x00-\x1f\x7f/\\"']/g, '_').replace(/\.[^.]{1,12}$/, '').slice(0, 140);
        const encoded = encodeURIComponent(base + '.' + extension).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16));
        res.set({ 'Content-Type': file.mimeType, 'Content-Disposition': `${file.download ? 'attachment' : 'inline'}; filename="factura.${extension}"; filename*=UTF-8''${encoded}`,
            'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'self'", 'Cross-Origin-Resource-Policy': 'same-origin' });
        res.send(file.buffer);
    }));
    return router;
}
