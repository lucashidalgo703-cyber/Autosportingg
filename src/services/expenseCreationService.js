import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Car from '../models/Car.js';
import Transaction from '../models/Transaction.js';
import { PERMISSIONS, hasPermission } from '../utils/adminPermissions.js';
import { logAudit } from '../utils/auditLogger.js';
import { applyLinkedExpenseTreasury } from './linkedExpenseTreasuryService.js';

export class ExpenseError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function assertExpensePermission(user, payload = {}) {
    if (!user || user.role === 'ventas' || !hasPermission(user, PERMISSIONS.FINANZAS_WRITE)) {
        throw new ExpenseError(403, 'EXPENSE_FORBIDDEN', 'No tenés permiso para registrar gastos financieros.');
    }
    if ((payload.vehicleId || payload.kind === 'vehicle' || payload.kind === 'workshop') && !hasPermission(user, PERMISSIONS.STOCK_WRITE)) {
        throw new ExpenseError(403, 'VEHICLE_EXPENSE_FORBIDDEN', 'No tenés permiso para agregar costos a una unidad.');
    }
    if ((payload.kind === 'workshop' || /taller|mec[aá]nic|chapist|repuestos/i.test(payload.category || '')) && !hasPermission(user, PERMISSIONS.TALLER_PAYMENTS_WRITE)) {
        throw new ExpenseError(403, 'WORKSHOP_PAYMENT_FORBIDDEN', 'No tenés permiso para registrar pagos de taller.');
    }
}

// One canonical financial movement, plus the existing stock cost annotation. Both
// are committed with the account, treasury and audit in the caller's transaction.
export async function createExpenseMovement({ payload, user, draftId, origin = 'gpt', session, req }) {
    if (!session?.inTransaction()) throw new Error('Expense creation requires an active MongoDB transaction');
    assertExpensePermission(user, payload);
    const accountUnassigned = payload.accountUnassigned === true;
    if (accountUnassigned && payload.accountId) throw new ExpenseError(400, 'ACCOUNT_ASSIGNMENT_CONFLICT', 'Elegí una cuenta o dejala pendiente de asignar.');
    const account = accountUnassigned ? null : await Account.findOne({ _id: payload.accountId, isActive: { $ne: false } }).session(session);
    if (!accountUnassigned && !account) throw new ExpenseError(409, 'ACCOUNT_UNAVAILABLE', 'La cuenta elegida ya no está disponible. Corregí el borrador.');
    if (account && account.currency !== payload.currency) throw new ExpenseError(409, 'ACCOUNT_CURRENCY', 'La moneda de la cuenta no coincide con el gasto.');
    const vehicle = payload.vehicleId ? await Car.findById(payload.vehicleId).session(session) : null;
    if (payload.vehicleId && !vehicle) throw new ExpenseError(409, 'VEHICLE_UNAVAILABLE', 'La unidad elegida ya no existe. Corregí el borrador.');
    const actor = user.username || user.name || user.email || String(user.id || user._id);
    const movementId = new mongoose.Types.ObjectId();
    const deferred = payload.paymentMethod === 'tarjeta' && payload.cardTiming === 'deferred';
    const originLabel = origin === 'crm_dictation' ? 'Carga rápida desde CRM' : 'GPT AutoSporting';
    const [tx] = await Transaction.create([{
        _id: movementId,
        module: 'crm_v2', source: 'manual', type: 'Egreso',
        category: payload.category, concept: payload.concept, description: payload.concept,
        amount: payload.amount, currency: payload.currency,
        paymentMethod: payload.paymentMethod, accountId: account?._id,
        accountAssignmentStatus: accountUnassigned ? 'pending' : 'assigned',
        accountDebitApplied: Boolean(account && !deferred),
        date: new Date(`${payload.date}T12:00:00-03:00`),
        dueDate: payload.dueDate ? new Date(`${payload.dueDate}T12:00:00-03:00`) : undefined,
        status: deferred ? 'pendiente' : 'activo',
        vehicleId: vehicle?._id, carId: vehicle?._id,
        notes: [payload.notes, deferred ? 'Consumo de tarjeta pendiente de pago; sin débito de cuenta.' : '', `${originLabel} · Borrador ${draftId}`].filter(Boolean).join('\n'),
        idempotencyKey: `${origin === 'crm_dictation' ? 'crm' : 'gpt'}-expense:${draftId}`,
        createdBy: actor,
        transactionAuditLog: [{ action: 'CREACION_MANUAL', source: 'CRM_V2', user: actor,
            details: `Gasto confirmado desde ${originLabel}: ${payload.concept}` }]
    }], { session });
    if (account && !deferred) {
        // $inc avoids lost updates when two distinct expenses affect the same account.
        const updated = await Account.updateOne({ _id: account._id, isActive: { $ne: false }, currency: payload.currency },
            { $inc: { balance: -payload.amount }, $set: { updatedAt: new Date() } }, { session });
        if (updated.modifiedCount !== 1) throw new ExpenseError(409, 'ACCOUNT_UNAVAILABLE', 'La cuenta cambió. Revisá el gasto.');
    }
    if (vehicle) {
        vehicle.expenses.push({ _id: movementId, concept: payload.concept, amount: payload.amount,
            currency: payload.currency, date: tx.date, note: `Movimiento #${movementId}${payload.notes ? ` · ${payload.notes}` : ''}` });
        vehicle.auditLog.push({ action: 'GASTO', field: 'expenses', user: actor, source: 'CRM_V2',
            newValue: { movementId: String(movementId), amount: payload.amount, currency: payload.currency },
            details: `Gasto ${payload.concept} asociado al movimiento #${movementId}; el pago se contabiliza una sola vez.` });
        await vehicle.save({ session });
    }
    // This is the same hook used by manual expenses and card expenses. Pending
    // card purchases reserve a commitment; the existing pending->active circuit
    // applies the debit when they are actually paid.
    await applyLinkedExpenseTreasury(tx, { user: actor, session });
    await tx.save({ session });
    await logAudit({ req: req || { user }, action: 'MOVIMIENTO_CREADO', module: 'finanzas',
        entityType: 'Transaction', entityId: movementId, entityLabel: `Egreso - ${payload.concept}`,
        description: `Se creó un gasto desde ${originLabel} por ${payload.currency} ${payload.amount}.`,
        metadata: { origin, draftId: String(draftId), amount: payload.amount, currency: payload.currency,
            vehicleId: payload.vehicleId, status: tx.status, accountAssignmentPending: accountUnassigned,
            accountDebited: tx.accountDebitApplied }, strict: true, session });
    return tx;
}
