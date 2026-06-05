"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, Plus } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import AgendaSummaryCards from '../../../components/crm/agenda/AgendaSummaryCards';
import AgendaSection from '../../../components/crm/agenda/AgendaSection';
import AgendaFilters from '../../../components/crm/agenda/AgendaFilters';
import CrmTaskModal from '../../../components/crm/agenda/CrmTaskModal';

export default function AdminAgendaPage() {
    const { leads, loading: loadingLeads, error: errorLeads, fetchLeads, updateLead, updateTaskStatus } = useAdminLeads();
    const { tasks: crmTasks, loading: loadingTasks, error: errorTasks, fetchTasks, createTask: createCrmTask, updateTask: updateCrmTask } = useAdminCrmTasks();

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        priority: '',
        type: '',
        dueDate: '',
        linkType: ''
    });

    const [isCrmTaskModalOpen, setIsCrmTaskModalOpen] = useState(false);
    const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);

    useEffect(() => {
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
            if (selectedTaskForEdit && selectedTaskForEdit._id) {
                await updateCrmTask(selectedTaskForEdit._id, taskData);
            } else {
                await createCrmTask(taskData);
            }
            setIsCrmTaskModalOpen(false);
            setSelectedTaskForEdit(null);
            await fetchTasks();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar la tarea. Revisa la sesion o intenta nuevamente.');
        }
    };

    const handleCancelCrmTask = async (taskId) => {
        if (!window.confirm('Estas seguro de cancelar este recordatorio?')) return;
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

    const classifiedLeads = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);

        const next7Days = new Date(today);
        next7Days.setDate(today.getDate() + 7);
        next7Days.setHours(23, 59, 59, 999);

        const overdue = [];
        const forToday = [];
        const next7 = [];
        const noAction = [];
        let totalPendingTasks = 0;

        const filteredLeads = leads.filter(l => {
            if (filters.status && l.crmStatus !== filters.status) return false;
            if (!filters.status && ['perdido', 'convertido'].includes(l.crmStatus)) return false;
            if (filters.type && filters.type !== 'lead') return false;

            if (filters.search) {
                const searchStr = filters.search.toLowerCase();
                const matchName = `${l.firstName || ''} ${l.lastName || ''} ${l.name || ''}`.toLowerCase().includes(searchStr);
                const matchPhone = (l.phone || '').toLowerCase().includes(searchStr);
                if (!matchName && !matchPhone) return false;
            }

            if (filters.priority && l.priority !== filters.priority) return false;
            if (filters.linkType === 'sin_vinculo') return false;

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

            if (filters.dueDate === 'vencidas' && !isOverdue) return;
            if (filters.dueDate === 'hoy' && !isToday) return;
            if (filters.dueDate === 'proximos_7' && !isNext7) return;

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

        let completedRecent = 0;
        let collectionsPending = 0;

        const recentDateLimit = new Date();
        recentDateLimit.setDate(recentDateLimit.getDate() - 3);

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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-20 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Calendario</h1>
                        <span className="rounded border border-crm-red/20 bg-crm-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-red">
                            Operacion
                        </span>
                    </div>
                    <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                        Tareas CRM, seguimientos y recordatorios operativos.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsCrmTaskModalOpen(true)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-crm-red px-4 text-sm font-bold text-white shadow-crm-red transition-colors hover:bg-crm-red-hover"
                >
                    <Plus size={18} />
                    Crear tarea
                </button>
            </div>

            <AgendaSummaryCards metrics={metrics} />

            <div className="flex flex-col gap-5 rounded-xl border border-crm-border bg-crm-surface p-3 md:p-4">
                <AgendaFilters filters={filters} setFilters={setFilters} onSearch={handleSearch} />

                {errorLeads && (
                    <div className="flex items-center gap-2 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                        <AlertCircle size={18} />
                        No se pudieron cargar los datos de cotizaciones en el calendario. {errorLeads}
                    </div>
                )}

                {errorTasks && !errorLeads && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                        <AlertCircle size={18} />
                        No se pudieron cargar las tareas CRM. Solo veras las tareas de cotizaciones. {errorTasks}
                    </div>
                )}

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-bg">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                            <span className="text-sm text-crm-fg-muted">Cargando calendario...</span>
                        </div>
                    </div>
                ) : !errorLeads ? (
                    <div className="flex flex-col gap-5">
                        <AgendaSection
                            title="Vencidos"
                            icon={AlertCircle}
                            colorClass={{ bg: 'bg-crm-red/10', border: 'border-crm-red/20', text: 'text-red-300' }}
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
                            colorClass={{ bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-300' }}
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
                            title="Proximos 7 Dias"
                            icon={CalendarClock}
                            colorClass={{ bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-300' }}
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
                            title="Sin Accion Programada"
                            icon={AlertCircle}
                            colorClass={{ bg: 'bg-crm-bg', border: 'border-crm-border', text: 'text-crm-fg-muted' }}
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
