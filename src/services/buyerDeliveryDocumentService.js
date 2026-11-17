import crypto from 'node:crypto';
import mongoose from 'mongoose';
import BuyerDeliveryDocument from '../models/BuyerDeliveryDocument.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { isMySaleOrReservation } from '../utils/saleOwnership.js';
import { authorizePortalDocumentSale, portalError } from './buyerPortalService.js';
import { inspectPortalUpload, encryptPortalFile, decryptPortalFile, issuePortalFileAccess, verifyPortalFileAccess } from './buyerPortalFileService.js';
import { createBuyerDeliveryNotificationIndexes, enqueueBuyerDeliveryNotification, deliverBuyerDeliveryNotification, buyerDeliveryNotificationSummaries } from './buyerDeliveryNotificationService.js';

const idOf = value => String(value?._id || value || '');
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const clean = (value, maximum = 500) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';
const fail = (message, status = 400) => { throw portalError(message, status); };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const userId = user => idOf(user.id || user._id);
export const BUYER_DELIVERY_DOCUMENT_TYPES = {
    title: 'Título del automotor', registration_front: 'Cédula · Frente', registration_back: 'Cédula · Dorso',
    transfer_certificate: 'Constancia de transferencia', other: 'Otros documentos'
};
const dto = doc => ({ id: idOf(doc._id), fileId: idOf(doc._id), type: doc.type, label: BUYER_DELIVERY_DOCUMENT_TYPES[doc.type],
    description: doc.description || '', state: doc.state, isCurrent: doc.isCurrent, version: doc.version, revision: doc.revision,
    mimeType: doc.mimeType, fileName: doc.fileName, byteLength: doc.byteLength, createdAt: doc.createdAt,
    updatedAt: doc.updatedAt, publishedAt: doc.publishedAt || null, withdrawnAt: doc.withdrawnAt || null });
const canWrite = user => hasPermission(user, PERMISSIONS.GESTORIA_WRITE)
    || hasPermission(user, PERMISSIONS.VENTAS_WRITE) && hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE);
async function authorizedSale(user, saleId, write = false) {
    const sale = await authorizePortalDocumentSale(user, saleId);
    if (write && !canWrite(user)) fail('No tenés permiso para administrar los documentos del comprador.', 403);
    return sale;
}
async function recipientFor(sale, session = null) {
    if (!sale?.clientId || !sale?.vehicleId) fail('Vinculá el comprador y el vehículo vendido a esta operación.', 409);
    const [client, car] = await Promise.all([
        Client.findById(sale.clientId).select('firstName lastName fullName email status').session(session).lean(),
        Car.findById(sale.vehicleId).select('brand name year plateOrVin').session(session).lean()
    ]);
    if (!client || !car) fail('No encontré el comprador o el vehículo de esta operación.', 409);
    const recipient = { clientId: idOf(client._id), name: [client.firstName, client.lastName].filter(Boolean).join(' ').trim() || client.fullName || 'Sin nombre',
        vehicleId: idOf(car._id), vehicle: [car.brand, car.name, car.year].filter(Boolean).join(' '), plate: car.plateOrVin || 'Sin patente' };
    recipient.confirmationKey = hash(JSON.stringify(recipient));
    return { recipient, client, car };
}
async function lockRecipient(user, saleId, session) {
    await authorizedSale(user, saleId, true);
    const sale = await Sale.findById(saleId).session(session).lean();
    if (!sale || sale.status === 'cancelada') fail('Esta operación no permite publicar documentación.', 409);
    if (user.role === 'ventas' && !isMySaleOrReservation(sale, user)) fail('No encontré la operación.', 404);
    const details = await recipientFor(sale, session);
    if (details.client.status === 'bloqueado') fail('El comprador está bloqueado. Revisá su ficha antes de publicar.', 409);
    const saleLock = await Sale.updateOne({ _id: sale._id, clientId: sale.clientId, vehicleId: sale.vehicleId, status: { $ne: 'cancelada' } },
        { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
    const clientLock = await Client.updateOne({ _id: details.client._id }, { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
    const carLock = await Car.updateOne({ _id: details.car._id }, { $inc: { __v: 1 } }, { session, timestamps: false });
    if (!saleLock.matchedCount || !clientLock.matchedCount || !carLock.matchedCount) fail('El destinatario cambió. Actualizá la pantalla.', 409);
    return { sale, ...details };
}
function assertBinding(doc, sale) {
    if (idOf(doc.saleId) !== idOf(sale._id) || idOf(doc.clientId) !== idOf(sale.clientId) || idOf(doc.vehicleId) !== idOf(sale.vehicleId)) {
        fail('El comprador o el vehículo cambió. Volvé a cargar el documento para el destinatario correcto.', 409);
    }
}
async function authorizedDocument(user, id, write = false) {
    if (!validId(id)) fail('No encontré el documento.', 404);
    const doc = await BuyerDeliveryDocument.findById(id).lean();
    if (!doc) fail('No encontré el documento.', 404);
    const sale = await authorizedSale(user, idOf(doc.saleId), write);
    return { doc, sale };
}
let indexesReady;
export function createBuyerDeliveryIndexes() {
    return indexesReady ||= (async () => { await BuyerDeliveryDocument.createCollection(); await BuyerDeliveryDocument.createIndexes(); await createBuyerDeliveryNotificationIndexes(); })()
        .catch(error => { indexesReady = null; throw error; });
}
async function assertIndexes() {
    let indexes;
    try { indexes = await BuyerDeliveryDocument.collection.indexes(); } catch { fail('La documentación privada aún no está preparada.', 503); }
    if (!indexes.some(item => item.unique && item.key.saleId === 1 && item.key.requestId === 1)
        || !indexes.some(item => item.unique && item.key.logicalId === 1 && item.partialFilterExpression?.isCurrent === true)) {
        fail('La documentación privada aún no está preparada.', 503);
    }
}
export async function adminDeliveryDocuments(user, saleId) {
    const sale = await authorizedSale(user, saleId);
    await createBuyerDeliveryIndexes();
    const { recipient } = await recipientFor(sale);
    const docs = await BuyerDeliveryDocument.find({ saleId: sale._id, isCurrent: true }).sort({ createdAt: -1, _id: -1 }).lean();
    const notifications = await buyerDeliveryNotificationSummaries(docs.map(doc => doc._id));
    return { recipient, canWrite: canWrite(user), documents: docs.map(doc => ({ ...dto(doc), emailNotification: notifications[idOf(doc._id)] || { status: 'not_needed', retryable: false }, recipientMismatch:
        idOf(doc.clientId) !== idOf(sale.clientId) || idOf(doc.vehicleId) !== idOf(sale.vehicleId) })) };
}
export async function uploadDeliveryDocument(user, saleId, input = {}, file) {
    const initialSale = await authorizedSale(user, saleId, true);
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(input.requestId || '') || !Object.hasOwn(BUYER_DELIVERY_DOCUMENT_TYPES, input.type)) fail('Revisá el tipo de documento y la carga.');
    const description = clean(input.description);
    if (input.type === 'other' && description.length < 3) fail('Describí el documento que vas a entregar.');
    if (input.replacesId && !validId(input.replacesId)) fail('El archivo a reemplazar no es válido.');
    const inspected = inspectPortalUpload(file);
    await createBuyerDeliveryIndexes();
    await assertIndexes();
    const fingerprint = hash(JSON.stringify({ type: input.type, description, replacesId: input.replacesId || '', fileHash: inspected.fileHash }));
    const previous = await BuyerDeliveryDocument.findOne({ saleId, requestId: input.requestId }).lean();
    if (previous) {
        assertBinding(previous, initialSale);
        if (previous.requestFingerprint !== fingerprint) fail('Este intento corresponde a otra carga. Elegí el archivo de nuevo.', 409);
        return { entry: dto(previous), duplicate: true, notificationDocumentId: idOf(previous._id), emailNotification: await deliverBuyerDeliveryNotification(previous._id) };
    }
    const id = new mongoose.Types.ObjectId(), session = await mongoose.startSession();
    let saved, duplicate = false;
    try {
        await session.withTransaction(async () => {
            const { sale } = await lockRecipient(user, saleId, session);
            // A concurrent retry may have committed while this transaction
            // retried its sale lock. Recheck inside the serialized snapshot.
            const prior = await BuyerDeliveryDocument.findOne({ saleId: sale._id, requestId: input.requestId }).session(session).lean();
            if (prior) {
                if (prior.requestFingerprint !== fingerprint) fail('Este intento corresponde a otra carga. Elegí el archivo de nuevo.', 409);
                assertBinding(prior, sale); saved = prior; duplicate = true; return;
            }
            let old = null, replacedPublishedType = null;
            if (input.replacesId) {
                old = await BuyerDeliveryDocument.findOne({ _id: input.replacesId, saleId: sale._id, isCurrent: true }).session(session);
                if (!old) fail('El archivo vigente cambió. Actualizá la pantalla.', 409);
                assertBinding(old, sale);
                if (old.state === 'published') replacedPublishedType = old.type;
                old.isCurrent = false; old.state = 'replaced'; old.revision += 1;
                old.withdrawnAt = new Date(); old.withdrawnBy = userId(user);
                old.history.push({ action: 'replaced', at: new Date(), by: userId(user), revision: old.revision });
                await old.save({ session });
            }
            const [doc] = await BuyerDeliveryDocument.create([{ _id: id, saleId: sale._id, clientId: sale.clientId, vehicleId: sale.vehicleId,
                logicalId: old?.logicalId || id, type: input.type, description, state: 'draft', isCurrent: true,
                version: old ? old.version + 1 : 1, revision: 1, replacesId: old?._id,
                requestId: input.requestId, requestFingerprint: fingerprint, ...inspected,
                fileName: clean(file.originalname || 'documento', 180).replace(/[\r\n\\/"\x00-\x1f]/g, '_'),
                encryptedFile: encryptPortalFile(file.buffer, 'delivery', idOf(id)), createdBy: userId(user),
                history: [{ action: 'uploaded', at: new Date(), by: userId(user), revision: 1 }] }], { session });
            saved = doc.toObject();
            if (replacedPublishedType) await enqueueBuyerDeliveryNotification({ doc: saved, sale, action: 'withdrawn', documentType: replacedPublishedType }, session);
        });
    } catch (error) {
        if (error.code === 11000) {
            const prior = await BuyerDeliveryDocument.findOne({ saleId, requestId: input.requestId }).lean();
            if (prior?.requestFingerprint === fingerprint) return { entry: dto(prior), duplicate: true, notificationDocumentId: idOf(prior._id), emailNotification: await deliverBuyerDeliveryNotification(prior._id) };
            fail('La carga ya fue procesada o el archivo vigente cambió. Actualizá la pantalla.', 409);
        }
        throw error;
    } finally { await session.endSession(); }
    return { entry: dto(saved), notificationDocumentId: idOf(saved._id), emailNotification: await deliverBuyerDeliveryNotification(saved._id), ...(duplicate ? { duplicate: true } : {}) };
}
export async function editDeliveryDocument(user, id, input = {}) {
    const { doc } = await authorizedDocument(user, id, true);
    const description = clean(input.description);
    if (doc.type === 'other' && description.length < 3) fail('Describí el documento que vas a entregar.');
    const saved = await BuyerDeliveryDocument.findOneAndUpdate({ _id: id, isCurrent: true }, { $set: { description },
        $push: { history: { action: 'description_changed', at: new Date(), by: userId(user), revision: doc.revision } } }, { returnDocument: 'after' }).lean();
    if (!saved) fail('El archivo vigente cambió. Actualizá la pantalla.', 409);
    return { entry: dto(saved) };
}
export async function publishDeliveryDocument(user, id, input = {}) {
    const { doc } = await authorizedDocument(user, id, true);
    if (!Number.isSafeInteger(input.revision) || input.revision < 1 || typeof input.confirmationKey !== 'string') fail('Confirmá el destinatario antes de publicar.');
    await createBuyerDeliveryIndexes();
    const session = await mongoose.startSession();
    let saved, recipient, duplicate = false;
    try {
        await session.withTransaction(async () => {
            const details = await lockRecipient(user, idOf(doc.saleId), session); recipient = details.recipient;
            const current = await BuyerDeliveryDocument.findOne({ _id: id, isCurrent: true }).session(session).lean();
            if (!current) fail('El archivo vigente cambió. Actualizá la pantalla.', 409);
            assertBinding(current, details.sale);
            if (input.confirmationKey !== recipient.confirmationKey) fail('Los datos del destinatario cambiaron. Revisalos antes de publicar.', 409);
            if (current.state === 'published' && current.revision === input.revision + 1) { saved = current; duplicate = true; return; }
            if (current.revision !== input.revision || current.state === 'published') fail('La publicación cambió. Actualizá la pantalla.', 409);
            saved = await BuyerDeliveryDocument.findOneAndUpdate({ _id: id, isCurrent: true, revision: input.revision },
                { $set: { state: 'published', publishedAt: new Date(), publishedBy: userId(user) }, $inc: { revision: 1 },
                    $push: { history: { action: 'published', at: new Date(), by: userId(user), revision: input.revision + 1 } } },
                { session, returnDocument: 'after' }).lean();
            if (!saved) fail('La publicación cambió. Actualizá la pantalla.', 409);
            await enqueueBuyerDeliveryNotification({ doc: saved, sale: details.sale, action: 'published' }, session);
        });
    } finally { await session.endSession(); }
    return { entry: dto(saved), recipient, notificationDocumentId: idOf(saved._id), emailNotification: await deliverBuyerDeliveryNotification(saved._id), ...(duplicate ? { duplicate: true } : {}) };
}
export async function withdrawDeliveryDocument(user, id, input = {}) {
    const { doc } = await authorizedDocument(user, id, true);
    if (!doc.isCurrent) fail('El archivo vigente cambió. Actualizá la pantalla.', 409);
    if (!Number.isSafeInteger(input.revision) || input.revision < 1) fail('Actualizá el documento antes de retirarlo.', 409);
    await createBuyerDeliveryIndexes();
    const session = await mongoose.startSession();
    let saved, duplicate = false;
    try {
        await session.withTransaction(async () => {
            const current = await BuyerDeliveryDocument.findOne({ _id: id, isCurrent: true }).session(session).lean();
            if (!current) fail('El archivo vigente cambió. Actualizá la pantalla.', 409);
            if (current.state === 'withdrawn' && current.revision === input.revision + 1) { saved = current; duplicate = true; return; }
            if (current.revision !== input.revision) fail('El documento cambió. Actualizá la pantalla.', 409);
            const sale = await Sale.findById(current.saleId).session(session).lean();
            if (sale) await Sale.updateOne({ _id: sale._id }, { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
            saved = await BuyerDeliveryDocument.findOneAndUpdate({ _id: id, isCurrent: true, revision: input.revision },
                { $set: { state: 'withdrawn', withdrawnAt: new Date(), withdrawnBy: userId(user) }, $inc: { revision: 1 },
                    $push: { history: { action: 'withdrawn', at: new Date(), by: userId(user), revision: input.revision + 1 } } }, { session, returnDocument: 'after' }).lean();
            if (!saved) fail('El documento cambió. Actualizá la pantalla.', 409);
            if (current.state === 'published' && sale && sale.status !== 'cancelada'
                && idOf(saved.clientId) === idOf(sale.clientId) && idOf(saved.vehicleId) === idOf(sale.vehicleId)) {
                await enqueueBuyerDeliveryNotification({ doc: saved, sale, action: 'withdrawn' }, session);
            }
        });
    } finally { await session.endSession(); }
    return { entry: dto(saved), notificationDocumentId: idOf(saved._id), emailNotification: await deliverBuyerDeliveryNotification(saved._id), ...(duplicate ? { duplicate: true } : {}) };
}
export async function buyerDeliveryDocuments(context) {
    const documents = await BuyerDeliveryDocument.find({ saleId: context.sale._id, clientId: context.sale.clientId,
        vehicleId: context.sale.vehicleId, isCurrent: true, state: 'published' }).sort({ publishedAt: -1, _id: -1 }).lean();
    return { status: documents.length ? 'available' : 'preparing', documents: documents.map(dto) };
}
export async function deliveryDocumentAccess(id, { context, adminUser, download = false } = {}) {
    if (!validId(id)) fail('No encontré el documento.', 404);
    const doc = await BuyerDeliveryDocument.findOne({ _id: id, isCurrent: true }).lean();
    if (!doc) fail('No encontré el documento.', 404);
    if (adminUser) await authorizedSale(adminUser, idOf(doc.saleId));
    else {
        if (!context || doc.state !== 'published' || idOf(doc.saleId) !== idOf(context.sale._id)
            || idOf(doc.clientId) !== idOf(context.sale.clientId) || idOf(doc.vehicleId) !== idOf(context.sale.vehicleId)) fail('No encontré el documento.', 404);
    }
    return issuePortalFileAccess({ id, kind: 'delivery', revision: doc.revision, saleId: idOf(doc.saleId), context, adminUser, download: download === true });
}
export async function readDeliveryPortalFile(id, access) {
    const auth = await verifyPortalFileAccess(id, access, 'delivery');
    const doc = await BuyerDeliveryDocument.findOne({ _id: id, isCurrent: true, revision: auth.claims.revision }).select('+encryptedFile').lean();
    if (!doc || idOf(doc.saleId) !== idOf(auth.claims.saleId)) fail('Archivo no disponible.', 404);
    if (auth.user) await authorizedSale(auth.user, idOf(doc.saleId));
    else if (doc.state !== 'published' || idOf(doc.saleId) !== idOf(auth.sale._id)
        || idOf(doc.clientId) !== idOf(auth.sale.clientId) || idOf(doc.vehicleId) !== idOf(auth.sale.vehicleId)) fail('Archivo no disponible.', 404);
    return { buffer: decryptPortalFile(doc.encryptedFile, 'delivery', id), mimeType: doc.mimeType,
        fileName: doc.fileName, download: auth.download === true };
}
