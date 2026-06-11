import React from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function DocFilters({ filters, setFilters }) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            documentationStatus: 'todas',
            deliveryStatus: 'todas',
            saleStatus: 'todas'
        });
    };

    const hasActiveFilters = 
        filters.search || 
        filters.documentationStatus !== 'todas' || 
        filters.deliveryStatus !== 'todas' ||
        filters.saleStatus !== 'todas';

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
                        placeholder="Buscar por cliente, vehículo, patente o ID de venta..."
                        className="w-full bg-crm-bg border border-crm-border text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap lg:flex-nowrap gap-3">
                    <select
                        name="documentationStatus"
                        value={filters.documentationStatus}
                        onChange={handleChange}
                        className="bg-crm-bg border border-crm-border text-[#FAFAFA] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 min-w-[160px]"
                    >
                        <option value="todas">Doc: Todas</option>
                        <option value="pendiente">Doc: Pendiente</option>
                        <option value="parcial">Doc: Parcial</option>
                        <option value="completo">Doc: Completa</option>
                    </select>

                    <select
                        name="deliveryStatus"
                        value={filters.deliveryStatus}
                        onChange={handleChange}
                        className="bg-crm-bg border border-crm-border text-[#FAFAFA] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 min-w-[160px]"
                    >
                        <option value="todas">Entrega: Todas</option>
                        <option value="pendiente">Entrega: Pendiente</option>
                        <option value="preparando">Entrega: Preparando</option>
                        <option value="listo_para_entregar">Entrega: Lista</option>
                        <option value="entregado">Entrega: Entregada</option>
                    </select>

                    <select
                        name="saleStatus"
                        value={filters.saleStatus}
                        onChange={handleChange}
                        className="bg-crm-bg border border-crm-border text-[#FAFAFA] text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-500 min-w-[160px]"
                    >
                        <option value="todas">Estado Venta: Todas</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="pendiente_entrega">Pendiente Entrega</option>
                        <option value="entregada">Entregada</option>
                        <option value="cancelada">Cancelada</option>
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
