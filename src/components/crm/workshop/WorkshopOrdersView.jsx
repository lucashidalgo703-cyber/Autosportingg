"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, AlertTriangle, Search, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { workshopFetch } from '../../../utils/workshopApiClient';
import WorkshopToolbar from './WorkshopToolbar';
import CrmTable from '../ui/CrmTable';
import CrmBadge from '../ui/CrmBadge';
import CrmPagination from '../ui/CrmPagination';
import CrmButton from '../ui/CrmButton';
import WorkshopOrderDetail from './WorkshopOrderDetail';
import WorkshopOrderModal from './WorkshopOrderModal';
import WorkshopResumenView from './WorkshopResumenView';

export default function WorkshopOrdersView({ orders = [], loading = false, activeTab = 'ing_taller', onRefresh }) {
    const { token } = useAuth();
    const [providers, setProviders] = useState([]);
    const [page, setPage] = useState(1);
    const [viewType, setViewType] = useState('table');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [filters, setFilters] = useState({
        providerId: ''
    });

    const [selectedOrder, setSelectedOrder] = useState(null);
    const limit = 50;

    // Helpers to display names
    const getUserDisplayName = (account) => {
        if (!account) return 'S/R';
        return account.name || account.username || account.email || 'S/R';
    };

    const getStatusLabel = (status) => {
        const labels = {
            ingresado: 'Ingresado',
            cotizando: 'Cotizando',
            esperando_aprobacion: 'Esperando Aprob.',
            aprobado: 'Aprobado',
            enviado_proveedor: 'Env. Proveedor',
            en_trabajo: 'En Trabajo',
            terminado_proveedor: 'Term. Proveedor',
            recibido: 'Recibido',
            listo: 'Listo',
            entregado: 'Entregado',
            cancelado: 'Cancelado',
            en_garantia: 'En Garantía'
        };
        return labels[status] || status;
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'ingresado':
            case 'enviado_proveedor':
            case 'recibido':
                return 'info';
            case 'cotizando':
            case 'esperando_aprobacion':
            case 'en_garantia':
                return 'warning';
            case 'aprobado':
            case 'en_trabajo':
            case 'terminado_proveedor':
            case 'listo':
            case 'entregado':
                return 'success';
            case 'cancelado':
                return 'danger';
            default:
                return 'info';
        }
    };

    const fetchProviders = useCallback(async () => {
        if (!token) return;
        try {
            const res = await workshopFetch(`/api/admin/workshop/providers?limit=100`, { token });
            if (res.ok) {
                const result = await res.json();
                setProviders(result.data || []);
            }
        } catch (err) {
            // Suppressed
        }
    }, [token]);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleRowClick = (order) => {
        setSelectedOrder(order);
    };

    // Filter logic according to the active tab, search, and provider
    const getFilteredOrders = () => {
        return orders.filter(o => {
            // 1. Tab Filter
            let matchesTab = false;
            switch (activeTab) {
                case 'resumen':
                    matchesTab = true;
                    break;
                case 'ing_vendedor':
                    matchesTab = o.status === 'ingresado' && o.sellerId;
                    break;
                case 'ing_taller':
                    matchesTab = o.status === 'ingresado' && !o.sellerId;
                    break;
                case 'presupuestado':
                    matchesTab = ['cotizando', 'esperando_aprobacion'].includes(o.status);
                    break;
                case 'aprobado':
                    matchesTab = o.status === 'aprobado';
                    break;
                case 'en_proceso':
                    matchesTab = ['enviado_proveedor', 'en_trabajo', 'terminado_proveedor'].includes(o.status);
                    break;
                case 'agenda':
                    matchesTab = o.status === 'recibido';
                    break;
                case 'recontacto':
                    matchesTab = o.status === 'en_garantia';
                    break;
                case 'cerradas':
                    matchesTab = ['listo', 'entregado'].includes(o.status);
                    break;
                case 'historial':
                    matchesTab = o.status === 'cancelado';
                    break;
                default:
                    matchesTab = true;
            }

            if (!matchesTab) return false;

            // 2. Search Filter (Plate, client name/lastName, brand, model, orderNumber)
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const snap = o.vehicleSnapshot || {};
                const cli = o.clientId || {};
                const num = o.orderNumber ? String(o.orderNumber) : '';
                
                const matchesSearch = 
                    (snap.brand && snap.brand.toLowerCase().includes(term)) ||
                    (snap.model && snap.model.toLowerCase().includes(term)) ||
                    (snap.plate && snap.plate.toLowerCase().includes(term)) ||
                    (cli.name && cli.name.toLowerCase().includes(term)) ||
                    (cli.lastName && cli.lastName.toLowerCase().includes(term)) ||
                    num.includes(term);

                if (!matchesSearch) return false;
            }

            // 3. Provider Filter
            if (filters.providerId) {
                const provId = o.providerId?._id || o.providerId?.id || o.providerId;
                if (provId !== filters.providerId) return false;
            }

            return true;
        });
    };

    const filteredOrders = getFilteredOrders();
    const totalItems = filteredOrders.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);

    // Columns config
    const columns = [
        {
            key: 'orderNumber',
            label: 'Nº Orden',
            render: (row) => <span className="font-bold text-crm-fg text-[11px] bg-crm-border/40 px-2 py-0.5 rounded">#{row.orderNumber}</span>,
            width: '10%'
        },
        {
            key: 'vehicle',
            label: 'Vehículo',
            render: (row) => {
                const snap = row.vehicleSnapshot || {};
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-crm-fg text-xs">{snap.brand || 'S/D'} {snap.model || ''}</span>
                        {row.km !== undefined && <span className="text-[10px] text-crm-fg-muted">{Number(row.km).toLocaleString()} km</span>}
                    </div>
                );
            },
            width: '20%'
        },
        {
            key: 'plate',
            label: 'Patente',
            render: (row) => <span className="font-mono text-[10px] uppercase bg-crm-bg border border-crm-border px-2 py-0.5 rounded text-crm-fg font-bold tracking-wider">{row.vehicleSnapshot?.plate || 'S/D'}</span>,
            width: '12%'
        },
        {
            key: 'client',
            label: 'Cliente',
            render: (row) => {
                const cli = row.clientId || {};
                return (
                    <div className="flex flex-col">
                        <span className="text-crm-fg font-medium text-xs">{cli.name || ''} {cli.lastName || ''}</span>
                        {cli.phone && <span className="text-[10px] text-crm-fg-muted">{cli.phone}</span>}
                    </div>
                );
            },
            width: '20%'
        },
        {
            key: 'provider',
            label: 'Proveedor / Taller',
            render: (row) => {
                const prov = row.providerId || {};
                return <span className="text-crm-fg-muted text-xs">{prov.name || 'Sin asignar'}</span>;
            },
            width: '15%'
        },
        {
            key: 'responsible',
            label: 'Responsable',
            render: (row) => <span className="text-xs text-crm-fg-muted">{getUserDisplayName(row.assignedTo)}</span>,
            width: '12%'
        },
        {
            key: 'admissionDate',
            label: 'Ingreso',
            render: (row) => <span className="text-xs text-crm-fg-muted">{row.admissionDate ? new Date(row.admissionDate).toLocaleDateString() : '-'}</span>,
            width: '11%'
        },
        {
            key: 'status',
            label: 'Estado',
            render: (row) => (
                <CrmBadge variant={getStatusVariant(row.status)}>
                    {getStatusLabel(row.status)}
                </CrmBadge>
            ),
            align: 'center',
            width: '10%'
        }
    ];

    // Kanban Columns config (Dynamic according to active tab)
    const getBoardColumns = () => {
        switch (activeTab) {
            case 'ing_vendedor':
            case 'ing_taller':
                return [{ id: 'ingresado', title: 'Ingresado', statuses: ['ingresado'] }];
            case 'presupuestado':
                return [
                    { id: 'cotizando', title: 'Cotizando', statuses: ['cotizando'] },
                    { id: 'esperando_aprobacion', title: 'Esperando Aprobación', statuses: ['esperando_aprobacion'] }
                ];
            case 'aprobado':
                return [{ id: 'aprobado', title: 'Aprobado', statuses: ['aprobado'] }];
            case 'en_proceso':
                return [
                    { id: 'enviado_proveedor', title: 'Env. Proveedor', statuses: ['enviado_proveedor'] },
                    { id: 'en_trabajo', title: 'En Trabajo', statuses: ['en_trabajo'] },
                    { id: 'terminado_proveedor', title: 'Terminado Proveedor', statuses: ['terminado_proveedor'] }
                ];
            case 'agenda':
                return [{ id: 'recibido', title: 'Agenda / Recibido', statuses: ['recibido'] }];
            case 'recontacto':
                return [{ id: 'en_garantia', title: 'Recontacto / Garantía', statuses: ['en_garantia'] }];
            case 'cerradas':
                return [
                    { id: 'listo', title: 'Listo para Retiro', statuses: ['listo'] },
                    { id: 'entregado', title: 'Entregado', statuses: ['entregado'] }
                ];
            case 'historial':
                return [{ id: 'cancelado', title: 'Cancelado', statuses: ['cancelado'] }];
            default:
                return [
                    { id: 'ingresado', title: 'Ingresado', statuses: ['ingresado'] },
                    { id: 'cotizando', title: 'Cotizando / En Espera', statuses: ['cotizando', 'esperando_aprobacion'] },
                    { id: 'aprobado', title: 'Aprobado', statuses: ['aprobado'] },
                    { id: 'en_taller', title: 'En Taller', statuses: ['enviado_proveedor', 'en_trabajo', 'terminado_proveedor', 'recibido'] },
                    { id: 'listo', title: 'Listo', statuses: ['listo'] },
                    { id: 'entregado', title: 'Entregado / Garantía', statuses: ['entregado', 'en_garantia'] },
                    { id: 'cancelado', title: 'Cancelado', statuses: ['cancelado'] }
                ];
        }
    };

    const boardColumns = getBoardColumns();

    // Render Resumen Tab
    if (activeTab === 'resumen') {
        return (
            <div className="pt-2 animate-fadeIn">
                <WorkshopResumenView orders={orders} />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fadeIn">
            {/* Search and Toolbar Layout */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-crm-surface/30 border border-crm-border/60 rounded-xl p-3 shadow-xs">
                {/* Search input */}
                <div className="relative flex-1 max-w-md bg-crm-surface border border-crm-border rounded-xl p-1 shadow-xs flex items-center gap-2">
                    <Search className="text-crm-fg-muted pl-2 shrink-0" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Buscar por patente, cliente, marca..."
                        className="w-full bg-transparent border-0 outline-none text-xs text-crm-fg placeholder-crm-fg-muted py-1.5 pr-2"
                    />
                </div>

                <WorkshopToolbar
                    variant="clean"
                    activeViewType={viewType}
                    onViewTypeChange={setViewType}
                    onRefresh={onRefresh}
                    loading={loading}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    showViewToggle={true}
                    providers={providers}
                    showCreateButton={false} // Hidden as new button is in the parent page header
                />
            </div>

            {/* Main Content Area */}
            {loading && paginatedOrders.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                        <span className="text-sm text-crm-fg-muted font-bold">Cargando órdenes...</span>
                    </div>
                </div>
            ) : paginatedOrders.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface p-12 text-center">
                    <Wrench className="mb-4 text-crm-fg-subtle" size={42} />
                    <h3 className="m-0 text-base font-bold text-crm-fg">Sin órdenes de taller</h3>
                    <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                        {searchTerm || filters.providerId
                            ? 'No se encontraron órdenes que coincidan con la búsqueda o filtros.'
                            : 'Aún no se ha registrado ninguna orden de taller en este estado.'}
                    </p>
                </div>
            ) : viewType === 'table' ? (
                /* Table View */
                <div className="space-y-4">
                    <div className="hidden md:block">
                        <CrmTable
                            columns={columns}
                            data={paginatedOrders}
                            onRowClick={handleRowClick}
                            minWidth="min-w-[1100px]"
                        />
                    </div>

                    {/* Mobile Card List */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {paginatedOrders.map((o) => {
                            const snap = o.vehicleSnapshot || {};
                            const cli = o.clientId || {};
                            return (
                                <div
                                    key={o.id || o._id}
                                    onClick={() => handleRowClick(o)}
                                    className="bg-crm-surface border border-crm-border rounded-xl p-4 shadow-sm hover:border-crm-red/30 transition-all cursor-pointer space-y-3"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-crm-fg">#{o.orderNumber}</span>
                                        <CrmBadge variant={getStatusVariant(o.status)}>
                                            {getStatusLabel(o.status)}
                                        </CrmBadge>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-crm-fg m-0">{snap.brand || 'S/D'} {snap.model || ''}</h4>
                                        <span className="text-[11px] font-mono text-crm-fg-muted">Patente: {snap.plate || 'S/D'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-crm-fg-muted border-t border-crm-border/50 pt-2.5">
                                        <span>Cliente: {cli.name || ''} {cli.lastName || ''}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {o.admissionDate ? new Date(o.admissionDate).toLocaleDateString() : '-'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <CrmPagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={setPage}
                        limit={limit}
                    />
                </div>
            ) : (
                /* Kanban Board View */
                <div className="space-y-4">
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 touch-pan-x snap-x [-webkit-overflow-scrolling:touch]">
                        {boardColumns.map((col) => {
                            const colOrders = paginatedOrders.filter((o) => col.statuses.includes(o.status));
                            return (
                                <div
                                    key={col.id}
                                    className="flex flex-col w-72 shrink-0 bg-crm-surface/40 rounded-xl border border-crm-border p-3 snap-start max-h-[70vh]"
                                >
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-crm-border">
                                        <div className="flex flex-col">
                                            <h4 className="text-xs font-black uppercase tracking-wider text-crm-fg m-0">{col.title}</h4>
                                            <span className="text-[9px] text-crm-fg-muted font-medium mt-0.5">Filtradas en esta pestaña</span>
                                        </div>
                                        <span className="text-[10px] font-black bg-crm-border text-crm-fg-muted px-1.5 py-0.5 rounded-full">
                                            {colOrders.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                                        {colOrders.length === 0 ? (
                                            <div className="text-center py-6 text-xs text-crm-fg-subtle border border-dashed border-crm-border/50 rounded-lg bg-crm-bg/10">
                                                Sin registros
                                            </div>
                                        ) : (
                                            colOrders.map((o) => {
                                                const snap = o.vehicleSnapshot || {};
                                                return (
                                                    <div
                                                        key={o.id || o._id}
                                                        onClick={() => handleRowClick(o)}
                                                        className="bg-crm-surface hover:bg-crm-surface-raised border border-crm-border rounded-lg p-3 shadow-xs hover:border-crm-red/30 transition-all cursor-pointer space-y-2"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-crm-fg bg-crm-bg border border-crm-border px-1 py-0.25 rounded">#{o.orderNumber}</span>
                                                            <CrmBadge variant={getStatusVariant(o.status)} className="!text-[9px] !px-1.5">
                                                                {getStatusLabel(o.status)}
                                                            </CrmBadge>
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-bold text-crm-fg m-0 line-clamp-1">{snap.brand || 'S/D'} {snap.model || ''}</h5>
                                                            <span className="text-[10px] font-mono text-crm-fg-muted">Patente: {snap.plate || 'S/D'}</span>
                                                        </div>
                                                        <div className="text-[10px] text-crm-fg-muted border-t border-crm-border/30 pt-1.5 flex items-center justify-between">
                                                            <span className="truncate max-w-[120px]">Cli: {o.clientId?.name || ''}</span>
                                                            <span className="text-crm-fg-subtle">{o.admissionDate ? new Date(o.admissionDate).toLocaleDateString() : ''}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <CrmPagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        onPageChange={setPage}
                        limit={limit}
                    />
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <WorkshopOrderDetail
                    isOpen={!!selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    orderId={selectedOrder.id || selectedOrder._id}
                    onRefresh={onRefresh}
                />
            )}
        </div>
    );
}
