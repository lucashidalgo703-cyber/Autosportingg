"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Save, HelpCircle, Mic, Square, WandSparkles } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { CLIENT_PIPELINE_STAGES } from '../../../utils/clientCommercial';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { buildClientFormPayload, clientToForm, clientDraftIdentity, readClientDraft, writeClientDraft, clearClientDraft, prepareClientText } from '../../../utils/clientFormDraft';
import VehicleEditorDialog, { useVehicleFormClose, VehicleFormErrors, VehicleFormSection, revealVehicleField } from '../stock/VehicleEditorDialog';
import ClientMatchingRequestControl from './ClientMatchingRequestControl';
import ClientOcrControl from './ClientOcrControl';

const CONTROL = 'h-9 w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-1.5 text-sm leading-5 text-crm-fg focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red disabled:opacity-60';
const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2';
const BASE = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const proposalLabels = {fullName:'Nombre',phone:'Teléfono',email:'Email',description:'Lo que busca',nextAction:'Próxima acción'};
const normalizePhone = value => String(value || '').replace(/\D/g, '');
const carLabel = car => [car.brand,car.name,car.year].filter(Boolean).join(' ') + (car.plateOrVin ? ' · ' + car.plateOrVin : '');

function Field({name,label,data,onChange,options,type='text',area=false,compactArea=false,className='',children,...props}) {
    const value = data[name] ?? '';
    const id = 'client-form-' + name;
    const known = options?.some(option => (typeof option === 'string' ? option : option.value) === value);
    return <div className={className}>
        <label htmlFor={id} className="mb-1 block text-xs leading-4 text-crm-fg-muted">{label}</label>
        {options ? <select id={id} name={name} value={value} onChange={onChange} className={CONTROL} {...props}>
            {!known && value && <option value={value}>{value} · valor existente</option>}
            {options.map(option => { const item=typeof option === 'string' ? {value:option,label:option} : option; return <option key={item.value} value={item.value}>{item.label}</option>; })}
        </select> : area ? <textarea id={id} name={name} value={value} onChange={onChange} rows={compactArea ? 1 : 3} className={CONTROL + (compactArea ? ' min-h-9 resize-y' : ' h-auto min-h-20 resize-y')} {...props} />
        : <input id={id} name={name} value={value} onChange={onChange} type={type} className={CONTROL} {...props} />}
        {children}
    </div>;
}
function Section({title,children}) {
    return <section className="space-y-3 rounded-xl border border-crm-border p-4"><h3 className="m-0 text-sm font-semibold text-crm-fg">{title}</h3>{children}</section>;
}

function ClientStockPicker({value,savedLabel,cars,search,onSearch,onSelect,disabled,loading}) {
    const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
    const listId=React.useId();
    const optionLabel=car=>carLabel(car)+(typeof (car.ownerName || car.consignedBy)==='string' && (car.ownerName || car.consignedBy).trim() ? ' · '+(car.ownerName || car.consignedBy).trim() : '');
    const selected=cars.find(car=>car._id===value),selectedLabel=selected?optionLabel(selected):savedLabel;
    const choose=car=>{onSelect({target:{value:car._id}});setOpen(false);setActive(-1);};
    return <div className="relative min-w-0" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setActive(-1);}}}>
        <label htmlFor="client-form-interestedVehicleId" className="mb-1 block text-xs text-crm-fg-muted">Vehículo de stock (opcional)</label>
        <div className="flex min-w-0 gap-1"><input id="client-form-interestedVehicleId" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && cars[active] ? listId+'-'+active : undefined} autoComplete="off" value={open?search:value?selectedLabel:''} placeholder="Buscar marca, modelo o patente…" disabled={disabled} className={CONTROL+' min-w-0 flex-1'} onFocus={()=>{setOpen(true);setActive(-1);onSearch('');}} onClick={()=>{if(!open){setOpen(true);setActive(-1);onSearch('');}}} onChange={event=>{onSearch(event.target.value);setOpen(true);setActive(-1);}} onKeyDown={event=>{
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);setActive(-1);}
            if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setOpen(true);if(cars.length)setActive(previous=>event.key==='ArrowDown'?(previous+1)%cars.length:(previous<=0?cars.length-1:previous-1));}
            if(event.key==='Enter'&&open){event.preventDefault();if(cars[active])choose(cars[active]);}
        }}/>{value && <button type="button" disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>{onSelect({target:{value:''}});onSearch('');setOpen(false);}} aria-label="Quitar vínculo con el vehículo de stock" title="Quitar vínculo de stock" className="h-9 shrink-0 rounded-lg border border-crm-border px-2 text-xs text-crm-fg-muted disabled:opacity-40">Quitar</button>}</div>
        {open && <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-crm-border bg-crm-surface p-1 shadow-xl"><div id={listId} role="listbox" aria-label="Vehículos del catálogo">{cars.map((car,index)=><button key={car._id} id={listId+'-'+index} type="button" role="option" aria-selected={value===car._id} tabIndex={-1} disabled={disabled} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(car)} className={'block w-full rounded-md px-3 py-2 text-left text-xs text-crm-fg '+(index===active?'bg-crm-red/15':'hover:bg-crm-surface-raised')}><span className="block">{optionLabel(car)}</span>{car.status&&<span className="mt-0.5 block text-[10px] text-crm-fg-muted">{car.status}</span>}</button>)}</div>{loading && <p role="status" className="m-0 px-3 py-2 text-xs text-crm-fg-muted">Buscando en stock…</p>}{!loading&&!cars.length&&<p className="m-0 px-3 py-2 text-xs text-crm-fg-muted">Sin unidades para esta búsqueda.</p>}</div>}
    </div>;
}

export default function ClientFormModal({isOpen,onClose,onSave,client=null}) {
    const {token,user} = useAuth();
    const clientId=client?._id || '';
    const draftUserId=clientDraftIdentity(token);
    const [formData,setFormData]=useState(()=>clientToForm());
    const [isSubmitting,setIsSubmitting]=useState(false);
    const [errors,setErrors]=useState({});
    const [submitError,setSubmitError]=useState('');
    const [users,setUsers]=useState([]);
    const [usersError,setUsersError]=useState(false);
    const [cars,setCars]=useState([]);
    const [stockSearch,setStockSearch]=useState('');
    const [stockState,setStockState]=useState({loading:false,error:'',total:0});
    const [reloadStock,setReloadStock]=useState(0);
    const [duplicateWarning,setDuplicateWarning]=useState('');
    const [draftStatus,setDraftStatus]=useState('');
    const [confirmDraftClose,setConfirmDraftClose]=useState(false);
    const [assistantText,setAssistantText]=useState('');
    const [proposals,setProposals]=useState({});
    const [listening,setListening]=useState(false);
    const [speechMessage,setSpeechMessage]=useState('');
    const [speechSupported,setSpeechSupported]=useState(false);
    const [offline,setOffline]=useState(false);
    const generation=useRef(0);
    const saving=useRef(false);
    const speech=useRef(null);
    const identity=useRef({token,isOpen,clientId});
    identity.current={token,isOpen,clientId};
    const canWrite=hasPermission(user,PERMISSIONS.CLIENTES_WRITE);
    const canReadStock=hasPermission(user,PERMISSIONS.STOCK_READ);
    const discardAndClose=()=>{if(!clientId)clearClientDraft(localStorage,draftUserId);onClose();};
    const {dirty,markDirty,requestClose,closeNotice}=useVehicleFormClose({isOpen,onClose:discardAndClose,busy:isSubmitting || listening,resetKey:clientId + ':' + token});

    const current = (sessionToken,revision) => identity.current.isOpen && identity.current.token === sessionToken && generation.current === revision && localStorage.getItem('token') === sessionToken;

    useEffect(()=>{
        generation.current+=1;
        if(!isOpen)return;
        saving.current=false;setIsSubmitting(false);setErrors({});setSubmitError('');setDuplicateWarning('');
        setStockSearch('');setConfirmDraftClose(false);setAssistantText('');setProposals({});setSpeechMessage('');setListening(false);
        let values=clientToForm(client);
        const draft=!clientId && readClientDraft(localStorage,draftUserId);
        if(draft){values={...values,...draft.values,autoAssign:false,dniCuit:''};setDraftStatus('Borrador recuperado. Revisá los datos antes de enviarlos.');markDirty();}
        else setDraftStatus(draftUserId ? 'Los cambios se conservan durante 7 días.' : 'No se pudo identificar una cuenta para conservar un borrador.');
        setFormData(values);
        return ()=>{generation.current+=1;speech.current?.abort();speech.current=null;};
        // Initialize once for each open record/session; parent refreshes must not erase typed fields.
    },[isOpen,clientId,token,draftUserId]);

    useEffect(()=>{
        if(!isOpen)return;
        const update=()=>setOffline(!navigator.onLine);
        update();setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
        window.addEventListener('online',update);window.addEventListener('offline',update);
        return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
    },[isOpen]);

    useEffect(()=>{
        if(!isOpen || !submitError)return;
        const field=Object.keys(errors).find(name=>Boolean(errors[name]) && document.getElementById('client-form-'+name));
        if(field)revealVehicleField(field,'client-form');
        else requestAnimationFrame(()=>document.getElementById('client-form-error')?.scrollIntoView({block:'center'}));
    },[isOpen,submitError,errors]);

    useEffect(()=>{
        if(!isOpen || clientId || !dirty || !draftUserId || !token)return;
        const revision=generation.current;
        const timer=setTimeout(()=>{
            if(!current(token,revision))return;
            const saved=writeClientDraft(localStorage,draftUserId,formData);
            setDraftStatus(saved ? 'Borrador guardado en este dispositivo. Todavía no enviado.' : 'No se pudo conservar el borrador. Mantené esta ventana abierta para no perderlo.');
        },500);
        return ()=>clearTimeout(timer);
    },[isOpen,clientId,dirty,draftUserId,token,formData]);

    useEffect(()=>{
        if(!isOpen || !token)return;
        const controller=new AbortController(),revision=generation.current;
        setUsers([]);setUsersError(false);
        fetch(BASE()+'/api/admin/users/active',{headers:{Authorization:'Bearer '+token},signal:controller.signal,cache:'no-store'})
            .then(response=>{if(!response.ok)throw new Error();return response.json();})
            .then(data=>{if(!controller.signal.aborted && current(token,revision))setUsers(Array.isArray(data) ? data : []);})
            .catch(error=>{if(error.name !== 'AbortError' && current(token,revision))setUsersError(true);});
        return ()=>controller.abort();
    },[isOpen,token,clientId]);

    useEffect(()=>{
        if(!isOpen || !token || !canReadStock){setCars([]);return;}
        const controller=new AbortController(),revision=generation.current;
        setStockState(previous=>({...previous,loading:true,error:''}));
        const timer=setTimeout(async()=>{
            try {
                const query=new URLSearchParams({limit:'100',status:'todos',search:stockSearch});
                const response=await fetch(BASE()+'/api/admin/cars?'+query,{headers:{Authorization:'Bearer '+token},signal:controller.signal,cache:'no-store'});
                const data=await response.json();
                if(!response.ok)throw new Error(data.message || 'No se pudo cargar el stock.');
                if(!controller.signal.aborted && current(token,revision)){setCars(data.cars || []);setStockState({loading:false,error:'',total:data.total || 0});}
            }catch(error){if(error.name !== 'AbortError' && current(token,revision))setStockState({loading:false,error:error.message,total:0});}
        },stockSearch ? 300 : 0);
        return ()=>{clearTimeout(timer);controller.abort();};
    },[isOpen,token,clientId,canReadStock,stockSearch,reloadStock]);

    useEffect(()=>{
        setDuplicateWarning('');
        if(!isOpen || !token || !hasPermission(user,PERMISSIONS.CLIENTES_READ))return;
        const searches=[formData.phone,formData.email].filter(value=>value.trim().length>=5);
        if(!searches.length)return;
        const controller=new AbortController(),revision=generation.current;
        const timer=setTimeout(async()=>{
            const responses=await Promise.allSettled(searches.map(async query=>{
                const response=await fetch(BASE()+'/api/admin/clients?'+new URLSearchParams({search:query,limit:'10'}),{headers:{Authorization:'Bearer '+token},signal:controller.signal,cache:'no-store'});
                if(!response.ok)return [];
                const data=await response.json();return data.clients || [];
            }));
            if(controller.signal.aborted || !current(token,revision))return;
            const matches=responses.flatMap(result=>result.status === 'fulfilled' ? result.value : []).some(other=>other._id !== clientId && (
                (normalizePhone(formData.phone) && normalizePhone(other.phone) === normalizePhone(formData.phone)) ||
                (formData.email.trim() && String(other.email || '').trim().toLowerCase() === formData.email.trim().toLowerCase())
            ));
            if(matches)setDuplicateWarning('Encontramos otro cliente con el mismo teléfono o email. Revisá la ficha existente antes de crear un duplicado.');
        },700);
        return ()=>{clearTimeout(timer);controller.abort();};
    },[formData.phone,formData.email,isOpen,token,clientId,user]);

    const change=(event)=>{
        const {name,value}=event.target;
        markDirty();setConfirmDraftClose(false);setErrors(previous=>({...previous,[name]:undefined}));
        setFormData(previous=>({...previous,[name]:value}));
    };
    const setCapture=reason=>{
        markDirty();setFormData(previous=>({...previous,reason,autoAssign:!clientId && !previous.assignedTo,source:reason === 'entro_puerta' ? 'local' : previous.source === 'local' ? 'otro' : previous.source}));
    };
    const setAssignee=event=>{
        markDirty();setFormData(previous=>({...previous,assignedTo:event.target.value === '__auto__' ? '' : event.target.value,autoAssign:!clientId && event.target.value === '__auto__'}));
    };
    const selectCar=event=>{
        const selected=cars.find(car=>car._id === event.target.value);
        markDirty();setFormData(previous=>({...previous,interestedVehicleId:event.target.value,autoAssign:!clientId && Boolean(event.target.value) && !previous.assignedTo ? true : previous.autoAssign,vehicleOfInterest:selected ? carLabel(selected) : event.target.value ? previous.vehicleOfInterest : ''}));
    };
    const closeWithDraft=()=>{
        if(isSubmitting || listening)return;
        if(!draftUserId || !writeClientDraft(localStorage,draftUserId,formData)){setDraftStatus('No se pudo conservar el borrador. Mantené esta ventana abierta para no perderlo.');return;}
        if((formData.dniCuit || assistantText.trim()) && !confirmDraftClose){setConfirmDraftClose(true);return;}
        onClose();
    };
    const startDictation=()=>{
        const Recognition=window.SpeechRecognition || window.webkitSpeechRecognition;
        if(!Recognition)return;
        const recognizer=new Recognition(),revision=generation.current,sessionToken=token;
        recognizer.lang='es-AR';recognizer.interimResults=false;recognizer.continuous=true;
        recognizer.onresult=event=>{
            if(!current(sessionToken,revision))return;
            let transcript='';
            for(let index=event.resultIndex;index<event.results.length;index++)if(event.results[index].isFinal)transcript+=event.results[index][0].transcript+' ';
            markDirty();setAssistantText(previous=>(previous+' '+transcript).trim().slice(0,10000));
        };
        recognizer.onend=()=>{if(current(sessionToken,revision))setListening(false);if(speech.current === recognizer)speech.current=null;};
        recognizer.onerror=event=>{if(current(sessionToken,revision)){setListening(false);setSpeechMessage(event.error === 'not-allowed' ? 'El navegador no habilitó el micrófono. Podés escribir el texto.' : 'No se pudo completar el dictado. Podés seguir escribiendo.');}};
        speech.current=recognizer;setSpeechMessage('');
        try{recognizer.start();setListening(true);}catch{setListening(false);setSpeechMessage('No se pudo iniciar el micrófono. Podés escribir el texto.');}
    };
    const applyProposals=()=>{
        markDirty();setFormData(previous=>({...previous,...proposals}));setProposals({});setAssistantText('');setSpeechMessage('Campos preparados. Revisalos antes de guardar.');
    };
    const submit=async event=>{
        event.preventDefault();
        if(saving.current || !canWrite || offline || listening)return;
        const revision=generation.current,sessionToken=token;
        if(!sessionToken || !current(sessionToken,revision))return;
        setErrors({});setSubmitError('');
        let payload;
        try{payload=buildClientFormPayload(formData,client);}
        catch(error){setErrors(error.errors || {});setSubmitError(error.message);revealVehicleField(Object.keys(error.errors || {})[0],'client-form');return;}
        saving.current=true;setIsSubmitting(true);
        try{
            const saved=await onSave(payload);
            if(!current(sessionToken,revision) || saved === false)return;
            if(!clientId)clearClientDraft(localStorage,draftUserId);
            onClose();
        }catch(error){
            if(!current(sessionToken,revision) || error.name === 'AbortError')return;
            const fieldErrors=error.errors || error.data?.errors || {};
            setErrors(fieldErrors);setSubmitError(error.message || 'No se pudo guardar el cliente. Los datos siguen en el formulario.');
            toast.error(error.message || 'No se pudo guardar el cliente.');
            const first=Object.keys(fieldErrors)[0];if(first)revealVehicleField(first,'client-form');
        }finally{if(current(sessionToken,revision)){saving.current=false;setIsSubmitting(false);}}
    };

    if(!isOpen)return null;
    const fieldProps={data:formData,onChange:change};
    const field=(name,label,props={})=><Field key={name} name={name} label={label} {...fieldProps} {...props}/>;
    const assignee=formData.autoAssign && !clientId ? '__auto__' : formData.assignedTo;
    const existingAssignee=client?.assignedTo?.name || 'Vendedor actual';
    const existingVehicle=client?.interestedVehicleId;
    const savedCarLabel=existingVehicle && typeof existingVehicle === 'object' ? carLabel(existingVehicle) : formData.vehicleOfInterest || 'Vehículo vinculado';
    const footer=<>{closeNotice}
        {confirmDraftClose && <div role="alert" className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="m-0">El DNI/CUIT y el texto del asistente sin aplicar no se conservan en el borrador. Tendrás que volver a ingresarlos.</p>
            <div className="mt-2 flex gap-2"><button type="button" onClick={()=>setConfirmDraftClose(false)} className="rounded-lg border border-crm-border px-3 py-2 text-xs">Seguir editando</button><button type="button" onClick={closeWithDraft} className="rounded-lg bg-crm-red px-3 py-2 text-xs text-white">Conservar borrador y cerrar</button></div>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-crm-fg-muted">{dirty ? 'Cambios sin guardar' : 'Sin cambios'}</span>
        <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/ayuda?tema=clientes" aria-label="Ayuda sobre clientes" className="rounded-lg p-2 text-crm-fg-muted hover:text-crm-fg"><HelpCircle size={17}/></Link>
            <button type="button" onClick={requestClose} disabled={isSubmitting || listening} className="rounded-lg border border-crm-border px-3 py-2 text-sm disabled:opacity-40">Cancelar</button>
            <button type="submit" form="client-form" disabled={isSubmitting || listening || offline || !canWrite} className="flex items-center gap-2 rounded-lg bg-crm-red px-4 py-2 text-sm font-semibold text-white hover:bg-crm-red-hover disabled:opacity-40"><Save size={16}/>{isSubmitting ? 'Guardando…' : clientId ? 'Guardar cambios' : 'Agregar'}</button>
        </div>
    </div></>;
    return <VehicleEditorDialog isOpen={isOpen} onClose={requestClose} title={clientId ? 'Editar — '+(client?.fullName || formData.fullName) : 'Agregar Cliente'} subtitle="El nombre es el único dato obligatorio. Podés completar el resto más adelante." busy={isSubmitting || listening} closeLabel="Cerrar formulario de cliente" footer={footer}>
        <form id="client-form" onSubmit={submit} className="space-y-4 p-4 sm:p-5">
            {offline && <p role="status" className="rounded-lg border border-amber-500/30 p-3 text-sm text-amber-200">Sin conexión. Podés completar los datos y enviarlos cuando vuelva internet.</p>}
            {!canWrite && <p role="status" className="text-sm text-amber-200">Tu usuario no tiene permiso para guardar clientes.</p>}
            {!clientId && <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-xs text-crm-fg-muted">
                <p className="m-0 font-medium text-crm-fg">Guardado automático en este dispositivo, todavía no enviado</p>
                <p role="status" className="mb-0 mt-1">{draftStatus}</p>
                <details className="mt-2"><summary className="cursor-pointer">Qué conserva</summary><p className="mb-0 mt-2 leading-5">Conserva nombre, teléfono, email, preferencias y notas durante 7 días, solo para esta cuenta en este navegador. No conserva DNI/CUIT, archivos, audio ni la autorización de asignación automática. Revisá el borrador antes de enviarlo.</p></details>
                <button type="button" onClick={closeWithDraft} disabled={isSubmitting || listening || !draftUserId} className="mt-3 text-xs underline underline-offset-2 disabled:opacity-40">Cerrar y continuar después</button>
            </div>}
            <VehicleFormErrors errors={Object.fromEntries(Object.entries(errors).filter(([,value])=>value))} prefix="client-form"/>
            {submitError && <p id="client-form-error" role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">{submitError}</p>}
            <fieldset disabled={isSubmitting || !canWrite} className="m-0 min-w-0 space-y-4 border-0 p-0 disabled:opacity-70">
                <details className="rounded-xl border border-purple-500/25 bg-purple-500/5" onToggle={event=>{if(!event.currentTarget.open && listening)speech.current?.stop();}}>
                    <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-purple-300">Completar con voz o texto</summary>
                    <div className="space-y-3 p-4 pt-0">
                    <label htmlFor="client-assistant-text" className="mb-1 block text-xs text-crm-fg-muted">Contá lo que sabés del cliente</label>
                    <textarea id="client-assistant-text" value={assistantText} onChange={event=>{markDirty();setAssistantText(event.target.value);}} maxLength={10000} rows={3} placeholder={'Nombre: Ana Pérez\nTeléfono: …\nBusca: SUV para uso familiar\nPróxima acción: consultar opciones'} className={CONTROL+' h-auto min-h-24'}/>
                    <div className="flex flex-wrap gap-2">
                        {speechSupported && <button type="button" onClick={()=>listening ? speech.current?.stop() : startDictation()} className="flex items-center gap-2 rounded-lg border border-purple-500/30 px-3 py-2 text-xs text-purple-200">{listening ? <Square size={14}/> : <Mic size={14}/>} {listening ? 'Detener dictado' : 'Dictar con el navegador'}</button>}
                        <button type="button" disabled={!assistantText.trim() || listening} onClick={()=>setProposals(prepareClientText(assistantText))} className="flex items-center gap-2 rounded-lg border border-purple-500/30 px-3 py-2 text-xs text-purple-200 disabled:opacity-40"><WandSparkles size={15}/>Preparar campos</button>
                    </div>
                    <details className="text-xs leading-5 text-crm-fg-muted"><summary className="cursor-pointer">Cómo prepara los campos y usa el micrófono</summary><p className="mb-0 mt-2">Preparación local: reconoce líneas con Nombre, Teléfono, Email, Busca y Próxima acción. Sin etiquetas, propone el texto como descripción. Revisá los campos antes de aplicarlos.</p><p className="mb-0 mt-2">{speechSupported ? 'Al iniciar el dictado, el navegador pedirá acceso al micrófono y puede usar su propio servicio de voz. AutoSporting no guarda el audio.' : 'El dictado no está disponible en este navegador. Podés escribir el texto.'}</p></details>
                    {speechMessage && <p role="status" className="mb-0 mt-2 text-xs text-crm-fg-muted">{speechMessage}</p>}
                    {Object.keys(proposals).length>0 && <div className="mt-3 rounded-lg border border-crm-border p-3">
                        <p className="mb-2 text-xs font-semibold">Revisá la propuesta. Al aplicar, reemplaza estos campos:</p>
                        <dl className="space-y-2 text-sm">{Object.entries(proposals).map(([key,value])=><div key={key}><dt className="text-xs text-crm-fg-muted">{proposalLabels[key]}</dt><dd className="m-0 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
                        <div className="mt-3 flex gap-2"><button type="button" onClick={applyProposals} className="rounded-lg bg-crm-red px-3 py-2 text-xs font-semibold text-white">Aplicar campos revisados</button><button type="button" onClick={()=>setProposals({})} className="rounded-lg border border-crm-border px-3 py-2 text-xs">Descartar propuesta</button></div>
                    </div>}
                    </div>
                </details>
                <div className={GRID}>
                    {field('fullName','Nombre *',{required:true,maxLength:300,autoComplete:'name'})}
                    {field('phone','Teléfono',{type:'tel',maxLength:100,autoComplete:'tel'})}
                </div>
                <div className={GRID}>{field('description','...o describí lo que busca (texto libre)',{area:true,compactArea:true,maxLength:2000})}</div>
                <div className={GRID}>
                    {field('nextAction','Próxima acción',{maxLength:500})}
                    {field('nextActionDate','Fecha del próximo paso',{type:'date'})}
                </div>
                {!clientId && <section className="space-y-3 rounded-2xl border border-indigo-500/40 bg-indigo-500/5 p-4"><h3 className="m-0 text-xs font-semibold uppercase tracking-wide text-indigo-300">¿Por qué se contacta el cliente?</h3>
                    <div className={GRID}>{[['entro_puerta','🚶 Entró por la puerta'],['lead_digital','🌐 Lead digital (WhatsApp / IG / ML / web)']].map(([value,label])=><button key={value} type="button" aria-pressed={formData.reason===value} onClick={()=>setCapture(value)} className={'min-h-12 rounded-xl border px-4 py-2 text-sm font-semibold '+(value==='entro_puerta'?'border-amber-500/60 bg-amber-500/10 !text-amber-300':'border-blue-500/60 bg-blue-500/10 !text-blue-300')}>{label}</button>)}</div>
                    <p className="m-0 text-xs leading-5 text-crm-fg-muted">Puerta y Digital tienen colas independientes. Al elegir un canal se solicita rotación para el alta; una selección manual de vendedor se conserva. Una unidad vinculada prioriza a su responsable disponible.</p>
                </section>}
                <ClientOcrControl isOpen={isOpen} recordKey={clientId || 'new'} summaryLabel="Escanear DNI (autocompletar)" compactButton disabled={isSubmitting || !canWrite || listening} onApply={patch=>{
                    if(!identity.current.isOpen || identity.current.clientId!==clientId || identity.current.token!==token || localStorage.getItem('token')!==token || saving.current)return;
                    const reviewed=Object.fromEntries(Object.entries(patch).filter(([key,value])=>['fullName','dniCuit','birthDate','gender','address'].includes(key) && typeof value==='string'));
                    markDirty();setFormData(previous=>({...previous,...reviewed}));
                }}/>
                {duplicateWarning && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{duplicateWarning}</p>}
                <div className={GRID}>
                    {field('segment','Tipo de cliente',{options:[{value:'regular',label:'Regular'},{value:'vip',label:'VIP'}]})}
                    {field('gender','Sexo (opcional)',{options:[{value:'',label:'—'},{value:'mujer',label:'Mujer'},{value:'hombre',label:'Hombre'}]})}
                    {field('dniCuit','DNI / CUIT',{maxLength:100,autoComplete:'off'})}
                    {field('email','Email',{type:'email',maxLength:320,autoComplete:'email'})}
                    {field('source','Origen',{disabled:!clientId && formData.reason==='entro_puerta',options:[{value:'local',label:'Showroom'},{value:'web',label:'Web'},{value:'whatsapp',label:'WhatsApp'},{value:'instagram',label:'Instagram'},{value:'facebook',label:'Facebook'},{value:'mercadolibre',label:'MercadoLibre'},{value:'referido',label:'Referido'},{value:'otro',label:'Otro'}]})}
                    {field('pipelineStage','Etapa comercial',{options:CLIENT_PIPELINE_STAGES.map(stage=>({value:stage.id,label:stage.label}))})}
                    <div className="min-w-0 space-y-2">
                        {canReadStock ? <><ClientStockPicker value={formData.interestedVehicleId} savedLabel={savedCarLabel} cars={cars} search={stockSearch} onSearch={setStockSearch} onSelect={selectCar} loading={stockState.loading} disabled={isSubmitting || !canWrite}/>{stockState.error && <p role="status" className="m-0 text-xs text-amber-200">{stockState.error} <button type="button" onClick={()=>setReloadStock(value=>value+1)} className="underline">Reintentar</button></p>}{stockState.total>100 && <p className="m-0 text-xs text-crm-fg-muted">Se muestran 100 de {stockState.total} unidades. Escribí para buscar en todo el catálogo.</p>}</> : <div><span className="mb-1 block text-xs text-crm-fg-muted">Vehículo de stock</span><p className="m-0 text-xs leading-5 text-crm-fg-muted">Necesitás lectura de Stock. Se conserva el vínculo actual.</p></div>}
                    </div>
                    {field('birthDate','Fecha de nacimiento',{type:'date'})}
                    {field('occupation','Ocupación',{maxLength:300})}
                </div>
                <Section title="Cómo piensa comprar">
                    <div className={GRID}>
                        {field('purchaseMethod','Forma de compra',{options:[{value:'',label:'Sin definir'},{value:'contado',label:'Contado'},{value:'financiacion',label:'Financiación'}]})}
                        {field('purchaseTiming','Cuándo piensa comprar',{options:[{value:'',label:'Sin definir'},{value:'ahora',label:'Ahora / este mes'},{value:'1_3_meses',label:'En 1 a 3 meses'},{value:'mas_adelante',label:'Más adelante'},{value:'explorando',label:'Explorando'}]})}
                        {field('availableDownPayment','Dinero disponible para entregar',{type:'number',min:0,step:'any',inputMode:'decimal'})}
                        {field('downPaymentCurrency','Moneda de la entrega',{options:['USD','ARS']})}
                        {field('tradeInIntent','¿Tiene permuta?',{options:[{value:'',label:'Sin consultar'},{value:'si',label:'Sí'},{value:'no',label:'No'}]})}
                    </div>
                </Section>
                <Section title="Qué busca">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {field('brand','Marca',{maxLength:200})}{field('model','Modelo',{maxLength:200})}{field('currency','Moneda del presupuesto',{options:['USD','ARS']})}
                        {field('yearFrom','Año desde',{type:'number',min:1000,max:9999,step:1})}{field('yearTo','Año hasta',{type:'number',min:1000,max:9999,step:1})}{field('maxBudget','Presupuesto máximo',{type:'number',min:0,step:'any',inputMode:'decimal'})}
                    </div>
                </Section>
                <div className={GRID}>{field('lastContactDate','Último contacto',{type:'date'})}{field('createdAt','Fecha de alta',{type:'date'})}</div>
                <div><label htmlFor="client-form-assignedTo" className="mb-1 block text-xs text-crm-fg-muted">Vendedor</label><select id="client-form-assignedTo" name="assignedTo" value={assignee} onChange={setAssignee} className={CONTROL}>
                    <option value="">Sin asignar</option>{!clientId && <option value="__auto__">Rotación automática por captación</option>}
                    {formData.assignedTo && !users.some(member=>member._id===formData.assignedTo) && <option value={formData.assignedTo}>{existingAssignee} · conservar</option>}
                    {users.map(member=><option key={member._id} value={member._id}>{member.name || member.email}</option>)}
                </select></div>
                {usersError && <p role="status" className="m-0 text-xs text-amber-200">No se pudo cargar el equipo. Se conserva la asignación actual; podés guardar sin cambiarla.</p>}
                {clientId && <p className="m-0 text-xs text-crm-fg-muted">Editar una ficha no activa la rotación automática.</p>}
                {field('address','Dirección',{maxLength:500})}
                {field('notes','Notas internas',{area:true,maxLength:20000})}
                <VehicleFormSection title="Adjuntos">
                    <p className="m-0 text-xs leading-5 text-crm-fg-muted">Los archivos privados se administran en Documentación de la ficha guardada. El escaneo local de arriba permite autocompletar datos; no adjunta el archivo de identidad al cliente.</p>
                </VehicleFormSection>
                <VehicleFormSection title="Relación comercial AutoSporting">
                    <div className={GRID}>
                        {field('type','Relación comercial',{options:[{value:'potencial',label:'Potencial'},{value:'comprador',label:'Comprador'},{value:'vendedor',label:'Vendedor'},{value:'ambos',label:'Comprador y vendedor'}]})}
                        {field('status','Estado de la ficha',{options:[{value:'activo',label:'Activo'},{value:'inactivo',label:'Inactivo'},{value:'bloqueado',label:'Bloqueado'}]})}
                        {field('locality','Localidad',{maxLength:200})}{field('province','Provincia',{maxLength:200})}
                        {field('vehicleOfInterest','Referencia libre del vehículo',{maxLength:500,disabled:Boolean(formData.interestedVehicleId),className:'sm:col-span-2'})}
                        {clientId && field('reason','Captación registrada',{options:[{value:'entro_puerta',label:'Puerta'},{value:'lead_digital',label:'Digital'}]})}
                    </div>
                </VehicleFormSection>
                {clientId && <VehicleFormSection title="Seguimiento AutoSporting · Pedido vinculado"><ClientMatchingRequestControl client={client} disabled={dirty || isSubmitting || offline}/></VehicleFormSection>}
            </fieldset>
        </form>
    </VehicleEditorDialog>;
}
