import mongoose from 'mongoose';
import FixedExpense from '../models/FixedExpense.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import { applyLinkedExpenseTreasury, reverseLinkedExpenseTreasury } from './linkedExpenseTreasuryService.js';

export function getMonthPeriod(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit'
    }).formatToParts(new Date(date));
    return parts.find(part => part.type === 'year').value + '-' + parts.find(part => part.type === 'month').value;
}

function validPeriod(value = getMonthPeriod()) {
    if (typeof value !== 'string' || !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value)) {
        throw Object.assign(new Error('El período debe tener el formato AAAA-MM y un mes válido'), { status: 400 });
    }
    return value;
}

function validAmount(value, allowZero = false) {
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
        throw new Error('Ingresá un monto válido');
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) {
        throw new Error(allowZero ? 'El monto debe ser un número mayor o igual a 0' : 'El monto debe ser mayor a 0');
    }
    if (amount > 1e12 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.0001) {
        throw new Error('El monto admite hasta dos decimales y un máximo de 1.000.000.000.000');
    }
    return Math.round(amount * 100) / 100;
}

function validName(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('El nombre del gasto fijo es requerido');
    const name = value.trim();
    if (name.length > 200) throw new Error('El nombre del gasto fijo admite hasta 200 caracteres');
    return name;
}

function validDay(value = 10) {
    const day = Number(value);
    if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('El vencimiento debe ser un día entre 1 y 31');
    return day;
}

function validCurrency(value = 'ARS') {
    if (!['ARS', 'USD'].includes(value)) throw new Error('La moneda debe ser ARS o USD');
    return value;
}

function startPeriodOf(rule) {
    // Existing rules preserve their earliest recorded month when first upgraded.
    return rule.startPeriod || rule.instances.map(instance => instance.period).sort()[0] || getMonthPeriod(rule.createdAt || new Date());
}

function newInstance(rule, period) {
    const [year, month] = period.split('-').map(Number);
    const day = Math.min(rule.dueDay, new Date(Date.UTC(year, month, 0)).getUTCDate());
    return {
        period, name: rule.name, category: rule.category, currency: rule.currency,
        amount: rule.amount, status: 'pendiente', dueDay: day,
        dueDate: new Date(Date.UTC(year, month - 1, day, 15)),
        paidAmount: 0, isModified: false, notes: rule.notes || ''
    };
}

function preserveSnapshots(rule) {
    rule.startPeriod = startPeriodOf(rule);
    for (const instance of rule.instances) {
        instance.name ||= rule.name;
        instance.category ||= rule.category;
        instance.currency ||= rule.currency;
    }
}

async function inTransaction(work) {
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => { result = await work(session); });
        return result;
    } finally { await session.endSession(); }
}

export async function getFixedExpensesForPeriod(periodStr) {
    const period = validPeriod(periodStr);
    // Disabled rules remain visible in every month already recorded.
    const rules = await FixedExpense.find({ $or: [{ isActive: true }, { 'instances.period': period }] })
        .populate('defaultAccountId', 'name currency balance').populate('instances.accountId', 'name').sort({ dueDay: 1, name: 1 });
    const items = [];
    const summary = {
        ars: { total: 0, paid: 0, pending: 0 }, usd: { total: 0, paid: 0, pending: 0 },
        counts: { total: 0, paid: 0, pending: 0, annulled: 0 }
    };
    for (let rule of rules) {
        let instance = rule.instances.find(item => item.period === period);
        let wasAutoLoaded = false;
        if (!instance && rule.isActive && period >= startPeriodOf(rule)) {
            // Conditional push prevents concurrent page loads creating duplicates.
            const updated = await FixedExpense.findOneAndUpdate({
                _id: rule._id, isActive: true, 'instances.period': { $ne: period }
            }, { $push: { instances: newInstance(rule, period) } }, { new: true });
            if (updated) { rule = await updated.populate([{ path: 'defaultAccountId', select: 'name currency balance' }, { path: 'instances.accountId', select: 'name' }]); wasAutoLoaded = true; }
            else rule = await FixedExpense.findById(rule._id).populate('defaultAccountId', 'name currency balance').populate('instances.accountId', 'name');
            instance = rule?.instances.find(item => item.period === period);
        }
        if (!instance) continue;
        const currency = instance.currency || rule.currency;
        const totals = currency === 'USD' ? summary.usd : summary.ars;
        const amount = Number(instance.amount);
        if (instance.status === 'anulado') summary.counts.annulled++;
        else {
            totals.total = Math.round((totals.total + amount) * 100) / 100;
            summary.counts.total++;
            if (instance.status === 'pagado') { totals.paid = Math.round((totals.paid + amount) * 100) / 100; summary.counts.paid++; }
            else { totals.pending = Math.round((totals.pending + amount) * 100) / 100; summary.counts.pending++; }
        }
        items.push({
            ruleId: rule._id, instanceId: instance._id, name: instance.name || rule.name,
            category: instance.category || rule.category, currency, baseAmount: rule.amount,
            amount: instance.amount, dueDay: instance.dueDay || rule.dueDay, dueDate: instance.dueDate,
            status: instance.status, paidAt: instance.paidAt, paidAmount: instance.paidAmount,
            paymentMethod: instance.paymentMethod, accountId: instance.accountId?._id || instance.accountId || rule.defaultAccountId?._id,
            accountName: instance.accountId?.name || (instance.accountId ? undefined : rule.defaultAccountId?.name), notes: instance.notes,
            isModified: Boolean(instance.isModified), wasAutoLoaded, isActive: rule.isActive
        });
    }
    return { period, summary, items };
}

async function validateAccount(accountId, currency, session) {
    if (!mongoose.isValidObjectId(accountId)) throw new Error('Seleccioná una cuenta válida');
    const query = Account.findById(accountId);
    if (session) query.session(session);
    const account = await query;
    if (!account || account.isActive === false) throw new Error('La cuenta no existe o está desactivada');
    if (account.currency !== currency) throw new Error('La cuenta debe tener la misma moneda que el gasto');
    return account;
}

export async function createFixedExpense(payload, user = 'System') {
    const name = validName(payload.name);
    const period = validPeriod(payload.period ?? payload.startPeriod);
    const currency = validCurrency(payload.currency);
    if (payload.defaultAccountId) await validateAccount(payload.defaultAccountId, currency);
    const rule = new FixedExpense({
        name, category: typeof payload.category === 'string' && payload.category.trim() || 'Servicios',
        amount: validAmount(payload.amount), currency, dueDay: validDay(payload.dueDay),
        defaultAccountId: payload.defaultAccountId || undefined, notes: payload.notes || '',
        startPeriod: period, createdBy: user, updatedBy: user
    });
    rule.instances.push(newInstance(rule, period));
    await rule.save();
    return rule;
}

async function reversePayment(instance, user, session) {
    if (!instance.transactionId) return;
    const transaction = await Transaction.findById(instance.transactionId).session(session);
    if (!transaction) throw new Error('No se encontró el movimiento del pago; no se pudo revertir');
    if (transaction.status !== 'anulado') {
        const account = await Account.findById(transaction.accountId).session(session);
        if (!account) throw new Error('No se encontró la cuenta del pago; no se pudo revertir');
        if (transaction.linkedExpenseTreasuryEffect?.recorded) await reverseLinkedExpenseTreasury(transaction, { session, user });
        else if (transaction.isTreasuryExpenseSynced) throw new Error('El efecto del pago en Tesorería necesita una revisión antes de revertirse');
        transaction.status = 'anulado';
        transaction.accountDebitApplied = false;
        transaction.updatedBy = user;
        transaction.notes = (transaction.notes || '') + ' (Anulado al revertir gasto fijo)';
        await transaction.save({ session });
        account.balance += transaction.amount;
        await account.save({ session });
    }
    instance.transactionId = undefined;
}

export async function updateFixedExpenseMonthlyInstance(ruleId, periodStr, updates, user = 'System') {
    const period = validPeriod(periodStr);
    const amount = updates.amount === undefined ? undefined : validAmount(updates.amount, true);
    const name = updates.name === undefined ? undefined : validName(updates.name);
    if (updates.applyNameToFuture !== undefined) {
        if (typeof updates.applyNameToFuture !== 'boolean') throw new Error('La opción de aplicar el nombre a los próximos meses debe ser verdadera o falsa');
        if (name === undefined) throw new Error('Ingresá el nombre del gasto para aplicar el cambio a los próximos meses');
    }
    if (updates.status !== undefined && !['pagado', 'pendiente', 'anulado'].includes(updates.status)) throw new Error('Estado inválido');
    if (updates.registerMovement !== undefined && typeof updates.registerMovement !== 'boolean') throw new Error('La opción de movimiento debe ser verdadera o falsa');
    let paidAt;
    if (updates.paidAt !== undefined) {
        if (typeof updates.paidAt !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(updates.paidAt)) throw new Error('La fecha de pago no es válida');
        const calendar = updates.paidAt.slice(0, 10);
        const calendarDate = new Date(calendar + 'T15:00:00Z');
        if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== calendar) throw new Error('La fecha de pago no es válida');
        paidAt = new Date(updates.paidAt);
        if (!Number.isFinite(paidAt.getTime())) throw new Error('La fecha de pago no es válida');
    }
    return inTransaction(async session => {
        const rule = await FixedExpense.findById(ruleId).session(session);
        if (!rule) throw new Error('Gasto fijo no encontrado');
        preserveSnapshots(rule);
        let instance = rule.instances.find(item => item.period === period);
        if (!instance) {
            if (!rule.isActive || period < rule.startPeriod) throw new Error('El gasto fijo no corresponde a este período');
            rule.instances.push(newInstance(rule, period));
            instance = rule.instances[rule.instances.length - 1];
        }
        const nextStatus = updates.status ?? instance.status;
        if (amount !== undefined && amount !== instance.amount && instance.status === 'pagado' && nextStatus === 'pagado') {
            throw new Error('Para modificar el monto de un gasto pagado, volvé a pendiente primero');
        }
        if (amount !== undefined) { instance.amount = amount; instance.isModified = true; }
        if (updates.notes !== undefined) instance.notes = updates.notes;
        if (name !== undefined) {
            instance.name = name;
            if (updates.applyNameToFuture) {
                rule.name = name;
                for (const futureInstance of rule.instances) {
                    if (futureInstance.period > period) futureInstance.name = name;
                }
            }
        }
        if (updates.status !== undefined && nextStatus === 'pagado' && instance.status !== 'pagado') {
            const account = updates.registerMovement ? await validateAccount(updates.accountId, instance.currency, session) : null;
            instance.paidAt = paidAt || new Date();
            instance.paidAmount = instance.amount;
            instance.paymentMethod = updates.paymentMethod || 'efectivo';
            instance.accountId = account?._id;
            if (account) {
                const description = 'Gasto Fijo: ' + instance.name + ' (' + period + ')';
                const transaction = new Transaction({
                    type: 'Egreso', description, concept: description, category: instance.category,
                    amount: instance.amount, currency: instance.currency, date: instance.paidAt,
                    accountId: account._id, paymentMethod: instance.paymentMethod,
                    module: 'crm_v2', source: 'otro', status: 'activo',
                    notes: '[GASTO_FIJO:' + rule._id + ':' + period + '] Pago de gasto fijo ' + instance.name, createdBy: user
                });
                transaction.idempotencyKey = 'fixed-expense:' + rule._id + ':' + period + ':' + transaction._id;
                await transaction.save({ session });
                await applyLinkedExpenseTreasury(transaction, { session, user });
                transaction.accountDebitApplied = true;
                await transaction.save({ session });
                account.balance -= instance.amount;
                await account.save({ session });
                instance.transactionId = transaction._id;
            }
        } else if (updates.status !== undefined && nextStatus !== 'pagado') {
            await reversePayment(instance, user, session);
            instance.paidAt = undefined;
            instance.paidAmount = 0;
            instance.accountId = undefined;
            instance.paymentMethod = undefined;
        }
        instance.status = nextStatus;
        rule.updatedBy = user;
        await rule.save({ session });
        return { rule, instance };
    });
}

export async function updateMasterFixedExpense(ruleId, updates, user = 'System') {
    return inTransaction(async session => {
        const rule = await FixedExpense.findById(ruleId).session(session);
        if (!rule) throw new Error('Gasto fijo no encontrado');
        preserveSnapshots(rule);
        if (updates.name !== undefined) {
            rule.name = validName(updates.name);
        }
        if (updates.category !== undefined) {
            if (typeof updates.category !== 'string' || !updates.category.trim()) throw new Error('La categoría es requerida');
            rule.category = updates.category.trim();
        }
        if (updates.amount !== undefined) rule.amount = validAmount(updates.amount);
        if (updates.currency !== undefined) rule.currency = validCurrency(updates.currency);
        if (updates.dueDay !== undefined) rule.dueDay = validDay(updates.dueDay);
        if (updates.defaultAccountId !== undefined) rule.defaultAccountId = updates.defaultAccountId || undefined;
        if (rule.defaultAccountId && (updates.defaultAccountId !== undefined || updates.currency !== undefined)) {
            await validateAccount(rule.defaultAccountId, rule.currency, session);
        }
        if (updates.notes !== undefined) rule.notes = updates.notes;
        if (updates.isActive !== undefined) {
            if (typeof updates.isActive !== 'boolean') throw new Error('Estado activo inválido');
            rule.isActive = updates.isActive;
        }
        rule.updatedBy = user;
        await rule.save({ session });
        return rule;
    });
}

export async function deleteFixedExpense(ruleId, user = 'System') {
    await updateMasterFixedExpense(ruleId, { isActive: false }, user);
    return { ok: true, message: 'Gasto fijo desactivado; se conserva el historial registrado' };
}
