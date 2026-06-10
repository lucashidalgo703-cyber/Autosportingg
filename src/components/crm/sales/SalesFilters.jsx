import React from 'react';
import { CalendarDays, RefreshCcw, Search } from 'lucide-react';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import { CrmIconButton } from '../ui/CrmButton';

export default function SalesFilters({ filters, setFilters, onRefresh, loading }) {
    const statusTabs = [
        { label: 'Todas', value: 'todas' },
        { label: 'Borradores', value: 'borrador' },
        { label: 'Activas', value: 'confirmada' },
        { label: 'Reservas', value: 'reservas' },
        { label: 'Cerradas', value: 'entregada' },
        { label: 'Caídas', value: 'caida' },
        { label: 'Canceladas', value: 'cancelada' }
    ];

    const handleClear = () => {
        setFilters({
            search: '',
            seller: '',
            status: 'todas',
            currency: 'todas',
            paymentMethod: 'todas',
            documentationStatus: 'todas',
            deliveryStatus: 'todas',
            collectionStatus: 'todas',
            dateFrom: '',
            dateTo: '',
            month: '',
            tradeInOnly: false
        });
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
                            onClick={() => setFilters({ ...filters, status: tab.value })}
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

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1.35fr)_minmax(190px,0.7fr)_200px_146px_146px_200px]">
                <div className="relative self-end">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={17} />
                    <CrmInput
                        type="text"
                        placeholder="Comprador, vehículo, DNI, teléfono..."
                        className="h-11 bg-crm-surface pl-10 text-sm w-full"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="relative self-end">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={17} />
                    <CrmInput
                        type="text"
                        placeholder="Buscar vendedor..."
                        className="h-11 bg-crm-surface pl-10 text-sm w-full"
                        value={filters.seller}
                        onChange={(e) => setFilters({ ...filters, seller: e.target.value })}
                    />
                </div>

                <CrmSelect
                    className="h-11 bg-crm-surface text-sm font-semibold self-end"
                    value={filters.paymentMethod}
                    onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                >
                    <option value="todas">Todos los métodos</option>
                    <option value="contado">Contado</option>
                    <option value="financiado">Financiado</option>
                    <option value="mixto">Mixto</option>
                    <option value="otro">Otro</option>
                </CrmSelect>

                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Desde</label>
                    <CrmInput
                        type="date"
                        className="h-11 bg-crm-surface text-sm"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Hasta</label>
                    <CrmInput
                        type="date"
                        className="h-11 bg-crm-surface text-sm"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                </div>

                <label className="flex h-11 items-center gap-2 self-end rounded-lg border border-crm-border bg-crm-surface px-3 text-sm font-semibold text-crm-fg">
                    <input
                        type="checkbox"
                        checked={filters.tradeInOnly}
                        onChange={(e) => setFilters({ ...filters, tradeInOnly: e.target.checked })}
                        className="h-4 w-4 rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red"
                    />
                    Solo con permuta
                </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-3 text-sm font-semibold text-crm-fg-muted">
                    Mes:
                    <span className="relative block">
                        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={15} />
                        <CrmInput
                            type="month"
                            className="h-10 w-[170px] bg-crm-surface pr-9 text-sm"
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        />
                    </span>
                </label>

                <div className="flex gap-2 sm:ml-auto">
                    <CrmIconButton
                        onClick={handleClear}
                        title="Limpiar filtros"
                        className="shrink-0 bg-crm-surface"
                    >
                        <RefreshCcw size={16} className="text-crm-fg-muted" />
                    </CrmIconButton>
                    {onRefresh && (
                        <CrmIconButton
                            onClick={onRefresh}
                            title="Actualizar ventas"
                            disabled={loading}
                            className="shrink-0 bg-crm-surface"
                        >
                            <RefreshCcw size={16} className={loading ? 'animate-spin text-crm-red' : 'text-crm-fg-muted'} />
                        </CrmIconButton>
                    )}
                </div>
            </div>
        </div>
    );
}
