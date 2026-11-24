import mongoose from 'mongoose';
import FixedExpense from '../models/FixedExpense.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';

export function getMonthPeriod(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function getFixedExpensesForPeriod(periodStr) {
    let period = periodStr;
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
        period = getMonthPeriod();
    }

    const [year, month] = period.split('-').map(Number);
    const maxDays = new Date(year, month, 0).getDate();

    // 1. Obtener todas las reglas de gastos fijos activas
    const rules = await FixedExpense.find({ isActive: true })
        .populate('defaultAccountId', 'name currency balance')
        .sort({ dueDay: 1, name: 1 });

    const items = [];
    let totalARS = 0, paidARS = 0, pendingARS = 0;
    let totalUSD = 0, paidUSD = 0, pendingUSD = 0;
    let countTotal = 0, countPaid = 0, countPending = 0, countAnnulled = 0;

    for (const rule of rules) {
        let instance = rule.instances.find(inst => inst.period === period);
        let wasCreated = false;

        if (!instance) {
            // Carga automática del mes si no existe aún
            const actualDay = Math.min(rule.dueDay || 10, maxDays);
            const dueDate = new Date(year, month - 1, actualDay, 12, 0, 0);

            rule.instances.push({
                period,
                amount: rule.amount,
                status: 'pendiente',
                dueDay: actualDay,
                dueDate,
                paidAmount: 0,
                isModified: false,
                notes: rule.notes || ''
            });

            await rule.save();
            instance = rule.instances[rule.instances.length - 1];
            wasCreated = true;
        }

        const isAnnulled = instance.status === 'anulado';
        const isPaid = instance.status === 'pagado';
        const isPending = instance.status === 'pendiente';

        const amount = Number(instance.amount || 0);
        const curr = rule.currency === 'USD' ? 'USD' : 'ARS';

        if (!isAnnulled) {
            countTotal++;
            if (curr === 'ARS') {
                totalARS += amount;
                if (isPaid) paidARS += amount;
                if (isPending) pendingARS += amount;
            } else {
                totalUSD += amount;
                if (isPaid) paidUSD += amount;
                if (isPending) pendingUSD += amount;
            }

            if (isPaid) countPaid++;
            if (isPending) countPending++;
        } else {
            countAnnulled++;
        }

        items.push({
            ruleId: rule._id,
            instanceId: instance._id,
            name: rule.name,
            category: rule.category,
            currency: curr,
            baseAmount: rule.amount,
            amount: instance.amount,
            dueDay: instance.dueDay || rule.dueDay,
            dueDate: instance.dueDate || new Date(year, month - 1, Math.min(rule.dueDay || 10, maxDays)),
            status: instance.status,
            paidAt: instance.paidAt,
            paidAmount: instance.paidAmount,
            paymentMethod: instance.paymentMethod,
            accountId: instance.accountId || rule.defaultAccountId?._id,
            accountName: rule.defaultAccountId?.name,
            notes: instance.notes,
            isModified: Boolean(instance.isModified),
            wasAutoLoaded: wasCreated
        });
    }

    return {
        period,
        summary: {
            ars: { total: totalARS, paid: paidARS, pending: pendingARS },
            usd: { total: totalUSD, paid: paidUSD, pending: pendingUSD },
            counts: { total: countTotal, paid: countPaid, pending: countPending, annulled: countAnnulled }
        },
        items
    };
}

export async function createFixedExpense(payload, user = 'System') {
    const { name, category, amount, currency = 'ARS', dueDay = 10, defaultAccountId, notes } = payload;
    if (!name || !name.trim()) throw new Error('El nombre del gasto fijo es requerido');
    if (!amount || Number(amount) <= 0) throw new Error('El monto debe ser mayor a 0');

    const numDay = Math.max(1, Math.min(31, parseInt(dueDay) || 10));
    const newRule = new FixedExpense({
        name: name.trim(),
        category: (category && category.trim()) || 'Servicios',
        amount: Number(amount),
        currency: currency === 'USD' ? 'USD' : 'ARS',
        dueDay: numDay,
        defaultAccountId: defaultAccountId || undefined,
        notes: notes || '',
        createdBy: user,
        updatedBy: user
    });

    // Crear automáticamente la instancia para el período actual
    const currentPeriod = getMonthPeriod();
    const [y, m] = currentPeriod.split('-').map(Number);
    const maxDays = new Date(y, m, 0).getDate();
    const actualDay = Math.min(numDay, maxDays);
    const dueDate = new Date(y, m - 1, actualDay, 12, 0, 0);

    newRule.instances.push({
        period: currentPeriod,
        amount: Number(amount),
        status: 'pendiente',
        dueDay: actualDay,
        dueDate,
        paidAmount: 0,
        isModified: false,
        notes: notes || ''
    });

    await newRule.save();
    return newRule;
}

export async function updateFixedExpenseMonthlyInstance(ruleId, period, updates, user = 'System') {
    const rule = await FixedExpense.findById(ruleId);
    if (!rule) throw new Error('Gasto fijo no encontrado');

    const [year, month] = period.split('-').map(Number);
    const maxDays = new Date(year, month, 0).getDate();

    let instance = rule.instances.find(inst => inst.period === period);
    if (!instance) {
        const actualDay = Math.min(rule.dueDay || 10, maxDays);
        rule.instances.push({
            period,
            amount: rule.amount,
            status: 'pendiente',
            dueDay: actualDay,
            dueDate: new Date(year, month - 1, actualDay, 12, 0, 0),
            paidAmount: 0,
            isModified: false
        });
        instance = rule.instances[rule.instances.length - 1];
    }

    // 1. Modificar Monto del mes
    if (updates.amount !== undefined) {
        const numAmount = Number(updates.amount);
        if (numAmount < 0) throw new Error('El monto no puede ser negativo');
        instance.amount = numAmount;
        instance.isModified = true;
    }

    // 2. Modificar notas
    if (updates.notes !== undefined) {
        instance.notes = updates.notes;
    }

    // 3. Cambiar estado (pagado | pendiente | anulado)
    if (updates.status) {
        const prevStatus = instance.status;
        const newStatus = updates.status;

        if (newStatus === 'pagado') {
            instance.status = 'pagado';
            instance.paidAt = updates.paidAt ? new Date(updates.paidAt) : new Date();
            instance.paidAmount = instance.amount;
            instance.paymentMethod = updates.paymentMethod || 'efectivo';
            if (updates.accountId) instance.accountId = updates.accountId;

            // Registrar movimiento de caja si se especificó cuenta
            if (updates.accountId && updates.registerMovement) {
                try {
                    const account = await Account.findById(updates.accountId);
                    if (account && account.isActive !== false) {
                        const tx = new Transaction({
                            type: 'Egreso',
                            category: rule.category || 'Gastos Fijos',
                            concept: `Gasto Fijo: ${rule.name} (${period})`,
                            amount: instance.amount,
                            currency: rule.currency,
                            date: instance.paidAt,
                            accountId: account._id,
                            module: 'crm_v2',
                            source: 'otro',
                            status: 'activo',
                            notes: `[GASTO_FIJO:${rule._id}:${period}] Pago de gasto fijo ${rule.name}`,
                            createdBy: user
                        });
                        await tx.save();
                        account.balance -= instance.amount;
                        await account.save();
                        instance.transactionId = tx._id;
                    }
                } catch (txErr) {
                    console.error('Error registrando movimiento de gasto fijo:', txErr);
                }
            }
        } else if (newStatus === 'pendiente') {
            instance.status = 'pendiente';
            instance.paidAt = undefined;
            instance.paidAmount = 0;

            // Revertir transacción si existía
            if (instance.transactionId) {
                try {
                    const tx = await Transaction.findById(instance.transactionId);
                    if (tx && tx.status !== 'anulado') {
                        tx.status = 'anulado';
                        tx.notes += ' (Anulado al volver gasto fijo a pendiente)';
                        await tx.save();

                        const account = await Account.findById(tx.accountId);
                        if (account) {
                            account.balance += tx.amount;
                            await account.save();
                        }
                    }
                } catch (txErr) {
                    console.error('Error anulando transacción de gasto fijo:', txErr);
                }
                instance.transactionId = undefined;
            }
        } else if (newStatus === 'anulado') {
            instance.status = 'anulado';
            if (instance.transactionId) {
                try {
                    const tx = await Transaction.findById(instance.transactionId);
                    if (tx && tx.status !== 'anulado') {
                        tx.status = 'anulado';
                        await tx.save();
                        const account = await Account.findById(tx.accountId);
                        if (account) {
                            account.balance += tx.amount;
                            await account.save();
                        }
                    }
                } catch (txErr) {
                    console.error('Error anulando transacción al anular gasto fijo:', txErr);
                }
                instance.transactionId = undefined;
            }
        }
    }

    rule.updatedBy = user;
    await rule.save();
    return { rule, instance };
}

export async function updateMasterFixedExpense(ruleId, updates, user = 'System') {
    const rule = await FixedExpense.findById(ruleId);
    if (!rule) throw new Error('Gasto fijo no encontrado');

    const allowed = ['name', 'category', 'amount', 'currency', 'dueDay', 'defaultAccountId', 'notes', 'isActive'];
    allowed.forEach(f => {
        if (updates[f] !== undefined) {
            rule[f] = updates[f];
        }
    });

    rule.updatedBy = user;
    await rule.save();
    return rule;
}

export async function deleteFixedExpense(ruleId, user = 'System') {
    const rule = await FixedExpense.findById(ruleId);
    if (!rule) throw new Error('Gasto fijo no encontrado');
    rule.isActive = false;
    rule.updatedBy = user;
    await rule.save();
    return { ok: true, message: 'Gasto fijo desactivado con éxito' };
}
