"use client";
import {useEffect,useRef,useState} from 'react';
import {Upload,Download,Trash2,RotateCcw,FileText} from 'lucide-react';
import {useAuth} from '../../../context/AuthContext';
import {hasPermission,PERMISSIONS} from '../../../utils/adminPermissions';
import {uploadPrivateFiles} from '../../../utils/uploadPrivateFiles';
import {downloadPrivateFile} from '../../../utils/downloadPrivateFile';
const base=()=>process.env.NODE_ENV==='production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const button='inline-flex items-center gap-1.5 rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg disabled:opacity-40';
const size=bytes=>bytes<1024*1024 ? Math.ceil(bytes/1024)+' KB' : (bytes/1024/1024).toFixed(1)+' MB';
export default function FinanceDocumentsPanel({transactionId}){
 const {token,user}=useAuth();
 const [state,setState]=useState({owner:'',documents:[],loading:true,error:''});
 const [files,setFiles]=useState([]),[busy,setBusy]=useState(''),[showDeleted,setShowDeleted]=useState(false),[message,setMessage]=useState(''),[progress,setProgress]=useState(0);
 const input=useRef(null),pending=useRef(null),generation=useRef(0),uploadId=useRef('');
 const active=useRef({token,transactionId});active.current={token,transactionId};
 const canRead=hasPermission(user,PERMISSIONS.FINANZAS_READ);
 const canWrite=hasPermission(user,PERMISSIONS.FINANZAS_WRITE);
 const owner=token+':'+transactionId;
 const current=(captured,revision)=>generation.current===revision && active.current.token===captured && active.current.transactionId===transactionId && localStorage.getItem('token')===captured;
 const endpoint=base()+'/api/admin/transactions/'+encodeURIComponent(transactionId || '')+'/documents';
 const load=async()=>{
  const captured=token,revision=generation.current,controller=new AbortController();pending.current?.abort();pending.current=controller;
  setState(previous=>({...previous,owner,loading:true,error:''}));
  try{
   const response=await fetch(endpoint,{headers:{Authorization:'Bearer '+captured},cache:'no-store',signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.message || 'No se pudieron consultar los archivos.');
   if(current(captured,revision))setState({owner,documents:data.documents || [],loading:false,error:''});
  }catch(error){if(current(captured,revision) && error.name!=='AbortError')setState(previous=>({...previous,owner,loading:false,error:error.message}));}
 };
 useEffect(()=>{
  generation.current++;setFiles([]);setBusy('');setShowDeleted(false);setMessage('');uploadId.current=crypto.randomUUID();
  setState({owner,documents:[],loading:true,error:''});
  if(canRead && token && transactionId)void load();
  return ()=>{generation.current++;pending.current?.abort();};
 },[token,transactionId,canRead]);
 useEffect(()=>{
  if(!files.length && !busy)return;
  const warn=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);
  return ()=>window.removeEventListener('beforeunload',warn);
 },[files.length,busy]);
 const visible=state.owner===owner ? state : {documents:[],loading:true,error:''};
 const count=visible.documents.filter(document=>!document.deletedAt).length;
 const choose=event=>{
  const chosen=Array.from(event.target.files || []);event.target.value='';
  if(!chosen.length)return;
  if(chosen.length+count>5){setMessage('El movimiento admite hasta 5 archivos activos. Revisá la selección.');return;}
  if(chosen.some(file=>!file.size || file.size>15*1024*1024)){setMessage('Cada archivo debe tener contenido y pesar hasta 15 MB.');return;}
  uploadId.current=crypto.randomUUID();setFiles(chosen);setMessage('');
 };
 const mutate=async(kind,document=null)=>{
  if(busy || !canWrite || !canRead || kind==='upload' && !files.length)return;
  const captured=token,revision=generation.current,controller=new AbortController();pending.current?.abort();pending.current=controller;
  setBusy(kind);setMessage('');setProgress(0);
  try{
   let response,data;
   if(kind==='upload'){
    data=await uploadPrivateFiles({basePath:base()+'/api/admin/transactions/'+encodeURIComponent(transactionId)+'/document-uploads',files,token:captured,uploadId:uploadId.current,signal:controller.signal,onProgress:status=>{if(current(captured,revision))setProgress(status.percent);}});
   }else response=await fetch(endpoint+'/'+document._id,{method:'PATCH',headers:{Authorization:'Bearer '+captured,'Content-Type':'application/json'},body:JSON.stringify({deleted:kind==='delete'}),signal:controller.signal});
   if(kind!=='upload'){data=await response.json();if(!response.ok)throw Error(data.message || 'No se pudo guardar el cambio.');}
   if(!current(captured,revision))return;
   if(kind==='upload'){setFiles([]);setMessage(data.replayed ? 'La carga anterior ya estaba guardada.' : 'Archivos guardados.');}
   else{setState(previous=>({...previous,documents:previous.documents.map(item=>item._id===data.document._id ? data.document : item)}));setMessage(kind==='delete' ? 'Archivo eliminado. Podés restaurarlo.' : 'Archivo restaurado.');}
   await load();
  }catch(error){if(current(captured,revision) && error.name!=='AbortError')setMessage(error.message+' Podés revisar y reintentar.');}
  finally{if(current(captured,revision))setBusy('');}
 };
 const download=async document=>{
  if(busy || !canRead)return;
  const captured=token,revision=generation.current,controller=new AbortController();pending.current?.abort();pending.current=controller;setBusy('download');setMessage('');
  try{
   await downloadPrivateFile({url:endpoint+'/'+document._id,token:captured,signal:controller.signal,filename:document.filename,maxBytes:15*1024*1024});
  }catch(error){if(current(captured,revision) && error.name!=='AbortError')setMessage(error.message);}
  finally{if(current(captured,revision))setBusy('');}
 };
 if(!canRead)return <p className="rounded-lg border border-crm-border p-4 text-xs text-crm-fg-muted">Necesitás permisos de consulta de Clientes y Documentación para acceder a estos archivos.</p>;
 return <section className="space-y-3 rounded-xl border border-crm-border p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-crm-fg">Archivos del movimiento</h3><span className="text-xs text-crm-fg-muted">{count} de 5 activos</span></div>
  <p className="m-0 text-xs leading-5 text-crm-fg-muted">Comprobantes privados, disponibles solo con permisos. Hasta 5 archivos activos de 15 MB cada uno. Seleccioná y confirmá Subir; eliminar conserva el archivo para restaurarlo. No se realiza OCR.</p>
  {canWrite && <div className="space-y-2"><input type="file" multiple hidden ref={input} onChange={choose}/><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={Boolean(busy) || visible.loading || count>=5} onClick={()=>input.current?.click()}><Upload size={14}/>Agregar archivos</button>{files.length>0 && <><button type="button" className={button+' !border-crm-red !bg-crm-red !text-white'} disabled={Boolean(busy)} onClick={()=>mutate('upload')}>{busy==='upload' ? 'Subiendo '+progress+'%…' : 'Subir '+files.length+' archivos'}</button><button type="button" className={button} disabled={Boolean(busy)} onClick={()=>setFiles([])}>Quitar selección</button></>}</div>{files.length>0 && <ul className="m-0 space-y-1 pl-4 text-xs text-crm-fg-muted">{files.map((file,index)=><li key={index}>{file.name} · {size(file.size)} · todavía sin guardar</li>)}</ul>}</div>}
  {message && <p role="status" className="m-0 rounded-lg border border-crm-border p-3 text-xs text-crm-fg-muted">{message}</p>}
  {visible.error && <p role="alert" className="m-0 text-xs text-red-300">{visible.error} <button type="button" disabled={Boolean(busy)} onClick={load} className="underline">Reintentar consulta</button></p>}
  {visible.loading && <p role="status" className="m-0 text-xs text-crm-fg-muted">Consultando archivos…</p>}
  {!visible.loading && !visible.error && !visible.documents.some(document=>!document.deletedAt) && <p className="m-0 rounded-lg border border-dashed border-crm-border p-3 text-xs text-crm-fg-muted">No hay archivos activos guardados.</p>}
  {visible.documents.some(document=>document.deletedAt) && <label className="flex items-center gap-2 text-xs text-crm-fg-muted"><input type="checkbox" checked={showDeleted} onChange={event=>setShowDeleted(event.target.checked)} className="accent-crm-red"/>Mostrar eliminados para restaurar</label>}
  <ul className="m-0 space-y-2 p-0">{visible.documents.filter(document=>!document.deletedAt || showDeleted).map(document=><li key={document._id} className="flex list-none flex-wrap items-center justify-between gap-3 rounded-lg border border-crm-border p-3"><div className="min-w-0 flex-1"><p className="m-0 flex items-start gap-2 break-all text-xs font-medium text-crm-fg"><FileText size={14} className="shrink-0"/>{document.filename}</p><p className="mb-0 mt-1 text-[10px] text-crm-fg-muted">{size(document.size)} · {document.deletedAt ? 'Eliminado · recuperable' : 'Guardado'} · {new Date(document.createdAt).toLocaleDateString('es-AR')}</p></div><div className="flex gap-2">{!document.deletedAt && <button type="button" className={button} disabled={Boolean(busy)} onClick={()=>download(document)} aria-label={'Descargar '+document.filename}><Download size={13}/></button>}{canWrite && <button type="button" className={button} disabled={Boolean(busy)} onClick={()=>mutate(document.deletedAt ? 'restore' : 'delete',document)} aria-label={(document.deletedAt ? 'Restaurar ' : 'Eliminar ')+document.filename}>{document.deletedAt ? <RotateCcw size={13}/> : <Trash2 size={13}/>}</button>}</div></li>)}</ul>
 </section>;
}
