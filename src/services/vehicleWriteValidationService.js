import Car from '../models/Car.js';
import Reservation from '../models/Reservation.js';
import Sale from '../models/Sale.js';
import Account from '../models/Account.js';
import mongoose from 'mongoose';
import { normalizeVehicleIdentifier, vehicleIdentifierPattern } from '../utils/vehicleValidation.js';

// Deliberately no unique index or migration: legacy duplicate stock needs a separate review.
// This catches an already registered active identity; simultaneous writes are not serialized.
export async function findVehicleIdentityConflict(input, current = null) {
    const status = input.status ?? current?.status ?? 'Disponible';
    const inactive = value => ['vendido', 'cancelado', 'eliminado'].includes(String(value || '').trim().toLowerCase());
    if (inactive(status)) return null;
    const reactivating = current && inactive(current.status);
    for (const field of ['plateOrVin', 'chassisNumber']) {
        if (!Object.hasOwn(input, field) && !reactivating) continue;
        const value = Object.hasOwn(input, field) ? input[field] : current[field];
        const normalized = normalizeVehicleIdentifier(value);
        if (!normalized || (current && !reactivating && normalized === normalizeVehicleIdentifier(current[field]))) continue;
        const pattern = vehicleIdentifierPattern(value);
        const candidate = await Car.findOne({
            ...(current?._id ? { _id: { $ne: current._id } } : {}),
            status: { $nin: [/^vendido$/i, /^cancelado$/i, /^eliminado$/i] },
            $or: [{ plateOrVin: pattern }, { chassisNumber: pattern }],
        }).select('_id').lean();
        if (candidate) {
            const message = field === 'plateOrVin' ? 'La patente/VIN ya está registrada en otra unidad activa.' : 'El chasis/VIN ya está registrado en otra unidad activa.';
            return { message, code: 'VEHICLE_IDENTITY_CONFLICT', errors: { [field]: message } };
        }
    }
    return null;
}

export async function findVehicleStateConflict(input, current) {
    const statusChanged = Object.hasOwn(input, 'status') && input.status !== current.status;
    const soldChanged = Object.hasOwn(input, 'sold') && input.sold !== Boolean(current.sold);
    if (!statusChanged && !soldChanged) return null;
    const [reservation, sale] = await Promise.all([
        Reservation.exists({ vehicleId: current._id, status: 'activa' }),
        Sale.exists({ vehicleId: current._id, status: { $in: ['señado', 'confirmada', 'pendiente_entrega', 'entregada', 'activa', 'reservada', 'cerrada'] }, historicalOnly: { $ne: true } }),
    ]);
    if (!reservation && !sale) return null;
    const message = 'El estado está vinculado a una reserva o venta. Actualizá la operación desde su circuito para conservar la disponibilidad del stock.';
    return { message, code: 'VEHICLE_STATE_CONFLICT', errors: { status: message } };
}

export async function findVehiclePurchasePaymentError(input) {
    const payment = input.purchasePayment;
    if (!input.agencyOwned || !payment) return null;
    const cost = Number(input.purchasePrice) || 0;
    const currency = input.purchaseCurrency === 'ARS' ? 'ARS' : 'USD';
    const percentage = Number(input.investor?.percentage) || 0;
    const agencyCost = percentage > 0 ? Math.round(cost * ((100 - percentage) / 100)) : cost;
    const error = (field, message) => ({ message, code: 'VEHICLE_VALIDATION', errors: { [`purchasePayment.${field}`]: message } });
    let amountPaid = 0;
    if (payment.modality === 'pagar_ahora') amountPaid = agencyCost;
    if (payment.modality === 'pago_parcial') {
        amountPaid = Number(payment.amountPaid);
        if (!Number.isFinite(amountPaid) || amountPaid <= 0 || amountPaid > agencyCost) return error('amountPaid', 'El abono parcial debe ser mayor que cero y no superar la parte del costo que corresponde a la agencia.');
    }
    if (amountPaid <= 0) return null;
    if (!mongoose.isValidObjectId(payment.accountId)) return error('accountId', 'Seleccioná una cuenta válida para registrar el pago de compra.');
    const account = await Account.findById(payment.accountId).select('currency isActive').lean();
    if (!account || account.isActive === false) return error('accountId', 'Seleccioná una cuenta activa para registrar el pago de compra.');
    if (account.currency !== currency) return error('accountId', `La cuenta del pago debe estar expresada en ${currency}, la moneda de compra/toma.`);
    return null;
}
