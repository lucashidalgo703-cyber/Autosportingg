"use client";
import {useEffect,useRef,useState} from 'react';
import {Download,Plus,Trash2} from 'lucide-react';
import {useAuth} from '../../../context/AuthContext';
import VehicleEditorDialog,{useVehicleFormClose,VehicleFormErrors} from '../stock/VehicleEditorDialog';
import {newFinanceDocument,financeDocumentBalance,validateFinanceDocument,createFinanceDocumentPdf} from '../../../utils/financeDocuments';
const control='h-9 w-full min-w-0 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none focus:border-crm-red';
const grid='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3';
const base=()=>process.env.NODE_ENV==='production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export default function FinanceDocumentModal({isOpen=true,onClose,documentKind='recibo',initialValues={}}){
 const {token}=useAuth(),isBoleto=documentKind==='boleto',sourceId=initialValues.sourceId || 'manual';
 const [values,setValues]=useState(()=>newFinanceDocument(initialValues)),[busy,setBusy]=useState(false),[errors,setErrors]=useState({}),[issuerError,setIssuerError]=useState('');
 const session=useRef({token,isOpen,sourceId}),generation=useRef(0),issuerTouched=useRef(new Set());session.current={token,isOpen,sourceId};
 const {markDirty,requestClose,closeNotice}=useVehicleFormClose({isOpen,onClose,busy,resetKey:documentKind+':'+sourceId+':'+token});
 useEffect(()=>{
  const revision=++generation.current,controller=new AbortController();if(!isOpen)return;
  setValues(newFinanceDocument(initialValues));setBusy(false);setErrors({});setIssuerError('');issuerTouched.current.clear();
  if(token)fetch(base()+'/api/admin/finance/document-issuer',{headers:{Authorization:'Bearer '+token},signal:controller.signal,cache:'no-store'})
   .then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.message || 'No se pudo consultar el emisor.');return data.issuer || data;})
   .then(issuer=>{if(controller.signal.aborted || generation.current!==revision || session.current.token!==token || localStorage.getItem('token')!==token)return;setValues(previous=>({...previous,issuer:Object.fromEntries(['name','address','phone','dni'].map(key=>[key,issuerTouched.current.has(key) || initialValues.issuer?.[key] ? previous.issuer[key] : issuer[key] || previous.issuer[key]]))}));})
   .catch(error=>{if(error.name!=='AbortError' && generation.current===revision)setIssuerError('No se pudo completar el emisor desde Configuración. Podés revisarlo manualmente.');});
  return ()=>{generation.current++;controller.abort();};
 },[isOpen,documentKind,sourceId,token]);
 const change=(key,value,group)=>{
  markDirty();if(group==='issuer')issuerTouched.current.add(key);
  setValues(previous=>group ? {...previous,[group]:{...previous[group],[key]:value}} : {...previous,[key]:value});
  setErrors(previous=>({...previous,[key]:undefined}));
 };
 const field=(key,label,{group,type='text',options,wide=false}={})=>{
  const value=(group ? values[group]?.[key] : values[key]) ?? '',id='finance-document-'+(group ? group+'-' : '')+key;
  return <label key={id} className={'block text-xs text-crm-fg-muted '+(wide ? 'sm:col-span-2 md:col-span-3' : '')} htmlFor={id}>{label}{options ? <select id={id} value={value} onChange={event=>change(key,event.target.value,group)} className={control+' mt-1'}>{options.map(option=><option key={option} value={option}>{option||'Seleccionar forma de pago'}</option>)}</select> : type==='textarea' ? <textarea id={id} value={value} onChange={event=>change(key,event.target.value,group)} rows={3} className={control+' mt-1 h-auto py-2'}/> : <input id={id} type={type} value={value} onChange={event=>change(key,event.target.value,group)} className={control+' mt-1'} min={type==='number' ? 0 : undefined} step={type==='number' ? 'any' : undefined}/>}</label>;
 };
 const section=(title,children)=><section className="space-y-3"><h3 className="m-0 text-sm font-semibold text-crm-fg">{title}</h3><div className={grid}>{children}</div></section>;
 const editTrade=(index,key,value)=>{markDirty();setValues(previous=>({...previous,tradeIns:previous.tradeIns.map((item,i)=>i===index ? {...item,[key]:value} : item)}));};
 const balance=financeDocumentBalance(values);
 const download=async event=>{
  event.preventDefault();if(busy)return;
  const validation=validateFinanceDocument(values,documentKind);setErrors(validation.errors);if(Object.keys(validation.errors).length)return;
  const captured=token,revision=generation.current;setBusy(true);
  try{
   const pdf=await createFinanceDocumentPdf(values,documentKind);
   if(!session.current.isOpen || session.current.token!==captured || generation.current!==revision || localStorage.getItem('token')!==captured)return;
   const blob=pdf.output('blob'),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=(isBoleto ? 'Boleto' : 'Recibo')+'-AutoSporting-'+values.date+'.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){if(generation.current===revision)setErrors(error.errors || {_form:error.message || 'No se pudo generar el PDF.'});}
  finally{if(generation.current===revision)setBusy(false);}
 };
 const financingVisible=isBoleto && (values.paymentMethod==='Financiado' || values.paymentMethod==='Permuta' && values.balancePaymentMethod==='Financiado');
 const footer=<>{closeNotice}<div className="flex items-center justify-between gap-3"><span className="text-xs text-crm-fg-muted">Documento independiente · no registra un movimiento de caja.</span><div className="flex shrink-0 gap-2"><button type="button" onClick={requestClose} disabled={busy} className="rounded-lg border border-crm-border px-3 py-2 text-xs">Cancelar</button><button type="submit" form="finance-document-form" disabled={busy} className="flex items-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-xs font-semibold text-white"><Download size={15}/>{busy ? 'Preparando…' : 'Descargar PDF'}</button></div></div></>;
 return <VehicleEditorDialog isOpen={isOpen} onClose={requestClose} title={isBoleto ? 'Nuevo boleto de compraventa' : 'Nuevo recibo'} busy={busy} closeLabel="Cerrar documento financiero" footer={footer}>
  <form id="finance-document-form" onSubmit={download} className="space-y-5 p-4 sm:p-5">
   <VehicleFormErrors prefix="finance-document" errors={Object.fromEntries(Object.entries(errors).filter(([,value])=>value))}/>
   <fieldset disabled={busy} className="min-w-0 space-y-5">
    {section('Datos del documento',[field('date','Fecha *',{type:'date'}),field('city','Ciudad'),!isBoleto && field('number','N° de recibo (opcional)')])}
    {section(isBoleto ? 'Comprador' : 'Recibí de',[field('name','Nombre',{group:'buyer'}),field('dni','DNI / CUIT',{group:'buyer'}),field('phone','Teléfono',{group:'buyer'}),field('address','Domicilio',{group:'buyer',wide:true})])}
    {isBoleto&&values.seller&&section('Vendedor',[field('name','Nombre',{group:'seller'}),field('dni','DNI / CUIT',{group:'seller'}),field('phone','Teléfono',{group:'seller'}),field('address','Domicilio',{group:'seller',wide:true})])}
    {section('Importe',[field('amount','Monto *',{type:'number'}),field('currency','Moneda',{options:['ARS','USD']})])}
    {isBoleto ? <>
     {section('Vehículo',[field('brand','Marca',{group:'vehicle'}),field('type','Tipo',{group:'vehicle'}),field('model','Modelo',{group:'vehicle'}),field('engine','Motor',{group:'vehicle'}),field('chassis','Chasis',{group:'vehicle'}),field('plate','Dominio',{group:'vehicle'}),field('km','Kilómetros',{group:'vehicle',type:'number'})])}
     {section('Pago',[field('paymentMethod','Forma de pago',{options:['','Contado','Otro','Permuta','Financiado']}),values.paymentMethod==='Otro' && field('paymentOther','Detalle de pago',{wide:true})])}
     {values.paymentMethod==='Permuta' && <section className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold">Permutas</h3><button type="button" onClick={()=>{markDirty();setValues(previous=>({...previous,tradeIns:[...previous.tradeIns,{owner:'',brand:'',model:'',year:'',plate:'',color:'',km:'',engine:'',chassis:'',value:'',currency:previous.currency}]}));}} className="flex items-center gap-1 rounded-lg border border-crm-border px-3 py-2 text-xs"><Plus size={14}/>Agregar permuta</button></div>
      {values.tradeIns.map((item,index)=><div key={index} className="space-y-3 rounded-xl border border-crm-border p-3"><div className="flex items-center justify-between"><strong className="text-xs">Permuta {index+1}</strong><button type="button" aria-label={'Quitar permuta '+(index+1)} onClick={()=>{markDirty();setValues(previous=>({...previous,tradeIns:previous.tradeIns.filter((_,i)=>i!==index)}));}} className="rounded-lg p-2 text-crm-fg-muted"><Trash2 size={14}/></button></div><div className={grid}>{[['owner','Titular'],['brand','Marca'],['model','Modelo'],['year','Año'],['plate','Dominio'],['color','Color'],['km','Kilómetros'],['engine','Motor'],['chassis','Chasis'],['value','Valor de toma']].map(([key,label])=><label key={key} className="text-xs text-crm-fg-muted">{label}<input value={item[key] ?? ''} onChange={event=>editTrade(index,key,event.target.value)} type={['year','km','value'].includes(key) ? 'number' : 'text'} min={0} step={key==='value' ? 'any' : undefined} className={control+' mt-1'}/></label>)}<label className="text-xs text-crm-fg-muted">Moneda<select value={item.currency} onChange={event=>editTrade(index,'currency',event.target.value)} className={control+' mt-1'}><option>ARS</option><option>USD</option></select></label></div></div>)}
      <p className="rounded-lg border border-crm-border bg-crm-bg p-3 text-sm">{balance.foreign ? 'Las permutas tienen monedas diferentes. Los valores se muestran separados; no se calcula un saldo convertido.' : balance.balance===null ? 'Completá los importes para calcular el saldo.' : 'Saldo: '+values.currency+' '+balance.balance.toLocaleString('es-AR',{maximumFractionDigits:2})}</p>
      <div className={grid}>{field('balancePaymentMethod','Forma de pago del saldo',{options:['','Contado','Otro','Financiado']})}{values.balancePaymentMethod==='Otro' && field('balancePaymentOther','Detalle del pago del saldo',{wide:true})}</div>
     </section>}
     {financingVisible && section('Financiación',[field('entity','Entidad',{group:'financing'}),field('installments','Plazo / cantidad de cuotas',{group:'financing',type:'number'}),field('amount','Monto financiado',{group:'financing',type:'number'}),field('currency','Moneda financiada',{group:'financing',options:['ARS','USD']}),field('installmentAmount','Valor de cuota',{group:'financing',type:'number'}),field('installmentCurrency','Moneda de cuota',{group:'financing',options:['ARS','USD']}),field('notes','Observaciones financiación',{group:'financing',type:'textarea',wide:true})])}
    </> : section('Detalle',[field('concept','Concepto',{wide:true}),field('paymentMethod','Forma de pago')])}
    {section('Observaciones',[field('notes','Observaciones',{type:'textarea',wide:true})])}
    {section(isBoleto ? 'Firma · representante' : 'Firma · recibe',[field('name','Nombre',{group:'signer'}),field('dni','DNI',{group:'signer'})])}
    <details className="rounded-xl border border-crm-border p-4"><summary className="cursor-pointer text-sm font-semibold">Agencia / emisor</summary>{issuerError && <p role="status" className="mt-3 text-xs text-amber-200">{issuerError}</p>}<div className={grid+' mt-4'}>{field('name','Nombre',{group:'issuer'})}{field('address','Domicilio',{group:'issuer',wide:true})}{field('phone','Teléfono',{group:'issuer'})}{field('dni','DNI / CUIT',{group:'issuer'})}</div></details>
   </fieldset>
  </form>
 </VehicleEditorDialog>;
}
