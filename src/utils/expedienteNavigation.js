export const EXPEDIENTE_FILTER_DEFAULTS = Object.freeze({ view: 'activos', status: 'all', search: '', seller: '', responsible: '', due: 'all', priority: 'all', sort: 'openedAt', direction: 'desc' });
export const EXPEDIENTE_SECTIONS = [
    { label: 'Operación', items: [['summary', 'Resumen'], ['seller', 'Parte vendedora'], ['buyer', 'Parte compradora'], ['tradein', 'Permuta'], ['consignment', 'Consignación']] },
    { label: 'Documentación', items: [['documents', 'Documentos'], ['gestoria', 'Gestoría']] },
    { label: 'Administración', items: [['expenses', 'Gastos'], ['registry', 'Cuentas del Registro'], ['settlement', 'Liquidación'], ['proofs', 'Comprobantes'], ['history', 'Historial']] }
];
export const EXPEDIENTE_SECTION_IDS = EXPEDIENTE_SECTIONS.flatMap(group => group.items.map(([id]) => id));
export const EXPEDIENTE_STATUS_LABELS = { en_proceso: 'En proceso', documentacion_completa: 'Documentación completa', transferido: 'Transferido', entregado: 'Entregado / finalizado' };
const allowed = (value, list, fallback) => list.includes(value) ? value : fallback;
export const expedienteId = value => /^[a-f\d]{24}$/i.test(String(value || '')) ? String(value) : '';
export const expedienteRefId = value => expedienteId(typeof value === 'object' ? value?.id || value?._id : value);
export function readExpedienteLocation(search = '') {
    const params = new URLSearchParams(search), base = EXPEDIENTE_FILTER_DEFAULTS;
    const filters = { ...base,
        view: allowed(params.get('view'), ['activos', 'finalizados', 'archivados', 'todos'], base.view),
        status: allowed(params.get('status'), ['all', ...Object.keys(EXPEDIENTE_STATUS_LABELS)], base.status),
        search: (params.get('search') || '').slice(0, 300),
        seller: expedienteId(params.get('seller')),
        responsible: params.get('responsible') === 'unassigned' ? 'unassigned' : expedienteId(params.get('responsible')),
        due: allowed(params.get('due'), ['all', 'overdue', 'next7'], base.due),
        priority: allowed(params.get('priority'), ['all', 'low', 'medium', 'high'], base.priority),
        sort: allowed(params.get('sort'), ['openedAt', 'vehicle', 'buyer', 'seller', 'status', 'dueDate'], base.sort),
        direction: allowed(params.get('direction'), ['asc', 'desc'], base.direction)
    };
    const rawPage = Number(params.get('page'));
    const explicitId = expedienteId(params.get('expediente') || params.get('saleId'));
    // Legacy links from the sale drawer used ?search=<saleId>. Treat that as a
    // detail link rather than searching names for an opaque database ID.
    const legacyId = expedienteId(filters.search);
    if (!explicitId && legacyId) filters.search = '';
    return { filters, page: Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1, selectedId: explicitId || legacyId, section: allowed(params.get('section'), EXPEDIENTE_SECTION_IDS, 'summary'), responsibleSpecified: params.has('responsible') };
}
export function expedienteQuery(filters = {}, { page = 1, limit = 20 } = {}) {
    const normalized = readExpedienteLocation(new URLSearchParams({ ...EXPEDIENTE_FILTER_DEFAULTS, ...filters, page: String(page) }).toString());
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(normalized.filters)) if (value !== '' && value !== EXPEDIENTE_FILTER_DEFAULTS[key] || ['view', 'status', 'sort', 'direction'].includes(key)) query.set(key, value);
    query.set('page', String(normalized.page)); query.set('limit', String([20, 50, 100].includes(Number(limit)) ? limit : 20));
    return query.toString();
}
export function expedienteLocation(filters, page, selectedId = '', section = 'summary') {
    const query = new URLSearchParams(expedienteQuery(filters, { page }));
    query.delete('limit'); query.set('responsible', filters.responsible || '');
    if (expedienteId(selectedId)) { query.set('expediente', selectedId); if (section !== 'summary') query.set('section', allowed(section, EXPEDIENTE_SECTION_IDS, 'summary')); }
    return '/admin/expedientes?' + query;
}
export function expedienteCalendar(value) {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''));
    if (!match) return '';
    const date = new Date(match[1] + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === match[1] ? match[1] : '';
}
export const formatExpedienteDate = (value, empty = 'Sin fecha') => expedienteCalendar(value)?.split('-').reverse().join('/') || empty;
export const formatExpedienteStamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha';
export const expedienteAmount = (value, currency) => value === null || value === undefined || !Number.isFinite(Number(value)) ? currency + ' —' : currency + ' ' + Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 });
export function expedienteAge(openedAt, asOf) {
    const start = expedienteCalendar(openedAt);
    const end = asOf && Number.isFinite(Date.parse(asOf)) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(asOf)) : '';
    return start && end ? Math.max(0, Math.floor((Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000)) : null;
}
