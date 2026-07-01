"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    CalendarDays,
    Check,
    ChevronDown,
    FileWarning,
    MessageCircle,
    Sparkles,
    UserRoundCheck,
    X,
    Filter
} from 'lucide-react';

const groups = [
    {
        key: 'Alta',
        emoji: '🔴',
        title: 'PRIORIDAD ALTA',
        short: 'Alta',
        empty: 'Sin alertas de prioridad alta.',
        tone: 'red',
        dot: 'bg-crm-red',
        text: 'text-red-300',
        counter: 'border-crm-red/35 bg-crm-red/10 text-red-200',
        card: 'border-crm-red/25 bg-crm-red/10',
        icon: 'bg-crm-red/15 text-red-200'
    },
    {
        key: 'Novedades',
        emoji: '🟢',
        title: 'NOVEDADES',
        short: 'Novedades',
        empty: 'Sin novedades recientes.',
        tone: 'emerald',
        dot: 'bg-emerald-500',
        text: 'text-emerald-300',
        counter: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
        card: 'border-emerald-500/25 bg-emerald-500/10',
        icon: 'bg-emerald-500/15 text-emerald-200'
    },
    {
        key: 'Media',
        emoji: '🟡',
        title: 'PRIORIDAD MEDIA',
        short: 'Media',
        empty: 'Sin alertas de prioridad media.',
        tone: 'amber',
        dot: 'bg-amber-400',
        text: 'text-amber-300',
        counter: 'border-amber-500/35 bg-amber-500/10 text-amber-200',
        card: 'border-amber-500/25 bg-amber-500/10',
        icon: 'bg-amber-500/15 text-amber-200'
    },
    {
        key: 'Baja',
        emoji: '🔵',
        title: 'PRIORIDAD BAJA',
        short: 'Baja',
        empty: 'Sin alertas de prioridad baja.',
        tone: 'blue',
        dot: 'bg-blue-500',
        text: 'text-blue-300',
        counter: 'border-blue-500/35 bg-blue-500/10 text-blue-200',
        card: 'border-blue-500/25 bg-blue-500/10',
        icon: 'bg-blue-500/15 text-blue-200'
    }
];

const groupByKey = Object.fromEntries(groups.map((group) => [group.key, group]));

const collectionFrom = (value, keys = []) => {
    if (Array.isArray(value)) return value;
    for (const key of keys) {
        if (Array.isArray(value?.[key])) return value[key];
    }
    return [];
};

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const formatDate = (value) => {
    const date = normalizeDate(value);
    return date ? date.toLocaleDateString('es-AR') : 'Pendiente';
};

const shortId = (value) => {
    const raw = typeof value === 'string' ? value : value?._id || value?.id || '';
    return raw ? raw.toString().slice(-6).toUpperCase() : 'SIN ID';
};

const isPending = (status) => String(status || '').toLowerCase() === 'pendiente';

const isActiveVehicle = (status) => {
    const value = String(status || '').toLowerCase();
    return ['disponible', 'publicado', 'activo', ''].includes(value);
};

const daysSince = (value, fallback = 999) => {
    const date = normalizeDate(value);
    if (!date) return fallback;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - date.getTime()) / 86400000);
};

const capitalize = (value) => {
    const text = String(value || '').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

const getTaskDetail = (task) => {
    const time = task.dueTime || task.time || task.hour || '';
    const type = capitalize(task.type || task.category || task.source || 'General');
    return [time, type, 'Para: Todos'].filter(Boolean).join(' · ');
};

async function safeFetchJson(endpoint, keys = [], timeoutMs = 6500) {
    const token = localStorage.getItem('token');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal
        });

        if (!response.ok) return [];
        const data = await response.json().catch(() => []);
        return collectionFrom(data, keys);
    } catch (error) {
        return [];
    } finally {
        window.clearTimeout(timeout);
    }
}

function AlertCard({ alert, onDismiss }) {
    const group = groupByKey[alert.category] || groupByKey.Baja;
    const Icon = alert.icon || Sparkles;

    return (
        <article className={`relative flex gap-3 rounded-xl border p-4 shadow-none ${group.card}`}>
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${group.icon}`}>
                <Icon size={18} />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="m-0 text-sm font-bold leading-5 text-crm-fg">{alert.title}</h3>
                        <p className="m-0 mt-1 text-xs font-medium leading-4 text-crm-fg-muted">
                            {alert.badge} — {alert.description}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => onDismiss(alert.id)}
                        className="m-0 inline-flex h-7 w-7 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                        aria-label="Cerrar alerta"
                    >
                        <X size={14} />
                    </button>
                </div>

                <Link
                    href={alert.href}
                    className={`mt-3 inline-flex text-xs font-bold leading-4 no-underline ${group.text} hover:text-crm-fg`}
                >
                    {alert.action} →
                </Link>
            </div>
        </article>
    );
}

function AlertSection({ group, alerts, isOpen, onToggle, onDismiss }) {
    const sectionId = `alert-section-${group.key.toLowerCase()}`;

    return (
        <section className="space-y-3">
            <button
                type="button"
                onClick={onToggle}
                className="group -mx-1 flex w-[calc(100%+8px)] appearance-none items-center gap-3 rounded-lg border-0 bg-transparent p-1 text-left transition-colors hover:bg-white/[0.03]"
                aria-label={`${group.emoji} ${group.title} ${alerts.length}`}
                aria-expanded={isOpen}
                aria-controls={sectionId}
            >
                <ChevronDown
                    size={15}
                    className={`shrink-0 text-crm-fg-muted transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
                <span className="text-sm leading-none">{group.emoji}</span>
                <h2 className={`m-0 text-sm font-black uppercase leading-5 tracking-[0.08em] ${group.text}`}>
                    {group.title}
                </h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black leading-4 ${group.counter}`}>
                    {alerts.length}
                </span>
            </button>

            {isOpen && (
                <div id={sectionId}>
                    {alerts.length === 0 ? (
                        <p className="m-0 pl-1 text-sm italic leading-5 text-crm-fg-muted">{group.empty}</p>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map((alert) => (
                                <AlertCard key={alert.id} alert={alert} onDismiss={onDismiss} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

export default function AdminAlertasPage() {
    const [loading, setLoading] = useState(true);
    const [dismissedIds, setDismissedIds] = useState([]);
    const [closedGroups, setClosedGroups] = useState({});
    const [data, setData] = useState({
        tasks: [],
        leads: [],
        sales: [],
        reservations: [],
        cars: []
    });
    
    const [filterType, setFilterType] = useState('Todas');
    const [filterOwner, setFilterOwner] = useState('Todos');

    // Load dismissed alerts from local storage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('dismissedAlerts');
            if (stored) {
                setDismissedIds(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to parse dismissed alerts from local storage', e);
        }
    }, []);

    const handleDismiss = (id) => {
        setDismissedIds((prev) => {
            const next = [...prev, id];
            try {
                localStorage.setItem('dismissedAlerts', JSON.stringify(next));
            } catch (e) {}
            return next;
        });
    };

    useEffect(() => {
        let mounted = true;

        const loadAlerts = async () => {
            setLoading(true);

            const [tasks, leads, sales, reservations, cars] = await Promise.all([
                safeFetchJson('/api/admin/crm-tasks', ['tasks']),
                safeFetchJson('/api/leads', ['leads']),
                safeFetchJson('/api/admin/sales', ['sales']),
                safeFetchJson('/api/admin/reservations', ['reservations']),
                safeFetchJson('/api/admin/cars', ['cars'])
            ]);

            if (!mounted) return;
            setData({ tasks, leads, sales, reservations, cars });
            setLoading(false);
        };

        loadAlerts();

        return () => {
            mounted = false;
        };
    }, []);

    const today = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    const alerts = useMemo(() => {
        const items = [
            {
                id: 'novedad-whatsapp-contacto',
                category: 'Novedades',
                title: '📱 Registrá tu WhatsApp de contacto',
                description: 'Cargá el WhatsApp de tu agencia en Configuración → Empresa para que podamos contactarte fácil por novedades o soporte.',
                href: '/admin/configuracion/general',
                action: 'Ir a Configuración',
                badge: 'Novedad',
                icon: MessageCircle,
                owner: 'Sistema',
                date: null
            }
        ];

        const pendingTasks = data.tasks.filter((task) => isPending(task.status));
        const activeSales = data.sales.filter((sale) => !['entregada', 'cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()));
        const activeLeads = data.leads.filter((lead) => !['perdido', 'convertido'].includes(String(lead.crmStatus || '').toLowerCase()));

        pendingTasks
            .filter((task) => {
                const date = normalizeDate(task.dueDate);
                return date && date < today;
            })
            .forEach((task) => {
                items.push({
                    id: `task-overdue-${task._id || task.id}`,
                    category: 'Alta',
                    title: `📅 Vencida — ${task.title || 'tarea pendiente'}`,
                    description: getTaskDetail(task) || task.description || 'Requiere atención inmediata.',
                    href: '/admin/agenda',
                    action: 'Ver Calendario',
                    badge: formatDate(task.dueDate),
                    icon: CalendarDays,
                    owner: task.assignedTo?.name || task.assignedTo || 'Equipo',
                    date: normalizeDate(task.dueDate)
                });
            });

        pendingTasks
            .filter((task) => {
                const date = normalizeDate(task.dueDate);
                return date && date.getTime() === today.getTime();
            })
            .forEach((task) => {
                items.push({
                    id: `task-today-${task._id || task.id}`,
                    category: 'Alta',
                    title: `📅 Hoy — ${task.title || 'evento'}`,
                    description: getTaskDetail(task),
                    href: '/admin/agenda',
                    action: 'Ver Calendario',
                    badge: formatDate(task.dueDate),
                    icon: CalendarDays,
                    owner: task.assignedTo?.name || task.assignedTo || 'Equipo',
                    date: normalizeDate(task.dueDate)
                });
            });

        activeSales
            .filter((sale) => String(sale.documentationStatus || '').toLowerCase() !== 'completo')
            .forEach((sale) => {
                items.push({
                    id: `doc-${sale._id || sale.id}`,
                    category: 'Media',
                    title: `📄 Documentación pendiente — ${shortId(sale._id || sale.id)}`,
                    description: 'La operación tiene documentación sin completar.',
                    href: '/admin/documentacion',
                    action: 'Ver Documentación',
                    badge: sale.documentationStatus || 'Pendiente',
                    icon: FileWarning,
                    owner: sale.salesperson || sale.assignedTo?.name || 'Ventas',
                    date: normalizeDate(sale.createdAt || sale.updatedAt)
                });
            });

        activeLeads
            .filter((lead) => daysSince(lead.nextActionDate || lead.updatedAt || lead.createdAt, 0) >= 7)
            .forEach((lead) => {
                const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name || 'Cotización';
                items.push({
                    id: `lead-${lead._id || lead.id}`,
                    category: 'Media',
                    title: `👤 Cotización sin avance — ${name}`,
                    description: 'La cotización activa necesita seguimiento comercial.',
                    href: '/admin/leads',
                    action: 'Ver Cotizaciones',
                    badge: formatDate(lead.nextActionDate || lead.updatedAt || lead.createdAt),
                    icon: UserRoundCheck,
                    owner: lead.assignedTo?.name || lead.assignedTo || 'Ventas',
                    date: normalizeDate(lead.nextActionDate || lead.updatedAt || lead.createdAt)
                });
            });

        data.cars
            .filter((car) => isActiveVehicle(car.status) && daysSince(car.createdAt || car.updatedAt) <= 3)
            .forEach((car) => {
                const name = `${car.brand || ''} ${car.name || car.model || ''} ${car.year || ''}`.replace(/\s+/g, ' ').trim() || 'Vehículo en stock';
                items.push({
                    id: `stock-new-${car._id || car.id}`,
                    category: 'Novedades',
                    title: `🚗 Nuevo vehículo en stock — ${name}`,
                    description: `Estado: ${car.status || 'Disponible'}. Ubicación: ${car.location || 'Stock principal'}.`,
                    href: `/admin/stock/${car._id || car.id}`,
                    action: 'Ver Stock',
                    badge: 'Novedad',
                    icon: Sparkles,
                    owner: 'Sistema',
                    date: normalizeDate(car.createdAt || car.updatedAt)
                });
            });

        data.reservations
            .filter((reservation) => String(reservation.status || '').toLowerCase() === 'activa')
            .forEach((reservation) => {
                items.push({
                    id: `reservation-${reservation._id || reservation.id}`,
                    category: 'Baja',
                    title: `🔎 Reserva activa — ${shortId(reservation._id || reservation.id)}`,
                    description: 'Reserva activa pendiente de seguimiento o conversión.',
                    href: '/admin/ventas',
                    action: 'Ver Ventas',
                    badge: 'Baja',
                    icon: Sparkles,
                    owner: reservation.salesperson || reservation.assignedTo?.name || 'Ventas',
                    date: normalizeDate(reservation.createdAt || reservation.updatedAt)
                });
            });

        let filtered = items.filter((item) => !dismissedIds.includes(item.id));
        
        if (filterType !== 'Todas') {
            filtered = filtered.filter(item => item.category === filterType);
        }
        
        if (filterOwner !== 'Todos') {
            filtered = filtered.filter(item => item.owner === filterOwner);
        }
        
        // Ordenamiento por fecha dentro de la prioridad (las más antiguas primero, es decir las más vencidas)
        filtered.sort((a, b) => {
            if (!a.date) return -1;
            if (!b.date) return 1;
            return a.date.getTime() - b.date.getTime();
        });

        return filtered;
    }, [data, dismissedIds, today, filterType, filterOwner]);

    const ownersList = useMemo(() => {
        const owners = new Set();
        alerts.forEach(alert => {
            if (alert.owner) owners.add(alert.owner);
        });
        return ['Todos', ...Array.from(owners).sort()];
    }, [alerts]);

    const groupedAlerts = useMemo(() => {
        return groups.reduce((acc, group) => {
            acc[group.key] = alerts.filter((alert) => alert.category === group.key);
            return acc;
        }, {});
    }, [alerts]);

    const toggleGroup = (key) => {
        setClosedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="mx-auto w-full max-w-[720px] space-y-7 px-4 pb-24 pt-6 font-sans text-crm-fg md:px-0 md:pt-7">
            <div className="flex flex-col justify-between gap-5 border-b border-crm-border pb-6 lg:flex-row lg:items-start">
                <div>
                    <h1 className="m-0 text-xl font-bold leading-7 tracking-tight text-crm-fg">
                        Centro de Alertas
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-crm-fg-muted">
                        Items que requieren atención, ordenados por prioridad
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    {groups.map((group) => (
                        <button
                            type="button"
                            key={group.key}
                            onClick={() => toggleGroup(group.key)}
                            className={`m-0 flex h-[70px] appearance-none flex-col items-center justify-center rounded-xl border px-4 py-2.5 transition-opacity hover:opacity-90 ${group.counter} ${closedGroups[group.key] ? 'opacity-55' : ''}`}
                            aria-label={`${closedGroups[group.key] ? 'Abrir' : 'Ocultar'} ${group.title}`}
                        >
                            <span className="text-3xl font-black leading-none">{groupedAlerts[group.key]?.length || 0}</span>
                            <span className="mt-1 text-xs font-bold">{group.short}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex w-full sm:w-auto h-10 items-center rounded-lg border border-crm-border bg-crm-surface px-3 text-zinc-400">
                    <Filter size={14} className="mr-2 shrink-0" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full cursor-pointer appearance-none border-none bg-transparent text-sm font-bold text-white outline-none"
                    >
                        <option value="Todas">Todas las prioridades</option>
                        {groups.map(g => (
                            <option key={g.key} value={g.key}>{g.title}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex w-full sm:w-auto h-10 items-center rounded-lg border border-crm-border bg-crm-surface px-3 text-zinc-400">
                    <UserRoundCheck size={14} className="mr-2 shrink-0" />
                    <select
                        value={filterOwner}
                        onChange={(e) => setFilterOwner(e.target.value)}
                        className="w-full cursor-pointer appearance-none border-none bg-transparent text-sm font-bold text-white outline-none"
                    >
                        {ownersList.map(owner => (
                            <option key={owner} value={owner}>{owner === 'Todos' ? 'Todos los responsables' : owner}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <section className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-center">
                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                    <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-crm-fg-muted">
                        Revisando panel de alertas...
                    </p>
                </section>
            ) : (
                <div className="space-y-9">
                    {groups.map((group) => (
                        <AlertSection
                            key={group.key}
                            group={group}
                            alerts={groupedAlerts[group.key] || []}
                            isOpen={!closedGroups[group.key]}
                            onToggle={() => toggleGroup(group.key)}
                            onDismiss={handleDismiss}
                        />
                    ))}

                    {alerts.length === 0 && (
                        <section className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface text-center">
                            <Check size={42} className="mb-4 text-emerald-500/50" />
                            <h3 className="m-0 text-sm font-bold text-crm-fg">Todo en orden</h3>
                            <p className="m-0 mt-2 text-sm text-crm-fg-muted">No hay alertas pendientes en este momento.</p>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
