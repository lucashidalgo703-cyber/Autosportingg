"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Award, AlertTriangle, Eye, Edit, Phone, Mail, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { workshopFetch } from '../../../utils/workshopApiClient';
import CrmTable from '../ui/CrmTable';
import CrmBadge from '../ui/CrmBadge';
import CrmPagination from '../ui/CrmPagination';
import CrmButton from '../ui/CrmButton';
import WorkshopProviderModal from './WorkshopProviderModal';
import CrmModal from '../ui/CrmModal';
import CrmSelect from '../ui/CrmSelect';

export default function WorkshopProvidersView() {
    const { token, user } = useAuth();
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 50;

    // Filters
    const [filters, setFilters] = useState({
        search: '',
        specialty: ''
    });

    // Modals
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [editProvider, setEditProvider] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const fetchProviders = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('page', page);
            queryParams.append('limit', limit);
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.specialty) queryParams.append('specialty', filters.specialty);

            const res = await workshopFetch(`/api/admin/workshop/providers?${queryParams}`, { token });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('No autorizado o sesión expirada.');
                }
                throw new Error('Error al cargar proveedores de taller.');
            }
            const result = await res.json();
            setProviders(result.data || []);
            setTotalItems(result.total || 0);
            setTotalPages(result.pages || 1);
        } catch (err) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, page, filters.search, filters.specialty]);

    useEffect(() => {
        fetchProviders();
    }, [fetchProviders]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleRowClick = (provider) => {
        setSelectedProvider(provider);
    };

    const canAdmin = hasPermission(user, PERMISSIONS.TALLER_ADMIN);
    const canReadCosts = hasPermission(user, PERMISSIONS.TALLER_COSTS_READ) ||
                          hasPermission(user, PERMISSIONS.TALLER_ADMIN);

    const getSpecialtiesLabel = (specs) => {
        if (!specs || specs.length === 0) return '—';
        return specs.join(', ');
    };

    const columns = [
        {
            key: 'name',
            label: 'Nombre / Taller',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-crm-fg">{row.name}</span>
                    {row.businessName && <span className="text-[10px] text-crm-fg-muted">{row.businessName}</span>}
                </div>
            ),
            width: '25%'
        },
        {
            key: 'cuit',
            label: 'CUIT',
            render: (row) => <span className="text-xs font-mono text-crm-fg-muted">{row.cuit || '—'}</span>,
            width: '15%'
        },
        {
            key: 'specialties',
            label: 'Especialidades',
            render: (row) => <span className="text-xs text-crm-fg">{getSpecialtiesLabel(row.specialties)}</span>,
            width: '25%'
        },
        {
            key: 'contactsCount',
            label: 'Contactos',
            render: (row) => <span className="text-xs text-crm-fg-muted">{(row.contacts || []).length} registrados</span>,
            width: '12%'
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
                        <CrmButton
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedProvider(row)}
                            className="h-7 w-7 !p-0 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised"
                            title="Ver Detalle"
                        >
                            <Eye size={13} className="text-crm-fg" />
                        </CrmButton>
                        {canAdmin && (
                            <CrmButton
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditProvider(row)}
                                className="h-7 w-7 !p-0 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised"
                                title="Editar Proveedor"
                            >
                                <Edit size={13} className="text-crm-fg" />
                            </CrmButton>
                        )}
                    </div>
                );
            },
            align: 'right',
            width: '13%'
        }
    ];

    // Specialties list for filter
    const specialtiesList = [
        { value: '', label: 'Todas las Especialidades' },
        { value: 'chapa', label: 'Chapa' },
        { value: 'pintura', label: 'Pintura' },
        { value: 'mecanica', label: 'Mecánica' },
        { value: 'electricidad', label: 'Electricidad' },
        { value: 'gomería', label: 'Gomería' },
        { value: 'alineacion', label: 'Alineación' },
        { value: 'tapizado', label: 'Tapizado' },
        { value: 'lavado', label: 'Lavado' },
        { value: 'cerrajería', label: 'Cerrajería' },
        { value: 'vidrios', label: 'Vidrios' },
        { value: 'instrumentación', label: 'Instrumentación' },
        { value: 'otros', label: 'Otros' }
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between transition-colors">
                <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
                    {/* Search */}
                    <div className="relative min-w-[180px] flex-1">
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Buscar por nombre, CUIT..."
                            className="w-full h-8 pl-9 pr-3 bg-crm-bg text-crm-fg text-xs rounded-lg border border-crm-border focus:border-crm-red outline-none transition-colors"
                        />
                    </div>

                    {/* Specialty Filter */}
                    <div className="min-w-[150px]">
                        <CrmSelect
                            value={filters.specialty}
                            onChange={(e) => handleFilterChange('specialty', e.target.value)}
                            className="h-8 bg-crm-bg font-semibold text-xs py-1 text-crm-fg"
                        >
                            {specialtiesList.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </CrmSelect>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:justify-end">
                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={fetchProviders}
                        disabled={loading}
                        className="h-8 w-8 !p-0 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised"
                        title="Refrescar"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-crm-red' : 'text-crm-fg-muted'} />
                    </CrmButton>

                    {canAdmin && (
                        <CrmButton
                            variant="primary"
                            size="sm"
                            onClick={() => setIsCreateOpen(true)}
                            className="h-8 text-xs font-bold gap-1.5 bg-crm-red hover:bg-crm-red/90 text-white"
                        >
                            <Award size={14} />
                            <span>Nuevo Proveedor</span>
                        </CrmButton>
                    )}
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-crm-fg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-crm-red shrink-0" size={16} />
                        <span>{error}</span>
                    </div>
                    <CrmButton variant="secondary" size="sm" onClick={fetchProviders} className="h-8 py-1 text-xs">
                        Reintentar
                    </CrmButton>
                </div>
            )}

            {loading && providers.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                        <span className="text-sm text-crm-fg-muted font-bold">Cargando proveedores...</span>
                    </div>
                </div>
            ) : providers.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface p-12 text-center">
                    <Award className="mb-4 text-crm-fg-subtle" size={42} />
                    <h3 className="m-0 text-base font-bold text-crm-fg">Sin proveedores registrados</h3>
                    <p className="m-0 mt-2 max-w-md text-sm leading-6 text-crm-fg-muted">
                        {filters.search || filters.specialty
                            ? 'No se encontraron proveedores que coincidan con la búsqueda.'
                            : 'Aún no se ha registrado ningún proveedor de taller.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <CrmTable
                            columns={columns}
                            data={providers}
                            onRowClick={handleRowClick}
                            minWidth="min-w-[800px]"
                        />
                    </div>

                    {/* Mobile Card List */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {providers.map((p) => (
                            <div
                                key={p.id || p._id}
                                onClick={() => handleRowClick(p)}
                                className="bg-crm-surface border border-crm-border rounded-xl p-4 shadow-sm hover:border-crm-red/30 transition-all space-y-3 cursor-pointer"
                            >
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-crm-fg m-0">{p.name}</h4>
                                    <CrmBadge variant={p.active ? 'success' : 'danger'}>
                                        {p.active ? 'Activo' : 'Inactivo'}
                                    </CrmBadge>
                                </div>
                                <div className="text-xs text-crm-fg-muted">
                                    CUIT: {p.cuit || '—'}
                                </div>
                                <div className="text-xs text-crm-fg border-t border-crm-border/50 pt-2.5">
                                    Especialidades: {getSpecialtiesLabel(p.specialties)}
                                </div>
                            </div>
                        ))}
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

            {/* Provider Detail Modal */}
            {selectedProvider && (
                <CrmModal
                    isOpen={!!selectedProvider}
                    onClose={() => setSelectedProvider(null)}
                    title={
                        <div className="flex items-center gap-3">
                            <h2 className="m-0 text-lg font-bold text-crm-fg tracking-tight">{selectedProvider.name}</h2>
                            <CrmBadge variant={selectedProvider.active ? 'success' : 'danger'}>
                                {selectedProvider.active ? 'Activo' : 'Inactivo'}
                            </CrmBadge>
                        </div>
                    }
                    maxWidth="max-w-2xl"
                    footer={
                        <CrmButton variant="secondary" onClick={() => setSelectedProvider(null)} className="px-5 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised">
                            Cerrar
                        </CrmButton>
                    }
                >
                    <div className="px-6 py-6 space-y-5 custom-scrollbar max-h-[70vh] overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider block">Razón Social</span>
                                <span className="text-sm text-crm-fg">{selectedProvider.businessName || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider block">CUIT</span>
                                <span className="text-sm text-crm-fg font-mono">{selectedProvider.cuit || '—'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider block">Especialidades</span>
                                <span className="text-sm text-crm-fg">{getSpecialtiesLabel(selectedProvider.specialties)}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider block">Garantía por Defecto</span>
                                <span className="text-sm text-crm-fg">{selectedProvider.defaultWarranty ? `${selectedProvider.defaultWarranty} días` : 'No especifica'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider block">Monedas Aceptadas</span>
                                <span className="text-sm text-crm-fg">{(selectedProvider.acceptedCurrencies || []).join(', ') || 'No especifica'}</span>
                            </div>
                        </div>

                        {/* Contacts Section */}
                        <div className="border-t border-crm-border/40 pt-4 space-y-3">
                            <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider">Contactos del Taller</h3>
                            {selectedProvider.contacts && selectedProvider.contacts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {selectedProvider.contacts.map((contact, i) => (
                                        <div key={contact.id || i} className="bg-crm-bg border border-crm-border rounded-xl p-3.5 space-y-1.5">
                                            <span className="text-xs font-bold text-crm-fg block">{contact.name}</span>
                                            {contact.role && <span className="text-[10px] text-crm-fg-muted block uppercase tracking-wider">{contact.role}</span>}
                                            <div className="space-y-1 pt-1.5 border-t border-crm-border/30">
                                                {contact.phone && (
                                                    <span className="text-xs text-crm-fg-muted flex items-center gap-1.5">
                                                        <Phone size={12} /> {contact.phone}
                                                    </span>
                                                )}
                                                {contact.email && (
                                                    <span className="text-xs text-crm-fg-muted flex items-center gap-1.5">
                                                        <Mail size={12} /> {contact.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-crm-fg-muted block">No se registraron contactos.</span>
                            )}
                        </div>

                        {/* Payment conditions and notes - hide from sales team! */}
                        {canReadCosts && (
                            <div className="border-t border-crm-border/40 pt-4 space-y-4">
                                <h3 className="m-0 text-xs font-black uppercase text-crm-fg-muted tracking-wider">Información Confidencial (Operaciones / Finanzas)</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider block">Condiciones de Pago</span>
                                        <p className="text-xs text-crm-fg bg-crm-bg border border-crm-border rounded-lg p-3 m-0 whitespace-pre-wrap">
                                            {selectedProvider.paymentConditions || 'No registradas.'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider block">Notas Internas</span>
                                        <p className="text-xs text-crm-fg bg-crm-bg border border-crm-border rounded-lg p-3 m-0 whitespace-pre-wrap">
                                            {selectedProvider.notes || 'Sin notas internas.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CrmModal>
            )}

            {/* Create Provider Modal */}
            {isCreateOpen && (
                <WorkshopProviderModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSuccess={() => {
                        fetchProviders();
                        setIsCreateOpen(false);
                    }}
                />
            )}

            {/* Edit Provider Modal */}
            {editProvider && (
                <WorkshopProviderModal
                    isOpen={!!editProvider}
                    provider={editProvider}
                    onClose={() => setEditProvider(null)}
                    onSuccess={() => {
                        fetchProviders();
                        setEditProvider(null);
                    }}
                />
            )}
        </div>
    );
}
