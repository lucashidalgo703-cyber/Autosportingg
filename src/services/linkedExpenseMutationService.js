import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Reservation from '../models/Reservation.js';
import Installment from '../models/Installment.js';
import GptExpenseDraft from '../models/GptExpenseDraft.js';
import ExpenseQuotaAssignment from '../models/ExpenseQuotaAssignment.js';
import { ExpenseError, assertExpensePermission } from './expenseCreationService.js';
import { applyLinkedExpenseTreasury, reverseLinkedExpenseTreasury } from './linkedExpenseTreasuryService.js';
import { logAudit } from '../utils/auditLogger.js';

export const isManagedLinkedExpense = tx => tx?.module === 'crm_v2' && /^(crm|gpt)-expense:/.test(tx.idempotencyKey || '');
const idOf = value => String(value?._id || value || '');
const fail = (message, status = 400, code = 'LINKED_EXPENSE_INVALID') => { throw new ExpenseError(status, code, message); };
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const linkedVehicleId = tx => idOf(tx.vehicleId || tx.carId);
const permissionPayload = tx => ({ vehicleId: linkedVehicleId(tx), category: tx.category,
    kind: /taller|mec[aá]nic|chapist|repuestos/i.test(tx.category || '') ? 'workshop' : linkedVehicleId(tx) ? 'vehicle' : 'operational' });
const fields = ['category', 'concept', 'paymentMethod', 'date', 'notes', 'status', 'saleId', 'reservationId', 'clientId',
    'vehicleId', 'installmentId', 'payeeCompany', 'payeeVehicle', 'beneficiary', 'dueDate', 'targetUser', 'amount', 'type', 'currency', 'accountId'];
function parseDate(value, label, optional = false) {
    if (optional && (value === null || value === '')) return undefined;
    if (typeof value !== 'string') fail(`Ingresá una fecha válida para ${label}.`);
    const calendar = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    const calendarTime = calendar ? new Date(calendar + 'T15:00:00Z') : null;
    if (!calendarTime || !Number.isFinite(calendarTime.getTime()) || calendarTime.toISOString().slice(0, 10) !== calendar) fail(`Ingresá una fecha válida para ${label}.`);
    const date = new Date(value === calendar ? calendar + 'T15:00:00Z' : value);
    if (!Number.isFinite(date.getTime())) fail(`Ingresá una fecha válida para ${label}.`);
    return date;
}
function normalizePatch(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) fail('Los datos del movimiento no son válidos.');
    const normalized = {};
    for (const [key, value] of Object.entries(patch)) {
        if (!fields.includes(key)) fail(`El campo ${key} no puede modificarse desde este movimiento.`);
        if (key === 'amount') {
            if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1e12 || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001) fail('El importe debe ser positivo y tener como máximo dos decimales.');
            normalized.amount = Math.round(value * 100) / 100;
        } else if (['date', 'dueDate'].includes(key)) normalized[key] = parseDate(value, key, key === 'dueDate');
        else if (key.endsWith('Id')) {
            if (value !== null && value !== '' && !validId(value)) fail(`El vínculo ${key} no es válido.`);
            normalized[key] = value || undefined;
        } else {
            if (typeof value !== 'string' || value.length > (key === 'notes' ? 1500 : 300)) fail(`El campo ${key} no es válido.`);
            normalized[key] = value.trim();
        }
    }
    if (normalized.type !== undefined && normalized.type.toLowerCase() !== 'egreso') fail('Un gasto dictado no puede convertirse en ingreso. Anulalo y registrá la operación correcta.', 409);
    if (normalized.type) normalized.type = 'Egreso';
    if (normalized.status && !['activo', 'pendiente', 'anulado'].includes(normalized.status)) fail('El estado del gasto no es válido.');
    if (normalized.currency && !['ARS', 'USD'].includes(normalized.currency)) fail('La moneda debe ser ARS o USD.');
    for (const field of ['concept', 'category']) if (normalized[field] !== undefined && !normalized[field]) fail(`El campo ${field} es obligatorio.`);
    return normalized;
}

async function changeInTransaction(id, patch, user, req, session) {
    const tx = await Transaction.findOne({ _id: id, module: 'crm_v2' }).session(session);
    if (!tx || !isManagedLinkedExpense(tx)) fail('No se encontró el gasto de carga rápida.', 404);
    assertExpensePermission(user, permissionPayload(tx));
    if (tx.type !== 'Egreso') fail('Este movimiento requiere una revisión contable antes de modificarse.', 409);
    if (tx.status === 'anulado') {
        if (patch.status === 'anulado') return { tx, changed: false };
        fail('Este gasto ya fue anulado. Registrá uno nuevo si corresponde.', 409, 'EXPENSE_CANCELLED');
    }
    const original = tx.toObject();
    const oldVehicleId = linkedVehicleId(original);
    for (const [field, value] of Object.entries(patch)) {
        const previous = tx[field];
        const equal = value instanceof Date ? previous?.getTime?.() === value.getTime() : field.endsWith('Id') ? idOf(previous) === idOf(value) : previous === value;
        if (!equal) tx.set(field, value);
    }
    tx.description = tx.concept;
    tx.carId = tx.vehicleId || undefined;
    assertExpensePermission(user, permissionPayload(tx));
    if (!tx.isModified()) return { tx, changed: false };
    if (!original.linkedExpenseTreasuryEffect?.recorded) fail('Este gasto no tiene trazabilidad completa de Tesorería. Pedí su revisión antes de modificarlo.', 409, 'EXPENSE_TREASURY_REVIEW_REQUIRED');
    for (const [field, model] of [['saleId', Sale], ['reservationId', Reservation], ['clientId', Client], ['installmentId', Installment]]) {
        if (tx[field] && !await model.exists({ _id: tx[field] }).session(session)) fail(`El vínculo ${field} ya no está disponible.`, 409);
    }
    if (original.currency !== tx.currency && !patch.accountId) fail('Para cambiar moneda, anulá este gasto y cargalo de nuevo con la moneda y cuenta correctas.', 409);
    const oldAccount = await Account.findById(original.accountId).session(session);
    const account = await Account.findById(tx.accountId).session(session);
    if (!oldAccount || !account || account.currency !== tx.currency) fail('La cuenta del movimiento no coincide con la moneda. Revisá sus datos.', 409);
    if (tx.status !== 'anulado' && account.isActive === false) fail('La cuenta elegida ya no está activa.', 409);
    const targetVehicleId = linkedVehicleId(tx);
    const vehicleIds = [...new Set([oldVehicleId, targetVehicleId].filter(Boolean))];
    const vehicles = [];
    for (const vehicleId of vehicleIds) {
        const vehicle = await Car.findById(vehicleId).session(session);
        if (!vehicle) fail('La unidad vinculada ya no está disponible. Pedí su revisión.', 409);
        vehicles.push(vehicle);
    }
    await tx.validate();
    const actor = user.username || user.name || user.email || idOf(user.id);
    const moneyChanged = ['status', 'amount', 'currency', 'category', 'accountId'].some(field => idOf(original[field]) !== idOf(tx[field]));
    if ((original.amount !== tx.amount || original.currency !== tx.currency || tx.status === 'anulado')
        && await ExpenseQuotaAssignment.exists({ expenseId: tx._id, status: 'activa' }).session(session)) {
        fail('Liberá primero las cuotas asignadas desde Gestionar asignaciones; después corregí o anulá este gasto.', 409, 'EXPENSE_HAS_QUOTA_ASSIGNMENTS');
    }
    if (moneyChanged) {
        const oldDebit = original.status === 'activo' ? original.amount : 0;
        const newDebit = tx.status === 'activo' ? tx.amount : 0;
        if (idOf(oldAccount) === idOf(account)) {
            if (oldDebit !== newDebit) await Account.updateOne({ _id: account._id }, { $inc: { balance: oldDebit - newDebit } }, { session });
        } else {
            if (oldDebit) await Account.updateOne({ _id: oldAccount._id }, { $inc: { balance: oldDebit } }, { session });
            if (newDebit) await Account.updateOne({ _id: account._id }, { $inc: { balance: -newDebit } }, { session });
        }
        await reverseLinkedExpenseTreasury(tx, { session, user: actor });
        if (original.category !== tx.category) tx.treasuryBoxKey = null;
        const debitCap = original.status === 'activo' && tx.status === 'activo' && original.currency === tx.currency && original.category === tx.category
            ? Math.max(0, original.linkedExpenseTreasuryEffect.debitApplied + tx.amount - original.amount) : undefined;
        if (tx.status !== 'anulado') await applyLinkedExpenseTreasury(tx, { session, user: actor, debitCap });
    }
    for (const vehicle of vehicles) {
        vehicle.expenses = vehicle.expenses.filter(expense => idOf(expense._id) !== idOf(tx._id));
        if (idOf(vehicle) === targetVehicleId && tx.status !== 'anulado') vehicle.expenses.push({ _id: tx._id,
            concept: tx.concept, amount: tx.amount, currency: tx.currency, date: tx.date, note: `Movimiento #${tx._id}` });
        vehicle.auditLog.push({ action: 'GASTO', field: 'expenses', user: actor, source: 'CRM_V2',
            details: `Movimiento #${tx._id} ${tx.status === 'anulado' ? 'anulado; costo retirado' : 'corregido; costo sincronizado'}.` });
        await vehicle.save({ session });
    }
    tx.updatedBy = actor;
    tx.transactionAuditLog.push({ action: tx.status === 'anulado' ? 'ANULACION' : 'EDICION', source: 'CRM_V2', user: actor,
        details: 'Movimiento, cuenta, costo de unidad y Tesorería actualizados de forma conjunta.',
        oldValue: { amount: original.amount, currency: original.currency, status: original.status, vehicleId: oldVehicleId },
        newValue: { amount: tx.amount, currency: tx.currency, status: tx.status, vehicleId: targetVehicleId } });
    await tx.save({ session });
    const tab = /taller|mec[aá]nic|chapist|repuestos/i.test(tx.category) ? 'taller' : tx.paymentMethod === 'tarjeta' ? 'tarjeta' : 'movimientos';
    const vehicle = vehicles.find(item => idOf(item) === targetVehicleId);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(tx.date);
    const summary = [`$${tx.amount.toLocaleString('es-AR')} ${tx.currency}`, tx.concept,
        vehicle ? `${vehicle.brand} ${vehicle.name} ${vehicle.year} (${vehicle.plateOrVin || 'Sin patente'})` : '', account.name, date,
        tx.status === 'anulado' ? 'Anulado' : tx.status === 'pendiente' ? 'Pendiente de pago; sin débito' : ''].filter(Boolean).join(' · ');
    const resultPatch = { 'result.movementStatus': tx.status, 'result.accountDebited': tx.status === 'activo', 'result.summary': summary,
        'result.url': `/admin/finanzas?tab=${tab}&movement=${tx._id}`, 'result.vehicleUrl': vehicle ? `/admin/stock/${vehicle._id}` : null };
    await GptExpenseDraft.updateMany({ movementId: tx._id, status: 'confirmed' }, { $set: resultPatch }, { session });
    await logAudit({ req: req || { user }, action: tx.status === 'anulado' ? 'MOVIMIENTO_ANULADO' : 'MOVIMIENTO_EDITADO',
        module: 'finanzas', entityType: 'Transaction', entityId: tx._id, entityLabel: tx.concept,
        description: `Gasto actualizado junto con su cuenta y costo de unidad (${tx.status}).`,
        metadata: { amount: tx.amount, currency: tx.currency, vehicleId: targetVehicleId || null }, strict: true, session });
    return { tx, changed: true };
}

export async function mutateLinkedExpense({ id, patch = {}, annul = false, user, req }) {
    if (!validId(id)) fail('El identificador del movimiento no es válido.');
    const normalized = normalizePatch(annul ? { status: 'anulado' } : patch);
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => { result = await changeInTransaction(id, normalized, user, req, session); });
        return result.tx.toObject();
    } finally { await session.endSession(); }
}

export async function annulLinkedExpenseBatch({ ids, user, req }) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => !validId(id))) fail('Seleccioná hasta 100 movimientos válidos.');
    const uniqueIds = [...new Set(ids)];
    const transactions = await Transaction.find({ _id: { $in: uniqueIds }, module: 'crm_v2' }).lean();
    const managed = transactions.filter(isManagedLinkedExpense);
    if (!managed.length) return null;
    if (managed.length !== uniqueIds.length) fail('La selección mezcla gastos dictados y otros movimientos. Anulalos por separado para conservar su consistencia.', 409, 'MIXED_EXPENSE_BATCH');
    const session = await mongoose.startSession();
    let count = 0;
    try {
        await session.withTransaction(async () => {
            count = 0;
            for (const id of uniqueIds) if ((await changeInTransaction(id, { status: 'anulado' }, user, req, session)).changed) count++;
        });
        return { message: `${count} gastos anulados con sus cuentas, costos y Tesorería sincronizados.`, annulledCount: count };
    } finally { await session.endSession(); }
}
