"use client";
import { Search, Filter, Plus } from 'lucide-react';
import CrmButton from '../ui/CrmButton';
import CrmInput from '../ui/CrmInput';

export default function StockFilters({ searchTerm, setSearchTerm, filterStatus, setFilterStatus, onNewVehicle }) {
    return (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-crm-surface p-4 rounded-xl border border-crm-border mb-6">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={18} />
                    <CrmInput
                        type="text"
                        placeholder="Buscar por marca, modelo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                
                <div className="flex bg-crm-bg p-1 rounded-xl border border-crm-border w-full sm:w-auto overflow-x-auto gap-1 items-center">
                    <button 
                        onClick={() => setFilterStatus('todos')}
                        className={`rounded-full h-[26px] px-3 text-xs border transition-colors whitespace-nowrap ${filterStatus === 'todos' ? 'border-crm-border bg-crm-surface-raised text-crm-fg' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilterStatus('disponible')}
                        className={`rounded-full h-[26px] px-3 text-xs border transition-colors whitespace-nowrap ${filterStatus === 'disponible' ? 'border-crm-border bg-crm-surface-raised text-crm-fg' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                    >
                        Disponibles
                    </button>
                    <button 
                        onClick={() => setFilterStatus('reservado')}
                        className={`rounded-full h-[26px] px-3 text-xs border transition-colors whitespace-nowrap ${filterStatus === 'reservado' ? 'border-crm-border bg-crm-surface-raised text-crm-fg' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                    >
                        Reservados
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 justify-end">
                <CrmButton variant="secondary" className="gap-2">
                    <Filter size={16} />
                    Más Filtros
                </CrmButton>
                <CrmButton variant="primary" onClick={onNewVehicle} className="gap-2">
                    <Plus size={16} />
                    Nuevo Vehículo
                </CrmButton>
            </div>
        </div>
    );
}
