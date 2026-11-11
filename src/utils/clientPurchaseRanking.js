import { saleCalendarKey } from './saleCalendarDate.js';

const id = value => String(value?._id || value || '');
const documentKey = value => {
    const key = String(value || '').normalize('NFKC').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return key.length >= 4 && !['SINDNI', 'SINDOCUMENTO', 'PENDIENTE'].includes(key) ? key : '';
};
const currency = value => ['ARS', '$'].includes(value) ? 'ARS' : ['USD', 'U$S', 'US$'].includes(value) ? 'USD' : null;
const openStatuses = new Set(['señado', 'confirmada', 'pendiente_entrega']);

// Closed-sale totals never include open operations. Exact DNI recovery is read
// only and requires one unambiguous client; it never relinks a sale in Mongo.
export function buildClientPurchaseRanking(sales, clients, range = {}) {
    const byId = new Map(clients.map(client => [id(client), client]));
    const byDni = new Map();
    for (const client of clients) {
        const key = documentKey(client.dniCuit);
        if (key) byDni.set(key, [...(byDni.get(key) || []), client]);
    }
    const rows = new Map();
    const summary = { buyers: 0, vehiclesSold: 0, returningBuyers: 0, billed: { ARS: 0, USD: 0 }, openOnlyClients: 0, unknownCurrencyCount: 0, invalidAmountCount: 0, unmatchedClosedCount: 0, ambiguousDniCount: 0 };
    for (const sale of sales) {
        const closed = sale.status === 'entregada';
        if (!closed && (!openStatuses.has(sale.status) || sale.historicalOnly === true)) continue;
        const date = saleCalendarKey(sale);
        if (range.fromKey && (!date || date < range.fromKey || date >= range.toKey)) continue;
        let client = byId.get(id(sale.clientId)), fromDni = false;
        if (!client) {
            const key = documentKey(sale.draftData?.buyerDni || sale.buyerDni || sale.buyerDocument);
            const candidates = key ? byDni.get(key) || [] : [];
            if (candidates.length === 1) { client = candidates[0]; fromDni = true; }
            else if (candidates.length > 1) summary.ambiguousDniCount++;
        }
        if (!client) { if (closed) summary.unmatchedClosedCount++; continue; }
        const clientId = id(client);
        const row = rows.get(clientId) || { _id: clientId, clientId, fullName: client.fullName || '', dniCuit: client.dniCuit || '', salesCount: 0, historicalCount: 0, unknownCurrencyCount: 0, invalidAmountCount: 0, totals: { ARS: 0, USD: 0 }, openCount: 0, openTotals: { ARS: 0, USD: 0 }, firstPurchaseDate: null, lastPurchaseDate: null, dniMatchedCount: 0 };
        const code = currency(sale.saleCurrency), value = sale.salePrice;
        if (fromDni) row.dniMatchedCount++;
        if (closed) {
            row.salesCount++; if (sale.historicalOnly === true) row.historicalCount++;
            if (code && typeof value === 'number' && Number.isFinite(value) && value >= 0) row.totals[code] += value;
            if (!code) row.unknownCurrencyCount++;
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) row.invalidAmountCount++;
            if (date && (!row.firstPurchaseDate || date < row.firstPurchaseDate)) row.firstPurchaseDate = date;
            if (date && (!row.lastPurchaseDate || date > row.lastPurchaseDate)) row.lastPurchaseDate = date;
        } else { row.openCount++; if (code && typeof value === 'number' && Number.isFinite(value) && value >= 0) row.openTotals[code] += value; }
        rows.set(clientId, row);
    }
    const sorted = [...rows.values()].sort((a, b) => b.salesCount - a.salesCount || b.openCount - a.openCount || a.fullName.localeCompare(b.fullName, 'es'));
    const purchaseRanking = sorted.filter(row => row.salesCount > 0), openPurchaseRanking = sorted.filter(row => row.salesCount === 0 && row.openCount > 0);
    for (const row of purchaseRanking) {
        summary.buyers++; summary.vehiclesSold += row.salesCount;
        if (row.salesCount > 1) summary.returningBuyers++;
        summary.billed.ARS += row.totals.ARS; summary.billed.USD += row.totals.USD;
        summary.unknownCurrencyCount += row.unknownCurrencyCount;
        summary.invalidAmountCount += row.invalidAmountCount;
    }
    summary.openOnlyClients = openPurchaseRanking.length;
    return { purchaseRanking, openPurchaseRanking, rankingSummary: summary };
}
