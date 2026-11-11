"use client";
import toast from 'react-hot-toast';
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, UserCheck, UserPlus, Users } from 'lucide-react';
import { useAdminClients } from '../../../hooks/useAdminClients';
import ClientFilters from '../../../components/crm/clients/ClientFilters';
import ClientsTable from '../../../components/crm/clients/ClientsTable';
import ClientMobileCards from '../../../components/crm/clients/ClientMobileCards';
import ClientFormModal from '../../../components/crm/clients/ClientFormModal';
import ClientBulkActionBar from '../../../components/crm/clients/ClientBulkActionBar';
import ClientImportModal from '../../../components/crm/clients/ClientImportModal';
import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmPagination from '../../../components/crm/ui/CrmPagination';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import ClientPipelineBoard from '../../../components/crm/clients/ClientPipelineBoard';
import { LayoutList, KanbanSquare, Download, Upload } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import * as XLSX from 'xlsx';

const summaryCards = [
    { key: 'total', label: 'Clientes cargados', icon: Users, tone: 'bg-blue-500/15 text-blue-300' },
    { key: 'activos', label: 'Activos', icon: UserCheck, tone: 'bg-emerald-500/15 text-emerald-300' },
    { key: 'compradores', label: 'Compradores', icon: UserPlus, tone: 'bg-purple-500/15 text-purple-300' },
    { key: 'potenciales', label: 'Potenciales', icon: Users, tone: 'bg-amber-500/15 text-amber-300' }
];

export default function AdminClientesPage() {
    const { user } = useAuth();
    const canSeeLeads = hasPermission(user, PERMISSIONS.LEADS_READ);
    const canWriteLeads = hasPermission(user, PERMISSIONS.LEADS_WRITE);

    const { clients, loading, error, total, totalPages, fetchClients, createClient, updateClient } = useAdminClients();

    const [view, setView] = useState('lista');
    const [filters, setFilters] = useState({ search: '', segment: '', source: '', status: '' });
    const [page, setPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    useEffect(() => {
        fetchClients({ ...filters, page, limit: 20 });
    }, [page, filters]); // Load on page or filter changes

    const handleSearch = (newFilters) => {
        setFilters(newFilters);
        setPage(1);
    };

    const handleCreateClient = async (clientData) => {
        await createClient(clientData);
        fetchClients(filters); // Reload list
    };

    const handleViewChange = (newView) => {
        setView(newView);
    };

    const handleClientStatusChange = async (clientId, newStage) => {
        try {
            await updateClient(clientId, { pipelineStage: newStage });
            fetchClients(filters);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error al cambiar de estado');
        }
    };

    const handleExportXLSX = () => {
        const clientsToExport = selectedIds.length > 0 
            ? clients.filter(c => selectedIds.includes(c._id))
            : clients;
            
        if (clientsToExport.length === 0) return;

        const dataToExport = clientsToExport.map(c => ({
            'Nombre Completo': c.fullName,
            'Teléfono': c.phone,
            'Email': c.email,
            'DNI/CUIT': c.dniCuit,
            'Localidad': c.locality,
            'Tipo': c.type,
            'Origen': c.source,
            'Estado': c.status,
            'Fecha Registro': new Date(c.createdAt).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes");
        XLSX.writeFile(wb, `autosporting_clientes_${new Date().getTime()}.xlsx`);
        setSelectedIds([]);
    };

    const summary = useMemo(() => {
        const source = clients || [];

        return {
            total: total || source.length,
            activos: source.filter(client => client.status === 'activo').length,
            compradores: source.filter(client => client.type === 'comprador' || client.type === 'ambos').length,
            potenciales: source.filter(client => client.type === 'potencial').length
        };
    }, [clients, total]);

    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-20 md:p-6">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Clientes</h1>
                            <span className="rounded border border-crm-success/20 bg-crm-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-success">
                                Base Real
                            </span>
                        </div>
                        <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                            Base de contactos y clientes comerciales de AutoSporting.
                        </p>
                    </div>

                    <div className="flex w-full md:w-auto gap-2">
                        {hasPermission(user, PERMISSIONS.EXPORTS_READ) && (
                            <CrmButton variant="secondary" size="sm" onClick={handleExportXLSX} className="gap-2" title="Exportar XLSX">
                                <Download size={16} />
                                <span>Exportar XLSX</span>
                            </CrmButton>
                        )}
                        {hasPermission(user, PERMISSIONS.CLIENTES_WRITE) && (
                            <CrmButton variant="secondary" size="sm" onClick={() => setIsImportModalOpen(true)} className="gap-2" title="Importar XLSX">
                                <Upload size={16} />
                                <span>Importar XLSX</span>
                            </CrmButton>
                        )}
                        <CrmButton variant="secondary" size="sm" onClick={() => { setIsSelectionMode(!isSelectionMode); if(isSelectionMode) setSelectedIds([]); }} className="gap-2 md:hidden" title={isSelectionMode ? 'Cancelar selección' : 'Seleccionar'}>
                            <LayoutList size={16} />
                            <span>{isSelectionMode ? 'Cancelar' : 'Seleccionar'}</span>
                        </CrmButton>
                        <CrmButton variant="primary" size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
                            <Plus size={16} />
                            Nuevo Cliente
                        </CrmButton>
                    </div>
                </div>

                <div className="flex gap-6 border-b border-crm-border">
                    <button
                        type="button"
                        onClick={() => handleViewChange('lista')}
                        className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-bold transition-colors ${view === 'lista' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:border-crm-border hover:text-crm-fg'}`}
                    >
                        <LayoutList size={16} /> Lista
                    </button>
                    {canSeeLeads && (
                        <button
                            type="button"
                            onClick={() => handleViewChange('pipeline')}
                            className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-bold transition-colors ${view === 'pipeline' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:border-crm-border hover:text-crm-fg'}`}
                        >
                            <KanbanSquare size={16} /> Pipeline
                        </button>
                    )}
                </div>

                {view === 'lista' ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div key={card.key} className="rounded-xl border border-crm-border bg-crm-surface p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">{card.label}</p>
                                        <p className="m-0 mt-3 text-2xl font-bold leading-none text-crm-fg">{summary[card.key]}</p>
                                    </div>
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                                        <Icon size={18} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-col">
                    <ClientFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />

                    {error && (
                        <div className="mb-6 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                            <div className="flex flex-col items-center gap-3">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                                <span className="text-sm text-crm-fg-muted">Cargando clientes...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <ClientsTable 
                                    clients={clients} 
                                    selectedIds={selectedIds} 
                                    setSelectedIds={setSelectedIds} 
                                />
                            </div>

                            <div className="md:hidden">
                                <ClientMobileCards 
                                    clients={clients} 
                                    selectedIds={selectedIds}
                                    setSelectedIds={setSelectedIds}
                                    isSelectionMode={isSelectionMode}
                                />
                            </div>

                            <CrmPagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={total}
                                onPageChange={setPage}
                                limit={20}
                            />
                        </>
                    )}
                </div>
                </>
                ) : (
                    <div className="flex flex-col gap-4">
                        {loading ? (
                            <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                                    <span className="text-sm text-crm-fg-muted">Cargando pipeline...</span>
                                </div>
                            </div>
                        ) : (
                            <ClientPipelineBoard 
                                clients={clients || []} 
                                onChangeStatus={handleClientStatusChange} 
                                readOnly={!hasPermission(user, PERMISSIONS.CLIENTES_WRITE)}
                            />
                        )}
                    </div>
                )}

                <ClientFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleCreateClient}
                />

                <ClientImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={(count) => {
                        toast.success(`Se importaron ${count} clientes correctamente.`);
                        fetchClients(filters);
                    }}
                />

                <ClientBulkActionBar
                    selectedIds={selectedIds}
                    onClearSelection={() => setSelectedIds([])}
                    onExport={handleExportXLSX}
                />
            </div>
        </div>
    );
}
