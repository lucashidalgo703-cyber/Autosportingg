import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import AdminUser from '../models/AdminUser.js';
import ClientImportRun from '../models/ClientImportRun.js';
import AuditLog from '../models/AuditLog.js';
import {normalizeClientCommercialInput} from './clientCommercialService.js';
import {parseClientSpreadsheetRows,CLIENT_SPREADSHEET_COLUMNS} from '../utils/clientSpreadsheet.js';
import {normalizePhoneToWhatsApp} from '../utils/phoneNormalizer.js';
import {saleCalendarKey} from '../utils/saleCalendarDate.js';
const fail=(statusCode,message,extra={})=>Object.assign(new Error(message),{statusCode,...extra});
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fold=value=>String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const label=field=>CLIENT_SPREADSHEET_COLUMNS.find(column=>column.field===field)?.header || field;
const blank=value=>value === '' || value === null || value === undefined || Array.isArray(value) && !value.length;
const enumNonblank=new Set(['type','source','status','reason','currency','segment','pipelineStage']);
function settings(options={}) {
 const duplicateMode=options.duplicateMode || 'skip',blankMode=options.blankMode || 'preserve';
 if(!['skip','update'].includes(duplicateMode) || !['preserve','clear'].includes(blankMode))throw fail(400,'Revisá las opciones de duplicados y celdas vacías.');
 return {duplicateMode,blankMode};
}
function source(rows) {
 if(!Array.isArray(rows) || !rows.length)throw fail(400,'Seleccioná un archivo con filas de clientes.');
 if(rows.length>1000)throw fail(400,'Esta importación admite hasta 1000 filas. Dividí el archivo; se recomiendan menos de 500 por carga.');
 return parseClientSpreadsheetRows(rows);
}
function identities(values) {
 const out=[];
 if(values._clientId)out.push('id:'+values._clientId);
 if(values.phone)out.push('phone:'+normalizePhoneToWhatsApp(values.phone).replace(/\D/g,''));
 if(values.email)out.push('email:'+fold(values.email));
 if(values.dniCuit)out.push('dni:'+String(values.dniCuit).replace(/[^a-z0-9]/gi,'').toLowerCase());
 return out.filter(item=>!item.endsWith(':'));
}
async function planImport(rows,options={},session=null) {
 const config=settings(options),parsed=source(rows),conditions=[];
 for(const row of parsed.rows){
  const values=row.values;
  if(values._clientId && !mongoose.isValidObjectId(values._clientId))row.errors._clientId='Cliente ID no es válido.';
  if(values._clientId && mongoose.isValidObjectId(values._clientId))conditions.push({_id:values._clientId});
  if(values.phone)conditions.push({phoneNormalized:normalizePhoneToWhatsApp(values.phone).replace(/\D/g,'')});
  if(values.email)conditions.push({emailNormalized:fold(values.email)});
  if(values.dniCuit){const compact=String(values.dniCuit).replace(/[^a-z0-9]/gi,'');if(compact)conditions.push({dniCuit:new RegExp('^[^a-z0-9]*'+compact.split('').join('[^a-z0-9]*')+'[^a-z0-9]*$','i')});}
 }
 const existing=conditions.length ? await Client.find({$or:conditions}).session(session).lean() : [];
 const byIdentity=new Map();
 for(const client of existing)for(const key of identities({...client,_clientId:String(client._id)})){const list=byIdentity.get(key) || [];list.push(client);byIdentity.set(key,list);}
 const users=await AdminUser.find({active:true}).select('_id name email').session(session).lean();
 const seen=new Set(),results=[];
 for(const row of parsed.rows) {
  const values={...row.values},errors={...row.errors};
  const keys=identities(values),candidates=new Map();
  for(const key of keys)for(const candidate of byIdentity.get(key) || [])candidates.set(String(candidate._id),candidate);
  const duplicateInFile=keys.some(key=>seen.has(key));for(const key of keys)seen.add(key);
  if(duplicateInFile)errors.fila='La identidad aparece más de una vez en este archivo. Revisá las filas; no se fusionan.';
  if(candidates.size>1)errors.identidad='El ID, teléfono, email o DNI corresponden a fichas diferentes. No se fusionarán.';
  const current=candidates.size===1 ? [...candidates.values()][0] : null;
  const updating=current && config.duplicateMode==='update';
  const payload={...values};delete payload._clientId;delete payload.assignedToName;delete payload._effectiveContacted;
  // A new reconstruction has no legacy interactions. Preserve the exported
  // effective contact as a declaration, without inventing its date/history.
  if(!current && payload.contactConfirmed==null && typeof values._effectiveContacted==='boolean')payload.contactConfirmed=values._effectiveContacted;
  if(updating && config.blankMode==='preserve')for(const key of Object.keys(payload))if(blank(payload[key]))delete payload[key];
  for(const key of enumNonblank)if(blank(payload[key]))delete payload[key];
  if(payload.createdAt === '' || payload.createdAt == null || current && payload.createdAt===saleCalendarKey({createdAt:current.createdAt}))delete payload.createdAt;
  if(payload.downPaymentCurrency==null && !Object.hasOwn(payload,'availableDownPayment'))delete payload.downPaymentCurrency;
  if(Object.hasOwn(payload,'assignedTo') && payload.assignedTo==='')payload.assignedTo=null;
  if(!values.assignedTo && values.assignedToName && !(updating && config.blankMode==='preserve' && blank(values.assignedToName))){
   const name=fold(values.assignedToName);
   if(['sin asignar','sin vendedor'].includes(name))payload.assignedTo=null;
   else {
    const matches=users.filter(member=>fold(member.name)===name || fold(member.email)===name);
    if(matches.length!==1)errors.assignedTo=matches.length ? 'Hay más de un vendedor con ese nombre. Usá Vendedor ID.' : 'Vendedor no encontrado. Usá un integrante activo o dejá la celda vacía.';
    else payload.assignedTo=String(matches[0]._id);
   }
  }
  if(Object.hasOwn(payload,'interestedVehicleId') && payload.interestedVehicleId==='')payload.interestedVehicleId=null;
  let normalized={};
  if(!Object.keys(errors).length)try{
   normalized=await normalizeClientCommercialInput(payload,current);
   if(Object.hasOwn(payload,'vehicleOfInterest'))normalized.vehicleOfInterest=String(payload.vehicleOfInterest).trim();
   if(!String(normalized.fullName || current?.fullName || '').trim())errors.fullName='Nombre es obligatorio.';
   if(Object.hasOwn(payload,'contactConfirmed'))normalized.contactConfirmed=payload.contactConfirmed;
   const checked=new Client({...current,...normalized});
   await checked.validate();
  }catch(error){errors.validacion=error.message || 'Revisá los datos de esta fila.';}
  const status=Object.keys(errors).length ? 'error' : current && config.duplicateMode==='skip' ? 'duplicate' : current ? 'update' : 'valid';
  const changed=Object.keys(normalized).filter(key=>JSON.stringify(normalized[key])!==JSON.stringify(current?.[key])).map(label);
  results.push({rowNumber:row.rowNumber,...values,_importStatus:status,_importMessage:status==='error' ? Object.values(errors).join(' ') : status==='duplicate' ? 'Ficha existente: se omitirá según la opción elegida.' : status==='update' ? 'Se actualizarán solo las columnas importadas.' : 'Nueva ficha.',_errors:errors,_duplicateId:current ? String(current._id) : null,_matchedName:current?.fullName || '',_changedFields:changed,_version:current?.updatedAt?.toISOString() || null,_values:normalized});
 }
 const previewToken=hash(results.map(row=>({row:row.rowNumber,status:row._importStatus,id:row._duplicateId,version:row._version,values:row._values,errors:row._errors})));
 return {results,previewToken,unknownHeaders:parsed.unknownHeaders,options:config};
}
function publicPlan(plan){return {...plan,results:plan.results.map(({_values,...row})=>row)};}
export async function previewClientImport(rows,options={}) {return publicPlan(await planImport(rows,options));}
export async function commitClientImport(rows,options={},actor={}) {
 const config=settings(options);
 source(rows);
 if(options.selectedRowNumbers!==undefined && !Array.isArray(options.selectedRowNumbers))throw fail(400,'La selección de filas debe ser una lista.');
 const owner=String(actor.id || actor.username || '');
 if(!owner)throw fail(401,'No se pudo identificar la sesión.');
 const batchId=options.batchId || crypto.randomUUID();
 if(typeof batchId!=='string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(batchId))throw fail(400,'La identificación de la importación no es válida.');
 const runId=owner+':'+batchId,inputHash=hash({rows,...config,selected:options.selectedRowNumbers || null,unknownAccepted:options.acceptedUnknownColumns===true});
 const saved=await ClientImportRun.findById(runId).lean();
 if(saved){if(saved.payloadHash!==inputHash)throw fail(409,'Esta identificación ya corresponde a otro archivo u opciones. Volvé a validar.');return {...saved.result,replayed:true};}
 try{await ClientImportRun.updateOne({_id:'__clients_import_mutex'},{$setOnInsert:{version:0,owner:'system'}},{upsert:true});}catch(error){if(error.code!==11000)throw error;}
 const session=await mongoose.startSession();let output;
 try{
  await session.withTransaction(async()=>{
   await ClientImportRun.updateOne({_id:'__clients_import_mutex'},{$inc:{version:1}},{session});
   const prior=await ClientImportRun.findById(runId).session(session).lean();
   if(prior){if(prior.payloadHash!==inputHash)throw fail(409,'La identificación ya fue usada con otros datos.');output={...prior.result,replayed:true};return;}
   const plan=await planImport(rows,config,session);
   if(plan.unknownHeaders.length && options.acceptedUnknownColumns!==true)throw fail(400,'Hay columnas no reconocidas. Confirmá cuáles se omiten antes de importar.',{unknownHeaders:plan.unknownHeaders});
   if(options.previewToken && options.previewToken!==plan.previewToken)throw fail(409,'Las fichas cambiaron desde la vista previa. Validá nuevamente antes de confirmar.',publicPlan(plan));
   const selected=options.selectedRowNumbers ? new Set(options.selectedRowNumbers) : null;
   if(selected && [...selected].some(number=>!Number.isInteger(number) || !plan.results.some(row=>row.rowNumber===number)))throw fail(400,'La selección de filas no es válida.');
   const chosen=plan.results.filter(row=>!selected || selected.has(row.rowNumber));
   if(chosen.some(row=>row._importStatus==='error'))throw fail(400,'Las filas seleccionadas contienen errores. No se guardó ninguna ficha.',publicPlan(plan));
   const actionable=chosen.filter(row=>['valid','update'].includes(row._importStatus));
   if(!actionable.length)throw fail(400,'No hay filas nuevas o actualizaciones seleccionadas.');
   let created=0,updated=0;
   for(const row of actionable){
    const current=row._duplicateId ? await Client.findById(row._duplicateId).session(session) : null;
    const client=current || new Client({createdBy:owner});
    const previousAssignee=String(current?.assignedTo || '');
    client.set(row._values);
    if(Object.hasOwn(row._values,'assignedTo') && previousAssignee!==String(row._values.assignedTo || ''))client.assignedAt=new Date();
    client.clientAuditLog.push({action:current ? 'ACTUALIZACION_XLSX' : 'CREACION_XLSX',details:'Importación explícita; '+(current ? 'actualización de columnas presentes' : 'alta de ficha')+'. Sin rotación ni mensajes automáticos.',user:String(actor.username || owner),source:'XLSX'});
    await client.save({session});
    if(current && row._values.createdAt)await Client.collection.updateOne({_id:client._id},{$set:{createdAt:row._values.createdAt}},{session});
    if(current)updated++;else created++;
   }
   output={ok:true,count:created+updated,created,updated,skipped:plan.results.length-created-updated,batchId};
   await AuditLog.create([{userId:owner,userName:actor.username || actor.name || '',userRole:actor.role,action:'IMPORTACION_MASIVA',module:'clientes',entityType:'Client',description:'Importación XLSX de clientes: '+created+' altas y '+updated+' actualizaciones.',metadata:{created,updated,skipped:output.skipped,duplicateMode:config.duplicateMode,blankMode:config.blankMode}}],{session});
   await ClientImportRun.create([{_id:runId,owner,payloadHash:inputHash,result:output}],{session});
  });
  return output;
 }finally{await session.endSession();}
}
