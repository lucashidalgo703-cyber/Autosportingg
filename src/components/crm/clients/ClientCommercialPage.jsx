"use client";
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Download, Upload, Users, Table2, KanbanSquare, CalendarClock, BarChart3, Search, Trophy, ListFilter, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { useClientCommercial } from '../../../hooks/useClientCommercial';
import { exportClientRows } from '../../../utils/clientSpreadsheet';
import { CLIENT_FILTER_DEFAULTS, readClientLocation, clientLocation } from '../../../utils/clientNavigation';
import { CLIENT_PIPELINE_STAGES, getClientPipelineStage, formatClientNextAction, clientTodayKey } from '../../../utils/clientCommercial';
import CrmPageHeader from '../ui/CrmPageHeader';
import CrmButton from '../ui/CrmButton';
import CrmPagination from '../ui/CrmPagination';
import ClientFilters from './ClientFilters';
import ClientPipelineBoard from './ClientPipelineBoard';
import ClientFormModal from './ClientFormModal';
import ClientImportModal from './ClientImportModal';
import ClientBulkActionBar from './ClientBulkActionBar';
import ClientDetailedTable from './ClientDetailedTable';
import CrmModal from '../ui/CrmModal';
import ClientInsightViews from './ClientInsightViews';
import ClientAvailabilityModal from './ClientAvailabilityModal';
import ClientQuickDrawer from './ClientQuickDrawer';
import ClientDetailWorkspace from './ClientDetailWorkspace';

const priorities = [{ id: 'hoy', label: 'Para atender hoy' }, { id: 'todos', label: 'Todos' }, { id: 'primera', label: 'Primera atención' }, { id: 'sinfecha', label: 'Sin próxima fecha' }];
const views = [{ id: 'lista', label: 'Clientes', Icon: Users }, { id: 'tabla', label: 'Tabla detallada', Icon: Table2 }, { id: 'pipeline', label: 'Pipeline', Icon: KanbanSquare }, { id: 'seguimientos', label: 'Seguimientos', Icon: CalendarClock }, { id: 'ingresos', label: 'Ingresos', Icon: BarChart3 }, { id: 'demanda', label: 'Demanda', Icon: Search }, { id: 'ranking', label: 'Ranking', Icon: Trophy }];
const field = 'h-9 min-w-0 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg focus:outline-none focus:ring-1 focus:ring-crm-red';
const chip = 'inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium';
const analytical = ['ingresos', 'demanda', 'ranking'];

export default function ClientCommercialPage() {
    const { user, token } = useAuth();
    const canRead = hasPermission(user, PERMISSIONS.CLIENTES_READ);
    const canWrite = hasPermission(user, PERMISSIONS.CLIENTES_WRITE);
    const canExport = hasPermission(user, PERMISSIONS.EXPORTS_READ);
    const { clients, loading, error, total, totalPages, priorityCounts, pipelineCounts, contactCounts, contactMonths, fetchClients, createClient, updateClient, fetchClientsForExport } = useClientCommercial();
    const [filters, setFilters] = useState(CLIENT_FILTER_DEFAULTS);
    const [view, setView] = useState('lista'), [page, setPage] = useState(1), [period, setPeriod] = useState('hoy'), [compact, setCompact] = useState(false);
    const [ready, setReady] = useState(false), [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false), [editingClient, setEditingClient] = useState(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false), [availabilityOpen, setAvailabilityOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [busyId, setBusyId] = useState(null), [exporting, setExporting] = useState(false);
    const [deletingClient, setDeletingClient] = useState(null), [deleteError, setDeleteError] = useState('');
    const [selectedClient, setSelectedClient] = useState(null), [fullClient, setFullClient] = useState(false);
    const [insights, setInsights] = useState({ token: null, loading: false, error: '', data: null });
    const session = useRef(token); session.current = token;
    const previousToken = useRef(token);
    const returnTo = clientLocation(filters, view, page, period, compact);
    const applied = view === 'pipeline' ? { ...filters, attention: 'todos', segment: '' } : view === 'seguimientos' ? { ...filters, attention: 'todos', followups: 'pending', segment: '' } : filters;

    useEffect(() => {
        const read = () => {
            const next = readClientLocation(window.location.search);
            setFilters(next.filters); setView(next.view); setPage(next.page); setPeriod(next.period); setCompact(next.compact);
            const query = new URLSearchParams(window.location.search), id = query.get('cliente');
            setSelectedClient(id && /^[a-f0-9]{24}$/i.test(id) ? { _id: id } : null);
            setFullClient(query.get('ficha') === 'completa'); setReady(true);
        };
        read(); window.addEventListener('popstate', read);
        return () => window.removeEventListener('popstate', read);
    }, []);
    useEffect(() => {
        if (!ready || !token || !canRead || analytical.includes(view)) return;
        fetchClients({ ...filters, attention: view === 'pipeline' || view === 'seguimientos' ? 'todos' : filters.attention, segment: view === 'pipeline' || view === 'seguimientos' ? '' : filters.segment, ...(view === 'seguimientos' ? { followups: 'pending' } : {}), page, limit: view === 'pipeline' ? 100 : 20 });
        setSelectedIds([]);
    }, [filters, page, view, ready, token, canRead, fetchClients]);
    useEffect(() => {
        if (!ready) return;
        const url = new URL(returnTo, window.location.origin);
        if (selectedClient?._id) { url.searchParams.set('cliente', selectedClient._id); if (fullClient) url.searchParams.set('ficha', 'completa'); }
        window.history.replaceState(null, '', url.pathname + url.search);
    }, [returnTo, selectedClient?._id, fullClient, ready]);
    useEffect(() => {
        setSelectedIds([]); setSelectionMode(false); setUsers([]); setDeletingClient(null); setDeleteError(''); setBusyId(null); setExporting(false); setIsModalOpen(false); setIsImportModalOpen(false); setAvailabilityOpen(false);
        if (previousToken.current !== token) { setSelectedClient(null); setFullClient(false); setEditingClient(null); setFilters(CLIENT_FILTER_DEFAULTS); }
        previousToken.current = token;
        if (!token || !canRead) return;
        const controller = new AbortController();
        fetch('/api/admin/users/active', { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal, cache: 'no-store' })
            .then(response => response.ok ? response.json() : []).then(data => { if (!controller.signal.aborted) setUsers(Array.isArray(data) ? data : data.users || []); }).catch(() => {});
        return () => controller.abort();
    }, [token, canRead]);
    useEffect(() => {
        if (!ready || !token || !canRead || !analytical.includes(view)) return;
        const controller = new AbortController(); setInsights({ token, loading: true, error: '', data: null });
        const requestedPeriod = view === 'ingresos' ? period : 'todos';
        fetch('/api/admin/clients-insights?period=' + requestedPeriod, { headers: { Authorization: 'Bearer ' + token }, signal: controller.signal, cache: 'no-store' })
            .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.message || 'No se pudo consultar esta vista.'); return data; })
            .then(data => { if (!controller.signal.aborted) setInsights({ token, loading: false, error: '', data }); })
            .catch(err => { if (!controller.signal.aborted) setInsights({ token, loading: false, error: err.message, data: null }); });
        return () => controller.abort();
    }, [view, period, ready, token, canRead]);

    const apply = next => { setFilters(next); setPage(1); };
    const reload = () => fetchClients({ ...applied, page, limit: view === 'pipeline' ? 100 : 20 });
    const changeView = next => { setSelectionMode(false); setView(next); setPage(1); setSelectedClient(null); if (next !== 'lista') setFilters(previous => ({ ...previous, attention: 'todos' })); };
    const move = async (id, pipelineStage) => {
        if (!canWrite || busyId) return;
        setBusyId(id);
        try { await updateClient(id, { pipelineStage }); await reload(); }
        catch (err) { if (err.name !== 'AbortError') toast.error(err.message); }
        finally { if (session.current === token) setBusyId(null); }
    };
    const saveClient = async data => {
        const saved = editingClient?._id ? await updateClient(editingClient._id, data) : await createClient(data);
        if (session.current === token) { setEditingClient(null); void reload(); if (selectedClient?._id === saved._id) setSelectedClient(saved); }
        return saved;
    };
    const exportRows = async (all = false) => {
        if (!canExport || exporting) return;
        setExporting(true);
        try {
            const rows = selectedIds.length && !all ? clients.filter(client => selectedIds.includes(client._id)) : await fetchClientsForExport(all ? { attention: 'todos' } : applied);
            if (!rows.length) { toast('No hay clientes para exportar.'); return; }
            const data = exportClientRows(rows);
            const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Clientes'); XLSX.writeFile(workbook, 'autosporting_clientes_' + Date.now() + '.xlsx'); setSelectedIds([]);
        } catch (err) { if (err.name !== 'AbortError') toast.error(err.message); }
        finally { if (session.current === token) setExporting(false); }
    };
    const removeClient = async () => {
        if (!canWrite || !deletingClient || busyId) return;
        setBusyId(deletingClient._id); setDeleteError('');
        try {
            const response = await fetch('/api/admin/clients/' + deletingClient._id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
            const result = await response.json(); if (session.current !== token) return;
            if (!response.ok) throw new Error(result.message || 'No se pudo eliminar el cliente.');
            setDeletingClient(null); setSelectedClient(null); toast.success('Cliente enviado a Papelera.'); void reload();
        } catch (err) { if (session.current === token) setDeleteError(err.message); }
        finally { if (session.current === token) setBusyId(null); }
    };
    const markContacted = async client => {
        if (!canWrite || busyId) return;
        setBusyId(client._id);
        try { await updateClient(client._id, { newInteraction: { type: 'otro', note: 'Contacto confirmado manualmente desde el directorio.', outboundNoReply: false } }); void reload(); }
        catch (err) { if (err.name !== 'AbortError') toast.error(err.message); }
        finally { if (session.current === token) setBusyId(null); }
    };
    const resetContact = async client => {
        if (!canWrite || busyId) return;
        setBusyId(client._id);
        try { await updateClient(client._id, { contactConfirmed: false }); void reload(); }
        catch (err) { if (err.name !== 'AbortError') toast.error(err.message); }
        finally { if (session.current === token) setBusyId(null); }
    };
    const openEdit = client => { setSelectedClient(null); setEditingClient(client); setIsModalOpen(true); };
    const data = insights.token === token ? insights : { loading: true, error: '', data: null };
    const today = clientTodayKey();
    const dayBefore = days => new Date(Date.parse(today + 'T12:00:00Z') - days * 86400000).toISOString().slice(0, 10);
    if (!canRead) return <p role="alert" className="p-6 text-sm text-crm-fg-muted">Necesitás permiso de consulta de Clientes.</p>;

    return <div className="mx-auto w-full max-w-7xl min-w-0 p-4 pb-20 md:pb-4">
        <CrmPageHeader compact title="Clientes" subtitle={(analytical.includes(view) ? data.data?.totalGlobal ?? '—' : priorityCounts?.todos ?? '—') + ' fichas · Relaciones, oportunidades y seguimiento'} actions={<>
            <details className="relative"><summary className="flex h-8 cursor-pointer items-center rounded-lg border border-crm-border bg-crm-surface px-3 text-xs text-crm-fg-muted">Herramientas</summary><div className="absolute right-0 z-20 mt-2 flex min-w-48 flex-col gap-2 rounded-xl border border-crm-border bg-crm-surface p-3 shadow-xl">{canExport && <CrmButton size="sm" variant="secondary" disabled={exporting} onClick={() => exportRows(true)}><Download size={14} />Exportar XLSX</CrmButton>}{canWrite && <CrmButton size="sm" variant="secondary" onClick={() => setIsImportModalOpen(true)}><Upload size={14} />Importar XLSX</CrmButton>}{!canExport && !canWrite && <span className="text-xs text-crm-fg-muted">Consulta de clientes</span>}</div></details>
            {canWrite && <CrmButton size="sm" variant="secondary" className="!h-8 !text-xs" onClick={() => setAvailabilityOpen(true)}>⏸ Pausar / Disponibilidad</CrmButton>}
            {canWrite && <CrmButton size="sm" className="!h-8 !text-xs gap-2" onClick={() => { setEditingClient(null); setIsModalOpen(true); }}><Plus size={14} />Nuevo cliente</CrmButton>}
        </>} />
        <nav className="mb-5 flex flex-wrap gap-1.5" aria-label="Vistas de clientes">{views.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={view === id} onClick={() => changeView(id)} className={'flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-medium transition ' + (view === id ? 'border-crm-red bg-crm-red text-white' : 'border-transparent bg-transparent text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg')}><Icon size={14} />{label}</button>)}</nav>
        {analytical.includes(view) ? <ClientInsightViews view={view} {...data} period={period} onPeriodChange={setPeriod} returnTo={returnTo} onDay={day => { changeView('tabla'); apply({ ...CLIENT_FILTER_DEFAULTS, attention: 'todos', createdFrom: day, createdTo: day }); }} /> : <>
            {view === 'lista' && <section aria-label="Clientes y próximos pasos" className="mb-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="m-0 text-base font-semibold">Tu agenda comercial</h2><p className="mb-0 mt-1 text-xs text-crm-fg-muted">Prioridades con nombre y próximo paso · {new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())}</p></div>{canExport && <CrmButton size="sm" variant="secondary" disabled={exporting || loading || !total} onClick={() => exportRows()} className="!h-8 !text-xs gap-2"><Download size={14} />Exportar vista</CrmButton>}</div>
                <div className="mb-3 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-crm-border bg-crm-surface p-1" aria-label="Prioridades comerciales">{priorities.map(item => <button key={item.id} type="button" aria-pressed={filters.attention === item.id} onClick={() => apply({ ...filters, attention: item.id })} className={'inline-flex min-h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium ' + (filters.attention === item.id ? 'bg-crm-red text-white' : 'text-crm-fg-muted hover:bg-crm-surface-raised')}>{item.label}<span>{priorityCounts?.[item.id] ?? '—'}</span></button>)}</div>
                <div className="flex flex-wrap items-center gap-2"><label className="relative min-w-40 flex-1"><Search size={14} className="absolute left-3 top-3 text-crm-fg-muted" /><input aria-label="Buscar clientes en la agenda" placeholder="Buscar nombre, teléfono o interés…" value={filters.search} onChange={event => apply({ ...filters, search: event.target.value })} className={field + ' w-full pl-9'} /></label><select aria-label="Orden de clientes" className={field + ' text-xs'} value={filters.sort} onChange={event => apply({ ...filters, sort: event.target.value })}><option value="priority">Prioridad</option><option value="recent">Más recientes</option><option value="name">Nombre</option></select><button type="button" aria-label="Lista compacta" aria-pressed={compact} onClick={() => setCompact(value => !value)} className={field + (compact ? ' text-crm-red' : '')}><ListFilter size={16} /></button></div>
            </section>}
            {view === 'tabla' && <><div className="mb-3 inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-crm-border bg-crm-surface p-1">{[['mis-clientes', 'Mis clientes'], ['sin-contactar', 'Sin contactar'], ['contactados', 'Contactados'], ['compraron', 'Compraron'], ['vendieron', 'Vendieron']].map(([id, label]) => <button key={id} type="button" aria-pressed={filters.segment === id} onClick={() => apply({ ...filters, attention: 'todos', segment: filters.segment === id ? '' : id, sort: id === 'contactados' ? 'lastContact_desc' : filters.sort })} className={'inline-flex min-h-8 items-center gap-2 rounded-lg px-3 text-xs font-medium ' + (filters.segment === id ? 'bg-crm-surface-raised text-crm-fg' : 'text-crm-fg-muted hover:text-crm-fg')}>{label}</button>)}</div><div className="mb-3 flex flex-wrap gap-2"><input aria-label="Búsqueda de clientes" placeholder="Nombre, teléfono, documento o interés…" className={field + ' min-w-40 flex-1'} value={filters.search} onChange={event => apply({ ...filters, search: event.target.value })} /><select aria-label="Vendedor de clientes" className={field + ' text-xs'} value={filters.assignedTo} onChange={event => apply({ ...filters, assignedTo: event.target.value })}><option value="">Vendedor: Todos</option>{users.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select></div><details className="mb-3 rounded-lg border border-crm-border p-3"><summary className="cursor-pointer text-xs text-crm-fg-muted">Más filtros de AutoSporting</summary><div className="mt-3"><ClientFilters filters={filters} setFilters={next => apply(typeof next === 'function' ? next(filters) : next)} onSearch={apply} users={users} /></div></details><div className="mb-3 flex flex-wrap gap-2"><label className="text-xs text-crm-fg-muted">Sexo <select className={field + ' ml-2 text-xs'} value={filters.gender} onChange={event => apply({ ...filters, gender: event.target.value })}><option value="">Todos</option><option value="mujer">Mujer</option><option value="hombre">Hombre</option></select></label><label className="text-xs text-crm-fg-muted">Categoría <select className={field + ' ml-2 text-xs'} value={filters.tier} onChange={event => apply({ ...filters, tier: event.target.value })}><option value="">Todas</option><option value="regular">Regular</option><option value="vip">VIP</option></select></label></div></>}
            {view === 'pipeline' && <label className="mb-4 block text-xs text-crm-fg-muted">Vendedor: <select className={field + ' ml-2 text-xs'} value={filters.assignedTo} onChange={event => apply({ ...filters, assignedTo: event.target.value })}><option value="">Todos</option>{users.map(person => <option key={person._id} value={person._id}>{person.name}</option>)}</select></label>}
            {view === 'seguimientos' && <div className="mb-4"><h2 className="m-0 text-base font-semibold">Seguimientos</h2><p className="text-sm text-crm-fg-muted">Próximos pasos agendados. Abrí la ficha para registrar qué ocurrió o completar el seguimiento.</p></div>}
            {view === 'tabla' && <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-crm-fg-muted"><span>Ingresos:</span>{[['Hoy', today], ['Ayer', dayBefore(1)], ['Últimos 7 días', dayBefore(6)], ['Este mes', today.slice(0, 7) + '-01']].map(([label, from]) => <button key={label} type="button" onClick={() => apply({ ...filters, createdFrom: from, createdTo: label === 'Ayer' ? from : today })} className={chip + ' border-crm-border hover:text-crm-fg'}>{label}</button>)}</div>}
            {(filters.createdFrom || filters.createdTo) && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-crm-border p-3 text-xs text-crm-fg-muted"><span>Período de ingreso: {filters.createdFrom || 'Inicio'} al {filters.createdTo || 'Hoy'}</span><button type="button" className="text-crm-red" onClick={() => apply({ ...filters, createdFrom: '', createdTo: '' })}>Quitar período</button></div>}
            {view === 'tabla' && filters.segment === 'contactados' && contactCounts && <div className="mb-4 grid grid-cols-3 gap-3">{[['Este mes',contactCounts.thisMonth],['Mes pasado',contactCounts.lastMonth],['Total',contactCounts.total]].map(([label,count]) => <div key={label} className="rounded-xl border border-crm-border bg-crm-surface px-4 py-3"><p className="m-0 text-[11px] text-crm-fg-muted">{label}</p><strong className="mt-1 block text-xl font-semibold text-crm-fg">{count}</strong></div>)}{contactCounts.withoutDate > 0 && <p className="col-span-3 mb-0 text-[11px] text-crm-fg-muted">{contactCounts.withoutDate} contactos confirmados sin fecha registrada; se muestran en el grupo Sin fecha.</p>}</div>}
            {error && <div role="alert" className="mb-4 rounded-lg border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-crm-red">{error}</div>}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-crm-fg-muted"><span>{total} clientes · Seleccioná un nombre para abrir la ficha{view === 'pipeline' ? ' · Las columnas indican visibles / total' : ''}</span>{canExport && view !== 'pipeline' && <button type="button" aria-pressed={selectionMode} onClick={() => { setSelectionMode(value => !value); setSelectedIds([]); }} className={`ml-auto flex h-8 items-center gap-1.5 rounded-lg border px-3 ${selectionMode ? 'border-crm-red text-crm-red' : 'border-crm-border text-crm-fg-muted'}`}>{selectionMode ? 'Cancelar selección' : 'Seleccionar'}</button>}<button type="button" aria-label="Actualizar clientes" disabled={loading} onClick={reload} className="flex h-8 items-center gap-1 rounded-lg border border-crm-border px-2"><RefreshCw size={12} />Actualizar</button></div>
            {loading ? <div role="status" className="py-16 text-center text-sm text-crm-fg-muted">Cargando clientes…</div> : view === 'pipeline' ? <ClientPipelineBoard clients={clients} onChangeStatus={move} readOnly={!canWrite} busyId={busyId} pipelineCounts={pipelineCounts} returnTo={returnTo} /> : view === 'tabla' ? <>
                <ClientDetailedTable clients={clients} selectedIds={selectedIds} onSelectionChange={canExport && selectionMode ? setSelectedIds : undefined} groupByMonth={filters.segment === 'contactados'} monthCounts={contactMonths} onResetContact={resetContact} canWrite={canWrite && !busyId} onOpen={client => { setSelectedClient(client); setFullClient(true); }} onEdit={openEdit} onMarkContact={markContacted} onDelete={client => { setDeletingClient(client); setDeleteError(''); }} sort={filters.sort} onSort={sort => apply({ ...filters, sort })} />
            </> : <ul className="m-0 list-none divide-y divide-crm-border overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-0">{clients.length ? clients.map(client => <li key={client._id} className="flex items-center">{canExport && selectionMode && <label className="flex min-h-10 items-center pl-4"><span className="sr-only">Seleccionar {client.fullName}</span><input type="checkbox" className="h-4 w-4 accent-crm-red" checked={selectedIds.includes(client._id)} onChange={event => setSelectedIds(previous => event.target.checked ? [...new Set([...previous,client._id])] : previous.filter(id => id !== client._id))} /></label>}<button type="button" onClick={() => { setSelectedClient(client); setFullClient(false); }} className={'grid min-w-0 flex-1 gap-3 border-0 bg-transparent px-4 text-left transition hover:bg-crm-surface-raised sm:grid-cols-[1.2fr_1fr] ' + (compact ? 'py-2' : 'py-4')}><div className="min-w-0"><strong className="block truncate text-sm text-crm-fg">{client.fullName}{client.segment === 'vip' && <span className="ml-2 text-[10px] text-amber-400">VIP</span>}</strong><span className="mt-1 block truncate text-xs text-crm-fg-muted">{client.description || client.vehicleOfInterest || [client.brand, client.model].filter(Boolean).join(' ') || 'Interés por definir'}</span>{!compact && <span className="mt-1 block text-xs text-crm-fg-subtle">{client.assignedTo?.name || 'Sin responsable'} · {client.reason === 'entro_puerta' ? 'Showroom' : 'Digital'}</span>}</div><div className="min-w-0"><span className="block text-xs font-medium text-crm-fg">{view === 'seguimientos' ? client.nextAction || 'Seguimiento agendado' : CLIENT_PIPELINE_STAGES.find(stage => stage.id === getClientPipelineStage(client))?.label || 'Etapa por revisar'}</span><span className="mt-1 block text-xs text-crm-fg-muted">{client.nextAction ? client.nextAction + ' · ' : ''}{formatClientNextAction(client)}</span>{client.doNotContact && <span className="mt-1 block text-xs text-crm-red">No contactar</span>}</div></button></li>) : <li className="px-5 py-14 text-center"><Search size={24} className="mx-auto mb-3 text-crm-fg-muted" /><h3 className="m-0 text-sm font-semibold">{view === 'seguimientos' ? 'No hay nada agendado' : 'Sin resultados'}</h3><p className="mb-0 text-sm text-crm-fg-muted">{view === 'seguimientos' ? 'Los próximos pasos con fecha aparecen acá hasta que los completes desde la ficha.' : 'Probá otra vista o ajustá la búsqueda y el responsable.'}</p></li>}</ul>}
            <CrmPagination currentPage={page} totalPages={totalPages} totalItems={total} onPageChange={setPage} limit={view === 'pipeline' ? 100 : 20} />
        </>}
        {canWrite && <><ClientFormModal isOpen={isModalOpen} client={editingClient} onClose={() => { setIsModalOpen(false); setEditingClient(null); }} onSave={saveClient} /><ClientImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={count => { toast.success('Se importaron ' + count + ' clientes.'); void reload(); }} /><ClientAvailabilityModal isOpen={availabilityOpen} onClose={() => setAvailabilityOpen(false)} /></>}
        {canExport && <ClientBulkActionBar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} onExport={() => exportRows()} />}
        <CrmModal isOpen={Boolean(deletingClient)} onClose={() => !busyId && setDeletingClient(null)} title="Enviar cliente a Papelera" maxWidth="max-w-md" footer={<div className="flex justify-end gap-2"><CrmButton variant="secondary" disabled={Boolean(busyId)} onClick={() => setDeletingClient(null)}>Cancelar</CrmButton><CrmButton variant="danger" disabled={Boolean(busyId)} onClick={removeClient}>{busyId ? 'Guardando…' : 'Enviar a Papelera'}</CrmButton></div>}><div className="space-y-3 p-5 text-sm"><p>La ficha se conserva en Papelera durante el plazo de recuperación de la agencia.</p>{deleteError && <p role="alert" className="text-crm-red">{deleteError}</p>}</div></CrmModal>
        <ClientQuickDrawer isOpen={Boolean(selectedClient && !fullClient)} clientId={selectedClient?._id} initialClient={selectedClient} onClose={() => setSelectedClient(null)} onUpdated={updated => { if (updated?._id) setSelectedClient(updated); void reload(); }} onOpenFull={() => setFullClient(true)} onEdit={openEdit} />
        <ClientDetailWorkspace isOpen={Boolean(selectedClient && fullClient)} clientId={selectedClient?._id} initialClient={selectedClient} onClose={() => setSelectedClient(null)} onUpdated={updated => { if (updated?._id) setSelectedClient(updated); void reload(); }} onEdit={openEdit} />
    </div>;
}
