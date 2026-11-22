'use client';

import {useEffect, useState} from 'react';

const format = new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});
const money = (value,currency) => value==null || !currency ? 'Pendiente' : `${currency} ${format.format(value)}`;

export default function CrmQuoteProposal({api,token}) {
    const [quotes,setQuotes] = useState([]);
    const [id,setId] = useState('');
    const [proposal,setProposal] = useState(null);
    const [deposit,setDeposit] = useState('');
    const [loading,setLoading] = useState(true);
    const [error,setError] = useState('');

    useEffect(()=>{
        const controller=new AbortController();
        api(token,'/proposals/quotes',controller.signal).then(({quotes:rows})=>setQuotes(rows))
            .catch(cause=>{if (!controller.signal.aborted) setError(cause.message);})
            .finally(()=>{if (!controller.signal.aborted) setLoading(false);});
        return ()=>controller.abort();
    },[api,token]);

    useEffect(()=>{
        if (!id) return;
        const controller=new AbortController();
        api(token,`/proposals/quotes/${encodeURIComponent(id)}`,controller.signal).then(setProposal)
            .catch(cause=>{if (!controller.signal.aborted) setError(cause.message);})
            .finally(()=>{if (!controller.signal.aborted) setLoading(false);});
        return ()=>controller.abort();
    },[api,token,id]);

    const proposedCash = deposit==='' ? null : Number(deposit);
    const validDeposit = proposal?.remaining!=null && proposedCash!=null && Number.isFinite(proposedCash) &&
        proposedCash>=0 && proposedCash<=proposal.remaining;
    return <section className="rounded-xl border border-crm-border bg-crm-surface p-4 md:p-5" aria-labelledby="crm-proposal-title">
        <h2 id="crm-proposal-title" className="text-lg font-semibold">Propuesta desde una cotización</h2>
        <p className="mt-1 text-crm-fg-muted">Elegí una cotización guardada para revisar el importe y simular una entrega. La propuesta se calcula en el CRM y no modifica la cotización.</p>
        <label className="mt-3 grid max-w-lg gap-1">Cotización del CRM
            <select className="min-h-10 rounded-lg border border-crm-border bg-crm-bg px-3" value={id} onChange={event=>{
                const selected=event.target.value;
                setId(selected);setProposal(null);setDeposit('');setError('');setLoading(Boolean(selected));
            }}>
                <option value="">Elegí una cotización reciente</option>
                {quotes.map(row=><option key={row.id} value={row.id}>#{row.quoteNumber} · {money(row.price,row.currency)} · {row.status}</option>)}
            </select>
        </label>
        {loading && <p className="mt-2" role="status">Consultando el CRM…</p>}
        {!loading && !error && !quotes.length && <p className="mt-2">No hay cotizaciones guardadas disponibles.</p>}
        {error && <p className="mt-2 text-red-500" role="alert">{error}</p>}
        {proposal && <div className="mt-4 border-t border-crm-border pt-3" aria-live="polite">
            <dl className="grid gap-3 sm:grid-cols-3">
                <div><dt>Precio cotizado</dt><dd className="font-semibold">{money(proposal.price,proposal.currency)}</dd></div>
                <div><dt>Valor de toma registrado</dt><dd className="font-semibold">{money(proposal.tradeValue,proposal.tradeCurrency)}</dd></div>
                <div><dt>Importe restante de la propuesta</dt><dd className="font-semibold">{money(proposal.remaining,proposal.currency)}</dd></div>
                <div><dt>Costo registrado de stock propio</dt><dd className="font-semibold">{money(proposal.recordedOwnCost,proposal.currency)}</dd></div>
                <div><dt>Margen bruto antes de gastos</dt><dd className="font-semibold">{money(proposal.marginBeforeExpenses,proposal.currency)}</dd></div>
            </dl>
            {proposal.remaining==null && <p className="mt-2 text-crm-fg-muted">Confirmá el precio y el valor de toma en una misma moneda para calcular el importe restante.</p>}
            {proposal.remaining!=null && <label className="mt-4 grid max-w-xs gap-1">Entrega en efectivo propuesta ({proposal.currency})
                <input className="min-h-10 rounded-lg border border-crm-border bg-crm-bg px-3" type="number" min="0" max={proposal.remaining} step="0.01" value={deposit} onChange={event=>setDeposit(event.target.value)} />
            </label>}
            {validDeposit && <p className="mt-2">Importe a financiar o cobrar luego: <strong>{money(Math.round((proposal.remaining-proposedCash)*100)/100,proposal.currency)}</strong>.</p>}
            {deposit!=='' && !validDeposit && <p className="mt-2 text-red-500">La entrega debe quedar entre cero y el importe restante.</p>}
            <p className="mt-3 text-crm-fg-muted">Completá las fechas de pago, los gastos y el reparto antes de evaluar caja o resultado propio.</p>
        </div>}
    </section>;
}
