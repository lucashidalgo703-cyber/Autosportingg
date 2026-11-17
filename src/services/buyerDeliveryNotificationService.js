import crypto from 'node:crypto';
import BuyerDeliveryNotification from '../models/BuyerDeliveryNotification.js';
import BuyerDeliveryDocument from '../models/BuyerDeliveryDocument.js';
import { BuyerPortal } from '../models/BuyerPortal.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import { EmailAdapter } from '../lib/emailAdapter.js';
import { authorizePortalDocumentSale, notificationPortalUrl } from './buyerPortalService.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';

const MAX_ATTEMPTS = 3;
const idOf = value => String(value?._id || value || '');
const validId = value => /^[a-f0-9]{24}$/i.test(idOf(value));
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const labels = { title: 'Título del automotor', registration_front: 'Cédula · Frente', registration_back: 'Cédula · Dorso', transfer_certificate: 'Constancia de transferencia', other: 'Documentación del vehículo' };
function emailOf(client) {
    const value = typeof client?.email === 'string' ? client.email : '';
    if (/[\r\n]/.test(value) || client?.status !== 'activo') return '';
    const email = value.trim().toLowerCase();
    return email.length <= 254 && /^[^\s@<>;,"]+@[^\s@<>;,"]+\.[^\s@<>;,"]+$/u.test(email) ? email : '';
}
function summary(event) {
    if (!event) return { status: 'not_needed', retryable: false };
    return { id: idOf(event), status: event.state === 'sending' ? 'pending' : event.state === 'uncertain' ? 'failed' : event.state,
        reason: event.reason || undefined, retryable: ['pending', 'failed'].includes(event.state) && event.attempts < MAX_ATTEMPTS,
        sentAt: event.sentAt || null, action: event.action, revision: event.revision };
}
export async function createBuyerDeliveryNotificationIndexes() {
    await BuyerDeliveryNotification.createCollection(); await BuyerDeliveryNotification.createIndexes();
}
export async function enqueueBuyerDeliveryNotification({ doc, sale, action, documentType }, session) {
    const [client, portal] = await Promise.all([
        Client.findById(sale.clientId).select('email status').session(session).lean(),
        BuyerPortal.findById(sale._id).select('enabled generation expiresAt').session(session).lean()
    ]);
    const email = emailOf(client);
    const reason = !email ? 'recipient_missing' : !portal?.enabled || !(portal.expiresAt > new Date()) ? 'portal_unavailable' : null;
    const [event] = await BuyerDeliveryNotification.create([{ documentId: doc._id, revision: doc.revision,
        action, documentState: doc.state, documentType: documentType || doc.type,
        saleId: sale._id, clientId: sale.clientId, vehicleId: sale.vehicleId,
        contactHash: email ? hash(email) : undefined, generation: portal?.generation,
        state: reason ? 'skipped' : 'pending', reason: reason || undefined,
        nextAttemptAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) }], { session });
    return event;
}
function origin() {
    try {
        const url = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://autosportingg.com');
        const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
        if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
            || url.protocol !== 'https:' && !(local && process.env.VERCEL !== '1' && url.protocol === 'http:')) throw new Error();
        return url.origin;
    } catch { return 'https://autosportingg.com'; }
}
async function deliveryContext(event) {
    const doc = await BuyerDeliveryDocument.findById(event.documentId).select('saleId clientId vehicleId revision state isCurrent').lean();
    if (!doc || !doc.isCurrent || doc.revision !== event.revision || doc.state !== event.documentState) return { reason: 'superseded' };
    if (idOf(doc.saleId) !== idOf(event.saleId) || idOf(doc.clientId) !== idOf(event.clientId) || idOf(doc.vehicleId) !== idOf(event.vehicleId)) return { reason: 'document_changed' };
    const sale = await Sale.findById(event.saleId).lean();
    if (!sale || sale.status === 'cancelada' || idOf(sale.clientId) !== idOf(event.clientId) || idOf(sale.vehicleId) !== idOf(event.vehicleId)) return { reason: 'buyer_changed' };
    const [client, car, portal] = await Promise.all([
        Client.findById(sale.clientId).select('firstName lastName fullName email status').lean(),
        Car.findById(sale.vehicleId).select('brand name year plateOrVin').lean(),
        BuyerPortal.findById(sale._id).select('enabled generation expiresAt').lean()
    ]);
    const email = emailOf(client);
    if (!email || hash(email) !== event.contactHash) return { reason: 'recipient_changed' };
    if (!car) return { reason: 'vehicle_changed' };
    if (!portal?.enabled || portal.generation !== event.generation || !(portal.expiresAt > new Date())) return { reason: 'portal_changed' };
    return { sale, client, car, email };
}
async function content(event, context) {
    const portalPath = await notificationPortalUrl(context.sale, event.generation);
    if (typeof portalPath !== 'string' || !/^\/portal\/[A-Za-z0-9_-]{43}$/.test(portalPath)) throw new Error('Portal unavailable');
    const url = origin() + portalPath, available = event.action === 'published';
    const name = [context.client.firstName, context.client.lastName].filter(Boolean).join(' ').trim() || context.client.fullName || 'Cliente';
    const vehicle = [context.car.brand, context.car.name, context.car.year].filter(Boolean).join(' ');
    const label = labels[event.documentType] || labels.other;
    const date = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(event.createdAt);
    const heading = available ? 'Tenés documentación de tu vehículo disponible' : 'Se actualizó la documentación de tu vehículo';
    const explanation = available ? 'Publicamos un documento para que puedas verlo y descargarlo desde tu portal.' : 'Un documento dejó de estar disponible en tu portal. Podés consultar allí el estado actual de la documentación.';
    const detail = [`Comprador: ${name}`, `Vehículo: ${vehicle}`, `Patente: ${context.car.plateOrVin || 'Sin patente'}`,
        `Documento: ${label}`, `Estado: ${available ? 'Disponible para descargar' : 'Retirado del portal'}`, `Hora argentina: ${date}`];
    const text = ['AutoSporting', heading, explanation, ...detail, `Ver la documentación de mi vehículo: ${url}`, 'El portal mantiene su verificación habitual de acceso.'].join('\n\n');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#18181b"><h1 style="font-size:24px">AutoSporting</h1><h2 style="font-size:20px">${escape(heading)}</h2><p>${escape(explanation)}</p>${detail.map(line => `<p>${escape(line)}</p>`).join('')}<p><a href="${escape(url)}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none">Ver la documentación de mi vehículo</a></p><p style="color:#52525b;font-size:12px">El portal mantiene su verificación habitual de acceso.</p></div>`;
    return { subject: `AutoSporting | ${available ? 'Documentación de tu vehículo disponible' : 'Se actualizó la documentación de tu vehículo'}`, html, text };
}
const knownFailure = error => String(error?.command || '').trim().toUpperCase() !== 'QUIT' && (
    ['EAUTH', 'ENOTFOUND', 'ECONNREFUSED', 'EENVELOPE', 'NOT_ACCEPTED', 'MAIL_UNCONFIGURED'].includes(error?.code)
    || error?.code === 'ECONNECTION' && String(error?.command || '').trim().toUpperCase() === 'CONN'
    || Number(error?.responseCode) >= 400 && Number(error?.responseCode) <= 599);
async function markUncertain(documentId) {
    await BuyerDeliveryNotification.updateMany({ ...(documentId ? { documentId } : {}), state: 'sending', claimedAt: { $lte: new Date(Date.now() - 120000) } },
        { $set: { state: 'uncertain', reason: 'delivery_uncertain' }, $unset: { claimId: '', nextAttemptAt: '' } });
}
async function deliverRecord(id, { force = false } = {}) {
    const now = new Date(), claimId = crypto.randomUUID();
    const event = await BuyerDeliveryNotification.findOneAndUpdate({ _id: id, state: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS },
        expiresAt: { $gt: now }, ...(force ? {} : { nextAttemptAt: { $lte: now } }) },
    { $set: { state: 'sending', claimedAt: now, claimId, reason: null }, $inc: { attempts: 1 } }, { new: true }).lean();
    if (!event) return BuyerDeliveryNotification.findById(id).lean();
    const claimed = { _id: event._id, state: 'sending', claimId };
    let context, rendered;
    try {
        context = await deliveryContext(event);
        if (context.reason) return BuyerDeliveryNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: context.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
        rendered = await content(event, context);
        const current = await deliveryContext(event);
        if (current.reason) return BuyerDeliveryNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: current.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
    } catch {
        return BuyerDeliveryNotification.findOneAndUpdate(claimed, { $set: { state: 'failed', reason: 'preparation_failed', nextAttemptAt: new Date(Date.now() + 300000) }, $unset: { claimId: '' } }, { new: true }).lean();
    }
    let timeout;
    try {
        if (!EmailAdapter.isConfigured()) throw Object.assign(new Error('Mail not configured'), { code: 'MAIL_UNCONFIGURED' });
        const result = await Promise.race([
            EmailAdapter.sendEmail(context.email, rendered.subject, rendered.html, [],
                { connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 6000, logger: false, debug: false },
                { text: rendered.text, messageId: `<autosporting-delivery-${idOf(event)}@autosportingg.com>` }),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('Mail result unknown'), { code: 'DELIVERY_TIMEOUT' })), 8000); })
        ]);
        if (!Array.isArray(result?.accepted) || !result.accepted.some(item => String(typeof item === 'string' ? item : item?.address || '').toLowerCase() === context.email)) throw Object.assign(new Error('Recipient not accepted'), { code: 'NOT_ACCEPTED' });
    } catch (error) {
        const known = knownFailure(error);
        return BuyerDeliveryNotification.findOneAndUpdate(claimed, { $set: { state: known ? 'failed' : 'uncertain', reason: known ? 'delivery_failed' : 'delivery_uncertain',
            ...(known && event.attempts < MAX_ATTEMPTS ? { nextAttemptAt: new Date(Date.now() + (event.attempts < 2 ? 300000 : 1800000)) } : {}) },
        $unset: { claimId: '', ...(!known || event.attempts >= MAX_ATTEMPTS ? { nextAttemptAt: '' } : {}) } }, { new: true }).lean();
    } finally { clearTimeout(timeout); }
    return BuyerDeliveryNotification.findOneAndUpdate(claimed, { $set: { state: 'sent', sentAt: new Date(), reason: null }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
}
const latest = documentId => BuyerDeliveryNotification.findOne({ documentId, expiresAt: { $gt: new Date() } }).sort({ revision: -1 }).lean();
export async function deliverBuyerDeliveryNotification(documentId) {
    try {
        await markUncertain(documentId);
        const event = await latest(documentId);
        return summary(event ? await deliverRecord(event._id) : null);
    } catch { return { status: 'pending', reason: 'confirmation_pending', retryable: false }; }
}
async function authorizedDocument(user, documentId, write = false) {
    if (!validId(documentId)) fail('Documento no encontrado.', 404);
    const doc = await BuyerDeliveryDocument.findById(documentId).select('saleId').lean();
    if (!doc) fail('Documento no encontrado.', 404);
    await authorizePortalDocumentSale(user, idOf(doc.saleId));
    if (write && !(hasPermission(user, PERMISSIONS.GESTORIA_WRITE) || hasPermission(user, PERMISSIONS.VENTAS_WRITE) && hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE))) fail('No tenés permiso para reenviar este aviso.', 403);
}
export async function getBuyerDeliveryNotification(user, documentId) {
    await authorizedDocument(user, documentId); await markUncertain(documentId);
    return summary(await latest(documentId));
}
export async function retryBuyerDeliveryNotification(user, documentId) {
    await authorizedDocument(user, documentId, true); await markUncertain(documentId);
    const event = await latest(documentId);
    if (!event) fail('Aviso no encontrado.', 404);
    if (event.state === 'uncertain') fail('No se pudo confirmar el envío. Revisá el correo antes de reenviar este aviso.', 409);
    if (event.attempts >= MAX_ATTEMPTS && event.state !== 'sent') fail('Este aviso alcanzó el máximo de intentos.', 409);
    return summary(await deliverRecord(event._id, { force: true }));
}
export async function buyerDeliveryNotificationSummaries(documentIds) {
    if (!documentIds.length) return {};
    await BuyerDeliveryNotification.updateMany({ documentId: { $in: documentIds }, state: 'sending', claimedAt: { $lte: new Date(Date.now() - 120000) } },
        { $set: { state: 'uncertain', reason: 'delivery_uncertain' }, $unset: { claimId: '', nextAttemptAt: '' } });
    const events = await BuyerDeliveryNotification.find({ documentId: { $in: documentIds }, expiresAt: { $gt: new Date() } }).sort({ revision: -1 }).lean();
    const result = {};
    for (const event of events) if (!result[idOf(event.documentId)]) result[idOf(event.documentId)] = summary(event);
    return result;
}
export async function processPendingBuyerDeliveryNotifications({ limit = 3 } = {}) {
    await markUncertain();
    const events = await BuyerDeliveryNotification.find({ state: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS }, nextAttemptAt: { $lte: new Date() }, expiresAt: { $gt: new Date() } })
        .sort({ nextAttemptAt: 1 }).limit(Math.max(1, Math.min(10, Number(limit) || 3))).select('_id').lean();
    const result = { processed: 0, sent: 0, failed: 0, skipped: 0, pending: 0 };
    for (const event of events) {
        try { const notice = summary(await deliverRecord(event._id)); result.processed++; if (notice.status in result) result[notice.status]++; }
        catch { result.failed++; }
    }
    return result;
}
