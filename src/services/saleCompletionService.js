import mongoose from 'mongoose';
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Reservation from '../models/Reservation.js';
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import AdminUser from '../models/AdminUser.js';
import Installment from '../models/Installment.js';
import AuditLog from '../models/AuditLog.js';
import { hasPermission, PERMISSIONS } from '../utils/adminPermissions.js';
import { computeCommissionAmount, validateCommissionPercent, roundMoney } from '../utils/saleCommercial.js';
import { sellerScope, assertSellerAssignment, sellerVehicleDto } from './sellerAccessService.js';
import { isMySaleOrReservation } from '../utils/saleOwnership.js';

export class SaleCompletionError extends Error {
    constructor(message, status = 400, details = {}) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
const fail = (message, status, details) => { throw new SaleCompletionError(message, status, details); };
const idOf = value => String(value?._id || value || '');
const escapeSearch = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const amount = (value, label) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) fail(`Ingresá un importe válido para ${label}.`);
    return n;
};
// HTML date inputs represent an Argentina business day, not midnight UTC.
const normalizeSaleDate = value => {
    if (value === undefined || value === null || value === '') return new Date();
    if (typeof value === 'string') {
        const calendarDate = value.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/)?.[1];
        if (!calendarDate) fail('Ingresá una fecha de venta válida.');
        const argentinaNoon = new Date(`${calendarDate}T15:00:00.000Z`);
        if (!Number.isFinite(argentinaNoon.getTime()) || argentinaNoon.toISOString().slice(0, 10) !== calendarDate) {
            fail('Ingresá una fecha de venta válida.');
        }
        if (value === calendarDate) return argentinaNoon;
    }
    const timestamp = new Date(value);
    if (!Number.isFinite(timestamp.getTime())) fail('Ingresá una fecha de venta válida.');
    return timestamp;
};
export const vehiclePauseReason = vehicle => {
    const entry = [...(vehicle.auditLog || [])].reverse().find(a => a.field === 'status' && a.newValue === 'Pausado');
    return entry?.justification || entry?.details || vehicle.notes || 'La unidad está pausada. Revisá su ficha antes de resolver la pausa.';
};

// Search is performed before pagination, across every status and the complete stock.
export async function getSaleVehicleOptions({ q = '', page = 1, limit = 20 } = {}, user) {
    page = Math.max(1, Number.parseInt(page, 10) || 1);
    limit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    const query = {};
    const words = String(q).trim().slice(0, 100).split(/\s+/).filter(Boolean);
    if (words.length) query.$and = words.map(word => {
        const regex = new RegExp(escapeSearch(word), 'i');
        const matches = ['brand', 'name', 'model', 'version', 'plateOrVin', 'infoAuto.modelName', 'infoAuto.versionName'].map(key => ({ [key]: regex }));
        if (/^\d{4}$/.test(word)) matches.push({ year: Number(word) });
        return { $or: matches };
    });
    if (user?.role === 'ventas') {
        const [operations, activeReservations] = await Promise.all([
            Sale.find({ status: { $ne: 'cancelada' }, vehicleId: { $ne: null } }).select('vehicleId assignedTo').lean(),
            Reservation.find({ status: 'activa' }).select('vehicleId assignedTo').lean()
        ]);
        const ownUnits = operations.filter(record => isMySaleOrReservation(record, user)).map(record => record.vehicleId);
        const ownReserved = activeReservations.filter(record => isMySaleOrReservation(record, user)).map(record => record.vehicleId);
        query.$and = [...(query.$and || []), { $or: [
            { status: 'Disponible', sold: { $ne: true }, _id: { $nin: [...operations, ...activeReservations].map(record => record.vehicleId) } },
            { _id: { $in: ownUnits } }, { status: 'Reservado', _id: { $in: ownReserved } }
        ] }];
    }
    const total = await Car.countDocuments(query);
    const cars = await Car.find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)
        .select('brand name model version infoAuto.modelName infoAuto.versionName year plateOrVin price currency km status notes auditLog ownerName ownerPhone').lean();
    const ids = cars.map(c => c._id);
    const [sales, reservations] = await Promise.all([
        Sale.find({ vehicleId: { $in: ids }, status: { $ne: 'cancelada' } }).select('vehicleId status assignedTo salesperson').lean(),
        Reservation.find({ vehicleId: { $in: ids }, status: 'activa' }).populate('clientId', 'fullName firstName phone email dniCuit').lean()
    ]);
    return { cars: cars.map(car => {
        const sale = sales.find(s => idOf(s.vehicleId) === idOf(car._id) && (user?.role !== 'ventas' || isMySaleOrReservation(s, user)));
        const reservation = reservations.find(r => idOf(r.vehicleId) === idOf(car._id) && (user?.role !== 'ventas' || isMySaleOrReservation(r, user)));
        const { auditLog: _auditLog, notes: _notes, ...publicCar } = car;
        return { ...(user?.role === 'ventas' ? sellerVehicleDto(publicCar) : publicCar), pauseReason: car.status === 'Pausado' ? vehiclePauseReason(car) : null,
            canResolvePause: hasPermission(user, PERMISSIONS.STOCK_WRITE),
            activeSale: sale ? { _id: sale._id, status: sale.status } : null,
            reservation: reservation ? { _id: reservation._id, clientId: reservation.clientId,
                depositAmount: reservation.depositAmount, depositCurrency: reservation.depositCurrency,
                agreedPrice: reservation.agreedPrice, agreedCurrency: reservation.agreedCurrency, expiresAt: reservation.expiresAt } : null };
    }), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

// Same commercial rules as the existing Conditions Comerciales editor. No cash movement
// is created here: the deposit remains attached to its reservation and collections use Caja.
export function calculateNewSaleFinancing(input) {
    if (!input?.hasFinancing) return null;
    const cashPrice = amount(input.cashPrice, 'precio al contado');
    const downPayment = amount(input.downPayment || 0, 'entrega inicial');
    if (!cashPrice || downPayment > cashPrice) fail('La entrega inicial debe estar entre cero y el precio al contado.');
    const financedBalance = cashPrice - downPayment;
    const count = Number(input.installmentsCount || 0);
    if (financedBalance > 0 && ![3, 6, 12, 18, 24].includes(count)) fail('La cantidad de cuotas debe ser 3, 6, 12, 18 o 24.');
    const mode = input.calculationMode === 'by_installment' ? 'by_installment' : 'by_rate';
    const custom = amount(input.customInstallmentAmount || input.installmentAmount || 0, 'cuota');
    let interestRate = amount(input.interestRate || 0, 'interés');
    let total = 0, installmentAmount = 0, lastInstallmentAmount = 0, roundingAdjustment = 0;
    if (financedBalance > 0) {
        if (mode === 'by_installment' && custom > 0) {
            total = custom * count;
            if (total < financedBalance) fail('El total de las cuotas no puede ser menor al saldo financiado.');
            installmentAmount = lastInstallmentAmount = custom;
            interestRate = Number((((total - financedBalance) / financedBalance) * 100).toFixed(2));
        } else {
            total = financedBalance * (1 + interestRate / 100);
            installmentAmount = Math.floor(total / count);
            roundingAdjustment = total - installmentAmount * count;
            lastInstallmentAmount = installmentAmount + roundingAdjustment;
        }
    }
    return { hasFinancing: true, cashPrice, downPayment, installmentsCount: financedBalance > 0 ? count : undefined,
        interestRate, financedBalance, interestAmount: Math.max(0, total - financedBalance), totalFinancedWithInterest: total,
        installmentAmount, lastInstallmentAmount, totalOperationPrice: downPayment + total, roundingAdjustment,
        includesDeposit: Boolean(input.includesDeposit), calculationMode: mode,
        customInstallmentAmount: mode === 'by_installment' ? installmentAmount : undefined };
}

const normalizeTradeIns = (items = []) => items.map(item => {
    const brand = String(item.brand || '').trim();
    const model = String(item.model || '').trim();
    const year = Number(item.year);
    if (!brand || !model || !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 2) {
        fail('Completá marca, modelo y año válido de cada permuta.');
    }
    return { brand, model, version: String(item.version || '').trim(), year, plate: String(item.plate || ''),
        mileage: item.mileage === '' ? undefined : item.mileage,
        estimatedValue: amount(item.estimatedValue, 'valor de toma'), currency: item.currency || 'ARS',
        conditionNotes: item.conditionNotes || '', documentationStatus: item.documentationStatus || 'pendiente',
        shouldEnterStock: Boolean(item.shouldEnterStock) };
});
const convertedAmount = (value, from, to, rate) => {
    if (!value || from === to) return value;
    if (!Number.isFinite(rate) || rate <= 0) fail('Indicá el tipo de cambio ARS por USD para aplicar importes en distinta moneda.');
    return from === 'USD' ? value * rate : value / rate;
};

export async function completeSaleAtomic({ payload, user, reservationId = null, request = {} }) {
    assertSellerAssignment(user, payload);
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const actor = user.username || user.name || user.email || 'Admin';
            const actorId = user.id || user.userId || user._id;
            let sellerId = actorId;
            if (payload.assignedTo && idOf(payload.assignedTo) !== idOf(actorId)) {
                if (!hasPermission(user, PERMISSIONS.ASIGNACIONES_WRITE)) fail('No tenés permiso para asignar la venta a otro vendedor.', 403);
                sellerId = payload.assignedTo;
            }
            if (!mongoose.isValidObjectId(sellerId)) fail('No se pudo identificar al vendedor autenticado.', 401);
            const seller = await AdminUser.findOne({ _id: sellerId, active: true }).session(session);
            if (!seller) fail('El vendedor seleccionado no está activo.');
            if (reservationId && !mongoose.isValidObjectId(reservationId)) fail('La reserva indicada no es válida.');
            let reservation = reservationId ? await Reservation.findOne({ _id: reservationId, ...sellerScope(user) }).session(session) : null;
            if (reservationId && !reservation) fail('No se encontró la reserva.', 404);
            if (reservation && payload.vehicleId && idOf(reservation.vehicleId) !== idOf(payload.vehicleId)) fail('La reserva no pertenece al vehículo seleccionado.', 409);
            const vehicleId = reservation?.vehicleId || payload.vehicleId;
            if (!payload.isManualImport && !vehicleId) fail('Seleccioná un vehículo del stock.');
            let vehicle = null;
            if (vehicleId) {
                if (!mongoose.isValidObjectId(vehicleId)) fail('El vehículo indicado no es válido.');
                vehicle = await Car.findById(vehicleId).session(session);
                if (!vehicle) fail('No se encontró el vehículo.', 404);
                const existing = await Sale.findOne({ vehicleId, status: { $ne: 'cancelada' } }).session(session);
                if (existing) fail('Esta unidad ya tiene una venta activa. Podés abrir la operación existente.', 409,
                    user?.role === 'ventas' && !isMySaleOrReservation(existing, user) ? {} : { activeSaleId: existing._id });
                const activeReservations = await Reservation.find({ vehicleId, status: 'activa' }).session(session);
                if (reservation && reservation.status !== 'activa') fail('La reserva ya no está activa.', 409);
                if (activeReservations.length > 1) fail('La unidad tiene varias reservas activas. Resolvé esa inconsistencia antes de vender.', 409);
                if (!reservation && activeReservations.length) {
                    fail('La unidad ahora tiene una reserva. Volvé a seleccionarla para revisar el cliente y la seña antes de confirmar.', 409);
                }
                if (reservation) {
                    if (vehicle.status !== 'Reservado') fail(`La reserva requiere revisar el estado actual de la unidad: ${vehicle.status}.`, 409);
                    if (new Date(reservation.expiresAt).getTime() <= Date.now()) fail('La reserva está vencida. Resolvela antes de convertirla.', 409);
                    if (!reservation.clientId) fail('La reserva debe tener un cliente vinculado antes de convertirla.');
                } else if (vehicle.status === 'Pausado') {
                    if (!hasPermission(user, PERMISSIONS.STOCK_WRITE)) fail('La unidad está pausada. Necesitás autorización de Stock para resolverla.', 403);
                    if (payload.resolvePause !== true || String(payload.pauseResolutionReason || '').trim().length < 5) fail('Confirmá la resolución de la pausa e indicá el motivo antes de vender.', 409);
                } else if (vehicle.status !== 'Disponible') {
                    fail(`La unidad está ${vehicle.status}. Revisá su operación antes de venderla.`, 409);
                }
            }
            const saleCurrency = payload.saleCurrency || reservation?.agreedCurrency;
            if (!['ARS', 'USD'].includes(saleCurrency)) fail('Seleccioná ARS o USD como moneda.');
            let salePrice = amount(payload.salePrice ?? reservation?.agreedPrice, 'precio de venta');
            const status = payload.status || 'confirmada';
            if (!['confirmada', 'pendiente_entrega', 'entregada'].includes(status)) fail('Para confirmar una venta usá estado Activa, Pendiente de entrega o Cerrada.');
            let clientId = reservation?.clientId || payload.clientId;
            if (clientId && !await Client.exists({ _id: clientId }).session(session)) fail('No se encontró el cliente seleccionado.');
            if (!clientId && String(payload.buyerName || '').trim()) {
                const [client] = await Client.create([{ fullName: String(payload.buyerName).trim(), phone: payload.buyerPhone || '',
                    email: payload.buyerEmail || '', dniCuit: payload.buyerDni || '', type: 'comprador', source: 'local' }], { session });
                clientId = client._id;
            }
            const depositAppliedAmount = reservation ? reservation.depositAmount : amount(payload.depositAppliedAmount || 0, 'seña');
            const depositAppliedCurrency = reservation ? reservation.depositCurrency : (payload.depositAppliedCurrency || saleCurrency);
            const exchangeRate = Number(payload.exchangeRate || 0);
            const appliedDeposit = convertedAmount(depositAppliedAmount, depositAppliedCurrency, saleCurrency, exchangeRate);
            const tradeIns = normalizeTradeIns(Array.isArray(payload.tradeIns) ? payload.tradeIns : []);
            const tradeInTotalAmount = roundMoney(tradeIns.reduce((sum, item) => sum + convertedAmount(item.estimatedValue, item.currency, saleCurrency, exchangeRate), 0));
            const financingDetails = calculateNewSaleFinancing(payload.financingDetails);
            if (financingDetails) {
                if (financingDetails.downPayment < appliedDeposit + tradeInTotalAmount) fail('La entrega inicial total debe incluir la seña y las permutas aplicadas.');
                salePrice = financingDetails.totalOperationPrice;
            }
            if (appliedDeposit + tradeInTotalAmount > salePrice) fail('La seña y la permuta no pueden superar el precio total de la venta.');
            const commissionSettings = { ...(payload.commissionSettings || {}) };
            if (commissionSettings.mode === 'percent') {
                const checked = validateCommissionPercent(commissionSettings.percent);
                if (!checked.ok) fail(checked.message);
                commissionSettings.percent = checked.value;
                commissionSettings.base = salePrice;
                commissionSettings.baseCurrency = saleCurrency;
                commissionSettings.extraCurrency = saleCurrency;
                commissionSettings.extraAmount = computeCommissionAmount(salePrice, checked.value);
            }
            const action = reservation ? 'VENTA_CREADA_POR_CONVERSION' : 'VENTA_CREADA_MANUAL';
            const [sale] = await Sale.create([{
                vehicleId: vehicle?._id, reservationId: reservation?._id, clientId: clientId || undefined,
                leadId: reservation?.leadId || payload.leadId || undefined,
                salePrice, saleCurrency, exchangeRate: exchangeRate || undefined,
                paymentMethod: financingDetails?.financedBalance > 0 ? 'financiado' : (payload.paymentMethod || 'contado'),
                salesperson: seller.name || seller.email, assignedTo: seller._id, assignedAt: new Date(),
                saleDate: normalizeSaleDate(payload.saleDate), status, createdBy: actor, notes: payload.notes,
                isManualImport: Boolean(payload.isManualImport), vehicleOwnerName: payload.vehicleOwnerName, vehicleOwnerPhone: payload.vehicleOwnerPhone,
                consignationOwnerId: payload.consignationOwnerId || undefined, consignationManagerId: payload.consignationManagerId || undefined,
                commissionSettings, deliveryItems: payload.deliveryItems, estimatedDeliveryDate: payload.estimatedDeliveryDate || undefined,
                financingDetails, installmentsCount: financingDetails?.installmentsCount || 0,
                depositAppliedAmount, depositAppliedCurrency, tradeIns, tradeInTotalAmount,
                balanceAfterTradeIn: roundMoney(salePrice - appliedDeposit - tradeInTotalAmount),
                saleAuditLog: [{ action, details: reservation ? `Reserva ${reservation._id} convertida; seña aplicada sin generar un nuevo cobro.` : 'Venta confirmada desde Mis Ventas.', user: actor, source: 'CRM_V2' }]
            }], { session });
            if (reservation) {
                reservation.status = 'convertida';
                reservation.updatedBy = actor;
                reservation.reservationAuditLog.push({ action: 'RESERVA_CONVERTIDA_A_VENTA', field: 'status', oldValue: 'activa', newValue: 'convertida', details: `Venta ${sale._id}`, user: actor, source: 'CRM_V2' });
                await reservation.save({ session });
            }
            if (vehicle) {
                const oldStatus = vehicle.status;
                if (oldStatus === 'Pausado') vehicle.auditLog.push({ action: 'ESTADO', field: 'status', oldValue: 'Pausado', newValue: 'Disponible', details: `Pausa resuelta al confirmar venta: ${String(payload.pauseResolutionReason).trim()}`, user: actor, source: 'CRM_V2' });
                vehicle.status = 'Vendido';
                vehicle.sold = true;
                vehicle.soldAt = sale.saleDate;
                vehicle.auditLog.push({ action: 'ESTADO', field: 'status', oldValue: oldStatus === 'Pausado' ? 'Disponible' : oldStatus,
                    newValue: 'Vendido', details: `Venta ${sale._id}; vendedor: ${sale.salesperson}`, user: actor, source: 'CRM_V2' });
                // All concurrent completions write this same document. MongoDB retries a
                // conflicting transaction, whose fresh snapshot then sees the active sale.
                await vehicle.save({ session });
            }
            if (sale.leadId) {
                const lead = await Lead.findById(sale.leadId).session(session);
                if (lead && lead.crmStatus !== 'convertido') {
                    const oldStatus = lead.crmStatus;
                    lead.crmStatus = 'convertido'; lead.lastActivityAt = new Date();
                    lead.leadAuditLog.push({ action: 'VENTA_CREADA', field: 'crmStatus', oldValue: oldStatus, newValue: 'convertido', details: `Venta ${sale._id}`, user: actor, source: 'CRM_V2' });
                    await lead.save({ session });
                }
            }
            if (financingDetails?.installmentsCount) {
                const start = new Date(sale.saleDate); start.setMonth(start.getMonth() + 1);
                const installments = Array.from({ length: financingDetails.installmentsCount }, (_, i) => {
                    const dueDate = new Date(start); dueDate.setMonth(dueDate.getMonth() + i);
                    return { saleId: sale._id, clientId: sale.clientId, vehicleId: sale.vehicleId, installmentNumber: i + 1, dueDate,
                        amount: i === financingDetails.installmentsCount - 1 ? financingDetails.lastInstallmentAmount : financingDetails.installmentAmount,
                        currency: saleCurrency, status: 'pendiente', createdBy: actor,
                        notes: `Cuota ${i + 1} de ${financingDetails.installmentsCount}. Total operación: ${salePrice}`,
                        installmentAuditLog: [{ action: 'PLAN_GENERADO', details: 'Plan generado al confirmar la venta.', user: actor }] };
                });
                await Installment.insertMany(installments, { session });
            }
            await AuditLog.create([{ userId: idOf(actorId), userName: actor, userEmail: user.email, userRole: user.role,
                action: reservation ? 'RESERVA_CONVERTIDA_A_VENTA' : 'VENTA_CREADA', module: 'ventas', entityType: 'Sale', entityId: String(sale._id),
                entityLabel: vehicle ? `${vehicle.brand} ${vehicle.name} ${vehicle.plateOrVin || ''}` : 'Venta histórica manual',
                description: `Venta confirmada por ${saleCurrency} ${salePrice}.`, metadata: { vehicleId: vehicle?._id, reservationId: reservation?._id },
                ip: request.ip, userAgent: request.userAgent }], { session });
            result = sale.toObject();
        });
        return result;
    } catch (error) {
        if (error.code === 20 || /Transaction numbers are only allowed/.test(error.message)) {
            fail('La base de prueba debe ser un replica set para confirmar la venta de forma atómica.', 503);
        }
        throw error;
    } finally { await session.endSession(); }
}

const vehicleSnapshot = car => car ? ({ brand: car.brand, model: car.name, year: car.year, plate: car.plateOrVin,
    price: car.price, currency: car.currency, purchasePrice: car.purchasePrice, purchaseCurrency: car.purchaseCurrency,
    investorPercentage: car.investor?.percentage || 0 }) : null;

// Changing a vehicle uses the same vehicle write conflict as a fresh completion,
// so a replacement and a new sale cannot claim the same unit concurrently.
export async function changeSaleVehicleAtomic({ saleId, payload, user, request = {} }) {
    assertSellerAssignment(user, payload);
    if (!String(payload.reason || '').trim()) fail('El motivo del cambio de vehículo es obligatorio.');
    if (!mongoose.isValidObjectId(payload.newVehicleId)) fail('Debés seleccionar el nuevo vehículo.');
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const sale = await Sale.findOne({ _id: saleId, ...sellerScope(user) }).session(session);
            if (!sale) fail('Venta no encontrada.', 404);
            if (sale.status === 'cancelada') fail('No se puede cambiar de vehículo en una venta cancelada.');
            const newCar = await Car.findById(payload.newVehicleId).session(session);
            if (!newCar) fail('El nuevo vehículo no existe.', 404);
            if (idOf(sale.vehicleId) === idOf(newCar._id)) fail('El vehículo seleccionado es el mismo que ya está asignado a la venta.');
            const existing = await Sale.findOne({ vehicleId: newCar._id, _id: { $ne: sale._id }, status: { $ne: 'cancelada' } }).session(session);
            if (existing) fail(`El vehículo ${newCar.brand} ${newCar.name} ya está asignado a otra venta activa.`, 409,
                user?.role === 'ventas' && !isMySaleOrReservation(existing, user) ? {} : { activeSaleId: existing._id });
            if (newCar.status !== 'Disponible') fail(`La unidad está ${newCar.status}. Resolvé su estado antes de cambiarla.`, 409);
            if (await Reservation.exists({ vehicleId: newCar._id, status: 'activa' }).session(session)) fail('La unidad tiene una reserva activa. Resolvela antes de cambiarla.', 409);
            const actor = user.name || user.email || user.username || 'Admin';
            const reason = String(payload.reason).trim();
            const previousVehicleId = sale.vehicleId;
            const oldCar = previousVehicleId ? await Car.findById(previousVehicleId).session(session) : null;
            const previousVehicleSnapshot = vehicleSnapshot(oldCar);
            if (oldCar) {
                oldCar.status = 'Disponible'; oldCar.sold = false; oldCar.soldAt = undefined;
                oldCar.auditLog.push({ action: 'ESTADO', field: 'status', oldValue: 'Vendido', newValue: 'Disponible', justification: reason,
                    details: `Desvinculado de la venta ${sale._id} por cambio de vehículo. Motivo: ${reason}`, user: actor, date: new Date() });
                await oldCar.save({ session });
            }
            const targetStatus = sale.status === 'señado' ? 'Reservado' : 'Vendido';
            newCar.status = targetStatus; newCar.sold = targetStatus === 'Vendido'; newCar.soldAt = newCar.sold ? sale.saleDate : undefined;
            newCar.auditLog.push({ action: 'ESTADO', field: 'status', oldValue: 'Disponible', newValue: targetStatus, justification: reason,
                details: `Asignado a la venta ${sale._id} en reemplazo de vehículo anterior. Motivo: ${reason}`, user: actor, date: new Date() });
            await newCar.save({ session });
            sale.vehicleId = newCar._id; sale.updatedBy = actor;
            sale.vehicleChangeHistory.push({ date: new Date(), user: actor, reason, previousVehicleId: previousVehicleId || newCar._id,
                previousVehicleSnapshot, newVehicleId: newCar._id, newVehicleSnapshot: vehicleSnapshot(newCar),
                documentsChecklist: Array.isArray(payload.documentsChecklist) ? payload.documentsChecklist : [], notes: String(payload.notes || '').trim() });
            sale.saleAuditLog.push({ action: 'CAMBIO_VEHICULO', field: 'vehicleId', oldValue: previousVehicleId ? idOf(previousVehicleId) : null,
                newValue: idOf(newCar._id), details: `Cambio de vehículo por ${newCar.brand} ${newCar.name} (${newCar.plateOrVin || 'Sin patente'}). Motivo: ${reason}`,
                user: actor, date: new Date(), source: 'CRM_V2' });
            await Installment.updateMany({ saleId: sale._id }, { $set: { vehicleId: newCar._id } }, { session });
            await sale.save({ session });
            await AuditLog.create([{ userId: idOf(user.id || user.userId || user._id), userName: actor, userEmail: user.email, userRole: user.role,
                action: 'VENTA_CAMBIO_VEHICULO', module: 'ventas', entityType: 'Sale', entityId: idOf(sale._id), entityLabel: 'Venta',
                description: `Se cambió el vehículo de la venta a ${newCar.brand} ${newCar.name}. Motivo: ${reason}`,
                metadata: { previousVehicleId, newVehicleId: newCar._id, reason }, ip: request.ip, userAgent: request.userAgent }], { session });
            result = { _id: sale._id, vehicleLabel: `${newCar.brand} ${newCar.name}` };
        });
        return result;
    } finally { await session.endSession(); }
}
