"use client";
import React, { useEffect, useState } from 'react';
import { Target, AlertCircle } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import LeadFilters from '../../../components/crm/leads/LeadFilters';
import LeadsTable from '../../../components/crm/leads/LeadsTable';
import LeadMobileCards from '../../../components/crm/leads/LeadMobileCards';
import LeadEmptyState from '../../../components/crm/leads/LeadEmptyState';
import LeadViewToggle from '../../../components/crm/leads/LeadViewToggle';
import LeadKanbanBoard from '../../../components/crm/leads/LeadKanbanBoard';

export default function AdminLeadsPage() {
    const { leads, loading, error, fetchLeads, updateLead, total } = useAdminLeads();
    
    const [view, setView] = useState('list'); // 'list' | 'kanban'
    
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

    const handleStatusChange = async (leadId, newStatus) => {
        try {
            await updateLead(leadId, { crmStatus: newStatus });
            fetchLeads(filters); // Refresh
        } catch (error) {
            alert('Error al cambiar el estado: ' + error.message);
        }
    };

    // Basic Metrics (Calculated over currently loaded leads - which might be paginated, 
    // but useful for quick context as requested)
    const webContactCount = leads.filter(l => l.sourceDetail === 'contact_form').length;
    const vehicleDetailCount = leads.filter(l => l.sourceDetail === 'vehicle_detail_whatsapp').length;
    const financingCount = leads.filter(l => l.sourceDetail === 'financing_whatsapp').length;
    const unlinkedCount = leads.filter(l => !l.clientId).length;

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-crm-fg tracking-tight m-0 mb-1 flex items-center gap-2">
                        Gestión de Oportunidades
                        <span className="bg-crm-success/10 text-crm-success border border-crm-success/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Fase 3.2
                        </span>
                    </h1>
                    <p className="text-sm text-crm-fg-muted m-0">
                        Total de leads: <strong className="text-crm-fg">{total}</strong> registros activos
                    </p>
                </div>
                <LeadViewToggle view={view} setView={setView} />
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-crm-surface border border-crm-border p-4 rounded-xl flex flex-col">
                    <span className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-1">Total Actuales</span>
                    <span className="text-crm-fg text-2xl font-bold">{leads.length}</span>
                </div>
                <div className="bg-crm-surface border border-crm-border p-4 rounded-xl flex flex-col">
                    <span className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-1">Contacto Web</span>
                    <span className="text-blue-400 text-2xl font-bold">{webContactCount}</span>
                </div>
                <div className="bg-crm-surface border border-crm-border p-4 rounded-xl flex flex-col">
                    <span className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-1">Fichas Auto</span>
                    <span className="text-crm-red text-2xl font-bold">{vehicleDetailCount}</span>
                </div>
                <div className="bg-crm-surface border border-crm-border p-4 rounded-xl flex flex-col">
                    <span className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-1">Financiación</span>
                    <span className="text-crm-success text-2xl font-bold">{financingCount}</span>
                </div>
                <div className="bg-crm-surface border border-crm-border p-4 rounded-xl flex flex-col">
                    <span className="text-crm-fg-muted text-xs font-bold uppercase tracking-wider mb-1">Sin Cliente</span>
                    <span className="text-orange-400 text-2xl font-bold">{unlinkedCount}</span>
                </div>
            </div>

            {/* Content Container */}
            <div className="flex flex-col">
                <LeadFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <AlertCircle size={18} />
                        No se pudieron cargar los leads. {error}
                    </div>
                )}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#EF3329]"></div>
                    </div>
                ) : !error && leads.length === 0 ? (
                    <LeadEmptyState hasFilters={hasActiveFilters} />
                ) : !error ? (
                    view === 'kanban' ? (
                        <LeadKanbanBoard leads={leads} onChangeStatus={handleStatusChange} />
                    ) : (
                        <>
                            <div className="hidden lg:block">
                                <LeadsTable leads={leads} />
                            </div>
                            <div className="block lg:hidden">
                                <LeadMobileCards leads={leads} />
                            </div>
                        </>
                    )
                ) : null}
            </div>
        </div>
    );
}
