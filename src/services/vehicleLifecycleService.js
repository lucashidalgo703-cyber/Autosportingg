import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Reservation from '../models/Reservation.js';
import OwnerPortal, { OwnerPortalRequest } from '../models/OwnerPortal.js';
const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const id = value => { if (!/^[a-f\d]{24}$/i.test(String(value || ''))) fail(400, 'El identificador no es válido.'); return String(value); };
const author = actor => actor?.username || actor?.name || actor?.role || 'CRM';
const actorId = actor => actor?.id || actor?.userId;
const text = (value, max = 5000) => { const result = typeof value === 'string' ? value.trim() : ''; if (result.length > max) fail(400, `El texto supera el máximo de ${max} caracteres.`); return result; };
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
let portalSetup;
const preparePortal = () => portalSetup ||= Promise.all([OwnerPortal.createCollection(), OwnerPortalRequest.createCollection()]).catch(error => { portalSetup = null; throw error; });
export async function changeVehicleSaleAvailability(vehicleId, payload, actor) {
    id(vehicleId);
    if (!['withdraw', 'relist'].includes(payload?.action) || !text(payload?.reason, 1000)) fail(400, 'Elegí una acción e indicá el motivo.');
    let result;
    await mongoose.connection.transaction(async session => {
        const car = await Car.findById(vehicleId).session(session);
        if (!car) fail(404, 'Vehículo no encontrado.');
        const expected = payload.action === 'withdraw' ? 'Disponible' : 'Retirado';
        if (car.status !== expected) fail(409, payload.action === 'withdraw' ? 'Solo se puede retirar una unidad disponible. Revisá su operación vigente.' : 'La unidad ya no figura fuera de venta.');
        const [sale, reservation] = await Promise.all([
            Sale.exists({ vehicleId, historicalOnly: { $ne: true }, status: { $nin: ['borrador', 'cancelada'] } }).session(session),
            Reservation.exists({ vehicleId, status: 'activa' }).session(session)
        ]);
        if (sale || reservation) fail(409, 'La unidad tiene una venta o reserva vigente. Resolvé esa operación antes de cambiar su disponibilidad.');
        const now = new Date(), next = payload.action === 'withdraw' ? 'Retirado' : 'Disponible';
        result = await Car.findOneAndUpdate({ _id: vehicleId, status: expected, ...(car.__v === undefined ? { __v: { $exists: false } } : { __v: car.__v }) }, {
            $set: { status: next, withdrawnAt: next === 'Retirado' ? now : null, withdrawalReason: text(payload.reason, 1000), updatedAt: now }, $inc: { __v: 1 },
            $push: { auditLog: { action: next === 'Retirado' ? 'RETIRO_VENTA' : 'REINGRESO_VENTA', field: 'status', oldValue: expected, newValue: next, date: now, user: author(actor), source: 'CRM_STOCK', details: text(payload.reason, 1000) } }
        }, { new: true, runValidators: true, session }).select('_id status withdrawnAt withdrawalReason').lean();
        if (!result) fail(409, 'La unidad cambió durante la operación. Actualizá la ficha.');
    });
    return result;
}
export async function readOwnerPortal(vehicleId) {
    id(vehicleId);
    if (!await Car.exists({ _id: vehicleId })) fail(404, 'Vehículo no encontrado.');
    const [access, requests] = await Promise.all([
        OwnerPortal.findOne({ vehicleId, revokedAt: null, expiresAt: { $gt: new Date() } }).select('_id expiresAt createdAt').sort({ createdAt: -1 }).lean(),
        OwnerPortalRequest.find({ vehicleId }).select('-__v -accessId').sort({ createdAt: -1 }).limit(100).lean()
    ]);
    return { access, requests };
}
export async function createOwnerPortal(vehicleId, actor) {
    id(vehicleId); await preparePortal(); const token = crypto.randomBytes(32).toString('hex'); let result;
    await mongoose.connection.transaction(async session => {
        const car = await Car.findOneAndUpdate({ _id: vehicleId }, { $inc: { __v: 1 } }, { new: true, session });
        if (!car) fail(404, 'Vehículo no encontrado.');
        const now = new Date();
        await OwnerPortal.updateMany({ vehicleId, revokedAt: null }, { $set: { revokedAt: now } }, { session });
        const [access] = await OwnerPortal.create([{ vehicleId, tokenHash: hash(token), expiresAt: new Date(Date.now() + 30 * 86400000), createdBy: actorId(actor) }], { session });
        await Car.updateOne({ _id: vehicleId }, { $push: { auditLog: { action: 'PORTAL_PROPIETARIO', user: author(actor), source: 'CRM_STOCK', details: 'Enlace de consulta del propietario generado por 30 días; los anteriores quedaron revocados.' } } }, { session });
        result = { _id: access._id, expiresAt: access.expiresAt, path: `/propietario/${token}` };
    });
    return result;
}
export async function revokeOwnerPortal(vehicleId, actor) {
    id(vehicleId);
    await mongoose.connection.transaction(async session => {
        const car = await Car.findOneAndUpdate({ _id: vehicleId }, { $inc: { __v: 1 }, $push: { auditLog: { action: 'PORTAL_REVOCADO', user: author(actor), source: 'CRM_STOCK', details: 'Acceso externo del propietario revocado.' } } }, { session });
        if (!car) fail(404, 'Vehículo no encontrado.');
        await OwnerPortal.updateMany({ vehicleId, revokedAt: null }, { $set: { revokedAt: new Date() } }, { session });
    });
    return { success: true };
}
async function portalAccess(token) {
    if (!/^[a-f\d]{64}$/.test(String(token || ''))) fail(404, 'El enlace no está disponible o venció.');
    const access = await OwnerPortal.findOne({ tokenHash: hash(token), revokedAt: null, expiresAt: { $gt: new Date() } }).select('_id vehicleId expiresAt').lean();
    if (!access) fail(404, 'El enlace no está disponible o venció.');
    return access;
}
export async function getPublicOwnerPortal(token) {
    const access = await portalAccess(token);
    const car = await Car.findById(access.vehicleId).select('_id brand name year km status price currency images coverImage publicEquipment publicMaintenance publicPurchaseConditions').lean();
    if (!car) fail(404, 'El enlace no está disponible.');
    const safeImage = url => typeof url === 'string' && (/^https:\/\//i.test(url) || /^\/(?!\/)/.test(url));
    const requests = await OwnerPortalRequest.find({ accessId: access._id }).select('_id message proposedPrice currency status createdAt').sort({ createdAt: -1 }).limit(20).lean();
    return { expiresAt: access.expiresAt, vehicle: { _id: car._id, brand: car.brand, name: car.name, year: car.year, km: car.km, status: car.status, price: car.price, currency: car.currency, images: (car.images || []).filter(safeImage), coverImage: safeImage(car.coverImage) ? car.coverImage : null, equipment: car.publicEquipment || '', maintenance: car.publicMaintenance || '', purchaseConditions: car.publicPurchaseConditions || '' }, requests };
}
export async function submitOwnerPortalRequest(token, payload) {
    const access = await portalAccess(token), message = text(payload?.message);
    if (!message) fail(400, 'Escribí la solicitud.');
    const proposedPrice = payload.proposedPrice === '' || payload.proposedPrice == null ? null : Number(payload.proposedPrice);
    if (proposedPrice != null && (!Number.isFinite(proposedPrice) || proposedPrice < 0 || !['ARS', 'USD'].includes(payload.currency))) fail(400, 'Revisá el precio propuesto y su moneda.');
    let created;
    await mongoose.connection.transaction(async session => {
        // Serialize submissions and revocation on the same access record.
        const current = await OwnerPortal.findOneAndUpdate({ _id: access._id, revokedAt: null, expiresAt: { $gt: new Date() } }, { $inc: { __v: 1 } }, { session });
        if (!current) fail(404, 'El enlace no está disponible o venció.');
        if (await OwnerPortalRequest.countDocuments({ accessId: access._id, createdAt: { $gte: new Date(Date.now() - 86400000) } }).session(session) >= 20) fail(429, 'Alcanzaste el límite diario de solicitudes para este enlace.');
        [created] = await OwnerPortalRequest.create([{ vehicleId: access.vehicleId, accessId: access._id, message, proposedPrice, currency: proposedPrice == null ? '' : payload.currency }], { session });
    });
    return { _id: created._id, status: created.status, createdAt: created.createdAt };
}
export async function resolveOwnerPortalRequest(vehicleId, requestId, payload, actor) {
    id(vehicleId); id(requestId); const resolution = text(payload?.resolution);
    if (!resolution) fail(400, 'Indicá cómo se resolvió la solicitud.');
    const request = await OwnerPortalRequest.findOneAndUpdate({ _id: requestId, vehicleId, status: 'pendiente' }, { $set: { status: 'resuelta', resolution, resolvedBy: author(actor), resolvedAt: new Date() } }, { new: true, runValidators: true }).select('-accessId -__v').lean();
    if (!request) fail(409, 'La solicitud ya fue resuelta o no pertenece a esta unidad.');
    return request;
}
