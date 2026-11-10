import Account from '../models/Account.js';
import Installment from '../models/Installment.js';
import Transaction from '../models/Transaction.js';
import Sale from '../models/Sale.js';
import { buildCashProjection, OPEN_INSTALLMENT_STATUSES } from '../utils/cashProjection.js';

// Servicio exclusivamente de lectura. Los saldos son los registrados en Account;
// no se recalculatean ni se generan movimientos para construir una previsión.
export async function getCashProjection({ asOf = new Date() } = {}) {
    const [accounts, transactions] = await Promise.all([
        Account.find({ isActive: { $ne: false } }).select('currency balance isActive').lean(),
        Transaction.find({ status: 'pendiente' })
            .select('type amount currency status dueDate saleId installmentId concept description').lean()
    ]);
    const linkedInstallmentIds = transactions.filter((item) => item.installmentId).map((item) => item.installmentId);
    const installments = await Installment.find({
        $or: [{ status: { $in: OPEN_INSTALLMENT_STATUSES } }, { _id: { $in: linkedInstallmentIds } }]
    }).select('amount paidAmount currency status dueDate originalDueDate isRescheduled rescheduledDate saleId source installmentNumber concept').lean();
    const saleIds = [...installments, ...transactions].filter((item) => item.saleId).map((item) => item.saleId);
    const sales = saleIds.length ? await Sale.find({ _id: { $in: saleIds } }).select('status historicalOnly').lean() : [];
    return buildCashProjection({ accounts, installments, transactions, sales, asOf });
}
