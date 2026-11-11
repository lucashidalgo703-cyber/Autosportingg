import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import Car from '../models/Car.js';
import Pedido from '../models/Pedido.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { normalizePhoneToWhatsApp } from '../utils/phoneNormalizer.js';
const digits = value => { const raw = String(value || '').replace(/\D/g, ''); return raw ? normalizePhoneToWhatsApp(raw).replace(/\D/g, '') : ''; };
const email = value => String(value || '').trim().toLowerCase();
export async function getContactPermissions(entity, ids, actor) {
    const definitions = {
        client: [Client, PERMISSIONS.CLIENTES_READ, '_id phone email doNotContact'],
        lead: [Lead, PERMISSIONS.LEADS_READ, '_id clientId phone email'],
        car: [Car, PERMISSIONS.STOCK_READ, '_id clientId linkedClient ownerPhone ownerEmail'],
        pedido: [Pedido, PERMISSIONS.PEDIDOS_READ, '_id clientId clientPhone']
    };
    const definition = definitions[entity];
    if (!definition || !Array.isArray(ids) || ids.length > 50 || !ids.length || ids.some(value => !/^[a-f\d]{24}$/i.test(value))) throw Object.assign(new Error('La consulta de contacto no es válida.'), { statusCode: 400 });
    if (!['owner', 'admin'].includes(actor.role) && !hasPermission(actor, definition[1])) throw Object.assign(new Error('No tenés permiso para consultar estos registros.'), { statusCode: 403 });
    const records = await definition[0].find({ _id: { $in: ids } }).select(definition[2]).lean();
    const rows = records.map(record => ({ id: String(record._id), clientId: entity === 'client' ? String(record._id) : String(record.clientId || (/^[a-f\d]{24}$/i.test(record.linkedClient || '') ? record.linkedClient : '')), phone: digits(record.phone || record.ownerPhone || record.clientPhone), email: email(record.email || record.ownerEmail), blocked: record.doNotContact === true }));
    const linkedIds = rows.map(row => row.clientId).filter(value => /^[a-f\d]{24}$/i.test(value)), phones = rows.map(row => row.phone).filter(Boolean), emails = rows.map(row => row.email).filter(Boolean);
    const conditions = [{ _id: { $in: linkedIds } }, { phoneNormalized: { $in: phones } }, { emailNormalized: { $in: emails } }, { phone: { $in: phones } }, { email: { $in: emails } }];
    const blocked = await Client.find({ doNotContact: true, $or: conditions }).select('_id phoneNormalized emailNormalized phone email').lean();
    const blockedIds = new Set(blocked.map(client => String(client._id))), blockedPhones = new Set(blocked.map(client => digits(client.phoneNormalized || client.phone)).filter(Boolean)), blockedEmails = new Set(blocked.map(client => email(client.emailNormalized || client.email)).filter(Boolean));
    const items = Object.fromEntries(ids.map(value => [value, { canContact: false }]));
    for (const row of rows) items[row.id] = { canContact: !row.blocked && !blockedIds.has(row.clientId) && !blockedPhones.has(row.phone) && !blockedEmails.has(row.email) };
    return { items };
}
