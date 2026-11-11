import { parseDecimal, roundMoney } from './saleCommercial.js';
import { formSaleDate } from './saleCalendarDate.js';

export const SALE_REMINDER_TYPES = { llamada: 'Llamada', postentrega: 'Post entrega', vtv: 'VTV', service: 'Service', seguro: 'Seguro', patente: 'Patente', garantia: 'Garantía', cumple: 'Cumpleaños', otro: 'Otro' };
export class SaleWorkspaceError extends Error {
    constructor(field, message, statusCode = 400, code = 'SALE_VALIDATION_FAILED') { super(message); Object.assign(this, { errors: { [field]: message }, statusCode, code }); }
}
const fail = (field, message) => { throw new SaleWorkspaceError(field, message); };
const text = (value, field, limit = 5000) => { if (value == null) return ''; if (typeof value !== 'string' || value.length > limit) fail(field, 'Revisá este texto.'); return value.trim(); };
const amount = (value, field, empty = 0) => { if (value != null && typeof value !== 'number' && typeof value !== 'string') fail(field, 'Ingresá un importe válido.'); const n = value === '' || value == null ? empty : parseDecimal(value); if (!Number.isFinite(n) || n < 0) fail(field, 'Ingresá un importe válido mayor o igual a cero.'); return roundMoney(n); };
const id = (value, field) => { if (!value) return undefined; if (!/^[a-f\d]{24}$/i.test(String(value))) fail(field, 'La referencia no es válida.'); return String(value); };
const currency = (value, field) => { if (!['ARS', 'USD'].includes(value)) fail(field, 'Elegí ARS o USD.'); return value; };
export function saleDateInput(value, field) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) fail(field, 'Ingresá una fecha válida.');
    const key = value.slice(0, 10); const d = new Date(`${key}T00:00:00.000Z`);
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== key) fail(field, 'Ingresá una fecha válida.');
    return key;
}
export function normalizeSaleWorkspace(payload, current = {}) {
    const out = {};
    if (Object.hasOwn(payload, 'exchangeRate')) {
        out.exchangeRate = payload.exchangeRate === '' || payload.exchangeRate == null ? undefined : amount(payload.exchangeRate, 'exchangeRate');
        if (out.exchangeRate === 0) fail('exchangeRate', 'La cotización debe ser mayor a cero.');
    }
    if (Object.hasOwn(payload, 'depositRecords')) {
        if (!Array.isArray(payload.depositRecords) || payload.depositRecords.length > 30) fail('depositRecords', 'Revisá la lista de señas (máximo 30).');
        out.depositRecords = payload.depositRecords.map((entry, i) => {
            const key = `depositRecords.${i}`; if (!entry || typeof entry !== 'object') fail(key, 'Seña inválida.');
            const entryId = id(entry._id, key); const old = (current.depositRecords || []).find(row => String(row._id) === entryId);
            const result = { ...(entryId ? { _id: entryId } : {}), amount: amount(entry.amount, `${key}.amount`), currency: currency(entry.currency, `${key}.currency`), date: saleDateInput(entry.date, `${key}.date`), accountId: id(entry.accountId?._id || entry.accountId, `${key}.accountId`), notes: text(entry.notes, `${key}.notes`), status: old?.status || 'pendiente' };
            for (const field of ['transactionId', 'confirmedAt', 'confirmedBy']) if (old?.[field]) result[field] = old[field];
            if (result.amount <= 0) fail(`${key}.amount`, 'La seña debe ser mayor a cero.');
            if (old && old.status !== 'pendiente' && ['amount', 'currency', 'date', 'accountId'].some(field => field === 'date' ? formSaleDate(result[field]) !== formSaleDate(old[field]) : String(result[field] || '') !== String(old[field] || ''))) fail(key, 'Una seña procesada no se modifica desde el acuerdo comercial.');
            return result;
        });
        for (const old of current.depositRecords || []) if (old.status !== 'pendiente' && !out.depositRecords.some(row => row._id === String(old._id))) fail('depositRecords', 'No se puede quitar una seña procesada.');
    }
    if (Object.hasOwn(payload, 'tradeIns')) {
        if (!Array.isArray(payload.tradeIns) || payload.tradeIns.length > 20) fail('tradeIns', 'Revisá la lista de permutas (máximo 20).');
        out.tradeIns = payload.tradeIns.map((entry, i) => {
            const key = `tradeIns.${i}`; if (!entry || typeof entry !== 'object') fail(key, 'Permuta inválida.');
            const entryId = id(entry._id, key); const old = (current.tradeIns || []).find(row => String(row._id) === entryId);
            const result = { ...(entryId ? { _id: entryId } : {}) };
            for (const field of ['brand', 'model', 'version', 'plate', 'color', 'vin', 'engineNumber', 'ownerName', 'conditionNotes', 'mechanicalNotes', 'fuel', 'condition', 'location']) result[field] = text(entry[field], `${key}.${field}`, field.endsWith('Notes') ? 5000 : 300);
            result.ownerDni = text(entry.ownerDni ?? entry.ownerDocument, `${key}.ownerDni`, 100);
            result.year = amount(entry.year, `${key}.year`, NaN);
            if (!Number.isInteger(result.year) || result.year < 1886 || result.year > 2200) fail(`${key}.year`, 'Ingresá un año válido.');
            if (!result.brand || !result.model) fail(key, 'Completá marca y modelo de la permuta.');
            result.estimatedValue = amount(entry.estimatedValue, `${key}.estimatedValue`, NaN);
            result.currency = currency(entry.currency, `${key}.currency`);
            result.mileage = amount(entry.mileage, `${key}.mileage`);
            if (!Number.isInteger(result.mileage)) fail(`${key}.mileage`, 'Los kilómetros deben ser un entero.');
            result.askingPrice = amount(entry.askingPrice, `${key}.askingPrice`, result.estimatedValue);
            result.shouldEnterStock = entry.shouldEnterStock === true;
            result.existingStockCarId = id(entry.existingStockCarId, `${key}.existingStockCarId`);
            result.consigned = entry.consigned === true;
            for (const field of ['linkedStockCarId', 'receivedAt', 'receivedBy', 'enteredStockAt']) if (old?.[field]) result[field] = old[field];
            // Existing debt/documentation/transfer metadata belongs to its dedicated workflow.
            for (const field of ['documentationStatus', 'hasDebt', 'debtAmount', 'hasLien', 'transferStatus']) if (old?.[field] != null) result[field] = old[field];
            if (old?.linkedStockCarId && ['estimatedValue', 'currency'].some(field => String(result[field]) !== String(old[field]))) fail(key, 'Corregí el valor de toma desde Stock para conservar la trazabilidad.');
            if (result.shouldEnterStock && !old?.linkedStockCarId && !result.existingStockCarId && (!result.fuel || !result.condition)) fail(key, 'Para ingresar al stock, indicá combustible y condición.');
            return result;
        });
        for (const old of current.tradeIns || []) if (old.linkedStockCarId && !out.tradeIns.some(row => row._id === String(old._id))) fail('tradeIns', 'No se puede quitar una permuta ya vinculada al stock.');
    }
    if (Object.hasOwn(payload, 'reminders')) {
        if (!Array.isArray(payload.reminders) || payload.reminders.length > 100) fail('reminders', 'Revisá los recordatorios (máximo 100).');
        out.reminders = payload.reminders.map((row, i) => {
            if (!row || !Object.hasOwn(SALE_REMINDER_TYPES, row.type)) fail(`reminders.${i}.type`, 'Elegí un tipo de recordatorio.');
            return { ...(row._id ? { _id: id(row._id, `reminders.${i}`) } : {}), type: row.type, date: saleDateInput(row.date, `reminders.${i}.date`), note: text(row.note, `reminders.${i}.note`), completed: row.completed === true };
        });
    }
    if (Object.hasOwn(payload, 'reviewAsked')) {
        if (typeof payload.reviewAsked !== 'boolean') fail('reviewAsked', 'Revisá la indicación de reseña.');
        out.reviewAsked = payload.reviewAsked;
        out.reviewAskedAt = out.reviewAsked ? (current.reviewAskedAt || new Date()) : null;
    }
    if (payload.managementNote) {
        const note = payload.managementNote;
        if (!['gestoria', 'finanzas'].includes(note.recipient)) fail('managementNote.recipient', 'Elegí Gestoría o Finanzas.');
        out.managementNote = { recipient: note.recipient, text: text(note.text, 'managementNote.text') };
        if (!out.managementNote.text) fail('managementNote.text', 'Escribí la gestión.');
    }
    for (const key of ['depositRecords', 'tradeIns', 'reminders']) if (out[key]) { const ids = out[key].map(row => row._id).filter(Boolean); if (new Set(ids).size !== ids.length) fail(key, 'Hay registros duplicados en la lista. Volvé a abrir la venta.'); }
    return out;
}

// ARS por USD, únicamente la cotización explícitamente guardada en esta venta.
export function saleTradeInComposition(sale) {
    const totals = { ARS: 0, USD: 0 }; const target = sale.saleCurrency;
    let credit = 0; let unresolved = 0;
    for (const row of sale.tradeIns || []) {
        const value = Number(row.estimatedValue); if (!Number.isFinite(value) || value < 0 || !Object.hasOwn(totals, row.currency)) continue;
        totals[row.currency] = roundMoney(totals[row.currency] + value);
        if (row.currency === target) credit += value;
        else if (Number.isFinite(Number(sale.exchangeRate)) && Number(sale.exchangeRate) > 0) credit += target === 'ARS' ? value * Number(sale.exchangeRate) : value / Number(sale.exchangeRate);
        else if (value > 0) unresolved++;
    }
    return { totals, credit: roundMoney(credit), unresolved, balance: roundMoney(Math.max(0, Number(sale.salePrice || 0) - credit - (sale.depositAppliedCurrency === target ? Number(sale.depositAppliedAmount || 0) : 0))) };
}
