import Car from '../models/Car.js';
import Account from '../models/Account.js';
import Installment from '../models/Installment.js';
import Transaction from '../models/Transaction.js';
import Sale from '../models/Sale.js';
import Loan from '../models/Loan.js';
import FinanceManualEntry from '../models/FinanceManualEntry.js';
import FinancePayableInstallment from '../models/FinancePayableInstallment.js';
import {buildCapitalSummary} from '../utils/capitalSummary.js';
export async function getCapitalSummary({session=null,now=new Date()}={}){
 const queries=[
  Car.find({}).lean(),Account.find({isActive:{$ne:false}}).select('name type currency balance isActive').lean(),
  Installment.find({status:{$in:['pendiente','vencida','parcial','reprogramada']}}).lean(),
  Transaction.find({type:'Egreso',status:'pendiente'}).select('type status amount currency concept description dueDate notes financeManualEntryId financePayableInstallmentId').lean(),
  Loan.find({status:'pendiente'}).lean(),FinanceManualEntry.find({kind:'payable',status:{$in:['Pendiente','Disponible']}}).lean(),FinancePayableInstallment.find({}).lean()
 ];
 // A reporting archive uses one transaction snapshot; Mongo sessions must not
 // execute parallel operations inside a transaction.
 const rows=[];if(session){for(const query of queries)rows.push(await query.session(session));}else rows.push(...await Promise.all(queries));
 const [cars,accounts,installments,transactions,loans,manualEntries,payableInstallments]=rows;
 const saleIds=[...new Set(installments.map(item=>item.saleId).filter(Boolean).map(String))];
 const sales=saleIds.length?await Sale.find({_id:{$in:saleIds}}).select('vehicleId status historicalOnly').session(session).lean():[];
 return buildCapitalSummary({cars,accounts,installments,transactions,sales,loans,manualEntries,payableInstallments,now});
}
