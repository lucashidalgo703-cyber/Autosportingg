import mongoose from 'mongoose';
import {createHash} from 'node:crypto';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import FinanceTransfer from '../models/FinanceTransfer.js';
import {validateFinanceTransfer} from '../utils/financeWorkbench.js';

const fail=(message,status=400,errors={})=>Object.assign(new Error(message),{status,errors});
export async function transferFinanceFunds(input,{actorId,user='Admin',idempotencyKey}={}){
 const key=String(idempotencyKey || '').trim();
 if(!key || key.length>160)throw fail('Se requiere una clave de operación para evitar transferencias duplicadas.');
 const sourceAccountId=String(input.sourceAccountId || input.fromAccountId || ''),destAccountId=String(input.destAccountId || input.toAccountId || '');
 if(!mongoose.isValidObjectId(sourceAccountId)||!mongoose.isValidObjectId(destAccountId))throw fail('Elegí cuentas válidas.');
 const date=input.date ? new Date(input.date) : null;
 if(date && !Number.isFinite(date.getTime()))throw fail('Fecha inválida.');
 const payload={sourceAccountId,destAccountId,amount:Number(input.amount),currency:input.currency,exchangeRate:input.exchangeRate==null?null:Number(input.exchangeRate),destAmount:input.destAmount==null?null:Number(input.destAmount),date:date?.toISOString()||null,concept:String(input.concept||'Transferencia entre cuentas').trim(),notes:String(input.notes||'').trim()};
 const payloadHash=createHash('sha256').update(JSON.stringify(payload)).digest('hex'),id=createHash('sha256').update(String(actorId)+':'+key).digest('hex');
 const replay=async()=>{const entry=await FinanceTransfer.findById(id).lean();if(!entry)return null;if(entry.payloadHash!==payloadHash)throw fail('La clave ya se usó con otros datos. Iniciá una nueva transferencia.',409);return {transactions:await Transaction.find({_id:{$in:entry.transactionIds}}).populate('accountId'),replayed:true};};
 const existing=await replay();if(existing)return existing;
 const session=await mongoose.startSession();let result;
 try{
  await session.withTransaction(async()=>{
   const accounts=await Account.find({_id:{$in:[sourceAccountId,destAccountId]}}).session(session);
   const checked=validateFinanceTransfer({...payload},accounts);
   if(Object.keys(checked.errors).length)throw fail('Revisá los datos de la transferencia.',400,checked.errors);
   const source=accounts.find(a=>String(a._id)===sourceAccountId),destination=accounts.find(a=>String(a._id)===destAccountId);
   if(input.currency!==source.currency)throw fail('La moneda debe coincidir con la cuenta de origen.');
   await FinanceTransfer.create([{_id:id,payloadHash,actorId:String(actorId),transactionIds:[]}],{session});
   const txDate=date||new Date(),common={category:'Transferencia Interna',concept:payload.concept,notes:payload.notes,module:'crm_v2',source:'manual',paymentMethod:'otro',date:txDate,createdBy:user,status:'activo',...(checked.conversion?{exchangeRate:payload.exchangeRate,conversionDate:txDate}:{})};
   const transactions=await Transaction.create([
    {...common,type:'Egreso',amount:payload.amount,currency:source.currency,accountId:source._id,description:`Transferencia enviada a ${destination.name}`,transactionAuditLog:[{action:'TRANSFERENCIA_INTERNA',details:'Transferencia saliente',user}]},
    {...common,type:'Ingreso',amount:checked.conversion?payload.destAmount:payload.amount,currency:destination.currency,accountId:destination._id,description:`Transferencia recibida de ${source.name}`,transactionAuditLog:[{action:'TRANSFERENCIA_INTERNA',details:'Transferencia entrante',user}]}
   ],{session,ordered:true});
   const outgoing=await Account.updateOne({_id:source._id,isActive:{$ne:false},currency:source.currency},{$inc:{balance:-payload.amount}},{session});
   const incoming=await Account.updateOne({_id:destination._id,isActive:{$ne:false},currency:destination.currency},{$inc:{balance:checked.conversion?payload.destAmount:payload.amount}},{session});
   if(outgoing.modifiedCount!==1||incoming.modifiedCount!==1)throw fail('Las cuentas cambiaron; volvé a revisar la transferencia.',409);
   await FinanceTransfer.updateOne({_id:id},{$set:{transactionIds:transactions.map(tx=>tx._id)}},{session});
   result={transactions:transactions.map(tx=>tx.toObject()),replayed:false};
  });
 }catch(error){if(error.code===11000){const saved=await replay();if(saved)return saved;}throw error;}finally{await session.endSession();}
 return result;
}
