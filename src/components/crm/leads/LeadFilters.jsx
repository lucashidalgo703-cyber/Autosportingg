import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

export default function LeadFilters({ filters, setFilters, onSearch }) {
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
        const cleared = { search: '', crmStatus: '', priority: '', source: '', sourceDetail: '', unlinked: '' };
        setLocalSearch('');
        setFilters(cleared);
        onSearch(cleared);
    };

    const hasActiveFilters = filters.search || filters.crmStatus || filters.priority || filters.source || filters.sourceDetail || filters.unlinked;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, teléfono o email..." 
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="w-full bg-black/50 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <button type="submit" className="hidden">Buscar</button>
                </form>

                {/* Filters Row */}
                <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-black/30 border border-neutral-800 px-3 py-2.5 rounded-lg w-full md:w-auto">
                        <Filter size={16} className="text-neutral-500 shrink-0" />
                        <select 
                            value={filters.crmStatus || ''} 
                            onChange={(e) => handleFilterChange('crmStatus', e.target.value)}
                            className="bg-transparent text-sm text-neutral-300 focus:outline-none w-full cursor-pointer appearance-none"
                        >
                            <option value="">Todos los estados</option>
                            <option value="nuevo">Nuevo</option>
                            <option value="contactado">Contactado</option>
                            <option value="interesado">Interesado</option>
                            <option value="seguimiento">Seguimiento</option>
                            <option value="reservado">Reservado</option>
                            <option value="convertido">Convertido</option>
                            <option value="perdido">Perdido</option>
                        </select>
                    </div>

                    <select 
                        value={filters.priority || ''} 
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-red-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Cualquier prioridad</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                    </select>

                    <select 
                        value={filters.source || ''} 
                        onChange={(e) => handleFilterChange('source', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-red-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Cualquier origen</option>
                        <option value="web">Web</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="instagram">Instagram</option>
                        <option value="local">Local</option>
                        <option value="referido">Referido</option>
                        <option value="mercadolibre">MercadoLibre</option>
                        <option value="otro">Otro</option>
                    </select>

                    <select 
                        value={filters.sourceDetail || ''} 
                        onChange={(e) => handleFilterChange('sourceDetail', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-red-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Cualquier origen detallado</option>
                        <option value="contact_form">Contacto Web</option>
                        <option value="vehicle_detail_whatsapp">Ficha Auto</option>
                        <option value="financing_whatsapp">Financiación</option>
                        <option value="manual_crm">Manual CRM</option>
                        <option value="unknown">Desconocido</option>
                    </select>
                    
                    <select 
                        value={filters.unlinked || ''} 
                        onChange={(e) => handleFilterChange('unlinked', e.target.value)}
                        className="bg-black/30 border border-neutral-800 text-sm text-neutral-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-red-500 w-full md:w-auto cursor-pointer"
                    >
                        <option value="">Todos (Con o sin cliente)</option>
                        <option value="true">Sin cliente asociado</option>
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
