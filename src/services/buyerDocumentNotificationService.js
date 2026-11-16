import crypto from 'node:crypto';
import BuyerDocumentNotification from '../models/BuyerDocumentNotification.js';
import { BuyerPortal, BuyerPortalDocument } from '../models/BuyerPortal.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import Gestoria from '../models/Gestoria.js';
import { EmailAdapter } from '../lib/emailAdapter.js';
import { BUYER_REQUIREMENTS } from '../utils/buyerPortalRequirements.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { isMySaleOrReservation } from '../utils/saleOwnership.js';

const MAX_ATTEMPTS = 3;
const idOf = value => String(value?._id || value || '');
const validId = value => /^[a-f0-9]{24}$/i.test(idOf(value));
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const contactHash = client => hash(String(client?.email || '').trim().toLowerCase());
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function administratorEmail() {
    const value = process.env.SECURITY_ALERT_EMAIL;
    if (typeof value !== 'string' || /[\r\n]/.test(value)) return '';
    const email = value.trim().toLowerCase();
    return email.length <= 254 && /^[^\s@<>;,"]+@[^\s@<>;,"]+\.[^\s@<>;,"]+$/u.test(email) ? email : '';
}
function publicNotification(event) {
    if (!event) return { status: 'not_needed', retryable: false };
    return { id: idOf(event._id), status: event.state === 'sending' ? 'pending' : event.state === 'uncertain' ? 'failed' : event.state,
        reason: event.reason || undefined, retryable: ['pending', 'failed'].includes(event.state) && event.attempts < MAX_ATTEMPTS,
        sentAt: event.sentAt || null };
}
export async function createBuyerDocumentNotificationIndexes() {
    await BuyerDocumentNotification.createCollection();
    await BuyerDocumentNotification.createIndexes();
}
export async function assertBuyerDocumentNotificationStorage() {
    const indexes = await BuyerDocumentNotification.collection.indexes().catch(error => { if (error.code === 26) return []; throw error; });
    if (!indexes.some(index => index.unique && index.key.documentId === 1 && Object.keys(index.key).length === 1)
        || !indexes.some(index => index.key.expiresAt === 1 && index.expireAfterSeconds === 0)) {
        fail('Falta preparar los avisos de documentación de este entorno. Reintentá más tarde.', 503);
    }
}
export async function enqueueBuyerDocumentNotification({ doc, sale, portal, client }, session) {
    const email = administratorEmail();
    const [event] = await BuyerDocumentNotification.create([{ documentId: doc._id, saleId: sale._id,
        tradeInId: doc.tradeInId, clientId: sale.clientId, generation: portal.generation,
        recipientHash: email ? hash(email) : undefined, clientContactHash: contactHash(client),
        state: email ? 'pending' : 'skipped', reason: email ? undefined : 'admin_recipient_missing',
        nextAttemptAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86400000) }], { session });
    return event;
}
function reviewOrigin() {
    try {
        const url = new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://autosportingg.com');
        const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
        if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
            || url.protocol !== 'https:' && !(loopback && process.env.VERCEL !== '1' && url.protocol === 'http:')) throw new Error();
        return url.origin;
    } catch { return 'https://autosportingg.com'; }
}
async function deliveryContext(event) {
    const email = administratorEmail();
    if (!email || hash(email) !== event.recipientHash) return { reason: 'admin_recipient_changed' };
    const doc = await BuyerPortalDocument.findById(event.documentId).select('-encryptedFile').lean();
    if (!doc || doc.origin !== 'buyer' || idOf(doc.saleId) !== idOf(event.saleId)
        || idOf(doc.tradeInId) !== idOf(event.tradeInId)) return { reason: 'document_changed' };
    const sale = await Sale.findById(event.saleId).lean();
    if (!sale || sale.status === 'cancelada' || idOf(sale.clientId) !== idOf(event.clientId)) return { reason: 'buyer_changed' };
    const tradeIn = sale.tradeIns?.find(item => idOf(item._id) === idOf(event.tradeInId));
    if (!tradeIn) return { reason: 'document_changed' };
    const client = await Client.findById(event.clientId).select('fullName firstName lastName email status').lean();
    if (!client || client.status === 'bloqueado' || contactHash(client) !== event.clientContactHash) return { reason: 'buyer_changed' };
    const portal = await BuyerPortal.findById(event.saleId).select('generation enabled').lean();
    if (!portal?.enabled || portal.generation !== event.generation) return { reason: 'portal_changed' };
    // Superseded versions remain valid upload events: every saved file gets its
    // own notice. The protected viewer shows the current copy and its history.
    return { email, doc, sale, tradeIn, client };
}
const vehicleLabel = vehicle => [vehicle?.brand, vehicle?.name || vehicle?.model, vehicle?.year].filter(Boolean).join(' ');
async function renderNotice(event, context) {
    const purchased = context.sale.vehicleId ? await Car.findById(context.sale.vehicleId).select('brand name year plateOrVin').lean() : null;
    const clientName = String(context.client.fullName || [context.client.firstName, context.client.lastName].filter(Boolean).join(' ') || 'Cliente')
        .replace(/[\r\n]/g, ' ').trim().slice(0, 160);
    const requirement = BUYER_REQUIREMENTS.find(item => item.key === context.doc.requirementKey)?.label || 'Documentación del vehículo';
    const type = context.doc.mimeType === 'application/pdf' ? 'PDF' : 'Foto';
    const date = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(event.createdAt);
    const reviewUrl = reviewOrigin() + '/admin/gestoria?documentos=' + idOf(event.saleId);
    const detail = [
        `Cliente: ${clientName}`, purchased && `Vehículo comprado: ${vehicleLabel(purchased)}${purchased.plateOrVin ? ' · ' + purchased.plateOrVin : ''}`,
        `Vehículo entregado: ${vehicleLabel(context.tradeIn)}${context.tradeIn.plate ? ' · ' + context.tradeIn.plate : ''}`,
        `Documento: ${requirement}`, `Archivo: ${type} · Versión ${context.doc.version || 1}`, `Hora argentina: ${date}`
    ].filter(Boolean);
    const text = ['AutoSporting', 'El cliente cargó nueva documentación.', ...detail,
        `Revisar documentación desde Gestoría: ${reviewUrl}`, 'El enlace requiere iniciar sesión en el CRM con una cuenta autorizada.'].join('\n\n');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#18181b"><h1 style="font-size:24px">AutoSporting</h1><h2 style="font-size:20px">Nueva documentación del cliente</h2><p>El cliente cargó ${type === 'PDF' ? 'un PDF' : 'una foto'} para revisar.</p>${detail.map(line => `<p>${escape(line)}</p>`).join('')}<p><a href="${escape(reviewUrl)}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none">Revisar documentación en Gestoría</a></p><p style="color:#52525b;font-size:12px">El enlace requiere iniciar sesión en el CRM con una cuenta autorizada.</p></div>`;
    return { subject: `AutoSporting | Nueva documentación de ${clientName}`, html, text };
}
const knownFailure = error => ['EAUTH', 'ECONNECTION', 'ENOTFOUND', 'ECONNREFUSED', 'EENVELOPE', 'EMESSAGE', 'NOT_ACCEPTED', 'MAIL_UNCONFIGURED'].includes(error?.code)
    || Number(error?.responseCode) >= 400 && Number(error?.responseCode) <= 599;
async function markUncertain(documentId) {
    await BuyerDocumentNotification.updateMany({ ...(documentId ? { documentId } : {}), state: 'sending', claimedAt: { $lte: new Date(Date.now() - 120000) } },
        { $set: { state: 'uncertain', reason: 'delivery_uncertain' }, $unset: { claimId: '', nextAttemptAt: '' } });
}
async function deliverRecord(documentId, { force = false } = {}) {
    const now = new Date(), claimId = crypto.randomUUID();
    const event = await BuyerDocumentNotification.findOneAndUpdate({ documentId, state: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS },
        expiresAt: { $gt: now }, ...(force ? {} : { nextAttemptAt: { $lte: now } }) },
    { $set: { state: 'sending', claimedAt: now, claimId, reason: null }, $inc: { attempts: 1 } }, { new: true }).lean();
    if (!event) return BuyerDocumentNotification.findOne({ documentId }).lean();
    const claimed = { _id: event._id, state: 'sending', claimId };
    let context, content;
    try {
        context = await deliveryContext(event);
        if (context.reason) return BuyerDocumentNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: context.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
        content = await renderNotice(event, context);
        const current = await deliveryContext(event);
        if (current.reason) return BuyerDocumentNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: current.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
    } catch {
        return BuyerDocumentNotification.findOneAndUpdate(claimed, { $set: { state: 'failed', reason: 'preparation_failed', nextAttemptAt: new Date(Date.now() + 300000) }, $unset: { claimId: '' } }, { new: true }).lean();
    }
    let timeout;
    try {
        if (!EmailAdapter.isConfigured()) throw Object.assign(new Error('Mail not configured'), { code: 'MAIL_UNCONFIGURED' });
        const result = await Promise.race([
            EmailAdapter.sendEmail(context.email, content.subject, content.html, [],
                { connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 6000, logger: false, debug: false },
                { text: content.text, messageId: `<autosporting-document-${idOf(event.documentId)}@autosportingg.com>` }),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('Mail result unknown'), { code: 'DELIVERY_TIMEOUT' })), 8000); })
        ]);
        if (!Array.isArray(result?.accepted) || !result.accepted.some(item => String(typeof item === 'string' ? item : item?.address || '').toLowerCase() === context.email)) {
            throw Object.assign(new Error('Recipient not accepted'), { code: 'NOT_ACCEPTED' });
        }
    } catch (error) {
        const known = knownFailure(error);
        return BuyerDocumentNotification.findOneAndUpdate(claimed, { $set: { state: known ? 'failed' : 'uncertain', reason: known ? 'delivery_failed' : 'delivery_uncertain',
            ...(known && event.attempts < MAX_ATTEMPTS ? { nextAttemptAt: new Date(Date.now() + (event.attempts < 2 ? 300000 : 1800000)) } : {}) },
        $unset: { claimId: '', ...(!known || event.attempts >= MAX_ATTEMPTS ? { nextAttemptAt: '' } : {}) } }, { new: true }).lean();
    } finally { clearTimeout(timeout); }
    return BuyerDocumentNotification.findOneAndUpdate(claimed, { $set: { state: 'sent', sentAt: new Date(), reason: null }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
}
export async function deliverBuyerDocumentNotification(documentId) {
    if (!validId(documentId)) return { status: 'not_needed', retryable: false };
    try {
        await markUncertain(documentId);
        return publicNotification(await deliverRecord(documentId));
    } catch {
        // The upload has already committed. A provider/acknowledgement failure
        // must never make the buyer believe that saving the file failed.
        return { status: 'pending', reason: 'confirmation_pending', retryable: false };
    }
}
async function authorizedDocument(user, documentId, write = false) {
    if (!validId(documentId)) fail('No encontré el archivo.', 404);
    const salesRead = hasPermission(user, PERMISSIONS.VENTAS_READ);
    if (!salesRead && !hasPermission(user, PERMISSIONS.GESTORIA_READ)) fail('No tenés permiso para consultar este aviso.', 403);
    if (write && !hasPermission(user, PERMISSIONS.GESTORIA_WRITE)) fail('No tenés permiso para reenviar el aviso.', 403);
    const doc = await BuyerPortalDocument.findById(documentId).select('saleId').lean();
    const sale = doc ? await Sale.findById(doc.saleId).lean() : null;
    if (!sale || user.role === 'ventas' && !isMySaleOrReservation(sale, user)) fail('No encontré el archivo.', 404);
    if (!salesRead && !await Gestoria.exists({ saleId: sale._id })) fail('No encontré documentación de este trámite.', 404);
}
export async function getBuyerDocumentNotification(user, documentId) {
    await authorizedDocument(user, documentId);
    await markUncertain(documentId);
    return publicNotification(await BuyerDocumentNotification.findOne({ documentId, expiresAt: { $gt: new Date() } }).lean());
}
export async function retryBuyerDocumentNotification(user, documentId) {
    await authorizedDocument(user, documentId, true);
    await markUncertain(documentId);
    const event = await BuyerDocumentNotification.findOne({ documentId, expiresAt: { $gt: new Date() } }).lean();
    if (!event) fail('Aviso no encontrado.', 404);
    if (event.state === 'uncertain') fail('No se pudo confirmar la entrega. Revisá el correo antes de solicitar otro aviso.', 409);
    if (event.attempts >= MAX_ATTEMPTS && event.state !== 'sent') fail('Este aviso alcanzó el máximo de intentos.', 409);
    return publicNotification(await deliverRecord(documentId, { force: true }));
}
