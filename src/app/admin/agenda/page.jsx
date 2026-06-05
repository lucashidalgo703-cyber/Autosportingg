"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Bell,
    CalendarCheck,
    CalendarDays,
    CalendarPlus,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    Filter,
    Link2,
    Plus,
    RefreshCw,
    Search,
    User
} from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import CrmTaskModal from '../../../components/crm/agenda/CrmTaskModal';

const MONTHS = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
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

const toDateKey = (date) => {
    if (!date) return '';
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
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

const formatMonthLabel = (date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

const formatShortDate = (date) => {
    if (!date) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

const formatDayTitle = (date) => {
    if (!date) return '';
    const dayName = WEEK_DAYS[(date.getDay() + 6) % 7];
    return `${dayName} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
};

const getEventTone = (type, priority) => {
    if (priority === 'alta') return 'border-crm-red/30 bg-crm-red/10 text-red-200';

    const tones = {
        venta: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
        cobranza: 'border-amber-500/25 bg-amber-500/10 text-amber-200',
        documentacion: 'border-blue-500/25 bg-blue-500/10 text-blue-200',
        entrega: 'border-purple-500/25 bg-purple-500/10 text-purple-200',
        postventa: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-200',
        cotizacion: 'border-crm-red/25 bg-crm-red/10 text-red-200',
        general: 'border-crm-border bg-crm-bg text-crm-fg-muted'
    };

    return tones[type] || tones.general;
};

const getEventDot = (type, priority) => {
    if (priority === 'alta') return 'bg-crm-red';

    const dots = {
        venta: 'bg-emerald-400',
        cobranza: 'bg-amber-400',
        documentacion: 'bg-blue-400',
        entrega: 'bg-purple-400',
        postventa: 'bg-cyan-400',
        cotizacion: 'bg-crm-red',
        general: 'bg-crm-fg-muted'
    };

    return dots[type] || dots.general;
};

const sortEventsAsc = (a, b) => a.date.getTime() - b.date.getTime();
const sortEventsDesc = (a, b) => b.date.getTime() - a.date.getTime();

function CalendarEventRow({ event, onCompleteCrmTask, onCompleteLeadTask, onEditCrmTask, compact = false }) {
    return (
        <div className="group rounded-xl border border-crm-border bg-crm-bg p-3 transition-colors hover:border-crm-red/30 hover:bg-crm-surface-raised">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${getEventDot(event.type, event.priority)}`} />
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-crm-fg-muted">
                            {event.typeLabel}
                        </span>
                        {event.time && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-crm-fg-muted">
                                <Clock size={12} />
                                {event.time}
                            </span>
                        )}
                    </div>
                    <p className="m-0 mt-2 truncate text-sm font-bold text-crm-fg">{event.title}</p>
                    {!compact && (
                        <p className="m-0 mt-1 line-clamp-2 text-xs text-crm-fg-muted">
                            {event.subtitle || 'Evento de calendario'}
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-crm-fg-muted">
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays size={12} />
                            {formatShortDate(event.date)}
                        </span>
                        {event.owner && (
                            <span className="inline-flex items-center gap-1">
                                <User size={12} />
                                {event.owner}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {event.href && (
                        <a
                            href={event.href}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg-muted transition-colors hover:border-crm-red/40 hover:text-crm-red"
                            aria-label="Ver detalle"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                    {event.kind === 'crm-task' && (
                        <button
                            type="button"
                            onClick={() => onEditCrmTask(event.rawTask)}
                            className="hidden h-8 rounded-lg border border-crm-border bg-crm-surface px-3 text-xs font-bold text-crm-fg transition-colors hover:border-crm-red/40 hover:text-crm-red sm:inline-flex sm:items-center"
                        >
                            Editar
                        </button>
                    )}
                </div>
            </div>

            {(event.kind === 'crm-task' || event.kind === 'lead-task') && !compact && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-crm-border pt-3">
                    <button
                        type="button"
                        onClick={() => {
                            if (event.kind === 'crm-task') onCompleteCrmTask(event.taskId);
                            if (event.kind === 'lead-task') onCompleteLeadTask(event.leadId, event.taskId);
                        }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200 transition-colors hover:bg-emerald-500/15"
                    >
                        <CheckCircle2 size={14} />
                        Completar
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AdminAgendaPage() {
    const { leads, loading: loadingLeads, error: errorLeads, fetchLeads, updateTaskStatus } = useAdminLeads();
    const { tasks: crmTasks, loading: loadingTasks, error: errorTasks, fetchTasks, createTask: createCrmTask, updateTask: updateCrmTask } = useAdminCrmTasks();

    const [filters, setFilters] = useState({
        search: '',
        type: '',
        priority: '',
        owner: '',
        range: ''
    });
    const [activeView, setActiveView] = useState('calendario');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth(), 1);
    });
    const [selectedDayKey, setSelectedDayKey] = useState(() => toDateKey(todayStart()));
    const [isCrmTaskModalOpen, setIsCrmTaskModalOpen] = useState(false);
    const [selectedTaskForEdit, setSelectedTaskForEdit] = useState(null);

    useEffect(() => {
        fetchLeads({ limit: 500 });
        fetchTasks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                        subtitle: vehicleName || lead.phone || 'Seguimiento comercial',
                        date,
                        dateKey: toDateKey(date),
                        time: lead.nextActionTime || '',
                        priority: lead.priority || 'media',
                        status: lead.crmStatus || 'pendiente',
                        owner,
                        href: leadHref,
                        rawLead: lead
                    });
                }
            }

            const pendingTasks = Array.isArray(lead.tasks)
                ? lead.tasks.filter((task) => task.status !== 'completada' && task.status !== 'cancelada')
                : [];

            pendingTasks.forEach((task) => {
                const date = parseDate(task.dueDate);
                if (!date) return;

                events.push({
                    id: `lead-task-${lead._id}-${task._id}`,
                    kind: 'lead-task',
                    type: task.type || 'cotizacion',
                    typeLabel: task.type || 'Cotizacion',
                    title: task.title || `Seguimiento ${leadName}`,
                    subtitle: vehicleName || leadName,
                    date,
                    dateKey: toDateKey(date),
                    time: task.dueTime || '',
                    priority: task.priority || lead.priority || 'media',
                    status: task.status || 'pendiente',
                    owner,
                    href: leadHref,
                    leadId: lead._id,
                    taskId: task._id,
                    rawLead: lead
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

            let href = null;
            if (saleId) href = `/admin/ventas/${saleId}`;
            else if (leadId) href = `/admin/leads/${leadId}`;
            else if (clientId) href = `/admin/clientes/${clientId}`;
            else if (vehicleId) href = `/admin/stock/${vehicleId}`;

            events.push({
                id: `crm-task-${task._id}`,
                kind: 'crm-task',
                type: task.type || 'general',
                typeLabel: task.type || 'General',
                title: task.title || 'Evento CRM',
                subtitle: task.description || clientName || vehicleName || 'Recordatorio operativo',
                date,
                dateKey: toDateKey(date),
                time: task.dueTime || '',
                priority: task.priority || 'media',
                status: task.status || 'pendiente',
                owner,
                href,
                taskId: task._id,
                rawTask: task
            });
        });

        return events.sort(sortEventsAsc);
    }, [leads, crmTasks]);

    const ownerOptions = useMemo(() => {
        return Array.from(new Set(normalizedEvents.map((event) => event.owner).filter(Boolean))).sort();
    }, [normalizedEvents]);

    const visibleEvents = useMemo(() => {
        const today = todayStart();
        const next7Days = addDays(today, 7);

        return normalizedEvents.filter((event) => {
            if (filters.type && event.type !== filters.type) return false;
            if (filters.priority && event.priority !== filters.priority) return false;
            if (filters.owner && event.owner !== filters.owner) return false;

            if (filters.search) {
                const search = filters.search.toLowerCase();
                const haystack = [
                    event.title,
                    event.subtitle,
                    event.typeLabel,
                    event.owner,
                    event.time
                ].join(' ').toLowerCase();

                if (!haystack.includes(search)) return false;
            }

            if (filters.range === 'hoy' && event.dateKey !== toDateKey(today)) return false;
            if (filters.range === 'semana' && (event.date < today || event.date > next7Days)) return false;
            if (
                filters.range === 'mes' &&
                (event.date.getMonth() !== selectedMonth.getMonth() || event.date.getFullYear() !== selectedMonth.getFullYear())
            ) return false;

            return true;
        });
    }, [normalizedEvents, filters, selectedMonth]);

    const calendarDays = useMemo(() => {
        const firstOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        const startOffset = (firstOfMonth.getDay() + 6) % 7;
        const gridStart = addDays(firstOfMonth, -startOffset);

        return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    }, [selectedMonth]);

    const eventsByDay = useMemo(() => {
        return visibleEvents.reduce((acc, event) => {
            if (!acc[event.dateKey]) acc[event.dateKey] = [];
            acc[event.dateKey].push(event);
            return acc;
        }, {});
    }, [visibleEvents]);

    const todayKey = toDateKey(todayStart());
    const selectedDayDate = parseDate(selectedDayKey);
    const selectedDayEvents = eventsByDay[selectedDayKey] || [];
    const upcomingEvents = visibleEvents.filter((event) => event.date >= todayStart()).sort(sortEventsAsc).slice(0, 8);
    const pastEvents = visibleEvents.filter((event) => event.date < todayStart()).sort(sortEventsDesc);
    const allEvents = [...visibleEvents].sort(sortEventsAsc);

    const viewEvents = {
        proximos: upcomingEvents.length ? upcomingEvents : visibleEvents.filter((event) => event.date >= todayStart()).sort(sortEventsAsc),
        pasados: pastEvents,
        todos: allEvents
    };

    const counters = {
        total: visibleEvents.length,
        today: visibleEvents.filter((event) => event.dateKey === todayKey).length,
        next: visibleEvents.filter((event) => event.date >= todayStart()).length,
        overdue: visibleEvents.filter((event) => event.date < todayStart()).length
    };

    const clearFilters = () => {
        setFilters({ search: '', type: '', priority: '', owner: '', range: '' });
    };

    const moveMonth = (amount) => {
        setSelectedMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    };

    const goToday = () => {
        const today = todayStart();
        setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        setSelectedDayKey(toDateKey(today));
    };

    const loading = loadingLeads || loadingTasks;

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 pb-24 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Calendario</h1>
                        <span className="rounded border border-crm-red/20 bg-crm-red/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-red">
                            Operacion
                        </span>
                    </div>
                    <p className="m-0 mt-1 text-sm text-crm-fg-muted">
                        Vista mensual, proximos eventos y tareas operativas del equipo.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-bold text-emerald-200 transition-colors hover:bg-emerald-500/15"
                    >
                        <Link2 size={16} />
                        Google Calendar
                        <span className="rounded bg-crm-bg px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-crm-fg-muted">
                            Sin conectar
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedTaskForEdit(null);
                            setIsCrmTaskModalOpen(true);
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-crm-red px-4 text-sm font-bold text-white shadow-crm-red transition-colors hover:bg-crm-red-hover"
                    >
                        <Plus size={18} />
                        Nuevo evento
                    </button>
                </div>
            </div>

            <div className="border-b border-crm-border">
                <div className="flex flex-wrap gap-5">
                    {[
                        { id: 'calendario', label: 'Calendario', icon: CalendarDays, count: counters.total },
                        { id: 'proximos', label: 'Proximos', icon: Clock, count: counters.next },
                        { id: 'pasados', label: 'Pasados', icon: RefreshCw, count: counters.overdue },
                        { id: 'todos', label: 'Todos', icon: CalendarCheck, count: normalizedEvents.length }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const active = activeView === tab.id;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveView(tab.id)}
                                className={`inline-flex h-11 items-center gap-2 border-b-2 bg-transparent px-1 text-sm font-bold transition-colors ${
                                    active
                                        ? 'border-crm-red text-crm-red'
                                        : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                                <span className={active ? 'text-crm-red' : 'text-crm-fg-muted'}>{tab.count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 md:p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                        <input
                            type="search"
                            value={filters.search}
                            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                            placeholder="Buscar eventos, clientes, vehiculos..."
                            className="h-10 w-full rounded-lg border border-crm-border bg-crm-bg py-2 pl-9 pr-3 text-sm text-crm-fg outline-none transition-colors placeholder:text-crm-fg-muted focus:border-crm-red focus:ring-1 focus:ring-crm-red/30"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:flex xl:shrink-0">
                        <select
                            value={filters.range}
                            onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}
                            className="h-10 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red/30"
                        >
                            <option value="">Todas las fechas</option>
                            <option value="hoy">Hoy</option>
                            <option value="semana">Prox. 7 dias</option>
                            <option value="mes">Mes visible</option>
                        </select>
                        <select
                            value={filters.type}
                            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                            className="h-10 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red/30"
                        >
                            <option value="">Todos los tipos</option>
                            {EVENT_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                        <select
                            value={filters.owner}
                            onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))}
                            className="h-10 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red/30"
                        >
                            <option value="">Todos los creadores</option>
                            {ownerOptions.map((owner) => (
                                <option key={owner} value={owner}>{owner}</option>
                            ))}
                        </select>
                        <select
                            value={filters.priority}
                            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
                            className="h-10 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm text-crm-fg outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red/30"
                        >
                            <option value="">Prioridad</option>
                            <option value="alta">Alta</option>
                            <option value="media">Media</option>
                            <option value="baja">Baja</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm font-bold text-crm-fg-muted transition-colors hover:border-crm-red/30 hover:text-crm-fg"
                    >
                        <Filter size={16} />
                        Limpiar
                    </button>
                </div>
            </div>

            {errorLeads && (
                <div className="flex items-center gap-2 rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    <AlertCircle size={18} />
                    No se pudieron cargar las cotizaciones del calendario. {errorLeads}
                </div>
            )}

            {errorTasks && !errorLeads && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                    <AlertCircle size={18} />
                    No se pudieron cargar las tareas CRM. Solo veras eventos de cotizaciones. {errorTasks}
                </div>
            )}

            {loading ? (
                <div className="flex h-72 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                        <span className="text-sm text-crm-fg-muted">Cargando calendario...</span>
                    </div>
                </div>
            ) : activeView === 'calendario' ? (
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <section className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
                        <div className="flex flex-col gap-3 border-b border-crm-border p-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-crm-fg-muted">Vista mensual</p>
                                <h2 className="m-0 mt-1 text-xl font-bold capitalize text-crm-fg">{formatMonthLabel(selectedMonth)}</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => moveMonth(-1)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-crm-border bg-crm-bg text-crm-fg-muted transition-colors hover:border-crm-red/30 hover:text-crm-red"
                                    aria-label="Mes anterior"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={goToday}
                                    className="inline-flex h-9 items-center rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-bold text-crm-fg transition-colors hover:border-crm-red/30 hover:text-crm-red"
                                >
                                    Hoy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveMonth(1)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-crm-border bg-crm-bg text-crm-fg-muted transition-colors hover:border-crm-red/30 hover:text-crm-red"
                                    aria-label="Mes siguiente"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="hidden md:block">
                            <div className="grid grid-cols-7 border-b border-crm-border bg-crm-bg">
                                {WEEK_DAYS.map((day) => (
                                    <div key={day} className="border-r border-crm-border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-crm-fg-muted last:border-r-0">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7">
                                {calendarDays.map((day) => {
                                    const key = toDateKey(day);
                                    const events = eventsByDay[key] || [];
                                    const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
                                    const isToday = key === todayKey;
                                    const isSelected = key === selectedDayKey;

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedDayKey(key)}
                                            className={`min-h-[132px] border-b border-r border-crm-border bg-crm-surface p-2 text-left transition-colors last:border-r-0 hover:bg-crm-surface-raised ${
                                                !isCurrentMonth ? 'opacity-45' : ''
                                            } ${isSelected ? 'bg-crm-red/5 ring-1 ring-inset ring-crm-red/30' : ''}`}
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-2">
                                                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                                                    isToday ? 'bg-crm-red text-white' : 'text-crm-fg'
                                                }`}>
                                                    {day.getDate()}
                                                </span>
                                                {events.length > 0 && (
                                                    <span className="rounded-full bg-crm-bg px-2 py-0.5 text-[10px] font-bold text-crm-fg-muted">
                                                        {events.length}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                {events.slice(0, 3).map((event) => (
                                                    <span
                                                        key={event.id}
                                                        className={`min-w-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${getEventTone(event.type, event.priority)}`}
                                                    >
                                                        <span className="block truncate">{event.time ? `${event.time} ` : ''}{event.title}</span>
                                                    </span>
                                                ))}
                                                {events.length > 3 && (
                                                    <span className="rounded-md border border-crm-border bg-crm-bg px-2 py-1 text-[11px] font-semibold text-crm-fg-muted">
                                                        +{events.length - 3} mas
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid gap-3 p-3 md:hidden">
                            {calendarDays
                                .filter((day) => day.getMonth() === selectedMonth.getMonth())
                                .map((day) => {
                                    const key = toDateKey(day);
                                    const events = eventsByDay[key] || [];
                                    const isToday = key === todayKey;

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setSelectedDayKey(key)}
                                            className={`rounded-xl border p-3 text-left transition-colors ${
                                                key === selectedDayKey
                                                    ? 'border-crm-red/40 bg-crm-red/10'
                                                    : 'border-crm-border bg-crm-bg hover:bg-crm-surface-raised'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-crm-fg">
                                                    {formatDayTitle(day)}
                                                </span>
                                                <span className={isToday ? 'text-xs font-bold text-crm-red' : 'text-xs text-crm-fg-muted'}>
                                                    {isToday ? 'Hoy' : `${events.length} eventos`}
                                                </span>
                                            </div>
                                            {events.length > 0 && (
                                                <div className="mt-3 flex flex-col gap-2">
                                                    {events.slice(0, 2).map((event) => (
                                                        <span key={event.id} className="truncate rounded-lg border border-crm-border bg-crm-surface px-2 py-1 text-xs text-crm-fg-muted">
                                                            {event.time ? `${event.time} - ` : ''}{event.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                        </div>
                    </section>

                    <aside className="flex flex-col gap-4">
                        <div className="rounded-xl border border-crm-border bg-crm-surface p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-crm-fg-muted">Dia seleccionado</p>
                                    <h3 className="m-0 mt-1 text-lg font-bold text-crm-fg">
                                        {selectedDayDate ? formatDayTitle(selectedDayDate) : 'Sin fecha'}
                                    </h3>
                                </div>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-crm-red/20 bg-crm-red/10 text-crm-red">
                                    <CalendarCheck size={18} />
                                </span>
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                {selectedDayEvents.length > 0 ? (
                                    selectedDayEvents.map((event) => (
                                        <CalendarEventRow
                                            key={event.id}
                                            event={event}
                                            onCompleteCrmTask={handleCompleteCrmTask}
                                            onCompleteLeadTask={handleCompleteLeadTask}
                                            onEditCrmTask={handleEditCrmTask}
                                            compact
                                        />
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-crm-border bg-crm-bg p-4 text-center">
                                        <CalendarPlus size={24} className="mx-auto text-crm-fg-muted" />
                                        <p className="m-0 mt-2 text-sm font-bold text-crm-fg">Sin eventos</p>
                                        <p className="m-0 mt-1 text-xs text-crm-fg-muted">No hay tareas ni seguimientos para este dia.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-crm-border bg-crm-surface p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-crm-fg-muted">Proximos</p>
                                    <h3 className="m-0 mt-1 text-lg font-bold text-crm-fg">Agenda activa</h3>
                                </div>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-200">
                                    <Bell size={18} />
                                </span>
                            </div>

                            <div className="mt-4 flex flex-col gap-3">
                                {upcomingEvents.length > 0 ? (
                                    upcomingEvents.slice(0, 5).map((event) => (
                                        <CalendarEventRow
                                            key={event.id}
                                            event={event}
                                            onCompleteCrmTask={handleCompleteCrmTask}
                                            onCompleteLeadTask={handleCompleteLeadTask}
                                            onEditCrmTask={handleEditCrmTask}
                                            compact
                                        />
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-dashed border-crm-border bg-crm-bg p-4 text-center text-sm text-crm-fg-muted">
                                        No hay proximos eventos con los filtros actuales.
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                <section className="rounded-xl border border-crm-border bg-crm-surface p-4">
                    <div className="flex flex-col gap-2 border-b border-crm-border pb-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-crm-fg-muted">
                                {activeView === 'proximos' ? 'Agenda futura' : activeView === 'pasados' ? 'Historial' : 'Todos los eventos'}
                            </p>
                            <h2 className="m-0 mt-1 text-xl font-bold text-crm-fg">
                                {activeView === 'proximos' ? 'Proximos eventos' : activeView === 'pasados' ? 'Eventos pasados' : 'Calendario completo'}
                            </h2>
                        </div>
                        <span className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-xs font-bold text-crm-fg-muted">
                            {(viewEvents[activeView] || []).length} resultados
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {(viewEvents[activeView] || []).length > 0 ? (
                            viewEvents[activeView].map((event) => (
                                <CalendarEventRow
                                    key={event.id}
                                    event={event}
                                    onCompleteCrmTask={handleCompleteCrmTask}
                                    onCompleteLeadTask={handleCompleteLeadTask}
                                    onEditCrmTask={handleEditCrmTask}
                                />
                            ))
                        ) : (
                            <div className="col-span-full rounded-xl border border-dashed border-crm-border bg-crm-bg p-8 text-center">
                                <CalendarDays size={30} className="mx-auto text-crm-fg-muted" />
                                <p className="m-0 mt-3 text-sm font-bold text-crm-fg">Sin eventos para mostrar</p>
                                <p className="m-0 mt-1 text-xs text-crm-fg-muted">Ajusta los filtros o crea un nuevo evento.</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

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
