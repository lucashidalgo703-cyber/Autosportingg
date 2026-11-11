import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {once} from 'node:events';
import {access} from 'node:fs/promises';
let mongoose,jwt,replSet,server,base,Client,AdminUser,Run,Doc,actor;
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
 const app=(await import('../../server.js')).default;Client=(await import('../../src/models/Client.js')).default;AdminUser=(await import('../../src/models/AdminUser.js')).default;Run=(await import('../../src/models/ClientImportRun.js')).default;Doc=(await import('../../src/models/ClientDocument.js')).default;const Audit=(await import('../../src/models/AuditLog.js')).default;
 await (await import('../../src/config/db.js')).default();await Promise.all([Client,AdminUser,Run,Doc,Audit].map(Model=>Model.createCollection()));assert.equal(mongoose.connection.host,'127.0.0.1');
 server=app.listen({port:0,host:'127.0.0.1'});await once(server,'listening');base='http://127.0.0.1:'+server.address().port;
},{timeout:300000});
beforeEach(async()=>{await Promise.all([Client,AdminUser,Run,Doc].map(Model=>Model.deleteMany({})));actor=await AdminUser.create({name:'Vendedor QA',email:'qa@example.test',passwordHash:'qa-only',role:'ventas',active:true});});
after(async()=>{globalThis.fetch=nativeFetch;if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}await mongoose?.disconnect();await replSet?.stop();});

const readPermissions=['clientes.read','documentacion.read'];
const writePermissions=[...readPermissions,'clientes.write','documentacion.write'];
async function request(method,path,body,permissions=writePermissions,uploadId){
 const headers={Authorization:'Bearer '+auth(permissions)};if(uploadId)headers['X-Upload-Id']=uploadId;
 if(body && !(body instanceof FormData))headers['Content-Type']='application/json';
 return fetch(base+path,{method,headers,...(body ? {body:body instanceof FormData ? body : JSON.stringify(body)} : {})});
}
const multipart=(count=1,bytes=Buffer.from('<svg>Documento ficticio</svg>'))=>{const form=new FormData();for(let index=0;index<count;index++)form.append('files',new Blob([bytes],{type:'text/html'}),'archivo'+index+'.svg');return form;};
test('metadata and mutations require both client and document permissions before revealing or buffering files',async()=>{
 const client=await Client.create({fullName:'Cliente QA'}),path='/api/admin/clients/'+client._id+'/documents';
 for(const permissions of [['clientes.read'],['documentacion.read'],['clientes.write','documentacion.write']])assert.equal((await request('GET',path,null,permissions)).status,403);
 for(const permissions of [readPermissions,['clientes.read','clientes.write','documentacion.read']])assert.equal((await request('POST',path,multipart(),permissions,crypto.randomUUID())).status,403);
 assert.equal(await Doc.countDocuments(),0);
});
test('five real multipart files upload, list only metadata and download as private attachment with nosniff',async()=>{
 const client=await Client.create({fullName:'Cliente QA'}),path='/api/admin/clients/'+client._id+'/documents',id=crypto.randomUUID();
 const saved=await request('POST',path,multipart(5),writePermissions,id);assert.equal(saved.status,201);const data=await saved.json();assert.equal(data.documents.length,5);
 const list=await request('GET',path,null,readPermissions);assert.equal(list.status,200);assert.match(list.headers.get('cache-control'),/no-store/);
 const listed=await list.json();assert.equal(listed.activeCount,5);for(const document of listed.documents)for(const key of ['data','sha256','uploadBatch'])assert.equal(Object.hasOwn(document,key),false);
 const downloaded=await request('GET',path+'/'+data.documents[0]._id,null,readPermissions);assert.equal(downloaded.status,200);assert.equal(downloaded.headers.get('x-content-type-options'),'nosniff');assert.match(downloaded.headers.get('content-disposition'),/^attachment;/);assert.equal(downloaded.headers.get('content-type'),'application/octet-stream');assert.match(downloaded.headers.get('cache-control'),/no-store/);assert.equal(await downloaded.text(),'<svg>Documento ficticio</svg>');
 const replay=await request('POST',path,multipart(5),writePermissions,id);assert.equal(replay.status,201);assert.equal((await replay.json()).replayed,true);assert.equal(await Doc.countDocuments(),5);
});
test('multipart count, size and unexpected fields reject uploads without any partial documents',async()=>{
 const client=await Client.create({fullName:'Cliente QA'}),path='/api/admin/clients/'+client._id+'/documents';
 assert.equal((await request('POST',path,multipart(6),writePermissions,crypto.randomUUID())).status,400);
 assert.equal((await request('POST',path,multipart(1,Buffer.alloc(5*1024*1024+1)),writePermissions,crypto.randomUUID())).status,400);
 const fields=multipart();fields.append('extra','unexpected');assert.equal((await request('POST',path,fields,writePermissions,crypto.randomUUID())).status,400);assert.equal(await Doc.countDocuments(),0);
});
test('soft delete and restore retain binary, reject mismatched clients and enforce write permission',async()=>{
 const client=await Client.create({fullName:'Cliente QA'}),other=await Client.create({fullName:'Otro QA'}),path='/api/admin/clients/'+client._id+'/documents';
 const saved=await request('POST',path,multipart(),writePermissions,crypto.randomUUID()),document=(await saved.json()).documents[0],url=path+'/'+document._id;
 assert.equal((await request('GET','/api/admin/clients/'+other._id+'/documents/'+document._id,null,readPermissions)).status,404);
 assert.equal((await request('PATCH',url,{deleted:true},readPermissions)).status,403);
 assert.equal((await request('PATCH',url,{deleted:true})).status,200);assert.equal((await request('GET',url,null,readPermissions)).status,404);
 assert.ok((await Doc.findById(document._id).select('+data')).data);
 assert.equal((await request('PATCH',url,{deleted:false})).status,200);assert.equal((await request('GET',url,null,readPermissions)).status,200);
});
