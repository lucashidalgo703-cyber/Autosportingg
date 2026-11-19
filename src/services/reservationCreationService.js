import mongoose from 'mongoose';
import Car from '../models/Car.js';
import Reservation from '../models/Reservation.js';
import Sale from '../models/Sale.js';
import Lead from '../models/Lead.js';
import { logAudit } from '../utils/auditLogger.js';
import { sellerScope, assertSellerAssignment } from './sellerAccessService.js';
import { isSalesRole } from '../utils/adminPermissions.js';

export class ReservationCreationError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}
const fail = (message, status) => { throw new ReservationCreationError(message, status); };

// Reservation and sale creation serialize on the same stock document. The
// transaction rolls back the reservation/lead too when another operation wins.
export async function createReservationAtomic({ payload, user }) {
    assertSellerAssignment(user, payload);
    const { vehicleId, clientId, leadId, agreedPrice, agreedCurrency, depositAmount, depositCurrency,
        depositMethod, expiresAt, conditions, notes, salesperson } = payload;
    if (!vehicleId || !mongoose.isValidObjectId(vehicleId)) fail('Seleccioná un vehículo válido.');
    if (!Number.isFinite(Number(agreedPrice)) || Number(agreedPrice) < 0) fail('El precio acordado debe ser un importe válido y no negativo.');
    if (!Number.isFinite(Number(depositAmount)) || Number(depositAmount) < 0) fail('La seña debe ser un importe válido y no negativo.');
    if (!['ARS', 'USD'].includes(agreedCurrency) || !['ARS', 'USD'].includes(depositCurrency)) fail('Moneda no válida.');
    if (!expiresAt || !Number.isFinite(new Date(expiresAt).getTime()) || new Date(expiresAt) < new Date(new Date().setHours(0, 0, 0, 0))) {
        fail('La reserva debe tener un vencimiento válido que no esté en el pasado.');
    }
    const actor = user?.username || user?.name || 'Admin';
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const vehicle = await Car.findById(vehicleId).session(session);
            if (!vehicle) fail('No se encontró el vehículo.', 404);
            if (vehicle.sold || vehicle.status === 'Vendido' || vehicle.status === 'Reservado') {
                fail('El vehículo ya está vendido o reservado. Actualizá la operación.', 409);
            }
            const activeSale = await Sale.exists({ vehicleId, status: { $ne: 'cancelada' } }).session(session);
            if (activeSale) fail('El vehículo ya tiene una venta activa.', 409);
            const activeReservation = await Reservation.exists({ vehicleId, status: 'activa' }).session(session);
            if (activeReservation) fail('El vehículo ya tiene una reserva activa.', 409);
            const reservation = new Reservation({ vehicleId, clientId: clientId || undefined, leadId: leadId || undefined,
                agreedPrice, agreedCurrency, depositAmount, depositCurrency, depositMethod, expiresAt,
                conditions, notes, salesperson: isSalesRole(user) ? user.name || user.username || user.email : salesperson, createdBy: actor,
                ...(isSalesRole(user) ? { assignedTo: user.id || user.userId || user._id, assignedAt: new Date() } : {}),
                reservationAuditLog: [{ action: 'RESERVA_CREADA', field: 'status', newValue: 'activa',
                    details: `Reserva creada por ${depositCurrency} ${depositAmount}`, user: actor, source: 'CRM_V2' }] });
            await reservation.save({ session });
            const oldStatus = vehicle.status;
            vehicle.status = 'Reservado';
            vehicle.auditLog.push({ action: 'ESTADO', field: 'status', oldValue: oldStatus, newValue: 'Reservado',
                details: `Vehículo reservado (Reserva ID: ${reservation._id})`, user: actor, source: 'CRM_V2' });
            await vehicle.save({ session });
            if (leadId) {
                const lead = await Lead.findById(leadId).session(session);
                if (lead) {
                    const oldStatus = lead.crmStatus;
                    lead.crmStatus = 'reservado';
                    lead.lastActivityAt = new Date();
                    lead.leadAuditLog.push({ action: 'RESERVA_CREADA', field: 'crmStatus', oldValue: oldStatus,
                        newValue: 'reservado', details: 'Seña de reserva recibida por el vehículo asociado', user: actor, source: 'CRM_V2' });
                    await lead.save({ session });
                }
            }
            result = reservation.toObject();
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        return result;
    } catch (error) {
        if (error.code === 20 || error.codeName === 'IllegalOperation') fail('La base debe admitir transacciones para reservar la unidad de forma consistente.', 503);
        throw error;
    } finally { await session.endSession(); }
}

export async function updateReservationAtomic({ id, payload, user, req }) {
    assertSellerAssignment(user, payload);
    if (!mongoose.isValidObjectId(id)) fail('El identificador de reserva no es válido.');
    const actor = user?.username || user?.name || 'Admin';
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const reservation = await Reservation.findOne({ _id: id, ...sellerScope(user) }).session(session);
            if (!reservation) fail('No se encontró la reserva.', 404);
            const oldStatus = reservation.status;
            const { status, conditions, notes } = payload;
            const statusChanged = status !== undefined && status !== oldStatus;
            if (statusChanged) {
                if (!['activa', 'convertida', 'vencida', 'cancelada', 'devuelta', 'retenida'].includes(status)) fail('Estado de reserva no válido.');
                if (oldStatus === 'convertida') fail('La reserva ya fue convertida a venta. Gestioná la operación desde Ventas.', 409);
                if (status === 'convertida') fail('Convertí la reserva desde Nueva venta para conservar la operación, la seña y el stock.', 409);
                if (status === 'activa') fail('Para volver a reservar la unidad, creá una nueva reserva y conservá el historial de la anterior.', 409);
            }
            let changed = false;
            if (payload.assignedTo !== undefined) {
                const oldAssigned = reservation.assignedTo ? String(reservation.assignedTo) : null;
                const newAssigned = payload.assignedTo === '' ? null : payload.assignedTo;
                if (oldAssigned !== newAssigned) {
                    reservation.assignedTo = newAssigned;
                    reservation.assignedAt = new Date();
                    changed = true;
                    await logAudit({ req: req || { user }, action: newAssigned ? 'RESPONSABLE_ASIGNADO' : 'RESPONSABLE_REMOVIDO',
                        module: 'reservas', entityType: 'Reservation', entityId: reservation._id, entityLabel: 'Reserva',
                        description: 'Se reasignó la reserva.', metadata: { oldAssigned, newAssigned }, session, strict: true });
                }
            }
            if (conditions !== undefined && conditions !== reservation.conditions) { reservation.conditions = conditions; changed = true; }
            if (notes !== undefined && notes !== reservation.notes) { reservation.notes = notes; changed = true; }
            if (statusChanged) {
                reservation.status = status;
                changed = true;
                reservation.reservationAuditLog.push({ action: 'CAMBIO_ESTADO', field: 'status', oldValue: oldStatus,
                    newValue: status, details: `Estado de reserva actualizado a ${status}`, user: actor, source: 'CRM_V2' });
                if (['vencida', 'cancelada', 'devuelta', 'retenida'].includes(status)) {
                    const vehicle = await Car.findById(reservation.vehicleId).session(session);
                    if (vehicle?.status === 'Reservado') {
                        const activeSale = await Sale.exists({ vehicleId: vehicle._id, status: { $ne: 'cancelada' } }).session(session);
                        if (activeSale) fail('La unidad tiene una venta activa. Revisá la operación antes de liberar la reserva.', 409);
                        const otherActive = await Reservation.exists({ vehicleId: vehicle._id, status: 'activa', _id: { $ne: reservation._id } }).session(session);
                        if (!otherActive) {
                            vehicle.status = 'Disponible';
                            vehicle.auditLog.push({ action: 'ESTADO', field: 'status', oldValue: 'Reservado', newValue: 'Disponible',
                                details: `Vehículo liberado por reserva ${status} (ID: ${reservation._id})`, user: actor, source: 'CRM_V2' });
                            await vehicle.save({ session });
                        }
                    }
                }
            }
            if (changed) { reservation.updatedBy = actor; await reservation.save({ session }); }
            result = reservation.toObject();
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        return result;
    } catch (error) {
        if (error.code === 20 || error.codeName === 'IllegalOperation') fail('La base debe admitir transacciones para actualizar la reserva de forma consistente.', 503);
        throw error;
    } finally { await session.endSession(); }
}
