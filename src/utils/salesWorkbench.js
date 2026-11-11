import { getSaleBuyer } from './salePresentation.js';
import { saleCalendarKey, formSaleDate } from './saleCalendarDate.js';

export const SALE_FILTER_DEFAULTS = { search: '', seller: '', status: 'todas', currency: 'todas', paymentMethod: 'todas', documentationStatus: 'todas', deliveryStatus: 'todas', collectionStatus: 'todas', dateFrom: '', dateTo: '', month: '', tradeInOnly: false, sort: 'date', direction: 'desc' };
export const SALE_STATUS_TABS = [['todas', 'Todas'], ['borrador', 'Borradores'], ['confirmada', 'Activas'], ['señado', 'Reservas'], ['entregada', 'Cerradas'], ['caida', 'Caídas'], ['cancelada', 'Canceladas']];
export const SALE_PAYMENT_LABELS = { contado: 'Contado', financiado: 'Financiado', mixto: 'Mixto', leasing: 'Leasing', permuta: 'Permuta', criptomonedas: 'Criptomonedas', otro: 'Otro' };
export const SALE_SORT_FIELDS = ['date', 'vehicle', 'buyer', 'seller', 'price', 'status'];
export function readSalesFilters(search) { const params = new URLSearchParams(search); const result = { ...SALE_FILTER_DEFAULTS }; for (const key of Object.keys(result)) if (params.has(key)) result[key] = key === 'tradeInOnly' ? params.get(key) === 'true' : params.get(key); return result; }
export function writeSalesFilters(filters, path = '/admin/ventas') { const query = new URLSearchParams(); for (const [key, fallback] of Object.entries(SALE_FILTER_DEFAULTS)) if (filters[key] !== fallback && filters[key] !== '') query.set(key, String(filters[key])); return path + (query.size ? `?${query}` : ''); }
export function filterSales(sales, filters) {
    const term = filters.search.trim().toLocaleLowerCase('es');
    return sales.filter(sale => {
        const buyer = getSaleBuyer(sale); const vehicle = typeof sale.vehicleId === 'object' ? sale.vehicleId : {};
        if (term && ![buyer.name, buyer.phone, buyer.dni, buyer.email, vehicle?.brand, vehicle?.name, vehicle?.plateOrVin, sale.salesperson].join(' ').toLocaleLowerCase('es').includes(term)) return false;
        if (filters.seller && filters.seller !== sale._sellerKey && filters.seller !== sale.salesperson && filters.seller !== sale.assignedTo?.username) return false;
        if (filters.status === 'confirmada' ? !['confirmada', 'pendiente_entrega'].includes(sale.status) : filters.status === 'caida' ? !(sale.status === 'cancelada' && sale.cancellationKind === 'caida') : filters.status === 'cancelada' ? !(sale.status === 'cancelada' && sale.cancellationKind !== 'caida') : filters.status !== 'todas' && sale.status !== filters.status) return false;
        if (filters.currency !== 'todas' && sale.saleCurrency !== filters.currency) return false;
        if (filters.paymentMethod !== 'todas' && sale.paymentMethod !== filters.paymentMethod) return false;
        if (filters.tradeInOnly && !sale.tradeIns?.length) return false;
        const operational = !sale.historicalOnly && sale.status !== 'borrador';
        for (const key of ['documentationStatus', 'deliveryStatus', 'collectionStatus']) if (filters[key] && filters[key] !== 'todas' && (!operational || (key === 'collectionStatus' ? sale.finance?.collectionStatus || 'sin_cobro' : sale[key] || 'pendiente') !== filters[key])) return false;
        const date = saleCalendarKey(sale);
        return !(filters.dateFrom && (!date || date < filters.dateFrom) || filters.dateTo && (!date || date > filters.dateTo) || filters.month && date.slice(0, 7) !== filters.month);
    });
}

const queryError = message => { throw Object.assign(new Error(message), { statusCode: 400, code: 'SALE_WORKBENCH_QUERY_INVALID' }); };
export function normalizeSalesWorkbenchQuery(query = {}) {
    const result = { ...SALE_FILTER_DEFAULTS };
    for (const key of Object.keys(result)) {
        if (!Object.hasOwn(query, key)) continue;
        if (key === 'tradeInOnly') { if (![true, false, 'true', 'false', ''].includes(query[key])) queryError('Revisá el filtro de permutas.'); result[key] = query[key] === true || query[key] === 'true'; }
        else { if (typeof query[key] !== 'string' || query[key].length > (key === 'search' ? 300 : 150)) queryError('Revisá los filtros de ventas.'); result[key] = query[key]; }
    }
    if (!SALE_SORT_FIELDS.includes(result.sort) || !['asc', 'desc'].includes(result.direction)) queryError('El orden solicitado no es válido.');
    if (!SALE_STATUS_TABS.some(([key]) => key === result.status)) queryError('El estado solicitado no es válido.');
    if (!['todas', 'ARS', 'USD'].includes(result.currency) || result.paymentMethod !== 'todas' && !Object.hasOwn(SALE_PAYMENT_LABELS, result.paymentMethod)) queryError('Revisá la moneda o el medio de pago.');
    for (const key of ['dateFrom', 'dateTo']) if (result[key] && formSaleDate(result[key]) !== result[key]) queryError('Revisá las fechas del filtro.');
    if (result.month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(result.month)) queryError('Revisá el mes del filtro.');
    const page = query.page === undefined ? 1 : Number(query.page), limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) queryError('La página o su tamaño no son válidos.');
    return { ...result, page, limit };
}
export function salesWorkbenchQuery(filters, { page = 1, limit = 20, exportAll = false } = {}) {
    const query = new URLSearchParams({ workspace: '1', page: String(page), limit: String(limit) });
    for (const [key, fallback] of Object.entries(SALE_FILTER_DEFAULTS)) if (filters[key] !== fallback && filters[key] !== '') query.set(key, String(filters[key]));
    if (exportAll) query.set('export', '1');
    return query;
}
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const statusLabel = sale => sale.cancellationKind === 'caida' ? 'Caída' : ({ borrador: 'Borrador', confirmada: 'Activa', pendiente_entrega: 'Pendiente de entrega', señado: 'Reserva', entregada: 'Cerrada', cancelada: 'Cancelada' }[sale.status] || sale.status || '');
export function sortSales(sales, sort = 'date', direction = 'desc') {
    if (!SALE_SORT_FIELDS.includes(sort) || !['asc', 'desc'].includes(direction)) queryError('El orden solicitado no es válido.');
    const sign = direction === 'asc' ? 1 : -1;
    const value = sale => sort === 'date' ? saleCalendarKey(sale) : sort === 'vehicle' ? [sale.vehicleId?.brand, sale.vehicleId?.name, sale.vehicleId?.year, sale.vehicleId?.plateOrVin].filter(Boolean).join(' ') : sort === 'buyer' ? getSaleBuyer(sale).name : sort === 'seller' ? sale.salesperson || sale.assignedTo?.name || '' : statusLabel(sale);
    return [...sales].sort((a, b) => {
        let difference = 0;
        if (sort === 'price') {
            const currencyOrder = { ARS: 0, USD: 1 };
            const groupA = currencyOrder[a.saleCurrency] ?? 2, groupB = currencyOrder[b.saleCurrency] ?? 2;
            if (groupA !== groupB) return groupA - groupB; // Currency groups never imply FX equivalence.
            const validA = typeof a.salePrice === 'number' && Number.isFinite(a.salePrice), validB = typeof b.salePrice === 'number' && Number.isFinite(b.salePrice);
            if (validA !== validB) return validA ? -1 : 1;
            difference = validA && validB ? a.salePrice - b.salePrice : 0;
        } else { const aValue = value(a), bValue = value(b); if (Boolean(aValue) !== Boolean(bValue)) return aValue ? -1 : 1; difference = collator.compare(String(aValue), String(bValue)); }
        return difference * sign || collator.compare(String(a._id || ''), String(b._id || ''));
    });
}
export function buildSalesWorkbench(sales, query, users = [], { exportAll = false } = {}) {
    const filters = normalizeSalesWorkbenchQuery(query);
    const userOptions = users.map(user => ({ value: user.username || String(user._id), label: user.name || user.username || 'Usuario', aliases: [user.username, user.name, String(user._id)].filter(Boolean) }));
    const rows = sales.map(sale => {
        const raw = sale.salesperson || sale.assignedTo?.username || String(sale.assignedTo?._id || '');
        const matches = userOptions.filter(option => option.aliases.includes(raw));
        return { ...sale, _sellerKey: matches.length === 1 ? matches[0].value : raw };
    });
    const statusBase = filterSales(rows, { ...filters, status: 'todas' });
    const sellerBase = filterSales(rows, { ...filters, seller: '' });
    const sellerOptions = new Map(userOptions.map(option => [option.value, { value: option.value, label: option.label, count: 0 }]));
    for (const row of rows) if (row._sellerKey && !sellerOptions.has(row._sellerKey)) sellerOptions.set(row._sellerKey, { value: row._sellerKey, label: row.salesperson || row.assignedTo?.name || 'Sin nombre', count: 0 });
    for (const row of sellerBase) if (row._sellerKey) sellerOptions.get(row._sellerKey).count++;
    const statusCounts = Object.fromEntries(SALE_STATUS_TABS.map(([key]) => [key, filterSales(statusBase, { ...SALE_FILTER_DEFAULTS, status: key }).length]));
    const filtered = filterSales(rows, filters);
    const summary = { opCount: filtered.length, computableCount: 0, totals: { ARS: 0, USD: 0 }, excludedDraftCount: 0, excludedCancelledCount: 0, invalidPriceCount: 0, unknownCurrencyCount: 0 };
    for (const row of filtered) {
        if (row.status === 'borrador') { summary.excludedDraftCount++; continue; }
        if (row.status === 'cancelada') { summary.excludedCancelledCount++; continue; }
        if (!Object.hasOwn(summary.totals, row.saleCurrency)) { summary.unknownCurrencyCount++; continue; }
        if (typeof row.salePrice !== 'number' || !Number.isFinite(row.salePrice) || row.salePrice < 0) { summary.invalidPriceCount++; continue; }
        summary.computableCount++; summary.totals[row.saleCurrency] = Math.round((summary.totals[row.saleCurrency] + row.salePrice + Number.EPSILON) * 100) / 100;
    }
    const sorted = sortSales(filtered, filters.sort, filters.direction);
    const pages = Math.max(1, Math.ceil(filtered.length / filters.limit)), page = Math.min(filters.page, pages);
    const output = exportAll ? sorted : sorted.slice((page - 1) * filters.limit, page * filters.limit);
    return { sales: output.map(row => { const { _sellerKey: ignored, ...record } = row; return record; }), total: filtered.length, page: exportAll ? 1 : page, pages: exportAll ? 1 : pages, limit: exportAll ? filtered.length : filters.limit, summary, sellerCounts: [{ value: '', label: 'General', count: sellerBase.length }, ...sellerOptions.values()], statusCounts, header: { total: filtered.length, active: filtered.filter(row => !row.historicalOnly && ['confirmada', 'señado', 'pendiente_entrega'].includes(row.status)).length, closed: filtered.filter(row => row.status === 'entregada').length } };
}
export function salesQuickPeriod(period, now = new Date()) {
    const key = saleCalendarKey({ createdAt: now }); const [year, month] = key.split('-').map(Number);
    if (period === 'all') return { dateFrom: '', dateTo: '', month: '' };
    if (period === 'year') return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31`, month: '' };
    const date = new Date(Date.UTC(year, month - (period === 'previous' ? 2 : 1), 1));
    const from = date.toISOString().slice(0, 10); date.setUTCMonth(date.getUTCMonth() + 1); date.setUTCDate(0);
    return { dateFrom: from, dateTo: date.toISOString().slice(0, 10), month: '' };
}
export function salePdfValues(sale) {
    const buyer = getSaleBuyer(sale); const car = typeof sale.vehicleId === 'object' ? sale.vehicleId : {};
    return { sourceId: String(sale._id), date: formSaleDate(sale.saleDate), buyer: { name: buyer.name, dni: buyer.dni, phone: buyer.phone, address: '' }, amount: sale.salePrice, currency: sale.saleCurrency, concept: `Operación ${car?.brand || ''} ${car?.name || ''} ${car?.plateOrVin || ''}`.trim(), vehicle: { brand: car?.brand || '', type: car?.vehicleType || '', model: car?.name || '', engine: car?.engineNumber || '', chassis: car?.chassisNumber || '', plate: car?.plateOrVin || '', km: sale.draftData?.mileage || car?.km || '' }, paymentMethod: ({ contado: 'Contado', financiado: 'Financiado', permuta: 'Permuta' }[sale.paymentMethod] || 'Otro'), paymentOther: sale.paymentMethod || '', tradeIns: (sale.tradeIns || []).map(row => ({ owner: row.ownerName || '', brand: row.brand, model: row.model, year: row.year, plate: row.plate || '', color: row.color || '', km: row.mileage ?? '', engine: row.engineNumber || '', chassis: row.vin || '', value: row.estimatedValue, currency: row.currency })), financing: { entity: '', installments: sale.financingDetails?.installmentsCount || sale.installmentsCount || '', amount: sale.financingDetails?.financedBalance || '', currency: sale.saleCurrency, installmentAmount: sale.financingDetails?.installmentAmount || '', installmentCurrency: sale.saleCurrency, notes: '' }, notes: sale.draftData?.notes || sale.notes || '' };
}
