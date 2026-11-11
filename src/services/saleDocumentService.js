import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import SaleDocument from '../models/SaleDocument.js';
import AuditLog from '../models/AuditLog.js';
export const SALE_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
const slots = ['buyer_id_front', 'buyer_id_back', 'vehicle_card_front', 'vehicle_card_back', 'deposit_receipt', 'trade_in_card_front', 'trade_in_card_back'];
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const actorId = actor => { const id = String(actor.id || actor.userId || ''); if (!id) throw fail(401, 'No se pudo identificar la sesión.'); return id; };
const safeName = name => String(name || 'archivo').split(/[\\/]/).at(-1).normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 180) || 'archivo';
const metadata = doc => ({ _id: String(doc._id), saleId: String(doc.saleId), slot: doc.slot, ...(doc.depositId ? { depositId: String(doc.depositId) } : {}), ...(doc.tradeInId ? { tradeInId: String(doc.tradeInId) } : {}), filename: doc.filename, contentType: doc.contentType, size: doc.size, createdAt: doc.createdAt, createdByName: doc.createdByName || '', deletedAt: doc.deletedAt || null });
export function normalizeSaleDocumentScope(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !slots.includes(value.slot) || Object.keys(value).some(key => !['slot', 'depositId', 'tradeInId'].includes(key))) throw fail(400, 'Indicá el tipo de documento de la venta.');
    const scope = { slot: value.slot };
    if (value.slot === 'deposit_receipt') { if (!validId(value.depositId) || value.tradeInId) throw fail(400, 'El recibo debe pertenecer a una seña guardada.'); scope.depositId = value.depositId.toLowerCase(); }
    else if (value.slot.startsWith('trade_in_')) { if (!validId(value.tradeInId) || value.depositId) throw fail(400, 'La cédula debe pertenecer a una permuta guardada.'); scope.tradeInId = value.tradeInId.toLowerCase(); }
    else if (value.depositId || value.tradeInId) throw fail(400, 'Este documento pertenece a la venta completa.');
    return scope;
}
async function sale(saleId, scope, session = null) {
    if (!validId(saleId)) throw fail(400, 'La venta no es válida.');
    const found = await Sale.findById(saleId).select('_id depositRecords._id tradeIns._id').session(session).lean();
    if (!found) throw fail(404, 'La venta no existe.');
    if (scope?.depositId && !found.depositRecords?.some(item => String(item._id) === scope.depositId)) throw fail(404, 'La seña no pertenece a esta venta. Guardá primero la seña.');
    if (scope?.tradeInId && !found.tradeIns?.some(item => String(item._id) === scope.tradeInId)) throw fail(404, 'La permuta no pertenece a esta venta. Guardá primero la permuta.');
    return found;
}
export const assertSaleDocumentTarget = sale;
const scopeFilter = scope => ({ slot: scope.slot, depositId: scope.depositId || null, tradeInId: scope.tradeInId || null });
const audit = (actor, action, saleId, documents, session) => AuditLog.create([{ userId: actorId(actor), userName: String(actor.username || actor.name || ''), userRole: actor.role, action, module: 'ventas', entityType: 'SaleDocument', entityId: String(saleId), description: 'Gestión de documentos privados de la venta.', metadata: { saleId: String(saleId), documentIds: documents.map(doc => String(doc._id)) } }], session ? { session } : undefined);
const batch = (actor, uploadId) => { if (typeof uploadId !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(uploadId)) throw fail(400, 'La identificación de carga no es válida.'); return actorId(actor) + ':' + uploadId.toLowerCase(); };
function sameScope(doc, scope) { return doc.slot === scope.slot && String(doc.depositId || '') === String(scope.depositId || '') && String(doc.tradeInId || '') === String(scope.tradeInId || ''); }
function matches(doc, manifest, scope) { return sameScope(doc, scope) && Array.isArray(manifest) && manifest.length === 1 && doc.sha256 === manifest[0]?.fileSha256?.toLowerCase() && doc.filename === safeName(manifest[0]?.fileName) && doc.size === manifest[0]?.fileSize; }
export async function findCommittedSaleDocumentUpload(saleId, uploadId, actor, manifest, rawScope) {
    const scope = normalizeSaleDocumentScope(rawScope); await sale(saleId, scope);
    const previous = await SaleDocument.findOne({ saleId, uploadBatch: batch(actor, uploadId) }).select('+sha256').lean();
    if (!previous) return null;
    if (!matches(previous, manifest, scope)) throw fail(409, 'Esta carga ya corresponde a otro documento. Seleccionalo nuevamente.');
    return { document: metadata(previous), documents: [metadata(previous)], replayed: true };
}
function detectedType(data) {
    if (data.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
    if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    return 'application/octet-stream';
}
export async function commitSaleDocument(saleId, files, uploadId, actor, rawScope) {
    const scope = normalizeSaleDocumentScope(rawScope), uploadBatch = batch(actor, uploadId);
    if (!Array.isArray(files) || files.length !== 1 || !Buffer.isBuffer(files[0]?.buffer) || !files[0].buffer.length || files[0].buffer.length > SALE_DOCUMENT_MAX_BYTES) throw fail(400, 'Seleccioná un archivo con contenido de hasta 15 MB.');
    const data = files[0].buffer, filename = safeName(files[0].originalname), sha256 = crypto.createHash('sha256').update(data).digest('hex');
    const session = await mongoose.startSession(); let result;
    try { await session.withTransaction(async () => {
        await sale(saleId, scope, session); await Sale.updateOne({ _id: saleId }, { $inc: { __v: 1 } }, { session, timestamps: false });
        const previous = await SaleDocument.findOne({ saleId, uploadBatch }).select('+sha256').session(session);
        if (previous) { if (!sameScope(previous, scope) || previous.sha256 !== sha256 || previous.filename !== filename) throw fail(409, 'Esta carga ya corresponde a otro documento.'); result = { document: metadata(previous), documents: [metadata(previous)], replayed: true }; return; }
        // Replacing a slot retains the previous private document for recovery.
        await SaleDocument.updateMany({ saleId, ...scopeFilter(scope), deletedAt: null }, { $set: { deletedAt: new Date(), deletedBy: actorId(actor) } }, { session });
        const [document] = await SaleDocument.create([{ saleId, ...scope, filename, contentType: detectedType(data), size: data.length, data, sha256, uploadBatch, createdBy: actorId(actor), createdByName: String(actor.username || actor.name || '') }], { session });
        await audit(actor, 'VENTA_ARCHIVO_ALTA', saleId, [document], session); result = { document: metadata(document), documents: [metadata(document)], replayed: false };
    }); return result; } finally { await session.endSession(); }
}
export async function listSaleDocuments(saleId) { await sale(saleId); const documents = await SaleDocument.find({ saleId }).select('_id saleId slot depositId tradeInId filename contentType size createdAt createdByName deletedAt').sort({ createdAt: -1, _id: -1 }).lean(); return { documents: documents.map(metadata), maxBytes: SALE_DOCUMENT_MAX_BYTES }; }
export async function readSaleDocument(saleId, documentId, actor) {
    await sale(saleId); if (!validId(documentId)) throw fail(400, 'El documento no es válido.');
    const document = await SaleDocument.findOne({ _id: documentId, saleId, deletedAt: null }).select('+data').lean();
    if (!document) throw fail(404, 'El documento no está disponible.'); await audit(actor, 'VENTA_ARCHIVO_DESCARGA', saleId, [document]);
    const data = Buffer.isBuffer(document.data) ? document.data : typeof document.data?.value === 'function' ? Buffer.from(document.data.value()) : Buffer.from(document.data?.buffer || []);
    return { metadata: metadata(document), data };
}
export async function setSaleDocumentDeleted(saleId, documentId, deleted, actor) {
    if (!validId(documentId) || typeof deleted !== 'boolean') throw fail(400, 'Indicá si querés eliminar o restaurar el archivo.');
    const session = await mongoose.startSession(); let result;
    try { await session.withTransaction(async () => {
        await sale(saleId, null, session); await Sale.updateOne({ _id: saleId }, { $inc: { __v: 1 } }, { session, timestamps: false });
        const document = await SaleDocument.findOne({ _id: documentId, saleId }).session(session); if (!document) throw fail(404, 'El documento no existe.');
        if (Boolean(document.deletedAt) === deleted) { result = { document: metadata(document) }; return; }
        if (!deleted) { const scope = normalizeSaleDocumentScope({ slot: document.slot, ...(document.depositId ? { depositId: String(document.depositId) } : {}), ...(document.tradeInId ? { tradeInId: String(document.tradeInId) } : {}) }); await sale(saleId, scope, session); if (await SaleDocument.exists({ saleId, ...scopeFilter(scope), deletedAt: null }).session(session)) throw fail(409, 'Ya hay un documento activo de este tipo. Eliminá el actual antes de restaurar.'); }
        document.deletedAt = deleted ? new Date() : null; document.deletedBy = deleted ? actorId(actor) : null; await document.save({ session });
        await audit(actor, deleted ? 'VENTA_ARCHIVO_BAJA' : 'VENTA_ARCHIVO_RESTAURADO', saleId, [document], session); result = { document: metadata(document) };
    }); return result; } finally { await session.endSession(); }
}
