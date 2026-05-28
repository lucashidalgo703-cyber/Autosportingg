"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import AgendaSummaryCards from '../../../components/crm/agenda/AgendaSummaryCards';
import AgendaSection from '../../../components/crm/agenda/AgendaSection';
import AgendaFilters from '../../../components/crm/agenda/AgendaFilters';
import CrmTaskModal from '../../../components/crm/agenda/CrmTaskModal';
import { Plus } from 'lucide-react';

export default function AdminAgendaPage() {
    const { leads, loading: loadingLeads, error: errorLeads, fetchLeads, updateLead, updateTaskStatus } = useAdminLeads();
    const { tasks: crmTasks, loading: loadingTasks, error: errorTasks, fetchTasks, updateTask: updateCrmTask } = useAdminCrmTasks();
    
    // Filters State
    const [filters, setFilters] = useState({ 
        search: '', 
        status: '', 
        priority: '', 
        type: '',
        dueDate: '',
        linkType: '' 
    });

    // CrmTask Modal State
    const [isCrmTaskModalOpen, setIsCrmTaskModalOpen] = useState(false);
    const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);

    useEffect(() => {
        // Fetch up to 500 leads to populate agenda properly for now
        fetchLeads({ ...filters, limit: 500 });
        fetchTasks();
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

    const handleCompleteCrmTask = async (taskId) => {
        try {
            await updateCrmTask(taskId, { status: 'completada' });
        } catch (error) {
            alert('Error al completar tarea: ' + error.message);
        }
    };

    const handleEditCrmTask = (task) => {
        setSelectedTaskForEdit(task);
        setIsCrmTaskModalOpen(true);
    };

    const handleSaveCrmTask = async (taskData) => {
        try {
            if (selectedTaskForEdit) {
                await updateCrmTask(selectedTaskForEdit._id, taskData);
            } else {
                await createTask(taskData);
            }
            setIsCrmTaskModalOpen(false);
            setSelectedTaskForEdit(null);
            fetchTasks(); // Reload to reflect changes if necessary
        } catch (error) {
            alert('Error al guardar tarea: ' + error.message);
        }
    };

    const handleCancelCrmTask = async (taskId) => {
        if (!window.confirm('¿Estás seguro de cancelar este recordatorio?')) return;
        try {
            await updateCrmTask(taskId, { status: 'cancelada' });
        } catch (error) {
            alert('Error al cancelar recordatorio: ' + error.message);
        }
    };

    const handlePostponeCrmTask = async (taskId, newDate) => {
        try {
            await updateCrmTask(taskId, { dueDate: newDate });
        } catch (error) {
            alert('Error al posponer recordatorio: ' + error.message);
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

        // 1. Process Legacy Leads
        const filteredLeads = leads.filter(l => {
            if (filters.status && l.crmStatus !== filters.status) return false;
            if (!filters.status && ['perdido', 'convertido'].includes(l.crmStatus)) return false;
            if (filters.type && filters.type !== 'lead') return false;
            
            if (filters.search) {
                const searchStr = filters.search.toLowerCase();
                const matchName = (l.firstName + ' ' + l.lastName).toLowerCase().includes(searchStr);
                const matchPhone = (l.phone || '').toLowerCase().includes(searchStr);
                if (!matchName && !matchPhone) return false;
            }

            if (filters.priority && l.priority !== filters.priority) return false;
            if (filters.linkType === 'sin_vinculo') return false; // Leads always have the lead link
            
            return true;
        });

        filteredLeads.forEach(lead => {
            const pendingTasks = lead.tasks ? lead.tasks.filter(t => t.status === 'pendiente') : [];
            
            let isOverdue = false;
            let isToday = false;
            let isNext7 = false;

            if (lead.nextActionDate) {
                const actionDate = new Date(lead.nextActionDate);
                if (actionDate < today) isOverdue = true;
                else if (actionDate >= today && actionDate <= endOfToday) isToday = true;
                else if (actionDate > endOfToday && actionDate <= next7Days) isNext7 = true;
            }

            pendingTasks.forEach(t => {
                if (t.dueDate) {
                    const tDate = new Date(t.dueDate);
                    if (tDate < today) isOverdue = true;
                    else if (tDate >= today && tDate <= endOfToday && !isOverdue) isToday = true;
                    else if (tDate > endOfToday && tDate <= next7Days && !isOverdue && !isToday) isNext7 = true;
                }
            });

            // Apply due date filter for leads
            if (filters.dueDate === 'vencidas' && !isOverdue) return;
            if (filters.dueDate === 'hoy' && !isToday) return;
            if (filters.dueDate === 'proximos_7' && !isNext7) return;

            // Apply priority filter to tasks if available
            if (filters.priority && pendingTasks.length > 0) {
                 const hasPriorityTask = pendingTasks.some(t => t.priority === filters.priority);
                 if (!hasPriorityTask && lead.priority !== filters.priority) return;
            }

            totalPendingTasks += pendingTasks.length;

            const normalizedLead = { ...lead, isCrmTask: false };

            if (isOverdue) overdue.push(normalizedLead);
            else if (isToday) forToday.push(normalizedLead);
            else if (isNext7) next7.push(normalizedLead);
            else if (!lead.nextActionDate && pendingTasks.length === 0 && filters.dueDate === '') noAction.push(normalizedLead);
        });

        // 2. Process New CrmTasks (Pendientes)
        const activeCrmTasks = crmTasks.filter(t => t.status === 'pendiente');
        
        activeCrmTasks.forEach(task => {
            if (filters.type && filters.type !== task.type) return;
            if (filters.priority && filters.priority !== task.priority) return;
            
            if (filters.search) {
                const searchStr = filters.search.toLowerCase();
                const matchTitle = (task.title || '').toLowerCase().includes(searchStr);
                const matchDesc = (task.description || '').toLowerCase().includes(searchStr);
                const matchClient = (task.clientId?.fullName || task.clientId?.firstName || '').toLowerCase().includes(searchStr);
                const matchVehicle = (task.vehicleId?.brand || task.vehicleId?.name || '').toLowerCase().includes(searchStr);
                
                if (!matchTitle && !matchDesc && !matchClient && !matchVehicle) return;
            }

            if (filters.linkType) {
                if (filters.linkType === 'sin_vinculo' && (task.saleId || task.clientId || task.vehicleId || task.installmentId || task.leadId)) return;
                if (filters.linkType === 'con_venta' && !task.saleId) return;
                if (filters.linkType === 'con_cliente' && !task.clientId) return;
            }

            let isOverdue = false;
            let isToday = false;
            let isNext7 = false;

            const tDate = new Date(task.dueDate);
            if (tDate < today) isOverdue = true;
            else if (tDate >= today && tDate <= endOfToday) isToday = true;
            else if (tDate > endOfToday && tDate <= next7Days) isNext7 = true;

            if (filters.dueDate === 'vencidas' && !isOverdue) return;
            if (filters.dueDate === 'hoy' && !isToday) return;
            if (filters.dueDate === 'proximos_7' && !isNext7) return;

            totalPendingTasks++;

            const normalizedTask = {
                _id: task._id,
                isCrmTask: true,
                taskData: task,
                name: task.title,
                phone: task.clientId?.phone || '',
                crmStatus: 'nuevo',
                priority: task.priority,
                nextActionDate: task.dueDate,
                tasks: [task]
            };

            if (isOverdue) overdue.push(normalizedTask);
            else if (isToday) forToday.push(normalizedTask);
            else if (isNext7) next7.push(normalizedTask);
            else if (filters.dueDate === '') noAction.push(normalizedTask);
        });

        // Metrics calculations
        let completedRecent = 0;
        let collectionsPending = 0;
        
        const recentDateLimit = new Date();
        recentDateLimit.setDate(recentDateLimit.getDate() - 3); // last 3 days

        crmTasks.forEach(t => {
            if (t.status === 'completada' && t.completedAt && new Date(t.completedAt) >= recentDateLimit) {
                completedRecent++;
            }
            if (t.status === 'pendiente' && t.type === 'cobranza') {
                collectionsPending++;
            }
        });

        const sortFn = (a, b) => {
            const dateA = new Date(a.nextActionDate || a.taskData?.dueDate || 0);
            const dateB = new Date(b.nextActionDate || b.taskData?.dueDate || 0);
            return dateA - dateB;
        };

        overdue.sort(sortFn);
        forToday.sort(sortFn);
        next7.sort(sortFn);

        return { overdue, forToday, next7, noAction, totalPendingTasks, completedRecent, collectionsPending };
    }, [leads, crmTasks, filters]);

    const metrics = {
        overdue: classifiedLeads.overdue.length,
        today: classifiedLeads.forToday.length,
        next7Days: classifiedLeads.next7.length,
        noAction: classifiedLeads.noAction.length,
        totalPendingTasks: classifiedLeads.totalPendingTasks,
        completedRecent: classifiedLeads.completedRecent,
        collectionsPending: classifiedLeads.collectionsPending
    };

    const loading = loadingLeads || loadingTasks;

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <CalendarClock className="text-red-600" size={32} />
                        <h1 className="text-3xl font-bold text-white tracking-tight">Agenda Comercial</h1>
                        <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ml-2">
                            Fase 4.2E
                        </span>
                    </div>
                    <p className="text-neutral-400 text-sm">
                        Centro unificado de tareas CRM y seguimientos operativos.
                    </p>
                </div>
                <button
                    onClick={() => setIsCrmTaskModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                >
                    <Plus size={18} />
                    Crear Tarea
                </button>
            </div>

            <AgendaSummaryCards metrics={metrics} />

            <div className="bg-black/20 p-4 md:p-6 rounded-2xl border border-neutral-800/50">
                <AgendaFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />
                
                {errorLeads && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <AlertCircle size={18} />
                        No se pudieron cargar los datos de leads en la agenda. {errorLeads}
                    </div>
                )}
                
                {errorTasks && !errorLeads && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                        <AlertCircle size={18} />
                        No se pudieron cargar las tareas CRM (Cobranzas). Solo verás las tareas de Leads. {errorTasks}
                    </div>
                )}
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
                    </div>
                ) : !errorLeads ? (
                    <div className="flex flex-col gap-6">
                        <AgendaSection 
                            title="Vencidos (Atención Urgente)" 
                            icon={AlertCircle}
                            colorClass={{ bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-500' }}
                            leads={classifiedLeads.overdue}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            onCompleteCrmTask={handleCompleteCrmTask}
                            onCancelCrmTask={handleCancelCrmTask}
                            onPostponeCrmTask={handlePostponeCrmTask}
                            onEditCrmTask={handleEditCrmTask}
                            defaultOpen={true}
                        />

                        <AgendaSection 
                            title="Para Hoy" 
                            icon={CalendarClock}
                            colorClass={{ bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500' }}
                            leads={classifiedLeads.forToday}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            onCompleteCrmTask={handleCompleteCrmTask}
                            onCancelCrmTask={handleCancelCrmTask}
                            onPostponeCrmTask={handlePostponeCrmTask}
                            onEditCrmTask={handleEditCrmTask}
                            defaultOpen={true}
                        />

                        <AgendaSection 
                            title="Próximos 7 Días" 
                            icon={CalendarClock}
                            colorClass={{ bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500' }}
                            leads={classifiedLeads.next7}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            onCompleteCrmTask={handleCompleteCrmTask}
                            onCancelCrmTask={handleCancelCrmTask}
                            onPostponeCrmTask={handlePostponeCrmTask}
                            onEditCrmTask={handleEditCrmTask}
                            defaultOpen={false}
                        />

                        <AgendaSection 
                            title="Sin Acción Programada (Solo Leads)" 
                            icon={AlertCircle}
                            colorClass={{ bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-500' }}
                            leads={classifiedLeads.noAction.filter(l => !l.isCrmTask)}
                            onChangeStatus={handleStatusChange}
                            onCompleteTask={handleCompleteTask}
                            defaultOpen={false}
                        />
                    </div>
                ) : null}
            </div>

            <CrmTaskModal 
                isOpen={isCrmTaskModalOpen}
                onClose={() => {
                    setIsCrmTaskModalOpen(false);
                    setSelectedTaskForEdit(null);
                }}
                task={selectedTaskForEdit}
                onSave={handleSaveCrmTask}
            />
        </div>
    );
}
