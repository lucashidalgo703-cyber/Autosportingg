import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Car from '../models/Car.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import FinanceManualEntry from '../models/FinanceManualEntry.js';
import { normalizeSaleWorkspace, saleTradeInComposition, SaleWorkspaceError, saleDateInput } from '../utils/saleWorkspace.js';
import { normalizeSaleDraftInput } from './saleDraftService.js';
import { computeCommissionAmount } from '../utils/saleCommercial.js';
import { vehicleIdentifierPattern } from '../utils/vehicleValidation.js';

export async function validateSaleDepositAccounts(sale, session) {
    for (let i = 0; i < (sale.depositRecords || []).length; i++) {
        const row = sale.depositRecords[i]; if (!row.accountId || row.status !== 'pendiente') continue;
        if (!await Account.exists({ _id: row.accountId, isActive: true, currency: row.currency }).session(session || null)) throw new SaleWorkspaceError(`depositRecords.${i}.accountId`, 'Elegí una caja activa de la misma moneda que la seña.');
    }
}

export async function enterSaleTradeIns({ sale, session, actor }) {
    for (const tradeIn of sale.tradeIns || []) {
        if (!tradeIn.shouldEnterStock || tradeIn.linkedStockCarId) continue;
        if (tradeIn.existingStockCarId) {
            if (String(tradeIn.existingStockCarId) === String(sale.vehicleId)) throw new SaleWorkspaceError('tradeIns', 'El vehículo vendido no puede ser su propia permuta.');
            const car = await Car.findById(tradeIn.existingStockCarId).session(session);
            if (!car || !['Disponible', 'Pausado'].includes(car.status) || car.tradeInOrigin?.saleId) throw new SaleWorkspaceError('tradeIns', 'La unidad del stock ya no admite esta vinculación.', 409);
            if (await Sale.exists({ _id: { $ne: sale._id }, vehicleId: car._id, status: { $nin: ['borrador', 'cancelada'] }, historicalOnly: { $ne: true } }).session(session)) throw new SaleWorkspaceError('tradeIns', 'La unidad del stock tiene otra operación.', 409);
            const existingCost = car.tradeInOrigin?.value ?? car.purchasePrice;
            if (existingCost != null && (Number(existingCost) !== Number(tradeIn.estimatedValue) || car.purchaseCurrency !== tradeIn.currency)) throw new SaleWorkspaceError('tradeIns', 'El valor de toma y su moneda deben coincidir con el costo de Stock. Corregí la unidad primero.', 409);
            const linkedAt = new Date();
            const linked = await Car.updateOne({ _id: car._id, __v: car.__v ?? 0, status: car.status, 'tradeInOrigin.saleId': null }, { $set: { tradeInOrigin: { saleId: sale._id, tradeInId: tradeIn._id, value: tradeIn.estimatedValue, currency: tradeIn.currency, consigned: !car.agencyOwned, agencyOwned: Boolean(car.agencyOwned), linkedAt, linkedBy: actor, source: 'sale_flow' } }, $inc: { __v: 1 }, $push: { auditLog: { action: 'VINCULO_PERMUTA', details: `Vinculada a venta ${sale._id}, sin modificar costos ni caja.`, user: actor, source: 'CRM_V2' } } }, { session });
            if (!linked.modifiedCount) throw new SaleWorkspaceError('tradeIns', 'La unidad cambió. Volvé a seleccionarla.', 409);
            tradeIn.linkedStockCarId = car._id; tradeIn.enteredStockAt = linkedAt; tradeIn.consigned = !car.agencyOwned;
            continue;
        }
        if (!tradeIn.fuel || !tradeIn.condition) throw new SaleWorkspaceError('tradeIns', 'Completá combustible y condición para ingresar la permuta al stock.');
        const identities = [tradeIn.plate, tradeIn.vin].map(vehicleIdentifierPattern).filter(Boolean);
        if (identities.length && await Car.exists({ $and: [{ $or: [{ _id: sale.vehicleId }, { status: { $nin: [/^vendido$/i, /^cancelado$/i, /^eliminado$/i] } }] }, { $or: identities.flatMap(pattern => [{ plateOrVin: pattern }, { chassisNumber: pattern }]) }] }).session(session)) throw new SaleWorkspaceError('tradeIns', 'La patente o chasis ya está registrada en Stock. El vehículo vendido no puede ser su propia permuta; para otra unidad seleccioná la existente.', 409, 'VEHICLE_IDENTITY_CONFLICT');
        const now = new Date();
        const [car] = await Car.create([{
            brand: tradeIn.brand, name: tradeIn.model, version: tradeIn.version,
            year: tradeIn.year, km: tradeIn.mileage ?? 0, fuel: tradeIn.fuel, condition: tradeIn.condition,
            price: tradeIn.askingPrice ?? tradeIn.estimatedValue, currency: tradeIn.currency === 'USD' ? 'U$S' : '$',
            plateOrVin: tradeIn.plate, color: tradeIn.color, engineNumber: tradeIn.engineNumber, chassisNumber: tradeIn.vin,
            location: tradeIn.location || undefined, ownerName: tradeIn.ownerName, agencyOwned: !tradeIn.consigned,
            purchasePrice: tradeIn.estimatedValue, purchaseCurrency: tradeIn.currency,
            status: 'Pausado', visibleEnWeb: false,
            tradeInOrigin: { saleId: sale._id, tradeInId: tradeIn._id, value: tradeIn.estimatedValue, currency: tradeIn.currency, agencyOwned: !tradeIn.consigned, consigned: Boolean(tradeIn.consigned), linkedAt: now, linkedBy: actor, source: 'sale_flow' },
            purchasePaymentState: { modality: 'ya_pagado_historico', status: 'no_aplica', totalCost: tradeIn.estimatedValue, amountPaid: 0, pendingDebt: 0, currency: tradeIn.currency, commitNotes: 'Recibido en parte de pago. Esta vinculación no registra un ingreso o egreso de caja.' },
            auditLog: [{ action: 'ALTA_PERMUTA', user: actor, details: `Recibido en venta ${sale._id}; pendiente de publicación. Sin movimiento de caja.`, source: 'CRM_V2' }]
        }], { session });
        tradeIn.linkedStockCarId = car._id; tradeIn.enteredStockAt = now; tradeIn.receivedAt ||= now; tradeIn.receivedBy ||= actor;
    }
}

// Editor comercial: no cambia el estado, no procesa cuotas ni registra dinero.
// Los cambios de precio con obligaciones reales siguen el editor financiero existente.
export async function saveSaleWorkspace({ saleId, payload, actor = 'Admin', canWriteStock = false }) {
    if (!/^[a-f\d]{24}$/i.test(String(saleId))) throw new SaleWorkspaceError('saleId', 'Venta inválida.');
    try {
        return await mongoose.connection.transaction(async session => {
            const sale = await Sale.findById(saleId).session(session);
            if (!sale) throw new SaleWorkspaceError('saleId', 'Venta no encontrada.', 404, 'SALE_NOT_FOUND');
            if (sale.status === 'borrador') throw new SaleWorkspaceError('status', 'Continuá el borrador desde su formulario.', 409, 'SALE_DRAFT_CHANGED');
            if (sale.status === 'cancelada') throw new SaleWorkspaceError('status', 'La venta cancelada conserva su historial y no se edita.', 409);
            if (payload.status && payload.status !== sale.status) throw new SaleWorkspaceError('status', 'Cambiá el estado desde la ficha de la venta.', 409);
            if (payload.vehicleId && String(payload.vehicleId) !== String(sale.vehicleId || '')) throw new SaleWorkspaceError('vehicleId', 'Usá Cambiar vehículo para conservar su historial.', 409);
            if (Object.hasOwn(payload, 'clientId') && String(payload.clientId || '') !== String(sale.clientId || '')) throw new SaleWorkspaceError('clientId', 'Usá Vincular cliente desde la ficha completa.', 409);
            const values = normalizeSaleDraftInput({ ...payload, status: sale.status, isManualImport: Boolean(sale.isManualImport) }, sale);
            const extra = normalizeSaleWorkspace(payload, sale.toObject());
            delete values.status; delete values.historicalOnly; delete values.isManualImport;
            delete values.depositAppliedAmount; delete values.depositAppliedCurrency;
            delete values.vehicleId; delete values.clientId; delete values.leadId;
            delete values.financingDetails; delete values.installmentsCount;
            if (values.saleDate) values.saleDate = saleDateInput(values.saleDate, 'saleDate');
            const changingPrice = values.salePrice !== sale.salePrice || values.saleCurrency !== sale.saleCurrency;
            if (changingPrice && (sale.externalBuyerPayments?.length || sale.buyerBalanceAdjustments?.length)) throw new SaleWorkspaceError('salePrice', 'La venta tiene pagos externos o constancias de saldo. Conservá precio y moneda para mantener sus créditos auditados.', 409, 'SALE_BUYER_CREDITS_PROTECTED');
            if (changingPrice && (sale.financingDetails?.hasFinancing || await Installment.exists({ saleId: sale._id }).session(session) || await Transaction.exists({ saleId: sale._id, status: 'activo' }).session(session))) throw new SaleWorkspaceError('salePrice', 'Esta venta tiene cuotas o cobros. Corregí el precio desde su ficha financiera para conciliar las obligaciones.', 409, 'SALE_FINANCIAL_EDIT_REQUIRED');
            if (!canWriteStock && (extra.tradeIns || []).some(row => row.shouldEnterStock && !row.linkedStockCarId)) throw new SaleWorkspaceError('tradeIns', 'Necesitás permiso de edición de Stock para ingresar una permuta.', 403);
            const note = extra.managementNote; delete extra.managementNote;
            if (values.commissionSettings) {
                values.commissionSettings = { ...(sale.commissionSettings?.toObject?.() || sale.commissionSettings || {}), ...values.commissionSettings };
                if (values.commissionSettings.mode === 'percent') {
                    const percent = Number(values.commissionSettings.percent);
                    if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new SaleWorkspaceError('commissionSettings.percent', 'El porcentaje debe estar entre 0 y 100.');
                    values.commissionSettings.extraAmount = computeCommissionAmount(values.salePrice, percent);
                    values.commissionSettings.base = values.salePrice; values.commissionSettings.extraCurrency = values.saleCurrency; values.commissionSettings.baseCurrency = values.saleCurrency;
                }
            }
            sale.set({ ...values, ...extra, updatedBy: actor });
            if (note) sale.managementNotes.push({ ...note, author: actor, date: new Date() });
            await validateSaleDepositAccounts(sale, session);
            if (!sale.historicalOnly) await enterSaleTradeIns({ sale, session, actor });
            const composition = saleTradeInComposition(sale);
            sale.tradeInTotalAmount = composition.credit; sale.balanceAfterTradeIn = composition.balance;
            sale.saleAuditLog.push({ action: 'FICHA_COMERCIAL_EDITADA', details: 'Datos comerciales actualizados. Sin cambio de estado ni movimiento de caja.', user: actor, source: 'CRM_V2' });
            sale.$where = { __v: sale.__v ?? 0, status: sale.status };
            sale.increment(); await sale.save({ session });
            return sale;
        });
    } catch (error) {
        if (error?.name === 'DocumentNotFoundError' || error?.name === 'VersionError') throw new SaleWorkspaceError('saleId', 'La venta cambió. Volvé a abrirla antes de guardar.', 409, 'SALE_CHANGED');
        if (error?.code === 20 || /Transaction numbers are only allowed|replica set/i.test(error?.message || '')) throw new SaleWorkspaceError('saleId', 'La edición requiere MongoDB con transacciones. No se guardaron cambios.', 503, 'SALE_TRANSACTIONS_REQUIRED');
        throw error;
    }
}

export async function changeSaleWorkspaceStatus({ saleId, status, reason, cancellationKind, actor = 'Admin', role = '', canCancel = false }) {
    if (!/^[a-f\d]{24}$/i.test(String(saleId))) throw new SaleWorkspaceError('saleId', 'Venta inválida.');
    if (!['señado', 'confirmada', 'entregada', 'cancelada'].includes(status)) throw new SaleWorkspaceError('status', 'Elegí un estado válido.');
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 5000) throw new SaleWorkspaceError('reason', 'Indicá el motivo del cambio de estado.');
    if (status === 'cancelada' && !canCancel) throw new SaleWorkspaceError('status', 'No tenés permiso para cancelar ventas.', 403);
    return mongoose.connection.transaction(async session => {
        const sale = await Sale.findById(saleId).session(session);
        if (!sale) throw new SaleWorkspaceError('saleId', 'Venta no encontrada.', 404);
        if (sale.historicalOnly || ['borrador', 'cancelada'].includes(sale.status)) throw new SaleWorkspaceError('status', 'Esta operación no admite cambios de estado desde este circuito.', 409);
        if (sale.status === status) return sale;
        if (sale.status === 'entregada' && status !== 'cancelada') throw new SaleWorkspaceError('status', 'Una venta cerrada conserva su cierre. Revisá la operación antes de anularla.', 409);
        if (status === 'cancelada' && !['owner', 'admin'].includes(role) && (await Installment.exists({ saleId }).session(session) || await Transaction.exists({ saleId }).session(session))) throw new SaleWorkspaceError('status', 'La venta tiene cuotas o movimientos. Requiere un administrador.', 403);
        if (status !== 'cancelada' && sale.vehicleId) {
            if (await Sale.exists({ _id: { $ne: sale._id }, vehicleId: sale.vehicleId, status: { $nin: ['borrador', 'cancelada'] }, historicalOnly: { $ne: true } }).session(session)) throw new SaleWorkspaceError('vehicleId', 'Otra operación reclama esta unidad. Revisá los vínculos.', 409);
            const target = status === 'señado' ? 'Reservado' : 'Vendido';
            const changed = await Car.updateOne({ _id: sale.vehicleId, status: { $in: ['Vendido', 'Reservado'] } }, { $set: { status: target }, $inc: { __v: 1 }, $push: { auditLog: { action: 'ESTADO_VENTA', newValue: target, details: `Venta ${sale._id}: ${reason.trim()}`, user: actor, source: 'CRM_V2' } } }, { session });
            if (!changed.matchedCount) throw new SaleWorkspaceError('vehicleId', 'El estado de Stock cambió. Revisá la unidad antes de continuar.', 409);
        }
        const oldStatus = sale.status; sale.status = status; sale.updatedBy = actor;
        if (status === 'cancelada') { sale.cancelledAt = new Date(); sale.cancelledBy = actor; sale.cancellationReason = reason.trim(); sale.cancellationKind = cancellationKind === 'caida' ? 'caida' : 'cancelada'; }
        sale.saleAuditLog.push({ action: 'CAMBIO_ESTADO', field: 'status', oldValue: oldStatus, newValue: status, details: `${reason.trim()}${status === 'cancelada' ? ' · No revierte caja ni libera stock automáticamente.' : ''}`, user: actor, source: 'CRM_V2' });
        sale.$where = { __v: sale.__v ?? 0, status: oldStatus }; sale.increment(); await sale.save({ session }); return sale;
    });
}

export async function confirmSaleDeposit({ saleId, depositId, transactionId, actor = 'Admin' }) {
    for (const [key, value] of Object.entries({ saleId, depositId, transactionId })) if (!/^[a-f\d]{24}$/i.test(String(value))) throw new SaleWorkspaceError(key, 'La referencia no es válida.');
    return mongoose.connection.transaction(async session => {
        const sale = await Sale.findById(saleId).session(session);
        if (!sale || sale.historicalOnly || ['borrador', 'cancelada'].includes(sale.status)) throw new SaleWorkspaceError('saleId', 'La operación no admite conciliación de señas.', 409);
        const row = sale.depositRecords.id(depositId);
        if (!row) throw new SaleWorkspaceError('depositId', 'Seña no encontrada.', 404);
        if (row.status === 'confirmada') { if (String(row.transactionId) === transactionId) return sale; throw new SaleWorkspaceError('transactionId', 'La seña ya está conciliada con otro cobro.', 409); }
        if (row.status !== 'pendiente') throw new SaleWorkspaceError('depositId', 'La seña no está pendiente.', 409);
        if (sale.depositRecords.some(other => String(other._id) !== depositId && String(other.transactionId || '') === transactionId)) throw new SaleWorkspaceError('transactionId', 'Este cobro ya está aplicado a otra seña.', 409);
        const tx = await Transaction.findOne({ _id: transactionId, saleId: sale._id, type: 'Ingreso', status: 'activo', currency: row.currency, amount: row.amount }).session(session);
        if (!tx || row.accountId && String(row.accountId) !== String(tx.accountId)) throw new SaleWorkspaceError('transactionId', 'Seleccioná un ingreso activo de esta venta, por el mismo importe, moneda y caja declarada.', 409);
        const claim = await Transaction.updateOne({ _id: tx._id, saleDepositRecordId: null, status: 'activo', saleId: sale._id }, { $set: { saleDepositRecordId: row._id }, $push: { transactionAuditLog: { action: 'SENA_CONCILIADA', user: actor, details: `Ingreso existente aplicado a seña ${row._id} de venta ${sale._id}. No genera otro movimiento.` } } }, { session });
        if (!claim.modifiedCount) throw new SaleWorkspaceError('transactionId', 'Este ingreso ya fue aplicado a una seña o cambió de estado.', 409);
        if (tx.financeManualEntryId) {
            const entry = await FinanceManualEntry.updateOne({ _id: tx.financeManualEntryId, kind: 'deposit', status: 'Recibida', transactionId: tx._id, saleId: sale._id, appliedSaleDepositId: null }, { $set: { status: 'Aplicada', appliedSaleDepositId: row._id, updatedBy: actor }, $inc: { __v: 1 } }, { session });
            if (!entry.modifiedCount) throw new SaleWorkspaceError('transactionId', 'La seña de Caja cambió. Actualizá su estado antes de conciliar.', 409);
        }
        row.status = 'confirmada'; row.transactionId = tx._id; row.confirmedAt = new Date(); row.confirmedBy = actor;
        sale.saleAuditLog.push({ action: 'SENA_CONCILIADA', field: 'depositRecords', details: `Seña ${row._id} conciliada con ingreso existente ${tx._id}. No genera otro movimiento de caja.`, user: actor, source: 'CRM_V2' });
        sale.$where = { __v: sale.__v ?? 0, status: sale.status }; sale.increment(); await sale.save({ session }); return sale;
    });
}
