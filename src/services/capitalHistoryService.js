import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { CapitalObservation, CapitalMonth } from '../models/CapitalHistory.js';
import { getCapitalSummary } from './capitalSummaryService.js';
import { canReadCapitalHistory, canWriteCapitalHistory } from '../utils/adminPermissions.js';
import { logAudit } from '../utils/auditLogger.js';

export const CAPITAL_HISTORY_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const CAPITAL_HISTORY_FORMULA = 'capital-summary-v1';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const idOf = value => String(value?.id || value?.userId || value?._id || '');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clock = now => {
    const value = now === undefined ? new Date() : new Date(typeof now === 'function' ? now() : now);
    if (!Number.isFinite(value.getTime())) fail('Fecha de observación no válida.');
    return value;
};
const dateParts = date => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: CAPITAL_HISTORY_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(part => [part.type, part.value]));
export function capitalPeriodForDate(value) {
    const { year, month } = dateParts(clock(value)); return `${year}-${month}`;
}
const dayForDate = value => { const { year, month, day } = dateParts(value); return `${year}-${month}-${day}`; };
function validPeriod(value) {
    return typeof value === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value) && value.slice(0, 4) >= '1900';
}
export function addCapitalMonths(period, amount) {
    if (!validPeriod(period) || !Number.isInteger(amount)) fail('Período no válido.');
    const [year, month] = period.split('-').map(Number), serial = year * 12 + month - 1 + amount;
    return `${Math.floor(serial / 12)}`.padStart(4, '0') + '-' + String((serial % 12 + 12) % 12 + 1).padStart(2, '0');
}
const authorize = (user, write = false) => {
    if (!(write ? canWriteCapitalHistory(user) : canReadCapitalHistory(user))) fail('Sólo el propietario puede consultar o guardar el capital mensual.', 403);
};

// Store only the existing aggregate equation. No customer, account, vehicle or
// installment details are copied into the long-lived monthly observations.
export function compactCapitalSummary(summary) {
    const components = Object.fromEntries(Object.entries(summary.componentes).map(([key, component]) => [key, {
        label: component.label, sign: component.signo, byCurrency: component.byCurrency,
        description: component.descripcion
    }]));
    const metrics = summary.availableMetrics;
    const portfolioUnverified = (summary.componentes.carteraPropia.items || []).filter(item => item.ownPct === null
        || Boolean(item.saleId && item.vehicleTitle === 'Operación / Venta')).length;
    const costComplete = metrics.completeness.cost && !portfolioUnverified;
    const publishedComplete = metrics.completeness.asking && !portfolioUnverified;
    const quality = {
        status: costComplete && publishedComplete && summary.conciliacionStatus === 'completa' ? 'complete' : 'partial',
        costStatus: costComplete ? 'complete' : 'partial', publishedStatus: publishedComplete ? 'complete' : 'partial',
        missingCost: metrics.missingCost, missingPrice: metrics.missingPrice, portfolioUnverified,
        paymentsUnassigned: summary.componentes.pagosSinCuenta.items.length,
        message: summary.conciliacionMessage + (portfolioUnverified ? ' Hay cuotas cuya operación o participación requiere revisión.' : '')
    };
    return { formulaVersion: CAPITAL_HISTORY_FORMULA, totalsByCurrency: summary.totalsByCurrency, components, quality };
}
const observationDto = (doc, currentPeriod) => ({ id: String(doc._id), period: doc.period,
    status: doc.period < currentPeriod ? 'closed' : 'recorded', capturedAt: doc.capturedAt, source: doc.source,
    sourceLabel: doc.source === 'cron' ? 'Registro automático' : 'Registro manual del propietario',
    formulaVersion: doc.formulaVersion, totalsByCurrency: doc.totalsByCurrency, components: doc.components, quality: doc.quality });
let prepared;
async function prepareStorage() {
    return prepared ||= Promise.all([CapitalObservation.createCollection(), CapitalMonth.createCollection()])
        .catch(error => { prepared = null; throw error; });
}
async function observe({ user, source, requestKey, requestedPeriod, now, req }) {
    // Source and clock are supplied exclusively by trusted callers. The HTTP
    // endpoint never accepts historical dates, totals, components or sources.
    const initialTime = clock(now), initialPeriod = capitalPeriodForDate(initialTime);
    if (requestedPeriod !== undefined && requestedPeriod !== initialPeriod) fail('Sólo podés registrar el mes actual. Actualizá la pantalla.', 409);
    if (source === 'manual' && !/^[a-zA-Z0-9_-]{16,100}$/.test(String(requestKey || ''))) fail('No pudimos identificar el envío. Volvé a abrir la confirmación.');
    const requestId = hash(['capital-observation:v1', source, source === 'manual' ? idOf(user) : 'scheduled',
        source === 'manual' ? requestKey : dayForDate(initialTime)]);
    const fingerprint = hash([source, requestedPeriod ?? null]);
    await prepareStorage();
    const session = await mongoose.startSession();
    let saved, duplicate = false;
    try {
        await session.withTransaction(async () => {
            const readAt = clock(now);
            const previous = await CapitalObservation.findById(requestId).select('+requestFingerprint').session(session).lean();
            if (previous) {
                if (previous.requestFingerprint !== fingerprint) fail('Este envío corresponde a otro registro. Actualizá la pantalla.', 409);
                saved = previous; duplicate = true; return;
            }
            const compact = compactCapitalSummary(await getCapitalSummary({ session, cutoffDate: readAt }));
            const capturedAt = readAt, period = capitalPeriodForDate(capturedAt), completedAt = clock(now);
            if (capitalPeriodForDate(completedAt) !== period) fail('Cambió el mes mientras se registraba el capital. Reintentá con una lectura nueva.', 409);
            if (requestedPeriod !== undefined && requestedPeriod !== period) fail('Cambió el mes mientras se calculaba el capital. Actualizá y reintentá.', 409);
            // If the clock crosses into another local day, retry using that
            // day's key, rather than write a reading under a previous date.
            if (source === 'cron' && (dayForDate(capturedAt) !== dayForDate(initialTime) || dayForDate(completedAt) !== dayForDate(initialTime))) fail('Cambió el día mientras se registraba el capital. Reintentá.', 409);
            const doc = new CapitalObservation({ _id: requestId, period, capturedAt, source, ...compact,
                createdBy: source === 'manual' ? idOf(user) : 'system:capital-history', requestFingerprint: fingerprint });
            await doc.save({ session }); saved = doc.toObject();
            const month = await CapitalMonth.findById(period).session(session);
            const last = month ? await CapitalObservation.findById(month.observationId).select('capturedAt').session(session).lean() : null;
            // Preserve the most recent observed value, including races between
            // manual captures and the daily scheduled job.
            if (!month) {
                await CapitalMonth.create([{ _id: period, observationId: requestId, firstCapturedAt: capturedAt, revision: 1 }], { session });
            } else if (!last || new Date(last.capturedAt) <= capturedAt) {
                month.observationId = requestId; month.revision++; await month.save({ session });
            }
            await logAudit({ req: req || { user: user || { id: 'system', name: 'Capital mensual', role: 'system' } },
                action: 'CAPITAL_OBSERVADO', module: 'capitalHistory', entityType: 'CapitalObservation', entityId: requestId,
                metadata: { period, source, formulaVersion: CAPITAL_HISTORY_FORMULA }, session, strict: true });
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } catch (error) {
        if (error.code === 11000) {
            const previous = await CapitalObservation.findById(requestId).select('+requestFingerprint').lean();
            if (previous?.requestFingerprint === fingerprint) { saved = previous; duplicate = true; }
            else fail('Otro registro cambió este mes. Reintentá para guardar una observación consistente.', 409);
        } else if (error.code === 20 || error.codeName === 'IllegalOperation') {
            fail('La base debe admitir transacciones para conservar un registro consistente del capital.', 503);
        } else throw error;
    } finally { await session.endSession(); }
    return { snapshot: observationDto(saved, capitalPeriodForDate(clock(now))), duplicate };
}
export function captureCapitalObservation({ user, requestKey, period, now, req } = {}) {
    authorize(user, true);
    return observe({ user, source: 'manual', requestKey, requestedPeriod: period, now, req });
}
export function captureScheduledCapitalObservation({ now, req } = {}) {
    return observe({ source: 'cron', now, req });
}
export async function queryCapitalHistory(user, filters = {}, { now } = {}) {
    authorize(user);
    const instant = clock(now), currentPeriod = capitalPeriodForDate(instant);
    const to = filters.to ?? currentPeriod, from = filters.from ?? addCapitalMonths(to, -11);
    if (!validPeriod(from) || !validPeriod(to) || from > to || to > currentPeriod) fail('Elegí un rango válido hasta el mes actual.');
    const periods = [];
    for (let period = from; period <= to && periods.length < 61; period = addCapitalMonths(period, 1)) periods.push(period);
    if (periods.length > 60) fail('Consultá hasta 60 meses por vez.');
    const session = await mongoose.startSession(); let result;
    try {
        await session.withTransaction(async () => {
            const current = compactCapitalSummary(await getCapitalSummary({ session, cutoffDate: instant }));
            const rows = await CapitalMonth.find({ _id: { $gte: from, $lte: to } }).session(session).lean();
            const observations = await CapitalObservation.find({ _id: { $in: rows.map(row => row.observationId) } }).session(session).lean();
            const byId = new Map(observations.map(row => [row._id, row])), byPeriod = new Map(rows.map(row => [row._id, row]));
            const first = await CapitalMonth.findOne({}).sort({ _id: 1 }).session(session).lean();
            result = { timezone: CAPITAL_HISTORY_TIMEZONE, formulaVersion: CAPITAL_HISTORY_FORMULA,
                current: { period: currentPeriod, status: 'current', source: 'live', asOf: instant, ...current },
                months: periods.map(period => {
                    const row = byPeriod.get(period), observation = row ? byId.get(row.observationId) : null;
                    return observation?.period === period ? { ...observationDto(observation, currentPeriod), revision: row.revision }
                        : { period, status: 'missing', capturedAt: null, totalsByCurrency: null, components: null, quality: null, source: null };
                }), firstRecordedPeriod: first?._id || null, canCapture: canWriteCapitalHistory(user),
                schedule: { frequency: 'daily', description: 'Se conserva el último registro observado de cada mes, con su fecha real.' } };
        }, { readConcern: { level: 'snapshot' } });
    } finally { await session.endSession(); }
    return result;
}
