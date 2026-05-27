"use client";
import React, { useEffect, useState } from 'react';
import { Target, AlertCircle } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import LeadFilters from '../../../components/crm/leads/LeadFilters';
import LeadsTable from '../../../components/crm/leads/LeadsTable';
import LeadMobileCards from '../../../components/crm/leads/LeadMobileCards';
import LeadEmptyState from '../../../components/crm/leads/LeadEmptyState';

export default function AdminLeadsPage() {
    const { leads, loading, error, fetchLeads, total } = useAdminLeads();
    
    // Filters State
    const [filters, setFilters] = useState({ 
        search: '', 
        crmStatus: '', 
        priority: '', 
        source: '', 
        sourceDetail: '',
        unlinked: '' 
    });

    useEffect(() => {
        fetchLeads(filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (newFilters) => {
        fetchLeads(newFilters);
    };

    const hasActiveFilters = Boolean(filters.search || filters.crmStatus || filters.priority || filters.source || filters.sourceDetail || filters.unlinked);

    // Basic Metrics (Calculated over currently loaded leads - which might be paginated, 
    // but useful for quick context as requested)
    const webContactCount = leads.filter(l => l.sourceDetail === 'contact_form').length;
    const vehicleDetailCount = leads.filter(l => l.sourceDetail === 'vehicle_detail_whatsapp').length;
    const financingCount = leads.filter(l => l.sourceDetail === 'financing_whatsapp').length;
    const unlinkedCount = leads.filter(l => !l.clientId).length;

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Target className="text-red-600" size={32} />
                        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Oportunidades</h1>
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-2">
                            Fase 3.2
                        </span>
                    </div>
                    <p className="text-neutral-400 text-sm">
                        Total de leads: <strong className="text-white">{total}</strong> registros activos
                    </p>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Total Actuales</span>
                    <span className="text-white text-2xl font-bold">{leads.length}</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Contacto Web</span>
                    <span className="text-blue-400 text-2xl font-bold">{webContactCount}</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Fichas Auto</span>
                    <span className="text-red-400 text-2xl font-bold">{vehicleDetailCount}</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Financiación</span>
                    <span className="text-green-400 text-2xl font-bold">{financingCount}</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col">
                    <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">Sin Cliente</span>
                    <span className="text-orange-400 text-2xl font-bold">{unlinkedCount}</span>
                </div>
            </div>

            {/* Content Container */}
            <div className="bg-black/20 p-4 md:p-6 rounded-2xl border border-neutral-800/50">
                <LeadFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <AlertCircle size={18} />
                        No se pudieron cargar los leads. {error}
                    </div>
                )}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : !error && leads.length === 0 ? (
                    <LeadEmptyState hasFilters={hasActiveFilters} />
                ) : !error ? (
                    <>
                        <div className="hidden lg:block">
                            <LeadsTable leads={leads} />
                        </div>
                        <div className="block lg:hidden">
                            <LeadMobileCards leads={leads} />
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
