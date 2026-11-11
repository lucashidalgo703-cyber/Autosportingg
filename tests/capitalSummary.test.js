import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCapitalSummary} from '../src/utils/capitalSummary.js';
import {getCarPurchasePaymentSummary} from '../src/utils/carPurchasePayment.js';
const car={_id:'car',brand:'QA',name:'Unidad',year:2022,status:'Disponible',agencyOwned:true,price:20000,currency:'USD',purchasePrice:10000,purchaseCurrency:'USD'};
test('capital keeps stock cost, expenses and advertised values in their real currencies without inferred FX',()=>{
 const result=buildCapitalSummary({cars:[{...car,price:300000,expenses:[{amount:200,currency:'USD'},{amount:50000,currency:'ARS'}]}]});
 assert.equal(result.byCurrency.USD.componentes.stockPropioCosto.monto,10200);assert.equal(result.componentes.stockPropioCosto.monto,50000);
 assert.equal(result.byCurrency.USD.totales.stockPropioPublicado,300000);assert.equal(result.totales.stockPropioPublicado,0);assert.equal(result.currenciesNotConverted,true);assert.notEqual(result.conciliacionStatus,'completa');
});
test('investor ownership precedes owner contact metadata; explicit consignment and third-party units are excluded',()=>{
 const result=buildCapitalSummary({cars:[{...car,agencyOwned:false,ownerName:'QA previous owner',investor:{name:'QA investor',percentage:25}},{...car,_id:'consigned',agencyOwned:false,tradeInOrigin:{saleId:'sale',consigned:true,agencyOwned:false},investor:{percentage:30}},{...car,_id:'third-party',agencyOwned:false}]});
 assert.equal(result.byCurrency.USD.componentes.stockPropioCosto.monto,7500);assert.equal(result.byCurrency.USD.componentes.stockPropioCosto.subtotalInversionistas,2500);assert.equal(result.byCurrency.USD.totales.consignacionesTotalPublicado,40000);
});
test('capital includes partial/rescheduled receivables, registered loans and net payable balances exactly once',()=>{
 const result=buildCapitalSummary({cars:[car],sales:[{_id:'sale',vehicleId:'car',status:'confirmada'}],accounts:[{_id:'usd',currency:'USD',balance:300},{_id:'disabled',currency:'USD',balance:999,isActive:false},{_id:'ars',currency:'ARS',balance:150}],installments:[{_id:'quota',saleId:'sale',status:'parcial',amount:500,paidAmount:100,currency:'USD',dueDate:'2026-11-01'},{_id:'rescheduled',saleId:'sale',status:'reprogramada',amount:200,paidAmount:0,currency:'ARS',dueDate:'2026-10-01',isRescheduled:true,rescheduledDate:'2026-12-01'}],loans:[{_id:'loan',status:'pendiente',amount:80,currency:'USD'}],transactions:[{_id:'debt',type:'Egreso',status:'pendiente',amount:50,currency:'USD'},{_id:'duplicate',type:'Egreso',status:'pendiente',amount:100,currency:'USD',financePayableInstallmentId:'pay'}],manualEntries:[{_id:'manual',kind:'payable',status:'Pendiente',amount:20,currency:'USD'}],payableInstallments:[{_id:'pay',amount:100,paidAmount:30,currency:'USD'}],now:new Date('2026-11-10T15:00Z')});
 assert.equal(result.byCurrency.USD.componentes.carteraPropia.monto,400);assert.equal(result.byCurrency.USD.componentes.deudasPropia.monto,140);assert.equal(result.byCurrency.USD.totales.capitalPropioCosto,10640);assert.equal(result.componentes.carteraPropia.items[0].isOverdue,false);assert.equal(result.totales.capitalPropioCosto,350);
});
test('drafts, cancelled or historical operations and invalid currency cannot create current receivables or fake pesos',()=>{
 const sales=['borrador','cancelada','entregada'].map((status,index)=>({_id:String(index),status,historicalOnly:index===2}));
 const installments=sales.map(sale=>({_id:'i'+sale._id,saleId:sale._id,status:'pendiente',amount:100,paidAmount:0,currency:'USD'}));
 const result=buildCapitalSummary({sales,installments,cars:[{...car,currency:'EUR',purchaseCurrency:'EUR'}],accounts:[{_id:'unknown',currency:'EUR',balance:1000}]});
 assert.equal(result.byCurrency.USD.componentes.carteraPropia.monto,0);assert.equal(result.totales.stockPropioPublicado,0);assert.equal(result.totales.efectivoDisponible,0);assert.ok(result.issues.length>=2);
});
test('agency purchase debt remains payable after the unit was sold and does not apply the investor fraction twice',()=>{
 const result=buildCapitalSummary({cars:[{...car,status:'Vendido',investor:{percentage:50},purchasePaymentState:{status:'parcial',agencyCost:5000,amountPaid:2000,pendingDebt:3000,currency:'USD'}}]});
 assert.equal(result.byCurrency.USD.componentes.stockPropioCosto.monto,0);assert.equal(result.byCurrency.USD.componentes.deudasPropia.monto,3000);assert.equal(result.byCurrency.USD.totales.capitalPropioCosto,-3000);
});
test('a missing due date is unknown rather than overdue and current ownership stays separate from historical origin',()=>{
 const result=buildCapitalSummary({cars:[{...car,price:0,tradeInOrigin:{saleId:'sale',consigned:true,agencyOwned:false}}],installments:[{_id:'manual',source:'manual',status:'pendiente',amount:100,paidAmount:0,currency:'USD'}]});
 assert.equal(result.byCurrency.USD.componentes.carteraPropia.items[0].isOverdue,false);assert.equal(result.byCurrency.USD.componentes.stockPropioCosto.monto,10000);assert.ok(result.issues.some(issue=>issue.source==='ownership'));assert.ok(result.issues.some(issue=>issue.source==='stock'));
});
test('purchase payment display never relabels a large dollar cost as pesos',()=>{
 assert.equal(getCarPurchasePaymentSummary({...car,purchasePrice:300000,purchasePaymentState:{status:'pendiente',agencyCost:300000,pendingDebt:300000}}).currency,'USD');
});
