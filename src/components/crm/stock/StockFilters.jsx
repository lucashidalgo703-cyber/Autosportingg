"use client";
import { Search, Filter, Plus } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function StockFilters({ searchTerm, setSearchTerm, filterStatus, setFilterStatus, onNewVehicle }) {
    return (
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-[#1E1E24] p-4 rounded-xl border border-[#33333A] mb-6">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto flex-1">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por marca, modelo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#161619] border border-[#33333A] text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-[#E63027] transition-colors"
                    />
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <button 
                        onClick={() => setFilterStatus('todos')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === 'todos' ? 'bg-[#24242B] text-white border border-[#33333A]' : 'text-[#A1A1AA] hover:text-white'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilterStatus('disponible')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === 'disponible' ? 'bg-[#24242B] text-white border border-[#33333A]' : 'text-[#A1A1AA] hover:text-white'}`}
                    >
                        Disponibles
                    </button>
                    <button 
                        onClick={() => setFilterStatus('reservado')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === 'reservado' ? 'bg-[#24242B] text-white border border-[#33333A]' : 'text-[#A1A1AA] hover:text-white'}`}
                    >
                        Reservados
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto shrink-0 justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-[#24242B] text-white rounded-lg border border-[#33333A] hover:bg-[#2A2A32] transition-colors text-sm">
                    <Filter size={16} />
                    Más Filtros
                </button>
                <CrmButton onClick={onNewVehicle} className="flex items-center gap-2">
                    <Plus size={16} />
                    Nuevo Vehículo
                </CrmButton>
            </div>
        </div>
    );
}
