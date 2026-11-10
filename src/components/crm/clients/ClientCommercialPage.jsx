"use client";
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Download, Upload, LayoutList, KanbanSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { useClientCommercial } from '../../../hooks/useClientCommercial';
import CrmPageHeader from '../ui/CrmPageHeader';
import CrmButton from '../ui/CrmButton';
import CrmPagination from '../ui/CrmPagination';
import ClientFilters from './ClientFilters';
import ClientsTable from './ClientsTable';
import ClientMobileCards from './ClientMobileCards';
import ClientPipelineBoard from './ClientPipelineBoard';
import ClientFormModal from './ClientFormModal';
import ClientImportModal from './ClientImportModal';
import ClientBulkActionBar from './ClientBulkActionBar';

const priorities = [{ id: 'hoy', label: 'Para atender hoy' }, { id: 'todos', label: 'Todos' }, { id: 'primera', label: 'Primera atención' }, { id: 'sinfecha', label: 'Sin próxima fecha' }];
const defaults = { search: '', segment: '', source: '', status: '', type: '', assignedTo: '', attention: 'hoy' };

export default function ClientCommercialPage() {
    const { user, token } = useAuth();
    const canWrite = hasPermission(user, PERMISSIONS.CLIENTES_WRITE);
    const canExport = hasPermission(user, PERMISSIONS.EXPORTS_READ);
    const { clients, loading, error, total, totalPages, summary, priorityCounts, pipelineCounts, fetchClients, createClient, updateClient, fetchClientsForExport } = useClientCommercial();
    const [filters, setFilters] = useState(defaults);
    const [view, setView] = useState('lista');
    const [page, setPage] = useState(1);
    const [ready, setReady] = useState(false);
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        const read = () => {
            const params = new URLSearchParams(window.location.search);
            setView(params.get('vista') === 'pipeline' ? 'pipeline' : 'lista');
            const attention = params.get('atencion');
            setFilters(previous => ({ ...previous, attention: priorities.some(item => item.id === attention) ? attention : 'hoy' }));
            setPage(Math.max(1, Number(params.get('pagina')) || 1));
            setReady(true);
        };
        read(); window.addEventListener('popstate', read);
        return () => window.removeEventListener('popstate', read);
    }, []);
    useEffect(() => {
        if (!ready) return;
        fetchClients({ ...filters, page, limit: 20 });
        const url = new URL(window.location.href);
        url.searchParams.set('vista', view); url.searchParams.set('atencion', filters.attention); url.searchParams.set('pagina', page);
        window.history.replaceState(null, '', url);
        setSelectedIds([]);
    }, [filters, page, view, ready, fetchClients]);
    useEffect(() => {
        setSelectedIds([]); setUsers([]); setIsModalOpen(false); setIsImportModalOpen(false);
        if (!token) return;
        const controller = new AbortController();
        fetch('/api/admin/users/active', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal })
            .then(response => response.ok ? response.json() : [])
            .then(data => { if (!controller.signal.aborted) setUsers(Array.isArray(data) ? data : []); })
            .catch(() => {});
        return () => controller.abort();
    }, [token]);

    const apply = next => { setFilters(next); setPage(1); };
    const reload = () => fetchClients({ ...filters, page, limit: 20 });
    const move = async (id, pipelineStage) => {
        if (!canWrite || busyId) return;
        setBusyId(id);
        try { await updateClient(id, { pipelineStage }); await reload(); }
        catch (error) { if (error.name !== 'AbortError') toast.error(error.message); }
        finally { setBusyId(null); }
    };
    const exportRows = async () => {
        if (!canExport || exporting) return;
        setExporting(true);
        try {
            const rows = selectedIds.length ? clients.filter(client => selectedIds.includes(client._id)) : await fetchClientsForExport(filters);
            if (!rows.length) { toast('No hay clientes para exportar.'); return; }
            const data = rows.map(client => ({ Nombre: client.fullName, Teléfono: client.phone, Email: client.email, 'DNI/CUIT': client.dniCuit, Localidad: client.locality, Tipo: client.type, Origen: client.source, Estado: client.status, Etapa: client.pipelineStage, Responsable: client.assignedTo?.name || '', 'Próxima acción': client.nextAction || '', 'Próxima fecha': String(client.nextActionDate || '').slice(0, 10) }));
            const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'Clientes');
            XLSX.writeFile(workbook, `autosporting_clientes_${Date.now()}.xlsx`); setSelectedIds([]);
        } catch (error) { if (error.name !== 'AbortError') toast.error(error.message); }
        finally { setExporting(false); }
    };

    return <div className="mx-auto w-full max-w-7xl min-w-0 p-4 pb-20 md:p-6">
        <CrmPageHeader compact title="Clientes" subtitle="Tu agenda comercial" actions={<>
            {canExport && <CrmButton size="sm" variant="secondary" disabled={exporting || loading} onClick={exportRows} className="!h-8 !text-xs gap-2"><Download size={14} />{exporting ? 'Exportando…' : 'Exportar XLSX'}</CrmButton>}
            {canWrite && <CrmButton size="sm" variant="secondary" onClick={() => setIsImportModalOpen(true)} className="!h-8 !text-xs gap-2"><Upload size={14} />Importar XLSX</CrmButton>}
            {canWrite && <CrmButton size="sm" onClick={() => setIsModalOpen(true)} className="!h-8 !text-xs gap-2"><Plus size={14} />Nuevo cliente</CrmButton>}
        </>} />
        <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Prioridad de atención">
            {priorities.map(item => <button key={item.id} type="button" aria-pressed={filters.attention === item.id} onClick={() => apply({ ...filters, attention: item.id })} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filters.attention === item.id ? 'bg-crm-red text-white' : 'bg-crm-surface text-crm-fg-muted hover:text-crm-fg'}`}>{item.label}{priorityCounts && <span className="ml-2">{priorityCounts[item.id]}</span>}</button>)}
        </div>
        <p className="mb-4 mt-0 text-xs text-crm-fg-muted">{filters.attention === 'hoy' ? 'Vencidos, de hoy y primera atención.' : filters.attention === 'primera' ? 'Clientes activos en Sin contactar.' : filters.attention === 'sinfecha' ? 'Clientes comerciales activos sin fecha del próximo paso.' : 'Todos los clientes del filtro.'}</p>
        <div className="mb-4 flex items-center gap-4 border-b border-crm-border" aria-label="Vistas de clientes">
            {[{ id: 'lista', label: 'Lista', Icon: LayoutList }, { id: 'pipeline', label: 'Pipeline', Icon: KanbanSquare }].map(({ id, label, Icon }) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)} className={`flex items-center gap-2 border-0 border-b-2 bg-transparent px-1 pb-3 text-sm font-semibold ${view === id ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted'}`}><Icon size={16} />{label}</button>)}
        </div>
        <ClientFilters filters={filters} setFilters={next => apply(typeof next === 'function' ? next(filters) : next)} onSearch={apply} users={users} />
        {summary && <details className="mb-4 rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs text-crm-fg-muted"><summary className="cursor-pointer">Resumen del filtro · {total} clientes</summary><p className="mb-0">Activos: {summary.activos} · Compradores: {summary.compradores} · Potenciales: {summary.potenciales}. Totales calculados sobre todas las páginas.</p></details>}
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-crm-fg-muted"><span>{total} clientes · Página {page} de {totalPages}{view === 'pipeline' ? ' · Las columnas indican visibles / total del filtro.' : ''}</span><button type="button" onClick={reload} className="rounded border border-crm-border bg-crm-surface px-2 py-1 text-crm-fg-muted hover:text-crm-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red">Actualizar</button></div>
        {error && <div role="alert" className="mb-4 rounded-lg border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">{error}</div>}
        {loading ? <div role="status" className="py-16 text-center text-sm text-crm-fg-muted">Cargando clientes…</div> : view === 'pipeline' ? <ClientPipelineBoard clients={clients} onChangeStatus={move} readOnly={!canWrite} busyId={busyId} pipelineCounts={pipelineCounts} /> : <>
            <div className="hidden md:block"><ClientsTable clients={clients} selectedIds={selectedIds} setSelectedIds={setSelectedIds} /></div>
            <div className="md:hidden">{canExport && <button onClick={() => setIsSelectionMode(value => !value)} className="mb-2 text-xs text-crm-fg-muted">{isSelectionMode ? 'Cancelar selección' : 'Seleccionar clientes'}</button>}<ClientMobileCards clients={clients} selectedIds={selectedIds} setSelectedIds={setSelectedIds} isSelectionMode={isSelectionMode} /></div>
        </>}
        <CrmPagination currentPage={page} totalPages={totalPages} totalItems={total} onPageChange={setPage} limit={20} />
        {canWrite && <><ClientFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={async data => { await createClient(data); reload(); }} /><ClientImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSuccess={count => { toast.success(`Se importaron ${count} clientes.`); reload(); }} /></>}
        {canExport && <ClientBulkActionBar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} onExport={exportRows} />}
    </div>;
}
