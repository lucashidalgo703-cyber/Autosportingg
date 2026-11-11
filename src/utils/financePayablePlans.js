import {getBusinessDateKey,getArgentinaDateKey} from './cashProjection.js';
import {roundMoney} from './saleCommercial.js';
export function payablePlanSchedule(input){
 const errors={},count=Number(input.count),amount=Number(input.amount),first=getBusinessDateKey(input.firstDueDate),frequency=input.frequency||'mensual';
 if(!String(input.creditorName||'').trim())errors.creditorName='Completá el acreedor.';
 if(!['compra_gasto','auto_cuotas','financiera_banco'].includes(input.debtType))errors.debtType='Elegí el tipo de deuda.';
 if(!['ARS','USD'].includes(input.currency))errors.currency='Elegí ARS o USD.';
 if(!Number.isInteger(count)||count<1||count>120)errors.count='Elegí entre 1 y 120 cuotas.';
 if(!Number.isFinite(amount)||amount<=0)errors.amount='Ingresá un importe por cuota mayor a cero.';
 if(!first)errors.firstDueDate='Elegí el primer vencimiento.';
 if(!['mensual','quincenal','semanal'].includes(frequency))errors.frequency='Elegí la frecuencia.';
 if(String(input.creditorName||'').length>300||String(input.concept||'').length>500||String(input.notes||'').length>5000)errors.notes='Revisá la longitud del acreedor, concepto o notas.';
 if(Object.keys(errors).length)return {errors,schedule:[]};
 let schedule=[];
 if(input.customSchedule!==undefined){
  if(!Array.isArray(input.customSchedule)||input.customSchedule.length!==count)errors.customSchedule='El calendario debe tener una fila por cuota.';
  else schedule=input.customSchedule.map((row,index)=>{const date=getBusinessDateKey(row.dueDate),value=Number(row.amount);if(!date||!Number.isFinite(value)||value<=0)errors.customSchedule='Revisá fechas e importes de todas las cuotas.';return {number:index+1,dueDate:date,amount:roundMoney(value)};});
 }else{
  const [year,month,day]=first.split('-').map(Number);
  schedule=Array.from({length:count},(_,index)=>{let date;if(frequency==='mensual'){const lastDay=new Date(Date.UTC(year,month+index,0)).getUTCDate();date=new Date(Date.UTC(year,month-1+index,Math.min(day,lastDay)));}else date=new Date(Date.UTC(year,month-1,day+index*(frequency==='semanal'?7:15)));return {number:index+1,dueDate:date.toISOString().slice(0,10),amount:roundMoney(amount)};});
 }
 if(schedule.some(row=>row.amount<=0))errors.amount='Los importes deben ser de al menos un centavo.';
 return {errors,schedule};
}
export function payableInstallmentState(item,asOf=new Date()){
 const amount=Number(item.amount),paid=Number(item.paidAmount||0),dueDate=getBusinessDateKey(item.dueDate),today=getArgentinaDateKey(asOf),pending=roundMoney(Math.max(0,amount-paid));
 const days=dueDate?Math.round((Date.parse(dueDate)-Date.parse(today))/86400000):null;
 return {pending,status:pending<=0?'pagada':days!==null&&days<0?'vencida':paid>0?'parcial':'pendiente',days};
}
