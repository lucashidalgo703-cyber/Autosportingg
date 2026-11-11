import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Client from '../../src/models/Client.js';
import ClientDocument from '../../src/models/ClientDocument.js';
import AuditLog from '../../src/models/AuditLog.js';
import {listClientDocuments,uploadClientDocuments,readClientDocument,setClientDocumentDeleted,clientDocumentDisposition,CLIENT_DOCUMENT_MAX_BYTES} from '../../src/services/clientDocumentService.js';
let replSet,client,other;
const actor={id:String(new mongoose.Types.ObjectId()),username:'qa_documents',role:'owner'};
const file=(name='documento.pdf',data=Buffer.from('%PDF-1.7\nDocumento ficticio'))=>({originalname:name,buffer:data,mimetype:'text/html'});
const upload=(files,id=crypto.randomUUID())=>uploadClientDocuments(String(client._id),files,id,actor);
before(async()=>{
 const {MongoMemoryReplSet}=await import('mongodb-memory-server');
 replSet=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{ip:'127.0.0.1',launchTimeout:180000}]});
 const uri=replSet.getUri('autosporting_docs_test_'+crypto.randomBytes(6).toString('hex'));assert.match(uri,/127\.0\.0\.1/);
 mongoose.set('autoCreate',false);await mongoose.connect(uri);await Promise.all([Client,ClientDocument,AuditLog].map(Model=>Model.createCollection()));
},{timeout:300000});
beforeEach(async()=>{await Promise.all([Client,ClientDocument,AuditLog].map(Model=>Model.deleteMany({})));client=await Client.create({fullName:'Cliente ficticio'});other=await Client.create({fullName:'Otro cliente ficticio'});});
after(async()=>{await mongoose.disconnect();await replSet?.stop();});
test('metadata never contains binary/hash/internal batch; authenticated read preserves exact bytes and audited actor',async()=>{
 const expected=Buffer.from('%PDF-1.7\nArchivo QA');
 const result=await upload([file('archivo QA.pdf',expected)]),doc=result.documents[0];
 assert.equal(doc.contentType,'application/pdf');assert.equal(doc.size,expected.length);
 for(const key of ['data','sha256','uploadBatch','uploadIndex'])assert.equal(Object.hasOwn(doc,key),false,key);
 const list=await listClientDocuments(String(client._id));assert.equal(list.activeCount,1);assert.equal(Object.hasOwn(list.documents[0],'data'),false);
 const raw=await ClientDocument.findById(doc._id).lean();assert.equal(raw.data,undefined);assert.equal(raw.sha256,undefined);assert.equal(raw.uploadBatch,undefined);
 const read=await readClientDocument(String(client._id),doc._id,actor);assert.deepEqual(read.data,expected);
 assert.ok(await AuditLog.exists({action:'CLIENTE_ARCHIVO_DESCARGA',userId:actor.id}));
});
test('filename headers are safe and unknown executable/markup content is attachment octet-stream',async()=>{
 const result=await upload([file('../../folder\\archivo\r\nQA.svg',Buffer.from('<svg><script>QA</script></svg>'))]);
 const doc=result.documents[0];assert.equal(doc.filename,'archivoQA.svg');assert.equal(doc.contentType,'application/octet-stream');
 const disposition=clientDocumentDisposition('prueba\r\n".pdf');assert.ok(disposition.startsWith('attachment;'));assert.ok(!/[\r\n]/.test(disposition));assert.ok(disposition.includes('filename*=UTF-8'));
});
test('delete retains binary and restore is audited; unavailable/mismatched IDs never return a file',async()=>{
 const doc=(await upload([file()])).documents[0];
 await assert.rejects(readClientDocument(String(other._id),doc._id,actor),error=>error.statusCode===404);
 await setClientDocumentDeleted(String(client._id),doc._id,true,actor);
 const stored=await ClientDocument.findById(doc._id).select('+data');assert.ok(stored.data);assert.ok(stored.deletedAt);
 await assert.rejects(readClientDocument(String(client._id),doc._id,actor),error=>error.statusCode===404);
 await setClientDocumentDeleted(String(client._id),doc._id,false,actor);
 assert.equal((await readClientDocument(String(client._id),doc._id,actor)).metadata.deletedAt,null);
 assert.ok(await AuditLog.exists({action:'CLIENTE_ARCHIVO_BAJA'}));assert.ok(await AuditLog.exists({action:'CLIENTE_ARCHIVO_RESTAURADO'}));
});
test('file bounds, active count and restore limits are enforced atomically',async()=>{
 await assert.rejects(upload([file('large.bin',Buffer.alloc(CLIENT_DOCUMENT_MAX_BYTES+1))]),error=>error.statusCode===400);
 await assert.rejects(upload(Array.from({length:6},()=>file())),error=>error.statusCode===400);
 const first=await upload(Array.from({length:5},(_,index)=>file('archivo'+index+'.pdf')));assert.equal(first.documents.length,5);
 await assert.rejects(upload([file('extra.pdf')]),error=>error.statusCode===409);
 const id=first.documents[0]._id;await setClientDocumentDeleted(String(client._id),id,true,actor);await upload([file('nuevo.pdf')]);
 await assert.rejects(setClientDocumentDeleted(String(client._id),id,false,actor),error=>error.statusCode===409);
 assert.equal((await listClientDocuments(String(client._id))).activeCount,5);
 assert.ok((await ClientDocument.findById(id).select('+data')).data);
});
test('same upload retries are idempotent and concurrent uploads cannot exceed five active files',async()=>{
 const id=crypto.randomUUID(),files=[file('reintento.pdf')];
 const results=await Promise.all([upload(files,id),upload(files,id)]);assert.equal(await ClientDocument.countDocuments(),1);assert.ok(results.some(result=>result.replayed));
 await assert.rejects(upload([file('diferente.pdf')],id),error=>error.statusCode===409);
 const race=await Promise.allSettled(Array.from({length:6},(_,index)=>upload([file('paralelo'+index+'.pdf')])));
 assert.equal(race.filter(result=>result.status==='fulfilled').length,4);assert.equal((await listClientDocuments(String(client._id))).activeCount,5);
});
test('audit failure rolls back all binary documents, permitting the same upload ID retry',async t=>{
 const id=crypto.randomUUID();t.mock.method(AuditLog,'create',async()=>{throw Error('QA controlled audit failure');});
 await assert.rejects(upload([file('uno.pdf'),file('dos.pdf')],id),/QA controlled/);t.mock.restoreAll();
 assert.equal(await ClientDocument.countDocuments(),0);assert.equal((await Client.findById(client._id)).__v,0);
 assert.equal((await upload([file('uno.pdf'),file('dos.pdf')],id)).documents.length,2);
 await assert.rejects(listClientDocuments('invalid'),error=>error.statusCode===400);
 await assert.rejects(listClientDocuments(String(new mongoose.Types.ObjectId())),error=>error.statusCode===404);
});
