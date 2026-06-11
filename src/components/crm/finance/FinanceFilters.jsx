import React from 'react';
import { Search, Filter, RefreshCcw } from 'lucide-react';

export default function FinanceFilters({ filters, setFilters }) {
    const handleClear = () => {
        setFilters({
            search: '',
            type: 'todas',
            currency: 'todas',
            paymentMethod: 'todas',
            status: 'todos',
            linkedTo: 'todas',
            startDate: '',
            endDate: ''
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
                        placeholder="Buscar por concepto, categoría o notas..."
                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    
                    <div className="relative min-w-[120px] flex-1 md:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-8 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        >
                            <option value="todas">Tipo (Todos)</option>
                            <option value="ingreso">Ingresos</option>
                            <option value="egreso">Egresos</option>
                        </select>
                    </div>

                    <div className="relative min-w-[120px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.currency}
                            onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                        >
                            <option value="todas">Moneda (Todas)</option>
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>

                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.paymentMethod}
                            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                        >
                            <option value="todas">Método (Todos)</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="cheque">Cheque</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div className="relative min-w-[120px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.linkedTo || 'todas'}
                            onChange={(e) => setFilters({ ...filters, linkedTo: e.target.value })}
                        >
                            <option value="todas">Vínculo (Todos)</option>
                            <option value="unlinked">Sin vínculo</option>
                            <option value="sale">Vinculados a Venta</option>
                            <option value="reservation">Vinculados a Reserva</option>
                            <option value="client">Vinculados a Cliente</option>
                            <option value="vehicle">Vinculados a Vehículo</option>
                            <option value="installment">Vinculados a Cuota</option>
                        </select>
                    </div>

                    <div className="relative min-w-[120px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="todos">Estado (Todos)</option>
                            <option value="activo">Activos</option>
                            <option value="anulado">Anulados</option>
                        </select>
                    </div>

                    <div className="flex-1 md:flex-none flex items-center gap-2">
                        <input
                            type="date"
                            className="bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-3 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                        <span className="text-neutral-500">-</span>
                        <input
                            type="date"
                            className="bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-3 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleClear}
                        className="w-10 h-[42px] shrink-0 bg-crm-surface-raised hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-xl flex items-center justify-center transition-colors border border-neutral-700"
                        title="Limpiar filtros"
                    >
                        <RefreshCcw size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
