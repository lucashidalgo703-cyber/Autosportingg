import { getArgentinaDateKey } from './cashProjection.js';
import { stockIsAgencyOwned, stockOwnedQuery } from './stockOwnership.js';
const DAY_MS = 86400000;
const STATUS_MAP = { disponible: 'Disponible', senado: 'Reservado', vendido_sin_confirmar: 'Pausado', vendido: 'Vendido', fuera_de_venta: 'Retirado' };
export const STOCK_SORTS = ['manual', 'recent', 'oldest', 'price_asc', 'price_desc', 'year_desc', 'km_asc', 'brand_model'];
export const STOCK_FILTER_KEYS = ['search', 'status', 'brand', 'model', 'transmission', 'tab', 'ml', 'currency', 'minPrice', 'maxPrice', 'minKm', 'maxKm', 'minDays', 'maxDays', 'minYear', 'maxYear', 'location', 'responsible', 'origin', 'stagnant', 'review', 'sort'];

export const normalizeStockText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactTextRegex = (value) => new RegExp(`^\\s*${normalizeStockText(value).split(' ').map(escapeRegex).join('\\s+')}\\s*$`, 'i');
const number = (value, key) => {
    if (value === '' || value === null || value === undefined) return null;
    if (!['string', 'number'].includes(typeof value) || (typeof value === 'string' && !/^\d+(?:\.\d*)?(?:e[+-]?\d+)?$/i.test(value.trim()))) throw new Error(`Revisá el filtro ${key}: debe ser un número mayor o igual a cero.`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Revisá el filtro ${key}: debe ser un número mayor o igual a cero.`);
    return parsed;
};
export const stockCurrency = (value) => ['USD', 'U$S', 'US$'].includes(String(value).trim().toUpperCase()) ? 'USD' : ['ARS', '$'].includes(String(value).trim().toUpperCase()) ? 'ARS' : null;
// Conserva la clasificación estadística previa del CRM; no cambia el precio ni la moneda guardada.
export const stockStatisticsCurrency = value => stockCurrency(value);
export const stockIsPublished = (value) => ['si', 'sí'].includes(normalizeStockText(value));
export const stockHasPhoto = (car) => Boolean(String(car.coverImage || '').trim() || (Array.isArray(car.images) ? car.images : []).some(image => String(image || '').trim()));
export const stockNeedsReview = (car) => !stockIsPublished(car.publishedOnML) || !stockHasPhoto(car) || typeof car.price !== 'number' || !Number.isFinite(car.price) || car.price <= 0;

export function stockDays(car, asOf = new Date()) {
    if (!car.createdAt) return null;
    try {
        const created = Date.parse(getArgentinaDateKey(car.createdAt) + 'T00:00:00.000Z');
        const today = Date.parse(getArgentinaDateKey(asOf) + 'T00:00:00.000Z');
        return Math.max(0, Math.round((today - created) / DAY_MS));
    } catch { return null; }
}

export function stockOptions(values = []) {
    const groups = new Map();
    const priority = value => value === value.toLocaleLowerCase('es') ? 2 : value === value.toLocaleUpperCase('es') ? 1 : 0;
    for (const value of values) {
        const key = normalizeStockText(value);
        const label = String(value ?? '').trim().replace(/\s+/g, ' ');
        const current = groups.get(key);
        if (key && (!current || priority(label) < priority(current) || (priority(label) === priority(current) && label < current))) groups.set(key, label);
    }
    return [...groups.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'accent', numeric: true }));
}

export function parseStockFilters(input = {}) {
    const result = {};
    for (const key of ['search', 'status', 'brand', 'model', 'transmission', 'tab', 'ml', 'location', 'responsible', 'origin']) {
        if (input[key] !== null && input[key] !== undefined && typeof input[key] !== 'string') throw new Error('Los filtros de texto deben contener un valor simple.');
        result[key] = String(input[key] ?? '').trim();
        if (result[key].length > (key === 'search' ? 300 : 120)) throw new Error('El texto del filtro es demasiado largo.');
    }
    result.currency = input.currency ? stockCurrency(input.currency) : null;
    if (input.currency && !result.currency) throw new Error('Elegí una moneda válida para filtrar el stock.');
    for (const key of ['minPrice', 'maxPrice', 'minKm', 'maxKm', 'minDays', 'maxDays', 'minYear', 'maxYear']) result[key] = number(input[key], key);
    for (const key of ['minDays', 'maxDays', 'minYear', 'maxYear']) if (result[key] !== null && !Number.isInteger(result[key])) throw new Error('Los días y años deben ser números enteros.');
    for (const key of ['minYear', 'maxYear']) if (result[key] !== null && (result[key] < 1886 || result[key] > 9999)) throw new Error('Revisá el año del filtro.');
    if (result.origin && !['owned', 'consigned', 'undefined'].includes(result.origin)) throw new Error('Elegí un origen válido.');
    if (result.responsible && result.responsible !== 'unassigned' && !/^[a-f\d]{24}$/i.test(result.responsible)) throw new Error('Elegí un responsable válido.');
    for (const [min, max] of [['minPrice', 'maxPrice'], ['minKm', 'maxKm'], ['minDays', 'maxDays'], ['minYear', 'maxYear']]) {
        if (result[min] !== null && result[max] !== null && result[min] > result[max]) throw new Error('El mínimo del filtro no puede superar su máximo.');
    }
    if (!result.currency && (result.minPrice !== null || result.maxPrice !== null)) throw new Error('Elegí ARS o USD antes de filtrar por precio.');
    result.stagnant = input.stagnant === true || input.stagnant === 'true';
    result.review = input.review === true || input.review === 'true';
    result.sort = STOCK_SORTS.includes(input.sort) ? input.sort : 'manual';
    result.page = Number.isFinite(Number(input.page)) ? Math.max(1, Math.floor(Number(input.page) || 1)) : 1;
    result.limit = Number.isFinite(Number(input.limit)) ? Math.max(1, Math.min(1000, Math.floor(Number(input.limit) || 20))) : 20;
    return result;
}

export function buildStockQuery(input = {}, asOf = new Date()) {
    const filters = parseStockFilters(input);
    const clauses = [];
    const words = filters.search.split(/\s+/).filter(Boolean);
    for (const word of words) {
        const regex = new RegExp(escapeRegex(word), 'i');
        const conditions = ['brand', 'name', 'plateOrVin', 'description', 'ownerName', 'ownerPhone', 'consignedBy', 'location', 'notes', 'investor.name', 'engineNumber', 'chassisNumber'].map(key => ({ [key]: regex }));
        if (/^\d+$/.test(word)) conditions.push({ year: Number(word) }, { km: Number(word) });
        clauses.push({ $or: conditions });
    }
    clauses.push(filters.status && filters.status !== 'todos' ? { status: STATUS_MAP[filters.status] || filters.status } : { status: { $nin: ['Vendido', 'Cancelado'] } });
    if (filters.brand && filters.brand !== 'todas') clauses.push({ brand: exactTextRegex(filters.brand) });
    if (filters.model && filters.model !== 'todos') clauses.push({ name: exactTextRegex(filters.model) });
    if (filters.transmission) clauses.push({ transmission: exactTextRegex(filters.transmission) });
    if (filters.location) clauses.push({ location: exactTextRegex(filters.location) });
    // $expr evita depender de Mongoose para convertir el ID dentro de agregaciones.
    if (filters.responsible) clauses.push(filters.responsible === 'unassigned'
        ? { consignmentSeller: null }
        : { $expr: { $eq: [{ $toString: '$consignmentSeller' }, filters.responsible] } });
    const owned = stockOwnedQuery();
    const consignor = { $or: [{ consignedBy: /\S/ }, { ownerName: /\S/ }, { 'tradeInOrigin.consigned': true }] };
    if (filters.origin === 'owned') clauses.push(owned);
    if (filters.origin === 'consigned') clauses.push({ $and: [{ $nor: [owned] }, consignor] });
    if (filters.origin === 'undefined') clauses.push({ $nor: [owned, consignor] });
    if (filters.tab === 'consignaciones') clauses.push({ $and: [{ $nor: [owned] }, consignor] });
    if (filters.tab === 'compartidos') clauses.push({ 'investor.percentage': { $gt: 0 } });
    if (filters.tab === 'cero_km') clauses.push({ $or: [{ condition: /^\s*(0\s*km|nuevo)\s*$/i }, { km: 0 }] });
    if (filters.ml === 'publicados') clauses.push({ publishedOnML: /^\s*s[ií]\s*$/i });
    if (filters.ml === 'no_publicados') clauses.push({ publishedOnML: { $not: /^\s*s[ií]\s*$/i } });
    if (filters.currency) clauses.push({ currency: filters.currency === 'USD' ? /^\s*(USD|U\$S|US\$)\s*$/i : /^\s*(ARS|\$)\s*$/i });
    for (const [field, min, max] of [['price', 'minPrice', 'maxPrice'], ['km', 'minKm', 'maxKm'], ['year', 'minYear', 'maxYear']]) {
        const range = {};
        if (filters[min] !== null) range.$gte = filters[min];
        if (filters[max] !== null) range.$lte = filters[max];
        if (Object.keys(range).length) clauses.push({ [field]: range });
    }
    const minDays = Math.max(filters.minDays ?? 0, filters.stagnant ? 91 : 0);
    const todayStart = Date.parse(getArgentinaDateKey(asOf) + 'T03:00:00.000Z');
    const dates = {};
    if (minDays > 0) dates.$lt = new Date(todayStart - (minDays - 1) * DAY_MS);
    if (filters.maxDays !== null) dates.$gte = new Date(todayStart - filters.maxDays * DAY_MS);
    if (Object.values(dates).some(date => !Number.isFinite(date.getTime()))) throw new Error('El rango de días de stock está fuera de las fechas admitidas.');
    if (Object.keys(dates).length) clauses.push({ createdAt: dates });
    if (filters.review) clauses.push({ $or: [
        { publishedOnML: { $not: /^\s*s[ií]\s*$/i } },
        { $and: [{ coverImage: { $not: /\S/ } }, { images: { $not: { $elemMatch: { $regex: /\S/ } } } }] },
        { price: { $lte: 0 } }, { price: { $not: { $type: 'number' } } }
    ] });
    return { filters, query: { $and: clauses } };
}

export function buildStockSort(input = {}) {
    const sort = typeof input === 'string' ? input : input.sort;
    const sorts = {
        manual: { order: 1, createdAt: -1, _id: 1 }, recent: { createdAt: -1, _id: 1 }, oldest: { createdAt: 1, _id: 1 },
        price_asc: { __stockCurrency: 1, price: 1, _id: 1 }, price_desc: { __stockCurrency: 1, price: -1, _id: 1 },
        year_desc: { year: -1, _id: 1 }, km_asc: { km: 1, _id: 1 }, brand_model: { __stockBrand: 1, __stockModel: 1, _id: 1 }
    };
    return sorts[sort] || sorts.manual;
}

export function buildStockPipeline(query, filters, paginate = true) {
    const canonicalText = field => ({ $reduce: {
        input: { $regexFindAll: { input: { $toLower: { $ifNull: [field, ''] } }, regex: /\S+/ } },
        initialValue: '', in: { $concat: ['$$value', { $cond: [{ $eq: ['$$value', ''] }, '', ' '] }, '$$this.match'] }
    } });
    return [
        { $match: query },
        { $set: { ...(filters.sort === 'brand_model' ? { __stockBrand: canonicalText('$brand'), __stockModel: canonicalText('$name') } : {}), __stockCurrency: { $switch: { branches: [
            { case: { $in: [{ $toUpper: { $trim: { input: { $ifNull: ['$currency', ''] } } } }, ['USD', 'U$S', 'US$']] }, then: 'USD' },
            { case: { $in: [{ $toUpper: { $trim: { input: { $ifNull: ['$currency', ''] } } } }, { $literal: ['ARS', '$'] }] }, then: 'ARS' }
        ], default: 'ZZZ' } } } },
        { $sort: buildStockSort(filters) },
        ...(paginate ? [{ $skip: (filters.page - 1) * filters.limit }, { $limit: filters.limit }] : []),
        { $project: { auditLog: 0, __stockCurrency: 0, __stockBrand: 0, __stockModel: 0 } }
    ];
}

// Misma semántica para la instantánea autorizada offline. Nunca mezcla precios de monedas distintas.
export function filterStockSnapshot(cars, input = {}, asOf = new Date()) {
    const { filters } = buildStockQuery(input, asOf);
    const results = cars.filter(car => {
        const status = filters.status && filters.status !== 'todos' ? STATUS_MAP[filters.status] || filters.status : null;
        if (status ? car.status !== status : ['Vendido', 'Cancelado'].includes(car.status)) return false;
        if (filters.brand && filters.brand !== 'todas' && normalizeStockText(car.brand) !== normalizeStockText(filters.brand)) return false;
        if (filters.model && filters.model !== 'todos' && normalizeStockText(car.name) !== normalizeStockText(filters.model)) return false;
        if (filters.transmission && normalizeStockText(car.transmission) !== normalizeStockText(filters.transmission)) return false;
        if (filters.location && normalizeStockText(car.location) !== normalizeStockText(filters.location)) return false;
        const responsible = car.consignmentSeller?._id ?? car.consignmentSeller;
        if (filters.responsible && (filters.responsible === 'unassigned' ? Boolean(responsible) : String(responsible || '') !== filters.responsible)) return false;
        const origin = stockIsAgencyOwned(car) ? 'owned' : String(car.consignedBy || car.ownerName || '').trim() || car.tradeInOrigin?.consigned ? 'consigned' : 'undefined';
        if (filters.origin && origin !== filters.origin) return false;
        if (filters.tab === 'consignaciones' && origin !== 'consigned') return false;
        if (filters.tab === 'compartidos' && !(Number(car.investor?.percentage) > 0)) return false;
        if (filters.tab === 'cero_km' && !(Number(car.km) === 0 || /^\s*(0\s*km|nuevo)\s*$/i.test(car.condition || ''))) return false;
        if (filters.ml === 'publicados' && !stockIsPublished(car.publishedOnML)) return false;
        if (filters.ml === 'no_publicados' && stockIsPublished(car.publishedOnML)) return false;
        if (filters.currency && stockCurrency(car.currency) !== filters.currency) return false;
        for (const [field, min, max] of [['price', 'minPrice', 'maxPrice'], ['km', 'minKm', 'maxKm'], ['year', 'minYear', 'maxYear']]) {
            const value = Number(car[field]);
            if ((filters[min] !== null || filters[max] !== null) && (typeof car[field] !== 'number' || !Number.isFinite(value))) return false;
            if (filters[min] !== null && value < filters[min]) return false;
            if (filters[max] !== null && value > filters[max]) return false;
        }
        const days = stockDays(car, asOf);
        if (filters.stagnant && (days === null || days <= 90)) return false;
        if (filters.minDays !== null && (days === null || days < filters.minDays)) return false;
        if (filters.maxDays !== null && (days === null || days > filters.maxDays)) return false;
        if (filters.review && !stockNeedsReview(car)) return false;
        const fields = [car.brand, car.name, car.plateOrVin, car.description, car.ownerName, car.ownerPhone, car.consignedBy, car.location, car.notes, car.investor?.name, car.engineNumber, car.chassisNumber];
        return filters.search.split(/\s+/).filter(Boolean).every(word => fields.some(value => normalizeStockText(value).includes(normalizeStockText(word))) || (/^\d+$/.test(word) && [car.year, car.km].some(value => Number(value) === Number(word))));
    });
    const sort = buildStockSort(filters);
    results.sort((a, b) => {
        for (const [field, direction] of Object.entries(sort)) {
            const av = field === '__stockCurrency' ? stockCurrency(a.currency) || 'ZZZ' : field === '__stockBrand' ? normalizeStockText(a.brand) : field === '__stockModel' ? normalizeStockText(a.name) : a[field];
            const bv = field === '__stockCurrency' ? stockCurrency(b.currency) || 'ZZZ' : field === '__stockBrand' ? normalizeStockText(b.brand) : field === '__stockModel' ? normalizeStockText(b.name) : b[field];
            const diff = field === '_id' ? (String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0) : field === 'createdAt' ? new Date(av).getTime() - new Date(bv).getTime() : typeof av === 'number' || typeof bv === 'number' ? Number(av || 0) - Number(bv || 0) : String(av || '').localeCompare(String(bv || ''), 'es', { sensitivity: 'accent', numeric: true });
            if (diff) return diff * direction;
        }
        return 0;
    });
    return results;
}
