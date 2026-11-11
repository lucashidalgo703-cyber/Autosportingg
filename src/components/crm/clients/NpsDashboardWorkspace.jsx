"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ClipboardCheck, MessageCircle, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { NPS_CONTEXTS, npsContextLabel } from '../../../utils/nps';
import CrmPageHeader from '../ui/CrmPageHeader';
import CrmModal from '../ui/CrmModal';
import ClientNpsPanel from './ClientNpsPanel';

const API = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const field = 'h-9 w-full min-w-0 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:outline-none focus:ring-2 focus:ring-crm-red';
const button = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-fg hover:bg-crm-surface-raised disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red';
const periods = ['Hoy', 'Esta semana', 'Este mes', 'Este año', 'Histórico'];
const emptyData = { metrics: { total: 0, averageScore: null, npsScore: null, promoters: 0, passives: 0, detractors: 0 }, recentResponses: [], actionRequired: [] };

function ChooseClient({ kind, onClose, onUpdated }) {
    const { token, user } = useAuth();
    const [search, setSearch] = useState(''), [clients, setClients] = useState([]), [selected, setSelected] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
    const canReadClients = hasPermission(user, PERMISSIONS.CLIENTES_READ);
    useEffect(() => {
        if (!canReadClients) return;
        const controller = new AbortController(); setLoading(true); setError('');
        const timer = setTimeout(() => {
            const query = new URLSearchParams({ attention: 'todos', limit: '20', search });
            fetch(`${API()}/api/admin/clients?${query}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'No se pudieron consultar clientes.'); return data; }).then(data => { if (!controller.signal.aborted) setClients(data.clients || []); }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        }, 250);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [search, token, canReadClients]);
    return <CrmModal isOpen onClose={onClose} title={kind === 'manual' ? 'Registrar una respuesta NPS' : kind === 'link' ? 'Preparar enlace NPS' : 'Enviar encuesta por WhatsApp'} maxWidth="max-w-2xl"><div className="space-y-4 p-4">
        {!canReadClients ? <p role="alert" className="text-sm text-crm-fg-muted">Necesitás permiso de consulta de Clientes para seleccionar una ficha.</p> : <>
            <label className="block text-xs text-crm-fg-muted">Buscar cliente<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre, teléfono o documento…" className={`${field} mt-1`} /></label>
            {error && <p role="alert" className="text-xs text-crm-red">{error}</p>}
            <label className="block text-xs text-crm-fg-muted">Cliente<select value={selected?._id || ''} onChange={event => setSelected(clients.find(client => client._id === event.target.value) || null)} className={`${field} mt-1`}><option value="">{loading ? 'Buscando clientes…' : 'Elegí una ficha'}</option>{selected && !clients.some(client => client._id === selected._id) && <option value={selected._id}>{selected.fullName}</option>}{clients.map(client => <option key={client._id} value={client._id}>{client.fullName}</option>)}</select></label>
            <p className="text-[11px] text-crm-fg-muted">Se muestran hasta 20 coincidencias. Ajustá la búsqueda para encontrar otra ficha.</p>
            {selected && <ClientNpsPanel key={selected._id} clientId={selected._id} client={selected} initialAction={kind} onUpdated={onUpdated} />}
        </>}
    </div></CrmModal>;
}

export default function NpsDashboardWorkspace() {
    const { token, user } = useAuth();
    const canRead = hasPermission(user, PERMISSIONS.NPS_READ), canWrite = hasPermission(user, PERMISSIONS.NPS_WRITE), canSend = canWrite && hasPermission(user, PERMISSIONS.WHATSAPP_WRITE);
    const [filters, setFilters] = useState({ period: 'Este mes', sellerId: '', context: '' }), [ready, setReady] = useState(false);
    const [data, setData] = useState(emptyData), [loaded, setLoaded] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState('');
    const [sellers, setSellers] = useState([]), [chooser, setChooser] = useState(null), [followUp, setFollowUp] = useState(null), [followUpForm, setFollowUpForm] = useState({ status: 'resolved', notes: '', responsible: '' }), [saving, setSaving] = useState(false), [saveError, setSaveError] = useState('');
    const session = useRef(token); session.current = token;
    const loadingRequest = useRef(null), mutationRequest = useRef(null);
    useEffect(() => {
        const read = () => {
            const query = new URLSearchParams(window.location.search);
            setFilters({ period: periods.includes(query.get('period')) ? query.get('period') : 'Este mes', sellerId: /^[a-f\d]{24}$/i.test(query.get('sellerId') || '') ? query.get('sellerId') : '', context: NPS_CONTEXTS.some(item => item.value === query.get('context')) ? query.get('context') : '' }); setReady(true);
        };
        read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read);
    }, []);
    const load = useCallback(async () => {
        if (!ready || !canRead || !token) return;
        loadingRequest.current?.abort(); const controller = new AbortController(); loadingRequest.current = controller; setLoading(true); setLoaded(false); setError('');
        try {
            const response = await fetch(`${API()}/api/admin/nps/dashboard?${new URLSearchParams(filters)}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            const result = await response.json(); if (!response.ok) throw new Error(result.message || 'No se pudo cargar NPS.');
            if (!controller.signal.aborted && session.current === token) { setData(result); setLoaded(true); }
        } catch (failure) { if (!controller.signal.aborted && session.current === token) setError(failure.message); }
        finally { if (!controller.signal.aborted && session.current === token) setLoading(false); }
    }, [ready, canRead, token, filters]);
    useEffect(() => { load(); return () => loadingRequest.current?.abort(); }, [load]);
    useEffect(() => {
        if (!ready) return;
        const query = new URLSearchParams(); if (filters.period !== 'Este mes') query.set('period', filters.period); if (filters.sellerId) query.set('sellerId', filters.sellerId); if (filters.context) query.set('context', filters.context);
        window.history.replaceState(window.history.state, '', `/admin/nps${query.size ? `?${query}` : ''}`);
    }, [ready, filters]);
    useEffect(() => {
        if (!canRead || !token) return;
        const controller = new AbortController();
        fetch(`${API()}/api/admin/nps/config`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' }).then(async response => response.ok ? response.json() : {}).then(result => { if (!controller.signal.aborted) setSellers(result.sellers || []); }).catch(() => {});
        return () => { controller.abort(); mutationRequest.current?.abort(); };
    }, [canRead, token]);
    const saveFollowUp = async event => {
        event.preventDefault(); if (!canWrite || saving) return;
        const controller = new AbortController(); mutationRequest.current = controller; setSaving(true); setSaveError('');
        try {
            const response = await fetch(`${API()}/api/admin/nps/follow-up/${followUp._id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(followUpForm), signal: controller.signal });
            const result = await response.json(); if (!response.ok) throw new Error(result.message || 'No se pudo guardar el seguimiento.');
            if (!controller.signal.aborted && session.current === token) { setFollowUp(null); toast.success('Seguimiento actualizado'); await load(); }
        } catch (failure) { if (!controller.signal.aborted && session.current === token) setSaveError(failure.message); }
        finally { if (!controller.signal.aborted && session.current === token) setSaving(false); }
    };
    if (!canRead) return <p role="alert" className="p-6 text-sm text-crm-fg-muted">Necesitás permiso de consulta de NPS.</p>;
    const metrics = data.metrics || emptyData.metrics;
    return <div className="mx-auto w-full max-w-7xl min-w-0 space-y-4 p-4 pb-20 md:p-6">
        <CrmPageHeader compact title="NPS — Satisfacción de clientes" subtitle="Respuestas, contextos y seguimiento por vendedor" actions={canWrite && <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setChooser('manual')}><ClipboardCheck size={13} />Cargar manual</button>{canSend && <button type="button" className={`${button} !border-crm-red !bg-crm-red !text-white`} onClick={() => setChooser('send')}><MessageCircle size={13} />Enviar por WhatsApp</button>}<button type="button" className={button} onClick={() => setChooser('link')}><LinkIcon size={13} />Preparar enlace</button></div>} />
        <nav aria-label="Período de NPS" className="flex flex-wrap gap-2">{periods.map(period => <button key={period} type="button" aria-pressed={filters.period === period} onClick={() => setFilters(previous => ({ ...previous, period }))} className={`${button} rounded-full ${filters.period === period ? '!border-crm-red/40 !bg-crm-red/10 !text-crm-red' : ''}`}>{period}</button>)}</nav>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"><label className="text-xs text-crm-fg-muted">Vendedor<select value={filters.sellerId} onChange={event => setFilters(previous => ({ ...previous, sellerId: event.target.value }))} className={`${field} mt-1`}><option value="">Todos los vendedores</option>{sellers.map(seller => <option key={seller._id} value={seller._id}>{seller.name}</option>)}</select></label><label className="text-xs text-crm-fg-muted">Contexto<select value={filters.context} onChange={event => setFilters(previous => ({ ...previous, context: event.target.value }))} className={`${field} mt-1`}><option value="">Todos los contextos</option>{NPS_CONTEXTS.map(context => <option key={context.value} value={context.value}>{context.label}</option>)}</select></label><button type="button" className={`${button} self-end`} disabled={loading} onClick={load}><RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Actualizar</button></div>
        {error && <p role="alert" className="rounded-xl border border-crm-red/30 bg-crm-red/5 p-4 text-sm text-crm-red">{error}<button type="button" onClick={load} className="ml-2 underline">Reintentar</button></p>}
        {loading && !loaded ? <p role="status" className="py-12 text-center text-sm text-crm-fg-muted">Cargando respuestas NPS…</p> : error && !loaded ? null : <>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Promedio /10', metrics.averageScore == null ? '—' : Number(metrics.averageScore).toFixed(1)], ['NPS', metrics.npsScore ?? '—'], ['Promotores · 9–10', metrics.promoters], ['Pasivos · 7–8', metrics.passives], ['Detractores · 0–6', metrics.detractors]].map(([label, value]) => <div key={label} className="rounded-xl border border-crm-border bg-crm-surface p-4"><dt className="text-[11px] text-crm-fg-muted">{label}</dt><dd className="m-0 mt-2 text-2xl font-semibold text-crm-fg">{value ?? 0}</dd></div>)}</dl>
            <p className="text-xs text-crm-fg-muted">{metrics.total} respuestas en el período y filtros elegidos. NPS = porcentaje de promotores menos porcentaje de detractores.</p>
            <section className="rounded-xl border border-crm-border bg-crm-surface p-4"><h2 className="m-0 text-sm font-semibold text-crm-fg">Detractores con seguimiento pendiente · {data.actionRequiredTotal ?? data.actionRequired.length}</h2>{!data.actionRequired.length ? <p className="text-xs text-crm-fg-muted">No hay detractores pendientes para estos filtros.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{data.actionRequired.map(response => <article key={response._id} className="rounded-lg border border-amber-500/30 p-3 text-xs"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-crm-fg">{response.survey?.client?.fullName || 'Cliente no disponible'} · {response.score}/10</strong>{canWrite && <button type="button" className={button} onClick={() => { setSaveError(''); setFollowUp(response); setFollowUpForm({ status: 'resolved', notes: response.followUpNotes || '', responsible: response.responsible || '' }); }}>Registrar seguimiento</button>}</div><p className="mb-0 mt-1 text-crm-fg-muted">{npsContextLabel(response.survey?.context)} · {response.survey?.seller?.name || 'Sin vendedor disponible'}</p>{response.comment && <p className="mb-0 mt-2 whitespace-pre-wrap break-words text-crm-fg-muted">{response.comment}</p>}</article>)}</div>}{data.actionRequiredTotal > 100 && <p className="text-xs text-crm-fg-muted">Se muestran los primeros 100 pendientes. Filtrá por vendedor o contexto.</p>}</section>
            <section className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface"><h2 className="m-0 p-4 text-sm font-semibold text-crm-fg">Respuestas recientes · últimas 20 del período</h2>{!data.recentResponses.length ? <p className="px-4 pb-4 text-xs text-crm-fg-muted">No hay respuestas para estos filtros.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-xs"><thead className="border-y border-crm-border bg-crm-bg/40 text-crm-fg-muted"><tr>{['Cliente', 'Puntaje', 'Contexto / vendedor', 'Comentario', 'Fecha de respuesta'].map(label => <th key={label} className="px-4 py-2 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-crm-border">{data.recentResponses.map(response => <tr key={response._id}><td className="px-4 py-3">{response.survey?.client?._id && hasPermission(user, PERMISSIONS.CLIENTES_READ) ? <Link href={`/admin/clientes/${response.survey.client._id}`} className="text-crm-fg no-underline hover:text-crm-red">{response.survey.client.fullName || 'Cliente'}</Link> : response.survey?.client?.fullName || 'Cliente no disponible'}</td><td className="px-4 py-3 font-semibold">{response.score}/10</td><td className="px-4 py-3 text-crm-fg-muted">{npsContextLabel(response.survey?.context)}<span className="mt-1 block">{response.survey?.seller?.name || 'Sin vendedor disponible'}</span></td><td className="max-w-80 whitespace-pre-wrap break-words px-4 py-3 text-crm-fg-muted">{response.comment || '—'}</td><td className="px-4 py-3 text-crm-fg-muted">{new Date(response.createdAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td></tr>)}</tbody></table></div>}</section>
        </>}
        {chooser && <ChooseClient kind={chooser} onClose={() => setChooser(null)} onUpdated={() => { setChooser(null); load(); }} />}
        <CrmModal isOpen={Boolean(followUp)} onClose={() => { if (!saving) setFollowUp(null); }} title="Seguimiento NPS" maxWidth="max-w-lg"><form onSubmit={saveFollowUp} className="space-y-3 p-4">{saveError && <p role="alert" className="text-xs text-crm-red">{saveError}</p>}<label className="block text-xs text-crm-fg-muted">Estado<select value={followUpForm.status} onChange={event => setFollowUpForm(previous => ({ ...previous, status: event.target.value }))} className={`${field} mt-1`}><option value="pending">Pendiente</option><option value="in_progress">En seguimiento</option><option value="resolved">Resuelto</option></select></label><label className="block text-xs text-crm-fg-muted">Responsable<select required value={followUpForm.responsible} onChange={event => setFollowUpForm(previous => ({ ...previous, responsible: event.target.value }))} className={`${field} mt-1`}><option value="">Elegí un responsable</option>{sellers.map(seller => <option key={seller._id} value={seller._id}>{seller.name}</option>)}</select></label><label className="block text-xs text-crm-fg-muted">Gestión o resolución<textarea required maxLength={5000} value={followUpForm.notes} onChange={event => setFollowUpForm(previous => ({ ...previous, notes: event.target.value }))} className={`${field} mt-1 !h-24 py-2`} /></label><div className="flex justify-end gap-2 border-t border-crm-border pt-3"><button type="button" className={button} disabled={saving} onClick={() => setFollowUp(null)}>Cancelar</button><button type="submit" className={`${button} !bg-crm-red !text-white`} disabled={saving}>{saving ? 'Guardando…' : 'Guardar seguimiento'}</button></div></form></CrmModal>
    </div>;
}
