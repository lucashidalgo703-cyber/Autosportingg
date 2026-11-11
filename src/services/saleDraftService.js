import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Car from '../models/Car.js';
import Client from '../models/Client.js';
import Lead from '../models/Lead.js';
import { parseDecimal, roundMoney } from '../utils/saleCommercial.js';
import { normalizeSaleWorkspace, saleTradeInComposition, saleDateInput } from '../utils/saleWorkspace.js';
import { enterSaleTradeIns, validateSaleDepositAccounts } from './saleWorkspaceService.js';

const INITIAL_STATUSES = ['borrador', 'señado', 'confirmada', 'pendiente_entrega', 'entregada', 'cancelada'];
const REFERENCE_FIELDS = ['vehicleId', 'clientId', 'leadId', 'consignationOwnerId', 'consignationManagerId'];
const EDITABLE_FIELDS = [
    ...REFERENCE_FIELDS, 'salesperson', 'saleDate', 'vehicleOwnerName', 'vehicleOwnerPhone',
    'commissionSettings', 'deliveryItems', 'installmentsCount', 'financingDetails', 'notes',
    'estimatedDeliveryDate', 'depositAppliedCurrency', 'paymentMethod'
];
const SNAPSHOT_LIMITS = { buyerName: 300, buyerPhone: 100, buyerEmail: 320, buyerDni: 100, mileage: 30, notes: 20000 };

export class SaleDraftError extends Error {
    constructor(message, code = 'SALE_VALIDATION_FAILED', statusCode = 400) {
        super(message);
        this.name = 'SaleDraftError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

const money = (value, fallback, label) => {
    if (value === undefined) return fallback;
    const parsed = value === '' || value === null ? 0 : parseDecimal(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new SaleDraftError(`${label} debe ser un importe válido mayor o igual a cero.`);
    return roundMoney(parsed);
};

export function normalizeSaleDraftInput(payload, current = null) {
    const values = {};
    for (const key of EDITABLE_FIELDS) {
        if (Object.hasOwn(payload, key)) values[key] = payload[key];
    }
    for (const key of REFERENCE_FIELDS) {
        if (!Object.hasOwn(values, key)) continue;
        if (values[key] === '' || values[key] === null) values[key] = null;
        else if (!mongoose.isValidObjectId(values[key])) throw new SaleDraftError(`Referencia inválida: ${key}.`);
    }
    const manualImport = Object.hasOwn(payload, 'isManualImport') ? payload.isManualImport === true : Boolean(current?.isManualImport);
    const vehicleId = Object.hasOwn(values, 'vehicleId') ? values.vehicleId : current?.vehicleId;
    const status = manualImport ? 'entregada' : (payload.status || current?.status || (vehicleId ? 'confirmada' : 'borrador'));
    if (!INITIAL_STATUSES.includes(status)) throw new SaleDraftError('Elegí un estado válido para la operación.');
    const currency = payload.saleCurrency || current?.saleCurrency || (status === 'borrador' ? 'USD' : undefined);
    if (!['ARS', 'USD'].includes(currency)) throw new SaleDraftError('Indicá la moneda de la operación (ARS o USD).');
    const price = money(payload.salePrice, current?.salePrice ?? (status === 'borrador' ? 0 : NaN), 'El precio');
    if (!Number.isFinite(price)) throw new SaleDraftError('Ingresá el precio de venta.');
    values.salePrice = price;
    values.saleCurrency = currency;
    values.depositAppliedAmount = money(payload.depositAppliedAmount, current?.depositAppliedAmount ?? 0, 'La seña');
    values.status = status;
    values.isManualImport = manualImport;
    values.historicalOnly = manualImport;
    if (status === 'cancelada') {
        if (typeof payload.initialCancellationReason !== 'string' || !payload.initialCancellationReason.trim() || payload.initialCancellationReason.length > 5000) throw new SaleDraftError('Indicá un motivo para registrar la operación inicialmente cancelada.');
        values.cancellationReason = payload.initialCancellationReason.trim(); values.cancellationKind = 'cancelada'; values.cancelledAt = new Date();
    }
    if (values.commissionSettings) {
        const settings = values.commissionSettings;
        if (typeof settings !== 'object' || Array.isArray(settings)) throw new SaleDraftError('Revisá la comisión.');
        for (const key of ['sellerPct', 'consignationPct']) if (settings[key] !== undefined && (!Number.isFinite(Number(settings[key])) || Number(settings[key]) < 0 || Number(settings[key]) > 100)) throw new SaleDraftError('Los porcentajes de comisión deben estar entre 0 y 100.');
    }
    if (values.paymentMethod === '' || values.paymentMethod === null) values.paymentMethod = 'contado';
    if (!current && !values.paymentMethod) values.paymentMethod = 'contado';
    if (values.estimatedDeliveryDate === '') values.estimatedDeliveryDate = null;

    if (Object.hasOwn(payload, 'draftData')) {
        if (!payload.draftData || typeof payload.draftData !== 'object' || Array.isArray(payload.draftData)) {
            throw new SaleDraftError('Los datos del borrador no son válidos.');
        }
        values.draftData = {};
        for (const [key, limit] of Object.entries(SNAPSHOT_LIMITS)) {
            if (!Object.hasOwn(payload.draftData, key)) continue;
            const value = payload.draftData[key];
            if (typeof value !== 'string' || value.length > limit) throw new SaleDraftError(`Revisá el campo ${key} del borrador.`);
            values.draftData[key] = value;
        }
        if (Object.hasOwn(payload.draftData, 'hasTradeIn')) {
            if (typeof payload.draftData.hasTradeIn !== 'boolean') throw new SaleDraftError('Revisá la indicación de permuta.');
            values.draftData.hasTradeIn = payload.draftData.hasTradeIn;
        }
    }
    if (values.saleDate) values.saleDate = saleDateInput(values.saleDate, 'saleDate');
    const extra = normalizeSaleWorkspace(payload, current?.toObject?.() || current || {});
    delete extra.managementNote;
    Object.assign(values, extra);
    return values;
}

async function checkReferences(values, session) {
    for (const [field, Model, label] of [
        ['vehicleId', Car, 'vehículo'], ['clientId', Client, 'cliente'], ['leadId', Lead, 'lead']
    ]) {
        if (!values[field]) continue;
        const query = Model.exists({ _id: values[field] });
        if (session) query.session(session);
        if (!await query) throw new SaleDraftError(`No se encontró el ${label} vinculado.`, 'SALE_REFERENCE_NOT_FOUND');
    }
}

// No crea cuotas, movimientos, expedientes externos ni mensajes. La activación
// modifica venta + stock + lead en una transacción: no hay estados intermedios publicados.
export async function saveSaleOperation({ payload, saleId = null, actor = 'Admin', canWriteStock = false, canCancel = false }) {
    const initial = saleId ? await Sale.findById(saleId) : null;
    if (saleId && !initial) throw new SaleDraftError('Venta no encontrada.', 'SALE_NOT_FOUND', 404);
    if (initial && initial.status !== 'borrador') throw new SaleDraftError('La operación ya salió de borrador. Actualizá la ficha.', 'SALE_DRAFT_CHANGED', 409);
    const initialValues = normalizeSaleDraftInput(payload, initial);
    if (initialValues.status === 'cancelada' && !canCancel) throw new SaleDraftError('Necesitás permiso de cancelación para registrar una operación inicialmente cancelada.', 'SALE_CANCELLATION_PERMISSION_REQUIRED', 403);
    if (initialValues.status === 'entregada' && !initialValues.isManualImport) throw new SaleDraftError('Para cerrar una venta operativa, creala activa y usá el circuito de entrega de la ficha. Si es una venta anterior, usá Carga manual histórica.', 'SALE_INITIAL_CLOSURE_WORKFLOW_REQUIRED', 409);

    const persist = async (session = null) => {
        const current = saleId ? await Sale.findById(saleId).session(session) : null;
        if (saleId && (!current || current.status !== 'borrador')) {
            throw new SaleDraftError('El borrador cambió. Actualizá la ficha antes de continuar.', 'SALE_DRAFT_CHANGED', 409);
        }
        const values = normalizeSaleDraftInput(payload, current);
        const snapshot = current?.toObject() || {};
        const candidate = new Sale({ ...snapshot, ...values, createdBy: current?.createdBy || actor, updatedBy: actor });
        await candidate.validate();
        await checkReferences(candidate, session);
        await validateSaleDepositAccounts(candidate, session);
        const activatesStock = !['borrador', 'cancelada'].includes(values.status) && !values.isManualImport;
        if (values.status === 'cancelada') { values.cancelledBy = actor; candidate.cancelledBy = actor; }

        if (activatesStock) {
            if (!canWriteStock && candidate.tradeIns.some(row => row.shouldEnterStock && !row.linkedStockCarId)) throw new SaleDraftError('Necesitás permiso de edición de Stock para ingresar una permuta.', 'SALE_STOCK_PERMISSION_REQUIRED', 403);
            if (!candidate.vehicleId) throw new SaleDraftError('Seleccioná un vehículo disponible para activar la venta.', 'SALE_VEHICLE_REQUIRED');
            const conflict = await Sale.exists({
                _id: { $ne: candidate._id }, vehicleId: candidate.vehicleId,
                status: { $nin: ['borrador', 'cancelada'] }, historicalOnly: { $ne: true }
            }).session(session);
            if (conflict) throw new SaleDraftError('El vehículo ya tiene una operación activa.', 'SALE_VEHICLE_UNAVAILABLE', 409);
            const target = values.status === 'señado' ? 'Reservado' : 'Vendido';
            const claimedCar = await Car.findOneAndUpdate({ _id: candidate.vehicleId, status: 'Disponible' }, {
                $set: { status: target },
                $push: { auditLog: {
                    action: 'ESTADO', field: 'status', oldValue: 'Disponible', newValue: target,
                    details: `Operación ${candidate._id} activada desde ${current ? 'borrador' : 'alta'}`,
                    user: actor, source: 'CRM_V2'
                } }
            }, { new: true, runValidators: true, session });
            if (!claimedCar) throw new SaleDraftError('El vehículo ya no está disponible. El borrador se conserva.', 'SALE_VEHICLE_UNAVAILABLE', 409);
            await enterSaleTradeIns({ sale: candidate, session, actor });
            values.tradeIns = candidate.tradeIns.map(row => row.toObject());
        }
        const composition = saleTradeInComposition(candidate);
        candidate.tradeInTotalAmount = values.tradeInTotalAmount = composition.credit;
        candidate.balanceAfterTradeIn = values.balanceAfterTradeIn = composition.balance;

        const event = {
            action: values.status === 'borrador' ? (current ? 'BORRADOR_ACTUALIZADO' : 'BORRADOR_CREADO') : values.status === 'cancelada' ? 'VENTA_CANCELADA_CREADA' : (values.isManualImport ? 'VENTA_HISTORICA_CREADA' : 'VENTA_ACTIVADA'),
            field: 'status', oldValue: current?.status || null, newValue: values.status,
            details: values.status === 'borrador' ? 'Borrador guardado sin afectar stock ni caja.' : values.status === 'cancelada' ? `Operación inicialmente cancelada, sin efectos en stock o caja. Motivo: ${values.cancellationReason}` : (values.isManualImport ? 'Carga histórica sin efectos sobre stock ni caja.' : 'Operación activada; no acredita dinero en caja.'),
            user: actor, source: 'CRM_V2'
        };
        let saved;
        if (current) {
            saved = await Sale.findOneAndUpdate({ _id: current._id, status: 'borrador', __v: current.__v ?? 0 }, {
                $set: { ...values, updatedBy: actor }, $inc: { __v: 1 }, $push: { saleAuditLog: event }
            }, { new: true, runValidators: true, session });
            if (!saved) throw new SaleDraftError('Otro usuario actualizó el borrador. Volvé a abrirlo.', 'SALE_DRAFT_CHANGED', 409);
        } else {
            candidate.saleAuditLog = [event];
            saved = await candidate.save({ session });
        }
        if (activatesStock && saved.leadId) {
            await Lead.updateOne({ _id: saved.leadId, crmStatus: { $ne: 'convertido' } }, {
                $set: { crmStatus: 'convertido', lastActivityAt: new Date() },
                $push: { leadAuditLog: { action: 'VENTA_CREADA', field: 'crmStatus', newValue: 'convertido', details: `Operación ${saved._id} activada`, user: actor, source: 'CRM_V2' } }
            }, { session });
        }
        return saved;
    };

    if (['borrador', 'cancelada'].includes(initialValues.status) || initialValues.isManualImport) return persist();
    try {
        return await mongoose.connection.transaction(session => persist(session));
    } catch (error) {
        if (error?.code === 20 || /Transaction numbers are only allowed|replica set/i.test(error?.message || '')) {
            throw new SaleDraftError('La activación necesita una conexión MongoDB con transacciones. El borrador no se modificó.', 'SALE_TRANSACTIONS_REQUIRED', 503);
        }
        throw error;
    }
}
