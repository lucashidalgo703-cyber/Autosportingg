import { parseStockFilters, STOCK_FILTER_KEYS } from './stockFilters.js';

const DEFAULTS = { search: '', status: 'disponible', brand: 'todas', tab: 'stock', ml: 'todas', sort: 'manual' };
const ADVANCED_KEYS = ['model', 'transmission', 'currency', 'minPrice', 'maxPrice', 'minKm', 'maxKm', 'minDays', 'maxDays', 'minYear', 'maxYear', 'location', 'responsible', 'origin', 'stagnant', 'review', 'sort'];
export const STOCK_WORKBENCH_DEFAULTS = { attentionType: 'all', attentionResponsible: '', demandDays: '90', demandSearch: '', demandYearFrom: '', demandYearTo: '', includeImported: true, zeroDemand: false, withoutDays: '14' };
const workbenchFrom = query => ({
    attentionType: ['all', 'followup', 'preparation', 'mandate'].includes(query.get('attentionType')) ? query.get('attentionType') : 'all',
    attentionResponsible: /^(?:[a-f\d]{24}|unassigned)$/i.test(query.get('attentionResponsible') || '') ? query.get('attentionResponsible') : '',
    demandDays: ['30', '60', '90', '180'].includes(query.get('demandDays')) ? query.get('demandDays') : '90',
    demandSearch: (query.get('demandSearch') || '').slice(0, 200), demandYearFrom: /^\d{4}$/.test(query.get('demandYearFrom') || '') ? query.get('demandYearFrom') : '', demandYearTo: /^\d{4}$/.test(query.get('demandYearTo') || '') ? query.get('demandYearTo') : '',
    includeImported: query.get('includeImported') !== 'false', zeroDemand: query.get('zeroDemand') === 'true', withoutDays: query.get('withoutDays') === '90' ? '90' : '14'
});

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
        view: ['capital', 'hoy', 'demanda'].includes(query.get('vista')) ? query.get('vista') : 'inventario',
        workbench: workbenchFrom(query),
        layout: ['list', 'cards', 'detailed'].includes(query.get('presentacion')) ? query.get('presentacion') : 'list',
        error,
    };
}

export function buildStockLocation(filters = {}, view = 'inventario', layout = 'list', workbench = {}) {
    const parsed = parseStockFilters({ ...DEFAULTS, ...filters });
    const query = new URLSearchParams();
    for (const key of STOCK_FILTER_KEYS) {
        const value = parsed[key];
        if (key === 'status' && value === '') { query.set(key, ''); continue; }
        if (value === '' || value === null || value === false || value === DEFAULTS[key]) continue;
        query.set(key, String(value));
    }
    if (parsed.page > 1) query.set('pagina', String(parsed.page));
    if (['capital', 'hoy', 'demanda'].includes(view)) query.set('vista', view);
    if (view === 'hoy' || view === 'demanda') for (const [key, fallback] of Object.entries(STOCK_WORKBENCH_DEFAULTS)) {
        if (view === 'hoy' && !key.startsWith('attention') || view === 'demanda' && key.startsWith('attention')) continue;
        const value = workbench[key] ?? fallback; if (value !== fallback && value !== '') query.set(key, String(value));
    }
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
