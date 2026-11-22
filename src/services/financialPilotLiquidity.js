import { sum } from './financialPilotEngine.js';

export function dateAt(start, day) {
    const date = new Date(start + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + day);
    return date.toISOString().slice(0, 10);
}

export function projectLiquidity({ start, horizon, usable, floor, currency, flows, restrictions, scenario }) {
    const duplicates = new Set(), seen = new Set();
    const scheduled = flows.map(flow => {
        if (seen.has(flow.id)) duplicates.add(flow.id);
        seen.add(flow.id);
        const day = scenario === 'stress' ? flow.adverseDay ?? flow.day : flow.day;
        return { ...flow, date: dateAt(start, day), day, currency: flow.currency ?? currency };
    }).sort((left, right) => left.day - right.day);
    const alerts = [...duplicates].map(id => ({ code: 'duplicate_obligation', id }));
    const missingFx = scheduled.filter(flow => flow.day <= horizon && flow.currency !== currency);
    alerts.push(...missingFx.map(flow => ({ code: 'missing_fx', id: flow.id, currency: flow.currency })));
    if (usable === null) alerts.push({ code: 'material_data_missing', id: 'usable' });
    const invalid = alerts.length > 0;
    if (invalid) return { quality: 'not_calculable', floor, horizon, currency, scheduled, alerts, capacity: null, minimum: null, gap: null, series: [] };
    const bags = new Map(Object.entries(restrictions));
    let free = usable;
    const series = [];
    for (let day = 0; day <= horizon; day++) {
        for (const flow of scheduled.filter(item => item.day === day)) {
            const restricted = bags.get(flow.id) ?? 0;
            const covered = flow.amount < 0 ? Math.min(-flow.amount, restricted) : 0;
            if (covered) bags.set(flow.id, restricted - covered);
            free = sum([free, flow.amount, covered]);
        }
        series.push({ day, date: dateAt(start, day), free });
    }
    const minimum = series.reduce((lowest, point) => point.free < lowest.free ? point : lowest);
    const gap = Math.max(0, floor - minimum.free);
    if (gap > 0) alerts.push({ code: 'cash_below_floor', date: minimum.date, amount: gap });
    return { quality: 'verified', floor, horizon, currency, scheduled, alerts, series, minimum, gap, capacity: Math.max(0, minimum.free - floor) };
}
