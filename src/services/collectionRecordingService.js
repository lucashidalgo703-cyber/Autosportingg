import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Installment from '../models/Installment.js';
import Sale from '../models/Sale.js';
import Reservation from '../models/Reservation.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import Gestoria from '../models/Gestoria.js';
import CollectionRecordingOperation from '../models/CollectionRecordingOperation.js';
import { roundMoney } from '../utils/saleCommercial.js';
import { registerCollectionForTreasury } from './treasuryStrategicService.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const idOf = value => String(value?._id || value || '');
const validId = value => mongoose.isValidObjectId(value);
const actor = user => user?.username || user?.name || user?.email || 'Admin';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
let storageReady;
export function createCollectionRecordingStorage() {
    return storageReady ||= CollectionRecordingOperation.createCollection().catch(error => { storageReady = null; throw error; });
}

export async function syncRecordedCollection(transactionId, user, options = {}) {
    // This claim prevents two lost-response retries from running distribution
    // concurrently. An uncertain distribution is left for existing treasury review.
    const operation = await CollectionRecordingOperation.findOneAndUpdate({ transactionId, treasuryState: 'pending' },
        { $set: { treasuryState: 'running' } }, { new: true }).lean();
    if (!operation) return (await CollectionRecordingOperation.findOne({ transactionId }).lean())?.treasuryResult || null;
    try {
        const tx = await Transaction.findById(transactionId);
        const result = await registerCollectionForTreasury(tx, { user, isTreasuryUnlocked: Boolean(options.isTreasuryUnlocked) });
        await CollectionRecordingOperation.updateOne({ _id: operation._id, treasuryState: 'running' }, { $set: { treasuryState: 'done', treasuryResult: result } });
        return result;
    } catch {
        const result = { status: 'pending_distribution', reason: 'confirmation_pending', message: 'Cobro registrado. Revisá su distribución en Tesorería.' };
        await CollectionRecordingOperation.updateOne({ _id: operation._id, treasuryState: 'running' }, { $set: { treasuryState: 'uncertain', treasuryResult: result } });
        return result;
    }
}

async function collectionInSession(user, input, options, session) {
    const amount = roundMoney(Number(input.amount));
    if (!Number.isFinite(Number(input.amount)) || amount < 0 || options.strictDestination && amount <= 0) fail('Ingresá un importe válido mayor a cero.');
    if (!['ARS', 'USD'].includes(input.currency)) fail('Seleccioná ARS o USD.');
    if (!String(input.concept || '').trim() || !String(input.category || '').trim()) fail('Completá el concepto y la categoría del cobro.');
    if (input.status && input.status !== 'activo') fail('La acreditación debe registrar un ingreso activo.');
    const date = input.date ? new Date(input.date) : new Date();
    if (!Number.isFinite(date.getTime())) fail('La fecha del cobro no es válida.');
    const key = String(input.idempotencyKey || options.idempotencyKey || crypto.randomUUID()).trim();
    if (key.length > 180) fail('Identificador del cobro inválido.');
    const operationId = hash('crm-collection:' + key);
    const fingerprint = hash(JSON.stringify({ amount, currency: input.currency, saleId: idOf(input.saleId), reservationId: idOf(input.reservationId),
        clientId: idOf(input.clientId), vehicleId: idOf(input.vehicleId), installmentId: idOf(input.installmentId),
        accountId: idOf(input.accountId), paymentDestination: input.paymentDestination || '', gestoriaId: idOf(input.gestoriaId),
        date: input.date ? date.toISOString() : null, concept: input.concept, category: input.category, notes: input.notes || '', paymentMethod: input.paymentMethod || 'transferencia' }));
    const prior = await CollectionRecordingOperation.findById(operationId).session(session).lean();
    if (prior) {
        if (prior.fingerprint !== fingerprint) fail('Este identificador ya corresponde a otro cobro.', 409);
        const transaction = await Transaction.findById(prior.transactionId).session(session);
        if (!transaction) fail('El cobro requiere revisión en Finanzas.', 409);
        const installment = transaction.installmentId ? await Installment.findById(transaction.installmentId).session(session) : null;
        return { transaction, installment, duplicate: true };
    }
    let sale = null, installment = null, procedure = null;
    if (input.saleId) {
        if (!validId(input.saleId)) fail('Venta no válida.');
        sale = await Sale.findById(input.saleId).session(session);
        if (!sale || sale.status === 'cancelada') fail('La venta no está disponible.', 409);
        if (options.strictDestination && (idOf(sale.clientId) !== idOf(input.clientId) || idOf(sale.vehicleId) !== idOf(input.vehicleId))) fail('El comprador o vehículo de la operación cambió.', 409);
        // Serialize receipt confirmations against each other and sale edits.
        await Sale.updateOne({ _id: sale._id, status: { $ne: 'cancelada' } }, { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
    }
    for (const [field, Model] of [['reservationId', Reservation], ['clientId', Client], ['vehicleId', Car]]) {
        if (input[field] && (!validId(input[field]) || !await Model.exists({ _id: input[field] }).session(session))) fail('El vínculo del cobro ya no está disponible.', 409);
    }
    if (input.gestoriaId) {
        if (!validId(input.gestoriaId)) fail('Trámite no válido.');
        procedure = await Gestoria.findOne({ _id: input.gestoriaId, saleId: input.saleId }).session(session);
        if (!procedure || procedure.status === 'Cancelado' || input.paymentDestination !== 'gestoria' || procedure.currency !== input.currency) fail('El trámite y la moneda del cobro no coinciden.', 409);
        if (amount <= 0 || amount > roundMoney(Number(procedure.clientChargeAmount || 0) - Number(procedure.chargedAmount || 0))) fail('El importe supera el saldo pendiente de gestoría.', 409);
    }
    if (input.paymentDestination === 'gestoria' && !procedure) fail('Seleccioná el trámite que corresponde al cobro.');
    if (input.installmentId) {
        if (!validId(input.installmentId)) fail('Cuota no válida.');
        installment = await Installment.findById(input.installmentId).session(session);
        if (!installment || ['pagada', 'anulada', 'pagada_manual'].includes(installment.status)) fail('La cuota ya no admite este cobro.', 409);
        if (installment.currency !== input.currency || input.saleId && idOf(installment.saleId) !== idOf(input.saleId)
            || input.clientId && installment.clientId && idOf(installment.clientId) !== idOf(input.clientId)) fail('La cuota no corresponde a esta operación o moneda.', 409);
        if (!(amount > 0) || amount > roundMoney(Number(installment.amount) - Number(installment.paidAmount || 0))) fail('El importe supera el saldo pendiente de la cuota.', 409);
    }
    let account;
    if (input.accountId) {
        if (!validId(input.accountId)) fail('Cuenta financiera no válida.');
        account = await Account.findById(input.accountId).session(session);
    } else if (!options.requireAccount) {
        const name = `Caja Principal V2 ${input.currency}`;
        account = await Account.findOne({ name, currency: input.currency }).session(session);
        if (!account) [account] = await Account.create([{ name, type: 'Efectivo', currency: input.currency, balance: 0, isActive: true }], { session });
    }
    if (!account || account.isActive === false || account.currency !== input.currency) fail('Seleccioná una cuenta activa de la misma moneda que el cobro.');
    const transactionId = options.transactionId || new mongoose.Types.ObjectId();
    await CollectionRecordingOperation.create([{ _id: operationId, fingerprint, transactionId }], { session });
    const [transaction] = await Transaction.create([{
        _id: transactionId, module: 'crm_v2', source: input.source || (installment ? 'cuota' : sale ? 'venta' : input.reservationId ? 'reserva' : 'manual'),
        type: 'Ingreso', amount, currency: input.currency, description: input.description || input.concept, concept: input.concept,
        category: input.category, paymentMethod: input.paymentMethod || 'transferencia', date, notes: input.notes || '',
        accountId: account._id, status: 'activo', saleId: input.saleId || undefined, reservationId: input.reservationId || undefined,
        clientId: input.clientId || undefined, vehicleId: input.vehicleId || undefined, installmentId: input.installmentId || undefined,
        installmentPaidAmountApplied: installment ? amount : 0, paymentDestination: input.paymentDestination || (installment ? 'installment' : undefined),
        gestoriaId: input.gestoriaId || undefined, gestoriaPaidAmountApplied: procedure ? amount : 0,
        buyerPaymentProofId: options.proofId || undefined, idempotencyKey: key,
        treasuryBoxKey: input.treasuryBoxKey || null, targetUser: input.targetUser, payeeCompany: input.payeeCompany,
        payeeVehicle: input.payeeVehicle, beneficiary: input.beneficiary, dueDate: input.dueDate || undefined,
        createdBy: actor(user), transactionAuditLog: [{ action: options.proofId ? 'COMPROBANTE_ACREDITADO' : 'CREACION_MANUAL',
            details: options.proofId ? 'Cobro acreditado desde comprobante verificado.' : `Movimiento creado: ${input.concept}`, user: actor(user), source: 'CRM_V2' }]
    }], { session });
    const updated = await Account.updateOne({ _id: account._id, isActive: { $ne: false }, currency: input.currency }, { $inc: { balance: amount } }, { session });
    if (!updated.matchedCount) fail('La cuenta ya no admite el cobro.', 409);
    if (installment) {
        installment.paidAmount = roundMoney(Number(installment.paidAmount || 0) + amount);
        installment.status = installment.paidAmount >= installment.amount ? 'pagada' : 'parcial';
        installment.paymentDate = date; installment.updatedBy = actor(user);
        installment.installmentAuditLog.push({ action: 'COBRO_REGISTRADO', details: `Cobro por ${input.currency} ${amount}.`, user: actor(user) });
        await installment.save({ session });
    }
    if (procedure) {
        procedure.chargedAmount = roundMoney(Number(procedure.chargedAmount || 0) + amount);
        procedure.collectionRevision = Number(procedure.collectionRevision || 0) + 1;
        procedure.auditLog.push({ action: 'COBRO_ACREDITADO', details: `Cobro acreditado: ${input.currency} ${amount}. Movimiento ${transaction._id}.`, user: actor(user) });
        await procedure.save({ session });
    }
    return { transaction, installment, duplicate: false };
}

export async function recordCrmCollection(user, input, options = {}) {
    if (options.session) return collectionInSession(user, input, options, options.session);
    await createCollectionRecordingStorage();
    const session = await mongoose.startSession();
    let result;
    try { await session.withTransaction(async () => { result = await collectionInSession(user, input, options, session); }); }
    finally { await session.endSession(); }
    const treasuryIntegration = await syncRecordedCollection(result.transaction._id, user, options);
    return { ...result, treasuryIntegration };
}

export async function payInstallmentAtomic(user, installmentId, input, options = {}) {
    if (!validId(installmentId)) fail('Cuota no válida.');
    const installment = await Installment.findById(installmentId).lean();
    if (!installment) fail('Cuota no encontrada.', 404);
    return recordCrmCollection(user, {
        ...input, paymentMethod: input.paymentMethod || 'efectivo', installmentId, currency: installment.currency, saleId: installment.saleId, clientId: installment.clientId,
        vehicleId: installment.vehicleId, paymentDestination: 'installment', source: 'cuota', concept: 'Cobro de Cuota', category: 'Cobranzas',
        description: `Cobro cuota ${installment.installmentNumber || ''} - ${installment.concept || ''}`
    }, { ...options, requireAccount: true, strictDestination: true });
}
