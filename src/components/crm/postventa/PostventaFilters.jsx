import React from 'react';
import { Search, X } from 'lucide-react';

export default function PostventaFilters({ filters, setFilters }) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            postSaleStatus: 'todos',
            resena: 'todas',
            obsequio: 'todos',
            satisfaccion: 'todas',
            tarea: 'todas'
        });
    };

    const hasActiveFilters = 
        filters.search || 
        filters.postSaleStatus !== 'todos' || 
        filters.resena !== 'todas' ||
        filters.obsequio !== 'todos' ||
        filters.satisfaccion !== 'todas' ||
        filters.tarea !== 'todas';

    return (
        <div className="bg-[#161619] border border-crm-border rounded-2xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-crm-fg-muted" />
                    </div>
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleChange}
                        placeholder="Buscar cliente, vehículo, patente..."
                        className="w-full bg-crm-bg border border-crm-border text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-pink-500 transition-colors text-sm"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap lg:flex-nowrap gap-3">
                    <select
                        name="postSaleStatus"
                        value={filters.postSaleStatus}
                        onChange={handleChange}
                        className="bg-crm-bg border border-crm-border text-[#FAFAFA] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-500 min-w-[140px]"
                    >
                        <option value="todos">Estado: Todos</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="contactado">Contactado</option>
                        <option value="conforme">Conforme</option>
                        <option value="incidencia">Incidencia</option>
                        <option value="cerrado">Cerrado</option>
                    </select>

                    <select
                        name="resena"
                        value={filters.resena}
                        onChange={handleChange}
                        className="bg-crm-bg border border-crm-border text-[#FAFAFA] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-500 min-w-[140px]"
                    >
                        <option value="todas">Reseña: Todas</option>
                        <option value="no solicitada">No Solicitada</option>
                        <option value="solicitada">Solicitada</option>
                        <option value="recibida">Recibida</option>
                    </select>

                    <select
                        name="satisfaccion"
                        value={filters.satisfaccion}
                        onChange={handleChange}
                        className="bg-crm-bg border border-crm-border text-[#FAFAFA] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-500 min-w-[140px]"
                    >
                        <option value="todas">Rating: Todos</option>
                        <option value="sin calificar">Sin Calificar</option>
                        <option value="1 a 3">1 a 3 Estrellas</option>
                        <option value="4 a 5">4 a 5 Estrellas</option>
                    </select>

                    <select
                        name="tarea"
                        value={filters.tarea}
                        onChange={handleChange}
                        className="bg-crm-bg border border-crm-border text-[#FAFAFA] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-pink-500 min-w-[140px]"
                    >
                        <option value="todas">Tareas: Todas</option>
                        <option value="con tarea pendiente">Con Pendiente</option>
                        <option value="sin tarea">Sin Tarea</option>
                        <option value="tarea vencida">Vencida</option>
                    </select>

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-2 px-4 py-2.5 bg-crm-red/10 hover:bg-crm-red/20 text-crm-red rounded-xl transition-colors text-sm font-medium border border-red-500/20 whitespace-nowrap"
                        >
                            <X size={16} />
                            Limpiar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
