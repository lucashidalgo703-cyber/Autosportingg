import { clientTodayKey } from './clientCommercial.js';

const day = (key, offset) => new Date(Date.parse(`${key}T00:00:00.000Z`) + offset * 86400000).toISOString().slice(0, 10);
const monthStart = (key, offset = 0) => {
    const [year, month] = key.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
};
// Argentina currently has a fixed UTC-03 offset. Dates here are calendar cutoffs,
// independent of the server/browser timezone and of a Sale's midnight-UTC saleDate.
export function clientInsightRange(period = '30', now = new Date()) {
    if (!['hoy', 'ayer', '7', '30', 'mes', 'mes_pasado', 'todos'].includes(period)) throw new Error('Elegí un período válido.');
    const today = clientTodayKey(now);
    let fromKey = null, toKey = null, previousFromKey = null, previousToKey = null;
    if (period === 'mes' || period === 'mes_pasado') {
        const offset = period === 'mes' ? 0 : -1;
        fromKey = monthStart(today, offset); toKey = monthStart(today, offset + 1);
        previousFromKey = monthStart(today, offset - 1); previousToKey = fromKey;
    } else if (period !== 'todos') {
        const length = ['hoy', 'ayer'].includes(period) ? 1 : Number(period);
        toKey = day(today, period === 'ayer' ? 0 : 1);
        fromKey = day(toKey, -length); previousToKey = fromKey; previousFromKey = day(fromKey, -length);
    }
    const instant = key => key ? new Date(`${key}T03:00:00.000Z`) : null;
    return { fromKey, toKey, previousFromKey, previousToKey, from: instant(fromKey), to: instant(toKey), previousFrom: instant(previousFromKey), previousTo: instant(previousToKey), byDayFromKey: day(today, -29), byDayToKey: day(today, 1) };
}
