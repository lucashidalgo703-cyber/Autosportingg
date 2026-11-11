import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import CashCount from '../models/CashCount.js';
import AuditLog from '../models/AuditLog.js';
import {getArgentinaDateKey,getBusinessDateKey} from '../utils/cashProjection.js';
import {financeCalendarKey} from '../utils/financeWorkbench.js';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export async function financeBookBalance(accountId,date,session=null){
 if(!mongoose.isValidObjectId(accountId))throw fail('Elegí una cuenta válida.');
 const key=getBusinessDateKey(date);if(!key)throw fail('Elegí una fecha válida.');
 const account=await Account.findById(accountId).session(session).lean();if(!account||account.isActive===false)throw fail('La cuenta no existe o está inactiva.',404);
 const later=await Transaction.find({accountId,status:{$nin:['pendiente','anulado']},date:{$gte:new Date(key+'T00:00:00Z')}}).select('type amount currency date').session(session).lean();
 let balance=Number(account.balance);if(!Number.isFinite(balance))throw fail('El saldo registrado requiere revisión.',409);
 for(const tx of later){if(financeCalendarKey(tx.date)<=key)continue;const type=String(tx.type).toLowerCase();if(tx.currency!==account.currency||!Number.isFinite(Number(tx.amount))||!['ingreso','egreso'].includes(type))throw fail('Hay movimientos posteriores incompatibles. Revisá la cuenta antes de arquear.',409);balance-=type==='ingreso'?Number(tx.amount):-Number(tx.amount);}
 return {accountId:String(account._id),accountName:account.name,currency:account.currency,date:key,systemBalance:balance};
}
export async function saveFinanceCashCount(input,{id,actor}={}){
 const accountId=String(input.accountId||''),date=getBusinessDateKey(input.countedAt||input.date||getArgentinaDateKey(new Date())),declared=Number(input.declaredBalance);
 if(!date||input.declaredBalance===''||input.declaredBalance==null||!Number.isFinite(declared))throw fail('Completá una fecha y un saldo físico válidos.');
 if(id&&!mongoose.isValidObjectId(id))throw fail('Arqueo inválido.');
 const responsible=String(input.responsible||actor.username||actor.name||'').trim();if(!responsible||responsible.length>160)throw fail('Completá el responsable (hasta 160 caracteres).');
 const session=await mongoose.startSession();let result;
 try{await session.withTransaction(async()=>{
  const previous=id?await CashCount.findById(id).session(session):null;if(id&&!previous)throw fail('El arqueo no existe.',404);
  const same=previous&&String(previous.accountId)===accountId&&getBusinessDateKey(previous.countedAt)===date&&(!input.currency||input.currency===previous.currency);
  const snapshot=same?{accountName:previous.accountName,currency:previous.currency,systemBalance:previous.systemBalance}:await financeBookBalance(accountId,date,session);
  if(input.currency&&input.currency!==snapshot.currency)throw fail('La moneda debe coincidir con la cuenta.');
  const values={accountId,accountName:snapshot.accountName,currency:snapshot.currency,systemBalance:snapshot.systemBalance,declaredBalance:declared,difference:declared-snapshot.systemBalance,countedAt:new Date(date+'T12:00:00-03:00'),responsible,reason:String(input.reason||'').trim(),notes:String(input.notes||'').trim(),createdBy:previous?.createdBy||actor.username||'Admin'};
  result=previous?Object.assign(previous,values):new CashCount(values);await result.save({session});
  await AuditLog.create([{userId:String(actor.id||actor.userId),userName:actor.username||'',userRole:actor.role,action:previous?'ARQUEO_EDITADO':'ARQUEO_CREADO',module:'finanzas',entityType:'CashCount',entityId:String(result._id),description:'Arqueo registrado sin ajustar cuentas.',metadata:{accountId,date,snapshotPreserved:Boolean(same)}}],{session});
 });return result;}finally{await session.endSession();}
}
