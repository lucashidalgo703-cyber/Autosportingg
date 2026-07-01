import React from 'react';
import { CalendarDays, Search } from 'lucide-react';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';

export default function ReservationsFilters({ filters, setFilters }) {
    const statusTabs = [
        { label: 'Todas', value: 'todas' },
        { label: 'Activas', value: 'activa' },
        { label: 'Convertidas', value: 'convertida' },
        { label: 'Vencidas', value: 'vencida' },
        { label: 'Canceladas', value: 'cancelada' },
        { label: 'Devueltas', value: 'devuelta' },
        { label: 'Retenidas', value: 'retenida' }
    ];

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-8 overflow-x-auto border-b border-crm-border">
                {statusTabs.map((tab) => {
                    const active = filters.status === tab.value;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => handleFilterChange('status', tab.value)}
                            className={`m-0 shrink-0 appearance-none border-0 border-b-2 bg-transparent px-0 pb-3 pt-2 text-sm font-bold transition-colors ${
                                active
                                    ? 'border-crm-red text-crm-red'
                                    : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_210px_150px_150px]">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={17} />
                    <CrmInput
                        type="text"
                        placeholder="Cliente, vehiculo, dominio, telefono..."
                        className="h-11 bg-crm-surface pl-10 text-sm"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>

                <CrmSelect
                    value={filters.currency}
                    onChange={(e) => handleFilterChange('currency', e.target.value)}
                    className="h-11 bg-crm-surface text-sm font-semibold"
                >
                    <option value="todas">Todas las monedas</option>
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                </CrmSelect>

                <CrmSelect
                    value={filters.dateRange}
                    onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                    className="h-11 bg-crm-surface text-sm font-semibold"
                >
                    <option value="todas">Todos los vencimientos</option>
                    <option value="vencidas">Ya vencidas</option>
                    <option value="hoy">Vencen hoy</option>
                    <option value="proximos_7">Proximos 7 dias</option>
                </CrmSelect>

                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Desde</label>
                    <span className="relative block">
                        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={15} />
                        <CrmInput
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            className="h-11 bg-crm-surface pr-9 text-sm"
                        />
                    </span>
                </div>

                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Hasta</label>
                    <span className="relative block">
                        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={15} />
                        <CrmInput
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            className="h-11 bg-crm-surface pr-9 text-sm"
                        />
                    </span>
                </div>
            </div>
        </div>
    );
}
