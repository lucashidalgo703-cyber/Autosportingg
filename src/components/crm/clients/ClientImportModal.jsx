"use client";
import {useEffect,useRef,useState} from 'react';
import {Download,Upload,FileSpreadsheet} from 'lucide-react';
import * as XLSX from 'xlsx';
import CrmModal from '../ui/CrmModal';
import {useAuth} from '../../../context/AuthContext';
import {hasPermission,PERMISSIONS} from '../../../utils/adminPermissions';
import {useVehicleFormClose} from '../stock/VehicleEditorDialog';
import {CLIENT_SPREADSHEET_COLUMNS,clientSpreadsheetColumnFor,clientSpreadsheetTemplateRows} from '../../../utils/clientSpreadsheet';
const base=()=>process.env.NODE_ENV==='production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const batchId=()=>crypto.randomUUID();
const field='h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg';
const button='rounded-lg border border-crm-border px-3 py-2 text-xs text-crm-fg disabled:opacity-40';
const statusNames={valid:'Alta nueva',update:'Actualizar',duplicate:'Omitido · existente',error:'Revisar'};
function sheetRows(workbook){
 const sheet=workbook.Sheets[workbook.SheetNames[0]];
 if(!sheet?.['!ref'])throw Error('El archivo está vacío.');
 const range=XLSX.utils.decode_range(sheet['!ref']);
 const headers=[];
 for(let column=range.s.c;column<=range.e.c;column++)headers.push(String(sheet[XLSX.utils.encode_cell({r:range.s.r,c:column})]?.v ?? '').trim());
 if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw Error('Hay encabezados repetidos. Revisá la primera fila antes de importar.');
 if(headers.includes('_rowNumber'))throw Error('El encabezado _rowNumber está reservado. Cambiá ese nombre de columna.');
 const rows=[];
 for(let row=range.s.r+1;row<=range.e.r;row++){
  const values=Object.create(null);let populated=false;
  for(let index=0;index<headers.length;index++){
   const header=headers[index] || 'Columna sin encabezado '+(index+1);
   const cell=sheet[XLSX.utils.encode_cell({r:row,c:range.s.c+index})];
   let value=cell?.v ?? '';
   const definition=clientSpreadsheetColumnFor(header);
   if(definition?.kind==='text' && typeof value==='number' && cell?.w && /^[+\d().\s-]+$/.test(cell.w))value=cell.w;
   if(value instanceof Date)value=value.toISOString().slice(0,10);
   values[header]=value;if(value!=='' && value!=null)populated=true;
  }
  if(populated){values._rowNumber=row+1;rows.push(values);}
 }
 if(!rows.length)throw Error('No hay filas de clientes debajo de los encabezados.');
 return rows;
}
export default function ClientImportModal({isOpen,onClose,onSuccess}){
 const {token,user}=useAuth();
 const [fileName,setFileName]=useState(''),[rows,setRows]=useState([]),[preview,setPreview]=useState(null);
 const [options,setOptions]=useState({duplicateMode:'skip',blankMode:'preserve'});
 const [selected,setSelected]=useState([]),[unknownAccepted,setUnknownAccepted]=useState(false);
 const [busy,setBusy]=useState(''),[error,setError]=useState('');
 const fileInput=useRef(null),controller=useRef(null),generation=useRef(0),run=useRef('');
 const active=useRef({isOpen,token});active.current={isOpen,token};
 const canImport=hasPermission(user,PERMISSIONS.CLIENTES_READ) && hasPermission(user,PERMISSIONS.CLIENTES_WRITE);
 const {markDirty,requestClose,closeNotice}=useVehicleFormClose({isOpen,onClose,busy:busy==='saving',resetKey:token});
 const current=(captured,revision)=>active.current.isOpen && active.current.token===captured && generation.current===revision && localStorage.getItem('token')===captured;
 useEffect(()=>{
  generation.current++;controller.current?.abort();
  if(isOpen){setFileName('');setRows([]);setPreview(null);setSelected([]);setUnknownAccepted(false);setOptions({duplicateMode:'skip',blankMode:'preserve'});setBusy('');setError('');run.current=batchId();}
  return ()=>{generation.current++;controller.current?.abort();};
 },[isOpen,token]);
 const putPreview=data=>{setPreview(data);setSelected((data.results || []).filter(row=>['valid','update'].includes(row._importStatus)).map(row=>row.rowNumber));setUnknownAccepted(false);};
 const validate=async(data,config=options,revision=generation.current)=>{
  const captured=token,pending=new AbortController();
  controller.current?.abort();controller.current=pending;setBusy('validating');setError('');
  try{
   const response=await fetch(base()+'/api/admin/clients/validate-import',{method:'POST',headers:{Authorization:'Bearer '+captured,'Content-Type':'application/json'},body:JSON.stringify({rows:data,...config}),signal:pending.signal});
   const result=await response.json();if(!response.ok)throw Error(result.message || 'No se pudo validar el archivo.');
   if(current(captured,revision) && !pending.signal.aborted)putPreview(result);
  }catch(failure){if(current(captured,revision) && failure.name!=='AbortError')setError(failure.message);}
  finally{if(current(captured,revision))setBusy('');}
 };
 const chooseFile=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  const revision=++generation.current,captured=token;controller.current?.abort();
  setError('');setBusy('reading');setPreview(null);setRows([]);setSelected([]);setFileName(file.name);run.current=batchId();markDirty();
  try{
   if(!/\.(xlsx|xls)$/i.test(file.name))throw Error('Elegí un archivo .xlsx o .xls.');
   if(file.size>20*1024*1024)throw Error('El archivo supera los 20 MB. Dividilo en archivos más pequeños.');
   const buffer=await file.arrayBuffer();
   if(!current(captured,revision))return;
   const workbook=XLSX.read(buffer,{type:'array',cellDates:false});
   const parsed=sheetRows(workbook);
   if(parsed.length>1000)throw Error('Esta carga admite hasta 1000 filas. Se recomiendan menos de 500 por archivo.');
   setRows(parsed);await validate(parsed,options,revision);
  }catch(failure){if(current(captured,revision)){setError(failure.message);setBusy('');}}
  finally{if(fileInput.current)fileInput.current.value='';}
 };
 const changeOption=(name,value)=>{
  const config={...options,[name]:value};setOptions(config);run.current=batchId();markDirty();
  if(rows.length){generation.current++;void validate(rows,config,generation.current);}
 };
 const template=()=>{
  const workbook=XLSX.utils.book_new();
  const sheet=XLSX.utils.json_to_sheet(clientSpreadsheetTemplateRows(),{header:CLIENT_SPREADSHEET_COLUMNS.map(column=>column.header)});
  sheet['!cols']=CLIENT_SPREADSHEET_COLUMNS.map(()=>({wch:24}));
  XLSX.utils.book_append_sheet(workbook,sheet,'Clientes');
  XLSX.writeFile(workbook,'AutoSporting_plantilla_clientes.xlsx');
 };
 const confirm=async()=>{
  if(busy || !canImport || !preview || !selected.length || preview.unknownHeaders?.length && !unknownAccepted)return;
  const revision=generation.current,captured=token,pending=new AbortController();
  controller.current=pending;setBusy('saving');setError('');
  try{
   const response=await fetch(base()+'/api/admin/clients/bulk',{method:'POST',headers:{Authorization:'Bearer '+captured,'Content-Type':'application/json'},body:JSON.stringify({rows,...options,batchId:run.current,previewToken:preview.previewToken,selectedRowNumbers:selected,acceptedUnknownColumns:unknownAccepted}),signal:pending.signal});
   const result=await response.json();
   if(!current(captured,revision))return;
   if(!response.ok){if(result.results)putPreview(result);throw Error(result.message || 'No se pudo importar. Podés reintentar conservando este archivo.');}
   try{Promise.resolve(onSuccess?.(result.count,result)).catch(()=>{});}catch{/* The accepted import is preserved if a parent refresh fails. */}
   onClose();
  }catch(failure){if(current(captured,revision) && failure.name!=='AbortError')setError(failure.message+' Las filas se conservan para revisar o reintentar.');}
  finally{if(current(captured,revision))setBusy('');}
 };
 const results=preview?.results || [],unknown=preview?.unknownHeaders || [];
 const counts=Object.fromEntries(['valid','update','duplicate','error'].map(status=>[status,results.filter(row=>row._importStatus===status).length]));
 const footer=<>{closeNotice}<div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-crm-fg-muted">{preview ? selected.length+' filas seleccionadas · '+(results.length-selected.length)+' omitidas' : 'No se modifica ninguna ficha hasta confirmar.'}</span><div className="flex gap-2"><button type="button" className={button} onClick={requestClose} disabled={busy==='saving'}>Cancelar</button>{rows.length>0 && <button type="button" className={button} onClick={()=>{run.current=batchId();generation.current++;void validate(rows,options,generation.current);}} disabled={Boolean(busy)}>Validar de nuevo</button>}{preview && <button type="button" disabled={Boolean(busy) || !selected.length || Boolean(unknown.length && !unknownAccepted) || !canImport} onClick={confirm} className="rounded-lg bg-crm-red px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy==='saving' ? 'Importando…' : 'Confirmar '+selected.length+' filas'}</button>}</div></div></>;
 return <CrmModal isOpen={isOpen} onClose={requestClose} title="Importar clientes desde XLSX" maxWidth={preview ? 'max-w-4xl' : 'max-w-2xl'} fullScreenOnMobile footer={footer}>
  <div className="space-y-4 p-4 sm:p-5">
   {!canImport && <p role="alert" className="text-sm text-amber-200">Necesitás permisos de consulta y edición de Clientes.</p>}
   {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-crm-fg">{error}</p>}
   <p className="m-0 text-xs leading-5 text-crm-fg-muted">Encabezados en la primera fila, columnas en cualquier orden, con o sin tildes. <strong className="text-crm-fg">Nombre es el único dato obligatorio.</strong> Admitimos .xlsx/.xls; se recomiendan menos de 500 filas (máximo local 1000). Nacimiento y fechas: AAAA-MM-DD o DD/MM/AAAA.</p>
   <div className="flex flex-wrap gap-2"><button type="button" className={button+' flex items-center gap-2'} onClick={template} disabled={Boolean(busy)}><Download size={15}/>Descargar plantilla</button><button type="button" className={button+' flex items-center gap-2'} onClick={()=>fileInput.current?.click()} disabled={Boolean(busy) || !canImport}><Upload size={15}/>{fileName ? 'Cambiar archivo' : 'Seleccionar archivo'}</button><input ref={fileInput} type="file" accept=".xlsx,.xls" hidden onChange={chooseFile}/></div>
   {fileName && <p className="flex items-center gap-2 break-all text-xs text-crm-fg-muted"><FileSpreadsheet size={16}/>{fileName}</p>}
   {busy && <p role="status" className="text-xs text-crm-fg-muted">{busy==='reading' ? 'Leyendo archivo…' : busy==='validating' ? 'Validando filas y coincidencias…' : 'Guardando el lote completo…'}</p>}
   <details className="rounded-lg border border-crm-border p-3"><summary className="cursor-pointer text-xs font-semibold text-crm-fg">Columnas admitidas y conservación de datos</summary><p className="text-xs leading-5 text-crm-fg-muted">La plantilla y la exportación comparten campos. Vendedor puede ser nombre/email exacto o Vendedor ID; si hay nombres repetidos, usá el ID. Cliente ID ayuda a identificar una ficha existente. Los vínculos de stock necesitan un ID válido de esta agencia. Teléfonos y DNI se exportan como texto para conservar su formato. No se importan auditorías, archivos ni operaciones.</p><div className="flex flex-wrap gap-1">{CLIENT_SPREADSHEET_COLUMNS.map(column=><span key={column.field} className="rounded border border-crm-border px-2 py-1 text-[10px] text-crm-fg-muted">{column.header}</span>)}</div><p className="mb-0 mt-3 text-xs text-crm-fg-muted">Alias: Mail/Correo; Celular/WhatsApp; DNI/CUIT/CUIL; Dirección; Cumpleaños; Busca; Asesor; Stage; Canal. No se convierten monedas ni se envían mensajes o se ejecuta rotación automática.</p></details>
   <fieldset disabled={Boolean(busy)} className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
    <label className="block text-xs text-crm-fg-muted">Fichas existentes<select value={options.duplicateMode} onChange={event=>changeOption('duplicateMode',event.target.value)} className={field+' mt-1'}><option value="skip">Omitir duplicados (recomendado)</option><option value="update">Actualizar coincidencia única explícitamente</option></select></label>
    <label className="block text-xs text-crm-fg-muted">Celdas vacías al actualizar<select value={options.blankMode} onChange={event=>changeOption('blankMode',event.target.value)} className={field+' mt-1'}><option value="preserve">Conservar el valor actual</option><option value="clear">Vaciar campos opcionales presentes</option></select></label>
   </fieldset>
   <p className="m-0 text-xs leading-5 text-crm-fg-muted">Actualizar modifica solo las columnas del archivo; no fusiona personas. Si ID, teléfono, email o DNI apuntan a fichas diferentes, la fila se bloquea. Las identidades repetidas dentro del archivo se muestran como error. Un reintento del mismo envío no duplica altas.</p>
   {unknown.length>0 && <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs"><p className="m-0">Columnas no reconocidas: {unknown.join(', ')}.</p><label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={unknownAccepted} disabled={Boolean(busy)} onChange={event=>setUnknownAccepted(event.target.checked)} className="mt-0.5 accent-crm-red"/>Entiendo que estas columnas no se importarán.</label></div>}
   {preview && <>
    <div className="flex flex-wrap gap-2 text-xs text-crm-fg-muted"><span>{counts.valid} altas nuevas</span><span>· {counts.update} actualizaciones</span><span>· {counts.duplicate} duplicados omitidos</span><span>· {counts.error} filas con errores</span></div>
    <div className="overflow-auto rounded-lg border border-crm-border"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-crm-bg"><tr><th className="p-3">Elegir</th><th className="p-3">Fila / Estado</th><th className="p-3">Cliente</th><th className="p-3">Detalle y campos</th></tr></thead><tbody className="divide-y divide-crm-border">{results.map(row=><tr key={row.rowNumber}>
     <td className="p-3 align-top"><input aria-label={'Importar fila '+row.rowNumber} type="checkbox" checked={selected.includes(row.rowNumber)} disabled={Boolean(busy) || !['valid','update'].includes(row._importStatus)} onChange={event=>setSelected(previous=>event.target.checked ? [...previous,row.rowNumber] : previous.filter(number=>number!==row.rowNumber))} className="accent-crm-red"/></td>
     <td className="p-3 align-top">{row.rowNumber}<span className={'mt-1 block '+(row._importStatus==='error' ? 'text-red-300' : 'text-crm-fg-muted')}>{statusNames[row._importStatus]}</span></td>
     <td className="max-w-56 break-words p-3 align-top"><strong>{row.fullName || [row.firstName,row.lastName].filter(Boolean).join(' ') || 'Sin nombre'}</strong><span className="mt-1 block text-crm-fg-muted">{row.phone || row.email || 'Sin teléfono ni email'}</span>{row._matchedName && <span className="mt-1 block text-amber-200">Coincide con: {row._matchedName}</span>}</td>
     <td className="max-w-md p-3 align-top"><p className="m-0 text-crm-fg-muted">{row._importMessage}</p>{row._changedFields?.length>0 && row._importStatus==='update' && <p className="mt-1 text-crm-fg-muted">Campos: {row._changedFields.join(', ')}</p>}<details className="mt-2"><summary className="cursor-pointer text-crm-fg-muted">Ver datos leídos</summary><dl className="mt-2 space-y-1">{CLIENT_SPREADSHEET_COLUMNS.filter(column=>Object.hasOwn(row,column.field)).map(column=><div key={column.field} className="break-words"><dt className="inline font-medium">{column.header}: </dt><dd className="m-0 inline whitespace-pre-wrap">{typeof row[column.field]==='boolean' ? row[column.field] ? 'Sí' : 'No' : row[column.field]===null || row[column.field]==='' ? '(vacío)' : Array.isArray(row[column.field]) ? row[column.field].join('; ') : String(row[column.field])}</dd></div>)}</dl></details></td>
    </tr>)}</tbody></table></div>
   </>}
  </div>
 </CrmModal>;
}
