import { PERMISSIONS } from '../utils/adminPermissions.js';
import { stagePrivateUpload, assemblePrivateUpload, cleanupPrivateUpload, privateUploadManifestHash } from '../services/privateUploadService.js';
import { assertSaleDocumentTarget, findCommittedSaleDocumentUpload, commitSaleDocument, listSaleDocuments, readSaleDocument, setSaleDocumentDeleted, normalizeSaleDocumentScope, SALE_DOCUMENT_MAX_BYTES } from '../services/saleDocumentService.js';
import { sendPrivateDocument } from '../utils/privateDocumentTransport.js';
const config = { maxFiles: 1, maxBytes: SALE_DOCUMENT_MAX_BYTES };
export function registerSaleDocumentRoutes(app, { authenticateToken, requirePermission, connectDB }) {
    const read = [authenticateToken, requirePermission(PERMISSIONS.VENTAS_READ), requirePermission(PERMISSIONS.DOCUMENTACION_READ)];
    const write = [...read, requirePermission(PERMISSIONS.VENTAS_WRITE), requirePermission(PERMISSIONS.DOCUMENTACION_WRITE)];
    const handle = fn => async (req, res) => { try { await connectDB(); res.setHeader('Cache-Control', 'private, no-store'); await fn(req, res); } catch (error) { res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'No se pudo gestionar el documento privado.', code: error.code }); } };
    const scope = req => ({ actorId: String(req.user.id || req.user.userId || ''), entityId: 'sale:' + req.params.id, uploadId: String(req.params.uploadId || '').toLowerCase() });
    app.get('/api/admin/sales/:id/documents', ...read, handle(async (req, res) => res.json(await listSaleDocuments(req.params.id))));
    app.get('/api/admin/sales/:id/documents/:documentId', ...read, handle(async (req, res) => sendPrivateDocument(res, await readSaleDocument(req.params.id, req.params.documentId, req.user), req.headers.range)));
    app.patch('/api/admin/sales/:id/documents/:documentId', ...write, handle(async (req, res) => res.json(await setSaleDocumentDeleted(req.params.id, req.params.documentId, req.body.deleted, req.user))));
    app.post('/api/admin/sales/:id/document-uploads/:uploadId/chunks', ...write, handle(async (req, res) => { await assertSaleDocumentTarget(req.params.id); res.json(await stagePrivateUpload({ ...scope(req), payload: req.body, config })); }));
    app.post('/api/admin/sales/:id/document-uploads/:uploadId/commit', ...write, handle(async (req, res) => {
        const target = scope(req), documentScope = normalizeSaleDocumentScope(req.body.metadata), expectedHash = privateUploadManifestHash(req.body.manifest, config);
        const previous = await findCommittedSaleDocumentUpload(req.params.id, target.uploadId, req.user, req.body.manifest, documentScope); if (previous) return res.json(previous);
        const assembled = await assemblePrivateUpload({ ...target, config }); if (assembled.manifestHash !== expectedHash) return res.status(409).json({ message: 'La selección de archivos no coincide con la carga.', code: 'PRIVATE_UPLOAD_CONFLICT' });
        const result = await commitSaleDocument(req.params.id, assembled.files, target.uploadId, req.user, documentScope);
        await cleanupPrivateUpload(target).catch(() => {}); res.status(201).json(result);
    }));
}
