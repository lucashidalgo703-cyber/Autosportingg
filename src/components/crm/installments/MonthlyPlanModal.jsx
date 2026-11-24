'use client';

import { useEffect, useState } from 'react';

const inputStyle = 'w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white';
const makePlanId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, '0')).join('');
const clientLabel = client => client.fullName || [client.firstName, client.lastName].filter(Boolean).join(' ');

export default function MonthlyPlanModal({ onClose, onSave }) {
    const [query, setQuery] = useState('');
    const [client, setClient] = useState(null);
    const [clients, setClients] = useState([]);
    const [searchState, setSearchState] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [planId, setPlanId] = useState('');
    const [draft, setDraft] = useState({ installmentsCount: '1', amount: '', currency: 'ARS', firstDueDate: '' });

    useEffect(() => {
        if (query.trim().length < 2 || client) return;
        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const params = new URLSearchParams({ search: escaped, limit: '10' });
                const res = await fetch('/api/admin/clients?' + params, {
                    headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
                    signal: controller.signal
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                const list = Array.isArray(data) ? data : data.clients;
                setClients(list ?? []);
                setSearchState(list?.length ? '' : 'No se encontraron clientes.');
            } catch (failure) {
                if (failure.name !== 'AbortError') setSearchState('No se pudo buscar clientes.');
            }
        }, 250);
        return () => { clearTimeout(timeout); controller.abort(); };
    }, [query, client]);

    const change = event => {
        const { name, value } = event.target;
        setPlanId('');
        setDraft(previous => ({ ...previous, [name]: value }));
    };

    async function save(event) {
        event.preventDefault();
        if (!client || submitting) return;
        const id = planId || makePlanId();
        setPlanId(id);
        setSubmitting(true);
        setError('');
        try {
            await onSave({ ...draft, clientId: client._id, planId: id });
        } catch (failure) {
            setError(failure.message || 'No se pudo generar el plan.');
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4">
            <form role="dialog" aria-modal="true" aria-labelledby="monthly-plan-title" onSubmit={save}
                className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-white shadow-xl">
                <h2 id="monthly-plan-title" className="text-lg font-bold">Generar cuotas mensuales</h2>
                <fieldset disabled={submitting} className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm">Cliente
                            <input className={inputStyle} value={client ? clientLabel(client) : query} placeholder="Buscá por nombre"
                                onChange={event => {
                                    setQuery(event.target.value);
                                    setClient(null);
                                    setPlanId('');
                                    setClients([]);
                                    setSearchState(event.target.value.trim().length >= 2 ? 'Buscando…' : '');
                                }} />
                        </label>
                        {!client && searchState && <p role="status" className="text-sm text-neutral-400">{searchState}</p>}
                        {!client && clients.length > 0 && <ul className="max-h-36 overflow-auto rounded-lg border border-neutral-700">
                            {clients.map(result => <li key={result._id}><button type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-800"
                                onClick={() => { setClient(result); setClients([]); setPlanId(''); }}>
                                {clientLabel(result)}{result.dni ? ' · DNI ' + result.dni : ''}
                            </button></li>)}
                        </ul>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm">Cantidad de cuotas
                            <input className={inputStyle} name="installmentsCount" type="number" min="1" max="120" required value={draft.installmentsCount} onChange={change} />
                        </label>
                        <label className="text-sm">Monto por cuota
                            <input className={inputStyle} name="amount" type="number" min="0.01" step="0.01" required value={draft.amount} onChange={change} />
                        </label>
                        <label className="text-sm">Moneda
                            <select className={inputStyle} name="currency" value={draft.currency} onChange={change}><option>ARS</option><option>USD</option></select>
                        </label>
                        <label className="text-sm">Primer vencimiento
                            <input className={inputStyle} name="firstDueDate" type="date" required value={draft.firstDueDate} onChange={change} />
                        </label>
                    </div>
                </fieldset>
                {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={submitting} className="rounded-lg px-3 py-2 text-sm">Cancelar</button>
                    <button type="submit" disabled={!client || submitting} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold disabled:opacity-50">
                        {submitting ? 'Generando…' : 'Generar cuotas'}
                    </button>
                </div>
            </form>
        </div>
    );
}
