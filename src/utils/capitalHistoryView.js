// Presentation helpers only. Monetary capital values come from the server's
// existing capital calculation; this module never revalues stock or converts FX.
export const CAPITAL_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const isCapitalNumber = value => typeof value === 'number' && Number.isFinite(value);
export const capitalMoney = (value, currency) => isCapitalNumber(value)
    ? `${currency === 'ARS' ? '$' : 'USD'} ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)}` : 'Sin dato';
export const currentCapitalPeriod = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CAPITAL_TIMEZONE, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
    return `${parts.find(part => part.type === 'year').value}-${parts.find(part => part.type === 'month').value}`;
};
export const shiftCapitalPeriod = (period, offset) => {
    if (!/^\d{4}-\d{2}$/.test(period || '')) return '';
    const [year, month] = period.split('-').map(Number), date = new Date(Date.UTC(year, month - 1 + offset, 15));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};
export const capitalPeriodLabel = (period, short = false) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '')) return 'Mes no disponible';
    const value = new Intl.DateTimeFormat('es-AR', { timeZone: CAPITAL_TIMEZONE, month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }) }).format(new Date(period + '-15T12:00:00Z'));
    return value.charAt(0).toUpperCase() + value.slice(1);
};
export const capitalMoment = value => {
    const date = value ? new Date(value) : null;
    return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('es-AR', { timeZone: CAPITAL_TIMEZONE, dateStyle: 'short', timeStyle: 'short', hourCycle: 'h23' }).format(date) : 'Sin fecha registrada';
};
export const capitalValue = (row, currency, basis) => {
    const amount = row?.totalsByCurrency?.[currency]?.[basis === 'published' ? 'capitalPropioPublicado' : 'capitalPropioCosto'];
    return isCapitalNumber(amount) ? amount : null;
};
export const capitalQuality = (row, basis = 'cost') => {
    const quality = row?.quality;
    if (!quality) return { partial: true, label: 'Calidad sin verificar', message: '' };
    const status = basis === 'published' ? quality.publishedStatus : quality.costStatus;
    const specific = status !== undefined ? status === 'complete' : basis === 'published' ? quality.askingComplete ?? quality.publishedComplete : quality.costComplete;
    const partial = specific !== undefined ? !specific : quality.complete === false || (quality.status || quality) !== 'complete';
    return { partial, label: partial ? 'Datos parciales' : 'Datos completos', message: quality.message || '' };
};
export function capitalChange(row, previous, currency, basis) {
    if (!row || !previous || shiftCapitalPeriod(row.period, -1) !== previous.period || row.status === 'missing' || previous.status === 'missing') return { status: 'missing' };
    const amount = capitalValue(row, currency, basis), before = capitalValue(previous, currency, basis);
    if (!isCapitalNumber(amount) || !isCapitalNumber(before)) return { status: 'missing' };
    if (capitalQuality(row, basis).partial || capitalQuality(previous, basis).partial) return { status: 'partial' };
    if ((row.formulaVersion || row.calculationVersion || '') !== (previous.formulaVersion || previous.calculationVersion || '')) return { status: 'incompatible' };
    const difference = Math.round((amount - before) * 100) / 100;
    return { status: 'available', amount: difference, percent: before <= 0 ? null : difference / before * 100 };
}
export const capitalStatusLabel = row => row?.status === 'current' ? 'Consulta actual · Mes en curso' : row?.status === 'closed' ? 'Último registro del mes' : row?.status === 'missing' ? 'Sin registro' : 'Último registro · Mes en curso';
export function capitalRows(data, from, to) {
    const map = new Map((Array.isArray(data?.months) ? data.months : []).map(row => [row.period, row]));
    const rows = [];
    for (let period = from, count = 0; period && period <= to && count < 60; period = shiftCapitalPeriod(period, 1), count++) rows.push(map.get(period) || { period, status: 'missing' });
    return rows;
}
const labels = {
    stockPropioCosto: 'Stock propio a costo', efectivoPropio: 'Caja y bancos', carteraPropia: 'Cartera propia pendiente',
    otrosCreditos: 'Otros créditos verificados', deudasPropia: 'Deudas y obligaciones', pagosSinCuenta: 'Pagos con cuenta sin asignar'
};
export function capitalComponents(row, currency, basis = 'cost') {
    return Object.entries(row?.components || row?.componentes || {}).map(([key, component]) => ({ key,
        label: key === 'stockPropioCosto' && basis === 'published' ? 'Stock propio a precio publicado' : component?.label || labels[key] || key,
        sign: component?.sign || component?.signo || (['deudasPropia', 'pagosSinCuenta', 'debt', 'unassignedPayments'].includes(key) ? '−' : '+'),
        value: key === 'stockPropioCosto' && basis === 'published' ? row?.totalsByCurrency?.[currency]?.stockPropioPublicado
            : component?.byCurrency?.[currency] ?? component?.amounts?.[currency] ?? component?.[currency] ?? (currency === 'ARS' ? component?.monto : undefined),
        description: component?.description || component?.descripcion || ''
    })).filter(component => isCapitalNumber(component.value));
}
