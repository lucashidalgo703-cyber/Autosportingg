import TreasuryBox from '../models/TreasuryBox.js';
import { syncExpenseWithTreasury } from './treasuryStrategicService.js';

const failure = message => Object.assign(new Error(message), { status: 409, code: 'EXPENSE_TREASURY_REVIEW_REQUIRED' });

// Record the actual strategic-box effect, including a partial/zero funded
// expense. Refunding its nominal amount would otherwise invent virtual funds.
export async function applyLinkedExpenseTreasury(tx, { session, user, debitCap } = {}) {
    if (!session?.inTransaction()) throw new Error('Linked expense treasury effects require a transaction');
    tx.isTreasuryExpenseSynced = false;
    const targetStatus = tx.status;
    tx.status = 'anulado';
    try {
        // Resolve the existing category rules/default boxes without moving funds.
        await syncExpenseWithTreasury(tx, { isNew: true, reapplyLinkedExpense: true, session, user });
    } finally { tx.status = targetStatus; }
    const before = tx.treasuryBoxKey ? await TreasuryBox.findOne({ key: tx.treasuryBoxKey }).session(session).lean() : null;
    await syncExpenseWithTreasury(tx, { isNew: true, reapplyLinkedExpense: true, linkedExpenseDebitCap: debitCap, session, user });
    const after = before ? await TreasuryBox.findById(before._id).session(session).lean() : null;
    const currency = tx.currency;
    const debitApplied = before && after ? Number(before[`balance${currency}`] || 0) - Number(after[`balance${currency}`] || 0) : 0;
    const pendingApplied = before && after ? Number(after[`pendingCommitments${currency}`] || 0) - Number(before[`pendingCommitments${currency}`] || 0) : 0;
    if (debitApplied < 0 || pendingApplied < 0) throw failure('La caja estratégica tiene un saldo inconsistente. Revisala antes de modificar el gasto.');
    tx.linkedExpenseTreasuryEffect = { boxKey: before?.key || null, currency, debitApplied, pendingApplied, recorded: true };
}

export async function reverseLinkedExpenseTreasury(tx, { session, user } = {}) {
    if (!session?.inTransaction()) throw new Error('Linked expense treasury reversal requires a transaction');
    const effect = tx.linkedExpenseTreasuryEffect;
    if (!effect?.recorded) throw failure('Este gasto no tiene trazabilidad completa de Tesorería. Pedí su revisión antes de corregirlo o anularlo.');
    if (effect.boxKey && (effect.debitApplied || effect.pendingApplied)) {
        const box = await TreasuryBox.findOne({ key: effect.boxKey }).session(session);
        if (!box) throw failure('No se encontró la caja estratégica del gasto. Pedí su revisión.');
        const balance = `balance${effect.currency}`;
        const pending = `pendingCommitments${effect.currency}`;
        box[balance] = Number(box[balance] || 0) + effect.debitApplied;
        if (Number(box[pending] || 0) + 0.00001 < effect.pendingApplied) throw failure('El compromiso de Tesorería ya no coincide con el gasto. Pedí su revisión.');
        box[pending] = Math.max(0, Number(box[pending] || 0) - effect.pendingApplied);
        box.history.push({ type: 'reversion_egreso', amount: effect.debitApplied, currency: effect.currency,
            reason: `Reversión del efecto real del gasto #${tx._id}`, sourceExpenseId: tx._id, user: user || 'Sistema' });
        await box.save({ session });
    }
    tx.isTreasuryExpenseSynced = false;
    tx.linkedExpenseTreasuryEffect = { boxKey: null, currency: tx.currency, debitApplied: 0, pendingApplied: 0, recorded: true };
}
