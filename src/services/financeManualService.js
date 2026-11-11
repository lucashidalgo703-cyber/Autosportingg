import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Entry from '../models/FinanceManualEntry.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Client from '../models/Client.js';
import Sale from '../models/Sale.js';
import AuditLog from '../models/AuditLog.js';
import {clientCalendarKey} from '../utils/clientCommercial.js';
const fail=(statusCode,message)=>{throw Object.assign(new Error(message),{statusCode});};
const actorId=actor=>String(actor?.id||actor?.userId||actor?._id||'');
const actorName=actor=>actor?.username||actor?.name||actor?.role||'CRM';
const validId=value=>/^[a-f\d]{24}$/i.test(String(value||''));
const text=(value,max)=>{if(typeof value!=='string'&&value!=null)fail(400,'El texto no es válido.');const result=String(value||'').trim();if(result.length>max)fail(400,'El texto supera el límite permitido.');return result;};
let setup;
const prepare=()=>setup||=Promise.all([Entry.createCollection(),Transaction.createCollection(),AuditLog.createCollection()]).then(()=>Entry.createIndexes()).catch(error=>{setup=null;throw error;});
export const prepareFinanceManualStorage=prepare;
function normalize(kind,payload){
 if(!['deposit','payable'].includes(kind))fail(400,'Fuente financiera no válida.');
 const allowed=kind==='deposit'?['Recibida','Aplicada','Devuelta']:['Pendiente','Disponible','Pagado'];
 const amount=Number(payload.amount),date=clientCalendarKey(payload.date),status=payload.status;
 if(!allowed.includes(status)||!Number.isFinite(amount)||amount<=0||!['ARS','USD'].includes(payload.currency)||!date||!text(payload.label,500))fail(400,'Revisá descripción, estado, importe, moneda y fecha.');
 const data={kind,label:text(payload.label,500),status,amount,currency:payload.currency,date:new Date(date+'T03:00:00Z'),clientName:text(payload.clientName,300),clientPhone:text(payload.clientPhone,100),notes:text(payload.notes,5000)};
 for(const key of ['accountId','clientId','saleId']){if(payload[key]&&!validId(payload[key]))fail(400,'El vínculo no es válido.');data[key]=payload[key]?String(payload[key]):null;}
 return data;
}
async function checkLinks(data,session){
 if(data.clientId&&!await Client.exists({_id:data.clientId}).session(session))fail(404,'El cliente vinculado no existe.');
 if(data.saleId){const sale=await Sale.findById(data.saleId).select('status historicalOnly').session(session).lean();if(!sale)fail(404,'La operación vinculada no existe.');if(sale.status==='borrador'||sale.historicalOnly===true)fail(409,'Vinculá una venta operativa; las cargas históricas y los borradores no generan caja actual.');}
 if(data.accountId&&!await Account.exists({_id:data.accountId,isActive:true,currency:data.currency}).session(session))fail(400,'Elegí una cuenta activa en la misma moneda.');
}
async function postLedger(entry,actor,session){
 const monetary=entry.kind==='deposit'&&['Recibida','Devuelta'].includes(entry.status)||entry.kind==='payable'&&entry.status==='Pagado';
 if(!monetary||!entry.accountId)return;
 const type=entry.kind==='deposit'&&entry.status==='Recibida'?'Ingreso':'Egreso';
 const account=await Account.findOneAndUpdate({_id:entry.accountId,isActive:true,currency:entry.currency},{$inc:{balance:type==='Ingreso'?entry.amount:-entry.amount},$set:{updatedAt:new Date()}},{session,new:true});
 if(!account)fail(400,'La cuenta dejó de estar activa o cambió de moneda.');
 const [transaction]=await Transaction.create([{type,amount:entry.amount,currency:entry.currency,description:entry.label,category:entry.kind==='deposit'?'Seña / Reserva':'Pago al propietario',date:entry.date,accountId:entry.accountId,module:'crm_v2',source:'manual',concept:entry.kind==='deposit'?'finance_manual_deposit':'finance_manual_payable',notes:entry.notes,clientId:entry.clientId,saleId:entry.saleId,financeManualEntryId:entry._id,status:'activo',createdBy:actorName(actor),idempotencyKey:'finance-entry:'+entry._id,transactionAuditLog:[{action:'CREACION',user:actorName(actor),details:'Registro manual explícito con cuenta; no duplica una fuente de venta o reserva.'}]}],{session});
 entry.transactionId=transaction._id;
}
async function audit(entry,actor,action,session){await AuditLog.create([{userId:actorId(actor),userName:actorName(actor),userRole:actor?.role,action,module:'finanzas',entityType:'FinanceManualEntry',entityId:String(entry._id),description:entry.label,metadata:{kind:entry.kind,status:entry.status,transactionId:entry.transactionId||null}}],{session});}
const view=entry=>{const result=entry.toObject?entry.toObject():{...entry};delete result.payloadHash;delete result.idempotencyKey;const transactionStatus=result.transactionId?.status||(result.transactionId?'activo':null);if(result.transactionId?._id)result.transactionId=result.transactionId._id;return {...result,source:'manual',transactionStatus,affectsCash:Boolean(result.transactionId)&&transactionStatus==='activo'};};
export async function listFinanceManualEntries(kind){if(!['deposit','payable'].includes(kind))fail(400,'Fuente no válida.');return {items:(await Entry.find({kind}).populate('transactionId','status').sort({date:-1,createdAt:-1}).limit(2000).lean()).map(view)};}
export async function createFinanceManualEntry(kind,payload,actor,key,options={}){
 const data=normalize(kind,payload),owner=actorId(actor);if(!owner||!/^[\w-]{8,120}$/.test(String(key||'')))fail(400,'La operación requiere un identificador de reintento válido.');
 const payloadHash=crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');await prepare();let result,replayed=false;
 const perform=async session=>{
  const existing=await Entry.findOne({createdBy:owner,idempotencyKey:key}).session(session);if(existing){if(existing.payloadHash!==payloadHash)fail(409,'El identificador ya se usó con otros datos.');result=existing;replayed=true;return;}
  await checkLinks(data,session);const entry=new Entry({...data,createdBy:owner,updatedBy:actorName(actor),idempotencyKey:key,payloadHash});await postLedger(entry,actor,session);await entry.save({session});await audit(entry,actor,'CREACION_MANUAL',session);result=entry;
 };
 if(options.session){await perform(options.session);return {item:view(result),replayed};}
 const run=async()=>mongoose.connection.transaction(perform);
 try{await run();}catch(error){if(error.code!==11000)throw error;const existing=await Entry.findOne({createdBy:owner,idempotencyKey:key});if(!existing||existing.payloadHash!==payloadHash)fail(409,'El identificador ya se usó con otros datos.');result=existing;replayed=true;}
 return {item:view(result),replayed};
}
export async function updateFinanceManualEntry(kind,entryId,payload,actor){
 if(!validId(entryId))fail(400,'El identificador no es válido.');let result;
 await mongoose.connection.transaction(async session=>{
  const entry=await Entry.findOne({_id:entryId,kind}).session(session);if(!entry)fail(404,'El registro no existe.');
  const original=entry.toObject(),merged={...original,...payload},data=normalize(kind,merged);
  if(entry.transactionId&&Object.keys(data).some(key=>key!=='notes'&&String(data[key]??'')!==String(original[key]??'')))fail(409,'El movimiento ya afectó caja. Conservá sus importes y registrá una corrección por el circuito de movimientos.');
  await checkLinks(data,session);Object.assign(entry,data,{updatedBy:actorName(actor)});if(!entry.transactionId)await postLedger(entry,actor,session);await entry.save({session});await audit(entry,actor,'EDICION_MANUAL',session);result=entry;
 });return {item:view(result)};
}
