import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {access} from 'node:fs/promises';
import {once} from 'node:events';

let mongoose,jwt,replSet,server,base,models,service,actor;
const nativeFetch=globalThis.fetch;
const sourceNames=['Account','Transaction','Car','Installment','Sale','Loan','FinanceManualEntry','FinancePayablePlan','FinancePayableInstallment'];
const key=()=>crypto.randomUUID();
const input=(extra={})=>({agencyConfirmation:'Agencia QA',reason:'Comenzar seguimiento de gestión QA',expectedCurrentPeriodId:null,...extra});
const call=(payload,idempotencyKey=key(),now=new Date('2030-01-01T12:00:00Z'))=>service.startFinancePeriod(payload,{actor,idempotencyKey,now});
const sources=async()=>JSON.stringify(await Promise.all(sourceNames.map(name=>models[name].find({}).sort({_id:1}).lean())));
const token=permissions=>jwt.sign({...actor,role:'administrativo',permissions:permissions.length?permissions:['help.read']},process.env.JWT_SECRET,{expiresIn:'10m'});
const request=(method,path,body,permissions=['finanzas.read','finanzas.write'])=>fetch(base+path,{method,headers:{Authorization:'Bearer '+token(permissions),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});

before(async()=>{
    for(const name of ['.env','.env.local','.env.production','.env.production.local'])assert.equal(await access(name).then(()=>true,()=>false),false,'Ejecutar desde directorio aislado sin .env');
    const {MongoMemoryReplSet}=await import('mongodb-memory-server');
    replSet=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{ip:'127.0.0.1',launchTimeout:180000}]});
    process.env.MONGODB_URI=replSet.getUri('finance_periods_'+crypto.randomBytes(6).toString('hex'));process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.TWO_FACTOR_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');process.env.NODE_ENV='production';process.env.ENABLE_DAILY_SUMMARY_SCHEDULER='false';for(const name of ['REDIS_URL','REDIS_TOKEN','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])process.env[name]='';
    globalThis.fetch=(url,options)=>{assert.equal(new URL(typeof url==='string'||url instanceof URL?url:url.url).origin,base,'Sólo se permiten consultas loopback');return nativeFetch(url,options);};
    mongoose=(await import('mongoose')).default;mongoose.set('autoCreate',false);jwt=(await import('jsonwebtoken')).default;actor={id:String(new mongoose.Types.ObjectId()),username:'qa_periods',role:'owner'};
    const app=(await import('../../server.js')).default;await(await import('../../src/config/db.js')).default();
    const names=[...sourceNames,'FinancePeriodState','FinancePeriodArchive','FinancePeriodOperation','AuditLog','CrmSettings'];models=Object.fromEntries(await Promise.all(names.map(async name=>[name,(await import('../../src/models/'+name+'.js')).default])));await Promise.all(Object.values(models).map(Model=>Model.createCollection()));
    assert.equal(mongoose.connection.host,'127.0.0.1');service=await import('../../src/services/financePeriodService.js');server=app.listen({port:0,host:'127.0.0.1'});await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
},{timeout:300000});
beforeEach(async()=>{await Promise.all(Object.values(models).map(Model=>Model.collection.deleteMany({})));await models.CrmSettings.create({agencyName:'Agencia QA'});});
after(async()=>{globalThis.fetch=nativeFetch;if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await mongoose?.disconnect();await replSet?.stop();});

test('period routes require financial read/write independently and reads create no reporting state',async()=>{
    assert.equal((await request('GET','/api/admin/finance/periods',undefined,[])).status,403);
    assert.equal((await request('POST','/api/admin/finance/periods',{...input(),idempotencyKey:key()},['finanzas.read'])).status,403);
    assert.equal((await request('POST','/api/admin/finance/periods',{...input(),idempotencyKey:key()},['finanzas.write'])).status,403);
    const result=await request('GET','/api/admin/finance/periods',undefined,['finanzas.read']);assert.equal(result.status,200);assert.match(result.headers.get('cache-control'),/no-store/);assert.equal((await result.json()).current.id,null);assert.equal(await models.FinancePeriodState.countDocuments(),0);
});

test('period archives real balances, partial/reprogrammed obligations and sold Stock debt without changing any money or source',async()=>{
    const account=await models.Account.create({name:'Caja QA USD',currency:'USD',balance:120});await models.Account.create({name:'Cuenta inactiva QA',currency:'ARS',balance:30,isActive:false});
    await models.Transaction.create([{type:'Ingreso',amount:25,currency:'USD',description:'Servicio QA',category:'Servicios',accountId:account._id,status:'activo',createdAt:'2029-12-20',date:'2029-11-01'},{type:'Egreso',amount:10,currency:'USD',description:'Traspaso QA',category:'Transferencia Interna',accountId:account._id,status:'activo',createdAt:'2029-12-20'},{type:'Egreso',amount:7,currency:'USD',description:'Pago pendiente QA',category:'Servicios',accountId:account._id,status:'pendiente',createdAt:'2029-12-20'},{type:'Ingreso',amount:99,currency:'USD',description:'Anulado QA',category:'Servicios',accountId:account._id,status:'anulado',createdAt:'2029-12-20'}]);
    await models.Car.create({brand:'QA',name:'Unidad vendida QA',year:2022,km:10,fuel:'Nafta',condition:'Usado',price:200,currency:'USD',purchasePrice:100,purchaseCurrency:'USD',agencyOwned:true,status:'Vendido',purchasePaymentState:{status:'parcial',agencyCost:100,amountPaid:40,pendingDebt:60,currency:'USD'}});
    await models.Installment.create({source:'manual',customerName:'Cliente ficticio QA',installmentNumber:1,amount:100,paidAmount:40,currency:'ARS',status:'reprogramada',dueDate:'2029-11-01',isRescheduled:true,rescheduledDate:'2030-01-10'});
    await models.FinancePayableInstallment.create({planId:new mongoose.Types.ObjectId(),number:1,amount:50,paidAmount:15,currency:'USD',dueDate:'2030-01-15'});
    await models.FinanceManualEntry.create({kind:'payable',label:'Pago manual QA',amount:20,currency:'ARS',date:'2029-12-20',status:'Disponible',createdBy:actor.username,idempotencyKey:key(),payloadHash:'qa'});
    await models.Loan.create({personName:'Persona ficticia QA',amount:5,currency:'USD',status:'pendiente'});
    const before=await sources(),saved=await call(input()),archive=await service.readFinancePeriod(saved.archive.id),snapshot=archive.snapshot;
    assert.equal(await sources(),before);assert.equal(snapshot.registeredBalances.USD,120);assert.equal(snapshot.registeredBalances.ARS,0);assert.equal(snapshot.accounts.length,2);assert.equal(snapshot.movements.counts.total,4);assert.equal(snapshot.movements.externalActivity.USD.net,25);assert.equal(snapshot.pending.outgoing.USD,102);assert.equal(snapshot.pending.incoming.ARS,60);assert.equal(snapshot.pending.outgoing.ARS,20);assert.equal(snapshot.projection.undated.count,3);assert.equal(snapshot.capitalReadings.USD.registeredLoanCredits,5);assert.equal(snapshot.pending.bySource.find(row=>row.source==='stock_purchase').amount,60);assert.equal(snapshot.projection.periods[1].incoming.ARS,60);assert.equal(snapshot.projection.periods[1].outgoing.USD,35);
    assert.ok(await models.AuditLog.exists({action:'FINANZAS_PERIODO_INICIADO',userId:actor.id}));assert.equal(await models.FinancePeriodArchive.countDocuments(),1);
});

test('concurrent same-key retries archive once; key payload changes and stale distinct starts conflict',async()=>{
    const idempotencyKey=key(),results=await Promise.all([call(input(),idempotencyKey),call(input(),idempotencyKey)]);assert.equal(results[0].archive.id,results[1].archive.id);assert.equal(await models.FinancePeriodArchive.countDocuments(),1);assert.equal(await models.FinancePeriodOperation.countDocuments(),1);assert.equal((await models.FinancePeriodState.findById('management')).revision,1);
    await assert.rejects(call(input({reason:'Otro motivo QA'}),idempotencyKey),error=>error.status===409);await assert.rejects(call(input(),key()),error=>error.status===409);
    const current=results[0].current.id,concurrent=await Promise.allSettled([call(input({expectedCurrentPeriodId:current}),key(),new Date('2030-02-01')),call(input({expectedCurrentPeriodId:current}),key(),new Date('2030-02-01'))]);assert.equal(concurrent.filter(item=>item.status==='fulfilled').length,1);assert.equal(concurrent.filter(item=>item.status==='rejected'&&item.reason.status===409).length,1);assert.equal(await models.FinancePeriodArchive.countDocuments(),2);
    assert.equal((await call(input(),idempotencyKey)).archive.id,results[0].archive.id);
});

test('audit failure rolls back archive, current boundary and receipt; the same key can safely retry',async t=>{
    const account=await models.Account.create({name:'Caja QA',currency:'ARS',balance:50}),before=await sources(),idempotencyKey=key();t.mock.method(models.AuditLog,'create',()=>{throw Error('QA period audit failure');});await assert.rejects(call(input(),idempotencyKey),/QA period audit/);t.mock.restoreAll();assert.equal(await models.FinancePeriodArchive.countDocuments(),0);assert.equal(await models.FinancePeriodOperation.countDocuments(),0);assert.equal(await models.FinancePeriodState.countDocuments(),0);assert.equal(await sources(),before);await call(input(),idempotencyKey);assert.equal((await models.Account.findById(account._id)).balance,50);
});

test('archives remain immutable after sources change; registration boundaries retain late backdated entries in next period',async()=>{
    const account=await models.Account.create({name:'Caja QA',currency:'USD',balance:10});const first=await call(input()),original=await service.readFinancePeriod(first.archive.id);
    await models.Account.updateOne({_id:account._id},{$set:{balance:40}});await models.Transaction.create({type:'Ingreso',amount:30,currency:'USD',description:'Ingreso tardío QA',category:'Servicios',accountId:account._id,status:'activo',createdAt:'2030-01-15',date:'2029-01-01'});
    const second=await call(input({expectedCurrentPeriodId:first.current.id}),key(),new Date('2030-02-01'));assert.deepEqual(await service.readFinancePeriod(first.archive.id),original);const next=await service.readFinancePeriod(second.archive.id);assert.equal(next.snapshot.movements.counts.total,1);assert.equal(next.snapshot.movements.externalActivity.USD.income,30);assert.equal(next.snapshot.registeredBalances.USD,40);await assert.rejects(models.FinancePeriodArchive.updateOne({_id:first.archive.id},{$set:{reason:'Cambiar'}}),/inmutables/);await assert.rejects(models.FinancePeriodArchive.findByIdAndDelete(first.archive.id),/inmutables/);
});

test('explicit agency, reason and current boundary are validated and no account is required',async()=>{
    for(const payload of [null,input({agencyConfirmation:'Otra agencia'}),input({reason:''}),{agencyConfirmation:'Agencia QA',reason:'Motivo QA'}])await assert.rejects(call(payload),error=>[400,409].includes(error.status));assert.equal(await models.FinancePeriodArchive.countDocuments(),0);const result=await call(input());const archive=await service.readFinancePeriod(result.archive.id);assert.deepEqual(archive.snapshot.registeredBalances,{ARS:0,USD:0});assert.equal(archive.snapshot.accounts.length,0);assert.equal(await models.Transaction.countDocuments(),0);
});

test('unreliable pending currencies remain unknown instead of false zero and source records remain intact',async()=>{
    const item=await models.Installment.create({source:'manual',customerName:'Cliente ficticio QA',installmentNumber:1,amount:100,paidAmount:20,currency:'ARS',status:'parcial',dueDate:'2030-01-10'});await models.Installment.collection.updateOne({_id:item._id},{$set:{currency:'EUR'}});const before=await sources(),saved=await call(input()),archive=await service.readFinancePeriod(saved.archive.id);assert.equal(archive.snapshot.pending.incoming.ARS,null);assert.equal(archive.snapshot.pending.incoming.USD,null);assert.ok(archive.snapshot.projection.quality.issues.length>0);assert.equal(await sources(),before);
});

test('HTTP start and archived read preserve private permissions and same idempotent result',async()=>{
    const body={...input(),idempotencyKey:key()},response=await request('POST','/api/admin/finance/periods',body);assert.equal(response.status,201,JSON.stringify(await response.clone().json()));const saved=await response.json();const replay=await request('POST','/api/admin/finance/periods',body);assert.equal(replay.status,201);assert.equal((await replay.json()).archive.id,saved.archive.id);assert.equal((await request('GET','/api/admin/finance/periods/'+saved.archive.id,undefined,[])).status,403);const archive=await request('GET','/api/admin/finance/periods/'+saved.archive.id,undefined,['finanzas.read']);assert.equal(archive.status,200);assert.match(archive.headers.get('cache-control'),/no-store/);assert.equal((await archive.json()).snapshot.version,1);assert.equal(await models.Transaction.countDocuments(),0);
});
