import React, { useEffect, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

const statusTabs = [
    { id: '', label: 'Todos' },
    { id: 'nuevo', label: 'Nuevo' },
    { id: 'contactado', label: 'Contactado' },
    { id: 'interesado', label: 'Interesado' },
    { id: 'seguimiento', label: 'Seguimiento' },
    { id: 'reservado', label: 'Reservado' },
    { id: 'convertido', label: 'Convertido' },
    { id: 'perdido', label: 'Perdido' }
];

const priorityChips = [
    { id: '', icon: '•', label: 'Todas', idle: 'border-crm-fg-subtle/40 bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong' },
    { id: 'alta', icon: '!', label: 'Alta', idle: 'border-crm-red/40 bg-crm-surface text-red-300 hover:border-crm-red/70' },
    { id: 'media', icon: '↗', label: 'Media', idle: 'border-amber-500/40 bg-crm-surface text-amber-300 hover:border-amber-400/70' },
    { id: 'baja', icon: '○', label: 'Baja', idle: 'border-crm-fg-subtle/40 bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong' }
];

export default function LeadFilters({ filters, setFilters, onSearch }) {
    const [localSearch, setLocalSearch] = useState(filters.search || '');

    useEffect(() => {
        setLocalSearch(filters.search || '');
    }, [filters.search]);

    const applyFilters = (nextFilters) => {
        setFilters(nextFilters);
        onSearch(nextFilters);
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        applyFilters({ ...filters, search: localSearch });
    };

    const clearFilters = () => {
        setLocalSearch('');
        applyFilters({ search: '', crmStatus: '', priority: '', source: '', sourceDetail: '', unlinked: '' });
    };

    const hasActiveFilters = filters.search || filters.crmStatus || filters.priority || filters.source || filters.sourceDetail || filters.unlinked;

    return (
        <div className="mb-6 flex flex-col gap-5">
            <div className="-mx-1 flex items-center gap-6 overflow-x-auto border-b border-crm-border px-1 [-webkit-overflow-scrolling:touch]">
                {statusTabs.map(tab => {
                    const isActive = filters.crmStatus === tab.id;

                    return (
                        <button
                            key={tab.id || 'todos'}
                            type="button"
                            onClick={() => applyFilters({ ...filters, crmStatus: tab.id })}
                            className={`m-0 shrink-0 appearance-none border-0 border-b-2 bg-transparent px-1 pb-3 pt-1 text-sm font-semibold transition-colors ${
                                isActive
                                    ? 'border-crm-red text-crm-red'
                                    : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {priorityChips.map(chip => {
                    const isActive = filters.priority === chip.id;

                    return (
                        <button
                            key={chip.id || 'todas'}
                            type="button"
                            onClick={() => applyFilters({ ...filters, priority: chip.id })}
                            className={`m-0 inline-flex h-[26px] appearance-none items-center gap-1 rounded-full border px-3 text-xs font-semibold leading-none transition-colors ${
                                isActive ? 'border-crm-red bg-crm-red/15 text-red-300' : chip.idle
                            }`}
                        >
                            <span aria-hidden="true">{chip.icon}</span>
                            {chip.label}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => applyFilters({ ...filters, unlinked: filters.unlinked === 'true' ? '' : 'true' })}
                    className={`m-0 inline-flex h-[26px] appearance-none items-center rounded-full border px-3 text-xs font-semibold leading-none transition-colors ${
                        filters.unlinked === 'true'
                            ? 'border-crm-red bg-crm-red/15 text-red-300'
                            : 'border-amber-500/40 bg-crm-surface text-amber-300 hover:border-amber-400/70'
                    }`}
                >
                    Sin cliente
                </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_172px_210px_auto]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={17} />
                    <input
                        type="text"
                        placeholder="Buscar nombre, telefono, email, vehiculo..."
                        value={localSearch}
                        onChange={(event) => setLocalSearch(event.target.value)}
                        className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-muted focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                    />
                </div>

                <select
                    value={filters.source || ''}
                    onChange={(event) => applyFilters({ ...filters, source: event.target.value })}
                    className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                >
                    <option value="">Todos los origenes</option>
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
                    onChange={(event) => applyFilters({ ...filters, sourceDetail: event.target.value })}
                    className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                >
                    <option value="">Origen detallado</option>
                    <option value="contact_form">Contacto Web</option>
                    <option value="vehicle_detail_whatsapp">Ficha Auto</option>
                    <option value="financing_whatsapp">Financiacion</option>
                    <option value="manual_crm">Manual CRM</option>
                    <option value="unknown">Desconocido</option>
                </select>

                <div className="flex gap-2">
                    <CrmButton type="submit" className="flex-1 gap-2 lg:flex-none">
                        <Filter size={16} />
                        Filtrar
                    </CrmButton>
                    {hasActiveFilters && (
                        <CrmButton
                            type="button"
                            variant="secondary"
                            onClick={clearFilters}
                            className="px-3"
                            title="Limpiar filtros"
                        >
                            <X size={16} />
                        </CrmButton>
                    )}
                </div>
            </form>
        </div>
    );
}
