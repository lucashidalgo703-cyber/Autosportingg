import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Car from '../models/Car.js';
import Sale from '../models/Sale.js';
import Reservation from '../models/Reservation.js';
import AuditLog from '../models/AuditLog.js';
import TrashRecord from '../models/TrashRecord.js';
import VehicleInvoice from '../models/VehicleInvoice.js';
import { CapitalObservation, CapitalMonth } from '../models/CapitalHistory.js';
import { canReadCapitalHistory, canWriteCapitalHistory } from '../utils/adminPermissions.js';
import { capitalPeriodForDate } from './capitalHistoryService.js';
import { buildStockRecovery } from './stockRecoveryReconstruction.js';
import { logAudit } from '../utils/auditLogger.js';

const VERSION = 'stock-recovery-v1';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validPeriod = value => typeof value === 'string' && /^202\d-(0[1-9]|1[0-2])$/.test(value);
function range(input, now, write = false) {
    if (!input || typeof input !== 'object' || Array.isArray(input)
        || Object.keys(input).some(key => !(write ? ['from', 'to', 'planId'] : ['from', 'to']).includes(key))) fail('La recuperación sólo admite el rango de meses y el identificador de revisión.');
    const current = capitalPeriodForDate(now), from = input.from ?? '2026-05', to = input.to ?? current;
    if (!validPeriod(from) || !validPeriod(to) || from < '2026-05' || from > to || to > current) fail('Elegí meses desde mayo de 2026 hasta el mes actual.');
    const [fy, fm] = from.split('-').map(Number), [ty, tm] = to.split('-').map(Number);
    if ((ty - fy) * 12 + tm - fm >= 24) fail('Revisá hasta 24 meses por recuperación.');
    if (write && !/^[a-f0-9]{64}$/.test(input.planId || '')) fail('Primero revisá la propuesta de recuperación.');
    return { from, to, current };
}
function authorize(user, write = false) {
    if (!(write ? canWriteCapitalHistory(user) : canReadCapitalHistory(user))) fail('Sólo el propietario puede recuperar el stock histórico.', 403);
}
async function readSources(session) {
    // Sequential queries share a single consistent snapshot. No seeds, updates,
    // expired-trash cleanup, file downloads or external calls run here.
    const read = query => query.session(session).sort({ _id: 1 }).lean();
    const cars = await read(Car.find({}).select('_id brand name model year status sold soldAt createdAt updatedAt price currency purchasePrice purchaseCurrency agencyOwned investor jointOwnership purchasePaymentState consignedBy consignador origen origin isSharedInvestment tradeInOrigin expenses auditLog'));
    const sales = await read(Sale.find({}).select('_id vehicleId status saleDate createdAt updatedAt cancelledAt vehicleChangeHistory saleAuditLog tradeIns'));
    const reservations = await read(Reservation.find({}).select('_id vehicleId status depositDate createdAt updatedAt expiresAt reservationAuditLog'));
    const audits = await read(AuditLog.find({ $or: [{ entityType: /^car$/i }, { module: /^(stock|vehiculos|vehículos)$/i }] }).select('_id entityId entityType action module metadata createdAt'));
    const trash = await read(TrashRecord.find({ entityType: /^car$/i }).select('_id entityType entityId snapshot createdAt expiresAt'));
    const invoices = await read(VehicleInvoice.find({ direction: 'purchase' }).select('_id carId direction invoiceDate totalAmount currency status annulledAt history createdAt updatedAt'));
    return { cars, sales, reservations, audits, trash, invoices };
}
async function plan(user, input, now, session, write = false) {
    const selected = range(input, now, write), sources = await readSources(session);
    const result = buildStockRecovery({ ...sources, from: selected.from, through: selected.to, now });
    const existing = await CapitalMonth.find({ _id: { $gte: selected.from, $lte: selected.to } }).session(session).select('_id').lean();
    const existingPeriods = existing.map(row => row._id).sort(), protectedPeriods = new Set(existingPeriods);
    // Existing month references are intentionally excluded from the source hash:
    // a successful import must not invalidate its own idempotent retry.
    const planId = digest([VERSION, selected.from, selected.to, selected.current, sources]);
    const rows = result.rows.map(row => ({ ...row, source: 'reconstructed', sourceLabel: 'Stock reconstruido', capturedAt: new Date(now),
        status: row.period < selected.current ? 'closed' : 'recorded', existing: protectedPeriods.has(row.period),
        importable: row.period < selected.current && !protectedPeriods.has(row.period) }));
    return { from: selected.from, to: selected.to, current: selected.current, planId, rows, existingPeriods,
        importablePeriods: rows.filter(row => row.importable).map(row => row.period), sourceCounts: result.sourceCounts,
        message: 'Se recupera sólo el Stock respaldado por fuentes conservadas. Los meses guardados se preservan y no se reconstruye caja, cartera ni capital propio neto.' };
}
export async function previewStockRecovery(user, input = {}, { now = new Date() } = {}) {
    authorize(user);
    range(input, now);
    const session = await mongoose.startSession();
    try {
        let result;
        await session.withTransaction(async () => { result = await plan(user, input, now, session); }, { readConcern: { level: 'snapshot' } });
        return result;
    } finally { await session.endSession(); }
}
export async function importStockRecovery(user, input, req = null, { now = new Date() } = {}) {
    authorize(user, true);
    range(input, now, true);
    await Promise.all([CapitalObservation.createCollection(), CapitalMonth.createCollection()]);
    for (let attempt = 0; attempt < 3; attempt++) {
        const session = await mongoose.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                const proposal = await plan(user, input, now, session, true);
                if (proposal.planId !== input.planId) fail('Los datos cambiaron desde la revisión. Volvé a consultar la propuesta antes de guardarla.', 409);
                const importedPeriods = [], preservedPeriods = proposal.rows.filter(row => !row.importable).map(row => row.period);
                for (const row of proposal.rows.filter(row => row.importable)) {
                    const id = digest([VERSION, row.period, proposal.planId]);
                    const recovery = { ...row.recovery, version: VERSION, reconstructedAt: new Date(now), cutoffAt: new Date(row.asOf),
                        planId: proposal.planId, scope: 'stock-only', preservesObservedMonths: true };
                    await CapitalObservation.create([{ _id: id, period: row.period, capturedAt: new Date(now), asOf: new Date(row.asOf),
                        source: 'reconstructed', formulaVersion: VERSION, stockCapital: row.stockCapital ?? null,
                        totalsByCurrency: {}, components: {}, quality: { ...row.quality, status: 'partial', costStatus: 'partial', publishedStatus: 'partial' },
                        recovery, createdBy: String(user.id || user.userId || user._id), requestFingerprint: proposal.planId }], { session });
                    await CapitalMonth.create([{ _id: row.period, observationId: id, firstCapturedAt: new Date(now), revision: 1 }], { session });
                    await logAudit({ req: req || { user }, action: 'STOCK_HISTORICO_RECUPERADO', module: 'capitalHistory',
                        entityType: 'CapitalObservation', entityId: id,
                        metadata: { period: row.period, source: 'reconstructed', cutoffAt: row.asOf, version: VERSION, planId: proposal.planId },
                        session, strict: true });
                    importedPeriods.push(row.period);
                }
                result = { importedPeriods, preservedPeriods, duplicate: importedPeriods.length === 0, planId: proposal.planId };
            }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
            return result;
        } catch (error) {
            if (error.code !== 11000 || attempt === 2) throw error;
        } finally { await session.endSession(); }
    }
}
