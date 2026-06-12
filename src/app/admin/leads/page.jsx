"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Link2Off, MessageSquare, Target, TrendingUp, UserCheck } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import LeadFilters from '../../../components/crm/leads/LeadFilters';
import LeadsTable from '../../../components/crm/leads/LeadsTable';
import LeadMobileCards from '../../../components/crm/leads/LeadMobileCards';
import LeadEmptyState from '../../../components/crm/leads/LeadEmptyState';
import LeadViewToggle from '../../../components/crm/leads/LeadViewToggle';
import LeadKanbanBoard from '../../../components/crm/leads/LeadKanbanBoard';

const summaryCards = [
    { key: 'total', label: 'Leads cargados', icon: Target, tone: 'bg-blue-500/15 text-blue-300' },
    { key: 'contactados', label: 'Contactados', icon: MessageSquare, tone: 'bg-purple-500/15 text-purple-300' },
    { key: 'convertidos', label: 'Convertidos', icon: UserCheck, tone: 'bg-emerald-500/15 text-emerald-300' },
    { key: 'alta', label: 'Prioridad alta', icon: TrendingUp, tone: 'bg-crm-red/15 text-red-300' },
    { key: 'sinCliente', label: 'Sin cliente', icon: Link2Off, tone: 'bg-amber-500/15 text-amber-300' }
];

export default function AdminLeadsPage() {
    const { leads, loading, error, fetchLeads, updateLead, total } = useAdminLeads();

    const [view, setView] = useState('list'); // 'list' | 'kanban'
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

    const summary = useMemo(() => {
        const source = leads || [];

        return {
            total: total || source.length,
            contactados: source.filter(lead => ['contactado', 'interesado', 'seguimiento'].includes(lead.crmStatus)).length,
            convertidos: source.filter(lead => lead.crmStatus === 'convertido').length,
            alta: source.filter(lead => lead.priority === 'alta').length,
            sinCliente: source.filter(lead => !lead.clientId).length
        };
    }, [leads, total]);

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-20 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Leads</h1>
                        <span className="rounded border border-crm-success/20 bg-crm-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-success">
                            CRM Comercial
                        </span>
                    </div>
                    <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                        Consultas web, oportunidades y seguimiento comercial.
                    </p>
                </div>

                <LeadViewToggle view={view} setView={setView} />
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {summaryCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div key={card.key} className="rounded-xl border border-crm-border bg-crm-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">{card.label}</p>
                                    <p className="m-0 mt-3 text-2xl font-bold leading-none text-crm-fg">{summary[card.key]}</p>
                                </div>
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                                    <Icon size={18} />
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col">
                <LeadFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />

                {error && (
                    <div className="mb-6 flex items-center gap-2 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                        <AlertCircle size={18} />
                        No se pudieron cargar los leads. {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                            <span className="text-sm text-crm-fg-muted">Cargando leads...</span>
                        </div>
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
