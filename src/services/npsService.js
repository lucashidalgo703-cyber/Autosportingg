import crypto from 'node:crypto';
import mongoose from 'mongoose';
import NpsSurvey from '../models/NpsSurvey.js';
import NpsResponse from '../models/NpsResponse.js';
import Client from '../models/Client.js';
import AdminUser from '../models/AdminUser.js';
import Sale from '../models/Sale.js';
import CommunicationLog from '../models/CommunicationLog.js';
import AuditLog from '../models/AuditLog.js';
import { WhatsAppAdapter } from '../lib/whatsappAdapter.js';
import { assertClientContactAllowed, isClientContactBlocked } from './clientContactPreferenceService.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { normalizePhoneToWhatsApp } from '../utils/phoneNormalizer.js';
import { NPS_CONTEXTS, npsScore, npsPeriodRange, npsCalendarDate } from '../utils/nps.js';

export class NpsError extends Error {
    constructor(message, code = 'NPS_VALIDATION', statusCode = 400, extra = {}) { super(message); Object.assign(this, { code, statusCode, ...extra }); }
}
const actorId = actor => String(actor.id || actor.userId || '');
const id = (value, label) => { if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) throw new NpsError(`El identificador de ${label} no es válido.`); return value; };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const requestId = (actor, key) => new mongoose.Types.ObjectId(hash(`${actorId(actor)}:${key}`).slice(0, 24));
const keyFor = (value, required = false) => {
    if (!value && !required) return crypto.randomUUID();
    if (typeof value !== 'string' || !/^[a-zA-Z\d_-]{8,120}$/.test(value)) throw new NpsError('La clave de la solicitud no es válida. Volvé a abrir el formulario.', 'NPS_IDEMPOTENCY_REQUIRED');
    return value;
};
const audit = (actor, action, survey, metadata = {}, session) => AuditLog.create([{ userId: actorId(actor), userName: actor.username || actor.name || 'CRM', userRole: actor.role, action, module: 'nps', entityType: 'NpsSurvey', entityId: String(survey._id), metadata: { clientId: String(survey.client?._id || survey.client), ...metadata } }], session ? { session } : {});
const commentFor = value => { if (value !== undefined && (typeof value !== 'string' || value.length > 1000)) throw new NpsError('El comentario admite hasta 1000 caracteres.'); return (value || '').trim(); };
const baseUrl = () => {
    const configured = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '');
    try { const url = new URL(configured); if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error(); return url.origin; }
    catch { throw new NpsError('Configurá la URL pública de la agencia antes de crear invitaciones NPS.', 'NPS_PUBLIC_URL_NOT_CONFIGURED', 503); }
};
const surveyLink = survey => `${baseUrl()}/encuesta/${survey.token}`;
const deliveryView = delivery => ({ status: delivery?.status || 'not_sent', attempts: delivery?.attempts || 0, sentAt: delivery?.sentAt || null, confirmationSource: delivery?.status === 'sent' ? delivery.providerMessageId ? 'provider' : delivery.verifiedAt ? 'manual' : null : null, errorCode: delivery?.errorCode || null, errorMessage: delivery?.errorMessage || null, verifiedAt: delivery?.verifiedAt || null, verificationNote: delivery?.verificationNote || '' });
const surveyView = survey => ({ _id: survey._id, status: survey.status, context: survey.context || null, channel: survey.channel || 'legacy', createdAt: survey.createdAt, expiresAt: survey.expiresAt, seller: survey.seller && typeof survey.seller === 'object' && survey.seller.name ? { _id: survey.seller._id, name: survey.seller.name } : survey.seller ? { _id: survey.seller._id || survey.seller } : null, delivery: deliveryView(survey.delivery) });
const responseView = response => response ? ({ _id: response._id, score: response.score, classification: response.classification, comment: response.comment || '', createdAt: response.createdAt, followUpStatus: response.followUpStatus, followUpNotes: response.followUpNotes || '', responsible: response.responsible || '' }) : null;

async function normalize(payload, actor, channel) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new NpsError('Los datos de la encuesta no son válidos.');
    id(actorId(actor), 'autor');
    const client = await Client.findById(id(payload.clientId, 'cliente')).select('_id phone doNotContact').lean();
    if (!client) throw new NpsError('Cliente no encontrado.', 'NPS_CLIENT_NOT_FOUND', 404);
    const sellerId = id(Object.hasOwn(payload, 'sellerId') ? payload.sellerId : actorId(actor), 'vendedor');
    const seller = await AdminUser.findOne({ _id: sellerId, active: { $ne: false } }).select('_id name').lean();
    if (!seller) throw new NpsError('Elegí un vendedor activo.');
    const context = payload.context === undefined || payload.context === null || payload.context === '' ? null : payload.context;
    if (context !== null && !NPS_CONTEXTS.some(item => item.value === context) || channel === 'whatsapp' && !context) throw new NpsError('Elegí el contexto de la encuesta.');
    let sale = null;
    if (payload.saleId) {
        if (!hasPermission(actor, PERMISSIONS.VENTAS_READ)) throw new NpsError('Necesitás permiso de Ventas para vincular una operación.', 'NPS_FORBIDDEN', 403);
        sale = id(payload.saleId, 'venta');
        if (!await Sale.exists({ _id: sale, clientId: client._id })) throw new NpsError('La operación no corresponde a este cliente.');
    }
    return { client, seller, context, sale, channel };
}
function initialSurvey(values, actor, key, extra = {}) {
    const canonical = { client: String(values.client._id), seller: String(values.seller._id), context: values.context, sale: values.sale, channel: values.channel, ...extra };
    return { _id: requestId(actor, key), token: crypto.randomBytes(32).toString('hex'), client: values.client._id, seller: values.seller._id, context: values.context, sale: values.sale, channel: values.channel, generatedBy: actorId(actor), idempotencyKey: key, requestHash: hash(JSON.stringify(canonical)), expiresAt: new Date(Date.now() + 7 * 86400000) };
}
function sameRequest(existing, input) { if (existing.requestHash !== input.requestHash) throw new NpsError('Esta clave ya corresponde a otra solicitud. Abrí un nuevo formulario para cambiar sus datos.', 'NPS_IDEMPOTENCY_CONFLICT', 409); }

export async function recordManualNps(payload, actor) {
    const values = await normalize(payload, actor, 'manual');
    let score, date;
    try { score = npsScore(payload.score); date = payload.callDate ? npsCalendarDate(payload.callDate) : new Date(); } catch (error) { throw new NpsError(error.message); }
    const comment = commentFor(payload.comment), key = keyFor(payload.idempotencyKey);
    const input = initialSurvey(values, actor, key, { score, comment, callDate: payload.callDate || null });
    const replay = async () => {
        const existing = await NpsSurvey.findById(input._id).lean();
        if (!existing) return null;
        sameRequest(existing, input);
        const response = await NpsResponse.findOne({ survey: existing._id }).lean();
        if (!response) throw new NpsError('La solicitud todavía se está guardando. Reintentá con el mismo formulario.', 'NPS_REQUEST_IN_PROGRESS', 409);
        return { survey: surveyView(existing), response: responseView(response), replayed: true };
    };
    const existing = await replay(); if (existing) return existing;
    try {
        return await mongoose.connection.transaction(async session => {
            const survey = new NpsSurvey({ ...input, status: 'completed' }); await survey.save({ session });
            const response = new NpsResponse({ survey: survey._id, score, comment, followUpStatus: score <= 6 ? 'pending' : 'resolved', createdAt: date, updatedAt: date }); await response.save({ session });
            await audit(actor, 'NPS_MANUAL_RECORDED', survey, { score, context: values.context, sellerId: String(values.seller._id) }, session);
            return { survey: surveyView(survey), response: responseView(response), replayed: false };
        });
    } catch (error) { if (error.code === 11000) { const found = await replay(); if (found) return found; } throw error; }
}

export async function generateNpsLink(payload, actor) {
    const values = await normalize(payload, actor, 'link');
    await assertClientContactAllowed({ clientId: values.client._id, to: values.client.phone, channel: 'whatsapp' });
    baseUrl();
    const input = initialSurvey(values, actor, keyFor(payload.idempotencyKey));
    let survey;
    try { survey = await NpsSurvey.findOneAndUpdate({ _id: input._id }, { $setOnInsert: input }, { upsert: true, new: true, runValidators: true }).lean(); }
    catch (error) { if (error.code !== 11000) throw error; survey = await NpsSurvey.findById(input._id).lean(); }
    sameRequest(survey, input); await audit(actor, 'NPS_LINK_PREPARED', survey, { context: values.context, sellerId: String(values.seller._id) });
    return { survey: surveyView(survey), url: surveyLink(survey), message: 'Enlace preparado. No se envió ningún mensaje.' };
}

function templateConfig() {
    const name = process.env.NPS_WHATSAPP_TEMPLATE_NAME;
    if (!name) return null;
    try {
        const templates = JSON.parse(process.env.WHATSAPP_TEMPLATES_JSON || '[]');
        const template = templates.find(item => item.name === name);
        const components = JSON.parse(process.env.NPS_WHATSAPP_TEMPLATE_COMPONENTS_JSON || 'null');
        if (!template || !Array.isArray(components) || !JSON.stringify(components).includes('{{surveyUrl}}') && !JSON.stringify(components).includes('{{surveyToken}}')) return null;
        return { name, language: process.env.NPS_WHATSAPP_TEMPLATE_LANGUAGE || template.language || 'es_AR', components };
    } catch { return null; }
}
async function deliveryOptions(client) {
    if (!WhatsAppAdapter.isConfigured()) return { available: false, reason: 'WhatsApp no está configurado. La agencia debe conectar Meta antes de enviar.', code: 'NPS_WHATSAPP_NOT_CONFIGURED' };
    try { baseUrl(); } catch (error) { return { available: false, reason: error.message, code: error.code }; }
    const phone = normalizePhoneToWhatsApp(client.phone || '').replace(/\D/g, '');
    if (!/^\d{8,15}$/.test(phone)) return { available: false, reason: 'El cliente necesita un teléfono válido para WhatsApp.', code: 'NPS_PHONE_REQUIRED' };
    const lastInbound = await CommunicationLog.findOne({ channel: 'whatsapp', direction: 'inbound', isDeleted: { $ne: true }, $or: [{ clientId: client._id }, { entityType: 'client', entityId: client._id }] }).sort({ contactDate: -1 }).select('contactDate').lean();
    const withinWindow = lastInbound && Date.now() - Date.parse(lastInbound.contactDate) >= 0 && Date.now() - Date.parse(lastInbound.contactDate) < 24 * 3600000;
    const template = templateConfig();
    if (!withinWindow && !template) return { available: false, reason: 'Fuera de la ventana de 24 horas: configurá una plantilla NPS aprobada en Meta, con el enlace de la encuesta.', code: 'NPS_TEMPLATE_REQUIRED' };
    return { available: true, phone, mode: withinWindow ? 'session' : 'template', template };
}
export async function getNpsConfig(clientId, actor) {
    const client = clientId ? await Client.findById(id(clientId, 'cliente')).select('_id phone doNotContact').lean() : null;
    if (clientId && !client) throw new NpsError('Cliente no encontrado.', 'NPS_CLIENT_NOT_FOUND', 404);
    const sellers = await AdminUser.find({ active: { $ne: false } }).select('_id name').sort({ name: 1 }).lean();
    const canWrite = hasPermission(actor, PERMISSIONS.NPS_WRITE), canSend = canWrite && hasPermission(actor, PERMISSIONS.WHATSAPP_WRITE);
    const blocked = client ? await isClientContactBlocked({ clientId: client._id, to: client.phone, channel: 'whatsapp' }) : false;
    const options = client && canSend && !blocked ? await deliveryOptions(client) : null;
    return { contexts: NPS_CONTEXTS, sellers, permissions: { canRead: hasPermission(actor, PERMISSIONS.NPS_READ), canWrite, canSend }, contactBlocked: blocked, whatsapp: { configured: WhatsAppAdapter.isConfigured(), available: Boolean(options?.available && canSend && !blocked), mode: options?.mode || null, reason: blocked ? 'El cliente pidió no recibir contactos. Podés registrar una respuesta manual.' : !canSend ? 'Enviar requiere permisos de escritura de NPS y WhatsApp.' : options?.reason || '', code: blocked ? 'CLIENT_DO_NOT_CONTACT' : options?.code || null } };
}

async function performDelivery(survey, actor, consentConfirmed) {
    if (!hasPermission(actor, PERMISSIONS.NPS_WRITE) || !hasPermission(actor, PERMISSIONS.WHATSAPP_WRITE)) throw new NpsError('Enviar requiere permisos de escritura de NPS y WhatsApp.', 'NPS_FORBIDDEN', 403);
    if (survey.delivery?.status === 'sent') return { survey: surveyView(survey), sent: true, replayed: true };
    if (consentConfirmed !== true) throw new NpsError('Confirmá que el cliente autorizó recibir esta encuesta.', 'NPS_CONSENT_REQUIRED');
    const client = await Client.findById(survey.client).select('_id phone doNotContact').lean();
    if (!client) throw new NpsError('Cliente no encontrado.', 'NPS_CLIENT_NOT_FOUND', 404);
    await assertClientContactAllowed({ clientId: client._id, to: client.phone, channel: 'whatsapp' });
    const options = await deliveryOptions(client);
    if (!options.available) throw new NpsError(options.reason, options.code, 503);
    if (survey.status !== 'pending') throw new NpsError('Esta encuesta ya fue respondida o cerrada.', 'NPS_SURVEY_CLOSED', 409);
    if (survey.delivery?.status === 'sending' && Date.parse(survey.delivery.attemptedAt) < Date.now() - 120000) {
        await NpsSurvey.updateOne({ _id: survey._id, 'delivery.status': 'sending' }, { $set: { 'delivery.status': 'uncertain', 'delivery.errorCode': 'NPS_DELIVERY_UNCERTAIN', 'delivery.errorMessage': 'El proceso no confirmó el envío. Revisá WhatsApp y registrá la verificación.' } });
        survey.delivery.status = 'uncertain';
    }
    if (['sending', 'uncertain'].includes(survey.delivery?.status)) throw new NpsError(survey.delivery.status === 'sending' ? 'Esta solicitud ya se está enviando. Actualizá el historial.' : 'El proveedor no confirmó el resultado. Revisá WhatsApp y registrá la verificación antes de reenviar.', survey.delivery.status === 'sending' ? 'NPS_REQUEST_IN_PROGRESS' : 'NPS_DELIVERY_UNCERTAIN', 409, { surveyId: String(survey._id) });
    const locked = await NpsSurvey.findOneAndUpdate({ _id: survey._id, status: 'pending', 'delivery.status': { $in: ['not_sent', 'failed'] } }, { $set: { 'delivery.status': 'sending', 'delivery.attemptedAt': new Date(), consentConfirmedAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000) }, $inc: { 'delivery.attempts': 1 } }, { new: true }).lean();
    if (!locked) throw new NpsError('Esta solicitud ya se está procesando. Actualizá el historial.', 'NPS_REQUEST_IN_PROGRESS', 409);
    let accepted = false, providerStarted = false;
    try {
        await audit(actor, 'NPS_SEND_ATTEMPTED', locked, { context: locked.context, consentConfirmed: true, mode: options.mode });
        await assertClientContactAllowed({ clientId: client._id, to: options.phone, channel: 'whatsapp' });
        const url = surveyLink(locked);
        let result;
        providerStarted = true;
        if (options.mode === 'template') {
            const components = JSON.parse(JSON.stringify(options.template.components).replaceAll('{{surveyUrl}}', url).replaceAll('{{surveyToken}}', locked.token));
            result = await WhatsAppAdapter.sendTemplateMessage(options.phone, options.template.name, options.template.language, components, { clientId: client._id });
        } else result = await WhatsAppAdapter.sendMessage(options.phone, `Hola. Queremos conocer tu experiencia con AutoSporting. Podés responder esta encuesta de 0 a 10: ${url}`, { clientId: client._id });
        const messageId = result?.messages?.[0]?.id;
        if (!messageId) throw Object.assign(new Error('El proveedor no devolvió confirmación de envío.'), { deliveryUncertain: true });
        accepted = true;
        const saved = await NpsSurvey.findByIdAndUpdate(locked._id, { $set: { 'delivery.status': 'sent', 'delivery.sentAt': new Date(), 'delivery.providerMessageId': messageId, 'delivery.errorCode': null, 'delivery.errorMessage': null } }, { new: true }).lean();
        let warning = '';
        try {
            await CommunicationLog.create({ entityType: 'client', entityId: client._id, clientId: client._id, createdBy: actorId(actor), channel: 'whatsapp', direction: 'outbound', title: 'Encuesta NPS enviada', notes: `Invitación NPS · ${locked.context}`, outcome: 'review_requested', sourceModule: 'clientes', externalId: messageId, deliveryStatus: 'sent' });
            await audit(actor, 'NPS_SENT', saved, { context: locked.context, providerMessageId: messageId });
        } catch { warning = 'El proveedor confirmó el envío. El registro complementario necesita revisión; no reenvíes la encuesta.'; }
        return { survey: surveyView(saved), sent: true, replayed: false, warning };
    } catch (error) {
        const uncertain = accepted || providerStarted && error.deliveryUncertain !== false;
        const status = uncertain ? 'uncertain' : 'failed';
        const code = error.code === 'CLIENT_DO_NOT_CONTACT' ? error.code : uncertain ? 'NPS_DELIVERY_UNCERTAIN' : 'NPS_PROVIDER_REJECTED';
        const message = code === 'CLIENT_DO_NOT_CONTACT' ? error.message : uncertain ? 'El proveedor no confirmó el resultado. Revisá WhatsApp antes de volver a enviar.' : 'WhatsApp rechazó el envío. Revisá la integración y reintentá la misma solicitud.';
        await NpsSurvey.updateOne({ _id: locked._id }, { $set: { 'delivery.status': status, 'delivery.errorCode': code, 'delivery.errorMessage': message } });
        await audit(actor, 'NPS_SEND_FAILED', locked, { code, uncertain }).catch(() => {});
        throw new NpsError(message, code, code === 'CLIENT_DO_NOT_CONTACT' ? 409 : 502, { surveyId: String(locked._id) });
    }
}
export async function sendNps(payload, actor) {
    const values = await normalize(payload, actor, 'whatsapp');
    const key = keyFor(payload.idempotencyKey, true), input = initialSurvey(values, actor, key);
    const existing = await NpsSurvey.findById(input._id).lean();
    if (existing) { sameRequest(existing, input); return performDelivery(existing, actor, payload.consentConfirmed); }
    if (payload.consentConfirmed !== true) throw new NpsError('Confirmá que el cliente autorizó recibir esta encuesta.', 'NPS_CONSENT_REQUIRED');
    await assertClientContactAllowed({ clientId: values.client._id, to: values.client.phone, channel: 'whatsapp' });
    const options = await deliveryOptions(values.client); if (!options.available) throw new NpsError(options.reason, options.code, 503);
    if (await NpsSurvey.exists({ client: values.client._id, 'delivery.status': { $in: ['sending', 'uncertain'] } })) throw new NpsError('Hay un envío pendiente de verificación para este cliente. Revisalo antes de crear otra invitación.', 'NPS_DELIVERY_REVIEW_REQUIRED', 409);
    let survey;
    try { survey = await NpsSurvey.findOneAndUpdate({ _id: input._id }, { $setOnInsert: input }, { upsert: true, new: true, runValidators: true }).lean(); }
    catch (error) { if (error.code !== 11000) throw error; survey = await NpsSurvey.findById(input._id).lean(); }
    sameRequest(survey, input); return performDelivery(survey, actor, payload.consentConfirmed);
}
export async function retryNps(surveyId, payload, actor) {
    const survey = await NpsSurvey.findById(id(surveyId, 'encuesta')).lean();
    if (!survey || survey.channel !== 'whatsapp') throw new NpsError('Encuesta no encontrada.', 'NPS_NOT_FOUND', 404);
    return performDelivery(survey, actor, payload.consentConfirmed);
}
export async function verifyNpsDelivery(surveyId, payload, actor) {
    if (!hasPermission(actor, PERMISSIONS.NPS_WRITE) || !hasPermission(actor, PERMISSIONS.WHATSAPP_WRITE)) throw new NpsError('No tenés permiso para verificar este envío.', 'NPS_FORBIDDEN', 403);
    if (!['sent', 'not_sent'].includes(payload.result) || typeof payload.note !== 'string' || payload.note.trim().length < 5 || payload.note.length > 1000) throw new NpsError('Indicá qué verificaste en WhatsApp y una nota de al menos 5 caracteres.');
    return mongoose.connection.transaction(async session => {
        const current = await NpsSurvey.findById(id(surveyId, 'encuesta')).session(session).lean();
        if (!current) throw new NpsError('Encuesta no encontrada.', 'NPS_NOT_FOUND', 404);
        const expectedStatus = payload.result === 'sent' ? 'sent' : 'failed';
        if (current.delivery?.status !== 'uncertain') {
            if (current.delivery?.status === expectedStatus && current.delivery.verificationNote === payload.note.trim() && String(current.delivery.verifiedBy) === actorId(actor)) return { survey: surveyView(current), verified: true, replayed: true };
            throw new NpsError('Esta solicitud ya no requiere verificación. Actualizá el historial.', 'NPS_VERIFICATION_CONFLICT', 409);
        }
        const saved = await NpsSurvey.findOneAndUpdate({ _id: current._id, 'delivery.status': 'uncertain' }, { $set: { 'delivery.status': expectedStatus, 'delivery.verificationNote': payload.note.trim(), 'delivery.verifiedBy': actorId(actor), 'delivery.verifiedAt': new Date(), 'delivery.errorCode': null, 'delivery.errorMessage': null } }, { new: true, session }).lean();
        if (!saved) throw new NpsError('La solicitud cambió. Actualizá el historial.', 'NPS_VERIFICATION_CONFLICT', 409);
        await audit(actor, 'NPS_DELIVERY_VERIFIED', saved, { result: payload.result, note: payload.note.trim() }, session);
        return { survey: surveyView(saved), verified: true, replayed: false };
    });
}

function dashboardSurveyQuery(filters, actor) {
    const query = {};
    if (filters.clientId) query.client = id(filters.clientId, 'cliente');
    if (filters.sellerId) query.seller = id(filters.sellerId, 'vendedor');
    if (filters.context) { if (!NPS_CONTEXTS.some(item => item.value === filters.context)) throw new NpsError('Elegí un contexto válido.'); query.context = filters.context; }
    return query;
}
const populatedSurvey = canReadSales => ({ path: 'survey', select: canReadSales ? '_id client seller sale context channel createdAt' : '_id client seller context channel createdAt', populate: [{ path: 'client', select: '_id firstName lastName fullName' }, { path: 'seller', select: '_id name' }, ...(canReadSales ? [{ path: 'sale', select: '_id status' }] : [])] });
const dashboardResponse = (response, canReadSales) => ({ ...responseView(response), survey: response.survey ? { _id: response.survey._id, context: response.survey.context || null, channel: response.survey.channel || 'legacy', client: response.survey.client ? { _id: response.survey.client._id, firstName: response.survey.client.firstName, lastName: response.survey.client.lastName, fullName: response.survey.client.fullName } : null, seller: response.survey.seller ? { _id: response.survey.seller._id, name: response.survey.seller.name } : null, ...(canReadSales ? { sale: response.survey.sale ? { _id: response.survey.sale._id, status: response.survey.sale.status } : null } : {}) } : null });
export async function npsDashboard(filters, actor) {
    const surveyQuery = dashboardSurveyQuery(filters, actor);
    const filter = {};
    if (Object.keys(surveyQuery).length) filter.survey = { $in: (await NpsSurvey.find(surveyQuery).select('_id').lean()).map(survey => survey._id) };
    try { const range = npsPeriodRange(filters.period || 'Este mes'); if (Object.keys(range).length) filter.createdAt = range; } catch (error) { throw new NpsError(error.message); }
    const canReadSales = hasPermission(actor, PERMISSIONS.VENTAS_READ);
    const [groups, recent, required, actionRequiredTotal] = await Promise.all([
        NpsResponse.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: 1 }, averageScore: { $avg: '$score' }, promoters: { $sum: { $cond: [{ $eq: ['$classification', 'promoter'] }, 1, 0] } }, passives: { $sum: { $cond: [{ $eq: ['$classification', 'passive'] }, 1, 0] } }, detractors: { $sum: { $cond: [{ $eq: ['$classification', 'detractor'] }, 1, 0] } } } }]),
        NpsResponse.find(filter).select('_id survey score classification comment followUpStatus followUpNotes responsible createdAt').populate(populatedSurvey(canReadSales)).sort({ createdAt: -1 }).limit(20).lean(),
        NpsResponse.find({ ...filter, classification: 'detractor', followUpStatus: { $in: ['pending', 'in_progress'] } }).select('_id survey score classification comment followUpStatus followUpNotes responsible createdAt').populate(populatedSurvey(canReadSales)).sort({ createdAt: -1 }).limit(100).lean(),
        NpsResponse.countDocuments({ ...filter, classification: 'detractor', followUpStatus: { $in: ['pending', 'in_progress'] } })
    ]);
    const group = groups[0] || { total: 0, promoters: 0, passives: 0, detractors: 0, averageScore: null };
    return { metrics: { total: group.total, promoters: group.promoters, passives: group.passives, detractors: group.detractors, averageScore: group.averageScore == null ? null : Number(group.averageScore.toFixed(1)), npsScore: group.total ? Math.round((group.promoters - group.detractors) / group.total * 100) : null }, recentResponses: recent.map(row => dashboardResponse(row, canReadSales)), actionRequired: required.map(row => dashboardResponse(row, canReadSales)), actionRequiredTotal };
}
export async function clientNpsHistory(clientId, actor) {
    id(clientId, 'cliente');
    const client = await Client.findById(clientId).select('_id phone').lean(); if (!client) throw new NpsError('Cliente no encontrado.', 'NPS_CLIENT_NOT_FOUND', 404);
    const surveys = await NpsSurvey.find({ client: clientId }).select('_id status context channel createdAt expiresAt seller delivery').populate('seller', '_id name').sort({ createdAt: -1 }).limit(100).lean();
    const responses = await NpsResponse.find({ survey: { $in: surveys.map(survey => survey._id) } }).select('_id survey score classification comment createdAt followUpStatus followUpNotes responsible').lean();
    return { surveys: surveys.map(survey => ({ ...surveyView(survey), response: responseView(responses.find(response => String(response.survey) === String(survey._id))) })), total: await NpsSurvey.countDocuments({ client: clientId }), metrics: (await npsDashboard({ clientId, period: 'Histórico' }, actor)).metrics, contactBlocked: await isClientContactBlocked({ clientId, to: client.phone, channel: 'whatsapp' }) };
}
export async function readPublicNps(token) {
    const survey = await NpsSurvey.findOne({ token }).select('_id status expiresAt').lean();
    if (!survey) throw new NpsError('Encuesta no encontrada.', 'NPS_NOT_FOUND', 404);
    if (survey.status === 'completed') throw new NpsError('La encuesta ya fue completada.', 'ALREADY_COMPLETED');
    if (survey.status === 'expired' || Date.now() > Date.parse(survey.expiresAt)) throw new NpsError('La encuesta ha expirado.', 'EXPIRED');
    return { valid: true, expiresAt: survey.expiresAt };
}
export async function submitPublicNps(token, payload) {
    let score; try { score = npsScore(payload.score); } catch (error) { throw new NpsError(error.message); }
    const comment = commentFor(payload.comment);
    await readPublicNps(token);
    return mongoose.connection.transaction(async session => {
        const survey = await NpsSurvey.findOneAndUpdate({ token, status: 'pending', expiresAt: { $gt: new Date() } }, { $set: { status: 'completed' } }, { new: true, session }).select('_id');
        if (!survey) throw new NpsError('La encuesta ya fue completada o expiró.', 'ALREADY_COMPLETED');
        const response = new NpsResponse({ survey: survey._id, score, comment, followUpStatus: score <= 6 ? 'pending' : 'resolved' }); await response.save({ session });
        return { message: 'Gracias por tu respuesta' };
    });
}
