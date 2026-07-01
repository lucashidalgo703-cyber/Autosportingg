import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function AgendaFilters({ filters, setFilters, onSearch }) {
    const [localSearch, setLocalSearch] = useState(filters.search || '');

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const newFilters = { ...filters, search: localSearch };
        setFilters(newFilters);
        onSearch(newFilters);
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        onSearch(newFilters);
    };

    const clearFilters = () => {
        const cleared = { search: '', status: '', priority: '', type: '', dueDate: '', linkType: '' };
        setLocalSearch('');
        setFilters(cleared);
        onSearch(cleared);
    };

    const hasActiveFilters = filters.search || filters.status || filters.priority || filters.type || filters.dueDate || filters.linkType;

    return (
        <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
            <div className="flex flex-col gap-3 xl:flex-row">
                <form onSubmit={handleSearchSubmit} className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                    <input
                        type="text"
                        placeholder="Buscar tareas, clientes o vehiculos..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="h-10 w-full rounded-lg border border-crm-border bg-crm-surface py-2.5 pl-10 pr-4 text-sm text-crm-fg transition-colors focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                    />
                    <button type="submit" className="hidden">Buscar</button>
                </form>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:flex xl:flex-nowrap">
                    <select
                        value={filters.type || ''}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="h-10 min-w-0 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg transition-colors focus:border-crm-red focus:outline-none xl:w-40"
                    >
                        <option value="">Cualquier tipo</option>
                        <option value="general">General</option>
                        <option value="venta">Venta</option>
                        <option value="cobranza">Cobranza</option>
                        <option value="documentacion">Documentacion</option>
                        <option value="entrega">Entrega</option>
                        <option value="postventa">Postventa</option>
                        <option value="lead">Cotizacion</option>
                    </select>

                    <select
                        value={filters.dueDate || ''}
                        onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                        className="h-10 min-w-0 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg transition-colors focus:border-crm-red focus:outline-none xl:w-40"
                    >
                        <option value="">Cualquier fecha</option>
                        <option value="vencidas">Vencidas</option>
                        <option value="hoy">Para hoy</option>
                        <option value="proximos_7">Proximos 7 dias</option>
                    </select>

                    <select
                        value={filters.priority || ''}
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                        className="h-10 min-w-0 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg transition-colors focus:border-crm-red focus:outline-none xl:w-36"
                    >
                        <option value="">Prioridad</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                    </select>

                    <select
                        value={filters.linkType || ''}
                        onChange={(e) => handleFilterChange('linkType', e.target.value)}
                        className="h-10 min-w-0 rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg transition-colors focus:border-crm-red focus:outline-none xl:w-40"
                    >
                        <option value="">Todos los vinculos</option>
                        <option value="sin_vinculo">Sin vinculo</option>
                        <option value="con_venta">Con Venta</option>
                        <option value="con_cliente">Con Cliente</option>
                    </select>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="flex h-10 w-10 shrink-0 items-center justify-center justify-self-end rounded-lg border border-crm-red/20 bg-crm-red/10 text-red-300 transition-colors hover:bg-crm-red/20"
                            title="Limpiar filtros"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
