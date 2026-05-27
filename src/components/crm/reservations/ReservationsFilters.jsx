import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';

export default function ReservationsFilters({ filters, setFilters }) {
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                
                {/* Text Search */}
                <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar cliente, auto, dominio, teléfono..."
                            className="w-full bg-black/30 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500/50 transition-colors"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap lg:flex-nowrap gap-4">
                    {/* Status Filter */}
                    <div className="flex items-center gap-2 bg-black/30 border border-neutral-800 rounded-xl px-3 py-2 w-full lg:w-auto">
                        <Filter size={16} className="text-neutral-500 shrink-0" />
                        <select
                            className="bg-transparent text-white text-sm focus:outline-none w-full appearance-none cursor-pointer"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="todas">Todos los estados</option>
                            <option value="activa">Activas</option>
                            <option value="convertida">Convertidas</option>
                            <option value="vencida">Vencidas</option>
                            <option value="cancelada">Canceladas</option>
                            <option value="devuelta">Devueltas</option>
                            <option value="retenida">Retenidas</option>
                        </select>
                    </div>

                    {/* Currency Filter */}
                    <div className="flex items-center gap-2 bg-black/30 border border-neutral-800 rounded-xl px-3 py-2 w-full lg:w-auto">
                        <span className="text-neutral-500 font-bold text-sm shrink-0">$</span>
                        <select
                            className="bg-transparent text-white text-sm focus:outline-none w-full appearance-none cursor-pointer"
                            value={filters.currency}
                            onChange={(e) => handleFilterChange('currency', e.target.value)}
                        >
                            <option value="todas">Todas las monedas</option>
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>

                    {/* Date/Expiry Filter */}
                    <div className="flex items-center gap-2 bg-black/30 border border-neutral-800 rounded-xl px-3 py-2 w-full lg:w-auto">
                        <Calendar size={16} className="text-neutral-500 shrink-0" />
                        <select
                            className="bg-transparent text-white text-sm focus:outline-none w-full appearance-none cursor-pointer"
                            value={filters.dateRange}
                            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                        >
                            <option value="todas">Todos los vencimientos</option>
                            <option value="vencidas">Ya Vencidas</option>
                            <option value="hoy">Vencen Hoy</option>
                            <option value="proximos_7">Próximos 7 días</option>
                        </select>
                    </div>
                </div>

            </div>
        </div>
    );
}
