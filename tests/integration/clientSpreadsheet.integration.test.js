import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Client from '../../src/models/Client.js';
import AdminUser from '../../src/models/AdminUser.js';
import Car from '../../src/models/Car.js';
import AuditLog from '../../src/models/AuditLog.js';
import ClientImportRun from '../../src/models/ClientImportRun.js';
import {previewClientImport,commitClientImport} from '../../src/services/clientSpreadsheetService.js';
import {exportClientRows} from '../../src/utils/clientSpreadsheet.js';
let replSet,seller,car;
const actor={id:String(new mongoose.Types.ObjectId()),username:'qa_import',role:'owner'};
const batch=()=>crypto.randomUUID();
const preview=async(rows,options={})=>({...(await previewClientImport(rows,options)),rows});
const commit=(planned,options={})=>commitClientImport(planned.rows,{batchId:batch(),previewToken:planned.previewToken,...options},actor);
before(async()=>{
 const {MongoMemoryReplSet}=await import('mongodb-memory-server');
 replSet=await MongoMemoryReplSet.create({replSet:{count:1,storageEngine:'wiredTiger',ip:'127.0.0.1',spawn:{windowsHide:true},args:['--wiredTigerCacheSizeGB','0.25','--oplogSize','16']},instanceOpts:[{ip:'127.0.0.1',launchTimeout:180000}]});
 const uri=replSet.getUri('autosporting_import_test_'+crypto.randomBytes(6).toString('hex'));assert.match(uri,/127\.0\.0\.1/);
 mongoose.set('autoCreate',false);await mongoose.connect(uri);
 await Promise.all([Client,AdminUser,Car,AuditLog,ClientImportRun].map(Model=>Model.createCollection()));
},{timeout:300000});
beforeEach(async()=>{
 await Promise.all([Client,AdminUser,Car,AuditLog,ClientImportRun].map(Model=>Model.deleteMany({})));
 seller=await AdminUser.create({name:'Vendedor QA',email:'vendedor@example.test',passwordHash:'qa-only',role:'ventas',active:true});
 car=await Car.create({brand:'Marca QA',name:'Modelo QA',year:2020,km:100,fuel:'Nafta',condition:'Usado',price:20000,currency:'USD'});
});
after(async()=>{await mongoose.disconnect();await replSet?.stop();});
test('name-only clients and full XLSX profiles persist through export and explicit reimport without losing own fields',async()=>{
 const input=[{Nombre:'Solo nombre'},{Nombre:'Cliente ficticio',Nombres:'Cliente',Apellido:'ficticio',WhatsApp:'02975550101',Email:'qa@example.test','DNI/CUIT':'00123456',Tipo:'VIP',Sexo:'Mujer',Domicilio:'Dirección QA',Localidad:'Localidad QA',Provincia:'Provincia QA',Cumpleaños:'05/06/1990',Ocupación:'QA',Interés:'Automático','Vehículo de interés':'Referencia especial','Vehículo de interés ID':String(car._id),Vendedor:seller.name,'Vendedor ID':String(seller._id),Etapa:'Cerrado',Contactado:'No',Origen:'Facebook',Captación:'Puerta','Relación comercial':'Ambos',Estado:'Activo','No contactar':'Sí','Forma de compra':'Financiación','Cuándo compra':'En 1 a 3 meses','Dinero para entregar':0,'Moneda entrega':'USD','Tiene permuta':'Sí','Marca interés':'Marca QA','Modelo interés':'Modelo QA','Año desde':2010,'Año hasta':2020,'Presupuesto máximo':0,'Moneda presupuesto':'ARS','Último contacto':'01/11/2026','Fecha alta':'09/11/2026','Próxima acción':'Revisar opciones','Próxima fecha':'01/12/2026',Notas:'Nota QA',Etiquetas:'["QA"]'}];
 const initial=await preview(input);assert.ok(initial.results.every(row=>row._importStatus==='valid'),JSON.stringify(initial.results));
 const first=await commit(initial);assert.equal(first.created,2);
 const stored=await Client.findOne({fullName:'Cliente ficticio'}).lean();
 assert.equal(stored.contactConfirmed,false);assert.equal(stored.pipelineStage,'cerrado');assert.equal(stored.maxBudget,0);assert.equal(stored.downPaymentCurrency,'USD');assert.equal(stored.currency,'ARS');assert.equal(stored.dniCuit,'00123456');
 const roundtrip=await preview(exportClientRows([stored]),{duplicateMode:'update',blankMode:'clear'});
 assert.equal(roundtrip.results[0]._importStatus,'update',JSON.stringify(roundtrip.results[0]));
 await commit(roundtrip,{duplicateMode:'update',blankMode:'clear'});
 const loaded=await Client.findById(stored._id).lean();
 for(const key of ['fullName','firstName','lastName','phone','email','dniCuit','segment','gender','address','locality','province','occupation','description','vehicleOfInterest','pipelineStage','contactConfirmed','source','reason','type','status','doNotContact','purchaseMethod','purchaseTiming','availableDownPayment','downPaymentCurrency','tradeInIntent','brand','model','yearFrom','yearTo','maxBudget','currency','nextAction','notes','tags'])assert.deepEqual(loaded[key],stored[key],key);
 for(const key of ['createdAt','birthDate','lastContactDate','nextActionDate'])assert.equal(loaded[key].toISOString(),stored[key].toISOString(),key);
 assert.equal(String(loaded.assignedTo),String(stored.assignedTo));assert.equal(String(loaded.interestedVehicleId),String(stored.interestedVehicleId));
});
test('duplicates default to skip; explicit update preserves omitted/blank fields and can clear optional cells deliberately',async()=>{
 const client=await Client.create({fullName:'Existente QA',email:'existente@example.test',phone:'02975550102',notes:'Conservar',pipelineStage:'cerrado',contactConfirmed:true});
 const rows=[{Nombre:'Nombre corregido',Email:client.email,Notas:''}];
 const skip=await preview(rows);assert.equal(skip.results[0]._importStatus,'duplicate');
 const keep=await preview(rows,{duplicateMode:'update'});await commit(keep,{duplicateMode:'update'});
 let loaded=await Client.findById(client._id);assert.equal(loaded.notes,'Conservar');assert.equal(loaded.pipelineStage,'cerrado');
 const clear=await preview(rows,{duplicateMode:'update',blankMode:'clear'});await commit(clear,{duplicateMode:'update',blankMode:'clear'});
 loaded=await Client.findById(client._id);assert.equal(loaded.notes,'');assert.equal(loaded.phone,client.phone);assert.equal(loaded.contactConfirmed,true);
});
test('conflicting identities, repeated rows and invalid fields block selected writes atomically',async()=>{
 const a=await Client.create({fullName:'A QA',email:'a@example.test'}),b=await Client.create({fullName:'B QA',dniCuit:'123-45'});
 const planned=await preview([{Nombre:'Nueva válida'},{Nombre:'Conflicto','Cliente ID':String(a._id),'DNI':'12345'},{Nombre:'Mala',Etapa:'No existe'}],{duplicateMode:'update'});
 assert.equal(planned.results[1]._importStatus,'error');assert.match(planned.results[1]._importMessage,/fichas diferentes/);
 await assert.rejects(commit(planned,{duplicateMode:'update'}),error=>error.statusCode===400);
 assert.equal(await Client.countDocuments(),2);assert.equal((await Client.findById(b._id)).fullName,'B QA');
 const repeated=await preview([{Nombre:'Primera',Email:'dos@example.test'},{Nombre:'Segunda',Email:'dos@example.test'}]);assert.equal(repeated.results[1]._importStatus,'error');
});
test('stale preview, unknown columns and ambiguous assignees require review instead of silent changes',async()=>{
 const client=await Client.create({fullName:'Cliente QA',email:'stale@example.test',notes:'Inicial'});
 const planned=await preview([{Nombre:'Editado QA',Email:client.email}],{duplicateMode:'update'});
 await Client.updateOne({_id:client._id},{$set:{notes:'Otro cambio'}});
 await assert.rejects(commit(planned,{duplicateMode:'update'}),error=>error.statusCode===409);
 const unknown=await preview([{Nombre:'Nuevo QA',Inesperado:'No ignorar silenciosamente'}]);
 await assert.rejects(commit(unknown),error=>error.statusCode===400);
 await commit(unknown,{acceptedUnknownColumns:true});
 await AdminUser.create({name:seller.name,email:'segundo@example.test',passwordHash:'qa-only',role:'ventas',active:true});
 const ambiguous=await preview([{Nombre:'Otra QA',Vendedor:seller.name}]);assert.equal(ambiguous.results[0]._importStatus,'error');
});
test('the same batch is idempotent under concurrent retries and separate imports serialize identity checks',async()=>{
 const planned=await preview([{Nombre:'Concurrente QA',Email:'concurrente@example.test'}]);
 const config={batchId:batch(),previewToken:planned.previewToken};
 const results=await Promise.all([commitClientImport(planned.rows,config,actor),commitClientImport(planned.rows,config,actor)]);
 assert.equal(await Client.countDocuments(),1);assert.ok(results.some(result=>result.replayed));
 await assert.rejects(commitClientImport([{Nombre:'Otro archivo'}],config,actor),error=>error.statusCode===409);
 const other=await preview([{Nombre:'Otra concurrente',Email:'otra@example.test'}]);
 const race=await Promise.allSettled([commit(other),commit(other)]);
 assert.equal(race.filter(result=>result.status==='fulfilled').length,1);assert.equal(await Client.countDocuments({email:'otra@example.test'}),1);
});
test('a late write failure rolls the entire batch back and its same idempotency key can retry',async t=>{
 const planned=await preview([{Nombre:'Fila uno'},{Nombre:'Fila dos'}]),key=batch();
 t.mock.method(AuditLog,'create',async()=>{throw Error('QA controlled audit failure');});
 await assert.rejects(commitClientImport(planned.rows,{batchId:key,previewToken:planned.previewToken},actor),/QA controlled/);t.mock.restoreAll();
 assert.equal(await Client.countDocuments(),0);assert.equal(await ClientImportRun.countDocuments({owner:actor.id}),0);
 const retry=await commitClientImport(planned.rows,{batchId:key,previewToken:planned.previewToken},actor);assert.equal(retry.created,2);
});
test('explicit contact declaration never invents a date or erases existing history, and entry date changes persist',async()=>{
 const client=await Client.create({fullName:'Con historia QA',email:'history@example.test',pipelineStage:'cerrado',lastContactDate:'2026-11-01T00:00:00Z',interactions:[{type:'nota',note:'Historia QA'}]});
 const planned=await preview([{Nombre:client.fullName,Email:client.email,Contactado:'No','Fecha alta':'02/01/2020'}],{duplicateMode:'update'});
 await commit(planned,{duplicateMode:'update'});
 const loaded=await Client.findById(client._id);
 assert.equal(loaded.contactConfirmed,false);assert.equal(loaded.pipelineStage,'cerrado');assert.equal(loaded.interactions.length,1);assert.equal(loaded.lastContactDate.toISOString(),client.lastContactDate.toISOString());assert.equal(loaded.createdAt.toISOString(),'2020-01-02T03:00:00.000Z');
 const noDate=await preview([{Nombre:'Declaración sin fecha',Contactado:'Sí'}]);await commit(noDate);
 assert.equal((await Client.findOne({fullName:'Declaración sin fecha'})).lastContactDate,null);
});

test('reconstructing an exported legacy response preserves effective contact without importing history or fabricating a date',async()=>{
 const original=await Client.create({fullName:'Legado QA',pipelineStage:'sin_contactar',contactConfirmed:null,interactions:[{type:'llamada',note:'Respuesta QA',outboundNoReply:false}]});
 const rows=exportClientRows([original.toObject()]);await Client.deleteOne({_id:original._id});
 const planned=await preview(rows);await commit(planned);
 const reconstructed=await Client.findOne({fullName:'Legado QA'});assert.equal(reconstructed.contactConfirmed,true);assert.equal(reconstructed.lastContactDate,null);assert.equal(reconstructed.interactions.length,0);
});
