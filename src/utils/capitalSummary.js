import {stockCapitalOwnership} from './stockOwnership.js';
import {getVehicleFinancialDisplay,vehicleDisplayCurrency} from './vehicleFinancialDisplay.js';
import {roundMoney} from './saleCommercial.js';
import {clientContactCalendarKey,clientTodayKey} from './clientCommercial.js';
const id=value=>String(value?._id||value||'');
const number=value=>value!==''&&value!=null&&Number.isFinite(Number(value))?Number(value):null;
const activeSale=sale=>sale&&!['borrador','cancelada'].includes(sale.status)&&sale.historicalOnly!==true;
export function buildCapitalSummary({cars=[],accounts=[],installments=[],transactions=[],sales=[],loans=[],manualEntries=[],payableInstallments=[],now=new Date()}={}){
 const issues=[],carMap=new Map(cars.map(car=>[id(car._id),car])),saleMap=new Map(sales.map(sale=>[id(sale._id),sale]));
 const stock=cars.filter(car=>!['vendido','cancelado','anulado'].includes(String(car.status||'').toLowerCase())&&!car.sold);
 const today=clientTodayKey(now),byCurrency={};
 for(const currency of ['ARS','USD']){
  const audited=[],cash=[],portfolio=[],credits=[],debts=[];
  let ownCost=0,investorCost=0,ownPublished=0,investorPublished=0,consignedPublished=0,missingCosts=0,consignedCount=0;
  for(const car of stock){
   const ownership=stockCapitalOwnership(car),financial=getVehicleFinancialDisplay(car),purchase=financial.purchase;
   const listedCurrency=vehicleDisplayCurrency(car.currency),price=number(car.price),hasCost=purchase.hasCost&&purchase.currency;
   const expenses=financial.expenses[currency],purchaseAmount=hasCost&&purchase.currency===currency?purchase.amount:0;
   const cost=roundMoney(purchaseAmount+expenses),listed=listedCurrency===currency&&price!==null&&price>=0?price:0;
   const own=roundMoney(cost*ownership.ownPct/100),inv=roundMoney(cost*ownership.invPct/100),ownPrice=roundMoney(listed*ownership.ownPct/100),invPrice=roundMoney(listed*ownership.invPct/100);
   const excluded=ownership.isConsignment||ownership.isThirdParty;
   if(!hasCost&&!excluded)missingCosts++;
   if(excluded){consignedCount++;consignedPublished+=listed;}else{ownCost+=own;investorCost+=inv;ownPublished+=ownPrice;investorPublished+=invPrice;}
   if(listedCurrency===currency||purchase.currency===currency||expenses||!hasCost){audited.push({id:id(car._id),brand:car.brand||'',name:car.name||'',model:car.name||'',year:car.year,plate:car.plateOrVin||'S/D',status:car.status,currency,purchaseCurrency:currency,originalPurchaseCurrency:purchase.currency,originalSaleCurrency:listedCurrency,...ownership,purchasePrice:purchaseAmount,expenses,costoBase:cost,costoPropio:excluded?0:own,costoInv:excluded?0:inv,price:listed,precioPropio:excluded?0:ownPrice,precioInv:excluded?listed:invPrice,hasMissingCost:!hasCost,hasMissingPrice:price===null||price<=0,investorName:car.investor?.name||car.ownerName||'',reason:excluded?'Unidad de terceros: excluida del capital propio.':!hasCost?'Falta costo o moneda de adquisición.':ownership.isShared?`Participación propia ${ownership.ownPct}%; inversor ${ownership.invPct}%.`:'Unidad propia; importes separados por moneda.'});}
   if(currency==='ARS'&&(!listedCurrency||!hasCost||financial.expenses.unknownCount||price===null||price<=0))issues.push({source:'stock',id:id(car._id),message:'Revisar precio, moneda, costo o gastos de la unidad.'});
   if(currency==='ARS'&&car.agencyOwned===true&&car.tradeInOrigin?.consigned===true)issues.push({source:'ownership',id:id(car._id),message:'La propiedad actual figura como propia y el origen fue consignado. Verificar la adquisición; se usa la propiedad actual.'});
  }
  for(const account of accounts){if(account.isActive===false)continue;const code=vehicleDisplayCurrency(account.currency),balance=number(account.balance);if(!code||balance===null){if(currency==='ARS')issues.push({source:'account',id:id(account._id),message:'Cuenta con saldo o moneda desconocidos.'});continue;}if(code===currency)cash.push({id:id(account._id),name:account.name,type:account.type,currency,balance,notes:'Saldo registrado; no acredita conciliación bancaria ni propiedad exclusiva de los fondos.'});}
  for(const item of installments){
   if(!['pendiente','parcial','vencida','reprogramada'].includes(item.status))continue;
   const amount=number(item.amount),paid=number(item.paidAmount??0),sale=item.saleId?saleMap.get(id(item.saleId)):null;
   if(item.saleId&&!activeSale(sale)||!item.saleId&&item.source!=='manual')continue;
   const code=vehicleDisplayCurrency(item.currency);if(!code||amount===null||paid===null){if(currency==='ARS')issues.push({source:'installment',id:id(item._id),message:'Cuota con importe o moneda desconocidos.'});continue;}if(code!==currency)continue;
   const remaining=roundMoney(Math.max(0,amount-paid));if(!remaining)continue;
   const car=carMap.get(id(sale?.vehicleId||item.vehicleId)),ownership=car?stockCapitalOwnership(car):{ownPct:100,invPct:0};
   const ownRemaining=roundMoney(remaining*ownership.ownPct/100),dueDate=item.isRescheduled&&item.rescheduledDate?item.rescheduledDate:item.dueDate;
   const dueKey=clientContactCalendarKey(dueDate);
   portfolio.push({id:id(item._id),saleId:id(item.saleId)||null,installmentNumber:item.installmentNumber,vehicleTitle:car?`${car.brand} ${car.name} (${car.year})`:item.customerName||item.concept||'Cuota manual',dueDate,isOverdue:Boolean(dueKey&&dueKey<today),status:item.status,amount,paidAmount:paid,remaining,ownPct:ownership.ownPct,ownRemaining,invRemaining:roundMoney(remaining-ownRemaining),currency,notes:item.notes||''});
  }
  for(const loan of loans){if(loan.status!=='pendiente'||vehicleDisplayCurrency(loan.currency)!==currency)continue;const amount=number(loan.amount);if(amount!==null&&amount>=0)credits.push({id:id(loan._id),concept:loan.personName,amount,currency,dueDate:loan.expectedReturnDate,notes:loan.reason||'',source:'loan'});}
  for(const tx of transactions){if(tx.status!=='pendiente'||String(tx.type).toLowerCase()!=='egreso'||tx.financeManualEntryId||tx.financePayableInstallmentId||vehicleDisplayCurrency(tx.currency)!==currency)continue;const amount=number(tx.amount);if(amount!==null&&amount>=0)debts.push({id:id(tx._id),concept:tx.concept||tx.description,amount,currency,dueDate:tx.dueDate,notes:tx.notes,source:'transaction'});}
  for(const entry of manualEntries){if(entry.kind!=='payable'||!['Pendiente','Disponible'].includes(entry.status)||entry.transactionId||vehicleDisplayCurrency(entry.currency)!==currency)continue;const amount=number(entry.amount);if(amount!==null&&amount>0)debts.push({id:id(entry._id),concept:entry.label,amount,currency,notes:entry.notes,source:'manual_payable'});}
  for(const item of payableInstallments){if(vehicleDisplayCurrency(item.currency)!==currency)continue;const amount=number(item.amount),paid=number(item.paidAmount??0);if(amount===null||paid===null)continue;const remaining=roundMoney(Math.max(0,amount-paid));if(remaining)debts.push({id:id(item._id),concept:`Cuota a pagar ${item.number||''}`,amount:remaining,currency,dueDate:item.dueDate,source:'payable_installment'});}
  // A purchase commitment survives a later sale. pendingDebt already represents
  // the agency's residual contribution; do not apply the investor share again.
  for(const car of cars){const state=car.purchasePaymentState;if(!state||!['pendiente','parcial'].includes(state.status))continue;const amount=number(state.pendingDebt),code=vehicleDisplayCurrency(state.currency);if(amount===null||amount<0||!code){if(currency==='ARS')issues.push({source:'purchase_commitment',id:id(car._id),message:'Compromiso de compra con deuda o moneda a revisar.'});continue;}if(code===currency&&amount>0)debts.push({id:'purchase:'+id(car._id),vehicleId:id(car._id),concept:`Compra ${car.brand||''} ${car.name||''}`.trim(),amount:roundMoney(amount),currency,dueDate:state.expectedDate,notes:state.commitNotes||'',source:'purchase_commitment'});}
  const sum=(rows,key)=>roundMoney(rows.reduce((total,row)=>total+row[key],0)),cashTotal=sum(cash,'balance'),portfolioTotal=sum(portfolio,'ownRemaining'),creditTotal=sum(credits,'amount'),debtTotal=sum(debts,'amount');
  byCurrency[currency]={currency,cutoffDate:now,conciliacionStatus:'estimacion_registrada',conciliacionMessage:'Estimación por moneda con las fuentes registradas. No acredita conciliación bancaria ni fondos de terceros completamente identificados.',componentes:{stockPropioCosto:{label:'Stock propio a costo',signo:'+',monto:roundMoney(ownCost),subtotalInversionistas:roundMoney(investorCost),unidadesTotal:stock.filter(car=>stockCapitalOwnership(car).ownPct>0).length,unidadesSinCosto:missingCosts,items:audited.filter(row=>!row.isConsignment&&!row.isThirdParty),itemsConsignaciones:audited.filter(row=>row.isConsignment||row.isThirdParty)},efectivoPropio:{label:'Saldo registrado de cuentas',signo:'+',monto:cashTotal,items:cash},carteraPropia:{label:'Cartera propia pendiente',signo:'+',monto:portfolioTotal,montoTotalNominal:sum(portfolio,'remaining'),montoInversionistas:sum(portfolio,'invRemaining'),items:portfolio},otrosCreditos:{label:'Préstamos registrados por cobrar',signo:'+',monto:creditTotal,items:credits},deudasPropia:{label:'Obligaciones registradas por pagar',signo:'−',monto:debtTotal,items:debts}},totales:{capitalPropioCosto:roundMoney(ownCost+cashTotal+portfolioTotal+creditTotal-debtTotal),capitalPropioPublicado:roundMoney(ownPublished+cashTotal+portfolioTotal+creditTotal-debtTotal),margenComercialPotencial:roundMoney(ownPublished-ownCost),efectivoDisponible:cashTotal,stockPropioPublicado:roundMoney(ownPublished),stockInversionistasPublicado:roundMoney(investorPublished),valorStockTotalPublicado:roundMoney(ownPublished+investorPublished),consignacionesTotalPublicado:roundMoney(consignedPublished),consignacionesCount:consignedCount},auditoriaIndicadores:{totalStockActivo:stock.length,consignaciones:consignedCount,compartidos:stock.filter(car=>stockCapitalOwnership(car).isShared).length}};
 }
 return {...byCurrency.ARS,byCurrency,issues,currenciesNotConverted:true};
}
