import Account from '../models/Account.js';
import Installment from '../models/Installment.js';
import Transaction from '../models/Transaction.js';
import Sale from '../models/Sale.js';
import FinancePayableInstallment from '../models/FinancePayableInstallment.js';
import FinanceManualEntry from '../models/FinanceManualEntry.js';
import Car from '../models/Car.js';
import { buildCashProjection, OPEN_INSTALLMENT_STATUSES } from '../utils/cashProjection.js';

// Servicio exclusivamente de lectura. Los saldos son los registrados en Account;
// no se recalculatean ni se generan movimientos para construir una previsión.
export async function getCashProjection({ asOf = new Date(), session = null } = {}) {
    const queries = [
        Account.find({ isActive: { $ne: false } }).select('currency balance isActive').lean(),
        Transaction.find({ status: 'pendiente',financePayableInstallmentId:null,financeManualEntryId:null })
            .select('type amount currency status dueDate saleId installmentId concept description').lean(),
        FinancePayableInstallment.find({$expr:{$gt:['$amount',{$ifNull:['$paidAmount',0]}]}}).populate('planId','creditorName concept').lean(),
        FinanceManualEntry.find({kind:'payable',status:{$in:['Pendiente','Disponible']},transactionId:null}).select('label amount currency dueDate').lean(),
        Car.find({'purchasePaymentState.status':{$in:['pendiente','parcial']},'purchasePaymentState.pendingDebt':{$gt:0}}).select('brand name purchasePaymentState.pendingDebt purchasePaymentState.currency purchasePaymentState.expectedDate').lean()
    ];
    const rows=[];if(session){for(const query of queries)rows.push(await query.session(session));}else rows.push(...await Promise.all(queries));
    const [accounts, transactions, payableInstallments, manualPayables, purchaseCommitments] = rows;
    const linkedInstallmentIds = transactions.filter((item) => item.installmentId).map((item) => item.installmentId);
    const installments = await Installment.find({
        $or: [{ status: { $in: OPEN_INSTALLMENT_STATUSES } }, { _id: { $in: linkedInstallmentIds } }]
    }).select('amount paidAmount currency status dueDate originalDueDate isRescheduled rescheduledDate saleId source installmentNumber concept').session(session).lean();
    const saleIds = [...installments, ...transactions].filter((item) => item.saleId).map((item) => item.saleId);
    const sales = saleIds.length ? await Sale.find({ _id: { $in: saleIds } }).select('status historicalOnly').session(session).lean() : [];
    const obligations=[...payableInstallments.map(item=>({_id:'payable:'+item._id,type:'Egreso',status:'pendiente',amount:Math.max(0,Number(item.amount)-Number(item.paidAmount||0)),currency:item.currency,dueDate:item.dueDate,concept:'Cuota a pagar '+item.number+' · '+(item.planId?.creditorName||item.planId?.concept||'Acreedor')})),...manualPayables.map(item=>({_id:'manual-payable:'+item._id,type:'Egreso',status:'pendiente',amount:item.amount,currency:item.currency,dueDate:item.dueDate||null,concept:'Pago disponible · '+item.label}))];
    // El saldo de Stock ya representa el compromiso de la agencia. No volver a
    // multiplicarlo por participación ni excluirlo porque la unidad se vendió.
    const purchases=purchaseCommitments.map(car=>({_id:'purchase:'+car._id,type:'Egreso',status:'pendiente',amount:car.purchasePaymentState.pendingDebt,currency:car.purchasePaymentState.currency,dueDate:car.purchasePaymentState.expectedDate||null,concept:'Compromiso de compra · '+[car.brand,car.name].filter(Boolean).join(' ')}));
    return buildCashProjection({ accounts, installments, transactions:[...transactions,...obligations,...purchases], sales, asOf });
}
