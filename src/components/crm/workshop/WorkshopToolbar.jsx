"use client";

import React from 'react';
import { Plus, RefreshCw, LayoutList, KanbanSquare, Search } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';

export default function WorkshopToolbar({
    activeViewType, // 'table' or 'board' (only for orders)
    onViewTypeChange,
    onRefresh,
    loading,

    // Filters
    filters,
    onFilterChange,

    // Config / Context
    showViewToggle = false,
    providers = [],

    // Action overrides
    onCreateAction,
    createActionLabel = 'Nuevo',
    requiredPermission = PERMISSIONS.TALLER_WRITE,
    variant = 'default'
}) {
    const { user } = useAuth();
    const canCreate = hasPermission(user, requiredPermission);

    const containerClass = variant === 'clean'
        ? "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-1"
        : "flex flex-col gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 shadow-sm md:flex-row md:items-center md:justify-between transition-colors";

    return (
        <div className={containerClass}>
            {/* Left side: View Mode and Filters */}
            <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* View Switcher (Segmented Control) */}
                {showViewToggle && (
                    <div className="flex rounded-lg border border-crm-border bg-crm-bg p-0.5 shadow-inner">
                        <button
                            type="button"
                            onClick={() => onViewTypeChange?.('table')}
                            className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                                activeViewType === 'table'
                                    ? 'bg-crm-surface text-crm-fg shadow-sm border border-crm-border/30'
                                    : 'text-crm-fg-muted hover:text-crm-fg'
                             }`}
                        >
                            <LayoutList size={14} />
                            <span>Tabla</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewTypeChange?.('board')}
                            className={`flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                                activeViewType === 'board'
                                    ? 'bg-crm-surface text-crm-fg shadow-sm border border-crm-border/30'
                                    : 'text-crm-fg-muted hover:text-crm-fg'
                             }`}
                        >
                            <KanbanSquare size={14} />
                            <span>Tablero</span>
                        </button>
                    </div>
                )}

                {/* Filters rendering depending on state */}
                <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
                    {onFilterChange && filters && (
                        <>
                            {/* Search Filter (only if defined) */}
                            {filters.search !== undefined && (
                                <div className="relative min-w-[180px] flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={14} />
                                    <CrmInput
                                        value={filters.search || ''}
                                        onChange={(e) => onFilterChange('search', e.target.value)}
                                        placeholder="Buscar..."
                                        className="h-8 pl-9 pr-3 bg-crm-bg text-xs text-crm-fg"
                                    />
                                </div>
                            )}

                            {/* Plate Filter (only if defined) */}
                            {filters.plate !== undefined && (
                                <div className="relative min-w-[100px] flex-1">
                                    <CrmInput
                                        value={filters.plate || ''}
                                        onChange={(e) => onFilterChange('plate', e.target.value)}
                                        placeholder="Patente..."
                                        className="h-8 px-3 bg-crm-bg text-xs text-crm-fg"
                                    />
                                </div>
                            )}

                            {/* Brand Filter (only if defined) */}
                            {filters.brand !== undefined && (
                                <div className="relative min-w-[110px] flex-1">
                                    <CrmInput
                                        value={filters.brand || ''}
                                        onChange={(e) => onFilterChange('brand', e.target.value)}
                                        placeholder="Marca..."
                                        className="h-8 px-3 bg-crm-bg text-xs text-crm-fg"
                                    />
                                </div>
                            )}

                            {/* Model Filter (only if defined) */}
                            {filters.model !== undefined && (
                                <div className="relative min-w-[110px] flex-1">
                                    <CrmInput
                                        value={filters.model || ''}
                                        onChange={(e) => onFilterChange('model', e.target.value)}
                                        placeholder="Modelo..."
                                        className="h-8 px-3 bg-crm-bg text-xs text-crm-fg"
                                    />
                                </div>
                            )}

                            {/* Status Filter (only for orders) */}
                            {filters.status !== undefined && (
                                <div className="min-w-[120px]">
                                    <CrmSelect
                                        value={filters.status || ''}
                                        onChange={(e) => onFilterChange('status', e.target.value)}
                                        className="h-8 bg-crm-bg font-semibold text-xs py-1 text-crm-fg"
                                    >
                                        <option value="">Todos los Estados</option>
                                        <option value="ingresado">Ingresado</option>
                                        <option value="cotizando">Cotizando</option>
                                        <option value="esperando_aprobacion">Esperando Aprobación</option>
                                        <option value="aprobado">Aprobado</option>
                                        <option value="enviado_proveedor">Enviado Proveedor</option>
                                        <option value="en_trabajo">En Trabajo</option>
                                        <option value="terminado_proveedor">Terminado Proveedor</option>
                                        <option value="recibido">Recibido</option>
                                        <option value="listo">Listo</option>
                                        <option value="entregado">Entregado</option>
                                        <option value="cancelado">Cancelado</option>
                                        <option value="en_garantia">En Garantía</option>
                                    </CrmSelect>
                                </div>
                            )}

                            {/* Provider Filter (only for orders) */}
                            {filters.providerId !== undefined && (
                                <div className="min-w-[140px]">
                                    <CrmSelect
                                        value={filters.providerId || ''}
                                        onChange={(e) => onFilterChange('providerId', e.target.value)}
                                        className="h-8 bg-crm-bg font-semibold text-xs py-1 text-crm-fg"
                                    >
                                        <option value="">Todos los Proveedores</option>
                                        {providers.map((p) => (
                                            <option key={p.id || p._id} value={p.id || p._id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </CrmSelect>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Right side: Actions & Refresh */}
            <div className="flex items-center gap-2 md:justify-end">
                {onRefresh && (
                    <CrmButton
                        variant="secondary"
                        size="sm"
                        onClick={onRefresh}
                        disabled={loading}
                        className="h-8 w-8 !p-0 border-crm-border bg-crm-bg text-crm-fg hover:bg-crm-surface-raised"
                        title="Refrescar Datos"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin text-crm-red' : 'text-crm-fg-muted'} />
                    </CrmButton>
                )}

                {canCreate && onCreateAction && (
                    <CrmButton
                        variant="primary"
                        size="sm"
                        onClick={onCreateAction}
                        className="h-8 text-xs font-bold gap-1.5 bg-crm-red hover:bg-crm-red/90 text-white"
                    >
                        <Plus size={14} />
                        <span>{createActionLabel}</span>
                    </CrmButton>
                )}
            </div>
        </div>
    );
}
