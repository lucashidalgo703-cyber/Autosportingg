"use client";
import { Search } from 'lucide-react';

const tabs = [
    { id: 'stock', label: 'Stock general' },
    { id: 'consignaciones', label: 'Consignaciones' },
    { id: 'mandatos', label: 'Mandatos' }
];

const statusChips = [
    {
        id: 'disponible',
        icon: '✅',
        label: 'Disponible',
        active: 'border-crm-red bg-crm-red/15 text-red-300',
        idle: 'border-emerald-500/40 bg-crm-surface text-emerald-300 hover:border-emerald-400/70'
    },
    {
        id: 'senado',
        icon: '⚠️',
        label: 'Señado',
        active: 'border-crm-red bg-crm-red/15 text-red-300',
        idle: 'border-amber-500/40 bg-crm-surface text-amber-300 hover:border-amber-400/70'
    },
    {
        id: 'vendido_sin_confirmar',
        icon: '⏳',
        label: 'Vendido sin confirmar',
        active: 'border-crm-red bg-crm-red/15 text-red-300',
        idle: 'border-orange-500/40 bg-crm-surface text-orange-300 hover:border-orange-400/70'
    },
    {
        id: 'vendido',
        icon: '⛔',
        label: 'Vendido',
        active: 'border-crm-red bg-crm-red/15 text-red-300',
        idle: 'border-crm-fg-subtle/40 bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong'
    }
];

export default function StockFilters({
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    stockTab,
    setStockTab,
    brandFilter,
    setBrandFilter,
    brandOptions = [],
    counts = {}
}) {
    return (
        <div className="flex flex-col gap-5">
            <div className="-mx-1 flex items-center gap-6 border-b border-crm-border px-1">
                {tabs.map(tab => {
                    const isActive = stockTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStockTab(tab.id)}
                            className={`m-0 appearance-none border-0 border-b-2 bg-transparent px-1 pb-3 pt-1 text-sm font-semibold transition-colors ${
                                isActive
                                    ? 'border-crm-red text-crm-red'
                                    : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                            }`}
                        >
                            {tab.label}
                            {tab.id === 'stock' && counts.total > 0 && (
                                <span className="ml-2 text-xs text-current">{counts.total}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {statusChips.map(chip => {
                    const isActive = filterStatus === chip.id;

                    return (
                        <button
                            key={chip.id}
                            type="button"
                            onClick={() => setFilterStatus(chip.id)}
                            className={`m-0 inline-flex h-[26px] appearance-none items-center gap-1 rounded-full border px-3 text-xs font-semibold leading-none transition-colors ${
                                isActive ? chip.active : chip.idle
                            }`}
                        >
                            <span aria-hidden="true">{chip.icon}</span>
                            {chip.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_162px]">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={17} />
                    <input
                        type="text"
                        placeholder="Buscar marca, modelo, patente, año, propietario, teléfono, consig., ubicación, notas..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-muted focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                    />
                </div>

                <select
                    value={brandFilter}
                    onChange={(event) => setBrandFilter(event.target.value)}
                    className="m-0 h-[38px] w-full appearance-none rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none transition-colors focus:border-crm-red focus:ring-2 focus:ring-crm-red/20"
                >
                    <option value="todas">Todas las marcas</option>
                    {brandOptions.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
