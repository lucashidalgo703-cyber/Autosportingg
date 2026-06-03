import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import CrmInput from '../ui/CrmInput';
import CrmSelect from '../ui/CrmSelect';

export default function ReservationsFilters({ filters, setFilters }) {
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-crm-surface border border-crm-border rounded-2xl p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
                
                {/* Text Search */}
                <div className="flex-1 min-w-[250px]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={18} />
                        <CrmInput
                            type="text"
                            placeholder="Buscar cliente, auto, dominio, teléfono..."
                            className="pl-10"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap lg:flex-nowrap gap-4">
                    {/* Status Filter */}
                    <div className="flex-1 lg:flex-none">
                        <CrmSelect
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="todas">Todos los estados</option>
                            <option value="activa">Activas</option>
                            <option value="convertida">Convertidas</option>
                            <option value="vencida">Vencidas</option>
                            <option value="cancelada">Canceladas</option>
                            <option value="devuelta">Devueltas</option>
                            <option value="retenida">Retenidas</option>
                        </CrmSelect>
                    </div>

                    {/* Currency Filter */}
                    <div className="flex-1 lg:flex-none">
                        <CrmSelect
                            value={filters.currency}
                            onChange={(e) => handleFilterChange('currency', e.target.value)}
                        >
                            <option value="todas">Todas las monedas</option>
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                        </CrmSelect>
                    </div>

                    {/* Date/Expiry Filter */}
                    <div className="flex-1 lg:flex-none">
                        <CrmSelect
                            value={filters.dateRange}
                            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                        >
                            <option value="todas">Todos los vencimientos</option>
                            <option value="vencidas">Ya Vencidas</option>
                            <option value="hoy">Vencen Hoy</option>
                            <option value="proximos_7">Próximos 7 días</option>
                        </CrmSelect>
                    </div>
                </div>

            </div>
        </div>
    );
}
