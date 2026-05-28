import React from 'react';
import { Search, Filter, RefreshCcw } from 'lucide-react';

export default function SalesFilters({ filters, setFilters }) {
    const handleClear = () => {
        setFilters({
            search: '',
            status: 'todas',
            currency: 'todas',
            paymentMethod: 'todas',
            documentationStatus: 'todas',
            deliveryStatus: 'todas',
            collectionStatus: 'todas'
        });
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
                
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, lead, teléfono, vehículo, dominio..."
                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap md:flex-nowrap gap-3">
                    {/* Status */}
                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 pl-9 pr-8 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="todas">Todos los Estados</option>
                            <option value="borrador">Borrador</option>
                            <option value="confirmada">Confirmada</option>
                            <option value="pendiente_entrega">Pdte. Entrega</option>
                            <option value="entregada">Entregada</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>

                    {/* Currency */}
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

                    {/* Payment Method */}
                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.paymentMethod}
                            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                        >
                            <option value="todas">Método (Todos)</option>
                            <option value="contado">Contado</option>
                            <option value="financiado">Financiado</option>
                            <option value="mixto">Mixto</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    {/* Doc Status */}
                    <div className="relative min-w-[130px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.documentationStatus}
                            onChange={(e) => setFilters({ ...filters, documentationStatus: e.target.value })}
                        >
                            <option value="todas">Doc (Todas)</option>
                            <option value="pendiente">Doc Pdte.</option>
                            <option value="parcial">Doc Parcial</option>
                            <option value="completo">Doc Completa</option>
                        </select>
                    </div>

                    {/* Delivery Status */}
                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.deliveryStatus}
                            onChange={(e) => setFilters({ ...filters, deliveryStatus: e.target.value })}
                        >
                            <option value="todas">Entrega (Todas)</option>
                            <option value="pendiente">Ent. Pdte.</option>
                            <option value="preparando">Preparando</option>
                            <option value="listo_para_entregar">Lista para Ent.</option>
                            <option value="entregado">Entregada</option>
                        </select>
                    </div>

                    {/* Collection Status */}
                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                        <select
                            className="w-full bg-black/40 border border-neutral-800 rounded-xl py-2.5 px-4 text-sm text-neutral-300 focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer"
                            value={filters.collectionStatus || 'todas'}
                            onChange={(e) => setFilters({ ...filters, collectionStatus: e.target.value })}
                        >
                            <option value="todas">Cobranza (Todas)</option>
                            <option value="sin_cobro">Sin cobro</option>
                            <option value="parcial">Parcial</option>
                            <option value="cobrada">Cobrada</option>
                            <option value="sobrecobrada">Sobrecobrada</option>
                        </select>
                    </div>

                    {/* Clear Button */}
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
