export const CLIENT_PIPELINE_STAGES = [
    { id: 'sin_contactar', label: 'Sin contactar', color: 'border-blue-500/40 bg-blue-500/10 text-blue-300' },
    { id: 'contactado', label: 'Contactado', color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' },
    { id: 'con_pedido', label: 'Con pedido', color: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
    { id: 'visita', label: 'Visita', color: 'border-orange-500/40 bg-orange-500/10 text-orange-300' },
    { id: 'negociacion', label: 'Negociación', color: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' },
    { id: 'cerrado', label: 'Cerrado', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    { id: 'perdido', label: 'Perdido', color: 'border-red-500/40 bg-red-500/10 text-red-300' }
];

export const CLIENT_STAGE_ALIASES = {
    nuevo: 'sin_contactar', cita_agendada: 'visita', mostrando_autos: 'visita',
    en_negociacion: 'negociacion', propuesta_enviada: 'negociacion', sin_interes: 'perdido'
};

export function getClientPipelineStage(client) {
    const stage = client?.pipelineStage || 'sin_contactar';
    return CLIENT_STAGE_ALIASES[stage] || stage;
}

export function clientCalendarKey(value) {
    if (!value) return '';
    const text = value instanceof Date ? (Number.isFinite(value.getTime()) ? value.toISOString() : '') : String(value);
    if (text.length > 10 && !Number.isFinite(Date.parse(text))) return '';
    const key = text.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return '';
    const date = new Date(`${key}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key ? key : '';
}

export function clientTodayKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type) => parts.find(item => item.type === type).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatClientNextAction(client) {
    const key = clientCalendarKey(client?.nextActionDate);
    const hasDate = client?.nextActionDate !== null && client?.nextActionDate !== undefined && client?.nextActionDate !== '';
    if (!key) return hasDate ? 'Fecha a revisar' : 'Sin próxima fecha';
    const [year, month, day] = key.split('-');
    return `${day}/${month}/${year}`;
}

// Primera atención es una equivalencia explícita de AutoSporting con Sin contactar.
// No se deduce de ausencia de interacciones ni de la fecha de creación.
export function getClientPriorities(client, today = clientTodayKey()) {
    const stage = getClientPipelineStage(client);
    const active = (!client?.status || client.status === 'activo') && !['cerrado', 'perdido'].includes(stage);
    const first = active && stage === 'sin_contactar';
    const date = clientCalendarKey(client?.nextActionDate);
    const hasDate = client?.nextActionDate !== null && client?.nextActionDate !== undefined && client?.nextActionDate !== '';
    return { primera: first, hoy: active && (first || Boolean(date && date <= today)), sinfecha: active && !hasDate };
}
