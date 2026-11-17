// Server-only private-file primitives. Domain services still authorize each
// document/proof and compare its live revision before decrypting any bytes.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import Sale from '../models/Sale.js';
import AdminUser from '../models/AdminUser.js';
import LoginSession from '../models/LoginSession.js';
import { BuyerPortal } from '../models/BuyerPortal.js';
import { credentialFingerprint } from './emailLoginService.js';
import { encryptBuyerPortalBuffer, decryptBuyerPortalBuffer, buyerPortalSigningKey, detectBuyerPortalFileType,
    isActiveBuyerPortalSession, getBuyerPortalContact, buyerPortalContactHash, portalError } from './buyerPortalService.js';
export { lockBuyerPortalMutation } from './buyerPortalService.js';

const idOf = value => String(value?._id || value || '');
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const validKind = kind => ['delivery', 'payment'].includes(kind);
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : String(value)).digest('hex');
const fail = (message, status = 400) => { throw portalError(message, status); };
const aad = (kind, id) => {
    if (!validKind(kind) || !validId(id)) fail('Archivo no disponible.', 404);
    return `buyer-portal-asset:${kind}:${id}`;
};
export function inspectPortalUpload(file) {
    if (!Buffer.isBuffer(file?.buffer) || !file.buffer.length) fail('Elegí una foto o un PDF.');
    if (file.buffer.length > 3 * 1024 * 1024) fail('Cada archivo admite hasta 3 MB.', 413);
    return { mimeType: detectBuyerPortalFileType(file.buffer), byteLength: file.buffer.length, fileHash: hash(file.buffer) };
}
export const encryptPortalFile = (buffer, kind, id) => encryptBuyerPortalBuffer(buffer, aad(kind, id));
export const decryptPortalFile = (encrypted, kind, id) => decryptBuyerPortalBuffer(encrypted, aad(kind, id));

async function verifiedStaff(claims) {
    if (!validId(claims.userId) || typeof claims.sessionId !== 'string') fail('Iniciá sesión nuevamente.', 401);
    const session = await LoginSession.findOne({ _id: claims.sessionId, userId: claims.userId, revokedAt: null, expiresAt: { $gt: new Date() } }).lean();
    const user = session ? await AdminUser.findById(claims.userId).lean() : null;
    if (!user?.active || session.credentialFingerprint !== credentialFingerprint(user)) fail('La sesión fue revocada.', 401);
    return { ...user, id: String(user._id) };
}
async function verifiedBuyer(claims) {
    if (!validId(claims.portalId) || claims.saleId !== claims.portalId) fail('Archivo no disponible.', 404);
    const portal = await BuyerPortal.findOne({ _id: claims.portalId, enabled: true, generation: claims.generation, expiresAt: { $gt: new Date() } }).lean();
    const sale = portal ? await Sale.findById(portal._id).lean() : null;
    if (!sale || sale.status === 'cancelada' || claims.clientId !== idOf(sale.clientId)
        || claims.contactHash !== buyerPortalContactHash(await getBuyerPortalContact(sale))) fail('El acceso al archivo fue revocado.', 401);
    if (!await isActiveBuyerPortalSession(claims, claims.sessionExp)) fail('El acceso al archivo fue revocado.', 401);
    return { sale, portal, session: { ...claims, purpose: 'buyer-portal', exp: claims.sessionExp } };
}
export async function issuePortalFileAccess({ id, kind, revision, saleId, context, adminUser, download = false }) {
    aad(kind, id);
    saleId = idOf(saleId);
    if (!validId(saleId) || !Number.isSafeInteger(revision) || revision < 0) fail('Archivo no disponible.', 404);
    let actor;
    if (adminUser) {
        if (!adminUser.sid) fail('Iniciá sesión nuevamente.', 401);
        actor = { actor: 'admin', userId: idOf(adminUser.id || adminUser._id), sessionId: hash(adminUser.sid) };
        await verifiedStaff(actor);
    } else {
        if (!context?.session?.sid || saleId !== idOf(context.sale?._id) || saleId !== idOf(context.portal?._id)) fail('Archivo no disponible.', 404);
        actor = { actor: 'buyer', portalId: saleId, generation: context.portal.generation,
            contactHash: context.session.contactHash, sessionExp: context.session.exp,
            sid: context.session.sid, clientId: context.session.clientId };
        await verifiedBuyer({ ...actor, saleId });
    }
    const exp = Math.min(Math.floor(Date.now() / 1000) + 120, actor.sessionExp || Infinity);
    const access = jwt.sign({ ...actor, saleId, purpose: 'buyer-portal-file', docId: id, kind, revision, download: download === true, exp },
        buyerPortalSigningKey(), { algorithm: 'HS256', audience: 'autosporting-portal-file' });
    return { url: `/api/buyer-portal/files/${id}?kind=${kind}&access=${access}`, expiresAt: new Date(exp * 1000) };
}
export async function verifyPortalFileAccess(id, access, kind) {
    aad(kind, id);
    let claims;
    try { claims = jwt.verify(access || '', buyerPortalSigningKey(), { algorithms: ['HS256'], audience: 'autosporting-portal-file' }); }
    catch { fail('El acceso al archivo venció. Volvé a abrirlo desde el portal.', 401); }
    if (claims.purpose !== 'buyer-portal-file' || claims.docId !== id || claims.kind !== kind || !validId(claims.saleId)
        || !Number.isSafeInteger(claims.revision) || claims.revision < 0) fail('Archivo no disponible.', 404);
    if (claims.actor === 'buyer') {
        const context = await verifiedBuyer(claims);
        return { claims, context, sale: context.sale, download: claims.download === true };
    }
    if (claims.actor === 'admin') {
        const user = await verifiedStaff(claims), sale = await Sale.findById(claims.saleId).lean();
        if (!sale) fail('Archivo no disponible.', 404);
        return { claims, user, sale, download: claims.download === true };
    }
    fail('Archivo no disponible.', 401);
}
