"use client";
import {useEffect,useRef,useState} from 'react';
import {ScanText,Square,FileText} from 'lucide-react';
import {useAuth} from '../../../context/AuthContext';
import {parseClientDocumentText,clientDocumentOcrPatch,CLIENT_DOCUMENT_FIELD_LABELS} from '../../../utils/clientDocumentText';
import {extractClientDocumentText} from '../../../utils/clientOcrRuntime';
const button='inline-flex items-center gap-2 rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg disabled:opacity-40';
const field='h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg';
export default function ClientOcrControl({isOpen=true,recordKey='new',onApply,disabled=false,summaryLabel,compactButton=false,allowedFields}){
 const {token}=useAuth();
 const allowedKey=allowedFields===undefined?'*':JSON.stringify([...new Set(Array.isArray(allowedFields)?allowedFields:[])].sort());
 const limitProposals=values=>allowedKey==='*'?values:clientDocumentOcrPatch(values,Array.isArray(allowedFields)?allowedFields:[]);
 const [file,setFile]=useState(null),[text,setText]=useState(''),[proposals,setProposals]=useState({}),[selected,setSelected]=useState([]);
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 const input=useRef(null),controller=useRef(null),generation=useRef(0),active=useRef({token,recordKey,isOpen,allowedKey}),proposalScope=useRef(null);
 active.current={token,recordKey,isOpen,allowedKey};
 const current=(captured,key,revision,fieldsKey=allowedKey)=>active.current.isOpen && active.current.token===captured && active.current.recordKey===key && active.current.allowedKey===fieldsKey && generation.current===revision && localStorage.getItem('token')===captured;
 useEffect(()=>{
  generation.current++;controller.current?.abort();setFile(null);setText('');setProposals({});setSelected([]);setBusy(false);setProgress(null);setError('');setMessage('');
  return ()=>{generation.current++;controller.current?.abort();};
 },[token,recordKey,isOpen,allowedKey]);
 const choose=event=>{
  const chosen=event.target.files?.[0];event.target.value='';
  if(!chosen)return;
  setFile(chosen);setError('');setMessage('');setText('');setProposals({});setSelected([]);
 };
 const cancel=()=>{controller.current?.abort();generation.current++;setBusy(false);setProgress(null);setMessage('Lectura cancelada. Podés volver a intentarlo.');};
 const read=async()=>{
  if(!file || busy || disabled || !token)return;
  const revision=++generation.current,captured=token,key=recordKey,pending=new AbortController();controller.current=pending;
  setBusy(true);setError('');setMessage('');setProposals({});setSelected([]);
  try{
   const result=await extractClientDocumentText(file,{signal:pending.signal,onProgress:next=>{if(current(captured,key,revision))setProgress(next);}});
   if(!current(captured,key,revision))return;
   setText(result.text);
   if(!result.text.trim()){setMessage('No se reconoció texto. Podés intentar otra imagen o completar los datos manualmente.');return;}
   const values=limitProposals(parseClientDocumentText(result.text));proposalScope.current={token:captured,key,revision,allowedKey};setProposals(values);setSelected(Object.keys(values));
   setMessage((result.method==='text' ? 'Texto del PDF leído.' : result.method==='mixed' ? 'PDF leído con texto y OCR local.' : 'Texto reconocido localmente.')+(result.truncated ? ' Se procesaron solo las primeras 3 páginas.' : '')+(Object.keys(values).length?' Revisá y elegí los campos antes de aplicarlos.':' No se reconocieron campos compatibles para completar esta ficha.'));
  }catch(failure){if(current(captured,key,revision) && failure.name!=='AbortError')setError('No se pudo leer el archivo. '+(failure.message || 'Probá otra imagen o completá los campos manualmente.'));}
  finally{if(current(captured,key,revision)){setBusy(false);setProgress(null);}}
 };
 const prepare=()=>{const values=limitProposals(parseClientDocumentText(text));proposalScope.current={token,key:recordKey,revision:generation.current,allowedKey};setProposals(values);setSelected(Object.keys(values));setMessage(Object.keys(values).length ? 'Propuesta preparada para revisar.' : 'No se reconocieron campos compatibles. Podés completar o corregir el formulario manualmente.');};
 const apply=()=>{
  if(disabled || busy || !proposalScope.current || !current(proposalScope.current.token,proposalScope.current.key,proposalScope.current.revision,proposalScope.current.allowedKey))return;
  const patch=clientDocumentOcrPatch(proposals,selected);if(!Object.keys(patch).length){setMessage('Elegí al menos un campo con un valor válido antes de aplicar.');return;}
  onApply?.(patch);setProposals({});setSelected([]);setText('');setFile(null);setMessage('Campos aplicados al formulario. Revisalos y usá Guardar para enviarlos.');
 };
 if(!isOpen)return null;
 const stage=progress?.stage==='engine' ? 'Preparando el motor local…' : progress?.stage==='pdf' ? 'Leyendo PDF' : progress?.stage==='prepare' ? 'Preparando imagen…' : 'Reconociendo texto';
 return <details className={'rounded-xl border bg-crm-surface '+(compactButton?'border-emerald-500/35':'border-crm-border')}>
  <summary className={'cursor-pointer px-4 py-3 text-sm font-semibold '+(compactButton?'rounded-lg bg-emerald-500/10 text-center text-emerald-300':'text-crm-fg')}>{summaryLabel || 'Completar desde un documento · OCR local'}</summary>
  <div className="space-y-3 border-t border-crm-border p-4">
   <p className="m-0 text-xs leading-5 text-crm-fg-muted">El archivo se procesa en este navegador, con recursos de AutoSporting. PDF, PNG, JPEG o WebP de hasta 5 MB; PDF hasta 3 páginas. La propuesta es editable y solo se aplican los campos que elijas. La ficha se envía cuando usás Guardar.</p>
   <input ref={input} type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" onChange={choose}/>
   <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>input.current?.click()} disabled={disabled || busy}><FileText size={15}/>Seleccionar documento</button><button type="button" className={button} onClick={read} disabled={disabled || busy || !file}><ScanText size={15}/>Leer documento</button>{busy && <button type="button" className={button} onClick={cancel}><Square size={14}/>Cancelar lectura</button>}</div>
   {file && <p className="m-0 break-all text-xs text-crm-fg-muted">{file.name}</p>}
   {busy && <div role="status" className="space-y-2"><p className="m-0 text-xs text-crm-fg-muted">{stage}{progress?.page ? ' · página '+progress.page+(progress.total ? ' de '+progress.total : '') : ''}</p><progress className="h-2 w-full accent-crm-red" max={1} value={progress?.progress || 0} aria-label="Progreso de lectura"/></div>}
   {error && <p role="alert" className="m-0 rounded-lg border border-red-500/30 p-3 text-xs text-red-200">{error}</p>}
   {message && <p role="status" className="m-0 text-xs leading-5 text-crm-fg-muted">{message}</p>}
   {text && <details className="rounded-lg border border-crm-border p-3"><summary className="cursor-pointer text-xs text-crm-fg-muted">Texto leído · revisar o corregir</summary><textarea value={text} onChange={event=>setText(event.target.value)} maxLength={60000} rows={5} disabled={disabled || busy} aria-label="Texto reconocido del documento" className={field+' mt-2 h-auto min-h-28 py-2'}/><button type="button" className={button+' mt-2'} onClick={prepare} disabled={disabled || busy}>Preparar campos desde este texto</button></details>}
   {Object.keys(proposals).length>0 && <div className="space-y-3 rounded-lg border border-crm-border p-3"><p className="m-0 text-xs font-semibold text-crm-fg">Revisá la propuesta antes de aplicarla</p>{Object.entries(proposals).map(([key,value])=><div key={key} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2"><input type="checkbox" aria-label={'Aplicar '+CLIENT_DOCUMENT_FIELD_LABELS[key]} checked={selected.includes(key)} disabled={disabled || busy} onChange={event=>setSelected(previous=>event.target.checked ? [...previous,key] : previous.filter(name=>name!==key))} className="mt-6 accent-crm-red"/><label className="block text-xs text-crm-fg-muted">{CLIENT_DOCUMENT_FIELD_LABELS[key]}{key==='gender' ? <select value={value} onChange={event=>setProposals(previous=>({...previous,[key]:event.target.value}))} className={field+' mt-1'} disabled={disabled || busy}><option value="">—</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option></select> : <input type={key==='birthDate' ? 'date' : 'text'} value={value} onChange={event=>setProposals(previous=>({...previous,[key]:event.target.value}))} className={field+' mt-1'} disabled={disabled || busy}/>}</label></div>)}<div className="flex flex-wrap gap-2"><button type="button" onClick={apply} disabled={disabled || busy || !selected.length} className="rounded-lg bg-crm-red px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Aplicar campos revisados</button><button type="button" className={button} onClick={()=>{setProposals({});setSelected([]);}} disabled={disabled || busy}>Descartar propuesta</button></div></div>}
  </div>
 </details>;
}
