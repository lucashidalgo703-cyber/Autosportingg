"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Table, BookOpen, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { capitalBucket, capitalAuditRows, formatCapitalMoney } from '../../../utils/capitalSummaryView';
import { getArgentinaDateKey } from '../../../utils/cashProjection';
import CapitalBreakdownModal from './CapitalBreakdownModal';
import StockAuditTableModal from './StockAuditTableModal';
import ContrastCasesModal from './ContrastCasesModal';
import CapitalCurrencySelector from './CapitalCurrencySelector';
const button='inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg disabled:opacity-40';
export default function CapitalSummarySection({initialSummary=null,initialSummaryToken}) {
 const {token,user}=useAuth();
 const allowed=hasPermission(user,PERMISSIONS.STOCK_READ)&&hasPermission(user,PERMISSIONS.FINANZAS_READ);
 if(!allowed||!token)return <p className="rounded-xl border border-crm-border bg-crm-surface p-4 text-sm text-crm-fg-muted">Necesitás permisos de consulta de Stock y Finanzas para ver el resumen patrimonial.</p>;
 return <Summary key={token} token={token} initialSummary={initialSummaryToken===token?initialSummary:null}/>;
}
function Summary({token,initialSummary}) {
 const [summary,setSummary]=useState(initialSummary),[loading,setLoading]=useState(!initialSummary),[error,setError]=useState(''),[currency,setCurrency]=useState('ARS'),[scenario,setScenario]=useState('costo'),[component,setComponent]=useState(null),[audit,setAudit]=useState(false),[rules,setRules]=useState(false);
 const generation=useRef(0),pending=useRef(null);
 const fetchSummary=useCallback(async()=>{
  pending.current?.abort();const controller=new AbortController();pending.current=controller;const revision=++generation.current;
  const current=()=>!controller.signal.aborted&&generation.current===revision&&localStorage.getItem('token')===token;
  setLoading(true);setError('');
  try{
   if(localStorage.getItem('token')!==token)return;
   const base=process.env.NODE_ENV==='production'?'':process.env.NEXT_PUBLIC_API_URL||'http://localhost:3001';
   const response=await fetch(base+'/api/admin/stock/capital-summary',{headers:{Authorization:'Bearer '+token},signal:controller.signal,cache:'no-store'});
   const json=await response.json();if(!response.ok||json.ok!==true)throw Error(json.message||'No se pudo consultar el capital.');
   if(!json.data?.byCurrency?.ARS||!json.data?.byCurrency?.USD)throw Error('El resumen recibido no separa las monedas. Actualizá antes de utilizar sus importes.');
   if(current())setSummary(json.data);
  }catch(failure){if(current()&&failure.name!=='AbortError')setError(failure.message||'No se pudo consultar el capital.');}
  finally{if(current())setLoading(false);}
 },[token]);
 useEffect(()=>{if(!initialSummary)void fetchSummary();return()=>{generation.current++;pending.current?.abort();};},[fetchSummary,initialSummary]);
 const bucket=capitalBucket(summary,currency),components=bucket?.componentes,totals=bucket?.totales;
 const changeCurrency=value=>setCurrency(value);
 const date=value=>{try{return getArgentinaDateKey(value);}catch{return 'Sin fecha';}};
 if(!bucket)return <section className="rounded-xl border border-crm-border bg-crm-surface p-5"><p role={error?'alert':'status'} className="m-0 text-sm text-crm-fg-muted">{error||'Consultando stock, cuentas, cartera y obligaciones por moneda…'}</p>{error&&<button type="button" className={button+' mt-3'} onClick={fetchSummary} disabled={loading}>Reintentar consulta</button>}</section>;
 const stockAmount=scenario==='costo'?components.stockPropioCosto.monto:totals.stockPropioPublicado;
 const total=scenario==='costo'?totals.capitalPropioCosto:totals.capitalPropioPublicado;
 const cards=[['stockPropioCosto',scenario==='costo'?'Stock propio a costo':'Stock propio publicado',stockAmount,'+',scenario==='costo'?'Adquisición y gastos de esta moneda, según participación.':'Precio publicado de esta moneda, según participación.'],['efectivoPropio','Saldo registrado de cuentas',components.efectivoPropio.monto,'+','Saldos de cuentas activas. No acredita conciliación bancaria.'],['carteraPropia','Cartera propia pendiente',components.carteraPropia.monto,'+','Saldo por cobrar según participación registrada.'],['otrosCreditos','Préstamos por cobrar',components.otrosCreditos.monto,'+','Créditos documentados pendientes de devolución.'],['deudasPropia','Obligaciones por pagar',components.deudasPropia.monto,'−','Deudas pendientes de las fuentes incluidas en el informe.']];
 return <section className="space-y-4 pt-2" aria-label="Resumen patrimonial por moneda">
  <div className="space-y-3 rounded-xl border border-crm-border bg-crm-surface p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><h2 className="m-0 text-base font-semibold text-crm-fg">Resumen patrimonial estimado</h2><p className="mb-0 mt-1 text-xs leading-5 text-crm-fg-muted">Stock + cuentas + cartera + préstamos − obligaciones. ARS y USD se calculan por separado, sin conversión.</p></div><CapitalCurrencySelector currency={currency} onChange={changeCurrency}/></div><div className="flex flex-wrap items-center gap-2"><button type="button" className={button} onClick={()=>setAudit(true)}><Table size={13}/>Auditoría de unidades ({capitalAuditRows(bucket).length})</button><button type="button" className={button} onClick={()=>setRules(true)}><BookOpen size={13}/>Reglas y permutas</button><button type="button" className={button+' ml-auto'} onClick={fetchSummary} disabled={loading}><RefreshCw size={13} className={loading?'animate-spin':''}/>{loading?'Actualizando…':'Actualizar'}</button></div><div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-3"><span className="mr-1 text-xs text-crm-fg-muted">Valuación del stock:</span>{[['costo','A costo'],['publicado','Precio publicado']].map(([value,label])=><button key={value} type="button" aria-pressed={scenario===value} onClick={()=>setScenario(value)} className={button+(scenario===value?' !border-crm-red !text-crm-red':'')}>{label}</button>)}<p className="m-0 text-xs text-crm-fg-muted sm:ml-auto">Corte: {date(bucket.cutoffDate)}</p></div></div>
  {error&&<p role="alert" className="rounded-lg border border-red-500/30 p-3 text-xs text-red-300">No se pudo actualizar: {error} Se muestra la última consulta válida del corte indicado.</p>}
  <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-5 text-crm-fg-muted"><p className="m-0">{bucket.conciliacionMessage||'Estimación basada en fuentes registradas; no certifica conciliación bancaria ni propiedad exclusiva de los saldos.'}</p>{summary.issues?.length>0&&<details className="mt-2"><summary className="cursor-pointer font-medium text-amber-300">{summary.issues.length} registros requieren revisión</summary><ul className="mb-0 mt-2 space-y-1 pl-4">{summary.issues.map((issue,index)=><li key={issue.source+':'+issue.id+':'+index}>{issue.message}{issue.id?' · '+issue.id.slice(-6):''}</li>)}</ul></details>}</div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([key,label,amount,sign,description])=><button type="button" key={key} onClick={()=>setComponent(key)} className="flex flex-col rounded-xl border border-crm-border bg-crm-surface p-4 text-left hover:border-crm-red/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red"><span className="flex w-full items-center justify-between text-xs text-crm-fg-muted"><span>{sign} {label}</span><ChevronRight size={13}/></span><strong className="mt-2 text-xl text-crm-fg">{formatCapitalMoney(amount,currency)}</strong><span className="mt-2 text-[11px] leading-5 text-crm-fg-muted">{description}</span><span className="mt-auto block pt-2 text-[10px] text-crm-fg-muted">{components[key]?.items?.length??0} registros en esta moneda · Ver detalle</span></button>)}<div className="rounded-xl border border-crm-red/30 bg-crm-red/5 p-4"><p className="m-0 text-xs text-crm-fg-muted">= Capital estimado · {scenario==='costo'?'base costo':'base publicada'}</p><strong className="mt-2 block text-2xl text-crm-fg">{formatCapitalMoney(total,currency)}</strong><p className="mb-0 mt-2 text-[11px] leading-5 text-crm-fg-muted">Resultado de los componentes registrados en {currency}. No equivale al dinero disponible para gastar.</p></div></div>
  <div className="space-y-2 rounded-xl border border-crm-border bg-crm-surface p-4 text-xs leading-5 text-crm-fg-muted"><p className="m-0">Escenario a costo: <strong className="text-crm-fg">{formatCapitalMoney(totals.capitalPropioCosto,currency)}</strong>. Escenario publicado: <strong className="text-crm-fg">{formatCapitalMoney(totals.capitalPropioPublicado,currency)}</strong>.</p><p className="m-0">Diferencia entre escenarios en {currency}: <strong className="text-crm-fg">{formatCapitalMoney(totals.margenComercialPotencial,currency)}</strong>. No representa ganancia cobrada ni margen por unidad; si compra y venta usan monedas diferentes, cada importe permanece en su moneda.</p><p className="m-0">Consignaciones y terceros excluidos del capital propio: {formatCapitalMoney(totals.consignacionesTotalPublicado,currency)} publicados. La auditoría conserva esas unidades y sus motivos.</p></div>
  {component&&<CapitalBreakdownModal key={token+':'+component} isOpen onClose={()=>setComponent(null)} componentKey={component} componentData={components[component]} totals={totals} byCurrency={summary.byCurrency} currency={currency} onCurrencyChange={changeCurrency} valuationScenario={scenario}/>}
  {audit&&<StockAuditTableModal key={token} isOpen onClose={()=>setAudit(false)} capitalSummary={summary} currency={currency} onCurrencyChange={changeCurrency}/>}
  {rules&&<ContrastCasesModal isOpen onClose={()=>setRules(false)}/>}
 </section>;
}
