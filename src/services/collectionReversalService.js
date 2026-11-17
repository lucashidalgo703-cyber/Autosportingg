import mongoose from 'mongoose';
import CollectionRecordingOperation from '../models/CollectionRecordingOperation.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Installment from '../models/Installment.js';
import Gestoria from '../models/Gestoria.js';
import Sale from '../models/Sale.js';
import { roundMoney } from '../utils/saleCommercial.js';

// Reverse the same atomic effects as collectionRecordingService. Older movements
// retain their existing reversal circuit. Treasury allocations are handled by it.
export async function reverseRecordedCollection(id, user = 'Sistema') {
    if (!await CollectionRecordingOperation.exists({ transactionId: id })) return null;
    const session = await mongoose.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const operation = await CollectionRecordingOperation.findOne({ transactionId: id }).session(session);
            const tx = await Transaction.findById(id).session(session);
            if (!tx) throw Object.assign(new Error('Cobro no encontrado.'), { status: 404 });
            if (tx.status === 'anulado') { result = { transaction: tx, alreadyAnnulled: true }; return; }
            if (['running', 'uncertain'].includes(operation.treasuryState)) {
                throw Object.assign(new Error('Revisá primero la distribución pendiente de este cobro en Tesorería.'), { status: 409 });
            }
            operation.treasuryState = 'reversed';
            await operation.save({ session });
            if (tx.saleId) await Sale.updateOne({ _id: tx.saleId }, { $inc: { buyerPortalUploadSequence: 1 } }, { session, timestamps: false });
            if (tx.status === 'activo') {
                await Account.updateOne({ _id: tx.accountId }, { $inc: { balance: -tx.amount } }, { session });
                if (tx.installmentId && tx.installmentPaidAmountApplied > 0) {
                    const installment = await Installment.findById(tx.installmentId).session(session);
                    if (installment) {
                        installment.paidAmount = roundMoney(Math.max(0, Number(installment.paidAmount || 0) - tx.installmentPaidAmountApplied));
                        installment.status = installment.paidAmount <= 0 ? 'pendiente' : installment.paidAmount < installment.amount ? 'parcial' : 'pagada';
                        installment.installmentAuditLog.push({ action: 'COBRO_REGISTRADO', details: `Reversión del cobro ${tx._id}.`, user });
                        await installment.save({ session });
                    }
                }
                if (tx.gestoriaId && tx.gestoriaPaidAmountApplied > 0) {
                    const procedure = await Gestoria.findById(tx.gestoriaId).session(session);
                    if (procedure) {
                        procedure.chargedAmount = roundMoney(Math.max(0, Number(procedure.chargedAmount || 0) - tx.gestoriaPaidAmountApplied));
                        procedure.collectionRevision = Number(procedure.collectionRevision || 0) + 1;
                        procedure.auditLog.push({ action: 'COBRO_ANULADO', details: `Reversión del cobro ${tx._id}.`, user });
                        await procedure.save({ session });
                    }
                }
            }
            tx.status = 'anulado';
            tx.transactionAuditLog.push({ action: 'ANULACION_COBRO_INTEGRAL', details: 'Cobro anulado junto con cuenta e imputación al destino.', user, source: 'CRM_V2' });
            await tx.save({ session });
            result = { transaction: tx, alreadyAnnulled: false };
        });
    } finally { await session.endSession(); }
    return result;
}
