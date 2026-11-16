import crypto from 'node:crypto';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import { BuyerPortal, BuyerPortalSession } from '../models/BuyerPortal.js';
import { describeLoginDevice } from './emailLoginService.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { isMySaleOrReservation } from '../utils/saleOwnership.js';

const hash = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const deny = (message, status) => { throw Object.assign(new Error(message), { status }); };
const emptyHistory = () => ({ hasViewed: false, firstViewedAt: null, lastViewedAt: null, totalViews: 0,
    browserSessionCount: 0, browserSessions: [], retentionDays: 30, historyLimitedToCurrentAccess: true });

export function describePortalDevice(req) {
    const agent = typeof req?.headers?.['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 1024) : '';
    const description = describeLoginDevice({ headers: { 'user-agent': agent } });
    const type = /iPad|Tablet|Android(?!.*Mobile)/i.test(agent) ? 'Tablet'
        : /iPhone|iPod|Mobile/i.test(agent) ? 'Celular'
        : /Windows|Macintosh|X11|CrOS|Linux/i.test(agent) ? 'Computadora' : 'No identificado';
    return { ...description, type };
}

const geoText = (value, max) => {
    if (typeof value !== 'string' || value.length > max * 4) return '';
    let decoded;
    try { decoded = decodeURIComponent(value); } catch { return ''; }
    const text = decoded.trim();
    return text.length <= max && /^[\p{L}\p{M}\p{N} .,'’()\-]+$/u.test(text) ? text : '';
};
export function approximatePortalLocation(req) {
    // Vercel supplies these coarse IP-derived fields at its edge. They are
    // informational only, never an authorization signal. Ignore client-supplied
    // lookalikes outside the managed runtime; no external IP lookup is made.
    // https://vercel.com/docs/headers/request-headers#x-vercel-ip-country
    if (process.env.VERCEL !== '1' || !['production', 'preview'].includes(process.env.VERCEL_ENV)) return null;
    const headers = req?.headers || {};
    const country = typeof headers['x-vercel-ip-country'] === 'string' ? headers['x-vercel-ip-country'].toUpperCase() : '';
    if (!/^[A-Z]{2}$/.test(country) || country === 'XX') return null;
    const region = geoText(headers['x-vercel-ip-country-region'], 8);
    const city = geoText(headers['x-vercel-ip-city'], 80);
    return { country, region, city };
}

export async function recordBuyerPortalView(context, req) {
    if (req?.method !== 'GET') return;
    const session = context?.session;
    if (!session?.sid || !/^[A-Za-z0-9_-]{43}$/.test(session.sid) || !validId(session.clientId)) return;
    const now = new Date();
    const filter = { _id: hash(session.sid), portalId: context.portal._id, clientId: session.clientId,
        generation: context.portal.generation, contactHash: session.contactHash, revokedAt: null, expiresAt: { $gt: now } };
    const metadata = { lastViewedAt: now, device: describePortalDevice(req), approximateLocation: approximatePortalLocation(req) };
    // Coalesce quick refreshes and API refreshes after uploads into one visit.
    // The conditional update also prevents concurrent initial requests from
    // counting the same browser visit twice.
    const counted = await BuyerPortalSession.updateOne({ ...filter, $or: [
        { lastCountedViewAt: { $exists: false } }, { lastCountedViewAt: { $lte: new Date(now.getTime() - 30000) } }
    ] }, { $min: { firstViewedAt: now }, $set: { ...metadata, lastCountedViewAt: now }, $inc: { viewCount: 1 } }, { maxTimeMS: 1000 });
    if (!counted.matchedCount) await BuyerPortalSession.updateOne(filter, { $min: { firstViewedAt: now }, $set: metadata }, { maxTimeMS: 1000 });
}

export async function buyerPortalAccessHistory(user, saleId) {
    if (!hasPermission(user, PERMISSIONS.GESTORIA_READ)) deny('No tenés permiso para consultar los accesos del portal.', 403);
    if (!validId(saleId)) deny('No encontré la venta.', 404);
    const sale = await Sale.findById(saleId).select('clientId assignedTo salespersonId salesperson user').lean();
    if (!sale || user.role === 'ventas' && !isMySaleOrReservation(sale, user)) deny('No encontré la venta.', 404);
    const portal = await BuyerPortal.findById(saleId).select('generation enabled expiresAt').lean();
    const client = sale.clientId ? await Client.findById(sale.clientId).select('email status').lean() : null;
    if (!portal?.enabled || portal.expiresAt <= new Date() || !client?.email || client.status === 'bloqueado') return emptyHistory();
    const filter = { portalId: sale._id, clientId: sale.clientId, generation: portal.generation,
        contactHash: hash(String(client.email).trim().toLowerCase()), expiresAt: { $gt: new Date() }, lastViewedAt: { $type: 'date' } };
    const [records, totals] = await Promise.all([
        BuyerPortalSession.find(filter).select('firstViewedAt lastViewedAt viewCount device approximateLocation revokedAt expiresAt -_id')
            .sort({ lastViewedAt: -1 }).limit(20).lean(),
        BuyerPortalSession.aggregate([{ $match: filter }, { $group: { _id: null, firstViewedAt: { $min: '$firstViewedAt' },
            lastViewedAt: { $max: '$lastViewedAt' }, totalViews: { $sum: '$viewCount' }, browserSessionCount: { $sum: 1 } } }])
    ]);
    const total = totals[0];
    if (!total) return emptyHistory();
    return { hasViewed: true, firstViewedAt: total.firstViewedAt, lastViewedAt: total.lastViewedAt,
        totalViews: total.totalViews, browserSessionCount: total.browserSessionCount, retentionDays: 30, historyLimitedToCurrentAccess: true,
        browserSessions: records.map(record => ({ firstViewedAt: record.firstViewedAt, lastViewedAt: record.lastViewedAt,
            viewCount: record.viewCount || 1, browser: record.device?.browser || 'Navegador desconocido',
            os: record.device?.os || 'Sistema operativo desconocido', deviceType: record.device?.type || 'No identificado',
            active: !record.revokedAt && record.expiresAt > new Date(),
            location: record.approximateLocation?.country ? { country: record.approximateLocation.country,
                region: record.approximateLocation.region || '', city: record.approximateLocation.city || '', approximate: true } : null })) };
}
