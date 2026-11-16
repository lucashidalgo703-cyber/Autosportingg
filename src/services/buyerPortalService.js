import crypto from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Sale from '../models/Sale.js';
import Car from '../models/Car.js';
import Client from '../models/Client.js';
import Gestoria from '../models/Gestoria.js';
import { BuyerPortal, BuyerPortalChallenge, BuyerPortalDocument, BuyerPortalOriginal, BuyerPortalRate } from '../models/BuyerPortal.js';
import { BUYER_REQUIREMENTS } from '../utils/buyerPortalRequirements.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { isMySaleOrReservation } from '../utils/saleOwnership.js';
import { EmailAdapter } from '../lib/emailAdapter.js';
import { gptRequestQuota } from './gptExpenseOAuthService.js';
import LoginSession from '../models/LoginSession.js';
import AdminUser from '../models/AdminUser.js';
import { credentialFingerprint } from './emailLoginService.js';

export const portalError = (message, status = 400) => Object.assign(new Error(message), { status });
const fail = (message, status) => { throw portalError(message, status); };
const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const idOf = value => String(value?._id || value || '');
const clean = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const key = () => {
    const secret = process.env.BUYER_PORTAL_DOCUMENT_KEY;
    if (!secret || secret.length < 32) fail('El almacenamiento privado del portal aún no está configurado.', 503);
    return crypto.createHash('sha256').update(secret).digest();
};
function encrypt(buffer, context) {
    const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
    cipher.setAAD(Buffer.from(context));
    const data = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}
function decrypt(value, context) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(value.iv, 'base64'));
    decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(value.data, 'base64')), decipher.final()]);
}
function signingKey() {
    // Separate portal signatures from CRM sessions, with a distinct derived key
    // for signing rather than reusing the document encryption key directly.
    return crypto.createHmac('sha256', key()).update('autosporting:buyer-portal-signing:v1').digest('hex');
}
const contactHash = email => hash(String(email).trim().toLowerCase());
async function buyerContact(sale) {
    const client = sale.clientId ? await Client.findById(sale.clientId).select('email status').lean() : null;
    const email = client?.status !== 'bloqueado' ? clean(client?.email, 254).toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Completá el correo registrado del comprador en Clientes para habilitar el portal.', 409);
    return email;
}
const maskEmail = email => email.replace(/^(.).+(@.+)$/, '$1***$2');
export async function adminSale(user, saleId, write = false) {
    if (!validId(saleId)) fail('No encontré la venta.', 404);
    if (!hasPermission(user, write ? PERMISSIONS.VENTAS_WRITE : PERMISSIONS.VENTAS_READ)) fail('No tenés permiso para esta venta.', 403);
    const sale = await Sale.findById(saleId).lean();
    if (!sale || (user.role === 'ventas' && !isMySaleOrReservation(sale, user))) fail('No encontré la venta.', 404);
    return sale;
}
async function livePortal(token) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) fail('El enlace no está disponible o venció.', 404);
    const portal = await BuyerPortal.findOne({ tokenHash: hash(token), enabled: true, expiresAt: { $gt: new Date() } }).lean();
    if (!portal) fail('El enlace no está disponible o venció.', 404);
    const sale = await Sale.findById(portal._id).lean();
    if (!sale || sale.status === 'cancelada') fail('El enlace no está disponible.', 404);
    return { portal, sale };
}
const linkContext = id => 'buyer-link:' + id;
const fileContext = id => 'buyer-document:' + id;
async function storageReady() {
    key(); signingKey();
    const indexes = await BuyerPortalDocument.collection.indexes().catch(e => { if (e.code === 26) return []; throw e; });
    if (!indexes.some(index => index.unique && !index.partialFilterExpression && index.key.saleId === 1 && index.key.requestId === 1 && Object.keys(index.key).length === 2)
        || !indexes.some(index => index.unique && index.partialFilterExpression?.isCurrent === true && index.key.slot === 1)) {
        fail('Falta preparar los índices privados del portal en este entorno.', 503);
    }
}
export async function configurePortal(user, saleId, input = {}) {
    const sale = await adminSale(user, saleId, true);
    await storageReady(); await buyerContact(sale);
    const mode = input.mode || (sale.tradeIns?.length ? 'with_trade_in' : 'without_trade_in');
    if (!['with_trade_in', 'without_trade_in'].includes(mode) || mode === 'with_trade_in' && !sale.tradeIns?.length) fail('La modalidad no corresponde a esta venta.');
    const days = input.days === undefined ? 30 : input.days;
    if (!Number.isInteger(days) || days < 1 || days > 90) fail('El enlace debe vencer entre 1 y 90 días.');
    let existing = await BuyerPortal.findById(saleId).lean();
    const token = existing?.enabled && existing.expiresAt > new Date()
        ? decrypt(existing.encryptedToken, linkContext(saleId)).toString() : crypto.randomBytes(32).toString('base64url');
    const generation = (existing?.generation || 0) + 1;
    // Any settings change revokes earlier sessions and signed file links.
    try {
        const updated = await BuyerPortal.updateOne({ _id: saleId, ...(existing ? { generation: existing.generation } : { generation: { $exists: false } }) }, {
            $set: { tokenHash: hash(token), encryptedToken: encrypt(Buffer.from(token), linkContext(saleId)), mode, enabled: true,
                expiresAt: new Date(Date.now() + days * 86400000), generation, revokedAt: null, createdBy: user.username || user.name || user.id }
        }, { upsert: !existing });
        if (existing && updated.matchedCount !== 1) fail('El portal cambió. Actualizá la venta.', 409);
    } catch (error) { if (error.code === 11000) fail('El portal cambió. Actualizá la venta.', 409); throw error; }
    return portalConfiguration(user, saleId);
}
export async function revokePortal(user, saleId) {
    await adminSale(user, saleId, true);
    await BuyerPortal.updateOne({ _id: saleId }, { $set: { enabled: false, revokedAt: new Date() }, $inc: { generation: 1 } });
    return { revoked: true };
}
export async function portalConfiguration(user, saleId) {
    const sale = await adminSale(user, saleId);
    const portal = await BuyerPortal.findById(saleId).lean();
    let email = '', canVerify = false;
    try { email = await buyerContact(sale); canVerify = true; } catch (error) { if (error.status !== 409) throw error; }
    const enabled = Boolean(portal?.enabled && portal.expiresAt > new Date());
    const token = enabled ? decrypt(portal.encryptedToken, linkContext(saleId)).toString() : null;
    return { enabled, mode: portal?.mode || (sale.tradeIns?.length ? 'with_trade_in' : 'without_trade_in'),
        expiresAt: portal?.expiresAt, url: token ? '/portal/' + token : null,
        canVerify, verificationChannel: 'email', maskedDestination: email ? maskEmail(email) : null,
        preview: await portalData(sale, { mode: portal?.mode || (sale.tradeIns?.length ? 'with_trade_in' : 'without_trade_in') }) };
}
export async function updatePortalTracking(user, saleId, input) {
    await adminSale(user, saleId, true);
    if (typeof input.actionRequired !== 'boolean' || typeof input.latestUpdate !== 'string' || typeof input.nextStep !== 'string'
        || input.latestUpdate.length > 1000 || input.nextStep.length > 1000) fail('Revisá la novedad y el próximo paso visibles para el comprador.');
    await Sale.updateOne({ _id: saleId }, { $set: { clientPortalUpdate: { latestUpdate: clean(input.latestUpdate, 1000),
        nextStep: clean(input.nextStep, 1000), actionRequired: input.actionRequired, updatedAt: new Date(), updatedBy: user.id } } });
    return portalConfiguration(user, saleId);
}
export async function portalInfo(token) {
    const { sale } = await livePortal(token), email = await buyerContact(sale);
    return { requiresVerification: true, maskedDestination: maskEmail(email), verificationChannel: 'email' };
}
export async function sendBuyerChallenge(token, ip) {
    const { portal, sale } = await livePortal(token), email = await buyerContact(sale);
    await gptRequestQuota('buyer-code-ip:' + hash(ip || ''), 10);
    await gptRequestQuota('buyer-code:' + contactHash(email), 2);
    const day = Math.floor(Date.now() / 86400000), bucketId = hash(`buyer-code:${email}:${day}`);
    let bucket;
    try {
        bucket = await BuyerPortalRate.findOneAndUpdate({ _id: bucketId }, { $inc: { count: 1 },
            $setOnInsert: { expiresAt: new Date((day + 2) * 86400000) } }, { upsert: true, returnDocument: 'after' }).lean();
    } catch (error) {
        if (error.code !== 11000) throw error;
        bucket = await BuyerPortalRate.findOneAndUpdate({ _id: bucketId }, { $inc: { count: 1 } }, { returnDocument: 'after' }).lean();
    }
    if (bucket.count > 10) fail('Alcanzaste el límite de códigos de hoy. Contactá a AutoSporting.', 429);
    const now = new Date();
    const reserved = await BuyerPortal.updateOne({ _id: portal._id, enabled: true, generation: portal.generation, nextChallengeAt: { $lte: now } },
        { $set: { nextChallengeAt: new Date(Date.now() + 60000) } });
    if (!reserved.modifiedCount) fail('Esperá 60 segundos antes de pedir otro código.', 429);
    const _id = new mongoose.Types.ObjectId(), code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const codeHash = crypto.createHmac('sha256', signingKey()).update(`${_id}:${portal._id}:${portal.generation}:${email}:${code}`).digest('hex');
    await BuyerPortalChallenge.updateMany({ portalId: portal._id, consumedAt: null }, { $set: { consumedAt: now } });
    const challenge = await BuyerPortalChallenge.create({ _id, portalId: portal._id, generation: portal.generation,
        contactHash: contactHash(email), codeHash, expiresAt: new Date(Date.now() + 300000) });
    try {
        const info = await EmailAdapter.sendEmail(email, 'AutoSporting | Código para tu portal de compra',
            `<p>Usá este código para acceder a tu operación y documentación en AutoSporting:</p><p style="font-size:36px;font-weight:bold;letter-spacing:8px">${code}</p><p>Vence en 5 minutos. Si no lo solicitaste, ignorá este correo.</p>`, [], {}, { text: `Tu código de acceso al portal de AutoSporting es ${code}. Vence en 5 minutos.` });
        if (info?.rejected?.length || !info?.accepted?.length) throw new Error('Delivery not accepted');
    } catch {
        await BuyerPortalChallenge.updateOne({ _id }, { $set: { consumedAt: new Date() } });
        await BuyerPortal.updateOne({ _id: portal._id, generation: portal.generation }, { $set: { nextChallengeAt: new Date() } });
        fail('No pudimos enviar el correo. Reintentá sin cambiar la dirección registrada.', 503);
    }
    return { challengeId: String(_id), expiresAt: challenge.expiresAt, resendAfter: 60 };
}
export async function verifyBuyerChallenge(token, input, ip) {
    const { portal, sale } = await livePortal(token), email = await buyerContact(sale);
    await gptRequestQuota('buyer-verify:' + hash(ip || '') + ':' + portal._id, 30);
    if (!validId(input.challengeId) || !/^\d{6}$/.test(input.code || '')) fail('El código no es válido.', 401);
    const challenge = await BuyerPortalChallenge.findOneAndUpdate({ _id: input.challengeId, portalId: portal._id,
        generation: portal.generation, contactHash: contactHash(email), consumedAt: null, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } },
    { $inc: { attempts: 1 } }, { returnDocument: 'after' }).lean();
    const actual = crypto.createHmac('sha256', signingKey()).update(`${input.challengeId}:${portal._id}:${portal.generation}:${email}:${input.code}`).digest('hex');
    if (!challenge || !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(challenge.codeHash))) fail('Código incorrecto, vencido o ya usado. Pedí uno nuevo si agotaste los 5 intentos.', 401);
    const consumed = await BuyerPortalChallenge.updateOne({ _id: challenge._id, consumedAt: null }, { $set: { consumedAt: new Date() } });
    if (!consumed.modifiedCount) fail('Este código ya fue utilizado.', 401);
    const expiresAt = new Date(Math.min(Date.now() + 30 * 60000, portal.expiresAt.getTime()));
    const sessionToken = jwt.sign({ purpose: 'buyer-portal', portalId: String(portal._id), generation: portal.generation,
        contactHash: contactHash(email), exp: Math.floor(expiresAt.getTime() / 1000) }, signingKey(), { algorithm: 'HS256', audience: 'autosporting-buyer' });
    return { sessionToken, expiresAt };
}
export async function buyerSession(token, sessionToken) {
    const context = await livePortal(token);
    let session;
    try { session = jwt.verify(sessionToken || '', signingKey(), { algorithms: ['HS256'], audience: 'autosporting-buyer' }); }
    catch { fail('Verificá tu correo para continuar.', 401); }
    const email = await buyerContact(context.sale);
    if (session.purpose !== 'buyer-portal' || session.portalId !== String(context.portal._id) || session.generation !== context.portal.generation
        || session.contactHash !== contactHash(email)) fail('La verificación venció o fue revocada. Verificá tu correo de nuevo.', 401);
    return { ...context, session };
}
const requirement = key => BUYER_REQUIREMENTS.find(item => item.key === key);
function tradeInFor(sale, tradeInId) {
    const tradeIn = sale.tradeIns?.find(item => idOf(item._id) === tradeInId);
    if (!tradeIn) fail('No encontré esa unidad en esta operación.', 404);
    return tradeIn;
}
const entryDto = doc => ({ id: String(doc._id), description: doc.description, side: doc.side, slot: doc.slot,
    requirementKey: doc.requirementKey, mimeType: doc.mimeType, fileName: doc.fileName, byteLength: doc.byteLength,
    createdAt: doc.createdAt, origin: doc.origin, status: doc.status, correctionReason: doc.correctionReason || '',
    version: doc.version, isCurrent: doc.isCurrent, issuedAt: doc.issuedAt, replacesId: doc.replacesId,
    history: doc.history?.map(item => ({ status: item.status, reason: item.reason, at: item.at })) || [] });
function groupsFor(docs, originals, tradeInId) {
    return BUYER_REQUIREMENTS.map(item => {
        const entries = docs.filter(doc => idOf(doc.tradeInId) === tradeInId && doc.requirementKey === item.key).map(entryDto);
        const current = entries.filter(entry => entry.isCurrent);
        let complete = current.length > 0 && current.every(entry => entry.status !== 'correction_requested');
        if (item.requiresIssuedAt && current.some(entry => !entry.issuedAt)) complete = false;
        if (item.key === 'registration_cards') {
            const slots = [...new Set(current.filter(entry => !(entry.mimeType === 'application/pdf' && entry.side === 'other')).map(entry => entry.slot.replace(/-(front|back)$/, '')))];
            complete = complete && slots.every(slot => current.some(entry => entry.slot === slot + '-front') && current.some(entry => entry.slot === slot + '-back'));
        }
        return { ...item, complete, entries, originalReceived: Boolean(originals.find(original => idOf(original.tradeInId) === tradeInId && original.requirementKey === item.key)?.received) };
    });
}

export async function adminDocuments(user, query) {
    let saleId = query.saleId, tradeInId = query.tradeInId;
    if (query.carId) {
        if (!validId(query.carId) || !hasPermission(user, PERMISSIONS.STOCK_READ)) fail('No tenés acceso a esta unidad.', 403);
        const sale = await Sale.findOne({ 'tradeIns.linkedStockCarId': query.carId }).lean();
        if (!sale) return { groups: [], requirements: BUYER_REQUIREMENTS, vehicles: [] };
        saleId = String(sale._id);
        tradeInId = String(sale.tradeIns.find(item => idOf(item.linkedStockCarId) === query.carId)._id);
    }
    const sale = await adminSale(user, saleId);
    const selected = tradeInId ? tradeInFor(sale, tradeInId) : sale.tradeIns?.[0];
    if (!selected) return { saleId, groups: [], requirements: BUYER_REQUIREMENTS, vehicles: [] };
    const data = await portalData(sale, { mode: 'with_trade_in' });
    const vehicles = data.tradeIns.map(item => ({ ...item, groups: undefined, saleId, tradeInId: item.id }));
    const vehicle = data.tradeIns.find(item => item.id === String(selected._id));
    return { saleId, tradeInId: String(selected._id), carId: vehicle.carId, vehicle, vehicles, groups: vehicle.groups, requirements: BUYER_REQUIREMENTS };
}
export async function reviewBuyerDocument(user, id, input) {
    if (!validId(id)) fail('No encontré el archivo.', 404);
    const doc = await BuyerPortalDocument.findById(id).lean();
    if (!doc) fail('No encontré el archivo.', 404);
    await adminSale(user, String(doc.saleId), true);
    if (!hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE) && !hasPermission(user, PERMISSIONS.STOCK_WRITE)) fail('No tenés permiso para revisar documentación.', 403);
    if (!['received', 'reviewed', 'correction_requested'].includes(input.status)) fail('Estado de revisión inválido.');
    const reason = clean(input.reason, 1000);
    if (input.status === 'correction_requested' && !reason) fail('Explicá qué debe corregirse en esta imagen.');
    const updated = await BuyerPortalDocument.findOneAndUpdate({ _id: id, isCurrent: true }, { $set: { status: input.status, correctionReason: reason },
        $push: { history: { status: input.status, reason, at: new Date(), by: user.id } } }, { returnDocument: 'after' }).lean();
    if (!updated) fail('Esta imagen fue reemplazada. Revisá la versión vigente.', 409);
    return entryDto(updated);
}
export async function markOriginal(user, input) {
    const sale = await adminSale(user, input.saleId, true);
    if (!hasPermission(user, PERMISSIONS.DOCUMENTACION_WRITE) && !hasPermission(user, PERMISSIONS.STOCK_WRITE)) fail('No tenés permiso para recibir originales.', 403);
    tradeInFor(sale, input.tradeInId);
    if (!requirement(input.requirementKey) || typeof input.received !== 'boolean') fail('Revisá el requisito y el estado del original.');
    const now = new Date();
    await BuyerPortalOriginal.updateOne({ saleId: sale._id, tradeInId: input.tradeInId, requirementKey: input.requirementKey },
        { $set: { received: input.received, receivedAt: input.received ? now : null, receivedBy: user.id },
            $push: { history: { received: input.received, at: now, by: user.id } } }, { upsert: true });
    return { received: input.received };
}
function fileType(buffer) {
    if (buffer.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
    if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
    if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
    if (buffer.subarray(4, 8).toString() === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|heif)$/.test(buffer.subarray(8, 12).toString())) return 'image/heic';
    fail('Subí una foto JPEG, PNG, WebP o HEIC, o un PDF completo.');
}
export async function uploadBuyerDocument(context, input, file) {
    if (context.portal.mode !== 'with_trade_in') fail('Este enlace permite únicamente seguimiento.', 403);
    const { sale } = context;
    tradeInFor(sale, input.tradeInId);
    const req = requirement(input.requirementKey);
    if (!req || !/^[a-zA-Z0-9_-]{8,128}$/.test(input.requestId || '') || !/^[a-zA-Z0-9_-]{1,80}$/.test(input.slot || '')
        || !['front', 'back', 'page', 'other'].includes(input.side) || !clean(input.description, 180)) fail('Completá el requisito y la descripción de esta foto o PDF.');
    if (!file?.buffer?.length || file.buffer.length > 3 * 1024 * 1024) fail('Cada archivo admite hasta 3 MB.', 413);
    const mimeType = fileType(file.buffer);
    if (req.key === 'registration_cards' && mimeType !== 'application/pdf' && !['front', 'back'].includes(input.side)) fail('Identificá frente o dorso de la cédula.');
    if (req.key === 'registration_cards' && ['front', 'back'].includes(input.side) && !input.slot.endsWith('-' + input.side)) fail('Identificá cada cédula y su lado en la misma posición.');
    let issuedAt;
    if (input.issuedAt) {
        const value = String(input.issuedAt);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T15:00:00Z'))
            || new Date(value + 'T15:00:00Z').toISOString().slice(0, 10) !== value || value > new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())) fail('Ingresá una fecha de emisión válida, hasta hoy.');
        issuedAt = new Date(value + 'T15:00:00Z');
    }
    if (req.requiresIssuedAt && !issuedAt) fail('Indicá la fecha de emisión de este documento.');
    await storageReady();
    const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const previousRequest = await BuyerPortalDocument.findOne({ saleId: sale._id, requestId: input.requestId }).lean();
    if (previousRequest) {
        if (previousRequest.fileHash !== fileHash || idOf(previousRequest.tradeInId) !== input.tradeInId || previousRequest.slot !== input.slot || previousRequest.requirementKey !== input.requirementKey) fail('Este intento corresponde a otra carga. Actualizá la pantalla.', 409);
        return { entry: entryDto(previousRequest), duplicate: true };
    }
    const id = new mongoose.Types.ObjectId(), session = await mongoose.startSession();
    let saved;
    try {
        await session.withTransaction(async () => {
            // Re-read the live portal inside the write transaction: a concurrent
            // revocation conflicts with this lock and cannot commit a later upload.
            const locked = await BuyerPortal.updateOne({ _id: context.portal._id, generation: context.portal.generation, enabled: true,
                mode: 'with_trade_in', expiresAt: { $gt: new Date() } }, { $inc: { uploadSequence: 1 } }, { session });
            if (!locked.matchedCount) fail('El acceso fue revocado. Volvé a verificar el enlace.', 401);
            const currentSale = await Sale.findById(sale._id).session(session).lean();
            if (!currentSale || currentSale.status === 'cancelada' || idOf(currentSale.clientId) !== idOf(sale.clientId)) fail('La operación cambió. Volvé a verificar el enlace.', 401);
            tradeInFor(currentSale, input.tradeInId);
            const currentClient = currentSale.clientId ? await Client.findById(currentSale.clientId).select('email status').session(session).lean() : null;
            if (!currentClient || currentClient.status === 'bloqueado' || contactHash(currentClient.email || '') !== context.session.contactHash) fail('El contacto del comprador cambió. Verificá el correo de nuevo.', 401);
            // Guaranteed writes serialize uploads against buyer/vehicle edits,
            // cancellation and a changed registered verification channel.
            const saleLock = await Sale.updateOne({ _id: currentSale._id, clientId: currentClient._id,
                'tradeIns._id': input.tradeInId, status: { $ne: 'cancelada' } }, { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
            const clientLock = await Client.updateOne({ _id: currentClient._id, email: currentClient.email, status: { $ne: 'bloqueado' } },
                { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
            if (!saleLock.matchedCount || !clientLock.matchedCount) fail('Los datos de la operación cambiaron. Volvé a verificar el enlace.', 401);
            let old;
            if (input.replacesId) {
                if (!validId(input.replacesId)) fail('La imagen a corregir no es válida.');
                old = await BuyerPortalDocument.findOne({ _id: input.replacesId, saleId: sale._id, tradeInId: input.tradeInId,
                    requirementKey: input.requirementKey, slot: input.slot, isCurrent: true }).session(session);
                if (!old) fail('La versión vigente cambió. Actualizá la documentación.', 409);
                old.isCurrent = false; await old.save({ session });
            }
            const [doc] = await BuyerPortalDocument.create([{ _id: id, saleId: sale._id, tradeInId: input.tradeInId,
                requirementKey: input.requirementKey, slot: input.slot, description: clean(input.description, 180), side: input.side, issuedAt,
                fileName: clean(file.originalname?.replace(/[\r\n/\\"<>]/g, '_'), 180) || 'documento', mimeType,
                byteLength: file.buffer.length, fileHash, encryptedFile: encrypt(file.buffer, fileContext(id)), requestId: input.requestId,
                version: old ? old.version + 1 : 1, replacesId: old?._id, history: [{ status: 'received', at: new Date(), by: 'buyer' }] }], { session });
            saved = doc;
        });
    } catch (error) {
        if (error.code === 11000) {
            const prior = await BuyerPortalDocument.findOne({ saleId: sale._id, requestId: input.requestId }).lean();
            if (prior && prior.fileHash === fileHash && prior.slot === input.slot && idOf(prior.tradeInId) === input.tradeInId && prior.requirementKey === input.requirementKey) return { entry: entryDto(prior), duplicate: true };
            fail('Esta posición ya tiene una imagen. Elegí corregir esa imagen o agregá otra página.', 409);
        }
        throw error;
    } finally { await session.endSession(); }
    return { entry: entryDto(saved.toObject()), duplicate: false };
}
export async function documentAccess(id, context, adminUser) {
    if (!validId(id)) fail('No encontré el archivo.', 404);
    const doc = await BuyerPortalDocument.findById(id).lean();
    if (!doc) fail('No encontré el archivo.', 404);
    let claims;
    if (adminUser) {
        await adminSale(adminUser, String(doc.saleId));
        if (!adminUser.sid) fail('Iniciá sesión nuevamente.', 401);
        claims = { actor: 'admin', userId: adminUser.id, sessionId: hash(adminUser.sid) };
    } else {
        if (context.portal.mode !== 'with_trade_in' || idOf(doc.saleId) !== idOf(context.sale._id)) fail('No encontré el archivo.', 404);
        tradeInFor(context.sale, idOf(doc.tradeInId));
        claims = { actor: 'buyer', portalId: String(context.portal._id), generation: context.portal.generation,
            contactHash: context.session.contactHash, sessionExp: context.session.exp };
    }
    const exp = Math.min(Math.floor(Date.now() / 1000) + 120, claims.sessionExp || Infinity);
    const access = jwt.sign({ ...claims, purpose: 'buyer-document', docId: id, exp }, signingKey(), { algorithm: 'HS256', audience: 'autosporting-document' });
    return { url: `/api/buyer-portal/files/${id}?access=${access}`, expiresAt: new Date(exp * 1000) };
}
export async function readPrivateDocument(id, access) {
    let claims;
    try { claims = jwt.verify(access || '', signingKey(), { algorithms: ['HS256'], audience: 'autosporting-document' }); }
    catch { fail('El acceso al archivo venció. Volvé a abrirlo desde el portal.', 401); }
    if (claims.purpose !== 'buyer-document' || claims.docId !== id || !validId(id)) fail('Archivo no disponible.', 404);
    const doc = await BuyerPortalDocument.findById(id).select('+encryptedFile').lean();
    if (!doc) fail('Archivo no disponible.', 404);
    if (claims.actor === 'buyer') {
        const portal = await BuyerPortal.findOne({ _id: claims.portalId, enabled: true, mode: 'with_trade_in',
            generation: claims.generation, expiresAt: { $gt: new Date() } }).lean();
        const sale = portal ? await Sale.findById(portal._id).lean() : null;
        if (!sale || sale.status === 'cancelada' || idOf(doc.saleId) !== idOf(sale._id) || claims.contactHash !== contactHash(await buyerContact(sale))) fail('El acceso al archivo fue revocado.', 401);
        tradeInFor(sale, idOf(doc.tradeInId));
    } else if (claims.actor === 'admin') {
        const session = await LoginSession.findOne({ _id: claims.sessionId, userId: claims.userId, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
        const user = session ? await AdminUser.findById(claims.userId).lean() : null;
        if (!user?.active || session.credentialFingerprint !== credentialFingerprint(user)) fail('La sesión fue revocada.', 401);
        await adminSale({ ...user, id: String(user._id) }, idOf(doc.saleId));
    } else fail('Archivo no disponible.', 401);
    return { buffer: decrypt(doc.encryptedFile, fileContext(id)), mimeType: doc.mimeType, fileName: doc.fileName };
}
export async function createBuyerPortalIndexes() {
    for (const model of [BuyerPortal, BuyerPortalChallenge, BuyerPortalDocument, BuyerPortalOriginal, BuyerPortalRate]) await model.createIndexes();
}
export async function portalData(sale, portal) {
    const car = sale.vehicleId ? await Car.findById(sale.vehicleId).select('brand name year plateOrVin').lean() : null;
    const procedures = await Gestoria.find({ saleId: sale._id }).select('status updatedAt estimatedEndDate').sort({ updatedAt: -1 }).lean();
    const publicUpdate = sale.clientPortalUpdate || {};
    const proceduresStatus = procedures.length ? procedures.map(item => item.status).join(' · ') : (sale.expedienteStatus || 'pendiente');
    const showTradeIns = portal.mode === 'with_trade_in';
    const [docs, originals] = showTradeIns ? await Promise.all([
        BuyerPortalDocument.find({ saleId: sale._id }).sort({ createdAt: 1, _id: 1 }).lean(),
        BuyerPortalOriginal.find({ saleId: sale._id }).lean()
    ]) : [[], []];
    const tradeIns = showTradeIns ? (sale.tradeIns || []).map(item => ({ id: String(item._id), carId: item.linkedStockCarId ? String(item.linkedStockCarId) : null,
        brand: item.brand, model: item.model, year: item.year, plate: item.plate || 'Sin patente',
        groups: groupsFor(docs, originals, String(item._id)) })) : [];
    return { saleId: String(sale._id), mode: portal.mode,
        purchasedVehicle: car ? { brand: car.brand, model: car.name, year: car.year, plate: car.plateOrVin || 'Sin patente' } : null,
        operationStatus: sale.status, deliveryStatus: sale.deliveryStatus, procedureStatus: proceduresStatus,
        latestUpdate: publicUpdate.latestUpdate || 'Podés consultar aquí el estado actual de tu operación.',
        nextStep: publicUpdate.nextStep || (sale.deliveryStatus === 'entregado' ? 'Operación entregada. Contactanos si necesitás ayuda.' : procedures.some(item => item.status === 'Observado') ? 'La agencia está revisando una observación del trámite.' : 'La agencia te avisará cuando haya un próximo paso.'),
        actionRequired: publicUpdate.actionRequired === true, updatedAt: publicUpdate.updatedAt || procedures[0]?.updatedAt || sale.updatedAt,
        requirements: showTradeIns ? BUYER_REQUIREMENTS : [], tradeIns,
        progress: { completed: tradeIns.reduce((sum, item) => sum + item.groups.filter(group => group.complete).length, 0), total: 6 * tradeIns.length } };
}
