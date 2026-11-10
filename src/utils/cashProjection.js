import { roundMoney } from './saleCommercial.js';

export const OPEN_INSTALLMENT_STATUSES = Object.freeze(['pendiente', 'parcial', 'vencida', 'reprogramada']);
const ACTIVE_SALE_STATUSES = new Set(['señado', 'confirmada', 'pendiente_entrega', 'entregada']);
const CURRENCIES = ['ARS', 'USD'];
const DAY_MS = 86400000;
const normalize = (value) => String(value ?? '').trim().toLowerCase();
const emptyMoney = () => ({ ARS: 0, USD: 0 });

function idOf(value) {
    if (value === null || value === undefined) return null;
    const id = String(value?._id ?? value);
    return id && id !== '[object Object]' ? id : null;
}

function validNumber(value) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

// Vencimientos son fechas de calendario, no instantes: Mongo suele conservarlos
// como medianoche UTC después de recibir un input YYYY-MM-DD. No restarles tres horas.
export function getBusinessDateKey(value) {
    if (!value) return null;
    const text = value instanceof Date
        ? (Number.isNaN(value.getTime()) ? '' : value.toISOString())
        : String(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(text);
    if (!match) return null;
    if (text.includes('T') && Number.isNaN(new Date(text).getTime())) return null;
    const key = `${match[1]}-${match[2]}-${match[3]}`;
    const date = new Date(`${key}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : null;
}

export function getArgentinaDateKey(asOf = new Date()) {
    if (typeof asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
        const key = getBusinessDateKey(asOf);
        if (key) return key;
        throw new TypeError('Fecha de corte inválida');
    }
    const date = new Date(asOf);
    if (Number.isNaN(date.getTime())) throw new TypeError('Fecha de corte inválida');
    const parts = new Intl.DateTimeFormat('en', {
        timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
}

export function getEffectiveInstallmentDueDate(installment) {
    const source = installment?.isRescheduled && installment?.rescheduledDate
        ? installment.rescheduledDate
        : installment?.originalDueDate || installment?.dueDate;
    const key = getBusinessDateKey(source);
    return key ? new Date(`${key}T00:00:00.000Z`) : null;
}

// Presentación compartida con el panel de vencimientos. No modifica amount: el
// saldo neto y la nueva fecha se conservan separados del acuerdo original.
export function getUpcomingInstallmentPresentation(installment, asOf = new Date()) {
    const originalAmount = validNumber(installment?.amount);
    const paid = installment?.paidAmount === undefined ? 0 : validNumber(installment.paidAmount);
    const suppliedPending = validNumber(installment?.pendingAmount);
    const pendingAmount = installment?.pendingAmount !== undefined
        ? (suppliedPending !== null && suppliedPending >= 0 ? roundMoney(suppliedPending) : null)
        : (originalAmount !== null && originalAmount >= 0 && paid !== null && paid >= 0 ? roundMoney(Math.max(0, originalAmount - paid)) : null);
    const dueDateKey = getBusinessDateKey(installment?.effectiveDueDate ?? getEffectiveInstallmentDueDate(installment));
    const todayKey = getArgentinaDateKey(asOf);
    const daysUntilDue = dueDateKey
        ? Math.round((Date.parse(`${dueDateKey}T00:00:00.000Z`) - Date.parse(`${todayKey}T00:00:00.000Z`)) / DAY_MS)
        : null;
    let badgeLabel = 'Sin fecha de vencimiento';
    if (daysUntilDue !== null) {
        if (daysUntilDue < 0) badgeLabel = `Vencido hace ${-daysUntilDue} ${daysUntilDue === -1 ? 'día' : 'días'}`;
        else if (daysUntilDue === 0) badgeLabel = 'Vence hoy';
        else if (daysUntilDue === 1) badgeLabel = 'Vence mañana';
        else badgeLabel = `Vence en ${daysUntilDue} días`;
    }
    return { pendingAmount, dueDateKey, daysUntilDue, badgeLabel, dueDateLabel: dueDateKey ? dueDateKey.split('-').reverse().join('/') : '—' };
}

/**
 * Lectura determinista. No modifica cuentas, cuotas ni movimientos.
 * Alcance: saldo registrado + cuotas abiertas + movimientos pendientes explícitos.
 * No supone ventas futuras, recuperación de mora ni obligaciones que no estén registradas.
 */
export function buildCashProjection({ accounts = [], installments = [], transactions = [], sales = [], asOf = new Date() } = {}) {
    const dateKey = getArgentinaDateKey(asOf);
    const startDay = Date.parse(`${dateKey}T00:00:00.000Z`) / DAY_MS;
    const openingBalances = emptyMoney();
    const issues = [];
    const openingUnreliable = new Set();
    const flowsUnreliable = new Set();
    const calendar = [];
    const excluded = { inactiveAccounts: 0, closedInstallments: 0, inactiveSales: 0, historicalSales: 0, linkedInstallmentTransactions: 0, duplicateRecords: 0 };
    const saleMap = new Map(sales.map((sale) => [idOf(sale), sale]));
    const installmentMap = new Map(installments.map((installment) => [idOf(installment), installment]));

    const addIssue = (source, record, code, unreliable = null) => {
        const currency = CURRENCIES.includes(record?.currency) ? record.currency : null;
        issues.push({ source, id: idOf(record), code, currency });
        if (unreliable) (currency ? [currency] : CURRENCIES).forEach((key) => unreliable.add(key));
    };
    const unique = (records) => {
        const seen = new Set();
        return records.filter((record) => {
            const id = idOf(record);
            if (!id) return true;
            if (seen.has(id)) { excluded.duplicateRecords++; return false; }
            seen.add(id);
            return true;
        });
    };
    const eligibleSale = (record, source) => {
        const saleId = idOf(record.saleId);
        if (!saleId) {
            if (source === 'cuota' && record.source === 'venta') {
                addIssue(source, record, 'venta_no_vinculada', flowsUnreliable);
                return false;
            }
            return true;
        }
        const sale = saleMap.get(saleId) || (typeof record.saleId === 'object' && record.saleId?.status ? record.saleId : null);
        if (!sale) { addIssue(source, record, 'venta_no_encontrada', flowsUnreliable); return false; }
        // La marca explícita distingue nuevas cargas solo para reportes de las
        // importaciones legacy, que pueden conservar cuotas realmente cobrables.
        if (sale.historicalOnly === true) { excluded.historicalSales++; return false; }
        if (!ACTIVE_SALE_STATUSES.has(normalize(sale.status))) {
            if (['borrador', 'cancelada'].includes(normalize(sale.status))) excluded.inactiveSales++;
            else addIssue(source, record, 'estado_venta_invalido', flowsUnreliable);
            return false;
        }
        return true;
    };
    const addFlow = (record, source, direction, amount, dueDate) => {
        if (!CURRENCIES.includes(record.currency)) { addIssue(source, record, 'moneda_invalida', flowsUnreliable); return; }
        if (amount === null || amount < 0) { addIssue(source, record, 'importe_invalido', flowsUnreliable); return; }
        if (amount === 0) return;
        const key = getBusinessDateKey(dueDate);
        if (dueDate && !key) addIssue(source, record, 'fecha_invalida');
        const day = key ? Date.parse(`${key}T00:00:00.000Z`) / DAY_MS : null;
        calendar.push({
            id: idOf(record), source, direction, amount: roundMoney(amount), currency: record.currency,
            dueDate: key, daysFromToday: day === null ? null : day - startDay,
            label: record.concept || record.description || (source === 'cuota' ? `Cuota ${record.installmentNumber || ''}`.trim() : 'Movimiento pendiente')
        });
    };

    unique(accounts).forEach((account) => {
        if (account.isActive === false) { excluded.inactiveAccounts++; return; }
        if (!CURRENCIES.includes(account.currency)) { addIssue('cuenta', account, 'moneda_invalida', openingUnreliable); return; }
        const balance = validNumber(account.balance);
        if (balance === null) { addIssue('cuenta', account, 'saldo_invalido', openingUnreliable); return; }
        openingBalances[account.currency] = roundMoney(openingBalances[account.currency] + balance);
    });

    unique(installments).forEach((installment) => {
        if (!OPEN_INSTALLMENT_STATUSES.includes(normalize(installment.status))) {
            if (['pagada', 'pagada_manual', 'anulada'].includes(normalize(installment.status))) excluded.closedInstallments++;
            else addIssue('cuota', installment, 'estado_invalido', flowsUnreliable);
            return;
        }
        if (!eligibleSale(installment, 'cuota')) return;
        const amount = validNumber(installment.amount);
        const paid = installment.paidAmount === undefined ? 0 : validNumber(installment.paidAmount);
        if (amount === null || paid === null || amount < 0 || paid < 0) { addIssue('cuota', installment, 'importe_invalido', flowsUnreliable); return; }
        if (paid > amount) addIssue('cuota', installment, 'pagos_superan_importe');
        const effectiveDate = getEffectiveInstallmentDueDate(installment);
        const rawDate = installment.isRescheduled && installment.rescheduledDate
            ? installment.rescheduledDate : installment.originalDueDate || installment.dueDate;
        if (rawDate && !effectiveDate) addIssue('cuota', installment, 'fecha_invalida');
        addFlow(installment, 'cuota', 'incoming', Math.max(0, amount - paid), effectiveDate);
    });

    unique(transactions).forEach((transaction) => {
        if (normalize(transaction.status) !== 'pendiente') return;
        const type = normalize(transaction.type);
        if (type !== 'ingreso' && type !== 'egreso') { addIssue('movimiento', transaction, 'tipo_invalido', flowsUnreliable); return; }
        if (type === 'ingreso') {
            if (!eligibleSale(transaction, 'movimiento')) return;
            const installmentId = idOf(transaction.installmentId);
            if (installmentId) {
                if (!installmentMap.has(installmentId)) addIssue('movimiento', transaction, 'cuota_no_encontrada', flowsUnreliable);
                excluded.linkedInstallmentTransactions++;
                return;
            }
        }
        // Un egreso explícito sigue siendo una obligación, incluso si su venta fue cancelada.
        addFlow(transaction, 'movimiento', type === 'ingreso' ? 'incoming' : 'outgoing', validNumber(transaction.amount), transaction.dueDate);
    });

    const group = (predicate) => {
        const result = { incoming: emptyMoney(), outgoing: emptyMoney(), count: 0 };
        calendar.filter(predicate).forEach((item) => {
            result[item.direction][item.currency] = roundMoney(result[item.direction][item.currency] + item.amount);
            result.count++;
        });
        return result;
    };
    const periods = [7, 15, 30].map((days) => {
        const totals = group((item) => item.daysFromToday !== null && item.daysFromToday >= 0 && item.daysFromToday < days);
        const closingBalances = emptyMoney();
        CURRENCIES.forEach((currency) => {
            closingBalances[currency] = openingUnreliable.has(currency) || flowsUnreliable.has(currency)
                ? null : roundMoney(openingBalances[currency] + totals.incoming[currency] - totals.outgoing[currency]);
            if (flowsUnreliable.has(currency)) { totals.incoming[currency] = null; totals.outgoing[currency] = null; }
        });
        return { days, fromDate: dateKey, toDate: new Date((startDay + days - 1) * DAY_MS).toISOString().slice(0, 10), ...totals, closingBalances };
    });
    openingUnreliable.forEach((currency) => { openingBalances[currency] = null; });
    calendar.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || String(a.id).localeCompare(String(b.id)));
    const uncertainGroup = (predicate) => {
        const result = group(predicate);
        flowsUnreliable.forEach((currency) => { result.incoming[currency] = null; result.outgoing[currency] = null; });
        return result;
    };

    return {
        asOf: new Date(asOf).toISOString(), dateKey, timeZone: 'America/Argentina/Buenos_Aires',
        scope: 'cuotas_y_movimientos_pendientes', openingBalances, periods,
        overdue: uncertainGroup((item) => item.daysFromToday !== null && item.daysFromToday < 0),
        undated: uncertainGroup((item) => item.daysFromToday === null), calendar,
        quality: { complete: issues.length === 0, issues, excluded, unreliableCurrencies: [...new Set([...openingUnreliable, ...flowsUnreliable])] },
        coverage: {
            included: 'Cuotas abiertas y movimientos pendientes registrados.',
            excluded: 'No incluye ventas futuras, margen, cuotas pagadas, reglas recurrentes sin movimiento ni obligaciones a propietarios o comisiones sin movimiento registrado.'
        }
    };
}
