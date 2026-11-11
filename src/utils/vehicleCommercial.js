import { clientCalendarKey } from './clientCommercial.js';
import { normalizePhoneToWhatsApp } from './phoneNormalizer.js';

export const INSPECTION_CATEGORIES = ['mechanic', 'frontSuspension', 'brakes', 'bodyPaint', 'interior'];
const INSPECTION_FLAGS = ['singleOwner', 'verifiedKm', 'titleInHand', 'vtvValid', 'noDebts', 'transferReady'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export class VehicleCommercialError extends Error {
    constructor(message, errors = {}, statusCode = 400) {
        super(message); this.errors = errors; this.statusCode = statusCode;
        this.code = statusCode === 409 ? 'VEHICLE_COMMERCIAL_CONFLICT' : 'VEHICLE_COMMERCIAL_VALIDATION';
    }
}
export function invalid(field, message) { throw new VehicleCommercialError(message, { [field]: message }); }
export function commercialText(value, field, limit = 5000, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) invalid(field, `Revisá el campo ${field}.`);
    return value.trim();
}
export function commercialDate(value, field) {
    const key = typeof value === 'string' ? clientCalendarKey(value) : '';
    if (!key) invalid(field, 'Ingresá una fecha calendario válida.');
    return new Date(`${key}T00:00:00.000Z`);
}
export function inspectionInput(payload) {
    if (!object(payload)) invalid('_form', 'Los datos del peritaje no son válidos.');
    const allowed = [...INSPECTION_CATEGORIES, ...INSPECTION_FLAGS, 'tiresPercent', 'service', 'keyCount', 'documentationNotes', 'generalNotes'];
    const values = {};
    for (const [key, raw] of Object.entries(payload)) {
        if (!allowed.includes(key)) invalid(key, 'El campo no pertenece al peritaje editable.');
        if (INSPECTION_CATEGORIES.includes(key)) {
            if (!object(raw) || Object.keys(raw).some(field => !['status', 'note'].includes(field))) invalid(key, 'Revisá la evaluación y su nota.');
            values[key] = {};
            if (Object.hasOwn(raw, 'status')) {
                if (!['ok', 'observacion', 'revisar', 'sin_evaluar'].includes(raw.status)) invalid(`${key}.status`, 'Elegí una evaluación válida.');
                values[key].status = raw.status;
            }
            if (Object.hasOwn(raw, 'note')) values[key].note = commercialText(raw.note, `${key}.note`);
        } else if (INSPECTION_FLAGS.includes(key)) {
            if (raw !== null && typeof raw !== 'boolean') invalid(key, 'Indicá sí, no o sin evaluar.');
            values[key] = raw;
        } else if (['tiresPercent', 'keyCount'].includes(key)) {
            const value = raw === null || raw === '' ? null : ['number', 'string'].includes(typeof raw) ? Number(raw) : NaN;
            if (value !== null && (!Number.isFinite(value) || value < 0 || (key === 'tiresPercent' ? value > 100 : !Number.isSafeInteger(value)))) invalid(key, key === 'tiresPercent' ? 'El porcentaje debe estar entre 0 y 100.' : 'Ingresá una cantidad entera mayor o igual a cero.');
            values[key] = value;
        } else values[key] = commercialText(raw, key);
    }
    if (!Object.keys(values).length) invalid('_form', 'Completá al menos un dato del peritaje.');
    return values;
}

const identityPhone = value => typeof value === 'string' && /\d/.test(value) ? normalizePhoneToWhatsApp(value).replace(/\D/g, '') : '';
const identityDni = value => typeof value === 'string' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
// Only explicit IDs and exact normalized identifiers join people; names never join records.
export function deduplicateVehiclePeople(records) {
    const groups = [];
    for (const record of records) {
        const keys = [record.clientId && `client:${record.clientId}`, record.leadId && `lead:${record.leadId}`, identityPhone(record.phone) && `phone:${identityPhone(record.phone)}`, identityDni(record.dniCuit) && `dni:${identityDni(record.dniCuit)}`].filter(Boolean);
        if (!keys.length) continue;
        const matches = groups.filter(group => keys.some(key => group.keys.has(key)));
        const target = matches[0] || { keys: new Set(), person: { ...record, sources: [] } };
        if (!matches.length) groups.push(target);
        for (const match of matches.slice(1)) {
            for (const key of match.keys) target.keys.add(key);
            target.person.sources.push(...match.person.sources);
            groups.splice(groups.indexOf(match), 1);
        }
        for (const key of keys) target.keys.add(key);
        target.person.sources = [...new Set([...target.person.sources, ...(record.sources || []), record.source].filter(Boolean))];
        if (!target.person.clientId && record.clientId) Object.assign(target.person, record, { sources: target.person.sources });
    }
    return groups.map(group => group.person);
}
export const normalizedCommercialLabel = value => String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
