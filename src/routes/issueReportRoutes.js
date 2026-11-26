import { Router } from 'express';
import multer from 'multer';
import connectDB from '../config/db.js';
import { authorizeIssueReports, createIssueReport, getIssueReport, listIssueReports, prepareIssueReportIndexes, readIssueReportAttachment, updateIssueReport } from '../services/issueReportService.js';
import { retryIssueReportEmail } from '../services/issueReportNotificationService.js';

const endpoint = callback => async (req, res) => {
    try {
        await connectDB();
        await prepareIssueReportIndexes();
        const result = await callback(req, res);
        if (!res.headersSent) res.json(result);
    } catch (error) {
        const status = error.status || (['ValidationError', 'CastError'].includes(error.name) ? 400 : 503);
        if (!res.headersSent) res.status(status).json({ message: error.status ? error.message : 'No se pudo completar la operación. Reintentá.' });
    }
};
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 3, fields: 16, fieldSize: 12000, parts: 20 },
    fileFilter: (_req, file, callback) => callback(['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)
        ? null : Object.assign(new Error('Subí capturas PNG, JPG o WebP.'), { status: 400 }), true)
}).array('attachments', 3);

export function createIssueReportRouter({ authenticate }) {
    const router = Router();
    router.use((_req, res, next) => {
        res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
        next();
    }, authenticate, (req, res, next) => {
        try { authorizeIssueReports(req.user); next(); }
        catch (error) { res.status(error.status || 403).json({ message: error.message }); }
    });
    router.get('/', endpoint(req => listIssueReports(req.user, req.query)));
    router.post('/', (req, res) => upload(req, res, error => {
        if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
            message: error.code === 'LIMIT_FILE_SIZE' ? 'Las capturas pueden sumar hasta 3 MB por reporte.' : 'Podés subir hasta 3 capturas PNG, JPG o WebP que sumen hasta 3 MB.'
        });
        void endpoint(async (request, response) => {
            const report = await createIssueReport(request.user, request.body, request.files || []);
            response.status(201).json(report);
        })(req, res);
    }));
    router.get('/:id', endpoint(req => getIssueReport(req.user, req.params.id)));
    router.patch('/:id', endpoint(req => updateIssueReport(req.user, req.params.id, req.body)));
    router.post('/:id/email/retry', endpoint(async req => {
        await retryIssueReportEmail(req.user, req.params.id);
        return getIssueReport(req.user, req.params.id);
    }));
    router.get('/:id/attachments/:attachmentId', endpoint(async (req, res) => {
        const file = await readIssueReportAttachment(req.user, req.params.id, req.params.attachmentId);
        const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[file.contentType];
        const encodedName = encodeURIComponent(file.name).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16));
        res.set({ 'Content-Type': file.contentType,
            'Content-Disposition': `attachment; filename="captura.${extension}"; filename*=UTF-8''${encodedName}`,
            'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'self'", 'Cross-Origin-Resource-Policy': 'same-origin' });
        res.send(file.buffer);
    }));
    return router;
}
