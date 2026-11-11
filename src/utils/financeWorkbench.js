import {getArgentinaDateKey,getBusinessDateKey} from './cashProjection.js';
export function financeCurrency(value){const code=String(value || '').trim().toUpperCase();return ['USD','U$S','US$'].includes(code) ? 'USD' : ['ARS','$'].includes(code) ? 'ARS' : null;}
export function financeCalendarKey(value){
 const key=getBusinessDateKey(value);if(!key)return null;
 const text=value instanceof Date?value.toISOString():String(value);
 if(/^\d{4}-\d{2}-\d{2}$/.test(text)||/T00:00:00(?:\.000)?Z$/.test(text))return key;
 try{return getArgentinaDateKey(value);}catch{return null;}
}
const amount=value=>value===null || value===undefined || value==='' || !Number.isFinite(Number(value)) ? null : Number(value);
export const isInternalFinanceTransfer=tx=>String(tx?.category || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()==='transferencia interna';
export function buildFinanceOverview({accounts=null,transactions=null,asOf=new Date()}={}){
 const balances=accounts===null ? null : {ARS:0,USD:0},activity=transactions===null ? null : {ARS:{income:0,expense:0,net:0},USD:{income:0,expense:0,net:0}};
 const byMonth={ARS:new Map(),USD:new Map()},byCategory={ARS:new Map(),USD:new Map()},issues=[],accountRows=[];
 const today=getArgentinaDateKey(asOf),currentMonth=today.slice(0,7);
 for(const account of accounts || []){
  if(account.isActive===false)continue;
  const currency=financeCurrency(account.currency),value=amount(account.balance);
  if(!currency || value===null){issues.push({source:'account',id:account._id,message:'Cuenta con moneda o saldo a revisar.'});if(currency)balances[currency]=null;continue;}
  if(balances[currency]!==null)balances[currency]+=value;
  accountRows.push({...account,currency,balance:value});
 }
 for(const tx of transactions || []){
  const status=String(tx.status || 'activo').toLowerCase();
  if(['anulado','pendiente'].includes(status))continue;
  const currency=financeCurrency(tx.currency),value=amount(tx.amount),direction=String(tx.type || '').toLowerCase();
  if(!currency || value===null || value<0 || !['ingreso','egreso'].includes(direction)){issues.push({source:'transaction',id:tx._id,message:'Movimiento con moneda, importe o tipo a revisar.'});continue;}
  // Transfers change individual accounts but are not external income/expense.
  if(isInternalFinanceTransfer(tx))continue;
  activity[currency][direction==='ingreso' ? 'income' : 'expense']+=value;
  const date=financeCalendarKey(tx.date);
  if(!date){issues.push({source:'transaction',id:tx._id,message:'Movimiento sin fecha válida; fuera del gráfico mensual.'});continue;}
  const month=date.slice(0,7),monthRow=byMonth[currency].get(month) || {key:month,income:0,expense:0};
  monthRow[direction==='ingreso' ? 'income' : 'expense']+=value;byMonth[currency].set(month,monthRow);
  if(direction==='egreso' && month===currentMonth){const category=String(tx.category || 'Sin categoría');byCategory[currency].set(category,(byCategory[currency].get(category) || 0)+value);}
 }
 if(activity)for(const currency of ['ARS','USD'])activity[currency].net=activity[currency].income-activity[currency].expense;
 const chart=Object.fromEntries(['ARS','USD'].map(currency=>[currency,{months:[...byMonth[currency].values()].sort((a,b)=>a.key.localeCompare(b.key)).slice(-12),current:byMonth[currency].get(currentMonth) || {key:currentMonth,income:0,expense:0},categories:[...byCategory[currency]].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount)}]));
 return {balances,activity,accounts:accountRows,chart,issues,currentMonth};
}
export function validateFinanceTransfer(form,accounts){
 const errors={},source=accounts.find(item=>String(item._id)===String(form.sourceAccountId)),destination=accounts.find(item=>String(item._id)===String(form.destAccountId));
 const sourceCurrency=financeCurrency(source?.currency),destCurrency=financeCurrency(destination?.currency),value=Number(form.amount),conversion=Boolean(sourceCurrency && destCurrency && sourceCurrency!==destCurrency);
 if(!source || source.isActive===false)errors.sourceAccountId='Elegí una cuenta de origen activa.';
 if(!destination || destination.isActive===false)errors.destAccountId='Elegí una cuenta de destino activa.';
 if(source && destination && String(source._id)===String(destination._id))errors.destAccountId='Origen y destino deben ser diferentes.';
 if(!String(form.amount ?? '').trim() || !Number.isFinite(value) || value<=0)errors.amount='Ingresá un importe mayor a cero.';
 if(!sourceCurrency || !destCurrency)errors.currency='Las cuentas deben usar ARS o USD.';
 if(conversion){
  if(!Number.isFinite(Number(form.exchangeRate)) || Number(form.exchangeRate)<=0)errors.exchangeRate='Ingresá una cotización explícita mayor a cero.';
  if(!Number.isFinite(Number(form.destAmount)) || Number(form.destAmount)<=0)errors.destAmount='Revisá el importe a acreditar.';
 }
 return {errors,values:{sourceAccountId:form.sourceAccountId,destAccountId:form.destAccountId,amount:value,currency:sourceCurrency,notes:String(form.notes || '').trim(),...(conversion ? {exchangeRate:Number(form.exchangeRate),destAmount:Number(form.destAmount)} : {})},conversion};
}
