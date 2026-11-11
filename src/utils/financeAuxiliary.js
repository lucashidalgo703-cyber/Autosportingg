import { getArgentinaDateKey } from './cashProjection.js';
export const FINANCE_AUXILIARY_PATHS = { card: 'card-expenses', withdrawal: 'withdrawals', loan: 'loans', budget: 'budgets', recurrence: 'recurrences' };
export function financeAuxiliaryDate(value) { try { return value ? getArgentinaDateKey(value) : null; } catch { return null; } }
export function validateFinanceAuxiliary(kind, values, accounts = [], mode = 'create') {
    const errors = {}, payload = { ...values };
    const currency = mode === 'return' ? values.currency : payload.currency;
    const accountField = mode === 'return' ? 'targetAccountId' : 'accountId';
    const requiresAccount = mode === 'return' || ['card', 'withdrawal', 'loan', 'recurrence'].includes(kind);
    if (requiresAccount && !accounts.some(account => String(account._id) === String(values[accountField]) && account.isActive !== false && account.currency === currency)) errors[accountField] = 'Elegí una cuenta activa de la misma moneda.';
    if (mode === 'return') return { errors, payload: { status: 'devuelto', targetAccountId: values.targetAccountId } };
    if (!['ARS', 'USD'].includes(currency)) errors.currency = 'Elegí ARS o USD.';
    const amountKey = kind === 'budget' ? 'plannedAmount' : 'amount', amount = Number(values[amountKey]);
    if (values[amountKey] === '' || !Number.isFinite(amount) || (kind === 'budget' ? amount < 0 : amount <= 0)) errors[amountKey] = kind === 'budget' ? 'Ingresá un presupuesto mayor o igual a cero.' : 'Ingresá un monto mayor a cero.';
    payload[amountKey] = amount;
    for (const [key, label] of kind === 'loan' ? [['personName', 'La persona']] : kind === 'budget' ? [['category', 'La categoría']] : kind === 'recurrence' ? [['name', 'El nombre'], ['category', 'La categoría']] : []) if (!String(values[key] || '').trim()) errors[key] = label + ' es obligatoria.';
    if (kind === 'recurrence') {
        const day = Number(values.dayOfMonth); if (!Number.isInteger(day) || day < 1 || day > 31) errors.dayOfMonth = 'Elegí un día entero entre 1 y 31.';
        if (!['Ingreso', 'Egreso'].includes(values.type)) errors.type = 'Elegí ingreso o egreso.';
        payload.dayOfMonth = day;
    }
    if (kind === 'card') { payload.concept = String(values.concept || '').trim() || 'Gasto Tarjeta'; payload.description = String(values.description || '').trim() || 'Gasto Tarjeta'; }
    if (kind === 'loan' && !values.expectedReturnDate) delete payload.expectedReturnDate;
    return { errors, payload };
}
export function financeAuxiliaryTotals(rows, amountKey = 'amount') {
    const totals = { ARS: 0, USD: 0, excluded: 0 };
    for (const row of rows) { if (row.status === 'anulado') continue; const amount = Number(row[amountKey]); if (!['ARS', 'USD'].includes(row.currency) || !Number.isFinite(amount)) { totals.excluded++; continue; } totals[row.currency] += amount; }
    return totals;
}
