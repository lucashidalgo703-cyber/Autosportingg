import { parseStockFilters, STOCK_FILTER_KEYS } from './stockFilters.js';

const DEFAULTS = { search: '', status: 'disponible', brand: 'todas', tab: 'stock', ml: 'todas', sort: 'manual' };
const ADVANCED_KEYS = ['model', 'transmission', 'currency', 'minPrice', 'maxPrice', 'minKm', 'maxKm', 'minDays', 'maxDays', 'stagnant', 'review', 'sort'];

export function readStockLocation(search = '') {
    const query = new URLSearchParams(search);
    const raw = { ...DEFAULTS, page: query.get('pagina') || query.get('page') || 1 };
    for (const key of STOCK_FILTER_KEYS) if (query.has(key)) raw[key] = query.get(key);
    let filters;
    let error = null;
    try { filters = parseStockFilters(raw); }
    catch (cause) { filters = parseStockFilters(DEFAULTS); error = cause.message; }
    const advanced = Object.fromEntries(ADVANCED_KEYS.map(key => [key, filters[key] ?? '']));
    return {
        filters,
        advanced,
        view: query.get('vista') === 'capital' ? 'capital' : 'inventario',
        layout: ['list', 'cards', 'detailed'].includes(query.get('presentacion')) ? query.get('presentacion') : 'list',
        error,
    };
}

export function buildStockLocation(filters = {}, view = 'inventario', layout = 'list') {
    const parsed = parseStockFilters({ ...DEFAULTS, ...filters });
    const query = new URLSearchParams();
    for (const key of STOCK_FILTER_KEYS) {
        const value = parsed[key];
        if (key === 'status' && value === '') { query.set(key, ''); continue; }
        if (value === '' || value === null || value === false || value === DEFAULTS[key]) continue;
        query.set(key, String(value));
    }
    if (parsed.page > 1) query.set('pagina', String(parsed.page));
    if (view === 'capital') query.set('vista', view);
    if (['cards', 'detailed'].includes(layout)) query.set('presentacion', layout);
    const encoded = query.toString();
    return `/admin/stock${encoded ? `?${encoded}` : ''}`;
}

export function safeStockReturnTo(value) {
    if (typeof value !== 'string' || /[\\\u0000-\u001f\u007f#]/.test(value)) return '/admin/stock';
    return value === '/admin/stock' || value.startsWith('/admin/stock?') ? value : '/admin/stock';
}

export function vehicleDetailHref(id, returnTo = '/admin/stock', edit = false) {
    const query = new URLSearchParams({ returnTo: safeStockReturnTo(returnTo) });
    if (edit) query.set('editar', '1');
    return `/admin/stock/${encodeURIComponent(String(id))}?${query}`;
}
