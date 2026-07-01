import React from 'react';
import { Filter, Search, X } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

const segmentTabs = [
    { id: '', label: 'Todos' },
    { id: 'mis-clientes', label: 'Mis Clientes' },
    { id: 'sin-contactar', label: 'Sin contactar' },
    { id: 'contactados', label: 'Contactados' },
    { id: 'compraron', label: 'Compraron' },
    { id: 'vendieron', label: 'Vendieron' }
];

const statusChips = [
    {
        id: '',
        icon: '•',
        label: 'Todos',
        idle: 'border-crm-fg-subtle/40 bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong'
    },
    {
        id: 'activo',
        icon: '✓',
        label: 'Activo',
        idle: 'border-emerald-500/40 bg-crm-surface text-emerald-300 hover:border-emerald-400/70'
    },
    {
        id: 'inactivo',
        icon: '○',
        label: 'Inactivo',
        idle: 'border-crm-fg-subtle/40 bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong'
    },
    {
        id: 'bloqueado',
        icon: '!',
        label: 'Bloqueado',
        idle: 'border-crm-red/40 bg-crm-surface text-red-300 hover:border-crm-red/70'
    }
];

export default function ClientFilters({ filters, setFilters, onSearch }) {
    const applyFilters = (nextFilters) => {
        setFilters(nextFilters);
        onSearch(nextFilters);
    };

    const handleReset = () => {
        applyFilters({ search: '', segment: '', source: '', status: '' });
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            onSearch(filters);
        }
    };

    const hasActiveFilters = filters.search || filters.segment || filters.source || filters.status;

    return (
        <div className="mb-6 flex flex-col gap-5">
            <div className="-mx-1 flex items-center gap-6 overflow-x-auto border-b border-crm-border px-1 [-webkit-overflow-scrolling:touch]">
                {segmentTabs.map(tab => {
                    const isActive = filters.segment === tab.id;

                    return (
                        <button
                            key={tab.id || 'todos'}
                            type="button"
                            onClick={() => applyFilters({ ...filters, segment: tab.id })}
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
                {statusChips.map(chip => {
                    const isActive = filters.status === chip.id;

                    return (
                        <button
                            key={chip.id || 'todos'}
                            type="button"
                            onClick={() => applyFilters({ ...filters, status: chip.id })}
                            className={`m-0 inline-flex h-[26px] appearance-none items-center gap-1 rounded-full border px-3 text-xs font-semibold leading-none transition-colors ${
                                isActive ? 'border-crm-red bg-crm-red/15 text-red-300' : chip.idle
                            }`}
                        >
                            <span aria-hidden="true">{chip.icon}</span>
                            {chip.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={17} />
                    <input
                        type="text"
                        name="search"
                        value={filters.search}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Buscar nombre, email, telefono, localidad, DNI..."
                        className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-muted focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                    />
                </div>

                <select
                    name="source"
                    value={filters.source}
                    onChange={(event) => applyFilters({ ...filters, source: event.target.value })}
                    className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                >
                    <option value="">Todos los origenes</option>
                    <option value="web">Web</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="instagram">Instagram</option>
                    <option value="referido">Referido</option>
                    <option value="local">Local</option>
                    <option value="mercadolibre">MercadoLibre</option>
                    <option value="otro">Otro</option>
                </select>

                <div className="flex gap-2">
                    <CrmButton
                        type="button"
                        onClick={() => onSearch(filters)}
                        className="flex-1 gap-2 lg:flex-none"
                    >
                        <Filter size={16} />
                        Filtrar
                    </CrmButton>
                    {hasActiveFilters && (
                        <CrmButton
                            type="button"
                            variant="secondary"
                            onClick={handleReset}
                            className="px-3"
                            title="Limpiar filtros"
                        >
                            <X size={16} />
                        </CrmButton>
                    )}
                </div>
            </div>
        </div>
    );
}
