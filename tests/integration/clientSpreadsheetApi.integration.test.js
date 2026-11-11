import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {access} from 'node:fs/promises';
let mongoose,jwt,replSet,server,base,Client,AdminUser,Run,actor;
const nativeFetch=globalThis.fetch;
const auth=permissions=>jwt.sign({id:String(actor._id),username:'qa_import',role:'ventas',permissions},process.env.JWT_SECRET,{expiresIn:'10m'});
async function call(path,body,permissions=['clientes.read','clientes.write']){const response=await fetch(base+path,{method:'POST',headers:{Authorization:'Bearer '+auth(permissions),'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
before(async()=>{
 for(const name of ['.env','.env.local','.env.production','.env.production.local'])assert.equal(await access(name).then(()=>true,()=>false),false,'Requiere checkout aislado sin .env');
 const {MongoMemoryReplSet}=await import('mongodb-memory-server');
 replSet=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{ip:'127.0.0.1',launchTimeout:180000}]});
 process.env.MONGODB_URI=replSet.getUri('autosporting_import_api_'+crypto.randomBytes(6).toString('hex'));process.env.JWT_SECRET=crypto.randomBytes(48).toString('hex');process.env.TWO_FACTOR_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');process.env.NODE_ENV='production';process.env.ENABLE_DAILY_SUMMARY_SCHEDULER='false';
 for(const key of ['REDIS_URL','REDIS_TOKEN','MONGODB_DNS_SERVERS','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'])process.env[key]='';
 globalThis.fetch=(input,options)=>{const target=new URL(typeof input==='string' || input instanceof URL ? input : input.url);assert.equal(target.origin,base,'No se consulta ningún proveedor externo');return nativeFetch(input,options);};
 mongoose=(await import('mongoose')).default;mongoose.set('autoCreate',false);jwt=(await import('jsonwebtoken')).default;
 const app=(await import('../../server.js')).default;Client=(await import('../../src/models/Client.js')).default;AdminUser=(await import('../../src/models/AdminUser.js')).default;Run=(await import('../../src/models/ClientImportRun.js')).default;const Audit=(await import('../../src/models/AuditLog.js')).default;
 await (await import('../../src/config/db.js')).default();await Promise.all([Client,AdminUser,Run,Audit].map(Model=>Model.createCollection()));assert.equal(mongoose.connection.host,'127.0.0.1');
 server=app.listen({port:0,host:'127.0.0.1'});await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
},{timeout:300000});
beforeEach(async()=>{await Promise.all([Client,AdminUser,Run].map(Model=>Model.deleteMany({})));actor=await AdminUser.create({name:'Vendedor QA',email:'qa@example.test',passwordHash:'qa-only',role:'ventas',active:true});});
after(async()=>{globalThis.fetch=nativeFetch;if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await mongoose?.disconnect();await replSet?.stop();});
test('both import endpoints require read and write and do not leak duplicate metadata without both permissions',async()=>{
 for(const path of ['/api/admin/clients/validate-import','/api/admin/clients/bulk'])for(const permissions of [['clientes.read'],['clientes.write'],['stock.read']])assert.equal((await call(path,{rows:[{Nombre:'QA'}]},permissions)).status,403);
 assert.equal(await Client.countDocuments(),0);
});
test('preview plus commit allows name-only profiles, returns counts and safely replays a batch',async()=>{
 const rows=[{Nombre:'Solo nombre',Contactado:'Sí'}],planned=await call('/api/admin/clients/validate-import',{rows});assert.equal(planned.status,200);assert.equal(planned.body.results[0]._importStatus,'valid');
 const body={rows,batchId:crypto.randomUUID(),previewToken:planned.body.previewToken,selectedRowNumbers:[2]};
 const saved=await call('/api/admin/clients/bulk',body);assert.equal(saved.status,200);assert.equal(saved.body.created,1);
 assert.equal((await call('/api/admin/clients/bulk',body)).body.replayed,true);assert.equal(await Client.countDocuments(),1);
 const client=await Client.findOne();assert.equal(client.contactConfirmed,true);assert.equal(client.lastContactDate,null);
});
test('selected invalid rows reject the entire API mutation and never trust client preview metadata',async()=>{
 const rows=[{Nombre:'Válida'},{Nombre:'Inválida',Moneda:'EUR',_importStatus:'valid',_duplicateId:String(actor._id)}];
 const planned=await call('/api/admin/clients/validate-import',{rows});assert.equal(planned.status,200);assert.equal(planned.body.results[1]._importStatus,'error');
 const saved=await call('/api/admin/clients/bulk',{rows,batchId:crypto.randomUUID(),previewToken:planned.body.previewToken,selectedRowNumbers:[2,3]});assert.equal(saved.status,400);assert.equal(await Client.countDocuments(),0);
});
test('an update requires explicit duplicate policy and a current preview',async()=>{
 const client=await Client.create({fullName:'Original QA',email:'original@example.test',notes:'Conservar'});
 const rows=[{Nombre:'Editado QA',Email:client.email,Notas:''}];
 const planned=await call('/api/admin/clients/validate-import',{rows});assert.equal(planned.body.results[0]._importStatus,'duplicate');
 const update=await call('/api/admin/clients/validate-import',{rows,duplicateMode:'update'});assert.equal(update.body.results[0]._importStatus,'update');
 await Client.updateOne({_id:client._id},{$set:{notes:'Actualización concurrente'}});
 const saved=await call('/api/admin/clients/bulk',{rows,duplicateMode:'update',batchId:crypto.randomUUID(),previewToken:update.body.previewToken});assert.equal(saved.status,409);assert.equal((await Client.findById(client._id)).fullName,'Original QA');
});
