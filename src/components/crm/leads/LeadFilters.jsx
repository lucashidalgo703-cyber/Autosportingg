import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { CrmIconButton } from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
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
        <div className="bg-crm-surface border border-crm-border rounded-xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                    <CrmInput 
                        type="text" 
                        placeholder="Buscar por nombre, teléfono o email..." 
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="pl-10"
                    />
                    <button type="submit" className="hidden">Buscar</button>
                </form>

                {/* Filters Row */}
                <div className="flex flex-wrap md:flex-nowrap gap-3 items-center">
                    <div className="flex-1 md:flex-none">
                        <CrmSelect 
                            value={filters.crmStatus || ''} 
                            onChange={(e) => handleFilterChange('crmStatus', e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            <option value="nuevo">Nuevo</option>
                            <option value="contactado">Contactado</option>
                            <option value="interesado">Interesado</option>
                            <option value="seguimiento">Seguimiento</option>
                            <option value="reservado">Reservado</option>
                            <option value="convertido">Convertido</option>
                            <option value="perdido">Perdido</option>
                        </CrmSelect>
                    </div>

                    <div className="flex-1 md:flex-none">
                        <CrmSelect 
                            value={filters.priority || ''} 
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                        >
                            <option value="">Cualquier prioridad</option>
                            <option value="alta">Alta</option>
                            <option value="media">Media</option>
                            <option value="baja">Baja</option>
                        </CrmSelect>
                    </div>

                    <div className="flex-1 md:flex-none">
                        <CrmSelect 
                            value={filters.source || ''} 
                            onChange={(e) => handleFilterChange('source', e.target.value)}
                        >
                            <option value="">Cualquier origen</option>
                            <option value="web">Web</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="instagram">Instagram</option>
                            <option value="local">Local</option>
                            <option value="referido">Referido</option>
                            <option value="mercadolibre">MercadoLibre</option>
                            <option value="otro">Otro</option>
                        </CrmSelect>
                    </div>

                    <div className="flex-1 md:flex-none">
                        <CrmSelect 
                            value={filters.sourceDetail || ''} 
                            onChange={(e) => handleFilterChange('sourceDetail', e.target.value)}
                        >
                            <option value="">Cualquier origen detallado</option>
                            <option value="contact_form">Contacto Web</option>
                            <option value="vehicle_detail_whatsapp">Ficha Auto</option>
                            <option value="financing_whatsapp">Financiación</option>
                            <option value="manual_crm">Manual CRM</option>
                            <option value="unknown">Desconocido</option>
                        </CrmSelect>
                    </div>
                    
                    <div className="flex-1 md:flex-none">
                        <CrmSelect 
                            value={filters.unlinked || ''} 
                            onChange={(e) => handleFilterChange('unlinked', e.target.value)}
                        >
                            <option value="">Todos (Con o sin cliente)</option>
                            <option value="true">Sin cliente asociado</option>
                        </CrmSelect>
                    </div>

                    {hasActiveFilters && (
                        <CrmIconButton 
                            onClick={clearFilters}
                            title="Limpiar filtros"
                            className="hover:border-[#EF3329]/50"
                        >
                            <X size={18} className="text-[#EF3329]" />
                        </CrmIconButton>
                    )}
                </div>
            </div>
        </div>
    );
}
