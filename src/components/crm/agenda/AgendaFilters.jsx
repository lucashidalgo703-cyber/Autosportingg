import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

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
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar tareas, clientes o vehículos..." 
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="w-full bg-black/50 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <button type="submit" className="hidden">Buscar</button>
                </form>

                {/* Filters Row */}
                <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                    
                    <select 
                        value={filters.type || ''} 
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Cualquier tipo</option>
                        <option value="general">General</option>
                        <option value="venta">Venta</option>
                        <option value="cobranza">Cobranza</option>
                        <option value="documentacion">Documentación</option>
                        <option value="entrega">Entrega</option>
                        <option value="postventa">Postventa</option>
                        <option value="lead">Lead Legacy</option>
                    </select>

                    <select 
                        value={filters.dueDate || ''} 
                        onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Cualquier fecha</option>
                        <option value="vencidas">Vencidas</option>
                        <option value="hoy">Para hoy</option>
                        <option value="proximos_7">Próximos 7 días</option>
                    </select>

                    <select 
                        value={filters.priority || ''} 
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Prioridad</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                    </select>

                    <select 
                        value={filters.linkType || ''} 
                        onChange={(e) => handleFilterChange('linkType', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Todos los vínculos</option>
                        <option value="sin_vinculo">Sin vínculo</option>
                        <option value="con_venta">Con Venta</option>
                        <option value="con_cliente">Con Cliente</option>
                    </select>

                    {hasActiveFilters && (
                        <button 
                            onClick={clearFilters}
                            className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors shrink-0"
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
