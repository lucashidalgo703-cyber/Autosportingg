"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Check, Copy, ExternalLink, Mail, MessageCircle, Pencil, Phone, RefreshCw, Search, ChevronDown, Car, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { CLIENT_PIPELINE_STAGES, clientCalendarKey, clientTodayKey, getClientPipelineStage, effectiveClientContacted } from '../../../utils/clientCommercial';
import { vehicleDraftIdentity } from '../../../utils/vehicleFormDraft';
import { normalizePhoneToWhatsApp } from '../../../utils/phoneNormalizer';
import { formatSaleDate } from '../../../utils/saleCalendarDate';
import CrmModal from '../ui/CrmModal';
import ClientFormModal from './ClientFormModal';
import MessageTemplatePicker from '../templates/MessageTemplatePicker';
import ClientMatchingRequestControl from './ClientMatchingRequestControl';
import ClientNpsPanel from './ClientNpsPanel';
import ClientDocumentsPanel from './ClientDocumentsPanel';

const BASE = () => process.env.NODE_ENV === 'production' ? '' : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BOX = 'rounded-xl border border-crm-border bg-crm-surface p-4';
const FIELD = 'w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red';
const BUTTON = 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-medium text-crm-fg transition hover:bg-crm-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red disabled:opacity-50';
const PRIMARY = `${BUTTON} !border-crm-red !bg-crm-red !text-white hover:!bg-crm-red-hover`;
const sourceLabels = { web: 'Web', whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', referido: 'Referido', local: 'Local', mercadolibre: 'Mercado Libre', otro: 'Otro' };
const interactionTypes = [['llamada', 'Llamada'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['visita', 'Visita'], ['cita_agendada', 'Cita agendada'], ['cotizacion_enviada', 'Cotización enviada'], ['nota', 'Nota interna'], ['otro', 'Otro']];
const presets = {
    no_response: { label: 'No respondió', note: 'No respondió al intento de contacto.', nextAction: 'Volver a contactar', outboundNoReply: true },
    quote: { label: 'Pidió cotización', note: 'Pidió una cotización.', nextAction: 'Preparar y enviar cotización', outboundNoReply: false },
    visit: { label: 'Quiere venir', note: 'Quiere venir a ver el vehículo.', nextAction: 'Coordinar día y horario de visita', outboundNoReply: false }
};
const idOf = value => typeof value === 'object' ? value?._id : value;
const calendar = value => { const key = clientCalendarKey(value); return key ? key.split('-').reverse().join('/') : 'Sin fecha'; };
const stamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha';
const amount = (value, currency) => value === null || value === undefined || value === '' ? 'Sin presupuesto informado' : `${currency || ''} ${Number(value).toLocaleString('es-AR')}`;
const nextDay = () => new Date(Date.parse(`${clientTodayKey()}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

function Empty({ children }) { return <p className="m-0 rounded-lg border border-dashed border-crm-border p-4 text-sm text-crm-fg-muted">{children}</p>; }
function Data({ label, children }) { return <div className="min-w-0"><dt className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-crm-fg-muted">{label}</dt><dd className="m-0 break-words text-sm text-crm-fg">{children || 'Sin informar'}</dd></div>; }

function ClientActionForm({ kind, preset, client, request, onSaved, onClose }) {
    const { token } = useAuth();
    const identity = vehicleDraftIdentity(token);
    const draftKey = identity ? `autosporting_client_action_v1_${encodeURIComponent(identity)}_${client._id}_${kind}` : null;
    const session = useRef(token); session.current = token;
    const [form, setForm] = useState(() => ({ type: 'llamada', note: '', outboundNoReply: false, nextAction: client.nextAction || '', nextActionDate: clientCalendarKey(client.nextActionDate) }));
    const [draftMessage, setDraftMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (draftKey) {
            try {
                const draft = JSON.parse(localStorage.getItem(draftKey));
                if (draft && Date.now() - draft.at >= 0 && Date.now() - draft.at < 7 * 86400000 && draft.values && typeof draft.values === 'object') {
                    const values = draft.values;
                    setForm(current => ({ ...current, type: interactionTypes.some(([id]) => id === values.type) ? values.type : current.type, note: typeof values.note === 'string' ? values.note.slice(0, 5000) : '', outboundNoReply: values.outboundNoReply === true, nextAction: typeof values.nextAction === 'string' ? values.nextAction.slice(0, 500) : '', nextActionDate: clientCalendarKey(values.nextActionDate) }));
                    setDraftMessage('Recuperamos tu borrador local. Se conserva durante 7 días.');
                } else if (draft) localStorage.removeItem(draftKey);
            } catch { /* An unavailable storage does not block the form. */ }
        }
        if (preset && presets[preset]) setForm(current => ({ ...current, ...presets[preset] }));
    }, [draftKey, preset]);
    const change = patch => {
        const next = { ...form, ...patch };
        setForm(next);
        if (draftKey) try { localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), values: next })); setDraftMessage('Borrador guardado en este dispositivo durante 7 días.'); } catch { setDraftMessage('El navegador no pudo guardar el borrador local.'); }
    };
    const submit = async event => {
        event.preventDefault(); if (busyRef.current) return;
        if (kind === 'interaction' && !form.note.trim()) { setError('Describí el resultado de la gestión.'); return; }
        if (kind === 'schedule' && (!form.nextAction.trim() || !clientCalendarKey(form.nextActionDate))) { setError('Completá una próxima acción y una fecha válida.'); return; }
        if (form.nextActionDate && !clientCalendarKey(form.nextActionDate)) { setError('Revisá la próxima fecha.'); return; }
        const captured = token; busyRef.current = true; setBusy(true); setError('');
        try {
            const body = { nextAction: form.nextAction.trim(), nextActionDate: form.nextActionDate || null };
            if (kind === 'interaction') body.newInteraction = { type: form.type, note: form.note.trim(), outboundNoReply: form.outboundNoReply };
            const result = await request(`/api/admin/clients/${client._id}`, { method: 'PATCH', body: JSON.stringify(body) });
            if (session.current !== captured) return;
            if (draftKey) try { localStorage.removeItem(draftKey); } catch { /* Storage is optional. */ }
            onSaved(result); onClose();
        } catch (failure) { if (session.current === captured && failure.name !== 'AbortError') setError(failure.message); }
        finally { if (session.current === captured) { busyRef.current = false; setBusy(false); } }
    };
    return <CrmModal isOpen fullScreenOnMobile onClose={() => !busy && onClose()} title={kind === 'schedule' ? 'Agendar seguimiento' : 'Registrar gestión'} maxWidth="max-w-xl" footer={<div className="flex justify-end gap-2"><button type="button" className={BUTTON} onClick={onClose} disabled={busy}>Cancelar</button><button type="submit" form="client-action-form" className={PRIMARY} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button></div>}>
        <form id="client-action-form" onSubmit={submit} className="space-y-4 p-5">
            <p className="m-0 text-xs text-crm-fg-muted">{kind === 'schedule' ? 'Agendar no marca al cliente como contactado.' : 'Registrá lo ocurrido y definí el próximo paso.'}</p>
            {draftMessage && <p role="status" className="m-0 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-crm-fg-muted">{draftMessage}</p>}
            {error && <p role="alert" className="m-0 rounded-lg bg-crm-red/10 p-3 text-sm text-crm-red">{error}</p>}
            {kind === 'interaction' && <><div className="flex flex-wrap gap-2">{Object.entries(presets).map(([key, value]) => <button type="button" key={key} className={BUTTON} onClick={() => change(value)} disabled={busy}>{value.label}</button>)}</div><label className="block text-xs text-crm-fg-muted">Tipo<select value={form.type} onChange={event => change({ type: event.target.value })} className={`${FIELD} mt-1`} disabled={busy}>{interactionTypes.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></>}
            <label className="block text-xs text-crm-fg-muted">Próxima fecha{kind === 'schedule' ? ' *' : ''}<input type="date" value={form.nextActionDate} onChange={event => change({ nextActionDate: event.target.value })} className={`${FIELD} mt-1`} required={kind === 'schedule'} disabled={busy} /></label>
            <div className="flex flex-wrap gap-2"><button type="button" className={BUTTON} onClick={() => change({ nextActionDate: clientTodayKey() })} disabled={busy}>Hoy</button><button type="button" className={BUTTON} onClick={() => change({ nextActionDate: nextDay() })} disabled={busy}>Mañana</button>{kind === 'interaction' && <button type="button" className={BUTTON} onClick={() => change({ nextActionDate: '' })} disabled={busy}>Sin seguimiento</button>}</div>
            {kind === 'interaction' && <label className="block text-xs text-crm-fg-muted">Resultado *<textarea value={form.note} onChange={event => change({ note: event.target.value })} rows={4} maxLength={5000} required className={`${FIELD} mt-1 resize-y`} disabled={busy} /></label>}
            <label className="block text-xs text-crm-fg-muted">Próxima acción{kind === 'schedule' ? ' *' : ''}<input value={form.nextAction} onChange={event => change({ nextAction: event.target.value })} maxLength={500} required={kind === 'schedule'} className={`${FIELD} mt-1`} placeholder="Qué hay que hacer después" disabled={busy} /></label>
            {kind === 'interaction' && <label className="flex items-start gap-2 text-xs leading-5 text-crm-fg-muted"><input type="checkbox" checked={form.outboundNoReply} onChange={event => change({ outboundNoReply: event.target.checked })} disabled={busy} className="mt-1 accent-[var(--crm-red)]" /><span>Lo mandamos nosotros y el cliente todavía no contestó. No cuenta como respuesta del cliente.</span></label>}
        </form>
    </CrmModal>;
}

export function ClientWorkspaceBody({ clientId, onUpdated, onEdit, onOpenFull, onClientLoaded, onRemoved, compact = false }) {
    const { token, user } = useAuth();
    const active = useRef({ token, clientId, mounted: true }); active.current = { token, clientId, mounted: true };
    useEffect(() => { active.current.mounted = true; return () => { active.current.mounted = false; }; }, []);
    const [state, setState] = useState({ token: null, clientId: null, client: null, error: '', loading: true });
    const [tab, setTab] = useState('resumen');
    const [refresh, setRefresh] = useState(0);
    const [actionForm, setActionForm] = useState(null);
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const busyRef = useRef(false);
    const [actionError, setActionError] = useState('');
    const [copied, setCopied] = useState(false);
    const [historySearch, setHistorySearch] = useState('');
    const [historyType, setHistoryType] = useState('todos');
    const [historyMode, setHistoryMode] = useState('timeline');
    const [vehicleTab, setVehicleTab] = useState('comprados');
    const [deletionOpen, setDeletionOpen] = useState(false);
    const [related, setRelated] = useState({ token: null, clientId: null, logs: null, leads: null, vehicles: null, sales: null, quotes: null, pedidos: null, errors: {}, loading: true });
    const canWrite = hasPermission(user, PERMISSIONS.CLIENTES_WRITE);
    const canLogs = hasPermission(user, PERMISSIONS.COMMUNICATIONLOGS_READ);
    const canSales = hasPermission(user, PERMISSIONS.VENTAS_READ);
    const canQuotes = hasPermission(user, PERMISSIONS.COTIZACIONES_READ);
    const canRequests = hasPermission(user, PERMISSIONS.PEDIDOS_READ);
    const canLeads = hasPermission(user, PERMISSIONS.LEADS_READ);
    const canStock = hasPermission(user, PERMISSIONS.STOCK_READ);
    const request = useCallback(async (path, options = {}) => {
        if (!token) throw new Error('Tu sesión ya no está disponible.');
        const { nextRoute, ...fetchOptions } = options;
        const response = await fetch(`${nextRoute ? '' : BASE()}${path}`, { ...fetchOptions, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
        const data = await response.json().catch(() => ({}));
        if (!active.current.mounted || active.current.token !== token || active.current.clientId !== clientId || localStorage.getItem('token') !== token) throw new DOMException('La ficha o la sesión cambió.', 'AbortError');
        if (!response.ok) throw new Error(data.message || data.error || 'No se pudo completar la operación del cliente.');
        return data;
    }, [token, clientId]);
    useEffect(() => {
        if (!clientId || !token) return;
        const controller = new AbortController();
        setState(current => ({ ...(current.token === token && current.clientId === clientId ? current : { client: null }), token, clientId, error: '', loading: true }));
        request(`/api/admin/clients/${clientId}`, { signal: controller.signal }).then(client => { setState({ token, clientId, client, error: '', loading: false }); onClientLoaded?.(client); }).catch(error => { if (error.name !== 'AbortError') setState(current => ({ ...current, error: error.message, loading: false })); });
        return () => controller.abort();
    }, [clientId, token, request, refresh, onClientLoaded]);
    useEffect(() => {
        if (!clientId || !token) return;
        const controller = new AbortController();
        const loadQuotes = async () => {
            const first = await request(`/api/admin/quotes?clientId=${encodeURIComponent(clientId)}&limit=100&page=1`, { signal: controller.signal });
            const rows = [...(first.quotes || [])];
            for (let page = 2; page <= first.pages; page++) rows.push(...((await request(`/api/admin/quotes?clientId=${encodeURIComponent(clientId)}&limit=100&page=${page}`, { signal: controller.signal })).quotes || []));
            return rows.filter(quote => String(idOf(quote.clientId)) === String(clientId));
        };
        const tasks = {
            vehicles: canStock ? async () => (await request(`/api/admin/clients/${clientId}/vehicles`, { signal: controller.signal })).vehicles || [] : null,
            logs: canLogs ? () => request(`/api/admin/communication-logs?clientId=${encodeURIComponent(clientId)}`, { signal: controller.signal }) : null,
            leads: canLeads ? async () => {
                const first = await request(`/api/admin/leads?clientId=${encodeURIComponent(clientId)}&limit=100&skip=0`, { signal: controller.signal });
                const rows = [...(first.leads || [])];
                for (let skip = 100; skip < first.total; skip += 100) rows.push(...((await request(`/api/admin/leads?clientId=${encodeURIComponent(clientId)}&limit=100&skip=${skip}`, { signal: controller.signal })).leads || []));
                return rows;
            } : null,
            sales: canSales ? () => request(`/api/admin/sales?clientId=${encodeURIComponent(clientId)}`, { signal: controller.signal }) : null,
            quotes: canQuotes ? loadQuotes : null,
            pedidos: canRequests ? async () => (await request('/api/admin/pedidos', { signal: controller.signal, nextRoute: true })).filter(pedido => String(idOf(pedido.clientId)) === String(clientId)) : null
        };
        setRelated({ token, clientId, logs: null, leads: null, vehicles: null, sales: null, quotes: null, pedidos: null, errors: {}, loading: true });
        const entries = Object.entries(tasks);
        Promise.allSettled(entries.map(([, load]) => load ? load() : null)).then(results => {
            if (controller.signal.aborted || active.current.token !== token || active.current.clientId !== clientId) return;
            const next = { token, clientId, errors: {}, loading: false };
            results.forEach((result, index) => { const key = entries[index][0]; next[key] = result.status === 'fulfilled' ? result.value : null; if (result.status === 'rejected' && result.reason.name !== 'AbortError') next.errors[key] = result.reason.message; });
            setRelated(next);
        });
        return () => controller.abort();
    }, [clientId, token, canLogs, canSales, canQuotes, canRequests, canLeads, canStock, request, refresh]);
    const client = state.token === token && state.clientId === clientId ? state.client : null;
    const visibleRelated = related.token === token && related.clientId === clientId ? related : { logs: null, sales: null, quotes: null, pedidos: null, errors: {}, loading: true };
    const saved = result => {
        const oldAssignee = client?.assignedTo;
        const assignedTo = oldAssignee && String(idOf(oldAssignee)) === String(idOf(result.assignedTo)) ? oldAssignee : result.assignedTo;
        setState({ token, clientId, client: { ...result, assignedTo }, error: '', loading: false });
        setRefresh(value => value + 1); onClientLoaded?.(result); onUpdated?.(result);
    };
    const update = async payload => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setActionError('');
        try { saved(await request(`/api/admin/clients/${clientId}`, { method: 'PATCH', body: JSON.stringify(payload) })); }
        catch (error) { if (error.name !== 'AbortError') setActionError(error.message); throw error; }
        finally { if (active.current.token === token && active.current.clientId === clientId) { busyRef.current = false; setBusy(false); } }
    };
    const copyLink = async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/admin/clientes/${clientId}`); setCopied(true); }
        catch { setActionError('No se pudo copiar el enlace. Podés abrir la ficha y copiar su dirección.'); }
    };
    const logTemplate = async (template, copiedText) => {
        try {
            await request('/api/admin/communication-logs', { method: 'POST', body: JSON.stringify({
                entityType: 'client', entityId: clientId, clientId, assignedTo: idOf(client?.assignedTo) || null,
                channel: template.channel || 'internal_note', direction: 'internal', outcome: 'other',
                title: `Plantilla copiada: ${template.name}`, notes: copiedText, sourceModule: 'clientes', contactDate: new Date().toISOString()
            }) });
            setRefresh(value => value + 1);
        } catch (error) { if (error.name !== 'AbortError') setActionError(error.message); }
    };
    if (!client) return <div className="p-6">{state.error ? <><p role="alert" className="text-sm text-crm-red">{state.error}</p><button type="button" className={BUTTON} onClick={() => setRefresh(value => value + 1)}>Reintentar</button></> : <p role="status" className="text-sm text-crm-fg-muted">Cargando cliente…</p>}</div>;
    const stage = CLIENT_PIPELINE_STAGES.find(item => item.id === getClientPipelineStage(client));
    const contacted = effectiveClientContacted(client);
    const assignee = typeof client.assignedTo === 'object' ? client.assignedTo?.name : client.assignedTo ? 'Responsable asignado' : 'Sin responsable';
    const phone = normalizePhoneToWhatsApp(client.phone || '');
    const interactions = [...(client.interactions || [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const lastInteraction = interactions[0];
    const overdue = client.nextActionDate && clientCalendarKey(client.nextActionDate) < clientTodayKey();
    const openRequests = (visibleRelated.pedidos || []).filter(item => ['Pendiente', 'Buscando'].includes(item.status));
    const sales = visibleRelated.sales || [], ownedVehicles = visibleRelated.vehicles || [];
    const buyerSales = sales.filter(sale => !['borrador', 'cancelada'].includes(sale.status) && sale.vehicleId?._id);
    const buyer = ['comprador', 'ambos'].includes(client.type) || buyerSales.length > 0;
    const seller = ['vendedor', 'ambos'].includes(client.type) || ownedVehicles.length > 0;
    const relation = buyer && seller ? 'Comprador y vendedor' : buyer ? 'Comprador' : seller ? 'Vendedor' : 'Potencial';
    const saleStatus = sale => ({ borrador: 'Borrador', señado: 'Señada', confirmada: 'Activa', pendiente_entrega: 'Entrega pendiente', entregada: 'Entregada', cancelada: 'Cancelada' }[sale.status] || sale.status);
    const expedienteSales = sales.filter(sale => sale.expedienteStatus && sale.status !== 'borrador');
    const operationsTimeline = [
        ...sales.map(sale => ({ key: `sale-${sale._id}`, date: sale.saleDate || sale.createdAt, title: `Venta ${saleStatus(sale)}`, note: [sale.vehicleId?.brand, sale.vehicleId?.name].filter(Boolean).join(' ') || 'Venta vinculada', href: `/admin/ventas/${sale._id}`, icon: 'sale' })),
        ...expedienteSales.map(sale => ({ key: `case-${sale._id}`, date: sale.createdAt, title: 'Expediente asociado', note: `${String(sale.expedienteStatus).replaceAll('_', ' ')} · Comprador`, href: `/admin/ventas/${sale._id}`, icon: 'case' })),
        ...(visibleRelated.quotes || []).map(quote => ({ key: `quote-${quote._id}`, date: quote.issueDate || quote.createdAt, title: `Cotización ${quote.quoteNumber || ''}`, note: `${quote.vehicleDescription || ''} · ${quote.status}`, href: `/admin/cotizaciones/${quote._id}`, icon: 'quote' })),
        ...(visibleRelated.pedidos || []).map(pedido => ({ key: `request-${pedido._id}`, date: pedido.createdAt, title: `Pedido ${pedido.status.toLocaleLowerCase('es')}`, note: `${pedido.requestedBrand} ${pedido.requestedModel}`, href: '/admin/pedidos', icon: 'request' })),
        ...(visibleRelated.leads || []).map(lead => ({ key: `lead-${lead._id}`, date: lead.createdAt, title: 'Consulta vinculada', note: lead.name, href: `/admin/leads/${lead._id}`, icon: 'lead' }))
    ].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    const activities = [
        ...interactions.map((item, index) => ({ key: `interaction-${index}`, type: 'gestion', date: item.date, title: interactionTypes.find(([id]) => id === item.type)?.[1] || item.type, note: item.note, user: item.user, outboundNoReply: item.outboundNoReply })),
        ...(visibleRelated.logs || []).map(log => ({ key: `log-${log._id}`, type: 'comunicacion', date: log.contactDate, title: log.title, note: log.notes, user: log.createdBy?.name }))
    ].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    const audit = [...(client.clientAuditLog || [])].reverse().map((item, index) => ({ key: `audit-${index}`, date: item.date, title: item.action?.replaceAll('_', ' ') || 'Actualización', note: item.details || '', user: item.user }));
    const filteredActivities = activities.filter(item => (historyType === 'todos' || item.type === historyType) && `${item.title} ${item.note || ''} ${item.user || ''}`.toLocaleLowerCase('es').includes(historySearch.toLocaleLowerCase('es')));
    const tabs = compact ? [['resumen', 'Resumen'], ['actividad', 'Actividad']] : [['resumen', 'Resumen'], ['conversacion', 'Conversación'], ['historial', 'Historial'], ['operaciones', 'Operaciones'], ['documentacion', 'Documentación']];
    const blue = `${BUTTON} !border-blue-500/50 !bg-blue-600 !text-white hover:!bg-blue-500`;
    const amber = `${BUTTON} !border-amber-500/40 !bg-amber-500/10 !text-amber-400 hover:!bg-amber-500/20`;
    const green = `${BUTTON} !border-emerald-500/40 !bg-emerald-500/10 !text-emerald-400 hover:!bg-emerald-500/20`;
    const renderTimeline = (items, empty) => items.length ? <ol className="m-0 space-y-4 border-l border-crm-border pl-4">{items.map(item => <li key={item.key} className="relative list-none"><span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-crm-surface ${item.href ? 'bg-blue-400' : 'bg-crm-fg-muted'}`} /><div className="flex items-start justify-between gap-3"><strong className="text-xs font-semibold capitalize text-crm-fg">{item.title}</strong><span className="shrink-0 text-[10px] text-crm-fg-muted">{stamp(item.date)}</span></div>{item.note && <p className="mb-1 mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-crm-fg-muted">{item.note}</p>}{item.outboundNoReply && <p className="mb-0 text-[10px] text-amber-400">Intento de contacto sin respuesta</p>}{item.user && <span className="text-[10px] text-crm-fg-muted">{item.user}</span>}{item.href && <Link href={item.href} className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue-400 no-underline">Abrir registro<ArrowRight size={11} /></Link>}</li>)}</ol> : <Empty>{empty}</Empty>;
    const sectionError = key => visibleRelated.errors[key] ? <p role="alert" className="text-xs text-crm-red">{visibleRelated.errors[key]}</p> : null;
    const remove = async () => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setActionError('');
        try { await request(`/api/admin/clients/${clientId}`, { method: 'DELETE' }); onUpdated?.(); onRemoved?.(); }
        catch (error) { if (error.name !== 'AbortError') setActionError(error.message); }
        finally { if (active.current.mounted) { busyRef.current = false; setBusy(false); } }
    };
    return <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] leading-4">
                <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-400">{stage?.label || client.pipelineStage || 'Sin etapa'}</span>
                <span className={`rounded-full border px-2.5 py-1 ${client.segment === 'vip' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' : 'border-crm-border bg-crm-bg text-crm-fg-muted'}`}>{client.segment === 'vip' ? 'VIP' : 'Regular'}</span>
                <span className="rounded-full border border-crm-border px-2.5 py-1 text-crm-fg-muted">{sourceLabels[client.source] || client.source || 'Sin origen'}</span>
                <span className={`rounded-full border px-2.5 py-1 ${contacted ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/25 bg-amber-500/10 text-amber-400'}`}>{contacted ? 'Contactado' : 'Sin contactar'}</span>
                <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-violet-400">{relation}</span>
                {canWrite && <button type="button" className={`${BUTTON} ml-auto !min-h-7 !px-2`} onClick={() => onEdit ? onEdit(client) : setEditing(true)}><Pencil size={12} />Editar</button>}
            </div>
            <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-crm-fg">{client.description || client.vehicleOfInterest || [client.brand, client.model].filter(Boolean).join(' ') || 'Todavía no registramos qué está buscando.'}</p>
            <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-3"><Data label="Presupuesto">{amount(client.maxBudget, client.currency)}</Data><Data label="Responsable">{assignee}</Data></dl>
            {(client.phone || client.email) && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-crm-fg-muted">{client.phone && (client.doNotContact ? <span className="inline-flex items-center gap-1.5"><Phone size={12} />{client.phone}</span> : <a href={`tel:${String(client.phone).replace(/[^+\d]/g,'')}`} className="inline-flex items-center gap-1.5 text-inherit no-underline hover:text-crm-fg"><Phone size={12} />{client.phone}</a>)}{client.email && (client.doNotContact ? <span className="inline-flex min-w-0 items-center gap-1.5"><Mail size={12} /><span className="break-all">{client.email}</span></span> : <a href={`mailto:${client.email}`} className="inline-flex min-w-0 items-center gap-1.5 text-inherit no-underline hover:text-crm-fg"><Mail size={12} /><span className="break-all">{client.email}</span></a>)}</div>}
            {client.doNotContact && <p role="status" className="m-0 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-amber-400">No contactar activo. Los accesos de WhatsApp, llamada y email están deshabilitados.</p>}
            <details className="rounded-lg border border-crm-border bg-crm-bg/40"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between px-3 text-xs text-crm-fg-muted">Más acciones<ChevronDown size={13} /></summary><div className="space-y-2 border-t border-crm-border p-3"><div className="flex flex-wrap gap-2"><button type="button" className={BUTTON} onClick={copyLink}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Enlace copiado" : "Copiar enlace interno"}</button><button type="button" className={BUTTON} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={13} />Actualizar ficha</button></div>{canWrite && <><label className="block text-[11px] text-crm-fg-muted">Etapa comercial<select value={getClientPipelineStage(client)} onChange={event => update({ pipelineStage: event.target.value }).catch(() => {})} disabled={busy} className={`${FIELD} mt-1 !text-xs`}>{!stage && <option value={client.pipelineStage}>{client.pipelineStage}</option>}{CLIENT_PIPELINE_STAGES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">{hasPermission(user, PERMISSIONS.STOCK_WRITE) && <Link href={`/admin/stock?crear=consignacion&cliente=${clientId}`} className={`${BUTTON} justify-start no-underline`}><Car size={13} />Cargar auto en consignación</Link>}{hasPermission(user, PERMISSIONS.TALLER_WRITE) && <Link href={`/admin/taller?crear=orden&cliente=${clientId}`} className={`${BUTTON} justify-start no-underline`}>Nueva orden de taller</Link>}<button type="button" className={`${BUTTON} justify-start`} disabled={busy} onClick={() => update({ doNotContact: !client.doNotContact }).catch(() => {})}>{client.doNotContact ? 'Reanudar contacto' : 'No contactar'}</button><button type="button" className={`${BUTTON} justify-start`} disabled={busy} onClick={() => update({ newInteraction: { type: 'otro', note: 'Contacto confirmado manualmente desde la ficha.', outboundNoReply: false } }).catch(() => {})}>Marcar contactado</button>{contacted && <button type="button" className={`${BUTTON} justify-start`} disabled={busy} onClick={() => update({contactConfirmed:false}).catch(() => {})}>A nuevos · Sin contactar</button>}{canRequests && <Link href="/admin/pedidos" className={`${BUTTON} justify-start no-underline`}>Pedido activo / búsquedas</Link>}<button type="button" className={`${BUTTON} justify-start !text-crm-red`} disabled={busy} onClick={() => setDeletionOpen(true)}>Eliminar cliente</button></div></>}</div></details>
            {(state.error || actionError) && <p role="alert" className="rounded-lg bg-crm-red/10 p-3 text-xs text-crm-red">{actionError || state.error}</p>}
            <div role="tablist" aria-label="Ficha del cliente" className="flex gap-4 overflow-x-auto border-b border-crm-border">{tabs.map(([id, label]) => <button type="button" key={id} role="tab" aria-selected={tab === id} aria-controls={`client-panel-${id}`} onClick={() => setTab(id)} className={`shrink-0 border-b-2 bg-transparent pb-2 text-xs font-medium ${tab === id ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted'}`}>{label}</button>)}</div>
            <div role="tabpanel" id={`client-panel-${tab}`} className="space-y-4">
                {tab === 'resumen' && <>
                    <section className={`${BOX} ${overdue ? 'border-amber-500/30' : ''}`}><div className="flex items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-crm-fg">Próximo paso</h3>{canWrite && <button type="button" className={amber} onClick={() => setActionForm({ kind: 'schedule' })}><CalendarDays size={13} />Agendar</button>}</div><p className="mb-1 mt-3 text-sm leading-5 text-crm-fg">{client.nextAction || 'Sin próxima acción registrada'}</p><p className={`m-0 text-xs ${overdue ? 'text-amber-400' : 'text-crm-fg-muted'}`}>{client.nextActionDate ? `${calendar(client.nextActionDate)}${overdue ? ' · Seguimiento vencido' : ''}` : 'Sin fecha de seguimiento'}</p>{canWrite && <div className="mt-4 flex flex-wrap gap-1.5">{Object.entries(presets).map(([key, item]) => <button key={key} type="button" className={BUTTON} onClick={() => setActionForm({ kind: 'interaction', preset: key })}>{item.label}</button>)}</div>}</section>
                    <section className={BOX}><h3 className="m-0 text-sm font-semibold text-crm-fg">Última gestión</h3>{lastInteraction ? <><p className="mb-1 mt-3 whitespace-pre-wrap text-xs leading-5 text-crm-fg-muted">{lastInteraction.note}</p><p className="m-0 text-[10px] text-crm-fg-muted">{stamp(lastInteraction.date)}{lastInteraction.outboundNoReply ? ' · Sin respuesta' : ''}</p></> : <p className="mb-0 mt-2 text-xs text-crm-fg-muted">Todavía no hay una gestión registrada.</p>}<p className="mb-0 mt-3 border-t border-crm-border pt-3 text-[10px] text-crm-fg-muted">Último contacto: {client.lastContactDate ? calendar(client.lastContactDate) : 'Sin contacto registrado'}</p></section>
                    <details className="rounded-xl border border-violet-500/25 bg-violet-500/5"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold text-violet-400">Otras oportunidades{openRequests.length > 0 && <span className="ml-auto mr-3 rounded-full bg-violet-500/10 px-2 py-0.5">{openRequests.length}</span>}<ChevronDown size={13} /></summary><div className="space-y-3 border-t border-violet-500/20 px-4 py-3">{canRequests ? sectionError('pedidos') || (visibleRelated.loading ? <p className="m-0 text-xs text-crm-fg-muted">Consultando pedidos…</p> : openRequests.length ? openRequests.map(item => <Link href="/admin/pedidos" key={item._id} className="block text-xs text-violet-400 no-underline">Pedido abierto · {item.requestedBrand} {item.requestedModel}<ArrowRight size={11} className="ml-1 inline" /></Link>) : <p className="m-0 text-xs text-crm-fg-muted">Sin pedidos abiertos vinculados.</p>) : <p className="m-0 text-xs text-crm-fg-muted">Necesitás permiso de consulta de Pedidos.</p>}{client.birthDate && <p className="m-0 text-xs text-crm-fg-muted">Cumpleaños: {calendar(client.birthDate).slice(0, 5)}</p>}<ClientMatchingRequestControl client={client} disabled={busy} onUpdated={() => setRefresh(value => value + 1)} /></div></details>
                    <details className={BOX}><summary className="cursor-pointer text-xs font-semibold text-crm-fg">Datos básicos</summary><dl className="mb-0 mt-4 grid grid-cols-2 gap-4"><Data label="Teléfono">{client.phone}</Data><Data label="Email">{client.email}</Data><Data label="DNI / CUIT">{client.dniCuit}</Data><Data label="Localidad">{[client.locality, client.province].filter(Boolean).join(', ')}</Data><Data label="Domicilio">{client.address}</Data><Data label="Fecha de nacimiento">{client.birthDate ? calendar(client.birthDate) : ''}</Data></dl></details>
                </>}
                {(tab === 'historial' || tab === 'actividad') && <>
                    <div className="inline-flex gap-1 rounded-lg border border-crm-border bg-crm-bg p-1">{[['timeline','Timeline'],['gestiones','Actividades']].map(([id,label]) => <button key={id} type="button" aria-pressed={historyMode === id} onClick={() => setHistoryMode(id)} className={`min-h-7 rounded-md px-3 text-xs ${historyMode === id ? 'bg-crm-surface-raised text-crm-fg' : 'text-crm-fg-muted'}`}>{label}</button>)}</div>
                    {visibleRelated.loading && <p role="status" className="text-xs text-crm-fg-muted">Cargando actividad vinculada…</p>}
                    {historyMode === 'timeline' ? renderTimeline(operationsTimeline, 'No hay operaciones vinculadas para mostrar en el timeline.') : <><div className="flex gap-2"><label className="relative min-w-0 flex-1"><Search size={13} className="absolute left-3 top-3 text-crm-fg-muted" /><input aria-label="Buscar actividades" value={historySearch} onChange={event => setHistorySearch(event.target.value)} placeholder="Buscar actividades" className={`${FIELD} !pl-8`} /></label><select aria-label="Tipo de actividad" value={historyType} onChange={event => setHistoryType(event.target.value)} className={`${FIELD} !w-auto !text-xs`}><option value="todos">Todos</option><option value="gestion">Gestiones</option><option value="comunicacion">Comunicaciones</option></select></div>{sectionError('logs')}{renderTimeline(filteredActivities, 'No hay actividades para estos filtros.')}</>}
                    <details className={BOX}><summary className="cursor-pointer text-xs text-crm-fg-muted">Cambios de la ficha · AutoSporting</summary><div className="mt-4">{renderTimeline(audit, 'No hay cambios registrados.')}</div></details>
                </>}
                {tab === 'conversacion' && <><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="m-0 text-sm font-semibold text-crm-fg">Gestiones y comunicaciones</h3>{hasPermission(user, PERMISSIONS.MESSAGETEMPLATES_READ) && <MessageTemplatePicker category="client" entityData={{ clientName: client.fullName, clientPhone: client.phone, clientEmail: client.email, assignedToName: assignee }} onLogAction={hasPermission(user, PERMISSIONS.COMMUNICATIONLOGS_WRITE) ? logTemplate : undefined} />}</div>{!canLogs && <p className="text-xs text-crm-fg-muted">Las comunicaciones requieren permiso de consulta. Podés ver las gestiones guardadas en el cliente.</p>}{sectionError('logs')}{renderTimeline(activities, 'Todavía no hay gestiones ni comunicaciones registradas.')}</>}
                {tab === 'operaciones' && <>
                    <section className={BOX}><h3 className="mb-3 mt-0 text-sm font-semibold text-crm-fg">Sus autos</h3><div className="mb-3 flex gap-4 border-b border-crm-border">{[['comprados','Comprados',buyerSales.length],['vendidos','Vendidos',ownedVehicles.length]].map(([id,label,count]) => <button type="button" key={id} onClick={() => setVehicleTab(id)} aria-pressed={vehicleTab === id} className={`border-b-2 pb-2 text-xs ${vehicleTab === id ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted'}`}>{label}<span className="ml-1.5 text-[10px]">{(id === 'comprados' ? canSales : canStock) ? count : '—'}</span></button>)}</div>{vehicleTab === 'comprados' ? !canSales ? <Empty>Necesitás permiso de Ventas para consultar estas unidades.</Empty> : sectionError('sales') || (visibleRelated.loading ? <p className="text-xs text-crm-fg-muted">Consultando unidades…</p> : buyerSales.length ? buyerSales.map(sale => <div key={sale._id} className="flex items-center justify-between gap-3 border-t border-crm-border py-3"><div><p className="m-0 text-xs font-semibold text-crm-fg">{sale.vehicleId.brand} {sale.vehicleId.name}</p><span className="mt-1 block text-[10px] text-crm-fg-muted">{sale.status === 'entregada' ? 'Compra entregada' : 'Operación en curso'} · {saleStatus(sale)}</span></div>{canStock && <Link href={`/admin/stock/${sale.vehicleId._id}`} className={`${BUTTON} no-underline`}>Ver Stock<ArrowRight size={12} /></Link>}</div>) : <Empty>Sin unidades compradas o en curso vinculadas.</Empty>) : !canStock ? <Empty>Necesitás permiso de Stock para consultar estas unidades.</Empty> : sectionError('vehicles') || (ownedVehicles.length ? <><p className="text-[11px] text-crm-fg-muted">Unidades entregadas o consignadas por el cliente. El estado de Stock conserva su circuito.</p>{ownedVehicles.map(vehicle => <div key={vehicle._id} className="flex items-center justify-between gap-3 border-t border-crm-border py-3"><div><p className="m-0 text-xs font-semibold text-crm-fg">{vehicle.brand} {vehicle.name} {vehicle.year}</p><span className="mt-1 block text-[10px] text-crm-fg-muted">{vehicle.plateOrVin || 'Sin dominio'} · {vehicle.status}</span></div><Link href={`/admin/stock/${vehicle._id}`} className={`${BUTTON} no-underline`}>Ver Stock<ArrowRight size={12} /></Link></div>)}</> : <Empty>Sin unidades entregadas o consignadas vinculadas.</Empty>)}</section>
                    <section className={BOX}><h3 className="m-0 mb-3 text-sm font-semibold text-crm-fg">Historia · Ventas asociadas</h3>{!canSales ? <Empty>Necesitás permiso de consulta de Ventas.</Empty> : sectionError('sales') || (sales.length ? sales.map(sale => <div key={sale._id} className="flex items-center justify-between gap-3 border-t border-crm-border py-3"><div className="min-w-0"><p className="m-0 text-xs font-semibold text-crm-fg">{[sale.vehicleId?.brand,sale.vehicleId?.name].filter(Boolean).join(' ') || 'Venta vinculada'}</p><p className="mb-0 mt-1 text-[10px] text-crm-fg-muted">{saleStatus(sale)} · {formatSaleDate(sale)}{sale.historicalOnly ? ' · Histórica' : ''}</p></div><Link href={`/admin/ventas/${sale._id}`} className={`${BUTTON} shrink-0 no-underline`}>Abrir venta<ArrowRight size={12} /></Link></div>) : <Empty>Sin ventas asociadas.</Empty>)}</section>
                    <section className={BOX}><h3 className="m-0 mb-3 text-sm font-semibold text-crm-fg">Cotizaciones</h3>{!canQuotes ? <Empty>Necesitás permiso de consulta de Cotizaciones.</Empty> : sectionError('quotes') || ((visibleRelated.quotes || []).length ? visibleRelated.quotes.map(quote => <div key={quote._id} className="flex items-center justify-between gap-3 border-t border-crm-border py-3"><div><p className="m-0 text-xs font-semibold text-crm-fg">Cotización {quote.quoteNumber || ''}</p><p className="mb-0 mt-1 text-[10px] text-crm-fg-muted">{quote.vehicleDescription} · {quote.status}</p></div><Link href={`/admin/cotizaciones/${quote._id}`} className={`${BUTTON} no-underline`}>Ver<ArrowRight size={12} /></Link></div>) : <Empty>Sin cotizaciones vinculadas.</Empty>)}</section>
                    <section className={BOX}><h3 className="m-0 mb-3 text-sm font-semibold text-crm-fg">Expedientes</h3>{!canSales ? <Empty>Necesitás permiso de consulta de Ventas.</Empty> : sectionError('sales') || (expedienteSales.length ? expedienteSales.map(sale => <div key={sale._id} className="flex items-center justify-between gap-3 border-t border-crm-border py-3"><div><p className="m-0 text-xs font-semibold text-crm-fg">{[sale.vehicleId?.brand,sale.vehicleId?.name].filter(Boolean).join(' ') || 'Expediente asociado'}</p><p className="mb-0 mt-1 text-[10px] capitalize text-crm-fg-muted">{String(sale.expedienteStatus).replaceAll('_',' ')} · Comprador</p></div><Link href={`/admin/ventas/${sale._id}`} className={`${BUTTON} no-underline`}>Gestionar<ArrowRight size={12} /></Link></div>) : <Empty>Sin expedientes asociados.</Empty>)}</section>
                    <section className={BOX}><h3 className="m-0 mb-4 text-sm font-semibold text-crm-fg">Timeline consolidado</h3>{renderTimeline(operationsTimeline, 'Sin operaciones vinculadas.')}</section>
                    {canLeads && <details className={BOX}><summary className="cursor-pointer text-xs font-semibold text-crm-fg">Consultas / Leads de AutoSporting</summary><div className="mt-4">{sectionError('leads') || renderTimeline(operationsTimeline.filter(item => item.icon === 'lead'), 'Sin consultas vinculadas.')}</div></details>}
                    <ClientNpsPanel clientId={clientId} client={client} onUpdated={() => setRefresh(value => value + 1)} />
                </>}
                {tab === 'documentacion' && <><ClientDocumentsPanel clientId={clientId} client={client} />{canSales && sales.length > 0 && <section className={BOX}><h3 className="mb-3 mt-0 text-sm font-semibold text-crm-fg">Documentos de operaciones</h3>{sales.map(sale => <Link key={sale._id} href={`/admin/ventas/${sale._id}`} className="mt-2 flex items-center gap-2 text-xs text-blue-400 no-underline"><FileText size={13} />Abrir expediente · {[sale.vehicleId?.brand,sale.vehicleId?.name].filter(Boolean).join(' ') || 'Venta vinculada'}</Link>)}</section>}</>}
            </div>
            <details className={BOX}><summary className="cursor-pointer text-xs font-semibold text-crm-fg">Origen y asignación</summary><dl className="mb-0 mt-4 grid grid-cols-2 gap-4"><Data label="Origen">{sourceLabels[client.source] || client.source}</Data><Data label="Ingreso">{client.reason === 'entro_puerta' ? 'Entró al local' : 'Consulta digital'}</Data><Data label="Responsable">{assignee}</Data><Data label="Fecha de alta">{formatSaleDate({createdAt:client.createdAt})}</Data></dl>{(client.clientAuditLog || []).filter(item => ['assignedTo','source','reason'].includes(item.field) || item.action === 'RESPONSABLE_ASIGNADO').slice(-5).reverse().map((item,index) => <p key={index} className="mb-0 mt-3 text-[10px] text-crm-fg-muted">{stamp(item.date)} · {item.details || item.action} · {item.user || 'Equipo'}</p>)}</details>
            <details className={BOX}><summary className="cursor-pointer text-xs font-semibold text-crm-fg">Cómo compra y datos comerciales</summary><dl className="mb-0 mt-4 grid grid-cols-2 gap-4"><Data label="Forma de compra">{{contado:'Contado',financiacion:'Financiación'}[client.purchaseMethod]}</Data><Data label="Cuándo compra">{{ahora:'Ahora','1_3_meses':'En 1 a 3 meses',mas_adelante:'Más adelante',explorando:'Está explorando'}[client.purchaseTiming]}</Data><Data label="Anticipo disponible">{client.availableDownPayment != null ? amount(client.availableDownPayment,client.downPaymentCurrency) : ''}</Data><Data label="Entrega usado">{{si:'Sí',no:'No'}[client.tradeInIntent]}</Data><Data label="Ocupación">{client.occupation}</Data><Data label="Observaciones">{client.notes}</Data></dl></details>
        </div>
        <footer className="shrink-0 border-t border-crm-border bg-crm-surface p-4"><div className="flex flex-wrap items-center gap-2">{phone && !client.doNotContact && <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className={`${green} no-underline`}><MessageCircle size={13} />WhatsApp</a>}{canWrite && <button type="button" className={blue} onClick={() => setActionForm({kind:'interaction'})}>Registrar gestión</button>}{canWrite && <button type="button" className={amber} onClick={() => setActionForm({kind:'schedule'})}><CalendarDays size={13} />Agendar</button>}</div>{compact && (onOpenFull ? <button type="button" className={`${BUTTON} mt-3 w-full`} onClick={() => onOpenFull(clientId)}>Abrir ficha completa<ExternalLink size={13} /></button> : <Link href={`/admin/clientes/${clientId}`} className={`${BUTTON} mt-3 w-full no-underline`}>Abrir ficha completa<ExternalLink size={13} /></Link>)}</footer>
        {canWrite && editing && <ClientFormModal isOpen onClose={() => setEditing(false)} client={client} onSave={update} />}
        {canWrite && actionForm && <ClientActionForm key={`${token}:${clientId}:${actionForm.kind}:${actionForm.preset || ''}`} kind={actionForm.kind} preset={actionForm.preset} client={client} request={request} onSaved={saved} onClose={() => setActionForm(null)} />}
        <CrmModal isOpen={deletionOpen} onClose={() => !busy && setDeletionOpen(false)} title="Enviar cliente a Papelera" maxWidth="max-w-md" footer={<div className="flex justify-end gap-2"><button type="button" className={BUTTON} disabled={busy} onClick={() => setDeletionOpen(false)}>Cancelar</button><button type="button" className={`${BUTTON} !border-red-500/40 !text-crm-red`} disabled={busy} onClick={remove}>{busy ? 'Guardando…' : 'Enviar a Papelera'}</button></div>}><div className="p-5 text-sm leading-6 text-crm-fg-muted">La ficha se conserva en Papelera durante el plazo de recuperación de la agencia.{actionError && <p role="alert" className="text-crm-red">{actionError}</p>}</div></CrmModal>
    </div>;
}

export default function ClientDetailWorkspace({ isOpen = true, clientId, onClose, onUpdated, onEdit }) {
    const { token } = useAuth();
    const [heading,setHeading] = useState({token:null,clientId:null,name:''});
    const loaded = useCallback(client => setHeading({token,clientId,name:client.fullName || 'Cliente'}),[token,clientId]);
    const title = heading.token === token && heading.clientId === clientId ? heading.name : 'Cliente';
    return <CrmModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-[672px]" fullScreenOnMobile fullHeightOnDesktop bodyClassName="flex flex-col !overflow-hidden">{isOpen && <ClientWorkspaceBody key={`${token}:${clientId}`} clientId={clientId} onUpdated={onUpdated} onEdit={onEdit} onClientLoaded={loaded} onRemoved={onClose} />}</CrmModal>;
}
