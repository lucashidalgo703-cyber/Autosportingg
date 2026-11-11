import mongoose from 'mongoose';
import Account from '../models/Account.js';
import DailyCashClose from '../models/DailyCashClose.js';
import FinanceCloseSequence from '../models/FinanceCloseSequence.js';
import AuditLog from '../models/AuditLog.js';
import {getArgentinaDateKey} from '../utils/cashProjection.js';
export async function createFinanceDailyClose(input,actor,now=new Date()){
 const date=getArgentinaDateKey(now),session=await mongoose.startSession();let result;
 try{await session.withTransaction(async()=>{
  const latest=await DailyCashClose.findOne({date}).sort({sequence:-1}).session(session).lean();
  if(latest&&input.force!==true)throw Object.assign(Error('Ya existe un cierre para hoy. Revisá la versión anterior y completá un motivo para cerrar nuevamente.'),{status:409,latestClose:latest});
  const reopenReason=String(input.reopenReason||'').trim();if(latest&&!reopenReason)throw Object.assign(Error('Completá el motivo del nuevo cierre.'),{status:400,errors:{reopenReason:'El motivo es obligatorio al volver a cerrar.'}});
  if(reopenReason.length>2000)throw Object.assign(Error('El motivo admite hasta 2000 caracteres.'),{status:400});
  await FinanceCloseSequence.updateOne({_id:date},{$max:{sequence:latest?.sequence||0}},{upsert:true,session});
  const counter=await FinanceCloseSequence.findOneAndUpdate({_id:date},{$inc:{sequence:1}},{session,new:true});
  const accounts=await Account.find({isActive:{$ne:false}}).session(session).lean(),snapshots=[];let totalsARS=0,totalsUSD=0;
  for(const account of accounts){if(!['ARS','USD'].includes(account.currency)||!Number.isFinite(Number(account.balance)))throw Object.assign(Error('Hay cuentas con moneda o saldo inválido. Revisalas antes de cerrar.'),{status:409});snapshots.push({accountId:account._id,name:account.name,currency:account.currency,balance:account.balance,type:account.type});if(account.currency==='ARS')totalsARS+=account.balance;else totalsUSD+=account.balance;}
  const [close]=await DailyCashClose.create([{date,sequence:counter.sequence,accountSnapshots:snapshots,totalsARS,totalsUSD,notes:String(input.notes||'').trim(),reopenReason:latest?reopenReason:'',createdBy:actor.username||actor.name||'Admin'}],{session});
  await AuditLog.create([{userId:String(actor.id||actor.userId),userName:actor.username||'',userRole:actor.role,action:latest?'CIERRE_CAJA_NUEVA_VERSION':'CIERRE_CAJA',module:'finanzas',entityType:'DailyCashClose',entityId:String(close._id),description:'Snapshot de cuentas guardado sin modificar saldos.',metadata:{date,sequence:close.sequence,reopenReason:close.reopenReason}}],{session});result=close;
 });return result;}finally{await session.endSession();}
}
