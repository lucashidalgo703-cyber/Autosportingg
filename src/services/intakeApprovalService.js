import crypto from 'node:crypto';
import mongoose from 'mongoose';
import ApprovalRequest from '../models/ApprovalRequest.js';
import AdminUser from '../models/AdminUser.js';
import Car from '../models/Car.js';
import Client from '../models/Client.js';
import { logAudit } from '../utils/auditLogger.js';

export const INTAKE_ACTIONS = Object.freeze({ vehicle: 'CREATE_STOCK_VEHICLE', client: 'CREATE_CLIENT' });
export const isIntakeApproval = request => Object.values(INTAKE_ACTIONS).includes(request?.actionType);
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const actorId = user => String(user?.id || user?.userId || user?._id || '');
const text = (value, max = 1000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const number = (value, label, { required = true, integer = false } = {}) => {
    if (value === undefined || value === null || value === '') {
        if (!required) return undefined;
        fail(`Completá ${label}.`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > Number.MAX_SAFE_INTEGER || (integer && !Number.isInteger(parsed))) fail(`Revisá ${label}.`);
    return parsed;
};
const jsonHash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function prepareIntakePayload(kind, input, user, images = []) {
    if (kind === 'vehicle') {
        const currency = input.currency === '$' ? 'ARS' : input.currency === 'U$S' ? 'USD' : input.currency;
        if (!['ARS', 'USD'].includes(currency)) fail('Elegí ARS o USD para el precio publicado.');
        const payload = {
            brand: text(input.brand, 100), name: text(input.name, 200),
            year: number(input.year, 'el año', { integer: true }), km: number(input.km, 'el kilometraje', { integer: true }),
            fuel: text(input.fuel, 40), condition: text(input.condition, 40),
            price: number(input.price, 'el precio publicado'), currency,
            plateOrVin: text(input.plateOrVin, 40).toUpperCase(), color: text(input.color, 60),
            vehicleType: text(input.vehicleType, 60) || 'Auto',
            description: text(input.description, 10000), notes: text(input.notes, 10000),
            // Approval creates a private inventory file. Publishing is still the
            // owner's existing stock action, not a privilege of the requester.
            visibleEnWeb: false, status: 'Disponible', sold: false,
            agencyOwned: input.agencyOwned === true || input.agencyOwned === 'true',
            images, coverImage: images[0] || ''
        };
        if (!payload.brand || !payload.name || !payload.fuel || !payload.condition) fail('Completá marca, modelo, combustible y condición.');
        if (payload.year < 1900 || payload.year > new Date().getFullYear() + 2) fail('Revisá el año del vehículo.');
        const cost = number(input.purchasePrice, 'el costo de compra', { required: false });
        if (cost !== undefined) {
            if (!['ARS', 'USD'].includes(input.purchaseCurrency)) fail('Elegí ARS o USD para el costo.');
            payload.purchasePrice = cost;
            payload.purchaseCurrency = input.purchaseCurrency;
            if (payload.agencyOwned && cost > 0) {
                payload.purchasePaymentState = { modality: 'pendiente', status: 'pendiente', totalCost: cost,
                    agencyCost: cost, amountPaid: 0, pendingDebt: cost, currency: input.purchaseCurrency };
            }
        }
        await new Car(payload).validate();
        return payload;
    }
    if (kind !== 'client') fail('Tipo de alta no válido.');
    const payload = {};
    for (const field of ['firstName', 'lastName', 'fullName', 'phone', 'email', 'dniCuit', 'locality', 'province', 'address', 'type', 'source', 'notes']) {
        if (input[field] !== undefined) payload[field] = text(input[field], field === 'notes' ? 10000 : 250);
    }
    if (!payload.firstName && !payload.fullName) fail('El nombre es obligatorio.');
    if (!payload.phone && !payload.email) fail('Ingresá un teléfono o un email.');
    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) fail('Revisá el email.');
    payload.assignedTo = actorId(user);
    payload.status = 'activo';
    const client = new Client(payload);
    await client.validate();
    // Normalize the draft through the same Client hooks used by normal creation.
    for (const key of ['firstName', 'lastName', 'fullName', 'phone', 'phoneNormalized', 'email', 'emailNormalized']) {
        if (client[key] !== undefined) payload[key] = client[key];
    }
    return payload;
}

export async function submitIntake({ kind, input, user, req, key, images = [] }) {
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(String(key || ''))) fail('No pudimos identificar el envío. Volvé a abrir el formulario y reintentá.');
    const actionType = INTAKE_ACTIONS[kind];
    if (!actionType) fail('Tipo de alta no válido.');
    const payload = await prepareIntakePayload(kind, input, user, images);
    // The request id itself is the idempotency boundary; no new unique index or
    // best-effort browser flag is needed for concurrent retries.
    const id = jsonHash(['intake-v1', actorId(user), actionType, key]).slice(0, 24);
    // Storage assigns a URL on upload. A concurrent multipart retry may obtain
    // another URL; the first accepted submission retains its original photos.
    const fingerprintPayload = kind === 'vehicle' ? { ...payload, images: undefined, coverImage: undefined } : payload;
    const fingerprint = jsonHash(fingerprintPayload);
    const summary = kind === 'vehicle'
        ? `Alta de vehículo: ${payload.brand} ${payload.name} ${payload.year}${payload.plateOrVin ? ' · ' + payload.plateOrVin : ''}`
        : `Alta de cliente: ${payload.fullName}`;
    const request = new ApprovalRequest({ _id: id, requester: actorId(user), actionType,
        entityType: kind === 'vehicle' ? 'Car' : 'Client', entityId: new mongoose.Types.ObjectId(),
        summary, reason: text(input.approvalReason, 2000) || 'Alta solicitada desde el CRM para autorización del titular.',
        intakePayload: payload, intakeFingerprint: fingerprint,
        history: [{ status: 'pending', changedBy: actorId(user), notes: 'Pendiente de autorización del titular.' }] });
    try {
        await request.save();
    } catch (error) {
        if (error.code !== 11000) throw error;
        const existing = await ApprovalRequest.findOne({ _id: id, requester: actorId(user) }).select('+intakeFingerprint');
        if (!existing || existing.intakeFingerprint !== fingerprint) fail('Este envío ya fue recibido con otros datos. Revisá la solicitud en Autorizaciones.', 409);
        const result = existing.toObject(); delete result.intakeFingerprint;
        return result;
    }
    await logAudit({ req, action: 'ALTA_SOLICITADA', module: 'Approvals', entityType: 'ApprovalRequest',
        entityId: request._id, entityLabel: summary, metadata: { actionType, entityId: request.entityId } });
    const result = request.toObject(); delete result.intakeFingerprint;
    return result;
}

export async function resolveIntake({ id, status, resolutionNotes, user, req }) {
    if (!['approved', 'rejected', 'cancelled'].includes(status)) fail('Elegí aprobar, rechazar o cancelar la solicitud.');
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const request = await ApprovalRequest.findById(id).session(session);
            if (!request || !isIntakeApproval(request)) fail('Solicitud no encontrada.', 404);
            const own = String(request.requester) === actorId(user);
            if (status === 'cancelled' ? (!own && user.role !== 'owner') : user.role !== 'owner') fail('Sólo el titular puede aprobar o rechazar estas altas.', 403);
            if ((status === 'approved' && request.status === 'executed') || request.status === status) {
                result = request.toObject(); return;
            }
            if (request.status !== 'pending') fail('Esta solicitud ya fue resuelta. Actualizá la lista.', 409);
            const notes = text(resolutionNotes, 4000);
            if (status === 'rejected' && !notes) fail('Indicá el motivo del rechazo.');
            if (status === 'approved') {
                const requester = await AdminUser.findById(request.requester).session(session);
                if (!requester?.active) fail('El usuario solicitante ya no está activo. Rechazá esta alta y revisá sus datos.', 409);
                const actor = user.name || user.username || user.email;
                const payload = request.intakePayload;
                if (!payload) fail('La solicitud no tiene datos de alta válidos.', 409);
                if (request.actionType === INTAKE_ACTIONS.vehicle) {
                    // Only data is authorized. Purchases/payments use the existing
                    // stock flow after approval, never a requester-provided account.
                    const car = new Car({ ...payload, _id: request.entityId, visibleEnWeb: false, status: 'Disponible', sold: false,
                        auditLog: [{ action: 'ALTA_AUTORIZADA', user: actor, source: 'CRM_V2',
                            details: `Alta aprobada. Solicitud ${request._id}; solicitante ${requester.name}.` }] });
                    await car.save({ session });
                } else {
                    const client = new Client({ ...payload, _id: request.entityId, assignedTo: request.requester, assignedAt: new Date(),
                        createdBy: actor, clientAuditLog: [{ action: 'CREACION_AUTORIZADA', user: actor, source: 'CRM_V2',
                            details: `Alta aprobada. Solicitud ${request._id}; solicitante ${requester.name}.` }] });
                    await client.save({ session });
                }
                request.approver = actorId(user);
                request.history.push({ status: 'approved', changedBy: actorId(user), notes });
                request.status = 'executed';
            } else {
                request.status = status;
                if (status === 'rejected') request.approver = actorId(user);
            }
            request.resolutionNotes = notes;
            request.history.push({ status: request.status, changedBy: actorId(user), notes });
            await request.save({ session });
            await logAudit({ req, action: status === 'approved' ? 'ALTA_AUTORIZADA' : 'ALTA_' + status.toUpperCase(), module: 'Approvals',
                entityType: request.entityType, entityId: request.entityId, entityLabel: request.summary,
                metadata: { approvalId: request._id, requester: request.requester }, session, strict: true });
            result = request.toObject();
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        return result;
    } catch (error) {
        if (error.code === 20 || error.codeName === 'IllegalOperation') fail('La base debe admitir transacciones para autorizar el alta. Reintentá desde un entorno compatible.', 503);
        throw error;
    } finally { await session.endSession(); }
}
