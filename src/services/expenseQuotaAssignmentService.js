import mongoose from 'mongoose';
import ExpenseQuotaAssignment from '../models/ExpenseQuotaAssignment.js';
import Transaction from '../models/Transaction.js';
import Installment from '../models/Installment.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';

/**
 * Calculates current active commitments for a quota across all expenses.
 * @param {string|ObjectId} installmentId 
 * @param {string|ObjectId} [excludeExpenseId] 
 * @returns {Promise<{ committedTotal: number, activeAssignments: Array }>}
 */
export async function getQuotaCommitment(installmentId, excludeExpenseId = null) {
    const query = {
        installmentId,
        status: 'activa'
    };
    if (excludeExpenseId) {
        query.expenseId = { $ne: excludeExpenseId };
    }
    const assignments = await ExpenseQuotaAssignment.find(query).lean();
    const committedTotal = assignments.reduce((sum, a) => sum + Number(a.assignedAmount || 0), 0);
    return { committedTotal, activeAssignments: assignments };
}

/**
 * Calculates current active coverage for an expense.
 * @param {string|ObjectId} expenseId 
 * @param {string|ObjectId} [excludeInstallmentId] 
 * @returns {Promise<{ coveredTotal: number, activeAssignments: Array }>}
 */
export async function getExpenseCoverage(expenseId, excludeInstallmentId = null) {
    const query = {
        expenseId,
        status: 'activa'
    };
    if (excludeInstallmentId) {
        query.installmentId = { $ne: excludeInstallmentId };
    }
    const assignments = await ExpenseQuotaAssignment.find(query)
        .populate({
            path: 'installmentId',
            populate: [
                { path: 'clientId', select: 'firstName lastName fullName phone dni' },
                { path: 'vehicleId', select: 'brand name year plateOrVin' },
                { path: 'saleId', select: '_id salePrice saleCurrency salesperson saleDate' }
            ]
        })
        .lean();

    const coveredTotal = assignments.reduce((sum, a) => sum + Number(a.assignedAmount || 0), 0);
    return { coveredTotal, activeAssignments: assignments };
}

/**
 * Get full assignment details and financial status for an expense.
 */
export async function getExpenseAssignmentSummary(expenseId) {
    const expense = await Transaction.findById(expenseId).lean();
    if (!expense) {
        throw new Error('Gasto u obligación no encontrado');
    }

    const { coveredTotal, activeAssignments } = await getExpenseCoverage(expenseId);
    const allAssignments = await ExpenseQuotaAssignment.find({ expenseId })
        .populate({
            path: 'installmentId',
            populate: [
                { path: 'clientId', select: 'firstName lastName fullName phone dni' },
                { path: 'vehicleId', select: 'brand name year plateOrVin' },
                { path: 'saleId', select: '_id salePrice saleCurrency salesperson saleDate' }
            ]
        })
        .sort({ createdAt: -1 })
        .lean();

    const expenseAmount = Number(expense.amount || 0);
    const remainingToCover = Math.max(0, expenseAmount - coveredTotal);
    const coveragePercentage = expenseAmount > 0 ? Math.min(100, Math.round((coveredTotal / expenseAmount) * 100)) : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expenseDueDate = expense.dueDate ? new Date(expense.dueDate) : (expense.date ? new Date(expense.date) : null);

    let collectedPortionTotal = 0;
    const enrichedAssignments = allAssignments.map(a => {
        const inst = a.installmentId || {};
        const instAmount = Number(inst.amount || 0);
        const instPaid = Number(inst.paidAmount || 0);
        const assigned = Number(a.assignedAmount || 0);

        // Calculate collected funds available from this assignment
        const collectedShare = instAmount > 0 ? Math.min(assigned, (instPaid / instAmount) * assigned) : 0;
        if (a.status === 'activa') {
            collectedPortionTotal += collectedShare;
        }

        const instDue = inst.dueDate ? new Date(inst.dueDate) : null;
        const isDelayed = inst.status !== 'pagada' && inst.status !== 'pagada_manual' && instDue && instDue < today;
        const isDateMismatch = expenseDueDate && instDue && expenseDueDate < instDue;

        return {
            ...a,
            collectedShare: Math.round(collectedShare * 100) / 100,
            alerts: {
                isDelayed,
                isDateMismatch,
                delayedDays: isDelayed ? Math.ceil((today - instDue) / (1000 * 60 * 60 * 24)) : 0
            }
        };
    });

    return {
        expense: {
            _id: expense._id,
            concept: expense.concept || expense.description,
            category: expense.category,
            beneficiary: expense.beneficiary || expense.targetUser || expense.payeeCompany || 'Sin especificar',
            amount: expenseAmount,
            currency: expense.currency,
            date: expense.date,
            dueDate: expense.dueDate,
            status: expense.status
        },
        summary: {
            expenseAmount,
            coveredTotal,
            remainingToCover,
            coveragePercentage,
            collectedPortionTotal: Math.round(collectedPortionTotal * 100) / 100,
            isFullyCovered: coveredTotal >= expenseAmount,
            activeCount: activeAssignments.length
        },
        assignments: enrichedAssignments
    };
}

/**
 * Assign an installment to an expense with strict concurrency & limits checks.
 */
export async function assignQuotaToExpense({
    expenseId,
    installmentId,
    assignedAmount,
    user = 'Admin',
    notes = ''
}) {
    const numAmount = Number(assignedAmount);
    if (!numAmount || numAmount <= 0) {
        throw new Error('El importe asignado debe ser mayor a 0');
    }

    const expense = await Transaction.findById(expenseId);
    if (!expense) throw new Error('El gasto u obligación no existe');
    if (expense.status === 'anulado') throw new Error('No se pueden asignar cuotas a un gasto anulado');

    const installment = await Installment.findById(installmentId);
    if (!installment) throw new Error('La cuota a asignar no existe');
    if (installment.status === 'anulada') throw new Error('No se puede asignar una cuota anulada');

    // Strict Currency Matching
    if (expense.currency !== installment.currency) {
        throw new Error(`Monedas incompatibles: el gasto está en ${expense.currency} y la cuota en ${installment.currency}. No se permite mezcla de monedas sin conversión explícita.`);
    }

    // Capacity checks for the installment (cannot exceed quota available)
    const { committedTotal } = await getQuotaCommitment(installment._id, expense._id);
    const quotaTotal = Number(installment.amount || 0);
    const quotaAvailable = Math.max(0, quotaTotal - committedTotal);

    if (numAmount > quotaAvailable) {
        throw new Error(`El importe a asignar (${expense.currency} ${numAmount.toLocaleString('es-AR')}) supera el saldo disponible de la cuota (${expense.currency} ${quotaAvailable.toLocaleString('es-AR')}). Monto ya comprometido con otros gastos: ${expense.currency} ${committedTotal.toLocaleString('es-AR')}.`);
    }

    // Capacity checks for the expense (cannot assign more than remaining to cover)
    const { coveredTotal } = await getExpenseCoverage(expense._id, installment._id);
    const expenseTotal = Number(expense.amount || 0);
    const remainingToCover = Math.max(0, expenseTotal - coveredTotal);

    if (numAmount > remainingToCover) {
        throw new Error(`El importe a asignar (${expense.currency} ${numAmount.toLocaleString('es-AR')}) supera lo que falta cubrir del gasto (${expense.currency} ${remainingToCover.toLocaleString('es-AR')}).`);
    }

    // Check if an assignment already exists for this pair
    let assignment = await ExpenseQuotaAssignment.findOne({
        expenseId: expense._id,
        installmentId: installment._id
    });

    if (assignment) {
        const prevAmount = assignment.assignedAmount;
        const prevStatus = assignment.status;

        assignment.assignedAmount = numAmount;
        assignment.currency = expense.currency;
        assignment.status = 'activa';
        assignment.notes = notes || assignment.notes;
        assignment.releasedAt = undefined;
        assignment.releasedBy = undefined;
        assignment.releaseReason = undefined;

        assignment.auditLog.push({
            action: prevStatus === 'activa' ? 'MODIFICADA' : 'CREADA',
            user,
            date: new Date(),
            previousAmount: prevAmount,
            newAmount: numAmount,
            details: `Asignación ${prevStatus === 'activa' ? 'modificada' : 'reactivada'} a ${expense.currency} ${numAmount}`
        });

        await assignment.save();
    } else {
        assignment = new ExpenseQuotaAssignment({
            expenseId: expense._id,
            installmentId: installment._id,
            assignedAmount: numAmount,
            currency: expense.currency,
            status: 'activa',
            assignedBy: user,
            notes,
            auditLog: [{
                action: 'CREADA',
                user,
                date: new Date(),
                newAmount: numAmount,
                details: `Asignación inicial por ${expense.currency} ${numAmount}`
            }]
        });

        await assignment.save();
    }

    return await getExpenseAssignmentSummary(expense._id);
}

/**
 * Release / modify an assignment.
 */
export async function releaseQuotaAssignment(assignmentId, user = 'Admin', reason = 'Liberación voluntaria') {
    const assignment = await ExpenseQuotaAssignment.findById(assignmentId);
    if (!assignment) throw new Error('Asignación no encontrada');

    if (assignment.status === 'liberada') {
        return assignment;
    }

    const prevAmount = assignment.assignedAmount;
    assignment.status = 'liberada';
    assignment.releasedAt = new Date();
    assignment.releasedBy = user;
    assignment.releaseReason = reason;

    assignment.auditLog.push({
        action: 'LIBERADA',
        user,
        date: new Date(),
        previousAmount: prevAmount,
        newAmount: 0,
        reason,
        details: `Asignación liberada. Monto ${assignment.currency} ${prevAmount} desbloqueado para otros gastos.`
    });

    await assignment.save();
    return await getExpenseAssignmentSummary(assignment.expenseId);
}

/**
 * Search available quotas in cartera for assigning to an expense.
 */
export async function searchQuotasForExpense({
    currency,
    search = '',
    expenseId = null,
    limit = 50
}) {
    const query = {
        status: { $nin: ['anulada', 'pagada', 'pagada_manual'] }
    };
    if (currency) {
        query.currency = currency;
    }

    const installments = await Installment.find(query)
        .populate({
            path: 'saleId',
            select: '_id salePrice saleCurrency salesperson status saleDate',
            populate: [
                { path: 'clientId', select: 'firstName lastName fullName phone dni' },
                { path: 'vehicleId', select: 'brand name year plateOrVin price' }
            ]
        })
        .populate('clientId', 'firstName lastName fullName phone dni')
        .populate('vehicleId', 'brand name year plateOrVin price')
        .sort({ dueDate: 1 })
        .limit(200)
        .lean();

    const installmentIds = installments.map(i => i._id);

    // Fetch active assignments for these installments
    const activeAssignments = await ExpenseQuotaAssignment.find({
        installmentId: { $in: installmentIds },
        status: 'activa'
    }).lean();

    const commitmentsByInst = {};
    activeAssignments.forEach(a => {
        const idStr = a.installmentId.toString();
        if (!commitmentsByInst[idStr]) commitmentsByInst[idStr] = { total: 0, byExpense: {} };
        commitmentsByInst[idStr].total += Number(a.assignedAmount || 0);
        commitmentsByInst[idStr].byExpense[a.expenseId.toString()] = Number(a.assignedAmount || 0);
    });

    const searchLower = String(search || '').toLowerCase().trim();

    const results = [];
    for (const inst of installments) {
        const instIdStr = inst._id.toString();
        const totalAmount = Number(inst.amount || 0);
        const paidAmount = Number(inst.paidAmount || 0);

        const comm = commitmentsByInst[instIdStr] || { total: 0, byExpense: {} };
        const assignedToCurrentExpense = expenseId ? (comm.byExpense[String(expenseId)] || 0) : 0;
        const committedToOthers = comm.total - assignedToCurrentExpense;
        const availableToAssign = Math.max(0, totalAmount - committedToOthers);

        // Client & Concept text for filtering
        const isManual = inst.source === 'manual';
        const clientName = isManual
            ? (inst.customerName || 'Cliente manual')
            : (inst.clientId?.fullName || `${inst.clientId?.firstName || ''} ${inst.clientId?.lastName || ''}`.trim() || 'Sin cliente');
        const phone = isManual ? (inst.customerPhone || '') : (inst.clientId?.phone || '');
        const concept = inst.concept || (inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name}` : 'Cuota de venta');
        const opRef = inst.saleId ? `Venta #${String(inst.saleId._id || inst.saleId).slice(-6)}` : 'Manual';

        const matchText = `${clientName} ${phone} ${concept} ${opRef} ${inst.notes || ''}`.toLowerCase();
        if (searchLower && !matchText.includes(searchLower)) {
            continue;
        }

        results.push({
            _id: inst._id,
            source: inst.source || 'venta',
            isManual,
            clientName,
            clientPhone: phone,
            concept,
            operationRef: opRef,
            saleId: inst.saleId?._id || inst.saleId,
            vehicle: inst.vehicleId ? { brand: inst.vehicleId.brand, name: inst.vehicleId.name, plate: inst.vehicleId.plateOrVin } : null,
            installmentNumber: inst.installmentNumber || 1,
            dueDate: inst.dueDate,
            amount: totalAmount,
            paidAmount,
            currency: inst.currency,
            status: inst.status,
            committedToOthers,
            assignedToCurrentExpense,
            availableToAssign,
            notes: inst.notes
        });

        if (results.length >= limit) break;
    }

    return results;
}

/**
 * Check for potential duplicate installments before manual creation.
 */
export async function findDuplicateInstallments({
    customerName,
    amount,
    currency,
    dueDate,
    saleId = null
}) {
    const numAmount = Number(amount);
    const targetDate = new Date(dueDate);

    // 15 days window before/after
    const minDate = new Date(targetDate);
    minDate.setDate(minDate.getDate() - 15);
    const maxDate = new Date(targetDate);
    maxDate.setDate(maxDate.getDate() + 15);

    const query = {
        status: { $ne: 'anulada' },
        currency,
        amount: numAmount,
        dueDate: { $gte: minDate, $lte: maxDate }
    };

    if (saleId && mongoose.isValidObjectId(saleId)) {
        query.saleId = saleId;
    }

    const matches = await Installment.find(query)
        .populate('clientId', 'fullName firstName lastName phone')
        .populate('vehicleId', 'brand name')
        .limit(5)
        .lean();

    if (customerName) {
        const cleanName = customerName.toLowerCase().trim();
        return matches.filter(m => {
            const name = (m.customerName || m.clientId?.fullName || `${m.clientId?.firstName || ''} ${m.clientId?.lastName || ''}`).toLowerCase();
            return name.includes(cleanName) || cleanName.includes(name);
        });
    }

    return matches;
}

/**
 * Create a manual installment and optionally assign it directly to an expense.
 */
export async function createManualQuotaAndAssign({
    customerName,
    customerPhone = '',
    concept,
    amount,
    currency,
    dueDate,
    installmentNumber = 1,
    saleId = null,
    notes = '',
    user = 'Admin',
    forceCreate = false,
    expenseId = null,
    assignedAmount = null
}) {
    if (!customerName || !concept || !amount || !currency || !dueDate) {
        throw new Error('Cliente/deudor, concepto, importe, moneda y fecha de vencimiento son requeridos');
    }

    const numAmount = Number(amount);
    if (numAmount <= 0) {
        throw new Error('El importe debe ser mayor a 0');
    }

    // Check duplicates unless forced
    if (!forceCreate) {
        const duplicates = await findDuplicateInstallments({
            customerName,
            amount: numAmount,
            currency,
            dueDate,
            saleId
        });
        if (duplicates.length > 0) {
            return {
                duplicateWarning: true,
                duplicates,
                message: 'Se encontraron cuotas existentes similares en la cartera. Podés seleccionar una de ellas o confirmar la creación.'
            };
        }
    }

    const newInstallment = new Installment({
        source: 'manual',
        customerName: customerName.trim(),
        customerPhone: customerPhone ? customerPhone.trim() : undefined,
        concept: concept.trim(),
        installmentNumber: Number(installmentNumber) || 1,
        dueDate: new Date(dueDate),
        originalDueDate: new Date(dueDate),
        amount: numAmount,
        currency,
        status: 'pendiente',
        paidAmount: 0,
        notes: notes ? notes.trim() : undefined,
        ...(saleId && mongoose.isValidObjectId(saleId) ? { saleId } : {}),
        createdBy: user,
        installmentAuditLog: [{
            action: 'CUOTA_CREADA',
            user,
            date: new Date(),
            details: `Cuota manual por cobrar creada desde asignación de gastos: ${concept}`
        }]
    });

    const savedInstallment = await newInstallment.save();

    let assignmentResult = null;
    if (expenseId) {
        const assignVal = assignedAmount ? Number(assignedAmount) : numAmount;
        assignmentResult = await assignQuotaToExpense({
            expenseId,
            installmentId: savedInstallment._id,
            assignedAmount: assignVal,
            user,
            notes: `Asignación automática al crear cuota manual`
        });
    }

    return {
        duplicateWarning: false,
        installment: savedInstallment,
        assignmentSummary: assignmentResult
    };
}


/**
 * Get expenses covered by an installment (two-way relationship).
 */
export async function getQuotaCoveredExpenses(installmentId) {
    const installment = await Installment.findById(installmentId).lean();
    if (!installment) throw new Error('Cuota no encontrada');

    const assignments = await ExpenseQuotaAssignment.find({
        installmentId,
        status: 'activa'
    }).populate('expenseId').lean();

    const totalCommitted = assignments.reduce((sum, a) => sum + Number(a.assignedAmount || 0), 0);
    const availableAmount = Math.max(0, Number(installment.amount || 0) - totalCommitted);

    const coveredExpenses = assignments.map(a => {
        const exp = a.expenseId || {};
        return {
            assignmentId: a._id,
            assignedAmount: a.assignedAmount,
            assignedAt: a.assignedAt,
            notes: a.notes,
            expenseId: exp._id,
            concept: exp.concept || exp.description,
            category: exp.category,
            beneficiary: exp.beneficiary || exp.targetUser || exp.payeeCompany || 'Sin especificar',
            expenseAmount: exp.amount,
            currency: exp.currency,
            status: exp.status,
            dueDate: exp.dueDate,
            date: exp.date
        };
    });

    return {
        installment: {
            _id: installment._id,
            amount: installment.amount,
            paidAmount: installment.paidAmount || 0,
            currency: installment.currency,
            dueDate: installment.dueDate,
            status: installment.status
        },
        totalCommitted,
        availableAmount,
        coveredExpenses
    };
}
