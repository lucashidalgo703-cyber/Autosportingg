"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import AgendaSummaryCards from '../../../components/crm/agenda/AgendaSummaryCards';
import AgendaSection from '../../../components/crm/agenda/AgendaSection';
import LeadFilters from '../../../components/crm/leads/LeadFilters';

export default function AdminAgendaPage() {
    const { leads, loading, error, fetchLeads, updateLead, updateTaskStatus } = useAdminLeads();
    
    // Filters State
    const [filters, setFilters] = useState({ 
        search: '', 
        crmStatus: '', 
        priority: '', 
        sourceDetail: '',
        unlinked: '' 
    });

    useEffect(() => {
        // Fetch up to 500 leads to populate agenda properly for now
        fetchLeads({ ...filters, limit: 500 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (newFilters) => {
        fetchLeads({ ...newFilters, limit: 500 });
    };

    const handleStatusChange = async (leadId, newStatus) => {
        try {
            await updateLead(leadId, { crmStatus: newStatus });
            fetchLeads({ ...filters, limit: 500 });
        } catch (error) {
            alert('Error al cambiar el estado: ' + error.message);
        }
    };

    const handleCompleteTask = async (leadId, taskId) => {
        try {
            await updateTaskStatus(leadId, taskId, 'completada');
            fetchLeads({ ...filters, limit: 500 });
        } catch (error) {
            alert('Error al completar la tarea: ' + error.message);
        }
    };

    // --- Classification Logic ---
    const classifiedLeads = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        
        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        next7Days.setHours(23, 59, 59, 999);

        // Result buckets
        const overdue = [];
        const forToday = [];
        const next7 = [];
        const noAction = [];
        let totalPendingTasks = 0;

        // Active leads only (unless filtered explicitly)
        const filteredLeads = leads.filter(l => 
            filters.crmStatus 
                ? l.crmStatus === filters.crmStatus 
                : !['perdido', 'convertido'].includes(l.crmStatus)
        );

        filteredLeads.forEach(lead => {
            const pendingTasks = lead.tasks ? lead.tasks.filter(t => t.status === 'pendiente') : [];
            totalPendingTasks += pendingTasks.length;

            let isOverdue = false;
            let isToday = false;
            let isNext7 = false;

            // Check nextActionDate
            if (lead.nextActionDate) {
                const actionDate = new Date(lead.nextActionDate);
                if (actionDate < today) isOverdue = true;
                else if (actionDate >= today && actionDate <= endOfToday) isToday = true;
                else if (actionDate > endOfToday && actionDate <= next7Days) isNext7 = true;
            }

            // Check tasks (tasks can override to a more urgent category)
            pendingTasks.forEach(t => {
                if (t.dueDate) {
                    const tDate = new Date(t.dueDate);
                    if (tDate < today) isOverdue = true;
                    else if (tDate >= today && tDate <= endOfToday && !isOverdue) isToday = true;
                    else if (tDate > endOfToday && tDate <= next7Days && !isOverdue && !isToday) isNext7 = true;
                }
            });

            // Bucket allocation (most urgent first)
            if (isOverdue) overdue.push(lead);
            else if (isToday) forToday.push(lead);
            else if (isNext7) next7.push(lead);
            else if (!lead.nextActionDate && pendingTasks.length === 0) noAction.push(lead);
        });

        return { overdue, forToday, next7, noAction, totalPendingTasks };
    }, [leads, filters.crmStatus]);

    const metrics = {
        overdue: classifiedLeads.overdue.length,
        today: classifiedLeads.forToday.length,
        next7Days: classifiedLeads.next7.length,
        noAction: classifiedLeads.noAction.length,
        totalPendingTasks: classifiedLeads.totalPendingTasks
    };

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <CalendarClock className="text-red-600" size={32} />
                        <h1 className="text-3xl font-bold text-white tracking-tight">Agenda Comercial</h1>
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-2">
                            Fase 3.4B
                        </span>
                    </div>
                    <p className="text-neutral-400 text-sm">
                        Resumen de acciones y seguimientos para hoy.
                    </p>
                </div>
            </div>

            <AgendaSummaryCards metrics={metrics} />

            <div className="bg-black/20 p-4 md:p-6 rounded-2xl border border-neutral-800/50">
                <LeadFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <AlertCircle size={18} />
                        No se pudieron cargar los datos de la agenda. {error}
                    </div>
                )}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : !error ? (
                    <div className="flex flex-col gap-6">
                        <AgendaSection 
                            title="Vencidos (Atención Urgente)" 
                            icon={AlertCircle}
                            colorClass={{ bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500' }}
                            leads={classifiedLeads.overdue}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            defaultOpen={true}
                        />

                        <AgendaSection 
                            title="Para Hoy" 
                            icon={CalendarClock}
                            colorClass={{ bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500' }}
                            leads={classifiedLeads.forToday}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            defaultOpen={true}
                        />

                        <AgendaSection 
                            title="Próximos 7 Días" 
                            icon={CalendarClock}
                            colorClass={{ bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500' }}
                            leads={classifiedLeads.next7}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            defaultOpen={false}
                        />

                        <AgendaSection 
                            title="Sin Acción Programada" 
                            icon={AlertCircle}
                            colorClass={{ bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-500' }}
                            leads={classifiedLeads.noAction}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            defaultOpen={false}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
