import React from 'react';
import { Search, Filter, RefreshCcw } from 'lucide-react';

export default function CollectionsFilters({ filters, setFilters }) {
    const handleClear = () => {
        setFilters({
            search: '',
            statusOperativo: 'todas',
            statusFinanciero: 'todos',
            vencimiento: 'todas',
            moneda: 'todas'
        });
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-6">
            <div className="flex flex-col gap-4">
                
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, teléfono, vehículo, patente o venta..."
                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    
                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-8 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.statusOperativo}
                            onChange={(e) => setFilters({ ...filters, statusOperativo: e.target.value })}
                        >
                            <option value="todas">Estado (Todos)</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="vencida">Vencida Visual</option>
                            <option value="pagada_manual">Pagada Manual</option>
                            <option value="anulada">Anulada</option>
                        </select>
                    </div>

                    <div className="relative min-w-[150px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.statusFinanciero}
                            onChange={(e) => setFilters({ ...filters, statusFinanciero: e.target.value })}
                        >
                            <option value="todos">Cobro (Todos)</option>
                            <option value="sin_cobro">Sin cobro</option>
                            <option value="parcial">Parcial</option>
                            <option value="cobrada">Cobrada</option>
                            <option value="sobrecobrada">Sobrecobrada</option>
                        </select>
                    </div>

                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.vencimiento}
                            onChange={(e) => setFilters({ ...filters, vencimiento: e.target.value })}
                        >
                            <option value="todas">Vencimiento (Todos)</option>
                            <option value="vencidas">Vencidas</option>
                            <option value="hoy">Vencen Hoy</option>
                            <option value="7dias">Próximos 7 días</option>
                            <option value="30dias">Próximos 30 días</option>
                        </select>
                    </div>

                    <div className="relative min-w-[120px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.moneda}
                            onChange={(e) => setFilters({ ...filters, moneda: e.target.value })}
                        >
                            <option value="todas">Moneda (Todas)</option>
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>

                    <button
                        onClick={handleClear}
                        className="w-10 h-[42px] shrink-0 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl flex items-center justify-center transition-colors border border-neutral-700"
                        title="Limpiar filtros"
                    >
                        <RefreshCcw size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
