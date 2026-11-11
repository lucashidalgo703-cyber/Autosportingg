import { formSaleDate, saleCalendarKey } from './saleCalendarDate.js';

const text = value => typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
const first = (...values) => values.map(text).find(Boolean) || '';
const id = value => {
    const key = typeof value === 'object' ? value?._id : value;
    return typeof key === 'string' && /^[a-f\d]{24}$/i.test(key) ? key : '';
};

// A manually entered buyer remains visible after activation; it is not limited
// to drafts and never silently creates or links a Client.
export function getSaleBuyer(sale) {
    const client = sale?.clientId && typeof sale.clientId === 'object' ? sale.clientId : {};
    const lead = sale?.leadId && typeof sale.leadId === 'object' ? sale.leadId : {};
    const snapshot = sale?.draftData || {};
    return {
        name: first(snapshot.buyerName, client.fullName, [client.firstName, client.lastName].map(text).filter(Boolean).join(' '), lead.name, sale?.buyerName),
        phone: first(snapshot.buyerPhone, client.phone, lead.phone, sale?.buyerPhone),
        email: first(snapshot.buyerEmail, client.email, lead.email, sale?.buyerEmail),
        dni: first(snapshot.buyerDni, client.dniCuit, client.documentNumber, client.dni, lead.dniCuit, lead.documentNumber, lead.dni, sale?.buyerDni),
        clientId: id(sale?.clientId), leadId: id(sale?.leadId)
    };
}

export function saleDeliveryKey(value, actual = false) {
    const calendar = formSaleDate(value);
    if (!calendar) return '';
    const date = new Date(value);
    // Legacy date-only fields use midnight UTC. A delivery event recorded as an
    // actual instant uses Argentina, just as createdAt does in the sale helper.
    return actual && Number.isFinite(date.getTime()) && date.toISOString().slice(11) !== '00:00:00.000Z'
        ? saleCalendarKey({ createdAt: value }) : calendar;
}
export function formatSaleDeliveryDate(value, actual = false, empty = 'Sin fecha') {
    const key = saleDeliveryKey(value, actual);
    return key ? key.split('-').reverse().join('/') : empty;
}

export function mergeSaleResponse(previous, updated) {
    const merged = { ...(previous || {}), ...updated };
    for (const field of ['clientId', 'vehicleId', 'leadId', 'reservationId']) {
        if (typeof updated?.[field] === 'string' && previous?.[field] && typeof previous[field] === 'object' && id(previous[field]) === updated[field]) merged[field] = previous[field];
    }
    return merged;
}
