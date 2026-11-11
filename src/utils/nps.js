import { clientCalendarKey, clientTodayKey } from './clientCommercial.js';

export const NPS_CONTEXTS = [
    { value: 'postventa', label: 'Postventa' }, { value: 'postvisita', label: 'Postvisita' },
    { value: 'postentrega', label: 'Postentrega' }, { value: 'postcotizacion', label: 'Postcotización' },
    { value: 'atencion_lead', label: 'Atención de lead' }
];
export const npsContextLabel = value => NPS_CONTEXTS.find(item => item.value === value)?.label || 'Contexto no especificado';
export function npsScore(value) {
    if (!['number', 'string'].includes(typeof value) || typeof value === 'string' && !value.trim() || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 10) throw new Error('Elegí un puntaje entero de 0 a 10.');
    return Number(value);
}
export function npsPeriodRange(period = 'Este mes', now = new Date()) {
    const aliases = { Hoy: 'hoy', 'Esta semana': 'semana', 'Este mes': 'mes', 'Este año': 'anio', Histórico: 'todos', historico: 'todos' };
    const key = aliases[period] || period;
    if (!['hoy', 'semana', 'mes', 'anio', 'todos'].includes(key)) throw new Error('Elegí un período NPS válido.');
    if (key === 'todos') return {};
    const today = clientTodayKey(now);
    const calendarDay = Date.parse(`${today}T00:00:00Z`);
    const [year, month] = today.split('-').map(Number);
    const mondayOffset = (new Date(calendarDay).getUTCDay() + 6) % 7;
    const start = key === 'hoy' ? calendarDay : key === 'semana' ? calendarDay - mondayOffset * 86400000 : key === 'mes' ? Date.UTC(year, month - 1, 1) : Date.UTC(year, 0, 1);
    const end = key === 'hoy' ? calendarDay + 86400000 : key === 'semana' ? start + 7 * 86400000 : key === 'mes' ? Date.UTC(year, month, 1) : Date.UTC(year + 1, 0, 1);
    return { $gte: new Date(start + 3 * 3600000), $lt: new Date(end + 3 * 3600000) };
}
export function npsCalendarDate(value) {
    const key = clientCalendarKey(value);
    if (!key) throw new Error('Ingresá una fecha calendario válida.');
    return new Date(`${key}T03:00:00.000Z`);
}
