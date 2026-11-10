const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

function validCalendarKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= daysInMonth[month - 1];
}

// Sale.saleDate is a calendar date, even when Mongo serializes it at midnight UTC.
// Keep its written date rather than converting it to the viewer's time zone.
export function formSaleDate(value) {
    if (value instanceof Date) {
        if (!Number.isFinite(value.getTime())) return '';
        value = value.toISOString();
    }
    if (typeof value !== 'string') return '';
    const normalized = value.trim();
    const match = /^(\d{4}-\d{2}-\d{2})(?:T.+)?$/.exec(normalized);
    if (!match || !validCalendarKey(match[1])) return '';
    if (normalized.length > 10 && !Number.isFinite(Date.parse(normalized))) return '';
    return match[1];
}

export function saleCalendarKey(sale) {
    const value = sale?.saleDate;
    if (value !== null && value !== undefined && value !== '') return formSaleDate(value);

    const createdAt = sale?.createdAt;
    if (createdAt === null || createdAt === undefined || createdAt === '') return '';
    if (typeof createdAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(createdAt) && !formSaleDate(createdAt)) return '';
    const instant = new Date(createdAt);
    if (!Number.isFinite(instant.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: ARGENTINA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(instant);
    const part = (type) => parts.find((entry) => entry.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatSaleDate(sale) {
    const key = saleCalendarKey(sale);
    if (!key) return 'Sin fecha';
    const [year, month, day] = key.split('-');
    return `${Number(day)}/${Number(month)}/${year}`;
}
