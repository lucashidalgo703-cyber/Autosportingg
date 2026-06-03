import React from 'react';
import { Search, Filter, RefreshCcw } from 'lucide-react';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';
import { CrmIconButton } from '../ui/CrmButton';

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
        <div className="bg-crm-surface border border-crm-border rounded-2xl p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
                
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={18} />
                    <CrmInput
                        type="text"
                        placeholder="Buscar por cliente, lead, teléfono, vehículo, dominio..."
                        className="pl-10"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap md:flex-nowrap gap-3">
                    {/* Status */}
                    <div className="flex-1 md:flex-none">
                        <CrmSelect
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="todas">Todos los Estados</option>
                            <option value="borrador">Borrador</option>
                            <option value="confirmada">Confirmada</option>
                            <option value="pendiente_entrega">Pdte. Entrega</option>
                            <option value="entregada">Entregada</option>
                            <option value="cancelada">Cancelada</option>
                        </CrmSelect>
                    </div>

                    {/* Currency */}
                    <div className="flex-1 md:flex-none">
                        <CrmSelect
                            value={filters.currency}
                            onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                        >
                            <option value="todas">Moneda (Todas)</option>
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </CrmSelect>
                    </div>

                    {/* Payment Method */}
                    <div className="flex-1 md:flex-none">
                        <CrmSelect
                            value={filters.paymentMethod}
                            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                        >
                            <option value="todas">Método (Todos)</option>
                            <option value="contado">Contado</option>
                            <option value="financiado">Financiado</option>
                            <option value="mixto">Mixto</option>
                            <option value="otro">Otro</option>
                        </CrmSelect>
                    </div>

                    {/* Doc Status */}
                    <div className="flex-1 md:flex-none">
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

                    {/* Delivery Status */}
                    <div className="flex-1 md:flex-none">
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

                    {/* Collection Status */}
                    <div className="flex-1 md:flex-none">
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

                    {/* Clear Button */}
                    <CrmIconButton
                        onClick={handleClear}
                        title="Limpiar filtros"
                        className="shrink-0"
                    >
                        <RefreshCcw size={16} className="text-crm-fg-muted" />
                    </CrmIconButton>
                </div>
            </div>
        </div>
    );
}
