import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Account from '../../src/models/Account.js';
import Transaction from '../../src/models/Transaction.js';
import FinanceTransfer from '../../src/models/FinanceTransfer.js';
import FinanceDocument from '../../src/models/FinanceDocument.js';
import CashCount from '../../src/models/CashCount.js';
import AuditLog from '../../src/models/AuditLog.js';
import FinanceCloseSequence from '../../src/models/FinanceCloseSequence.js';
import DailyCashClose from '../../src/models/DailyCashClose.js';
import FinancePayablePlan from '../../src/models/FinancePayablePlan.js';
import FinancePayableInstallment from '../../src/models/FinancePayableInstallment.js';
import FinancePayableOperation from '../../src/models/FinancePayableOperation.js';
import FinanceManualEntry from '../../src/models/FinanceManualEntry.js';
import Installment from '../../src/models/Installment.js';
import Sale from '../../src/models/Sale.js';
import Car from '../../src/models/Car.js';
import {createFinanceDailyClose} from '../../src/services/financeDailyCloseService.js';
import {createFinancePayablePlan,payFinancePayableInstallment} from '../../src/services/financePayablePlanService.js';
import {getCashProjection} from '../../src/services/cashProjectionService.js';
import {transferFinanceFunds} from '../../src/services/financeTransferService.js';
import {uploadFinanceDocuments,readFinanceDocument,listFinanceDocuments,setFinanceDocumentDeleted,FINANCE_DOCUMENT_MAX_BYTES} from '../../src/services/financeDocumentService.js';
import {financeBookBalance,saveFinanceCashCount} from '../../src/services/financeCashCountService.js';
let replSet,source,destination;
const actor={id:String(new mongoose.Types.ObjectId()),username:'qa_finance',role:'owner'};
const collections=[Account,Transaction,FinanceTransfer,FinanceDocument,CashCount,AuditLog,FinanceCloseSequence,DailyCashClose,FinancePayablePlan,FinancePayableInstallment,FinancePayableOperation,FinanceManualEntry,Installment,Sale,Car];
before(async()=>{const {MongoMemoryReplSet}=await import('mongodb-memory-server');replSet=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{ip:'127.0.0.1',launchTimeout:180000}]});const uri=replSet.getUri('finance_integrity_'+crypto.randomBytes(6).toString('hex'));assert.match(uri,/127\.0\.0\.1/);mongoose.set('autoCreate',false);await mongoose.connect(uri);await Promise.all(collections.map(Model=>Model.createCollection()));},{timeout:300000});
beforeEach(async()=>{await Promise.all(collections.map(Model=>Model.deleteMany({})));source=await Account.create({name:'Caja QA USD',currency:'USD',balance:100});destination=await Account.create({name:'Banco QA ARS',currency:'ARS',balance:500});});
after(async()=>{await mongoose.disconnect();await replSet?.stop();});
const payload=()=>({sourceAccountId:String(source._id),destAccountId:String(destination._id),amount:10,currency:'USD',exchangeRate:1000,destAmount:10000,date:'2026-11-10'});
const transfer=(input,key)=>transferFinanceFunds(input,{actorId:actor.id,user:actor.username,idempotencyKey:key});
test('transfer changes both currency balances once, including concurrent identical retry; different payload key is rejected',async()=>{
 const key=crypto.randomUUID();await Promise.all([transfer(payload(),key),transfer(payload(),key)]);assert.equal((await Account.findById(source._id)).balance,90);assert.equal((await Account.findById(destination._id)).balance,10500);assert.equal(await Transaction.countDocuments(),2);assert.equal(await FinanceTransfer.countDocuments(),1);await assert.rejects(transfer({...payload(),amount:20},key),error=>error.status===409);
});
test('partial transfer failure rolls back both entries/balances and retry key remains usable',async t=>{
 const original=Account.updateOne.bind(Account),key=crypto.randomUUID();let calls=0;t.mock.method(Account,'updateOne',(...args)=>{if(++calls===2)throw Error('QA simulated second-account failure');return original(...args);});await assert.rejects(transfer(payload(),key),/QA simulated/);t.mock.restoreAll();assert.equal(await Transaction.countDocuments(),0);assert.equal(await FinanceTransfer.countDocuments(),0);assert.equal((await Account.findById(source._id)).balance,100);assert.equal((await Account.findById(destination._id)).balance,500);await transfer(payload(),key);assert.equal(await Transaction.countDocuments(),2);
});
test('invalid transfer never writes balances or entries',async()=>{
 for(const input of [{...payload(),amount:-1},{...payload(),exchangeRate:Infinity},{...payload(),currency:'ARS'},{...payload(),destAccountId:String(source._id)}])await assert.rejects(transfer(input,crypto.randomUUID()));
 await Account.updateOne({_id:destination._id},{$set:{isActive:false}});await assert.rejects(transfer(payload(),crypto.randomUUID()));assert.equal(await Transaction.countDocuments(),0);assert.equal((await Account.findById(source._id)).balance,100);
});
const transaction=()=>Transaction.create({type:'Ingreso',amount:10,currency:'USD',description:'QA',category:'Servicios',accountId:source._id,module:'crm_v2',date:'2026-11-10',status:'activo'});
const file=(buffer=Buffer.from('%PDF-1.7\nQA'))=>({originalname:'../comprobante.pdf',buffer,mimetype:'text/html'});
test('private proofs support 15 MiB, metadata hides bytes/hash and download returns exact bytes with audit, deletion remains recoverable',async()=>{
 const tx=await transaction(),id=String(tx._id),bytes=Buffer.alloc(FINANCE_DOCUMENT_MAX_BYTES,42);const result=await uploadFinanceDocuments(id,[file(bytes)],crypto.randomUUID(),actor),doc=result.documents[0];assert.equal(doc.size,bytes.length);assert.equal(doc.contentType,'application/octet-stream');assert.equal(doc.data,undefined);assert.equal(doc.sha256,undefined);assert.equal((await FinanceDocument.findById(doc._id).lean()).data,undefined);assert.deepEqual((await readFinanceDocument(id,doc._id,actor)).data,bytes);assert.ok(await AuditLog.exists({action:'FINANZAS_ARCHIVO_DESCARGA',userId:actor.id}));await setFinanceDocumentDeleted(id,doc._id,true,actor);await assert.rejects(readFinanceDocument(id,doc._id,actor));await setFinanceDocumentDeleted(id,doc._id,false,actor);assert.equal((await listFinanceDocuments(id)).activeCount,1);await assert.rejects(uploadFinanceDocuments(id,[file(Buffer.alloc(FINANCE_DOCUMENT_MAX_BYTES+1))],crypto.randomUUID(),actor));
});
test('proof upload is atomic on audit failure and concurrent retries do not duplicate documents',async t=>{
 const tx=await transaction(),id=String(tx._id),key=crypto.randomUUID();t.mock.method(AuditLog,'create',()=>{throw Error('QA audit fail');});await assert.rejects(uploadFinanceDocuments(id,[file()],key,actor),/QA audit fail/);t.mock.restoreAll();assert.equal(await FinanceDocument.countDocuments(),0);await Promise.all([uploadFinanceDocuments(id,[file()],key,actor),uploadFinanceDocuments(id,[file()],key,actor)]);assert.equal(await FinanceDocument.countDocuments(),1);
});
test('cash-count as-of-date preserves book snapshot on edit and creates no ledger adjustment',async()=>{
 await Account.updateOne({_id:source._id},{$set:{balance:130}});await Transaction.create({type:'Ingreso',amount:30,currency:'USD',description:'QA posterior',category:'Servicios',accountId:source._id,date:new Date('2026-11-11T12:00:00-03:00'),status:'activo'});
 assert.equal((await financeBookBalance(String(source._id),'2026-11-10')).systemBalance,100);const count=await saveFinanceCashCount({accountId:String(source._id),date:'2026-11-10',declaredBalance:95,responsible:'Responsable QA'},{actor});assert.equal(count.systemBalance,100);assert.equal(count.difference,-5);
 await Account.updateOne({_id:source._id},{$inc:{balance:50}});const edited=await saveFinanceCashCount({accountId:String(source._id),date:'2026-11-10',declaredBalance:98,responsible:'Responsable QA'},{actor,id:String(count._id)});assert.equal(edited.systemBalance,100);assert.equal(edited.difference,-2);assert.equal(await Transaction.countDocuments(),1);assert.equal((await Account.findById(source._id)).balance,180);
});
test('daily close is a versioned immutable account snapshot; reclose requires a reason and audit failure writes no version',async t=>{
 const now=new Date('2026-11-10T15:00:00Z');const first=await createFinanceDailyClose({},actor,now);assert.equal(first.sequence,1);assert.equal(first.totalsUSD,100);await assert.rejects(createFinanceDailyClose({},actor,now),error=>error.status===409);await assert.rejects(createFinanceDailyClose({force:true},actor,now),error=>error.status===400);
 await Account.updateOne({_id:source._id},{$inc:{balance:25}});const second=await createFinanceDailyClose({force:true,reopenReason:'Control QA'},actor,now);assert.equal(second.sequence,2);assert.equal(second.totalsUSD,125);assert.equal((await DailyCashClose.findById(first._id)).totalsUSD,100);assert.equal(await Transaction.countDocuments(),0);
 t.mock.method(AuditLog,'create',()=>{throw Error('QA close audit fail');});await assert.rejects(createFinanceDailyClose({force:true,reopenReason:'Control QA'},actor,now),/QA close/);t.mock.restoreAll();assert.equal(await DailyCashClose.countDocuments(),2);assert.equal((await FinanceCloseSequence.findById('2026-11-10')).sequence,2);
});
const planInput=()=>({creditorName:'Acreedor QA',debtType:'compra_gasto',concept:'Servicio QA',amount:50,currency:'USD',count:2,frequency:'mensual',firstDueDate:'2026-11-15'});
test('payable plan creates no ledger; partial payment is atomic and idempotent, rejects overpayment and wrong currency',async()=>{
 const key=crypto.randomUUID();await Promise.all([createFinancePayablePlan(planInput(),{actor,idempotencyKey:key}),createFinancePayablePlan(planInput(),{actor,idempotencyKey:key})]);assert.equal(await FinancePayablePlan.countDocuments(),1);assert.equal(await FinancePayableInstallment.countDocuments(),2);assert.equal(await Transaction.countDocuments(),0);assert.equal((await Account.findById(source._id)).balance,100);
 const item=await FinancePayableInstallment.findOne({number:1}),payment={accountId:String(source._id),currency:'USD',amount:20,date:'2026-11-10'},paymentKey=crypto.randomUUID();await Promise.all([payFinancePayableInstallment(String(item._id),payment,{actor,idempotencyKey:paymentKey}),payFinancePayableInstallment(String(item._id),payment,{actor,idempotencyKey:paymentKey})]);assert.equal((await FinancePayableInstallment.findById(item._id)).paidAmount,20);assert.equal((await Account.findById(source._id)).balance,80);assert.equal(await Transaction.countDocuments(),1);
 await assert.rejects(payFinancePayableInstallment(String(item._id),{...payment,amount:31},{actor,idempotencyKey:crypto.randomUUID()}),error=>error.status===409);await assert.rejects(payFinancePayableInstallment(String(item._id),{...payment,accountId:String(destination._id)},{actor,idempotencyKey:crypto.randomUUID()}));assert.equal(await Transaction.countDocuments(),1);
});
test('payable payment failure rolls back paid amount, transaction, operation and balance',async t=>{
 await createFinancePayablePlan(planInput(),{actor,idempotencyKey:crypto.randomUUID()});const item=await FinancePayableInstallment.findOne();t.mock.method(Account,'updateOne',()=>{throw Error('QA payable balance fail');});await assert.rejects(payFinancePayableInstallment(String(item._id),{accountId:String(source._id),currency:'USD',amount:10,date:'2026-11-10'},{actor,idempotencyKey:crypto.randomUUID()}),/QA payable/);t.mock.restoreAll();assert.equal((await FinancePayableInstallment.findById(item._id)).paidAmount,0);assert.equal(await Transaction.countDocuments(),0);assert.equal((await Account.findById(source._id)).balance,100);
});
test('cash projection reads payable remainder and undated manual debt without counting linked pending transactions twice or writing ledger',async()=>{
 await createFinancePayablePlan(planInput(),{actor,idempotencyKey:crypto.randomUUID()});const item=await FinancePayableInstallment.findOne({number:1});item.paidAmount=20;await item.save();await FinanceManualEntry.create({kind:'payable',label:'Pago manual QA',amount:40,currency:'ARS',date:new Date('2026-11-10'),status:'Disponible',createdBy:actor.username,idempotencyKey:crypto.randomUUID(),payloadHash:'qa'});await Transaction.create({type:'Egreso',amount:50,currency:'USD',description:'Pendiente duplicado QA',category:'Cuotas a pagar',accountId:source._id,status:'pendiente',financePayableInstallmentId:item._id});
 const result=await getCashProjection({asOf:new Date('2026-11-10T15:00:00Z')});assert.equal(result.calendar.filter(row=>row.id==='payable:'+item._id).length,1);assert.equal(result.calendar.find(row=>row.id==='payable:'+item._id).amount,30);assert.ok(result.calendar.some(row=>row.amount===40&&row.currency==='ARS'&&row.dueDate===null));assert.equal(await Transaction.countDocuments(),1);assert.equal((await Account.findById(source._id)).balance,100);
});
test('historical book balance respects next-business-day midnight UTC and Argentina actual instants',async()=>{
 await Account.updateOne({_id:source._id},{$set:{balance:140}});await Transaction.create([{type:'Ingreso',amount:30,currency:'USD',description:'Fecha calendario siguiente',category:'Servicios',accountId:source._id,date:'2026-11-11T00:00:00.000Z',status:'activo'},{type:'Ingreso',amount:10,currency:'USD',description:'Instante real del día de corte',category:'Servicios',accountId:source._id,date:'2026-11-11T01:00:00.000Z',status:'activo'}]);assert.equal((await financeBookBalance(String(source._id),'2026-11-10')).systemBalance,110);
});
test('existing Stock purchase debt cannot be silently duplicated as an auto payable plan, including concurrent requests',async()=>{
 const car=await Car.create({brand:'QA',name:'Unidad pendiente',year:2022,km:10,fuel:'Nafta',condition:'Usado',price:200,currency:'USD',purchasePrice:100,purchaseCurrency:'USD',agencyOwned:true,status:'Disponible',purchasePaymentState:{modality:'pago_parcial',status:'parcial',totalCost:100,agencyCost:100,amountPaid:40,pendingDebt:60,currency:'USD',expectedDate:new Date('2026-11-15T00:00:00Z')}});
 const input={...planInput(),debtType:'auto_cuotas',carId:String(car._id),amount:30,count:2};const before=(await Account.findById(source._id)).balance;
 const results=await Promise.allSettled([createFinancePayablePlan(input,{actor,idempotencyKey:crypto.randomUUID()}),createFinancePayablePlan(input,{actor,idempotencyKey:crypto.randomUUID()})]);assert.equal(results.every(result=>result.status==='rejected'&&result.reason.status===409),true);assert.equal(await FinancePayablePlan.countDocuments(),0);assert.equal(await FinancePayableInstallment.countDocuments(),0);assert.equal(await FinancePayableOperation.countDocuments(),0);assert.equal(await Transaction.countDocuments(),0);assert.equal((await Account.findById(source._id)).balance,before);assert.equal((await Car.findById(car._id)).purchasePaymentState.pendingDebt,60);
 const projection=await getCashProjection({asOf:new Date('2026-11-10T15:00:00Z')});assert.equal(projection.calendar.filter(row=>row.id==='purchase:'+car._id).length,1);assert.equal(projection.calendar.find(row=>row.id==='purchase:'+car._id).amount,60);
});
test('purchase commitments survive vehicle sale and unknown dates stay undated; agency share is not applied twice',async()=>{
 const car=await Car.create({brand:'QA',name:'Unidad vendida',year:2022,km:10,fuel:'Nafta',condition:'Usado',price:200,currency:'USD',purchasePrice:100,purchaseCurrency:'USD',agencyOwned:true,status:'Vendido',investor:{name:'Socio QA',percentage:50},purchasePaymentState:{status:'parcial',agencyCost:50,amountPaid:10,pendingDebt:40,currency:'USD'}});const projection=await getCashProjection({asOf:new Date('2026-11-10T15:00:00Z')});const row=projection.calendar.find(item=>item.id==='purchase:'+car._id);assert.equal(row.amount,40);assert.equal(row.dueDate,null);assert.equal(row.daysFromToday,null);
});
