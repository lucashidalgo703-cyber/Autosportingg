"use client";

import { useEffect, useRef, useState } from 'react';

const money=(value,currency='ARS')=>value==null?'Sin calcular':currency+' '+new Intl.NumberFormat('es-AR').format(value);
const demoMessages={
    liquidity:['¿Cuánto puedo reinvertir?','Simulá una compra inmediata de ARS 30.','Corregí el importe a ARS 25.','Probá con ARS 20.','Compará las tres alternativas.'],
    trade:['Quiero analizar una permuta de ARS 120. Recibo ARS 40, una unidad valuada en ARS 60 y quedan ARS 20 por cobrar.',
        'El costo es ARS 100, los gastos son ARS 5 y corresponde todo a la agencia.']
};

function Revision({row}) {
    const {liquidity,economics,missing,settlement}=row.evaluation;
    return <li className="rounded-lg border border-crm-border p-2">
        <strong>Revisión {row.number} · {row.assumptions.kind==='purchase'?'Compra':row.assumptions.kind==='trade'?'Permuta':'Venta'}</strong>
        {row.assumptions.flows.map((flow,index)=><p key={index}>Supuesto del turno · {flow.date} · {money(flow.amount,flow.currency)}</p>)}
        {liquidity && <p>Mínimo {money(liquidity.minimum?.free,liquidity.currency)} · Faltante {money(liquidity.gap,liquidity.currency)} · Holgura {money(liquidity.buffer,liquidity.currency)} · {liquidity.minimum?.date} · Fuente {liquidity.source}</p>}
        {economics && <p>Contribución {money(economics.contribution,economics.currency)} · Valor contractual de la toma {money(economics.inventoryReceived,economics.currency)} · A cobrar {money(settlement?.creditRemaining ?? economics.credit,economics.currency)} · Efectivo contractual {money(economics.cash,economics.currency)}</p>}
        {settlement && <details><summary>Contraprestación y cobros aportados</summary>
            <p>Efectivo pactado {money(settlement.contractualCash,settlement.currency)} · Cobrado {money(settlement.collectedCash,settlement.currency)} · De la agencia {money(settlement.agencyCash,settlement.currency)} · Libre {money(settlement.freeAgencyCash,settlement.currency)}</p>
            {row.assumptions.kind==='trade' && <p>Valor de toma {money(settlement.contractualTradeValue,settlement.currency)} · Costo asignado {money(settlement.assignedInventoryCost,settlement.currency)}</p>}
            <p>Crédito pactado {money(settlement.creditPrincipal,settlement.currency)} · Saldo por cobrar {money(settlement.creditRemaining ?? settlement.creditPrincipal,settlement.currency)} · Vencimiento {settlement.creditDueDate??'Pendiente'} · {settlement.ownResult == null ? 'Resultado propio pendiente de acuerdo de reparto' : 'Resultado propio ' + money(settlement.ownResult,settlement.currency)}</p>
            <p>Importes hipotéticos aportados. No son cobros conciliados.</p>
        </details>}
        {missing.length>0 && <p>Evaluación parcial · quedan condiciones por confirmar.</p>}
    </li>;
}

export default function FinancialDirectionChat({api,token,mode,report,simulation}) {
    const [list,setList]=useState([]);
    const [chat,setChat]=useState(null);
    const [message,setMessage]=useState('');
    const [error,setError]=useState('');
    const [busy,setBusy]=useState(false);
    const lock=useRef(false);
    const pending=useRef(null);
    useEffect(()=>{
        const controller=new AbortController();
        api(token,'/chats',controller.signal).then(setList)
            .catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});
        return ()=>controller.abort();
    },[api,token]);
    const run=async task=>{
        if(lock.current)return;
        lock.current=true;
        setBusy(true);
        setError('');
        try { await task(); } catch(cause){ setError(cause.message); }
        finally { lock.current=false;setBusy(false); }
    };
    const choose=async path=>{
        const result=await api(token,path);
        setChat(result);
        setMessage('');
        pending.current=null;
    };
    const start=(demo,fromSimulation=false)=>run(async()=>{
        const {sampleId,variant,scenario}=report;
        const body=demo?{sampleId,variant:'revised',scenario:'stress',demo}:{sampleId,variant,scenario};
        if(fromSimulation) body.purchase=simulation.simulation.scheduled.filter(row=>row.id.startsWith('simulation-'))
            .map(({amount,currency,date})=>({amount,currency,date}));
        const result=await api(token,'/chats',undefined,body);
        setChat(result);
        setMessage('');
        pending.current=null;
        setList(rows=>[result,...rows]);
    });
    const send=event=>{
        event.preventDefault();
        if(!message.trim() || !chat)return;
        void run(async()=>{
            const text=message.trim();
            const prior=pending.current;
            const requestId=prior?.text===text && prior.chat===chat.id ? prior.requestId : crypto.randomUUID();
            pending.current={text,chat:chat.id,requestId};
            const result=await api(token,'/chats/'+chat.id+'/messages',undefined,{message:text,requestId});
            setChat(result);
            setMessage('');
            pending.current=null;
            setList(rows=>[result,...rows.filter(row=>row.id!==result.id)]);
        });
    };
    const suggest=chat?.demo ? demoMessages[chat.demo][chat.messages.length] : null;
    const canSend=chat && (mode==='configured'&&!chat.demo || mode==='simulated'&&chat.demo);
    return <section className="rounded-xl border border-crm-border bg-crm-surface p-4 md:p-5" aria-label="Chat de dirección">
        <h2 className="text-lg font-semibold">Chat de dirección</h2>
        <p className="text-crm-fg-muted">PILOTO — DATOS SINTÉTICOS</p>
        <p role="status">{mode==='simulated'?'Modo simulado — conexión real pendiente':mode==='pending'?'IA pendiente de conexión':'Conexión configurada · usar solo hipótesis sintéticas'}</p>
        {mode==='simulated' && <p className="text-crm-fg-muted">Las demostraciones reproducen comandos guionados por turno. La interpretación de texto libre requiere conexión.</p>}
        <div className="my-3 flex flex-wrap gap-2">
            {mode==='simulated'?<>
                <button className="rounded-lg border border-crm-border p-2" disabled={!report||busy} onClick={()=>start('liquidity')}>Demostración de reinversión</button>
                <button className="rounded-lg border border-crm-border p-2" disabled={!report||busy} onClick={()=>start('trade')}>Demostración de permuta</button>
            </>:<>
                <button className="rounded-lg border border-crm-border p-2" disabled={!report||busy||mode!=='configured'} onClick={()=>start()}>Conversar sobre este cierre</button>
                {simulation && <button className="rounded-lg border border-crm-border p-2" disabled={!report||busy||mode!=='configured'} onClick={()=>start(null,true)}>Conversar sobre esta simulación</button>}
            </>}
            <label>Historial <select aria-label="Historial de conversaciones" className="rounded-lg border border-crm-border bg-crm-bg p-2" value={chat?.id??''}
                disabled={busy} onChange={event=>{const id=event.target.value;if(id)void run(()=>choose('/chats/'+id));}}>
                <option value="">Elegí una conversación</option>
                {list.map(row=><option key={row.id} value={row.id}>{row.title} · {new Date(row.updatedAt).toLocaleString('es-AR')}</option>)}
            </select></label>
        </div>
        {chat && <>
            <p className="mb-3">Contexto fijo · {chat.context.sampleId} · {chat.context.variant} v{chat.context.closeVersion} · {chat.context.scenario} · {chat.context.cutoff.slice(0,10)}</p>
            <ol className="space-y-3" aria-label="Mensajes de la conversación">
                {chat.messages.map(turn=><li key={turn.requestId} className="rounded-lg border border-crm-border p-3">
                    <p className="font-semibold" style={{whiteSpace:'pre-wrap'}}>{turn.message}</p>
                    <p className="text-xs text-crm-fg-muted">{turn.mode==='real'?'Interpretación de OpenAI':'Turno simulado'}</p>
                    <p className="mt-1">{turn.reply.text}</p>
                    {turn.reply.evidence?.base && <p>Base · mínimo {money(turn.reply.evidence.base.minimum?.free,turn.reply.evidence.base.currency)} · piso {money(turn.reply.evidence.base.floor,turn.reply.evidence.base.currency)} · capacidad {money(turn.reply.evidence.base.capacity,turn.reply.evidence.base.currency)} · {turn.reply.evidence.base.source}</p>}
                    {turn.reply.evidence?.revision && <ul><Revision row={turn.reply.evidence.revision} /></ul>}
                    {turn.reply.evidence?.alternatives && <ul className="space-y-1">{turn.reply.evidence.alternatives.map(row=><Revision row={row} key={row.number} />)}</ul>}
                </li>)}
            </ol>
            {canSend && <form onSubmit={send} className="mt-3 grid gap-2">
                {suggest && <button type="button" className="text-left underline" disabled={busy} onClick={()=>setMessage(suggest)}>{suggest}</button>}
                <label>Mensaje<textarea aria-label="Mensaje de dirección" value={message} onChange={event=>setMessage(event.target.value)} disabled={busy}
                    maxLength={1200} className="block w-full rounded-lg border border-crm-border bg-crm-bg p-2" /></label>
                <button className="w-fit rounded-lg bg-crm-red p-2 text-white disabled:opacity-50" disabled={busy||!message.trim()}>Enviar mensaje</button>
            </form>}
        </>}
        {busy && <p role="status">Analizando el turno…</p>}
        {error && <p role="alert">{error}</p>}
    </section>;
}
