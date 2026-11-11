"use client";
import {useEffect,useRef,useState} from 'react';
import FinanceDocumentModal from '../finance/FinanceDocumentModal';
import VehicleEditorDialog from '../stock/VehicleEditorDialog';
import {expedienteDocumentValues} from '../../../utils/expedienteAdministration';

export default function ExpedienteDocumentActions({detail,request,kind,onClose}){
    const [state,setState]=useState({values:null,error:'',loading:true}),[retry,setRetry]=useState(0),generation=useRef(0);
    useEffect(()=>{
        const current=++generation.current,controller=new AbortController();setState({values:null,error:'',loading:true});
        if(!detail.capabilities?.canReadFinance){setState({values:null,error:'Necesitás permiso de lectura de Finanzas para emitir este documento de la operación.',loading:false});return()=>controller.abort();}
        request('/api/admin/finance/document-issuer',{signal:controller.signal}).then(data=>{if(current===generation.current&&!controller.signal.aborted)setState({values:expedienteDocumentValues(detail,kind,data.issuer||data),error:'',loading:false});})
            .catch(error=>{if(current===generation.current&&!controller.signal.aborted)setState({values:null,error:error.message||'No se pudo consultar la identidad de la agencia. Reintentá antes de preparar el documento.',loading:false});});
        return()=>{generation.current++;controller.abort();};
    },[detail.id,detail.capabilities?.canReadFinance,kind,request,retry]);
    if(state.values)return <FinanceDocumentModal documentKind="boleto" initialValues={state.values} onClose={onClose}/>;
    return <VehicleEditorDialog isOpen onClose={onClose} title={kind==='purchase'?'Boleto de compra':'Boleto de venta'} closeLabel="Cerrar preparación del boleto" footer={<button type="button" onClick={onClose} className="rounded-lg border border-crm-border px-3 py-2 text-sm">Cerrar</button>}><div className="space-y-3 p-5">{state.loading?<p role="status">Preparando datos de las partes…</p>:<><p role="alert" className="text-sm text-red-300">{state.error}</p>{detail.capabilities?.canReadFinance&&<button type="button" onClick={()=>setRetry(value=>value+1)} className="rounded-lg border border-crm-border px-3 py-2 text-sm">Reintentar</button>}</>}</div></VehicleEditorDialog>;
}
