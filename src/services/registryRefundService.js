import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Refund from '../models/RegistryRefund.js';
import Gestoria from '../models/Gestoria.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import AuditLog from '../models/AuditLog.js';
import { parseDecimal, roundMoney } from '../utils/saleCommercial.js';
import { saleDateInput, SaleWorkspaceError } from '../utils/saleWorkspace.js';
const fail = (field, message, status = 400) => { throw new SaleWorkspaceError(field, message, status, 'REGISTRY_REFUND_INVALID'); };
const validId = value => /^[a-f\d]{24}$/i.test(String(value || ''));
const actorId = actor => String(actor?.id || actor?.userId || '');
const actorName = actor => actor?.username || actor?.name || actor?.email || 'Admin';
const audit = (row, actor, action, details, session) => AuditLog.create([{ userId: actorId(actor), userName: actorName(actor), userRole: actor?.role, action, module: 'finanzas', entityType: 'RegistryRefund', entityId: String(row._id), description: details, metadata: { gestoriaId: row.gestoriaId, status: row.status, amount: row.amount, currency: row.currency, transactionId: row.transactionId || null } }], { session });
const view = row => { const result = row.toObject ? row.toObject() : { ...row }; delete result.idempotencyKey; delete result.payloadHash; return result; };
async function transaction(fn) {
    try { return await mongoose.connection.transaction(fn); }
    catch (error) {
        if (error?.code === 20 || /Transaction numbers are only allowed|replica set/i.test(error?.message || '')) fail('refund', 'Esta operación requiere MongoDB con transacciones. No se guardaron cambios.', 503);
        if (error?.name === 'VersionError' || error?.name === 'DocumentNotFoundError') fail('refund', 'El reintegro cambió. Actualizá la vista.', 409);
        throw error;
    }
}
export async function createRegistryRefund(gestoriaId, payload, actor, idempotencyKey) {
    if (!validId(gestoriaId)) fail('gestoriaId', 'El trámite no es válido.');
    if (!actorId(actor)) fail('actor', 'La sesión no es válida.', 401);
    if (typeof idempotencyKey !== 'string' || !/^[\w-]{8,100}$/.test(idempotencyKey)) fail('idempotencyKey', 'La solicitud requiere un identificador de reintento.');
    if (!['number', 'string'].includes(typeof payload.amount)) fail('amount', 'Ingresá un importe válido.');
    const amount = parseDecimal(payload.amount); if (!Number.isFinite(amount) || amount <= 0) fail('amount', 'Ingresá un importe mayor a cero.');
    if (!['ARS', 'USD'].includes(payload.currency)) fail('currency', 'Elegí ARS o USD.');
    const date = saleDateInput(payload.date, 'date');
    if (payload.notes != null && (typeof payload.notes !== 'string' || payload.notes.length > 5000)) fail('notes', 'Revisá las observaciones.');
    const clean = { amount: roundMoney(amount), currency: payload.currency, date, notes: (payload.notes || '').trim() };
    if (clean.amount <= 0) fail('amount', 'El importe mínimo es 0,01.');
    const hash = crypto.createHash('sha256').update(JSON.stringify(clean)).digest('hex');
    return transaction(async session => {
        const existing = await Refund.findOne({ gestoriaId, createdBy: actorId(actor), idempotencyKey }).select('+payloadHash').session(session);
        if (existing) { if (existing.payloadHash !== hash) fail('refund', 'La solicitud ya fue utilizada con otros datos.', 409); return { item: view(existing), replayed: true }; }
        const source = await Gestoria.findById(gestoriaId).session(session);
        if (!source || !['Transferencia Ingreso', 'Transferencia Egreso'].includes(source.type) || !['Transferido', 'Finalizado'].includes(source.status)) fail('gestoriaId', 'Registrá el reintegro desde una transferencia transferida o finalizada.', 409);
        const sale = source.saleId ? await Sale.findById(source.saleId).select('vehicleId clientId').session(session).lean() : null;
        const vehicleId = source.vehicleId || sale?.vehicleId; const clientId = source.clientId || sale?.clientId;
        const [car, client] = await Promise.all([vehicleId ? Car.findById(vehicleId).select('brand name plateOrVin').session(session).lean() : null, clientId ? Client.findById(clientId).select('fullName').session(session).lean() : null]);
        const [row] = await Refund.create([{ ...clean, date: new Date(date + 'T03:00:00.000Z'), gestoriaId: source._id, saleId: source.saleId || undefined, vehicleId: car?._id, clientId: client?._id, vehiclePlate: source.vehiclePlate || car?.plateOrVin || '', vehicleName: car ? `${car.brand} ${car.name}` : '', clientName: client?.fullName || '', gestorName: source.gestorName || '', createdBy: actorId(actor), idempotencyKey, payloadHash: hash, auditLog: [{ action: 'DECLARADO', user: actorName(actor), details: 'Reintegro informado por Gestoría, pendiente de confirmación. Sin movimiento de caja.' }] }], { session });
        const updated = await Gestoria.updateOne({ _id: source._id, __v: source.__v ?? 0, status: source.status }, { $inc: { __v: 1 }, $push: { auditLog: { action: 'REINTEGRO_REGISTRO_DECLARADO', details: `Reintegro ${row._id}: ${row.currency} ${row.amount}. Pendiente de confirmación; sin caja.`, user: actorName(actor) } } }, { session });
        if (!updated.modifiedCount) fail('gestoriaId', 'El trámite cambió. Volvé a abrirlo.', 409);
        await audit(row, actor, 'REINTEGRO_REGISTRO_DECLARADO', 'Gestoría declaró un reintegro del Registro; no afecta caja.', session);
        return { item: view(row), replayed: false };
    });
}
export async function resolveRegistryRefund(refundId, payload, actor) {
    if (!validId(refundId)) fail('refundId', 'El reintegro no es válido.');
    if (!['acreditada', 'devuelta_cliente'].includes(payload.status)) fail('status', 'Elegí una resolución válida.');
    if (typeof payload.reason !== 'string' || !payload.reason.trim() || payload.reason.length > 5000) fail('reason', 'Escribí una constancia de la resolución.');
    return transaction(async session => {
        const row = await Refund.findById(refundId).session(session);
        if (!row) fail('refundId', 'Reintegro no encontrado.', 404);
        if (row.status !== 'por_confirmar') {
            if (row.status === payload.status && (payload.status !== 'acreditada' || String(row.accountId) === String(payload.accountId))) return { item: view(row), replayed: true };
            fail('status', 'El reintegro ya fue resuelto. Conservá su trazabilidad.', 409);
        }
        if (payload.status === 'acreditada') {
            if (!validId(payload.accountId)) fail('accountId', 'Elegí una cuenta o caja activa.');
            const account = await Account.findOne({ _id: payload.accountId, isActive: true, currency: row.currency }).session(session);
            if (!account) fail('accountId', 'Elegí una cuenta activa de la misma moneda que el reintegro.');
            const [tx] = await Transaction.create([{ type: 'Ingreso', amount: row.amount, currency: row.currency, description: `Reintegro del Registro · ${row.vehiclePlate || row.gestoriaId}`, category: 'Devolución del Registro', date: new Date(), accountId: account._id, module: 'crm_v2', source: 'otro', concept: 'registry_refund', registryRefundId: row._id, status: 'activo', createdBy: actorName(actor), notes: payload.reason.trim(), idempotencyKey: `registry-refund:${row._id}`, transactionAuditLog: [{ action: 'REINTEGRO_REGISTRO_ACREDITADO', user: actorName(actor), details: `Acreditación confirmada de reintegro ${row._id}. No es un cobro del comprador.` }] }], { session });
            const credited = await Account.updateOne({ _id: account._id, isActive: true, currency: row.currency }, { $inc: { balance: row.amount } }, { session });
            if (!credited.modifiedCount) fail('accountId', 'La cuenta cambió. Actualizá la vista.', 409);
            row.accountId = account._id; row.transactionId = tx._id;
        }
        row.status = payload.status; row.resolvedAt = new Date(); row.resolvedBy = actorName(actor); row.resolutionNote = payload.reason.trim();
        const detail = payload.status === 'acreditada' ? 'Ingreso confirmado en la cuenta seleccionada.' : 'Gestión declarada: el Registro devolvió el importe directamente al cliente. Sin paso por caja de la agencia.';
        row.auditLog.push({ action: 'RESUELTO', user: actorName(actor), details: `${detail} ${row.resolutionNote}` });
        row.$where = { status: 'por_confirmar', __v: row.__v ?? 0 }; row.increment(); await row.save({ session });
        await audit(row, actor, 'REINTEGRO_REGISTRO_RESUELTO', detail, session);
        return { item: view(row), replayed: false };
    });
}
export async function listRegistryRefunds({ gestoriaId, search = '', status = '', page = 1, limit = 50 } = {}) {
    const query = {}; if (gestoriaId) { if (!validId(gestoriaId)) fail('gestoriaId', 'Trámite inválido.'); query.gestoriaId = new mongoose.Types.ObjectId(gestoriaId); }
    if (status && status !== 'todas') { if (!['por_confirmar', 'acreditada', 'devuelta_cliente'].includes(status)) fail('status', 'Estado inválido.'); query.status = status; }
    if (typeof search !== 'string' || search.length > 300) fail('search', 'Búsqueda inválida.');
    if (search.trim()) { const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); query.$or = ['vehiclePlate', 'vehicleName', 'clientName', 'gestorName'].map(key => ({ [key]: pattern })); }
    const current = Math.max(1, Math.floor(Number(page) || 1)); const size = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
    const [items, total, totals] = await Promise.all([Refund.find(query).sort({ date: -1, _id: -1 }).skip((current - 1) * size).limit(size).lean(), Refund.countDocuments(query), Refund.aggregate([{ $match: gestoriaId ? { gestoriaId: new mongoose.Types.ObjectId(gestoriaId) } : {} }, { $group: { _id: { status: '$status', currency: '$currency' }, amount: { $sum: '$amount' }, count: { $sum: 1 } } }])]);
    const summary = { por_confirmar: { ARS: 0, USD: 0, count: 0 }, acreditada: { ARS: 0, USD: 0, count: 0 }, devuelta_cliente: { ARS: 0, USD: 0, count: 0 } };
    for (const row of totals) if (summary[row._id.status] && ['ARS', 'USD'].includes(row._id.currency)) { summary[row._id.status][row._id.currency] = roundMoney(row.amount); summary[row._id.status].count += row.count; }
    return { items: items.map(view), total, page: current, pages: Math.max(1, Math.ceil(total / size)), summary };
}
