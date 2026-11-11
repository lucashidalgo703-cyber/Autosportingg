import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {access} from 'node:fs/promises';
import {once} from 'node:events';
import {filterStockSnapshot} from '../../src/utils/stockFilters.js';
let mongoose,repl,server,base,jwt,models,stock,life,contact,actor;
const nativeFetch=globalThis.fetch;
const fixture={brand:'Ford',name:'Focus QA',year:2022,km:100,fuel:'Nafta',condition:'Usado',price:10000,currency:'USD',status:'Disponible',purchasePrice:7000,ownerPhone:'5491100000011',notes:'PRIVATE_INTERNAL'};
const token=(permissions=['stock.read','stock.write'],role='qa')=>jwt.sign({id:String(actor._id),username:'stock_qa',role,permissions},process.env.JWT_SECRET,{expiresIn:'10m'});
async function call(method,path,body,permissions,role){const response=await fetch(base+path,{method,headers:{Authorization:'Bearer '+token(permissions,role),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json(),headers:response.headers};}
before(async()=>{
 for(const name of ['.env','.env.local','.env.production','.env.production.local'])assert.equal(await access(name).then(()=>true,()=>false),false,'Only isolated checkout');
 const {MongoMemoryReplSet}=await import('mongodb-memory-server');
 repl=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{ip:'127.0.0.1',launchTimeout:180000}]});
 process.env.MONGODB_URI=repl.getUri('autosporting_stock_workbench_'+crypto.randomBytes(6).toString('hex'));process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.TWO_FACTOR_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');process.env.NODE_ENV='production';process.env.ENABLE_DAILY_SUMMARY_SCHEDULER='false';
 for(const key of ['REDIS_URL','REDIS_TOKEN','MONGODB_DNS_SERVERS','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])process.env[key]='';
 globalThis.fetch=(input,options)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);assert.equal(url.origin,base,'No external providers');return nativeFetch(input,options);};
 mongoose=(await import('mongoose')).default;mongoose.set('autoCreate',false);jwt=(await import('jsonwebtoken')).default;
 const app=(await import('../../server.js')).default;await (await import('../../src/config/db.js')).default();
 models={};for(const name of ['Car','Client','Lead','Pedido','Quote','CommunicationLog','CrmTask','Mandate','Sale','Reservation','AdminUser','Transaction','OwnerPortal','FinanceManualEntry','Account','AuditLog'])models[name]=(await import('../../src/models/'+name+'.js')).default;
 models.OwnerPortalRequest=(await import('../../src/models/OwnerPortal.js')).OwnerPortalRequest;
 await Promise.all(Object.values(models).map(Model=>Model.createCollection()));
 stock=await import('../../src/services/stockWorkbenchService.js');life=await import('../../src/services/vehicleLifecycleService.js');contact=await import('../../src/services/contactPermissionsService.js');
 server=app.listen({port:0,host:'127.0.0.1'});await once(server,'listening');base='http://127.0.0.1:'+server.address().port;assert.equal(mongoose.connection.host,'127.0.0.1');
},{timeout:300000});
beforeEach(async()=>{await Promise.all(Object.values(models).map(Model=>Model.deleteMany({})));actor=await models.AdminUser.create({name:'QA stock',email:'stock@example.test',passwordHash:'qa',role:'ventas',active:true});});
after(async()=>{globalThis.fetch=nativeFetch;if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await mongoose?.disconnect();await repl?.stop();});
test('overview and attention are global, date-only followups stay on their commercial day and respect agenda access',async()=>{
 const car=await models.Car.create(fixture),now=new Date('2026-11-10T15:00Z');
 await models.CrmTask.create([{title:'Today midnight',vehicleId:car._id,dueDate:'2026-11-10T00:00Z'},{title:'Tomorrow midnight',vehicleId:car._id,dueDate:'2026-11-11T00:00Z'},{title:'Yesterday',vehicleId:car._id,dueDate:'2026-11-09T00:00Z'}]);
 const result=await stock.getStockAttention({search:'no-match'}, {role:'owner'},now);
 assert.equal(result.counts.followup,2);assert.equal(result.rows.find(row=>row.title==='Today midnight').overdue,false);assert.equal(result.rows.find(row=>row.title==='Yesterday').overdue,true);
 assert.equal((await stock.getStockAttention({}, {role:'qa',permissions:['stock.read']},now)).counts.followup,0);
 assert.deepEqual((await stock.getStockOverview(now)).value,{ARS:0,USD:10000});
 assert.equal((await call('GET','/api/admin/stock/overview',null,[])).status,403);
});
test('demand deduplicates across channels, includes old active requests and separates imported requests from sourcing suggestions',async()=>{
 const car=await models.Car.create({...fixture,status:'Reservado'}),client=await models.Client.create({fullName:'QA buyer',phone:'1100000011'}),now=new Date();
 await models.Pedido.create([{clientId:client._id,clientPhone:'1100000011',requestedBrand:car.brand,requestedModel:car.name,createdAt:'2020-01-01',currency:'USD'},{clientName:'Imported QA',clientPhone:'1100000022',requestedBrand:car.brand,requestedModel:car.name,source:'client_profile'}]);
 await models.Lead.create({name:'Same person QA',phone:'1100000011',clientId:client._id,vehicleId:car._id});
 const result=await stock.getStockDemand({}, {role:'owner'},now),group=result.groups[0];
 assert.equal(result.days,90);assert.equal(group.peopleCount,2);assert.equal(group.sources.pedido,2);assert.equal(group.sources.lead,1);assert.equal(group.stockCount,0);assert.equal(group.validatedGapPeople,1);assert.equal(group.unvalidatedPeople,1);
 assert.equal(JSON.stringify(result).includes('personKeys'),false);
 const restricted=await stock.getStockDemand({includeImported:false},{role:'qa',permissions:['stock.read','pedidos.read']},now);assert.equal(restricted.groups[0].peopleCount,1);assert.equal(restricted.permissions.leads,false);assert.equal(restricted.coverage.excludedImports,1);
 await assert.rejects(stock.getStockDemand({days:7},{role:'owner'}),{statusCode:400});
});
test('withdraw/relist retains value and ledger, blocks current operations and cannot be bypassed by generic forms',async()=>{
 const car=await models.Car.create(fixture),path='/api/admin/cars/'+car._id;
 assert.equal((await call('POST',path+'/availability',{action:'withdraw',reason:'QA withdrawal'})).status,200);
 let saved=await models.Car.findById(car._id);assert.equal(saved.status,'Retirado');assert.equal(saved.purchasePrice,7000);assert.equal(await models.Transaction.countDocuments(),0);
 assert.equal((await call('PATCH',path,{status:'Disponible'})).status,409);
 assert.equal((await call('POST','/api/admin/cars/bulk',{cars:[{...fixture,status:'Retirado'}]})).status,400);
 assert.equal((await call('POST',path+'/availability',{action:'relist',reason:'QA back'})).status,200);
 await models.Sale.create({vehicleId:car._id,salePrice:10000,saleCurrency:'USD',status:'confirmada'});
 await assert.rejects(life.changeVehicleSaleAvailability(String(car._id),{action:'withdraw',reason:'Blocked'},actor),{statusCode:409});
 saved=await models.Car.findById(car._id);assert.equal(saved.status,'Disponible');assert.equal(saved.auditLog.filter(row=>row.action==='RETIRO_VENTA').length,1);
});
test('owner portal requires consent and permission, exposes only public fields, rotates and revokes access',async()=>{
 const car=await models.Car.create({...fixture,images:['javascript:alert(1)','//evil.test/x','/qa.jpg'],publicEquipment:'QA equipment'}),path='/api/admin/cars/'+car._id+'/owner-portal';
 assert.equal((await call('POST',path,{},['stock.read','stock.write'])).status,400);
 assert.equal((await call('POST',path,{consentConfirmed:true},['stock.read'])).status,403);
 const created=await call('POST',path,{consentConfirmed:true});assert.equal(created.status,201);const secret=created.body.path.split('/').at(-1);
 assert.equal(secret.length,64);const publicData=await call('GET','/api/public/owner-portal/'+secret,null,[]);assert.equal(publicData.status,200);assert.match(publicData.headers.get('cache-control'),/no-store/);
 for(const field of ['purchasePrice','ownerPhone','notes','auditLog'])assert.equal(Object.hasOwn(publicData.body.vehicle,field),false);
 assert.deepEqual(publicData.body.vehicle.images,['/qa.jpg']);
 const internal=await call('GET',path);assert.equal(JSON.stringify(internal.body).includes(secret),false);assert.equal(JSON.stringify(internal.body).includes('tokenHash'),false);
 await call('POST',path,{consentConfirmed:true});assert.equal((await call('GET','/api/public/owner-portal/'+secret)).status,404);
 const next=await call('POST',path,{consentConfirmed:true}),nextToken=next.body.path.split('/').at(-1);await call('DELETE',path);assert.equal((await call('GET','/api/public/owner-portal/'+nextToken)).status,404);
});
test('owner price requests require review, keep internal resolution private and bound concurrent daily submissions',async()=>{
 const car=await models.Car.create(fixture),created=await life.createOwnerPortal(String(car._id),actor),secret=created.path.split('/').at(-1);
 const request=await life.submitOwnerPortalRequest(secret,{message:'QA price request',proposedPrice:12000,currency:'USD'});assert.equal((await models.Car.findById(car._id)).price,10000);
 await life.resolveOwnerPortalRequest(String(car._id),String(request._id),{resolution:'PRIVATE_INTERNAL_REVIEW'},actor);
 const publicData=await life.getPublicOwnerPortal(secret);assert.equal(publicData.requests[0].status,'resuelta');assert.equal(JSON.stringify(publicData).includes('PRIVATE_INTERNAL_REVIEW'),false);
 await assert.rejects(life.submitOwnerPortalRequest(secret,{message:'x'.repeat(5001)}),{statusCode:400});
 await models.OwnerPortalRequest.insertMany(Array.from({length:18},()=>({vehicleId:car._id,accessId:created._id,message:'QA quota'})));
 const parallel=await Promise.allSettled([life.submitOwnerPortalRequest(secret,{message:'Concurrent 1'}),life.submitOwnerPortalRequest(secret,{message:'Concurrent 2'})]);assert.equal(parallel.filter(result=>result.status==='fulfilled').length,1);assert.equal(await models.OwnerPortalRequest.countDocuments(),20);
});
test('derived contact permissions only resolve authorized entity IDs and respect cross-module no-contact preference',async()=>{
 const client=await models.Client.create({fullName:'QA private',phone:'1100000011',doNotContact:true}),car=await models.Car.create({...fixture,clientId:client._id}),actorData={role:'qa',permissions:['stock.read']};
 const result=await contact.getContactPermissions('car',[String(car._id),new mongoose.Types.ObjectId().toString()],actorData);assert.deepEqual(result.items[String(car._id)],{canContact:false});assert.equal(JSON.stringify(result).includes('phone'),false);
 await assert.rejects(contact.getContactPermissions('client',[String(client._id)],actorData),{statusCode:403});await assert.rejects(contact.getContactPermissions('car',['1100000011'],actorData),{statusCode:400});
 await models.Client.updateOne({_id:client._id},{$set:{doNotContact:false}});assert.equal((await contact.getContactPermissions('car',[String(car._id)],actorData)).items[String(car._id)].canContact,true);
});
test('linked client vehicles require both permissions and exclude commercial/private vehicle fields',async()=>{
 const client=await models.Client.create({fullName:'QA linked'});await models.Car.create({...fixture,clientId:client._id});const path='/api/admin/clients/'+client._id+'/vehicles';
 assert.equal((await call('GET',path,null,['clientes.read'])).status,403);const result=await call('GET',path,null,['clientes.read','stock.read']);assert.equal(result.status,200);assert.equal(result.body.vehicles.length,1);assert.equal(Object.hasOwn(result.body.vehicles[0],'purchasePrice'),false);
});
const manualPermissions=['finanzas.read','finanzas.write'];
const manualData={label:'Manual QA vehicle',status:'Recibida',amount:100,currency:'USD',date:'2026-11-10',idempotencyKey:'qa-manual-unique'};
test('manual financial sources require explicit permission, active matching account and idempotent atomic ledger posting',async()=>{
 const account=await models.Account.create({name:'QA USD',currency:'USD',balance:1000}),path='/api/admin/finance/manual-deposits',data={...manualData,accountId:String(account._id)};
 assert.equal((await call('POST',path,data,['finanzas.read'])).status,403);
 const saved=await call('POST',path,data,manualPermissions);assert.equal(saved.status,201,JSON.stringify(saved.body));assert.equal(saved.body.item.affectsCash,true);
 const replay=await call('POST',path,data,manualPermissions);assert.equal(replay.body.replayed,true);assert.equal(await models.Transaction.countDocuments(),1);assert.equal((await models.Account.findById(account._id)).balance,1100);
 assert.equal((await call('POST',path,{...data,amount:200},manualPermissions)).status,409);
 const transaction=await models.Transaction.findOne();assert.equal(String(transaction.financeManualEntryId),saved.body.item._id);
 const derived=await call('GET','/api/admin/finance/deposits',null,manualPermissions,'admin');assert.equal(derived.status,200);assert.equal(JSON.stringify(derived.body).includes('transaction-'+transaction._id),false);
 const badAccount=await models.Account.create({name:'QA ARS',currency:'ARS',balance:0});assert.equal((await call('POST',path,{...data,accountId:String(badAccount._id),idempotencyKey:'qa-wrong-currency'},manualPermissions)).status,400);assert.equal(await models.FinanceManualEntry.countDocuments(),1);
});
test('manual applied or no-account declarations do not affect cash, and a pending payable posts exactly once',async()=>{
 const account=await models.Account.create({name:'QA USD',currency:'USD',balance:1000});
 for(const [index,status]of ['Recibida','Aplicada','Devuelta'].entries()){const result=await call('POST','/api/admin/finance/manual-deposits',{...manualData,status,idempotencyKey:'qa-no-cash-'+index},manualPermissions);assert.equal(result.status,201);assert.equal(result.body.item.affectsCash,false);}
 assert.equal(await models.Transaction.countDocuments(),0);
 const path='/api/admin/finance/manual-payables',saved=await call('POST',path,{...manualData,status:'Pendiente',accountId:String(account._id)},manualPermissions);assert.equal(saved.status,201);
 assert.equal((await call('PATCH',path+'/'+saved.body.item._id,{status:'Pagado'},manualPermissions)).status,200);
 assert.equal((await call('PATCH',path+'/'+saved.body.item._id,{status:'Pagado'},manualPermissions)).status,200);assert.equal(await models.Transaction.countDocuments(),1);assert.equal((await models.Account.findById(account._id)).balance,900);
 assert.equal((await call('PATCH',path+'/'+saved.body.item._id,{amount:999},manualPermissions)).status,409);
 assert.equal((await call('PATCH',path+'/'+saved.body.item._id,{notes:'QA note'},manualPermissions)).status,200);
});
test('manual ledger posting and account balance roll back together when auditing fails',async()=>{
 const account=await models.Account.create({name:'QA USD',currency:'USD',balance:1000}),create=models.AuditLog.create;
 models.AuditLog.create=async()=>{throw new Error('QA audit failure');};
 try{const result=await call('POST','/api/admin/finance/manual-deposits',{...manualData,accountId:String(account._id)},manualPermissions);assert.equal(result.status,500);}finally{models.AuditLog.create=create;}
 assert.equal(await models.Transaction.countDocuments(),0);assert.equal(await models.FinanceManualEntry.countDocuments(),0);assert.equal((await models.Account.findById(account._id)).balance,1000);
});
test('manual financial forms cannot post against a draft or historical sale, including through an existing declaration',async()=>{
 const account=await models.Account.create({name:'QA USD',currency:'USD',balance:1000}),path='/api/admin/finance/manual-deposits';
 const declaration=await call('POST',path,manualData,manualPermissions);assert.equal(declaration.status,201);
 for(const [index,data]of [{status:'borrador'},{status:'entregada',historicalOnly:true}].entries()){
  const sale=await models.Sale.create({...data,salePrice:100,saleCurrency:'USD'});
  assert.equal((await call('POST',path,{...manualData,saleId:String(sale._id),accountId:String(account._id),idempotencyKey:'qa-block-sale-'+index},manualPermissions)).status,409);
  assert.equal((await call('PATCH',path+'/'+declaration.body.item._id,{saleId:String(sale._id),accountId:String(account._id)},manualPermissions)).status,409);
 }
 assert.equal(await models.Transaction.countDocuments(),0);assert.equal((await models.Account.findById(account._id)).balance,1000);
});
test('a consigned trade-in appears in Consignaciones online and offline while legacy owned trade-ins stay separate',async()=>{
 const saleId=new mongoose.Types.ObjectId();
 const cars=await models.Car.create([{...fixture,agencyOwned:false,ownerName:'QA owner',tradeInOrigin:{saleId,consigned:true,agencyOwned:false}},{...fixture,agencyOwned:false,ownerName:'QA legacy',tradeInOrigin:{saleId}}]);
 const response=await call('GET','/api/admin/cars?tab=consignaciones&status=disponible');assert.equal(response.status,200);assert.deepEqual(response.body.cars.map(row=>String(row._id)),[String(cars[0]._id)]);
 assert.deepEqual(filterStockSnapshot(cars.map(car=>car.toObject()),{tab:'consignaciones',status:'disponible'}).map(row=>String(row._id)),[String(cars[0]._id)]);
});
test('capital API requires stock and finance read and keeps large USD assets and account balances in USD',async()=>{
 await models.Car.create({...fixture,agencyOwned:true,price:300000,purchasePrice:10000,purchaseCurrency:'USD'});await models.Account.create({name:'QA USD',currency:'USD',balance:500});
 for(const permissions of [['stock.read'],['finanzas.read']])assert.equal((await call('GET','/api/admin/stock/capital-summary',null,permissions)).status,403);
 const result=await call('GET','/api/admin/stock/capital-summary',null,['stock.read','finanzas.read']);assert.equal(result.status,200,JSON.stringify(result.body));
 assert.equal(result.body.data.byCurrency.USD.totales.capitalPropioCosto,10500);assert.equal(result.body.data.byCurrency.ARS.totales.capitalPropioCosto,0);assert.equal(result.body.data.byCurrency.USD.totales.stockPropioPublicado,300000);
 const inventory=await call('GET','/api/admin/cars');assert.equal(inventory.body.summary.valorTotalUSD,300000);assert.equal(inventory.body.summary.valorTotalARS,0);
});
