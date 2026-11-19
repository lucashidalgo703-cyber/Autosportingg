import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Gestoria from '../models/Gestoria.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import GestoriaStatusNotification from '../models/GestoriaStatusNotification.js';
import { BuyerPortal } from '../models/BuyerPortal.js';
import { EmailAdapter } from '../lib/emailAdapter.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { isMySaleOrReservation } from '../utils/saleOwnership.js';
import { notificationPortalUrl } from './buyerPortalService.js';

const MAX_ATTEMPTS = 3;
const STATES = ['Pendiente', 'Documentación', 'Presentado', 'Observado', 'Transferido', 'Finalizado', 'Cancelado'];
const EDITABLE = ['title', 'type', 'vehicleId', 'vehiclePlate', 'clientId', 'sellerId', 'saleId', 'organismo', 'chargedToClient',
    'gestorName', 'status', 'cost', 'clientChargeAmount', 'chargedAmount', 'currency', 'startDate', 'estimatedEndDate', 'actualEndDate', 'notes', 'documents'];
const idOf = value => String(value?._id || value || '');
const validId = value => /^[a-f0-9]{24}$/i.test(idOf(value));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const emailOf = client => {
    const value = typeof client?.email === 'string' ? client.email : '';
    if (/[\r\n]/.test(value)) return '';
    const email = value.trim().toLowerCase();
    return email.length <= 254 && /^[^\s@<>;,"]+@[^\s@<>;,"]+\.[^\s@<>;,"]+$/u.test(email) ? email : '';
};
const publicNotification = event => {
    if (!event) return { status: 'not_needed', retryable: false };
    return { id: idOf(event._id), status: event.state === 'sending' ? 'pending' : event.state === 'uncertain' ? 'failed' : event.state,
        reason: event.reason || undefined, retryable: ['pending', 'failed'].includes(event.state) && event.attempts < MAX_ATTEMPTS,
        sentAt: event.sentAt || null, changedAt: event.createdAt, state: event.toStatus };
};

export async function createGestoriaNotificationIndexes() {
    await GestoriaStatusNotification.createCollection();
    await GestoriaStatusNotification.createIndexes();
}
async function storageReady() {
    const indexes = await GestoriaStatusNotification.collection.indexes().catch(error => { if (error.code === 26) return []; throw error; });
    if (!indexes.some(index => index.unique && index.key.tramiteId === 1 && index.key.revision === 1 && Object.keys(index.key).length === 2)) {
        fail('Falta preparar el registro de avisos del trámite. No se modificó el estado.', 503);
    }
    if (!indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)) fail('Falta preparar el vencimiento de los avisos del trámite. No se modificó el estado.', 503);
}
async function authorize(user, tramite, permission, session) {
    if (!hasPermission(user, permission)) fail('No tenés permiso para este trámite.', 403);
    if (!tramite) fail('Trámite no encontrado.', 404);
    if (user.role === 'ventas') {
        let owned = false;
        if (tramite.saleId) {
            const sale = await Sale.findById(tramite.saleId).session(session || null).lean();
            owned = sale && isMySaleOrReservation(sale, user);
        } else if (tramite.clientId) {
            const client = await Client.findById(tramite.clientId).select('assignedTo createdBy').session(session || null).lean();
            owned = client && idOf(client.assignedTo) === idOf(user.id);
        } else {
            owned = idOf(tramite.createdBy) === idOf(user.id);
        }
        if (!owned) fail('Trámite no encontrado.', 404);
    }
}
export async function gestoriaScope(user) {
    if (user?.role !== 'ventas') return {};
    const actor = idOf(user.id || user.userId || user._id);
    if (!validId(actor)) return { _id: { $in: [] } };
    const [sales, clients] = await Promise.all([
        Sale.find({ assignedTo: actor }).distinct('_id'),
        Client.find({ assignedTo: actor }).distinct('_id')
    ]);
    return { $or: [
        { saleId: { $in: sales } },
        { saleId: null, clientId: { $in: clients } },
        { saleId: null, clientId: null, createdBy: actor }
    ] };
}
export async function assertGestoriaAccess(user, tramite, permission = PERMISSIONS.GESTORIA_READ) {
    return authorize(user, tramite, permission);
}
async function recipientBinding(tramite, session) {
    let sale = null;
    if (tramite.saleId) {
        sale = await Sale.findById(tramite.saleId).session(session || null).lean();
        if (!sale || sale.status === 'cancelada') return { reason: 'sale_unavailable' };
    }
    const clientId = sale ? sale.clientId : tramite.clientId;
    if (!clientId) return { sale, reason: 'recipient_missing' };
    const client = await Client.findById(clientId).select('email status').session(session || null).lean();
    if (!client || client.status !== 'activo') return { sale, reason: 'recipient_inactive' };
    const email = emailOf(client);
    if (!email) return { sale, reason: 'recipient_missing' };
    const portal = sale ? await BuyerPortal.findById(sale._id).select('generation').session(session || null).lean() : null;
    return { sale, client, email, contactHash: hash(email), portalGeneration: portal?.generation ?? null };
}

export async function updateGestoria(user, id, input) {
    if (!hasPermission(user, PERMISSIONS.GESTORIA_WRITE)) fail('No tenés permiso para modificar el trámite.', 403);
    if (!validId(id)) fail('Trámite no encontrado.', 404);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Revisá los datos del trámite.');
    const patch = {};
    for (const field of EDITABLE) if (Object.prototype.hasOwnProperty.call(input, field)) patch[field] = input[field];
    for (const field of ['vehicleId', 'clientId', 'sellerId', 'saleId']) if (patch[field] === '') patch[field] = null;
    for (const field of ['clientChargeAmount', 'chargedAmount']) if (field in patch) {
        const amount = Number(patch[field]);
        if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) fail('Los importes del trámite deben ser números positivos o cero.');
        patch[field] = Math.round(amount * 100) / 100;
    }
    if ('status' in patch && !STATES.includes(patch.status)) fail('El estado del trámite no es válido.');
    await storageReady();
    const session = await mongoose.startSession();
    let saved, notificationId = null;
    try {
        await session.withTransaction(async () => {
            notificationId = null;
            const existing = await Gestoria.findById(id).session(session).lean();
            await authorize(user, existing, PERMISSIONS.GESTORIA_WRITE, session);
            const moneyChanged = ['chargedAmount', 'clientChargeAmount'].some(field => field in patch && Number(patch[field]) !== Number(existing[field] || 0));
            if (moneyChanged && Number(input.collectionRevision ?? 0) !== Number(existing.collectionRevision || 0)) fail('Los cobros de este trámite cambiaron. Volvé a abrirlo antes de guardar los importes.', 409);
            if (existing.collectionRevision > 0 && existing.chargedAmount > 0 && ['currency', 'saleId', 'clientId', 'vehicleId'].some(field => field in patch && idOf(patch[field]) !== idOf(existing[field]))) {
                fail('Este trámite tiene cobros imputados. Revisá o anulá esos cobros antes de cambiar la moneda o la operación.', 409);
            }
            const next = { ...existing, ...patch };
            await authorize(user, next, PERMISSIONS.GESTORIA_WRITE, session);
            const changed = Object.prototype.hasOwnProperty.call(patch, 'status') && patch.status !== existing.status;
            const revision = (existing.statusRevision || 0) + (changed ? 1 : 0);
            const update = { $set: { ...patch, ...(changed ? { statusRevision: revision } : {}) } };
            if (moneyChanged) update.$inc = { collectionRevision: 1 };
            if (changed) update.$push = { auditLog: { action: 'CAMBIO_ESTADO',
                details: `Estado cambió de ${existing.status} a ${patch.status}`, date: new Date(),
                user: String(user.name || user.username || user.email || 'Usuario').replace(/[\r\n]/g, ' ').slice(0, 160) } };
            saved = await Gestoria.findByIdAndUpdate(id, update, { new: true, runValidators: true, session }).lean();
            if (!changed) return;
            const binding = await recipientBinding(saved, session);
            const event = await GestoriaStatusNotification.create([{ tramiteId: saved._id, revision,
                fromStatus: existing.status, toStatus: saved.status, saleId: saved.saleId || null,
                vehicleId: binding.sale ? binding.sale.vehicleId || null : saved.vehicleId || null,
                recipientClientId: binding.client?._id || null, contactHash: binding.contactHash,
                portalGeneration: binding.portalGeneration ?? null, state: binding.reason ? 'skipped' : 'pending',
                reason: binding.reason, nextAttemptAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) }], { session });
            notificationId = event[0]._id;
        });
    } finally { await session.endSession(); }
    let notification = null;
    if (notificationId) {
        try { notification = await deliverNotification(notificationId); }
        catch {
            // The status and event already committed. A failed acknowledgement
            // after SMTP must never make the UI report that saving failed.
            try { notification = await GestoriaStatusNotification.findById(notificationId).lean(); } catch {}
            if (!notification) return { tramite: saved, notification: { id: idOf(notificationId), status: 'pending', reason: 'confirmation_pending', retryable: false } };
        }
    }
    return { tramite: saved, notification: notification ? publicNotification(notification) : { status: 'not_needed', retryable: false } };
}

function publicOrigin() {
    try {
        const url = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://autosportingg.com');
        if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
        const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
        if (url.protocol !== 'https:' && !(loopback && process.env.VERCEL !== '1' && url.protocol === 'http:')) throw new Error();
        return url.origin;
    } catch { return 'https://autosportingg.com'; }
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
async function emailContent(event, tramite, binding) {
    const carId = binding.sale ? binding.sale.vehicleId : tramite.vehicleId;
    const car = carId ? await Car.findById(carId).select('brand name year plateOrVin').lean() : null;
    const vehicle = car ? [car.brand, car.name, car.year].filter(Boolean).join(' ') : '';
    const plate = car?.plateOrVin || (!binding.sale ? tramite.vehiclePlate : '') || '';
    const date = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(event.createdAt);
    let path = null;
    if (binding.sale) path = await notificationPortalUrl(binding.sale, event.portalGeneration);
    const url = typeof path === 'string' && /^\/portal\/[A-Za-z0-9_-]{43}$/.test(path) ? publicOrigin() + path : '';
    const documentation = tramite.type === 'Transferencia Egreso';
    const heading = documentation ? 'Se actualizó el estado de la documentación de tu vehículo' : 'Se actualizó el estado de tu trámite';
    const action = documentation ? 'Ver la documentación de mi vehículo' : 'Ver el estado de mi trámite';
    const section = documentation ? 'Documentación de tu vehículo' : `Trámite: ${tramite.type}`;
    const text = ['AutoSporting', heading + '.', section, `Nuevo estado: ${event.toStatus}`,
        vehicle && `Vehículo: ${vehicle}`, plate && `Patente: ${plate}`, `Hora argentina: ${date}`,
        url ? `Consultá el avance en tu portal privado: ${url}` : 'Podés comunicarte con AutoSporting para consultar el avance de tu trámite.',
        'Este aviso informa un cambio de estado. No tenés que responder este correo.'].filter(Boolean).join('\n\n');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#18181b"><h1 style="font-size:24px">AutoSporting</h1><h2 style="font-size:20px">${escape(heading)}</h2><p>${escape(section)}</p><p style="font-size:24px;font-weight:bold">Nuevo estado: ${escape(event.toStatus)}</p>${vehicle ? `<p>Vehículo: ${escape(vehicle)}</p>` : ''}${plate ? `<p>Patente: ${escape(plate)}</p>` : ''}<p>Hora argentina: ${escape(date)}</p>${url ? `<p><a href="${escape(url)}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none">${escape(action)}</a></p><p>Tu portal mantiene su verificación de acceso habitual.</p>` : '<p>Podés comunicarte con AutoSporting para consultar el avance de tu trámite.</p>'}<p style="color:#52525b;font-size:12px">Este aviso informa un cambio de estado. No tenés que responder este correo.</p></div>`;
    return { text, html, subject: 'AutoSporting | ' + heading };
}

async function deliveryContext(event) {
    const tramite = await Gestoria.findById(event.tramiteId).lean();
    if (!tramite || idOf(tramite.saleId) !== idOf(event.saleId)) return { reason: 'procedure_changed' };
    if (tramite.status !== event.toStatus || (tramite.statusRevision || 0) !== event.revision) return { reason: 'superseded' };
    const binding = await recipientBinding(tramite);
    if (binding.reason) return { reason: binding.reason };
    if (idOf(binding.sale ? binding.sale.vehicleId : tramite.vehicleId) !== idOf(event.vehicleId)) return { reason: 'vehicle_changed' };
    if (idOf(binding.client._id) !== idOf(event.recipientClientId) || binding.contactHash !== event.contactHash) return { reason: 'recipient_changed' };
    if (binding.portalGeneration !== event.portalGeneration) return { reason: 'portal_changed' };
    return { tramite, binding };
}
const knownDeliveryFailure = error => String(error?.command || '').trim().toUpperCase() !== 'QUIT' && (
    ['EAUTH', 'ENOTFOUND', 'ECONNREFUSED', 'EENVELOPE', 'NOT_ACCEPTED', 'MAIL_UNCONFIGURED'].includes(error?.code)
    || error?.code === 'ECONNECTION' && String(error?.command || '').trim().toUpperCase() === 'CONN'
    || Number(error?.responseCode) >= 400 && Number(error?.responseCode) <= 599);
async function deliverNotification(id, { force = false } = {}) {
    const now = new Date(), claimId = crypto.randomUUID();
    const event = await GestoriaStatusNotification.findOneAndUpdate({ _id: id, state: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS },
        expiresAt: { $gt: now }, ...(force ? {} : { nextAttemptAt: { $lte: now } }) },
    { $set: { state: 'sending', claimedAt: now, claimId, reason: null }, $inc: { attempts: 1 } }, { new: true }).lean();
    if (!event) return GestoriaStatusNotification.findById(id).lean();
    const claimed = { _id: event._id, state: 'sending', claimId };
    let content, context;
    try {
        context = await deliveryContext(event);
        if (context.reason) return GestoriaStatusNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: context.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
        content = await emailContent(event, context.tramite, context.binding);
        // Recheck association after rendering/decrypting the link, immediately
        // before crossing the external SMTP boundary.
        const current = await deliveryContext(event);
        if (current.reason) return GestoriaStatusNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: current.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
    } catch {
        return GestoriaStatusNotification.findOneAndUpdate(claimed, { $set: { state: 'failed', reason: 'preparation_failed', nextAttemptAt: new Date(Date.now() + 300000) }, $unset: { claimId: '' } }, { new: true }).lean();
    }
    let timeout;
    try {
        if (!EmailAdapter.isConfigured()) throw Object.assign(new Error('Mail not configured'), { code: 'MAIL_UNCONFIGURED' });
        const result = await Promise.race([
            EmailAdapter.sendEmail(context.binding.email, content.subject, content.html, [],
                { connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 6000, logger: false, debug: false },
                { text: content.text, messageId: `<autosporting-gestoria-${idOf(event._id)}@autosportingg.com>` }),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('Mail result unknown'), { code: 'DELIVERY_TIMEOUT' })), 8000); })
        ]);
        const accepted = Array.isArray(result?.accepted) && result.accepted.some(item => String(typeof item === 'string' ? item : item?.address || '').toLowerCase() === context.binding.email);
        if (!accepted) throw Object.assign(new Error('Recipient not accepted'), { code: 'NOT_ACCEPTED' });
    } catch (error) {
        const known = knownDeliveryFailure(error);
        const delay = event.attempts < 2 ? 300000 : 1800000;
        return GestoriaStatusNotification.findOneAndUpdate(claimed, { $set: { state: known ? 'failed' : 'uncertain', reason: known ? 'delivery_failed' : 'delivery_uncertain',
            ...(known && event.attempts < MAX_ATTEMPTS ? { nextAttemptAt: new Date(Date.now() + delay) } : {}) },
        $unset: { claimId: '', ...(!known || event.attempts >= MAX_ATTEMPTS ? { nextAttemptAt: '' } : {}) } }, { new: true }).lean();
    } finally { clearTimeout(timeout); }
    // If this write fails after SMTP accepted the email, leave the claim in
    // sending. It must not be automatically sent again after an unknown result.
    return GestoriaStatusNotification.findOneAndUpdate(claimed, { $set: { state: 'sent', sentAt: new Date(), reason: null },
        $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
}
async function markUncertainClaims(tramiteId) {
    await GestoriaStatusNotification.updateMany({ ...(tramiteId ? { tramiteId } : {}), state: 'sending', claimedAt: { $lte: new Date(Date.now() - 120000) } },
        { $set: { state: 'uncertain', reason: 'delivery_uncertain' }, $unset: { claimId: '', nextAttemptAt: '' } });
}
export async function getGestoriaNotification(user, tramiteId) {
    if (!validId(tramiteId)) fail('Trámite no encontrado.', 404);
    const tramite = await Gestoria.findById(tramiteId).lean();
    await authorize(user, tramite, PERMISSIONS.GESTORIA_READ);
    await markUncertainClaims(tramiteId);
    return publicNotification(await GestoriaStatusNotification.findOne({ tramiteId, expiresAt: { $gt: new Date() } }).sort({ revision: -1 }).lean());
}
export async function retryGestoriaNotification(user, tramiteId, notificationId) {
    if (!validId(tramiteId) || !validId(notificationId)) fail('Aviso no encontrado.', 404);
    const tramite = await Gestoria.findById(tramiteId).lean();
    await authorize(user, tramite, PERMISSIONS.GESTORIA_WRITE);
    await markUncertainClaims(tramiteId);
    const event = await GestoriaStatusNotification.findOne({ _id: notificationId, tramiteId, expiresAt: { $gt: new Date() } }).lean();
    if (!event) fail('Aviso no encontrado.', 404);
    if (event.state === 'uncertain') fail('No pudimos confirmar el resultado del envío. Revisá la entrega antes de solicitar un nuevo aviso.', 409);
    if (event.attempts >= MAX_ATTEMPTS && event.state !== 'sent') fail('Este aviso alcanzó el máximo de intentos de envío.', 409);
    return publicNotification(await deliverNotification(event._id, { force: true }));
}
export async function processPendingGestoriaNotifications({ limit = 10 } = {}) {
    await markUncertainClaims();
    const events = await GestoriaStatusNotification.find({ state: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS },
        nextAttemptAt: { $lte: new Date() }, expiresAt: { $gt: new Date() } }).sort({ nextAttemptAt: 1 }).limit(Math.max(1, Math.min(20, Number(limit) || 10))).select('_id').lean();
    const summary = { processed: 0, sent: 0, failed: 0, skipped: 0, pending: 0 };
    for (const event of events) {
        try {
            const result = publicNotification(await deliverNotification(event._id));
            summary.processed++;
            if (result.status in summary) summary[result.status]++;
        } catch { summary.failed++; }
    }
    return summary;
}
