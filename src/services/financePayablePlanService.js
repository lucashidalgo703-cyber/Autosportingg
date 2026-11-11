import mongoose from 'mongoose';
import {createHash} from 'node:crypto';
import FinancePayablePlan from '../models/FinancePayablePlan.js';
import FinancePayableInstallment from '../models/FinancePayableInstallment.js';
import FinancePayableOperation from '../models/FinancePayableOperation.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import Car from '../models/Car.js';
import AuditLog from '../models/AuditLog.js';
import {payablePlanSchedule,payableInstallmentState} from '../utils/financePayablePlans.js';
import {getBusinessDateKey} from '../utils/cashProjection.js';
import {roundMoney} from '../utils/saleCommercial.js';
const fail=(message,status=400,errors={})=>Object.assign(Error(message),{status,errors});
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const operation=(kind,key,actor)=>{if(!key||String(key).length>160)throw fail('La operación requiere una clave de reintento.');return hash(kind+':'+String(actor.id||actor.userId)+':'+String(key));};
const audit=(actor,action,entityId,metadata,session)=>AuditLog.create([{userId:String(actor.id||actor.userId),userName:actor.username||'',userRole:actor.role,action,module:'finanzas',entityType:'FinancePayablePlan',entityId:String(entityId),description:action==='PLAN_CUOTAS_PAGAR'?'Plan creado sin modificar caja.':'Pago explícito de cuota a pagar.',metadata}],{session});
export async function listFinancePayableInstallments(){
 const rows=await FinancePayableInstallment.find().populate('planId').sort({dueDate:1,number:1}).lean();
 return {items:rows.map(item=>({...item,...payableInstallmentState(item)}))};
}
export async function createFinancePayablePlan(input,{actor,idempotencyKey}){
 if(input.usePurchaseCommitment===true)throw fail('La deuda de adquisición se gestiona desde el compromiso de compra en Stock. No se admite convertirla en otro plan independiente.',409,{carId:'Abrí la unidad en Stock para registrar abonos sobre su compromiso existente.'});
 const checked=payablePlanSchedule(input);if(Object.keys(checked.errors).length)throw fail('Revisá los datos del plan.',400,checked.errors);
 const values={creditorName:String(input.creditorName).trim(),debtType:input.debtType,concept:String(input.concept||'').trim(),currency:input.currency,count:Number(input.count),frequency:input.frequency||'mensual',firstDueDate:getBusinessDateKey(input.firstDueDate),notes:String(input.notes||'').trim(),carId:input.carId||null},payloadHash=hash({...values,schedule:checked.schedule}),id=operation('plan',idempotencyKey,actor);
 if(values.carId&&(!mongoose.isValidObjectId(values.carId)||!await Car.exists({_id:values.carId})))throw fail('El vehículo vinculado no existe.');
 const replay=async()=>{const existing=await FinancePayableOperation.findById(id).lean();if(!existing)return null;if(existing.payloadHash!==payloadHash)throw fail('La clave ya corresponde a otro plan.',409);return {plan:await FinancePayablePlan.findById(existing.planId),replayed:true};};
 const previous=await replay();if(previous)return previous;const session=await mongoose.startSession();let result;
 try{await session.withTransaction(async()=>{
  if(values.carId && values.debtType==='auto_cuotas'){
   const vehicle=await Car.findById(values.carId).select('purchasePaymentState.pendingDebt purchasePaymentState.status').session(session).lean();
   if(!vehicle)throw fail('El vehículo vinculado no existe.',404);
   const registeredDebt=Number(vehicle.purchasePaymentState?.pendingDebt);
   if(['pendiente','parcial','conciliacion_pendiente'].includes(vehicle.purchasePaymentState?.status)&&(vehicle.purchasePaymentState?.pendingDebt==null||!Number.isFinite(registeredDebt)||registeredDebt<0))throw fail('El compromiso de compra de esta unidad requiere revisión en Stock antes de crear otro plan.',409,{carId:'Revisá el saldo del compromiso existente en Stock.'});
   if(Number.isFinite(registeredDebt)&&registeredDebt>0)throw fail('Esta unidad ya tiene una deuda de compra registrada en Stock. Usá su compromiso de compra para registrar abonos; crear otro plan duplicaría la misma obligación.',409,{carId:'La unidad tiene un compromiso de compra pendiente. Abrila en Stock para gestionar sus abonos.'});
  }
  await FinancePayableOperation.create([{_id:id,payloadHash,kind:'plan'}],{session});
  const [plan]=await FinancePayablePlan.create([{...values,createdBy:actor.username||'Admin'}],{session});
  await FinancePayableInstallment.create(checked.schedule.map(row=>({...row,planId:plan._id,currency:values.currency})),{session,ordered:true});
  await FinancePayableOperation.updateOne({_id:id},{$set:{planId:plan._id}},{session});await audit(actor,'PLAN_CUOTAS_PAGAR',plan._id,{count:values.count,currency:values.currency},session);result={plan,replayed:false};
 });return result;}catch(error){if(error.code===11000){const saved=await replay();if(saved)return saved;}throw error;}finally{await session.endSession();}
}
export async function payFinancePayableInstallment(installmentId,input,{actor,idempotencyKey}){
 if(!mongoose.isValidObjectId(installmentId)||!mongoose.isValidObjectId(input.accountId))throw fail('Elegí una cuota y cuenta válidas.');
 const amount=roundMoney(Number(input.amount)),date=getBusinessDateKey(input.date);if(!Number.isFinite(Number(input.amount))||amount<=0||!date)throw fail('Completá importe y fecha válidos.');
 const values={installmentId:String(installmentId),accountId:String(input.accountId),amount,currency:input.currency,date,paymentMethod:String(input.paymentMethod||'efectivo'),notes:String(input.notes||'').trim()},payloadHash=hash(values),id=operation('pay',idempotencyKey,actor);
 const replay=async()=>{const existing=await FinancePayableOperation.findById(id).lean();if(!existing)return null;if(existing.payloadHash!==payloadHash)throw fail('La clave ya corresponde a otro pago.',409);return {installment:await FinancePayableInstallment.findById(existing.installmentId).populate('planId'),transaction:await Transaction.findById(existing.transactionId),replayed:true};};
 const previous=await replay();if(previous)return previous;const session=await mongoose.startSession();let result;
 try{await session.withTransaction(async()=>{
  const item=await FinancePayableInstallment.findById(installmentId).session(session),account=await Account.findById(input.accountId).session(session);
  if(!item)throw fail('La cuota no existe.',404);const plan=await FinancePayablePlan.findById(item.planId).session(session);if(!plan)throw fail('El plan no existe.',404);
  if(!account||account.isActive===false||account.currency!==item.currency||input.currency!==item.currency)throw fail('La cuenta debe estar activa y usar la moneda de la cuota.');
  const remaining=roundMoney(item.amount-item.paidAmount);if(amount>remaining||remaining<=0)throw fail('El pago supera el saldo pendiente. Volvé a consultar la cuota.',409);
  await FinancePayableOperation.create([{_id:id,payloadHash,kind:'pay',planId:plan._id,installmentId:item._id}],{session});
  const [transaction]=await Transaction.create([{type:'Egreso',amount,currency:item.currency,description:`Cuota ${item.number}/${plan.count} a ${plan.creditorName}`,concept:plan.concept||'Cuota a pagar',category:'Cuotas a pagar',date:new Date(date+'T12:00:00-03:00'),accountId:account._id,carId:plan.carId||undefined,notes:values.notes,paymentMethod:values.paymentMethod,module:'crm_v2',source:'otro',status:'activo',financePayableInstallmentId:item._id,createdBy:actor.username||'Admin',transactionAuditLog:[{action:'PAGO_CUOTA_ACREEDOR',details:'Pago explícito del plan a pagar.',user:actor.username||'Admin'}]}],{session});
  const updated=await Account.updateOne({_id:account._id,isActive:{$ne:false},currency:item.currency},{$inc:{balance:-amount}},{session});if(updated.modifiedCount!==1)throw fail('La cuenta cambió; revisá antes de pagar.',409);
  item.paidAmount=roundMoney(item.paidAmount+amount);item.payments.push({transactionId:transaction._id,amount,date,accountId:account._id});await item.save({session});
  await FinancePayableOperation.updateOne({_id:id},{$set:{transactionId:transaction._id}},{session});await audit(actor,'PAGO_CUOTA_ACREEDOR',plan._id,{installmentId:String(item._id),transactionId:String(transaction._id),amount,currency:item.currency},session);result={installment:item,transaction,replayed:false};
 });return result;}catch(error){if(error.code===11000){const saved=await replay();if(saved)return saved;}throw error;}finally{await session.endSession();}
}
