import crypto from 'node:crypto';
import BuyerPaymentNotification from '../models/BuyerPaymentNotification.js';
import BuyerPaymentProof from '../models/BuyerPaymentProof.js';
import { BuyerPortal } from '../models/BuyerPortal.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import { EmailAdapter } from '../lib/emailAdapter.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';

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
function summary(event) {
    if (!event) return { status: 'not_needed', retryable: false };
    return { id: idOf(event._id), status: event.state === 'sending' ? 'pending' : event.state === 'uncertain' ? 'failed' : event.state,
        reason: event.reason || undefined, retryable: ['pending', 'failed'].includes(event.state) && event.attempts < MAX_ATTEMPTS,
        sentAt: event.sentAt || null };
}
let ready;
export function createBuyerPaymentNotificationIndexes() {
    return ready ||= (async () => { await BuyerPaymentNotification.createCollection(); await BuyerPaymentNotification.createIndexes(); })()
        .catch(error => { ready = null; throw error; });
}
export async function enqueueBuyerPaymentNotification({ proof, sale, portal, client }, session) {
    const email = administratorEmail();
    const [event] = await BuyerPaymentNotification.create([{ proofId: proof._id, saleId: sale._id, clientId: sale.clientId,
        vehicleId: sale.vehicleId, generation: portal.generation, recipientHash: email ? hash(email) : undefined,
        clientContactHash: contactHash(client), state: email ? 'pending' : 'skipped', reason: email ? undefined : 'admin_recipient_missing',
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
    const proof = await BuyerPaymentProof.findById(event.proofId).lean();
    if (!proof || idOf(proof.saleId) !== idOf(event.saleId) || idOf(proof.clientId) !== idOf(event.clientId)
        || idOf(proof.vehicleId) !== idOf(event.vehicleId)) return { reason: 'proof_changed' };
    const sale = await Sale.findById(event.saleId).select('clientId vehicleId status').lean();
    if (!sale || sale.status === 'cancelada' || idOf(sale.clientId) !== idOf(event.clientId)
        || idOf(sale.vehicleId) !== idOf(event.vehicleId)) return { reason: 'operation_changed' };
    const client = await Client.findById(event.clientId).select('fullName firstName lastName email status').lean();
    if (!client || client.status === 'bloqueado' || contactHash(client) !== event.clientContactHash) return { reason: 'buyer_changed' };
    const portal = await BuyerPortal.findById(event.saleId).select('generation enabled expiresAt').lean();
    if (!portal?.enabled || portal.expiresAt <= new Date() || portal.generation !== event.generation) return { reason: 'portal_changed' };
    return { email, proof, sale, client };
}
async function renderNotice(event, context) {
    const car = await Car.findById(context.sale.vehicleId).select('brand name year plateOrVin').lean();
    const name = String([context.client.firstName, context.client.lastName].filter(Boolean).join(' ') || context.client.fullName || 'Cliente')
        .replace(/[\r\n]/g, ' ').trim().slice(0, 160);
    const argentina = { timeZone: 'America/Argentina/Buenos_Aires', dateStyle: 'short' };
    const date = new Intl.DateTimeFormat('es-AR', { ...argentina, timeStyle: 'short', hourCycle: 'h23' }).format(event.createdAt);
    const paymentDate = new Intl.DateTimeFormat('es-AR', argentina).format(context.proof.paymentDate);
    const amount = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(context.proof.amount);
    const destination = ({ purchase: 'Saldo de compra', deposit: 'Seña de la operación', installment: 'Cuota', gestoria: 'Gestoría' })[context.proof.targetType];
    const state = ({ pending: 'Pendiente de verificación', correction_requested: 'Corrección solicitada', confirmed: 'Acreditado', linked: 'Vinculado a un cobro existente', superseded: 'Versión anterior reemplazada' })[context.proof.status] || 'Pendiente de revisión';
    const reviewUrl = reviewOrigin() + '/admin/ventas/' + idOf(event.saleId) + '?section=collections&comprobante=' + idOf(event.proofId);
    const detail = [`Cliente: ${name}`, car && `Vehículo comprado: ${[car.brand, car.name, car.year].filter(Boolean).join(' ')}`,
        car?.plateOrVin && `Patente: ${car.plateOrVin}`, `Importe informado: ${context.proof.currency} ${amount}`,
        `Fecha del pago informada: ${paymentDate}`, `Concepto: ${context.proof.concept}`, `Destino: ${destination}`,
        `Estado actual: ${state}`, `Archivo: ${context.proof.mimeType === 'application/pdf' ? 'PDF' : 'Foto'} · Versión ${context.proof.version || 1}`,
        `Recepción · Hora argentina: ${date}`].filter(Boolean);
    const text = ['AutoSporting', 'El cliente subió un comprobante de pago.', ...detail,
        'La carga del archivo no confirma la acreditación ni registra un cobro. Revisalo en el CRM antes de confirmar el pago.',
        `Revisar comprobante en el CRM: ${reviewUrl}`, 'El enlace requiere iniciar sesión con una cuenta autorizada.'].join('\n\n');
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#18181b"><h1 style="font-size:24px">AutoSporting</h1><h2 style="font-size:20px">Nuevo comprobante de pago</h2>${detail.map(line => `<p>${escape(line)}</p>`).join('')}<p><strong>La carga del archivo no confirma la acreditación ni registra un cobro.</strong> Revisalo en el CRM antes de confirmar el pago.</p><p><a href="${escape(reviewUrl)}" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none">Revisar comprobante en el CRM</a></p><p style="color:#52525b;font-size:12px">El enlace requiere iniciar sesión con una cuenta autorizada.</p></div>`;
    return { subject: `AutoSporting | Nuevo comprobante de pago de ${name}`, text, html };
}
const knownFailure = error => String(error?.command || '').trim().toUpperCase() !== 'QUIT' && (
    ['EAUTH', 'ENOTFOUND', 'ECONNREFUSED', 'EENVELOPE', 'NOT_ACCEPTED', 'MAIL_UNCONFIGURED'].includes(error?.code)
    || error?.code === 'ECONNECTION' && error?.command === 'CONN'
    || Number(error?.responseCode) >= 400 && Number(error?.responseCode) <= 599);
async function markUncertain(proofIds) {
    await BuyerPaymentNotification.updateMany({ ...(proofIds ? { proofId: { $in: proofIds } } : {}), state: 'sending', claimedAt: { $lte: new Date(Date.now() - 120000) } },
        { $set: { state: 'uncertain', reason: 'delivery_uncertain' }, $unset: { claimId: '', nextAttemptAt: '' } });
}
async function deliverRecord(proofId, { force = false } = {}) {
    const now = new Date(), claimId = crypto.randomUUID();
    const event = await BuyerPaymentNotification.findOneAndUpdate({ proofId, state: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS },
        expiresAt: { $gt: now }, ...(force ? {} : { nextAttemptAt: { $lte: now } }) },
        { $set: { state: 'sending', claimedAt: now, claimId, reason: null }, $inc: { attempts: 1 } }, { new: true }).lean();
    if (!event) return BuyerPaymentNotification.findOne({ proofId }).lean();
    const claimed = { _id: event._id, state: 'sending', claimId };
    let context, content;
    try {
        context = await deliveryContext(event);
        if (context.reason) return BuyerPaymentNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: context.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
        content = await renderNotice(event, context);
        const current = await deliveryContext(event);
        if (current.reason) return BuyerPaymentNotification.findOneAndUpdate(claimed, { $set: { state: 'skipped', reason: current.reason }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
    } catch {
        return BuyerPaymentNotification.findOneAndUpdate(claimed, { $set: { state: 'failed', reason: 'preparation_failed', nextAttemptAt: new Date(Date.now() + 300000) }, $unset: { claimId: '' } }, { new: true }).lean();
    }
    let timeout;
    try {
        if (!EmailAdapter.isConfigured()) throw Object.assign(new Error('Mail not configured'), { code: 'MAIL_UNCONFIGURED' });
        const result = await Promise.race([
            EmailAdapter.sendEmail(context.email, content.subject, content.html, [],
                { connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 6000, logger: false, debug: false },
                { text: content.text, messageId: `<autosporting-payment-proof-${idOf(event.proofId)}@autosportingg.com>` }),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(Object.assign(new Error('Mail result unknown'), { code: 'DELIVERY_TIMEOUT' })), 8000); })
        ]);
        if (!Array.isArray(result?.accepted) || !result.accepted.some(item => String(typeof item === 'string' ? item : item?.address || '').toLowerCase() === context.email)) throw Object.assign(new Error('Recipient not accepted'), { code: 'NOT_ACCEPTED' });
    } catch (error) {
        const known = knownFailure(error);
        return BuyerPaymentNotification.findOneAndUpdate(claimed, { $set: { state: known ? 'failed' : 'uncertain', reason: known ? 'delivery_failed' : 'delivery_uncertain',
            ...(known && event.attempts < MAX_ATTEMPTS ? { nextAttemptAt: new Date(Date.now() + (event.attempts < 2 ? 300000 : 1800000)) } : {}) },
            $unset: { claimId: '', ...(!known || event.attempts >= MAX_ATTEMPTS ? { nextAttemptAt: '' } : {}) } }, { new: true }).lean();
    } finally { clearTimeout(timeout); }
    return BuyerPaymentNotification.findOneAndUpdate(claimed, { $set: { state: 'sent', sentAt: new Date(), reason: null }, $unset: { claimId: '', nextAttemptAt: '' } }, { new: true }).lean();
}
export async function deliverBuyerPaymentNotification(proofId) {
    if (!validId(proofId)) return { status: 'not_needed', retryable: false };
    try { await markUncertain([proofId]); return summary(await deliverRecord(proofId)); }
    catch { return { status: 'pending', reason: 'confirmation_pending', retryable: false }; }
}
async function authorizedProof(user, proofId, write = false) {
    if (!validId(proofId)) fail('No encontré el comprobante.', 404);
    if (user?.role === 'ventas' || !hasPermission(user, write ? PERMISSIONS.FINANZAS_WRITE : PERMISSIONS.FINANZAS_READ)) fail('No tenés permiso para consultar este aviso.', 403);
    const proof = await BuyerPaymentProof.findById(proofId).select('saleId clientId vehicleId').lean();
    const sale = proof ? await Sale.findById(proof.saleId).select('clientId vehicleId').lean() : null;
    if (!sale || idOf(proof.clientId) !== idOf(sale.clientId) || idOf(proof.vehicleId) !== idOf(sale.vehicleId)) fail('No encontré el comprobante.', 404);
}
export async function getBuyerPaymentNotification(user, proofId) {
    await authorizedProof(user, proofId); await createBuyerPaymentNotificationIndexes(); await markUncertain([proofId]);
    return summary(await BuyerPaymentNotification.findOne({ proofId, expiresAt: { $gt: new Date() } }).lean());
}
export async function getBuyerPaymentNotificationSummaries(proofIds) {
    await createBuyerPaymentNotificationIndexes();
    const ids = proofIds.filter(validId);
    if (!ids.length) return new Map();
    await markUncertain(ids);
    const events = await BuyerPaymentNotification.find({ proofId: { $in: ids }, expiresAt: { $gt: new Date() } }).lean();
    return new Map(events.map(event => [idOf(event.proofId), summary(event)]));
}
export async function retryBuyerPaymentNotification(user, proofId) {
    await authorizedProof(user, proofId, true); await createBuyerPaymentNotificationIndexes(); await markUncertain([proofId]);
    const event = await BuyerPaymentNotification.findOne({ proofId, expiresAt: { $gt: new Date() } }).lean();
    if (!event) fail('Aviso no encontrado.', 404);
    if (event.state === 'uncertain') fail('No se pudo confirmar la entrega. Revisá tu correo antes de solicitar otro aviso.', 409);
    if (event.attempts >= MAX_ATTEMPTS && event.state !== 'sent') fail('Este aviso alcanzó el máximo de intentos.', 409);
    return summary(await deliverRecord(proofId, { force: true }));
}
export async function retryPendingBuyerPaymentNotifications({ limit = 20 } = {}) {
    await createBuyerPaymentNotificationIndexes(); await markUncertain();
    const now = new Date();
    const events = await BuyerPaymentNotification.find({ state: { $in: ['pending', 'failed'] }, attempts: { $lt: MAX_ATTEMPTS },
        expiresAt: { $gt: now }, nextAttemptAt: { $lte: now } }).sort({ nextAttemptAt: 1 }).limit(Math.max(1, Math.min(50, Number(limit) || 20))).select('proofId').lean();
    const statuses = [];
    for (const event of events) statuses.push((await deliverBuyerPaymentNotification(event.proofId)).status);
    return { processed: statuses.length, sent: statuses.filter(status => status === 'sent').length };
}
