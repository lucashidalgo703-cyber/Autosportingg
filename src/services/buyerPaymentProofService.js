import crypto from 'node:crypto';
import mongoose from 'mongoose';
import BuyerPaymentProof from '../models/BuyerPaymentProof.js';
import Sale from '../models/Sale.js';
import Client from '../models/Client.js';
import Car from '../models/Car.js';
import Reservation from '../models/Reservation.js';
import Installment from '../models/Installment.js';
import Gestoria from '../models/Gestoria.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import { hasPermission, isSalesRole, PERMISSIONS } from '../utils/adminPermissions.js';
import { isMySaleOrReservation } from '../utils/saleOwnership.js';
import { roundMoney } from '../utils/saleCommercial.js';
import { isDepositCollection, isGestoriaCollection, remainingAppliedDeposit } from '../utils/collectionDestination.js';
import { inspectPortalUpload, encryptPortalFile, decryptPortalFile, issuePortalFileAccess, verifyPortalFileAccess, lockBuyerPortalMutation } from './buyerPortalFileService.js';
import { createCollectionRecordingStorage, recordCrmCollection, syncRecordedCollection } from './collectionRecordingService.js';
import { createBuyerPaymentNotificationIndexes, enqueueBuyerPaymentNotification, deliverBuyerPaymentNotification, getBuyerPaymentNotificationSummaries } from './buyerPaymentNotificationService.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const idOf = value => String(value?._id || value || '');
const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const clean = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const active = tx => tx.type === 'Ingreso' && ['activo', 'Completado'].includes(tx.status);
const actor = user => user?.username || user?.name || user?.email || 'Admin';
let ready;
export function createBuyerPaymentIndexes() {
    return ready ||= (async () => { await BuyerPaymentProof.createCollection(); await BuyerPaymentProof.createIndexes(); await createCollectionRecordingStorage(); await createBuyerPaymentNotificationIndexes(); })()
        .catch(error => { ready = null; throw error; });
}
function financialAccess(user, write = false) {
    if (isSalesRole(user) || !hasPermission(user, write ? PERMISSIONS.FINANZAS_WRITE : PERMISSIONS.FINANZAS_READ)) fail('No tenés permiso para revisar comprobantes de pago.', 403);
}
async function adminSale(user, saleId, write = false, session) {
    financialAccess(user, write);
    if (!validId(idOf(saleId))) fail('Operación no encontrada.', 404);
    const sale = await Sale.findById(saleId).session(session || null).lean();
    if (!sale || isSalesRole(user) && !isMySaleOrReservation(sale, user)) fail('Operación no encontrada.', 404);
    return sale;
}
function sameBinding(proof, sale) {
    return idOf(proof.saleId) === idOf(sale._id) && idOf(proof.clientId) === idOf(sale.clientId) && idOf(proof.vehicleId) === idOf(sale.vehicleId);
}
const proofDto = (proof, transactions = []) => ({ id: idOf(proof), amount: proof.amount, currency: proof.currency, paymentDate: proof.paymentDate,
    concept: proof.concept, targetType: proof.targetType, targetId: proof.targetId ? idOf(proof.targetId) : null,
    status: proof.status, comment: proof.comment || '', createdAt: proof.createdAt, version: proof.version,
    transactionId: proof.transactionId ? idOf(proof.transactionId) : null,
    transactionStatus: proof.transactionId ? transactions.find(tx => idOf(tx) === idOf(proof.transactionId))?.status || null : null,
    entry: { id: idOf(proof), fileName: proof.fileName, mimeType: proof.mimeType, description: `Comprobante de pago · ${proof.concept}`, createdAt: proof.createdAt } });

async function targetsForSale(sale, session) {
    const [transactions, installments, procedures, reservation] = await Promise.all([
        Transaction.find({ $or: [{ saleId: sale._id }, ...(sale.reservationId ? [{ reservationId: sale.reservationId }] : [])] }).session(session || null).lean(),
        Installment.find({ saleId: sale._id, status: { $ne: 'anulada' } }).sort({ dueDate: 1 }).session(session || null).lean(),
        Gestoria.find({ saleId: sale._id, status: { $ne: 'Cancelado' } }).session(session || null).lean(),
        sale.reservationId ? Reservation.findById(sale.reservationId).session(session || null).lean() : null
    ]);
    const collected = transactions.filter(active), targets = [];
    const curr = sale.saleCurrency || 'ARS';
    const principal = transactions.filter(tx => ['activo', 'Completado'].includes(tx.status) && tx.currency === curr && !isGestoriaCollection(tx));
    const appliedRemainder = remainingAppliedDeposit(sale, principal);
    const tradeIn = Number(sale.tradeInTotalAmount || 0);
    const purchasePending = roundMoney(Math.max(0, Number(sale.salePrice || 0) - tradeIn - appliedRemainder - principal.reduce((sum, tx) => sum + (tx.type === 'Ingreso' ? tx.amount : tx.type === 'Egreso' ? -tx.amount : 0), 0)));
    targets.push({ type: 'purchase', id: idOf(sale), label: 'Saldo de compra', currency: curr, pendingAmount: purchasePending });
    if (reservation && idOf(reservation.clientId) === idOf(sale.clientId) && !['cancelada', 'devuelta'].includes(reservation.status)) {
        const paid = collected.filter(tx => idOf(tx.reservationId) === idOf(reservation) && tx.currency === reservation.depositCurrency && isDepositCollection(tx, sale)).reduce((sum, tx) => sum + tx.amount, 0);
        // depositAmount is an amount already received, never a new debt. Keep it
        // selectable to attach its proof; only the unrecorded part may create cash.
        const recordableAmount = roundMoney(Math.max(0, Number(reservation.depositAmount || 0) - paid));
        targets.push({ type: 'deposit', id: idOf(reservation), label: 'Seña registrada de la operación', currency: reservation.depositCurrency, recorded: true, recordableAmount });
    }
    for (const item of installments) {
        const pendingAmount = roundMoney(Math.max(0, item.amount - Number(item.paidAmount || 0)));
        if (pendingAmount > 0 || item.paidAmount > 0) targets.push({ type: 'installment', id: idOf(item), label: `Cuota ${item.installmentNumber}${item.concept ? ' · ' + item.concept : ''}`, currency: item.currency, pendingAmount, recorded: pendingAmount <= 0, dueDate: item.rescheduledDate || item.dueDate });
    }
    for (const item of procedures) {
        const pendingAmount = roundMoney(Math.max(0, Number(item.clientChargeAmount || 0) - Number(item.chargedAmount || 0)));
        if (pendingAmount > 0 || item.chargedAmount > 0 && item.clientChargeAmount > 0) targets.push({ type: 'gestoria', id: idOf(item), label: `Gestoría · ${item.type}`, currency: item.currency, pendingAmount, recorded: pendingAmount <= 0 });
    }
    return { targets, transactions };
}
function targetFor(proof, sale, targets) {
    return targets.find(target => target.type === proof.targetType && (['purchase', 'deposit'].includes(proof.targetType)
        ? proof.targetType === 'purchase' || target.id === idOf(sale.reservationId) : target.id === idOf(proof.targetId)));
}
function targetLabel(proof, sale, targets) { return targetFor(proof, sale, targets)?.label || ({ purchase: 'Saldo de compra', deposit: 'Seña de la operación', installment: 'Cuota', gestoria: 'Gestoría' }[proof.targetType]); }
export async function buyerPaymentData(context) {
    const { sale } = context;
    const [{ targets, transactions }, proofs] = await Promise.all([
        targetsForSale(sale), BuyerPaymentProof.find({ saleId: sale._id, clientId: sale.clientId, vehicleId: sale.vehicleId, status: { $ne: 'superseded' } }).sort({ createdAt: -1 }).lean()
    ]);
    return { proofs: proofs.map(proof => ({ ...proofDto(proof, transactions), targetLabel: targetLabel(proof, sale, targets) })), pendingTargets: targets.filter(target => target.pendingAmount > 0 || target.recorded) };
}

export async function uploadPaymentProof(context, input, file) {
    const amount = roundMoney(Number(input.amount)), currency = String(input.currency || ''), concept = clean(input.concept);
    if (!(amount > 0) || !Number.isFinite(Number(input.amount)) || amount > 1e12 || !['ARS', 'USD'].includes(currency) || !concept) fail('Completá importe, moneda y concepto del comprobante.');
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(input.requestId || '')) fail('El envío necesita un identificador válido. Volvé a elegir el archivo.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate || '') || !Number.isFinite(Date.parse(input.paymentDate + 'T15:00:00Z'))
        || new Date(input.paymentDate + 'T15:00:00Z').toISOString().slice(0, 10) !== input.paymentDate
        || input.paymentDate > new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())) fail('Ingresá una fecha de pago válida, hasta hoy.');
    const targetType = input.targetType || 'purchase';
    if (!['purchase', 'deposit', 'installment', 'gestoria'].includes(targetType)) fail('Destino de pago no válido.');
    const targetId = ['installment', 'gestoria'].includes(targetType) ? clean(input.targetId, 24) : targetType === 'deposit' ? idOf(context.sale.reservationId) : idOf(context.sale);
    if (!validId(targetId)) fail('Seleccioná el pago o la cuota que corresponde.');
    const media = inspectPortalUpload(file);
    const dedupeHash = hash(JSON.stringify({ fileHash: media.fileHash, amount, currency, paymentDate: input.paymentDate, concept, targetType, targetId }));
    await createBuyerPaymentIndexes();
    const session = await mongoose.startSession(); let proof, duplicate = false;
    try {
        await session.withTransaction(async () => {
            const { currentSale, currentClient } = await lockBuyerPortalMutation(context, session);
            const previous = await BuyerPaymentProof.findOne({ saleId: currentSale._id, $or: [{ requestId: input.requestId }, { dedupeHash }] }).session(session).lean();
            if (previous) {
                if (!sameBinding(previous, currentSale) || previous.dedupeHash !== dedupeHash || previous.status === 'superseded') fail('El envío ya corresponde a otro comprobante o fue reemplazado.', 409);
                proof = previous; duplicate = true; return;
            }
            const { targets } = await targetsForSale(currentSale, session);
            const target = targetFor({ targetType, targetId }, currentSale, targets);
            if (targetType !== 'purchase' && (!target || target.currency !== currency)) fail('El destino seleccionado no corresponde a esta operación o moneda.', 409);
            let prior;
            if (input.replacesId) {
                if (!validId(input.replacesId)) fail('Comprobante anterior no válido.');
                prior = await BuyerPaymentProof.findOne({ _id: input.replacesId, saleId: currentSale._id, clientId: currentSale.clientId,
                    vehicleId: currentSale.vehicleId, status: { $in: ['pending', 'correction_requested'] } }).session(session);
                if (!prior) fail('El comprobante ya fue revisado o reemplazado. Actualizá el portal.', 409);
                prior.status = 'superseded'; prior.history.push({ status: 'superseded', at: new Date(), by: 'buyer' }); await prior.save({ session });
            }
            const id = new mongoose.Types.ObjectId();
            const [created] = await BuyerPaymentProof.create([{ _id: id, saleId: currentSale._id, clientId: currentSale.clientId, vehicleId: currentSale.vehicleId,
                requestId: input.requestId, dedupeHash, amount, currency, paymentDate: new Date(input.paymentDate + 'T15:00:00Z'), concept,
                targetType, targetId, fileName: clean(file.originalname, 180), ...media,
                encryptedFile: encryptPortalFile(file.buffer, 'payment', idOf(id)), version: prior ? prior.version + 1 : 1, replacesId: prior?._id,
                history: [{ status: 'pending', at: new Date(), by: 'buyer' }] }], { session });
            proof = created.toObject();
            await enqueueBuyerPaymentNotification({ proof, sale: currentSale, portal: context.portal, client: currentClient }, session);
        });
    } finally { await session.endSession(); }
    await deliverBuyerPaymentNotification(idOf(proof));
    return { proof: proofDto(proof), duplicate };
}

function matchesTransaction(proof, tx, sale) {
    if (!active(tx) || tx.currency !== proof.currency || roundMoney(tx.amount) !== proof.amount || tx.clientId && idOf(tx.clientId) !== idOf(sale.clientId)
        || tx.vehicleId && idOf(tx.vehicleId) !== idOf(sale.vehicleId)) return false;
    if (proof.targetType === 'deposit') return idOf(tx.reservationId) === idOf(sale.reservationId) && isDepositCollection(tx, sale) && (!tx.saleId || idOf(tx.saleId) === idOf(sale));
    if (idOf(tx.saleId) !== idOf(sale)) return false;
    if (proof.targetType === 'installment') return idOf(tx.installmentId) === idOf(proof.targetId);
    if (proof.targetType === 'gestoria') return tx.paymentDestination === 'gestoria' && idOf(tx.gestoriaId) === idOf(proof.targetId) || legacyProcedureCollection(tx);
    return !tx.installmentId && !isGestoriaCollection(tx) && !legacyProcedureCollection(tx) && !isDepositCollection(tx, sale);
}
function legacyProcedureCollection(tx) {
    return !tx.paymentDestination && !tx.installmentId && !tx.reservationId && /^gestoria$/i.test(String(tx.category || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
}
export async function adminPaymentProofs(user, saleId) {
    const sale = await adminSale(user, saleId), { targets, transactions } = await targetsForSale(sale);
    const [proofs, accounts] = await Promise.all([
        BuyerPaymentProof.find({ saleId }).sort({ createdAt: -1 }).lean(), Account.find({ isActive: { $ne: false } }).select('name type currency').lean()
    ]);
    const notifications = await getBuyerPaymentNotificationSummaries(proofs.map(proof => idOf(proof)));
    return { proofs: proofs.map(proof => ({ ...proofDto(proof, transactions), targetLabel: targetLabel(proof, sale, targets),
        emailNotification: notifications.get(idOf(proof)) || { status: 'not_needed', retryable: false } })), targets,
        accounts: accounts.map(account => ({ id: idOf(account), name: account.name, currency: account.currency, type: account.type })),
        eligibleTransactions: transactions.filter(active).map(tx => ({ id: idOf(tx), amount: tx.amount, currency: tx.currency, date: tx.date,
            canLinkGestoria: legacyProcedureCollection(tx),
            concept: tx.concept || tx.description, paymentDestination: tx.paymentDestination || (tx.installmentId ? 'installment' : legacyProcedureCollection(tx) ? 'gestoria' : isDepositCollection(tx, sale) ? 'deposit' : 'purchase'),
            targetId: idOf(tx.installmentId || tx.gestoriaId || tx.reservationId || sale._id) })) };
}

export async function reviewPaymentProof(user, id, input) {
    financialAccess(user, true);
    if (!validId(id) || !['confirm', 'link', 'correction'].includes(input.action)) fail('Seleccioná una acción válida para el comprobante.');
    await createBuyerPaymentIndexes();
    const session = await mongoose.startSession(); let proof, duplicate = false, createdId;
    try {
        await session.withTransaction(async () => {
            proof = await BuyerPaymentProof.findById(id).session(session);
            if (!proof) fail('Comprobante no encontrado.', 404);
            const sale = await adminSale(user, idOf(proof.saleId), true, session);
            if (!sameBinding(proof, sale) || sale.status === 'cancelada') fail('El comprador o el vehículo de la operación cambió.', 409);
            // Both confirmation and linking lock the proof and operation before
            // examining balances; concurrent confirmation/correction retries serialize.
            await Sale.updateOne({ _id: sale._id }, { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
            if (['confirmed', 'linked'].includes(proof.status)) {
                if (input.action === 'correction' || input.action === 'link' && idOf(proof.transactionId) !== idOf(input.transactionId)) fail('El comprobante ya está vinculado a un cobro. Revisalo desde Finanzas.', 409);
                duplicate = true; return;
            }
            if (proof.status === 'superseded') fail('Este comprobante tiene una versión más nueva.', 409);
            if (input.action === 'correction') {
                const comment = clean(input.comment, 1000);
                if (comment.length < 3) fail('Explicá qué debe corregir el cliente.');
                if (proof.status === 'correction_requested' && proof.comment === comment) { duplicate = true; return; }
                proof.status = 'correction_requested'; proof.comment = comment;
            } else if (input.action === 'link') {
                if (!validId(input.transactionId)) fail('Seleccioná el cobro ya registrado.');
                const tx = await Transaction.findById(input.transactionId).session(session);
                if (!tx || !matchesTransaction(proof, tx, sale)) fail('El cobro no coincide con la operación, destino, importe o moneda del comprobante.', 409);
                // A write to the existing movement serializes this link against
                // annulment; its balance and installment effects are reused intact.
                const linked = await Transaction.updateOne({ _id: tx._id, status: tx.status }, { $set: { updatedBy: actor(user),
                    ...(proof.targetType === 'gestoria' && legacyProcedureCollection(tx) ? { paymentDestination: 'gestoria', gestoriaId: proof.targetId } : {}) },
                    $push: { transactionAuditLog: { action: 'COMPROBANTE_VINCULADO', details: 'Se vinculó un comprobante sin generar otro ingreso.', user: actor(user), source: 'CRM_V2' } } }, { session });
                if (!linked.matchedCount) fail('El cobro cambió. Volvé a cargar los movimientos.', 409);
                proof.status = 'linked'; proof.transactionId = tx._id; proof.comment = '';
            } else {
                const { targets } = await targetsForSale(sale, session), target = targetFor(proof, sale, targets);
                if (!target || target.currency !== proof.currency || proof.amount > (target.recordableAmount ?? target.pendingAmount)) fail('El importe o la moneda no coincide con el saldo pendiente del destino. Si ya se cobró, vinculá el movimiento existente.', 409);
                const result = await recordCrmCollection(user, {
                    amount: proof.amount, currency: proof.currency, date: proof.paymentDate, concept: proof.targetType === 'installment' ? 'Cobro de Cuota' : proof.targetType === 'deposit' ? 'Seña de operación' : proof.targetType === 'gestoria' ? 'Cobro de gestoría' : 'Cobro venta',
                    category: proof.targetType === 'gestoria' ? 'Gestoría' : proof.targetType === 'installment' ? 'Cobranzas' : 'Cobro venta',
                    paymentMethod: input.paymentMethod || 'transferencia', accountId: input.accountId, saleId: sale._id, clientId: sale.clientId, vehicleId: sale.vehicleId,
                    reservationId: proof.targetType === 'deposit' ? sale.reservationId : undefined,
                    installmentId: proof.targetType === 'installment' ? proof.targetId : undefined, gestoriaId: proof.targetType === 'gestoria' ? proof.targetId : undefined,
                    paymentDestination: proof.targetType, notes: proof.concept, idempotencyKey: 'buyer-proof:' + id
                }, { session, transactionId: proof._id, proofId: proof._id, requireAccount: true, strictDestination: true });
                proof.status = 'confirmed'; proof.transactionId = result.transaction._id; proof.comment = ''; createdId = result.transaction._id;
            }
            proof.history.push({ status: proof.status, comment: proof.comment || '', at: new Date(), by: actor(user) });
            await proof.save({ session });
        });
    } finally { await session.endSession(); }
    let treasuryIntegration = null;
    if (createdId) treasuryIntegration = await syncRecordedCollection(createdId, user);
    return { proof: proofDto(proof), duplicate, treasuryIntegration };
}

async function authorizedProof(id, context, adminUser) {
    if (!validId(id)) fail('Archivo no encontrado.', 404);
    const proof = await BuyerPaymentProof.findById(id).lean();
    if (!proof) fail('Archivo no encontrado.', 404);
    const sale = adminUser ? await adminSale(adminUser, idOf(proof.saleId)) : context?.sale;
    if (!sale || !sameBinding(proof, sale) || sale.status === 'cancelada' || !adminUser && proof.status === 'superseded') fail('Archivo no disponible.', 404);
    return proof;
}
export async function paymentProofAccess(id, context, adminUser, download = false) {
    const proof = await authorizedProof(id, context, adminUser);
    return issuePortalFileAccess({ id, kind: 'payment', revision: proof.version, saleId: idOf(proof.saleId), context, adminUser, download });
}
export async function readPaymentProofFile(id, access) {
    const verified = await verifyPortalFileAccess(id, access, 'payment');
    const proof = await authorizedProof(id, verified.context, verified.user);
    if (idOf(verified.claims.saleId) !== idOf(proof.saleId) || Number(verified.claims.revision) !== proof.version) fail('El acceso al archivo venció.', 404);
    const stored = await BuyerPaymentProof.findById(id).select('+encryptedFile').lean();
    return { buffer: decryptPortalFile(stored.encryptedFile, 'payment', id), mimeType: proof.mimeType, fileName: proof.fileName, download: verified.download };
}
