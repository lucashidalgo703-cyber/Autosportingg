export const CLIENT_VIEWS = ['lista', 'tabla', 'pipeline', 'seguimientos', 'ingresos', 'demanda', 'ranking'];
export const CLIENT_FILTER_KEYS = ['search', 'segment', 'source', 'status', 'type', 'assignedTo', 'attention', 'gender', 'tier', 'sort', 'createdFrom', 'createdTo'];
export const CLIENT_FILTER_DEFAULTS = { search: '', segment: '', source: '', status: '', type: '', assignedTo: '', attention: 'primera', gender: '', tier: '', sort: 'priority', createdFrom: '', createdTo: '' };
export function readClientLocation(search = '') {
    const query = new URLSearchParams(search), view = CLIENT_VIEWS.includes(query.get('vista')) ? query.get('vista') : 'lista', filters = { ...CLIENT_FILTER_DEFAULTS, attention: view === 'lista' ? 'primera' : 'todos' };
    for (const key of CLIENT_FILTER_KEYS) if (query.has(key)) filters[key] = query.get(key);
    if (query.has('atencion')) filters.attention = query.get('atencion');
    if (!['hoy', 'todos', 'primera', 'sinfecha'].includes(filters.attention)) filters.attention = view === 'lista' ? 'primera' : 'todos';
    return { filters, view, page: Math.max(1, Math.floor(Number(query.get('pagina')) || 1)), period: ['hoy', 'ayer', '7', '30', 'mes', 'mes_pasado', 'todos'].includes(query.get('periodo')) ? query.get('periodo') : 'hoy', compact: query.get('compacta') === '1' };
}
export function clientLocation(filters, view = 'lista', page = 1, period = 'hoy', compact = false) {
    const query = new URLSearchParams();
    if (view !== 'lista') query.set('vista', view);
    for (const key of CLIENT_FILTER_KEYS) if (filters[key] && filters[key] !== (key === 'attention' && view !== 'lista' ? 'todos' : CLIENT_FILTER_DEFAULTS[key])) query.set(key, filters[key]);
    if (page > 1) query.set('pagina', page);
    if (period !== 'hoy') query.set('periodo', period);
    if (compact) query.set('compacta', '1');
    return `/admin/clientes${query.size ? `?${query}` : ''}`;
}
export function safeClientReturnTo(value) {
    return typeof value === 'string' && !/[\\\u0000-\u001f\u007f#]/.test(value) && (value === '/admin/clientes' || value.startsWith('/admin/clientes?')) ? value : '/admin/clientes';
}
export const clientDetailHref = (id, returnTo) => `/admin/clientes/${encodeURIComponent(String(id))}?${new URLSearchParams({ returnTo: safeClientReturnTo(returnTo) })}`;
