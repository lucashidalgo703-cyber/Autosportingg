"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '../../../context/AuthContext';
import {hasPermission,PERMISSIONS} from '../../../utils/adminPermissions';
import {clientMatchingRequestLabel} from '../../../utils/clientMatchingRequest';
const base=()=>process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// This control changes only an expressly linked Pedido. Saving the client form
// remains a separate operation, so a request failure cannot repeat client creation.
export default function ClientMatchingRequestControl({client,disabled=false,onUpdated}) {
    const {token,user}=useAuth(),clientId=client?._id;
    const [state,setState]=useState({owner:'',loading:false,busy:false,enabled:false,pedido:null,error:''});
    const [reload,setReload]=useState(0);
    const generation=useRef(0),active=useRef({token,clientId});
    const operation=useRef(null);
    active.current={token,clientId};
    const canRead=hasPermission(user,PERMISSIONS.CLIENTES_READ) && hasPermission(user,PERMISSIONS.PEDIDOS_READ);
    const canWrite=hasPermission(user,PERMISSIONS.CLIENTES_WRITE) && hasPermission(user,PERMISSIONS.PEDIDOS_WRITE);
    const owner=token+':'+clientId;
    useEffect(()=>{
        const revision=++generation.current,controller=new AbortController();
        operation.current?.abort();
        if(!clientId || !token || !canRead){setState({owner,loading:false,busy:false,enabled:false,pedido:null,error:''});return ()=>{generation.current+=1;controller.abort();};}
        setState({owner,loading:true,busy:false,enabled:false,pedido:null,error:''});
        fetch(base()+'/api/admin/clients/'+clientId+'/request',{headers:{Authorization:'Bearer '+token},signal:controller.signal,cache:'no-store'})
            .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message || 'No se pudo consultar el pedido.');return data;})
            .then(data=>{if(!controller.signal.aborted && revision === generation.current && active.current.token === token && localStorage.getItem('token') === token)setState({owner,loading:false,busy:false,enabled:Boolean(data.enabled),pedido:data.pedido || null,error:''});})
            .catch(error=>{if(error.name !== 'AbortError' && revision === generation.current && active.current.token === token)setState({owner,loading:false,busy:false,enabled:false,pedido:null,error:error.message});});
        return ()=>{generation.current+=1;controller.abort();operation.current?.abort();};
    },[clientId,token,owner,canRead,reload]);
    const visible=state.owner === owner ? state : {loading:true,busy:false,enabled:false,pedido:null,error:''};
    const update=async enabled=>{
        if(disabled || visible.loading || visible.busy || !canWrite || !canRead)return;
        const revision=generation.current,controller=new AbortController();
        operation.current?.abort();operation.current=controller;
        setState(previous=>({...previous,busy:true,error:''}));
        try {
            const response=await fetch(base()+'/api/admin/clients/'+clientId+'/request',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({enabled}),signal:controller.signal});
            const data=await response.json();
            if(!response.ok)throw new Error([data.message || 'No se pudo actualizar el pedido.',...Object.values(data.errors || {})].join(' '));
            if(controller.signal.aborted || revision !== generation.current || active.current.token !== token || localStorage.getItem('token') !== token)return;
            setState({owner,loading:false,busy:false,enabled:Boolean(data.enabled),pedido:data.pedido || null,error:''});
            try{Promise.resolve(onUpdated?.(data)).catch(()=>{});}catch{/* A refresh failure must not undo an accepted request mutation. */}
            window.dispatchEvent(new CustomEvent('client-request-updated',{detail:{clientId}}));
        }catch(error){
            if(error.name === 'AbortError' || revision !== generation.current || active.current.token !== token)return;
            // An interrupted response may have committed. Reload the authoritative
            // state instead of assuming the prior checkbox still reflects Mongo.
            setState(previous=>({...previous,busy:false,error:error.message+' Volvé a consultar el estado antes de reintentar.'}));
        }
    };
    if(!clientId)return null;
    return <div className="rounded-lg border border-crm-border bg-crm-bg p-3 text-xs">
        <label className="flex items-start gap-2.5 text-sm text-crm-fg">
            <input type="checkbox" checked={visible.enabled} onChange={event=>update(event.target.checked)} disabled={disabled || visible.loading || visible.busy || Boolean(visible.error) || !canRead || !canWrite} className="mt-0.5 h-4 w-4 shrink-0 accent-crm-red"/>
            <span>Avisarle cuando entre un {clientMatchingRequestLabel(client)}</span>
        </label>
        <p className="mb-0 mt-2 leading-5 text-crm-fg-muted">Mantiene un pedido de búsqueda activo con los datos guardados de esta ficha. No envía mensajes automáticamente. Al desactivar, cierra solo el pedido creado desde esta opción.</p>
        {disabled && <p className="mb-0 mt-2 text-crm-fg-muted">Guardá los cambios del cliente antes de modificar el pedido.</p>}
        {(!canRead || !canWrite) && <p className="mb-0 mt-2 text-crm-fg-muted">Necesitás permisos de consulta y edición de Clientes y Pedidos para gestionar este aviso.</p>}
        {(visible.loading || visible.busy) && <p role="status" className="mb-0 mt-2 text-crm-fg-muted">{visible.busy ? 'Actualizando pedido…' : 'Consultando pedido…'}</p>}
        {visible.error && <p role="alert" className="mb-0 mt-2 text-amber-200">{visible.error} <button type="button" onClick={()=>setReload(value=>value+1)} className="underline">Consultar de nuevo</button></p>}
        {!visible.loading && !visible.error && visible.pedido && <div className="mt-2 text-crm-fg-muted"><p role="status" className="m-0">Pedido {visible.enabled ? 'activo' : 'cerrado'} · {visible.pedido.status} · {visible.pedido.requestedBrand} {visible.pedido.requestedModel} {visible.pedido.yearRange}. <Link href="/admin/pedidos" className="text-crm-red underline">Ver Pedidos</Link></p>
            {visible.enabled && canWrite && <button type="button" onClick={()=>update(true)} disabled={disabled || visible.busy} className="mt-2 rounded-lg border border-crm-border px-3 py-2 text-xs disabled:opacity-40">Actualizar con la búsqueda guardada</button>}
        </div>}
    </div>;
}
