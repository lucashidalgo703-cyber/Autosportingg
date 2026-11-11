// Isolated real HTTP/Mongo integration. No production .env, providers or data.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {before,after,beforeEach,test} from 'node:test';
import {carFixture,clientFixture,accountFixture,installmentFixture,transactionFixture} from '../fixtures/saleDraftFixtures.js';
let mongoose,repl,server,base,jwt,M,fixture;
const originalFetch=globalThis.fetch;
const asPlain=value=>JSON.parse(JSON.stringify(value));
const id=value=>String(value?._id||value);
const key=()=>crypto.randomUUID();
const token=(permissions,role='solo_lectura',actorId=fixture.owner._id)=>jwt.sign({id:id(actorId),username:'qa_exp',role,...(permissions?{permissions}:{})},process.env.JWT_SECRET,{expiresIn:'10m'});
async function call(method,path,body,auth=token(null,'owner')){const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});return {status:response.status,body:await response.json().catch(()=>null)};}
const endpoint=()=>'/api/admin/expedientes/'+id(fixture.sale);
async function detail(){const response=await call('GET',endpoint());assert.equal(response.status,200,JSON.stringify(response.body));return response.body;}
async function mutate(path,payload,method='POST',auth){const current=await detail();return call(method,endpoint()+path,{expectedVersion:current.version,...(method==='POST'?{idempotencyKey:key()}:{}),...payload},auth);}
async function moneySnapshot(){return Object.fromEntries(await Promise.all(['Account','Transaction','Installment','Car'].map(async name=>[name,asPlain(await M[name].find().sort({_id:1}).lean())])));}
async function upload(documentKey,party='procedure',auth=token(null,'owner'),fileName='ficticio.pdf'){
    const bytes=Buffer.from('%PDF-1.7\nDOCUMENTO FICTICIO SIN VALIDEZ\n%%EOF'),sha=crypto.createHash('sha256').update(bytes).digest('hex'),uploadId=key();
    const metadata={slot:'expediente_document',party,documentKey,attachmentId:key()},manifest=[{fileIndex:0,fileCount:1,fileName,mimeType:'application/pdf',fileSize:bytes.length,fileSha256:sha,partCount:1}],path='/api/admin/sales/'+id(fixture.sale)+'/document-uploads/'+uploadId;
    const stage=await call('POST',path+'/chunks',{...manifest[0],partIndex:0,chunkSha256:sha,data:bytes.toString('base64'),metadata},auth);
    if(stage.status!==200)return stage;
    const result=await call('POST',path+'/commit',{manifest,metadata},auth);return {...result,metadata,manifest,uploadId,path};
}
before(async()=>{
    const {MongoMemoryReplSet}=await import('mongodb-memory-server');
    repl=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{launchTimeout:180000}]});
    for(const name of Object.keys(process.env))if(/^(MONGO|DATABASE_|JWT_|TWO_FACTOR_|CLOUDINARY_|WHATSAPP_|META_|SMTP_|GMAIL_|EMAIL_|OPENAI_|ANTHROPIC_|REDIS_|UPSTASH_)/i.test(name)&&!name.startsWith('MONGOMS_'))delete process.env[name];
    process.env.MONGODB_URI=repl.getUri('autosporting_exp_'+crypto.randomBytes(5).toString('hex'));process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.TWO_FACTOR_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');process.env.NODE_ENV='production';process.env.ENABLE_DAILY_SUMMARY_SCHEDULER='false';
    globalThis.fetch=(input,options)=>{const url=new URL(typeof input==='string'?input:input.url);if(!base||url.origin!==base)throw Error('External provider blocked in Expedientes QA');return originalFetch(input,options);};
    mongoose=(await import('mongoose')).default;mongoose.set('autoCreate',false);const {default:app}=await import('../../server.js');jwt=(await import('jsonwebtoken')).default;
    M=Object.fromEntries(await Promise.all(['Sale','Car','Client','Account','Transaction','Installment','AuditLog','AdminUser','Gestoria','SaleDocument','PrivateUploadChunk','ExpedienteOperation','FinanceManualEntry'].map(async name=>[name,(await import('../../src/models/'+name+'.js')).default])));
    const connectDB=(await import('../../src/config/db.js')).default;await connectDB();assert.equal(mongoose.connection.host,'127.0.0.1');assert.ok((await mongoose.connection.db.admin().command({hello:1})).setName);
    await Promise.all(Object.values(M).map(model=>model.createCollection()));await Promise.all([M.ExpedienteOperation.init(),M.FinanceManualEntry.init()]);
    server=app.listen({host:'127.0.0.1',port:0});await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
},{timeout:300000});
beforeEach(async()=>{
    await Promise.all(Object.values(M).map(model=>model.deleteMany({})));
    const owner=await M.AdminUser.create({name:'Administración QA',email:'exp-qa@example.invalid',passwordHash:crypto.randomBytes(32).toString('hex'),role:'owner',active:true});
    const [car,client,account]=await Promise.all([M.Car.create(carFixture({status:'Vendido'})),M.Client.create(clientFixture()),M.Account.create(accountFixture({currency:'USD',balance:1000}))]);
    const sale=await M.Sale.create({vehicleId:car._id,clientId:client._id,assignedTo:owner._id,expedienteResponsible:owner._id,status:'confirmada',salePrice:1000,saleCurrency:'USD',saleDate:new Date('2026-11-01T00:00:00Z')});
    await M.Transaction.create(transactionFixture({accountId:account._id,amount:1000,currency:'USD'}));await M.Installment.create(installmentFixture({saleId:sale._id,currency:'USD',dueDate:new Date('2026-12-01')}));fixture={owner,car,client,account,sale};
});
after(async()=>{globalThis.fetch=originalFetch;if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await mongoose?.disconnect();await repl?.stop();});

test('workspace filters, facets and sort apply before paging; historical/drafts excluded and legacy status preserved',async()=>{
    const rows=Array.from({length:25},(_,i)=>({status:'confirmada',saleCurrency:i%2?'ARS':'USD',salePrice:100+i,draftData:{buyerName:'QA '+String(24-i).padStart(2,'0')},expedienteStatus:i===0?'finalizado':i===1?'transferido':i===2?'observado':'en_proceso',expediente:{title:'Ficha '+i,openedAt:'2026-11-'+String(i+1).padStart(2,'0')},assignedTo:fixture.owner._id}));
    const extra=await M.Sale.insertMany(rows);await M.Sale.create([{status:'borrador',saleCurrency:'USD',salePrice:1},{status:'entregada',historicalOnly:true,saleCurrency:'USD',salePrice:2}]);
    const baseline=await moneySnapshot(),first=await call('GET','/api/admin/expedientes?view=todos&sort=buyer&direction=asc&page=1'),second=await call('GET','/api/admin/expedientes?view=todos&sort=buyer&direction=asc&page=2');
    assert.equal(first.status,200);assert.equal(first.body.total,26);assert.equal(first.body.items.length,20);assert.equal(second.body.items.length,6);assert.deepEqual(first.body.counts,second.body.counts);assert.equal(first.body.counts.finalized,1);assert.equal(first.body.statusCounts.transferido,1);
    const legacy=await call('GET','/api/admin/expedientes/'+id(extra[0]));assert.equal(legacy.body.status,'entregado');assert.equal((await M.Sale.findById(extra[0]._id)).expedienteStatus,'finalizado');
    const restricted=await call('GET','/api/admin/expedientes?view=todos',undefined,token(['ventas.read']));assert.equal(restricted.status,200);assert.equal(restricted.body.items[0].finance,null);assert.equal((await call('GET','/api/admin/expedientes?export=1',undefined,token(['ventas.read']))).status,403);assert.deepEqual(await moneySnapshot(),baseline);
});
test('metadata, notes, tasks and parties use versioned audit without changing sales, physical delivery or money',async()=>{
    const baseline=await moneySnapshot(),current=await detail();
    const result=await call('PATCH',endpoint(),{expectedVersion:current.version,title:'Legajo ficticio',dueDate:'2026-12-20',priority:'high',administration:{milestones:{sellerDocsSigned:true},refundDeclared:true}});assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.title,'Legajo ficticio');assert.equal(result.body.administration.milestones.sellerDocsSigned,true);
    assert.equal((await call('PATCH',endpoint(),{expectedVersion:current.version,title:'Stale'})).status,409);
    const party=await mutate('/parties/seller',{fullName:'Parte vendedora QA',dniCuit:'QA-ID',phone:'0000000000',clientId:id(fixture.client)},'PATCH');assert.equal(party.status,200,JSON.stringify(party.body));assert.equal(party.body.parties.seller.clientId,id(fixture.client));
    await M.Client.updateOne({_id:fixture.client._id},{$set:{birthDate:'1990-05-09'}});assert.equal((await detail()).parties.buyer.birthDate,'1990-05-09');
    const clearedParty=await mutate('/parties/buyer',{birthDate:null,clientId:null},'PATCH');assert.equal(clearedParty.status,200);assert.equal(clearedParty.body.parties.buyer.birthDate,null);assert.equal(clearedParty.body.parties.buyer.clientId,null);
    assert.equal((await M.Sale.findById(fixture.sale._id)).clientId.toString(),id(fixture.client));
    const noteKey=key(),before=await detail(),notePayload={expectedVersion:before.version,text:'Nota administrativa ficticia',recipient:'gestoria',idempotencyKey:noteKey};
    assert.equal((await call('POST',endpoint()+'/notes',notePayload)).status,201);const replay=await call('POST',endpoint()+'/notes',notePayload);assert.equal(replay.status,201);assert.equal(replay.body.replayed,true);assert.equal(replay.body.managementNotes.length,1);
    const task=await mutate('/tasks',{title:'Revisar papeles',dueDate:'2026-12-15',responsibleId:id(fixture.owner)});assert.equal(task.status,201);assert.equal((await mutate('/tasks/'+task.body.tasks[0].id,{completed:true},'PATCH')).body.tasks[0].completed,true);
    assert.equal((await M.Sale.findById(fixture.sale._id)).status,'confirmada');assert.equal((await M.Sale.findById(fixture.sale._id)).deliveryStatus,'pendiente');assert.deepEqual(await moneySnapshot(),baseline);
});
test('composite metadata rollback, audit failure and operation replay preserve atomicity',async()=>{
    const current=await detail(),baseline=asPlain(await M.Sale.findById(fixture.sale._id).lean());
    const rejected=await call('PATCH',endpoint(),{expectedVersion:current.version,title:'Must roll back',administration:{milestones:{papersDelivered:true}}});assert.equal(rejected.status,409);assert.deepEqual(asPlain(await M.Sale.findById(fixture.sale._id).lean()),baseline);
    const create=M.AuditLog.create;M.AuditLog.create=async()=>{throw Error('Synthetic audit failure');};
    try{assert.equal((await call('PATCH',endpoint(),{expectedVersion:current.version,title:'Audit rollback'})).status,500);}finally{M.AuditLog.create=create;}
    assert.deepEqual(asPlain(await M.Sale.findById(fixture.sale._id).lean()),baseline);
    const payload={expectedVersion:current.version,text:'Concurrent note',recipient:'general',idempotencyKey:key()};const outcomes=await Promise.all([call('POST',endpoint()+'/notes',payload),call('POST',endpoint()+'/notes',payload)]);assert.deepEqual(outcomes.map(row=>row.status),[201,201]);assert.equal((await detail()).generalNotes.length,1);
    assert.equal((await call('POST',endpoint()+'/notes',{...payload,text:'Changed request'})).status,409);
});
test('document steps require checklist, responsibility, confirmations and transferred proofs; paper delivery never closes Sale',async()=>{
    const baseline=await moneySnapshot();assert.equal((await mutate('/status',{status:'documentacion_completa'})).body.code,'EXPEDIENTE_DOCUMENTS_PENDING');
    let current=await detail();for(const party of ['seller','buyer'])for(const row of current.documents[party]){const saved=await call('PATCH',endpoint()+'/documents/'+party+'/'+row.key,{expectedVersion:current.version,status:'no_aplica'});assert.equal(saved.status,200,JSON.stringify(saved.body));current=saved.body;}
    await M.AdminUser.updateOne({_id:fixture.owner._id},{$set:{active:false}});assert.equal((await mutate('/status',{status:'documentacion_completa',overrideReason:'Control QA'})).body.code,'EXPEDIENTE_RESPONSIBLE_REQUIRED');await M.AdminUser.updateOne({_id:fixture.owner._id},{$set:{active:true}});
    const ordinary=token(['ventas.read','ventas.write','documentacion.read','documentacion.write']);const missing=await call('POST',endpoint()+'/status',{expectedVersion:current.version,status:'documentacion_completa',idempotencyKey:key()},ordinary);assert.equal(missing.status,409);assert.equal(missing.body.code,'EXPEDIENTE_CONFIRMATIONS_PENDING');
    const advanced=await mutate('/status',{status:'documentacion_completa',overrideReason:'Administración verifica la excepción con pendientes'});assert.equal(advanced.status,200,JSON.stringify(advanced.body));assert.equal(advanced.body.confirmations.buyer.confirmed,false);
    assert.equal((await mutate('/status',{status:'transferido',overrideReason:'Avance con constancias pendientes'})).body.code,'EXPEDIENTE_PROOFS_REQUIRED');
    assert.equal((await upload('transferred_title')).status,201);assert.equal((await upload('transferred_title','procedure',token(null,'owner'),'segunda-pagina.pdf')).status,201);assert.equal((await upload('registry_fee')).status,201);
    const confirmed=await mutate('/confirmations/buyer',{confirmed:true,note:'Confirmación manual ficticia'});assert.equal(confirmed.status,200);assert.ok(confirmed.body.confirmations.buyer.confirmedAt);
    assert.equal((await mutate('/status',{status:'transferido'})).status,200);const delivered=await mutate('/administration',{milestones:{papersDelivered:true}},'PATCH');assert.equal(delivered.status,200,JSON.stringify(delivered.body));assert.equal(delivered.body.status,'entregado');assert.equal((await mutate('/administration',{milestones:{papersDelivered:false}},'PATCH')).body.code,'EXPEDIENTE_BACKWARD_REASON_REQUIRED');assert.equal((await detail()).documents.procedure.find(row=>row.key==='transferred_title').files.length,2);
    const sale=await M.Sale.findById(fixture.sale._id);assert.equal(sale.status,'confirmada');assert.equal(sale.deliveryStatus,'pendiente');assert.equal(sale.actualDeliveryDate,undefined);assert.deepEqual(await moneySnapshot(),baseline);
    assert.equal((await mutate('/status',{status:'transferido'})).status,400);assert.equal((await mutate('/status',{status:'transferido',reason:'Corrección administrativa ficticia'})).status,200);
});
test('private expediente files bind scope and financial permissions before staging; legacy sales summary is protected',async()=>{
    const docOnly=token(['ventas.read','ventas.write','documentacion.read','documentacion.write']);
    assert.equal((await upload('owner_transfer','procedure',docOnly)).status,403);assert.equal(await M.PrivateUploadChunk.countDocuments({}),0);
    const result=await upload('owner_transfer');assert.equal(result.status,201,JSON.stringify(result.body));assert.equal((await call('GET','/api/admin/sales/'+id(fixture.sale)+'/documents',undefined,docOnly)).body.documents.length,0);
    assert.equal((await call('GET','/api/admin/sales/'+id(fixture.sale)+'/documents/'+result.body.document._id,undefined,docOnly)).status,403);
    assert.equal((await call('PATCH','/api/admin/sales/'+id(fixture.sale)+'/documents/'+result.body.document._id,{deleted:true},docOnly)).status,403);
    assert.equal((await call('GET','/api/admin/sales/'+id(fixture.sale)+'/treasury-summary',undefined,token(['ventas.read']))).status,403);
    assert.equal((await call('PATCH','/api/admin/sales/'+id(fixture.sale),{expedienteStatus:'entregado'})).status,409);
    assert.equal((await call('PATCH',endpoint(),{expectedVersion:0,title:'Denied'},token(['ventas.read']))).status,403);
});
test('expenses and registry declarations do not post cash; unsupported paid status is rejected',async()=>{
    const baseline=await moneySnapshot();const created=await mutate('/expenses/buyer',{concept:'Gasto declarado QA',amount:50,currency:'USD',status:'retained',accountId:id(fixture.account)});assert.equal(created.status,201,JSON.stringify(created.body));assert.equal(created.body.finance.pendingBalance,1000);assert.equal(created.body.finance.expensesByParty.buyer.USD.retained,50);
    assert.equal((await mutate('/expenses/buyer/'+created.body.expenses.buyer[0].id,{status:'paid'},'PATCH')).status,409);
    const admin=await mutate('/administration',{registrationAccounts:[{bank:'Banco ficticio',cbuAlias:'alias.qa.sin.validez',holder:'Titular QA',amount:20,currency:'ARS',notes:'Sólo declaración'}],registrationDeposit:{amount:20,currency:'ARS',notes:'No registra caja'}},'PATCH');assert.equal(admin.status,200,JSON.stringify(admin.body));assert.deepEqual(await moneySnapshot(),baseline);
    const noFinance=await call('GET',endpoint(),undefined,token(['ventas.read']));assert.equal(noFinance.body.finance,null);assert.equal(noFinance.body.administration.registrationDeposit,null);assert.deepEqual(noFinance.body.expenses,{seller:[],buyer:[]});
});
test('atomic expense pay uses canonical finance once across concurrent actors and retries; audit failure rolls back all money',async()=>{
    const expense=(await mutate('/expenses/seller',{concept:'Pago real ficticio',amount:50,currency:'USD',status:'pending'})).body.expenses.seller[0];
    const initial=await detail(),payload={expectedVersion:initial.version,accountId:id(fixture.account),date:'2026-11-11',notes:'QA',idempotencyKey:key()},secondActor=new mongoose.Types.ObjectId();
    const results=await Promise.all([call('POST',endpoint()+'/expenses/seller/'+expense.id+'/pay',payload),call('POST',endpoint()+'/expenses/seller/'+expense.id+'/pay',{...payload,idempotencyKey:key()},token(null,'owner',secondActor))]);assert.equal(results.filter(row=>row.status===200).length,1,JSON.stringify(results));assert.equal(results.filter(row=>row.status===409).length,1);
    assert.equal(await M.Transaction.countDocuments({type:'Egreso'}),1);assert.equal((await M.Account.findById(fixture.account._id)).balance,950);assert.equal((await detail()).expenses.seller[0].status,'paid');
    const paymentAudit=await M.AuditLog.findOne({action:'EXPEDIENTE_GASTO_PAGADO',entityId:id(fixture.sale)}).lean();assert.match(paymentAudit.description,/Egreso real.*servicio financiero canónico.*gasto del expediente/);assert.doesNotMatch(paymentAudit.description,/Sin movimiento de caja/i);
    if(results[0].status===200){const replay=await call('POST',endpoint()+'/expenses/seller/'+expense.id+'/pay',payload);assert.equal(replay.status,200);assert.equal(replay.body.replayed,true);}
    const protectedEdit=await mutate('/expenses/seller/'+expense.id,{amount:60},'PATCH');assert.equal(protectedEdit.status,409);
    const extra=(await mutate('/expenses/buyer',{concept:'Rollback pago QA',amount:25,currency:'USD',status:'pending'})).body.expenses.buyer[0];const baseline=await moneySnapshot(),version=(await detail()).version;
    const create=M.AuditLog.create;M.AuditLog.create=async(...args)=>{if(args[0]?.[0]?.action==='EXPEDIENTE_GASTO_PAGADO')throw Error('Synthetic final audit failure');return create.apply(M.AuditLog,args);};
    try{assert.equal((await call('POST',endpoint()+'/expenses/buyer/'+extra.id+'/pay',{expectedVersion:version,accountId:id(fixture.account),date:'2026-11-11',idempotencyKey:key()})).status,500);}finally{M.AuditLog.create=create;}
    assert.deepEqual(await moneySnapshot(),baseline);assert.equal((await detail()).expenses.buyer[0].status,'pending');
});
test('soft archive is administrator-only, preserves sale/ledger and can restore with an audited reason',async()=>{
    const baseline=await moneySnapshot();assert.equal((await mutate('/archive',{archived:true,reason:'QA archive'},'POST',token(['ventas.read','ventas.write']))).status,403);
    const archive=await mutate('/archive',{archived:true,reason:'Archivo administrativo ficticio'});assert.equal(archive.status,200);assert.ok(archive.body.archivedAt);assert.equal((await call('GET','/api/admin/expedientes')).body.total,0);assert.equal((await call('GET','/api/admin/expedientes?view=archivados')).body.total,1);
    assert.equal((await mutate('/archive',{archived:false,reason:'Restauración administrativa ficticia'})).status,200);assert.equal((await M.Sale.findById(fixture.sale._id)).status,'confirmada');assert.deepEqual(await moneySnapshot(),baseline);
});
