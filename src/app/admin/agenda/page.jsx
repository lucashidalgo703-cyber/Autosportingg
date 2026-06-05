"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    ExternalLink,
    Filter,
    Link2,
    Plus,
    Search
} from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import CrmTaskModal from '../../../components/crm/agenda/CrmTaskModal';

const MONTHS = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
];

const WEEK_DAYS = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];
const EVENT_TYPES = ['general', 'venta', 'cobranza', 'documentacion', 'entrega', 'postventa', 'cotizacion'];

const todayStart = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
};

const parseDate = (value) => {
    if (!value) return null;

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const [year, month, day] = value.slice(0, 10).split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const toInputDate = (date) => {
    if (!date) return '';
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
};

const getRefId = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value._id || value.id || null;
};

const getClientName = (client) => {
    if (!client) return '';
    return client.fullName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.name || '';
};

const getLeadName = (lead) => {
    return `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name || 'Cotizacion';
};

const getVehicleName = (vehicle) => {
    if (!vehicle) return '';
    return `${vehicle.brand || ''} ${vehicle.name || vehicle.model || ''}`.trim();
};

const eventColorByType = (type, priority) => {
    if (priority === 'alta') return '#dc2626';

    const colors = {
        venta: '#10b981',
        cobranza: '#f59e0b',
        documentacion: '#3b82f6',
        entrega: '#8b5cf6',
        postventa: '#14b8a6',
        cotizacion: '#dc2626',
        general: '#71717a'
    };

    return colors[type] || colors.general;
};

const eventTypeLabel = (type) => {
    const labels = {
        general: 'General',
        venta: 'Venta',
        cobranza: 'Cobro',
        documentacion: 'Gestoria',
        entrega: 'Entrega',
        postventa: 'Postventa',
        cotizacion: 'Cotizacion'
    };

    return labels[type] || 'Otro';
};

const formatEventDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-AR');
};

const sortEventsAsc = (a, b) => a.date.getTime() - b.date.getTime();
const sortEventsDesc = (a, b) => b.date.getTime() - a.date.getTime();

function EventListRow({ event, onCompleteCrmTask, onCompleteLeadTask, onEditCrmTask }) {
    return (
        <div className="group flex flex-col gap-4 border-b border-[#27272a] p-4 transition-colors last:border-b-0 hover:bg-zinc-900/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
                <span
                    className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: event.color }}
                />
                <div className="min-w-0 space-y-1">
                    <h4 className="m-0 truncate text-sm font-bold text-white">{event.title}</h4>
                    <p className="m-0 max-w-xl whitespace-pre-line text-xs leading-relaxed text-zinc-400">
                        {event.description || 'Sin descripcion adicional.'}
                    </p>
                </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[#27272a] pt-3 sm:justify-end sm:border-t-0 sm:pt-0">
                <div className="flex flex-col sm:items-end">
                    <span className="text-xs font-bold text-white">{formatEventDate(event.date)}</span>
                    <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                        Fecha limite
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {event.href && (
                        <a
                            href={event.href}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900 text-zinc-500 opacity-100 transition-colors hover:border-zinc-700 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                            title="Ver detalle"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                    {event.kind === 'crm-task' && (
                        <button
                            type="button"
                            onClick={() => onEditCrmTask(event.rawTask)}
                            className="inline-flex h-9 items-center rounded-lg border border-[#27272a] bg-zinc-900 px-3 text-xs font-bold text-zinc-500 opacity-100 transition-colors hover:border-zinc-700 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
                        >
                            Editar
                        </button>
                    )}
                    {(event.kind === 'crm-task' || event.kind === 'lead-task') && (
                        <button
                            type="button"
                            onClick={() => {
                                if (event.kind === 'crm-task') onCompleteCrmTask(event.taskId);
                                if (event.kind === 'lead-task') onCompleteLeadTask(event.leadId, event.taskId);
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 opacity-100 transition-colors hover:bg-emerald-500/15 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Completar"
                        >
                            <CheckCircle2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AdminAgendaPage() {
    const { leads, loading: loadingLeads, error: errorLeads, fetchLeads, updateTaskStatus } = useAdminLeads();
    const { tasks: crmTasks, loading: loadingTasks, error: errorTasks, fetchTasks, createTask: createCrmTask, updateTask: updateCrmTask } = useAdminCrmTasks();

    const today = todayStart();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [activeTab, setActiveTab] = useState('Proximos');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('Todos los tipos');
    const [isCrmTaskModalOpen, setIsCrmTaskModalOpen] = useState(false);
    const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);
    const [taskDefaultData, setTaskDefaultData] = useState(null);

    useEffect(() => {
        fetchLeads({ limit: 500 });
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        setDateFrom(toInputDate(firstDay));
        setDateTo(toInputDate(lastDay));
    }, [currentMonth, currentYear]);

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((prev) => prev - 1);
        } else {
            setCurrentMonth((prev) => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((prev) => prev + 1);
        } else {
            setCurrentMonth((prev) => prev + 1);
        }
    };

    const handleToday = () => {
        const now = todayStart();
        setCurrentMonth(now.getMonth());
        setCurrentYear(now.getFullYear());
    };

    const openNewEvent = (date = todayStart()) => {
        setSelectedTaskForEdit(null);
        setTaskDefaultData({
            title: '',
            type: 'general',
            dueDate: toInputDate(date),
            dueTime: '10:00',
            priority: 'media',
            source: 'agenda'
        });
        setIsCrmTaskModalOpen(true);
    };

    const handleCompleteLeadTask = async (leadId, taskId) => {
        try {
            await updateTaskStatus(leadId, taskId, 'completada');
            fetchLeads({ limit: 500 });
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
        setTaskDefaultData(null);
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
            setTaskDefaultData(null);
            await fetchTasks();
        } catch (error) {
            console.error(error);
            alert('No se pudo guardar la tarea. Revisa la sesion o intenta nuevamente.');
        }
    };

    const normalizedEvents = useMemo(() => {
        const events = [];

        leads.forEach((lead) => {
            const leadName = getLeadName(lead);
            const owner = getClientName(lead.assignedTo) || getClientName(lead.createdBy) || 'Equipo';
            const vehicleName = getVehicleName(lead.vehicleId || lead.vehicle);
            const leadHref = lead._id ? `/admin/leads/${lead._id}` : null;

            if (lead.nextActionDate) {
                const date = parseDate(lead.nextActionDate);
                if (date) {
                    events.push({
                        id: `lead-${lead._id}`,
                        kind: 'lead',
                        type: 'cotizacion',
                        typeLabel: 'Cotizacion',
                        title: leadName,
                        description: vehicleName || lead.phone || 'Seguimiento comercial',
                        date,
                        time: lead.nextActionTime || '',
                        priority: lead.priority || 'media',
                        owner,
                        href: leadHref,
                        color: eventColorByType('cotizacion', lead.priority)
                    });
                }
            }

            const pendingTasks = Array.isArray(lead.tasks)
                ? lead.tasks.filter((task) => task.status !== 'completada' && task.status !== 'cancelada')
                : [];

            pendingTasks.forEach((task) => {
                const date = parseDate(task.dueDate);
                if (!date) return;

                const type = task.type || 'cotizacion';
                events.push({
                    id: `lead-task-${lead._id}-${task._id}`,
                    kind: 'lead-task',
                    type,
                    typeLabel: eventTypeLabel(type),
                    title: task.title || `Seguimiento ${leadName}`,
                    description: task.description || vehicleName || leadName,
                    date,
                    time: task.dueTime || '',
                    priority: task.priority || lead.priority || 'media',
                    owner,
                    href: leadHref,
                    leadId: lead._id,
                    taskId: task._id,
                    color: eventColorByType(type, task.priority || lead.priority)
                });
            });
        });

        crmTasks.forEach((task) => {
            if (task.status === 'completada' || task.status === 'cancelada') return;

            const date = parseDate(task.dueDate);
            if (!date) return;

            const saleId = getRefId(task.saleId);
            const clientId = getRefId(task.clientId);
            const vehicleId = getRefId(task.vehicleId);
            const leadId = getRefId(task.leadId);
            const clientName = getClientName(task.clientId);
            const vehicleName = getVehicleName(task.vehicleId);
            const owner = getClientName(task.assignedTo) || getClientName(task.createdBy) || 'Equipo';
            const type = task.type || 'general';

            let href = null;
            if (saleId) href = `/admin/ventas/${saleId}`;
            else if (leadId) href = `/admin/leads/${leadId}`;
            else if (clientId) href = `/admin/clientes/${clientId}`;
            else if (vehicleId) href = `/admin/stock/${vehicleId}`;

            events.push({
                id: `crm-task-${task._id}`,
                kind: 'crm-task',
                type,
                typeLabel: eventTypeLabel(type),
                title: task.title || 'Evento CRM',
                description: task.description || clientName || vehicleName || 'Recordatorio operativo',
                date,
                time: task.dueTime || '',
                priority: task.priority || 'media',
                owner,
                href,
                taskId: task._id,
                rawTask: task,
                color: eventColorByType(type, task.priority)
            });
        });

        return events.sort(sortEventsAsc);
    }, [leads, crmTasks]);

    const filteredEvents = useMemo(() => {
        return normalizedEvents.filter((event) => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);

            if (activeTab === 'Proximos' && eventDate < todayStart()) return false;
            if (activeTab === 'Pasados' && eventDate >= todayStart()) return false;

            const search = searchQuery.trim().toLowerCase();
            if (search) {
                const haystack = [
                    event.title,
                    event.description,
                    event.typeLabel,
                    event.owner,
                    event.time
                ].join(' ').toLowerCase();
                if (!haystack.includes(search)) return false;
            }

            if (dateFrom) {
                const from = parseDate(dateFrom);
                if (from && eventDate < from) return false;
            }

            if (dateTo) {
                const to = parseDate(dateTo);
                if (to) {
                    to.setHours(23, 59, 59, 999);
                    if (eventDate > to) return false;
                }
            }

            if (selectedTypeFilter !== 'Todos los tipos' && event.type !== selectedTypeFilter) return false;

            return true;
        }).sort(activeTab === 'Pasados' ? sortEventsDesc : sortEventsAsc);
    }, [normalizedEvents, activeTab, searchQuery, dateFrom, dateTo, selectedTypeFilter]);

    const getDayEvents = (day) => {
        return normalizedEvents.filter((event) => (
            event.date.getDate() === day &&
            event.date.getMonth() === currentMonth &&
            event.date.getFullYear() === currentYear
        ));
    };

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay();
    const upcomingEvents = normalizedEvents.filter((event) => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= todayStart();
    }).sort(sortEventsAsc);

    const loading = loadingLeads || loadingTasks;

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-24 font-sans text-[#f4f4f5] md:p-6">
            <div className="flex flex-col gap-4 border-b border-[#27272a] pb-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="m-0 flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
                        Calendario
                    </h1>
                    <p className="m-0 mt-1 text-xs text-zinc-500">
                        Planificacion y seguimiento de compromisos y entregas.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/15"
                    >
                        <Link2 size={15} />
                        Google Calendar
                    </button>
                    <button
                        type="button"
                        onClick={() => openNewEvent()}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 text-xs font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-colors hover:from-red-500 hover:to-red-600"
                    >
                        <Plus size={15} />
                        Nuevo evento
                    </button>
                </div>
            </div>

            {(errorLeads || errorTasks) && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                    <AlertCircle size={18} />
                    {errorLeads
                        ? `No se pudieron cargar las cotizaciones del calendario. ${errorLeads}`
                        : `No se pudieron cargar las tareas CRM. ${errorTasks}`}
                </div>
            )}

            {loading ? (
                <div className="flex h-72 items-center justify-center rounded-2xl border border-[#27272a] bg-[#18181b]/50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#27272a] border-b-[#dc2626]" />
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Cargando agenda...</span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-12">
                        <section className="rounded-2xl border border-[#27272a] bg-[#18181b]/50 p-5 shadow-sm xl:col-span-8">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="m-0 text-sm font-bold uppercase tracking-wider text-white">
                                    {MONTHS[currentMonth]} <span className="font-normal text-zinc-500">{currentYear}</span>
                                </h2>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handlePrevMonth}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272a] bg-[#18181b] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                                        aria-label="Mes anterior"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleToday}
                                        className="inline-flex h-8 items-center rounded-lg border border-[#27272a] bg-[#18181b] px-3 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                                    >
                                        Hoy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextMonth}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#27272a] bg-[#18181b] text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                                        aria-label="Mes siguiente"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-2 grid grid-cols-7 gap-1.5 text-center">
                                {WEEK_DAYS.map((day) => (
                                    <span key={day} className="py-2 text-xs font-semibold text-zinc-500">
                                        {day}
                                    </span>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1.5 text-center">
                                {Array.from({ length: firstDayOffset }).map((_, index) => (
                                    <div key={`offset-${index}`} className="aspect-square bg-transparent" />
                                ))}

                                {Array.from({ length: daysInMonth }).map((_, index) => {
                                    const day = index + 1;
                                    const isTodayDay = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                                    const dayEvents = getDayEvents(day);
                                    const clickedDate = new Date(currentYear, currentMonth, day);

                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => openNewEvent(clickedDate)}
                                            className={`relative flex min-h-[48px] cursor-pointer flex-col items-center justify-between rounded-lg border p-1.5 transition-colors hover:bg-zinc-800/50 ${
                                                isTodayDay
                                                    ? 'border-[#dc2626] bg-[#dc2626] font-bold text-white shadow-md shadow-[#dc2626]/20 hover:bg-[#dc2626]/80'
                                                    : 'border-[#27272a] bg-zinc-900/30 text-zinc-300'
                                            }`}
                                        >
                                            <span className="text-xs font-semibold">{day}</span>

                                            {dayEvents.length > 0 && (
                                                <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                                                    {dayEvents.slice(0, 3).map((event) => (
                                                        <span
                                                            key={event.id}
                                                            className="h-1.5 w-1.5 rounded-full"
                                                            style={{ backgroundColor: event.color }}
                                                        />
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className={`text-[7px] font-bold leading-none ${isTodayDay ? 'text-white/80' : 'text-zinc-500'}`}>
                                                            +
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <aside className="flex min-h-[300px] flex-col justify-between rounded-2xl border border-[#27272a] bg-[#18181b]/50 p-5 shadow-sm xl:col-span-4">
                            <div>
                                <div className="mb-4 flex items-center justify-between border-b border-[#27272a] pb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-white">Compromisos / Agenda</span>
                                    <span className="rounded border border-[#dc2626]/20 bg-[#dc2626]/10 px-2 py-0.5 text-[10px] font-bold text-[#dc2626]">
                                        {upcomingEvents.length} activos
                                    </span>
                                </div>

                                <div className="custom-scrollbar max-h-[320px] space-y-3 overflow-y-auto pr-1">
                                    {upcomingEvents.slice(0, 5).length === 0 ? (
                                        <div className="py-12 text-center text-xs italic text-zinc-600">
                                            Sin compromisos agendados.
                                        </div>
                                    ) : (
                                        upcomingEvents.slice(0, 5).map((event) => (
                                            <div
                                                key={event.id}
                                                className="flex items-start gap-3 rounded-xl border border-white/5 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700"
                                            >
                                                <span
                                                    className="h-8 w-1 shrink-0 rounded-full"
                                                    style={{ backgroundColor: event.color }}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <p className="m-0 truncate text-xs font-bold leading-tight text-white">{event.title}</p>
                                                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                                                        <Clock size={10} />
                                                        <span>{formatEventDate(event.date)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => openNewEvent()}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-colors hover:from-red-500 hover:to-red-600"
                            >
                                <Plus size={14} />
                                Agendar compromiso
                            </button>
                        </aside>
                    </div>

                    <section className="w-full space-y-4 rounded-2xl border border-[#27272a] bg-[#18181b]/50 p-4 shadow-sm">
                        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                            <div className="flex w-full gap-6 border-b border-[#27272a] md:w-auto">
                                {['Proximos', 'Pasados', 'Todos'].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`relative pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                                            activeTab === tab
                                                ? 'text-[#dc2626]'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                    >
                                        {tab}
                                        {activeTab === tab && (
                                            <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-t-full bg-[#dc2626]" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                            <div className="flex items-center rounded-lg border border-[#27272a] bg-zinc-900 px-3 py-2 text-zinc-400 transition-colors focus-within:border-zinc-600">
                                <Search size={14} className="shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Buscar por titulo, notas..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="ml-2 w-full border-none bg-transparent text-xs font-medium text-white outline-none placeholder:text-zinc-600"
                                />
                            </div>

                            <div className="flex items-center rounded-lg border border-[#27272a] bg-zinc-900 px-3 py-2 text-zinc-400">
                                <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-wider">Desde:</span>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(event) => setDateFrom(event.target.value)}
                                    className="w-full border-none bg-transparent text-xs font-medium text-white outline-none [color-scheme:dark]"
                                />
                            </div>

                            <div className="flex items-center rounded-lg border border-[#27272a] bg-zinc-900 px-3 py-2 text-zinc-400">
                                <span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-wider">Hasta:</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(event) => setDateTo(event.target.value)}
                                    className="w-full border-none bg-transparent text-xs font-medium text-white outline-none [color-scheme:dark]"
                                />
                            </div>

                            <div className="flex items-center rounded-lg border border-[#27272a] bg-zinc-900 px-3 py-2 text-zinc-400">
                                <Filter size={12} className="mr-2 shrink-0" />
                                <select
                                    value={selectedTypeFilter}
                                    onChange={(event) => setSelectedTypeFilter(event.target.value)}
                                    className="w-full cursor-pointer appearance-none border-none bg-transparent text-xs font-medium text-white outline-none"
                                >
                                    <option value="Todos los tipos">Todos los tipos</option>
                                    {EVENT_TYPES.map((type) => (
                                        <option key={type} value={type}>{eventTypeLabel(type)}</option>
                                    ))}
                                </select>
                            </div>

                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-[#27272a] bg-[#18181b]/50 shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#27272a] bg-zinc-900/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white">
                            <span>Lista de Eventos ({filteredEvents.length} encontrados)</span>
                        </div>

                        <div className="divide-y divide-[#27272a]">
                            {filteredEvents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-sm text-zinc-500">
                                    <CalendarIcon size={32} className="text-zinc-800" />
                                    <span>Sin resultados o no hay eventos cargados.</span>
                                </div>
                            ) : (
                                filteredEvents.map((event) => (
                                    <EventListRow
                                        key={event.id}
                                        event={event}
                                        onCompleteCrmTask={handleCompleteCrmTask}
                                        onCompleteLeadTask={handleCompleteLeadTask}
                                        onEditCrmTask={handleEditCrmTask}
                                    />
                                ))
                            )}
                        </div>
                    </section>
                </>
            )}

            <CrmTaskModal
                isOpen={isCrmTaskModalOpen}
                onClose={() => {
                    setIsCrmTaskModalOpen(false);
                    setSelectedTaskForEdit(null);
                    setTaskDefaultData(null);
                }}
                task={selectedTaskForEdit}
                defaultData={taskDefaultData}
                onSave={handleSaveCrmTask}
            />
        </div>
    );
}
