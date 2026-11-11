import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFinanceOverview,validateFinanceTransfer} from '../src/utils/financeWorkbench.js';
import {newFinanceDocument,financeDocumentBalance,validateFinanceDocument,createFinanceDocumentPdf} from '../src/utils/financeDocuments.js';
test('registered account balances remain independent of pending transactions and external activity excludes internal transfers',()=>{
 const result=buildFinanceOverview({accounts:[{_id:'a',balance:400,currency:'ARS'},{_id:'b',balance:20,currency:'USD'},{_id:'c',balance:50,currency:'USD',isActive:false}],transactions:[{type:'Ingreso',amount:100,currency:'ARS',date:'2026-11-01',status:'activo'},{type:'Egreso',amount:30,currency:'ARS',date:'2026-11-02',status:'activo'},{type:'Ingreso',amount:900,currency:'ARS',status:'pendiente'},{type:'Ingreso',amount:200,currency:'ARS',status:'anulado'},{type:'Egreso',amount:500,currency:'ARS',category:'Transferencia Interna',date:'2026-11-03',status:'activo'}],asOf:new Date('2026-11-10T12:00:00Z')});
 assert.deepEqual(result.balances,{ARS:400,USD:20});assert.deepEqual(result.activity.ARS,{income:100,expense:30,net:70});assert.equal(result.chart.ARS.current.expense,30);
});
test('missing sources are unknown and chart currency/category/month are real, with invalid data identified',()=>{
 const missing=buildFinanceOverview();assert.equal(missing.balances,null);assert.equal(missing.activity,null);
 const result=buildFinanceOverview({accounts:[{currency:'ARS',balance:'bad'}],transactions:[{type:'Egreso',amount:10,currency:'USD',category:'Servicios',date:'2026-11-01'},{type:'Egreso',amount:20,currency:'ARS',category:'Taller',date:'2026-11-01'},{type:'Egreso',amount:100,currency:'USD',category:'Anterior',date:'2026-10-01'},{type:'Ingreso',amount:99,currency:'EUR',date:'2026-11-01'}],asOf:new Date('2026-11-10T12:00:00Z')});
 assert.equal(result.balances.ARS,null);assert.equal(result.issues.length,2);assert.deepEqual(result.chart.USD.categories,[{category:'Servicios',amount:10}]);assert.equal(result.chart.ARS.current.expense,20);
});
test('transfers reject NaN, nonpositive FX, inactive/wrong/same accounts and preserve explicit destination value',()=>{
 const accounts=[{_id:'a',currency:'ARS'},{_id:'b',currency:'USD'},{_id:'c',currency:'ARS',isActive:false}];
 assert.ok(validateFinanceTransfer({sourceAccountId:'a',destAccountId:'a',amount:10},accounts).errors.destAccountId);
 assert.ok(validateFinanceTransfer({sourceAccountId:'a',destAccountId:'c',amount:10},accounts).errors.destAccountId);
 for(const rate of [0,-1,Infinity,'bad'])assert.ok(validateFinanceTransfer({sourceAccountId:'a',destAccountId:'b',amount:10,exchangeRate:rate,destAmount:1},accounts).errors.exchangeRate);
 const valid=validateFinanceTransfer({sourceAccountId:'b',destAccountId:'a',amount:10,exchangeRate:1200,destAmount:11999},accounts);assert.deepEqual(valid.errors,{});assert.equal(valid.values.destAmount,11999);assert.equal(valid.values.currency,'USD');
});
test('PDF trade-in balance never invents FX and financing validation also applies to the balance',()=>{
 const values=newFinanceDocument({amount:10000,currency:'USD',paymentMethod:'Permuta',tradeIns:[{value:2000,currency:'USD'}]});assert.equal(financeDocumentBalance(values).balance,8000);
 values.tradeIns.push({value:100,currency:'ARS'});assert.equal(financeDocumentBalance(values).balance,null);assert.equal(financeDocumentBalance(values).foreign,true);
 values.balancePaymentMethod='Financiado';values.financing.installments=-1;assert.ok(validateFinanceDocument(values,'boleto').errors.financing);
});
test('receipt and sale agreement create actual downloadable PDF bytes without any persistence dependencies',async()=>{
 for(const kind of ['recibo','boleto']){const pdf=await createFinanceDocumentPdf(newFinanceDocument({date:'2026-11-10',amount:1500,currency:'ARS',buyer:{name:'Persona de prueba'},issuer:{name:'AutoSporting'}}),kind);assert.match(pdf.output(),/^%PDF-/);assert.ok(pdf.getNumberOfPages()>=1);assert.ok(pdf.output().includes('AutoSporting'));}
});
import {payablePlanSchedule,payableInstallmentState} from '../src/utils/financePayablePlans.js';
test('payable calendar anchors month-end dates, supports weekly/fortnightly and validates customized rows without FX',()=>{
 const base={creditorName:'QA',debtType:'compra_gasto',amount:100,currency:'USD',count:3,firstDueDate:'2026-01-31',frequency:'mensual'};
 assert.deepEqual(payablePlanSchedule(base).schedule.map(item=>item.dueDate),['2026-01-31','2026-02-28','2026-03-31']);assert.deepEqual(payablePlanSchedule({...base,frequency:'quincenal'}).schedule.map(item=>item.dueDate),['2026-01-31','2026-02-15','2026-03-02']);
 assert.ok(payablePlanSchedule({...base,customSchedule:[{dueDate:'2026-02-30',amount:100}]}).errors.customSchedule);assert.ok(payablePlanSchedule({...base,count:121}).errors.count);
 assert.deepEqual(payableInstallmentState({amount:100,paidAmount:40,dueDate:'2026-11-09'},new Date('2026-11-10T12:00:00Z')),{pending:60,status:'vencida',days:-1});
});
import {financeAreaProfitability} from '../src/utils/financeAreaProfitability.js';
test('Finance/Gestoria profitability excludes sales, internal transfers and acquisition debt without mixing currencies',()=>{
 const rows=[{category:'Servicios',type:'Ingreso',amount:100,currency:'USD',status:'activo'},{category:'Multas',type:'Egreso',amount:25,currency:'USD',status:'activo'},{category:'Honorarios',type:'Ingreso',amount:500,currency:'ARS',status:'activo'},{category:'Venta',type:'Ingreso',amount:10000,currency:'USD',status:'activo'},{category:'Transferencia Interna',type:'Ingreso',amount:2000,currency:'USD',status:'activo'},{category:'Cuotas a pagar',type:'Egreso',amount:99,currency:'USD',status:'activo'},{category:'Servicios',type:'Ingreso',amount:99,currency:'USD',status:'pendiente'}];
 const result=financeAreaProfitability(rows);assert.deepEqual(result.neto,{ARS:500,USD:75});assert.deepEqual(result.totalsUSD,{ingresos:100,egresos:25});assert.equal(result.excludedCount,4);
});
import {financeCalendarKey} from '../src/utils/financeWorkbench.js';
test('finance dates preserve date-only midnight-UTC records and use Argentina for actual instants',()=>{
 assert.equal(financeCalendarKey('2026-11-01'),'2026-11-01');assert.equal(financeCalendarKey('2026-11-01T00:00:00.000Z'),'2026-11-01');assert.equal(financeCalendarKey('2026-11-01T01:30:00.000Z'),'2026-10-31');assert.equal(financeCalendarKey('2026-02-30'),null);
});
