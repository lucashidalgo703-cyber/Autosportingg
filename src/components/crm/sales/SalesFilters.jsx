import React from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import { CrmIconButton } from '../ui/CrmButton';

export default function SalesFilters({ filters, setFilters }) {
    const statusTabs = [
        { label: 'Todas', value: 'todas' },
        { label: 'Borrador', value: 'borrador' },
        { label: 'Confirmadas', value: 'confirmada' },
        { label: 'Pend. entrega', value: 'pendiente_entrega' },
        { label: 'Entregadas', value: 'entregada' },
        { label: 'Canceladas', value: 'cancelada' }
    ];

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
        <div className="rounded-xl border border-crm-border bg-crm-surface p-3">
            <div className="mb-3 flex gap-5 overflow-x-auto border-b border-crm-border px-1 pb-0">
                {statusTabs.map((tab) => {
                    const active = filters.status === tab.value;
                    return (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setFilters({ ...filters, status: tab.value })}
                            className={`m-0 shrink-0 appearance-none border-0 border-b-2 bg-transparent px-0 pb-3 pt-1 text-sm font-bold transition-colors ${
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

            <div className="flex flex-col gap-3 xl:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={18} />
                    <CrmInput
                        type="text"
                        placeholder="Buscar venta, cliente, vehiculo, dominio..."
                        className="pl-10"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:flex-nowrap">
                    <div className="min-w-0 xl:w-36">
                        <CrmSelect
                            value={filters.currency}
                            onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                        >
                            <option value="todas">Moneda (Todas)</option>
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </CrmSelect>
                    </div>

                    <div className="min-w-0 xl:w-40">
                        <CrmSelect
                            value={filters.paymentMethod}
                            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                        >
                            <option value="todas">Metodo (Todos)</option>
                            <option value="contado">Contado</option>
                            <option value="financiado">Financiado</option>
                            <option value="mixto">Mixto</option>
                            <option value="otro">Otro</option>
                        </CrmSelect>
                    </div>

                    <div className="min-w-0 xl:w-36">
                        <CrmSelect
                            value={filters.documentationStatus}
                            onChange={(e) => setFilters({ ...filters, documentationStatus: e.target.value })}
                        >
                            <option value="todas">Doc (Todas)</option>
                            <option value="pendiente">Doc Pdte.</option>
                            <option value="parcial">Doc Parcial</option>
                            <option value="completo">Doc Completa</option>
                        </CrmSelect>
                    </div>

                    <div className="min-w-0 xl:w-40">
                        <CrmSelect
                            value={filters.deliveryStatus}
                            onChange={(e) => setFilters({ ...filters, deliveryStatus: e.target.value })}
                        >
                            <option value="todas">Entrega (Todas)</option>
                            <option value="pendiente">Ent. Pdte.</option>
                            <option value="preparando">Preparando</option>
                            <option value="listo_para_entregar">Lista para Ent.</option>
                            <option value="entregado">Entregada</option>
                        </CrmSelect>
                    </div>

                    <div className="min-w-0 xl:w-40">
                        <CrmSelect
                            value={filters.collectionStatus || 'todas'}
                            onChange={(e) => setFilters({ ...filters, collectionStatus: e.target.value })}
                        >
                            <option value="todas">Cobranza (Todas)</option>
                            <option value="sin_cobro">Sin cobro</option>
                            <option value="parcial">Parcial</option>
                            <option value="cobrada">Cobrada</option>
                            <option value="sobrecobrada">Sobrecobrada</option>
                        </CrmSelect>
                    </div>

                    <CrmIconButton
                        onClick={handleClear}
                        title="Limpiar filtros"
                        className="shrink-0 justify-self-end bg-crm-bg"
                    >
                        <RefreshCcw size={16} className="text-crm-fg-muted" />
                    </CrmIconButton>
                </div>
            </div>
        </div>
    );
}
