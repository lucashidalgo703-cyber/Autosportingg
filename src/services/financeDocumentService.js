import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import FinanceDocument from '../models/FinanceDocument.js';
import AuditLog from '../models/AuditLog.js';
export const FINANCE_DOCUMENT_LIMIT=5;
export const FINANCE_DOCUMENT_MAX_BYTES=15*1024*1024;
const fail=(statusCode,message)=>Object.assign(new Error(message),{statusCode});
function validId(value){if(typeof value!=='string' || !mongoose.isValidObjectId(value))throw fail(400,'El movimiento o archivo no es válido.');}
function actorId(actor){const value=String(actor.id || actor.userId || actor.username || '');if(!value)throw fail(401,'No se pudo identificar la sesión.');return value;}
async function exists(transactionId,session=null){validId(transactionId);if(!await Transaction.exists({_id:transactionId}).session(session))throw fail(404,'El movimiento no existe.');}
const metadata=doc=>({_id:String(doc._id),transactionId:String(doc.transactionId),filename:doc.filename,contentType:doc.contentType,size:doc.size,createdAt:doc.createdAt,createdByName:doc.createdByName || '',deletedAt:doc.deletedAt || null});
const audit=(actor,action,transactionId,documents,session)=>AuditLog.create([{userId:actorId(actor),userName:String(actor.username || actor.name || ''),userRole:actor.role,action,module:'finanzas',entityType:'FinanceDocument',entityId:String(transactionId),description:action==='FINANZAS_ARCHIVO_DESCARGA' ? 'Descarga autenticada de archivo de movimiento.' : 'Gestión de archivos privados del movimiento.',metadata:{transactionId:String(transactionId),documentIds:documents.map(doc=>String(doc._id))}}],session ? {session} : undefined);
function safeFilename(name){
 let value=String(name || 'archivo').split(/[\\/]/).at(-1).normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,180);
 if(!value || /^\.+$/.test(value))value='archivo';
 return value;
}
function contentType(buffer,name){
 if(buffer.subarray(0,5).toString()==='%PDF-')return 'application/pdf';
 if(buffer.length>=8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(buffer.length>=3 && buffer[0]===255 && buffer[1]===216 && buffer[2]===255)return 'image/jpeg';
 if(buffer.subarray(0,4).toString()==='RIFF' && buffer.subarray(8,12).toString()==='WEBP')return 'image/webp';
 if(buffer.subarray(0,4).equals(Buffer.from([80,75,3,4])) && /\.docx$/i.test(name))return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 if(buffer.subarray(0,4).equals(Buffer.from([80,75,3,4])) && /\.xlsx$/i.test(name))return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
 return 'application/octet-stream';
}
function normalizeFiles(files){
 if(!Array.isArray(files) || !files.length || files.length>FINANCE_DOCUMENT_LIMIT)throw fail(400,'Seleccioná entre 1 y 5 archivos.');
 return files.map((file,index)=>{
  const data=file.buffer;
  if(!Buffer.isBuffer(data) || !data.length || data.length>FINANCE_DOCUMENT_MAX_BYTES)throw fail(400,'Cada archivo debe tener contenido y pesar hasta 15 MB.');
  const filename=safeFilename(file.originalname);
  return {filename,size:data.length,contentType:contentType(data,filename),data,sha256:crypto.createHash('sha256').update(data).digest('hex'),uploadIndex:index};
 });
}
async function lockTransaction(transactionId,session){
 const locked=await Transaction.updateOne({_id:transactionId},{$inc:{__v:1}},{session,timestamps:false});
 if(locked.matchedCount!==1)throw fail(404,'El movimiento no existe.');
}
export async function listFinanceDocuments(transactionId){
 await exists(transactionId);
 const documents=await FinanceDocument.find({transactionId}).select('_id transactionId filename contentType size createdAt createdByName deletedAt').sort({createdAt:-1,_id:-1}).lean();
 return {documents:documents.map(metadata),activeCount:documents.filter(doc=>!doc.deletedAt).length,maxFiles:FINANCE_DOCUMENT_LIMIT,maxBytes:FINANCE_DOCUMENT_MAX_BYTES};
}
export async function findCommittedFinanceDocumentUpload(transactionId,uploadId,actor={},manifest){
 await exists(transactionId);const owner=actorId(actor);
 if(typeof uploadId!=='string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(uploadId))throw fail(400,'La identificación de la carga no es válida.');
 const previous=await FinanceDocument.find({transactionId,uploadBatch:owner+':'+uploadId}).select('_id transactionId filename contentType size createdAt createdByName deletedAt uploadIndex +sha256').sort({uploadIndex:1}).lean();
 if(!previous.length)return null;
 if(manifest!==undefined && (!Array.isArray(manifest) || previous.length!==manifest.length || previous.some((doc,index)=>doc.sha256!==manifest[index]?.fileSha256 || doc.filename!==safeFilename(manifest[index]?.fileName) || doc.size!==manifest[index]?.fileSize)))throw fail(409,'Esta carga corresponde a otros archivos. Seleccioná los archivos nuevamente.');
 return {documents:previous.map(metadata),replayed:true};
}
export async function uploadFinanceDocuments(transactionId,files,uploadId,actor={}){
 await exists(transactionId);
 const owner=actorId(actor),normalized=normalizeFiles(files);
 if(typeof uploadId!=='string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(uploadId))throw fail(400,'La identificación de la carga no es válida.');
 const uploadBatch=owner+':'+uploadId;
 const session=await mongoose.startSession();let result;
 try{
  await session.withTransaction(async()=>{
   await exists(transactionId,session);await lockTransaction(transactionId,session);
   const previous=await FinanceDocument.find({transactionId,uploadBatch}).select('+sha256').session(session).sort({uploadIndex:1});
   if(previous.length){
    if(previous.length!==normalized.length || previous.some((doc,index)=>doc.sha256!==normalized[index].sha256 || doc.filename!==normalized[index].filename))throw fail(409,'Esta carga corresponde a otros archivos. Seleccioná los archivos nuevamente.');
    result={documents:previous.map(metadata),replayed:true};return;
   }
   const count=await FinanceDocument.countDocuments({transactionId,deletedAt:null}).session(session);
   if(count+normalized.length>FINANCE_DOCUMENT_LIMIT)throw fail(409,'El movimiento admite hasta 5 archivos activos. Eliminá uno antes de agregar otro.');
   const documents=await FinanceDocument.create(normalized.map(file=>({...file,transactionId,uploadBatch,createdBy:owner,createdByName:String(actor.username || actor.name || '')})),{session,ordered:true});
   await audit(actor,'FINANZAS_ARCHIVOS_ALTA',transactionId,documents,session);
   result={documents:documents.map(metadata),replayed:false};
  });
  return result;
 }finally{await session.endSession();}
}
export async function readFinanceDocument(transactionId,documentId,actor={}){
 await exists(transactionId);validId(documentId);
 const document=await FinanceDocument.findOne({_id:documentId,transactionId,deletedAt:null}).select('+data').lean();
 if(!document)throw fail(404,'El archivo no está disponible.');
 await audit(actor,'FINANZAS_ARCHIVO_DESCARGA',transactionId,[document]);
 return {metadata:metadata(document),data:document.data?.buffer && !Buffer.isBuffer(document.data) ? Buffer.from(document.data.buffer) : Buffer.from(document.data)};
}
export async function setFinanceDocumentDeleted(transactionId,documentId,deleted,actor={}){
 await exists(transactionId);validId(documentId);const owner=actorId(actor);
 if(typeof deleted!=='boolean')throw fail(400,'Indicá si querés eliminar o restaurar el archivo.');
 const session=await mongoose.startSession();let result;
 try{
  await session.withTransaction(async()=>{
   await exists(transactionId,session);await lockTransaction(transactionId,session);
   const document=await FinanceDocument.findOne({_id:documentId,transactionId}).session(session);
   if(!document)throw fail(404,'El archivo no existe.');
   if(Boolean(document.deletedAt)===deleted){result={document:metadata(document)};return;}
   if(!deleted && await FinanceDocument.countDocuments({transactionId,deletedAt:null}).session(session)>=FINANCE_DOCUMENT_LIMIT)throw fail(409,'Ya hay 5 archivos activos. Eliminá uno antes de restaurar.');
   document.deletedAt=deleted ? new Date() : null;document.deletedBy=deleted ? owner : null;
   await document.save({session});
   await audit(actor,deleted ? 'FINANZAS_ARCHIVO_BAJA' : 'FINANZAS_ARCHIVO_RESTAURADO',transactionId,[document],session);
   result={document:metadata(document)};
  });
  return result;
 }finally{await session.endSession();}
}
export function financeDocumentDisposition(filename){
 const safe=safeFilename(filename),fallback=safe.replace(/[^a-zA-Z0-9._ -]/g,'_').replace(/"/g,'_');
 const encoded=encodeURIComponent(safe).replace(/['()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase());
 return 'attachment; filename="'+fallback+'"; filename*=UTF-8\'\''+encoded;
}
