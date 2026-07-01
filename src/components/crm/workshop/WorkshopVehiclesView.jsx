"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { CarFront, AlertTriangle, ArrowLeftRight, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { workshopFetch } from '../../../utils/workshopApiClient';
import WorkshopToolbar from './WorkshopToolbar';
import CrmTable from '../ui/CrmTable';
import CrmBadge from '../ui/CrmBadge';
import CrmPagination from '../ui/CrmPagination';
import CrmButton from '../ui/CrmButton';
import CustomerVehicleModal from './CustomerVehicleModal';
import VehicleTransferModal from './VehicleTransferModal';

export default function WorkshopVehiclesView() {
    const { token, user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 50;

    // Filters (Independent query parameters)
    const [filters, setFilters] = useState({
        plate: '',
        brand: '',
        model: ''
    });

    // Modals
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [transferVehicle, setTransferVehicle] = useState(null);

    const fetchVehicles = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            queryParams.append('limit', limit);

            if (filters.plate) queryParams.append('plate', filters.plate.trim());
            if (filters.brand) queryParams.append('brand', filters.brand.trim());
            if (filters.model) queryParams.append('model', filters.model.trim());

            const res = await workshopFetch(`/api/admin/workshop/vehicles?${queryParams}`, { token });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('No autorizado o sesión expirada.');
                }
                throw new Error('Error al cargar vehículos de clientes.');
            }
            const result = await res.json();
            setVehicles(result.data || []);
            setTotalItems(result.total || 0);
            setTotalPages(result.pages || 1);
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, page, filters.plate, filters.brand, filters.model]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const canWrite = hasPermission(user, PERMISSIONS.TALLER_WRITE);

    const columns = [
        {
            key: 'plate',
            label: 'Patente',
            render: (row) => <span className="font-mono text-xs font-bold uppercase bg-crm-bg border border-crm-border px-2 py-1 rounded text-crm-fg">{row.plate}</span>,
            width: '12%'
        },
        {
            key: 'brandModel',
            label: 'Marca y Modelo',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-crm-fg">{row.brand} {row.model}</span>
                    <span className="text-[10px] text-crm-fg-muted">{row.version || '—'} ({row.year})</span>
                </div>
            ),
            width: '25%'
        },
        {
            key: 'client',
            label: 'Propietario Actual',
            render: (row) => {
                const owner = row.clientId || {};
                return (
                    <div className="flex flex-col">
                        <span className="text-crm-fg font-medium">{owner.name || ''} {owner.lastName || 'S/D'}</span>
                        {owner.dni && <span className="text-[10px] text-crm-fg-muted">DNI: {owner.dni}</span>}
                    </div>
                );
            },
            width: '25%'
        },
        {
            key: 'details',
            label: 'Color / Kilometraje',
            render: (row) => (
                <div className="flex flex-col text-xs text-crm-fg-muted">
                    <span>Color: <span className="text-crm-fg">{row.color || '—'}</span></span>
                    {row.km !== undefined && <span>Km: <span className="text-crm-fg font-medium">{Number(row.km).toLocaleString()}</span></span>}
                </div>
            ),
            width: '18%'
        },
        {
            key: 'active',
            label: 'Estado',
            render: (row) => (
                <CrmBadge variant={row.active ? 'success' : 'danger'}>
                    {row.active ? 'Activo' : 'Inactivo'}
                </CrmBadge>
            ),
            align: 'center',
            width: '10%'
        },
        {
            key: 'actions',
            label: 'Acciones',
            render: (row) => {
                return (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {canWrite && (
                            <>
                                <CrmButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setSelectedVehicle(row)}
                                    className="h-7 w-7 !p-0 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised"
                                    title="Editar Vehículo"
                                >
                                    <Edit size={13} className="text-crm-fg" />
                                </CrmButton>
                                <CrmButton
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setTransferVehicle(row)}
                                    className="h-7 px-2 border-crm-border bg-crm-bg text-xs font-bold gap-1 text-crm-fg hover:bg-crm-surface-raised"
                                    title="Transferir Propietario"
                                >
                                    <ArrowLeftRight size={13} />
                                    <span className="hidden lg:inline">Transferir</span>
                                </CrmButton>
                            </>
                        )}
                    </div>
                );
            },
            align: 'right',
            width: '10%'
        }
    ];

    const hasActiveFilters = filters.plate || filters.brand || filters.model;

    return (
        <div className="space-y-4">
            <WorkshopToolbar
                onRefresh={fetchVehicles}
                loading={loading}
                filters={filters}
                onFilterChange={handleFilterChange}
                createActionLabel="Nuevo Vehículo"
                onCreateAction={() => setIsCreateOpen(true)}
                requiredPermission={PERMISSIONS.TALLER_WRITE}
            />

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-crm-fg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-crm-red shrink-0" size={16} />
                        <span>{error}</span>
                    </div>
                    <CrmButton variant="secondary" size="sm" onClick={fetchVehicles} className="h-8 py-1 text-xs">
                        Reintentar
                    </CrmButton>
                </div>
            )}

            {loading && vehicles.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                        <span className="text-sm text-crm-fg-muted font-bold">Cargando vehículos...</span>
                    </div>
                </div>
            ) : vehicles.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface p-12 text-center">
                    <CarFront className="mb-4 text-crm-fg-subtle" size={42} />
                    <h3 className="m-0 text-base font-bold text-crm-fg">Sin vehículos registrados</h3>
                    <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                        {hasActiveFilters
                            ? 'No se encontraron vehículos que coincidan con la búsqueda.'
                            : 'Aún no se ha registrado ningún vehículo de cliente.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <CrmTable
                            columns={columns}
                            data={vehicles}
                            minWidth="min-w-[900px]"
                        />
                    </div>

                    {/* Mobile Card List */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {vehicles.map((v) => {
                            const owner = v.clientId || {};
                            return (
                                <div
                                    key={v.id || v._id}
                                    className="bg-crm-surface border border-crm-border rounded-xl p-4 shadow-sm hover:border-crm-red/30 transition-all space-y-3"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-xs font-bold uppercase bg-crm-bg border border-crm-border px-2 py-0.5 rounded text-crm-fg">{v.plate}</span>
                                        <CrmBadge variant={v.active ? 'success' : 'danger'}>
                                            {v.active ? 'Activo' : 'Inactivo'}
                                        </CrmBadge>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-crm-fg m-0">{v.brand} {v.model}</h4>
                                        <span className="text-[11px] text-crm-fg-muted">Propietario: {owner.name || ''} {owner.lastName || 'S/D'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-crm-fg-muted border-t border-crm-border/50 pt-2.5">
                                        <span>Color: {v.color || '—'}</span>
                                        {canWrite && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => setSelectedVehicle(v)}
                                                    className="p-1 rounded bg-crm-surface-raised border border-crm-border text-crm-fg hover:text-crm-red transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit size={12} />
                                                </button>
                                                <button
                                                    onClick={() => setTransferVehicle(v)}
                                                    className="p-1 rounded bg-crm-surface-raised border border-crm-border text-crm-fg hover:text-crm-red transition-colors"
                                                    title="Transferir"
                                                >
                                                    <ArrowLeftRight size={12} />
                                                </button>
                                            </div>
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

            {/* Create/Edit Vehicle Modal */}
            {(isCreateOpen || selectedVehicle) && (
                <CustomerVehicleModal
                    isOpen={isCreateOpen || !!selectedVehicle}
                    vehicle={selectedVehicle}
                    onClose={() => {
                        setIsCreateOpen(false);
                        setSelectedVehicle(null);
                    }}
                    onSuccess={() => {
                        fetchVehicles();
                        setIsCreateOpen(false);
                        setSelectedVehicle(null);
                    }}
                />
            )}

            {/* Transfer Owner Modal */}
            {transferVehicle && (
                <VehicleTransferModal
                    isOpen={!!transferVehicle}
                    vehicle={transferVehicle}
                    onClose={() => setTransferVehicle(null)}
                    onSuccess={() => {
                        fetchVehicles();
                        setTransferVehicle(null);
                    }}
                />
            )}
        </div>
    );
}
