"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    Bell,
    Calendar,
    Check,
    ChevronDown,
    Clock,
    FileText,
    Sparkles,
    Users,
    X
} from 'lucide-react';

const groups = [
    {
        key: 'Alta',
        title: 'PRIORIDAD ALTA',
        short: 'Alta',
        empty: 'Sin alertas de prioridad alta.',
        dot: 'bg-red-500',
        text: 'text-red-400',
        pill: 'bg-red-500/15 text-red-200',
        counter: 'border-red-500/35 bg-red-500/10 text-red-300',
        badge: 'bg-red-500/15 text-red-200'
    },
    {
        key: 'Novedades',
        title: 'NOVEDADES',
        short: 'Novedades',
        empty: 'Sin novedades recientes.',
        dot: 'bg-emerald-500',
        text: 'text-emerald-400',
        pill: 'bg-emerald-500/15 text-emerald-200',
        counter: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
        badge: 'bg-emerald-500/15 text-emerald-200'
    },
    {
        key: 'Media',
        title: 'PRIORIDAD MEDIA',
        short: 'Media',
        empty: 'Sin alertas de prioridad media.',
        dot: 'bg-yellow-400',
        text: 'text-yellow-300',
        pill: 'bg-yellow-500/15 text-yellow-200',
        counter: 'border-yellow-500/35 bg-yellow-500/10 text-yellow-300',
        badge: 'bg-yellow-500/15 text-yellow-200'
    },
    {
        key: 'Baja',
        title: 'PRIORIDAD BAJA',
        short: 'Baja',
        empty: 'Sin alertas de prioridad baja.',
        dot: 'bg-blue-500',
        text: 'text-blue-300',
        pill: 'bg-blue-500/15 text-blue-200',
        counter: 'border-blue-500/35 bg-blue-500/10 text-blue-300',
        badge: 'bg-blue-500/15 text-blue-200'
    }
];

const toArray = (value) => Array.isArray(value) ? value : [];

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
const isActiveVehicle = (status) => ['disponible', 'publicado', 'activo', ''].includes(String(status || '').toLowerCase());

const isRecent = (value, maxDays = 3) => {
    const date = normalizeDate(value);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((today.getTime() - date.getTime()) / 86400000) <= maxDays;
};

const capitalize = (value) => {
    const text = String(value || '').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

const getTaskDetail = (task) => {
    const time = task.dueTime || task.time || task.hour || '';
    const type = capitalize(task.type || task.category || task.source || 'Entrega');
    return [time, type, 'Para: Todos'].filter(Boolean).join(' \u00b7 ');
};

function AlertCard({ alert, onDismiss }) {
    return (
        <article className="relative flex gap-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 p-4 shadow-none">
            <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
            <span className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center text-sm leading-5">
                {alert.mark || '\u{1F4C5}'}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="m-0 text-sm font-semibold leading-5 text-indigo-300">{alert.title}</h3>
                        <p className="m-0 mt-1 text-xs font-medium leading-4 text-zinc-400">{alert.date}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold leading-4 text-indigo-200">
                            {alert.badge}
                        </span>
                        <button
                            type="button"
                            onClick={() => onDismiss(alert.id)}
                            className="m-0 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-lg border-0 bg-transparent p-0 text-zinc-500 transition-colors hover:text-white"
                            aria-label="Descartar alerta"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>

                <p className="m-0 mt-1 text-xs leading-4 text-zinc-400">
                    {alert.description}
                </p>

                <Link
                    href={alert.href}
                    className="mt-2 inline-flex text-xs font-semibold leading-4 text-indigo-300 no-underline hover:text-indigo-200"
                >
                    {alert.action}{' \u2192'}
                </Link>
            </div>
        </article>
    );
}

function AlertSection({ group, alerts, isOpen, onToggle, onDismiss }) {
    const sectionId = `alert-section-${group.key.toLowerCase()}`;

    return (
        <section className="space-y-4">
            <button
                type="button"
                onClick={onToggle}
                className="group -mx-1 flex w-[calc(100%+8px)] appearance-none items-center gap-3 rounded-lg border-0 bg-transparent p-1 text-left transition-colors hover:bg-white/[0.03]"
                aria-label={group.title}
                aria-expanded={isOpen}
                aria-controls={sectionId}
            >
                <ChevronDown
                    size={15}
                    className={`shrink-0 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                />
                <span className={`h-4 w-4 shrink-0 rounded-full ${group.dot}`} />
                <h2 className={`m-0 text-sm font-bold uppercase leading-5 tracking-[0.08em] ${group.text}`}>{group.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-4 ${group.pill}`}>
                    {alerts.length}
                </span>
            </button>

            {isOpen && (
                <div id={sectionId}>
                    {alerts.length === 0 ? (
                        <p className="m-0 pl-1 text-sm italic leading-5 text-zinc-500">{group.empty}</p>
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
        goals: [],
        cars: []
    });

    useEffect(() => {
        const loadAlerts = async () => {
            setLoading(true);

            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const [tasksRes, leadsRes, salesRes, reservationsRes, goalsRes, carsRes] = await Promise.all([
                    fetch('/api/admin/crm-tasks', { headers }),
                    fetch('/api/leads', { headers }),
                    fetch('/api/admin/sales', { headers }),
                    fetch('/api/admin/reservations', { headers }),
                    fetch('/api/admin/team-goals/progress', { headers }).catch(() => ({ ok: false })),
                    fetch('/api/admin/cars', { headers }).catch(() => ({ ok: false }))
                ]);

                setData({
                    tasks: tasksRes.ok ? toArray(await tasksRes.json()) : [],
                    leads: leadsRes.ok ? toArray(await leadsRes.json()) : [],
                    sales: salesRes.ok ? toArray(await salesRes.json()) : [],
                    reservations: reservationsRes.ok ? toArray(await reservationsRes.json()) : [],
                    goals: goalsRes && goalsRes.ok ? toArray(await goalsRes.json()) : [],
                    cars: carsRes && carsRes.ok ? toArray(await carsRes.json()) : []
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        loadAlerts();
    }, []);

    const today = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    const alerts = useMemo(() => {
        const items = [];
        const pendingTasks = data.tasks.filter((task) => isPending(task.status));
        const activeSales = data.sales.filter((sale) => !['entregada', 'cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()));
        const activeLeads = data.leads.filter((lead) => !['perdido', 'convertido'].includes(String(lead.crmStatus || '').toLowerCase()));

        pendingTasks
            .filter((task) => {
                const date = normalizeDate(task.dueDate);
                return date && date < today;
            })
            .slice(0, 6)
            .forEach((task) => {
                items.push({
                    id: `task-overdue-${task._id}`,
                    category: 'Alta',
                    title: `Vencida \u2014 ${task.title || 'tarea pendiente'}`,
                    date: formatDate(task.dueDate),
                    description: getTaskDetail(task) || task.description || 'Requiere atencion inmediata.',
                    href: '/admin/agenda',
                    action: 'Ver Calendario',
                    badge: 'Alta',
                    mark: '\u{1F4C5}'
                });
            });

        activeSales
            .filter((sale) => ['incidencia', 'pendiente', 'contactado'].includes(String(sale.postSaleStatus || '').toLowerCase()))
            .slice(0, 5)
            .forEach((sale) => {
                items.push({
                    id: `postventa-${sale._id}`,
                    category: 'Alta',
                    title: `Postventa pendiente \u2014 ${shortId(sale._id)}`,
                    date: sale.postSaleStatus || 'Pendiente',
                    description: 'La operacion requiere seguimiento de postventa.',
                    href: '/admin/postventa',
                    action: 'Ver Postventa',
                    badge: 'Alta',
                    mark: '!'
                });
            });

        data.cars
            .filter((car) => isActiveVehicle(car.status) && isRecent(car.createdAt || car.updatedAt))
            .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0))
            .slice(0, 3)
            .forEach((car) => {
                const name = `${car.brand || ''} ${car.name || car.model || ''} ${car.year || ''}`.replace(/\s+/g, ' ').trim() || 'Vehiculo en stock';
                const price = car.currency && car.price ? `${car.currency} ${Number(car.price).toLocaleString('es-AR')}` : 'Sin precio publicado';
                items.push({
                    id: `stock-new-${car._id || car.id}`,
                    category: 'Novedades',
                    title: `Nuevo vehiculo en stock \u2014 ${name}`,
                    date: formatDate(car.createdAt || car.updatedAt),
                    description: `Ingreso hace poco. Estado: ${car.status || 'Disponible'}. Precio: ${price}. Ubicacion: ${car.location || 'Stock principal'}.`,
                    href: `/admin/stock/${car._id || car.id}`,
                    action: 'Ver Stock',
                    badge: 'Novedad',
                    mark: 'new',
                    icon: Sparkles
                });
            });

        activeSales
            .filter((sale) => String(sale.documentationStatus || '').toLowerCase() !== 'completo')
            .slice(0, 6)
            .forEach((sale) => {
                items.push({
                    id: `doc-${sale._id}`,
                    category: 'Media',
                    title: `Documentacion pendiente \u2014 ${shortId(sale._id)}`,
                    date: sale.documentationStatus || 'Pendiente',
                    description: 'La operacion tiene documentacion sin completar.',
                    href: '/admin/documentacion',
                    action: 'Ver Documentacion',
                    badge: 'Media',
                    mark: 'doc',
                    icon: FileText
                });
            });

        pendingTasks
            .filter((task) => {
                const date = normalizeDate(task.dueDate);
                return date && date.getTime() === today.getTime();
            })
            .slice(0, 5)
            .forEach((task) => {
                items.push({
                    id: `task-today-${task._id}`,
                    category: 'Alta',
                    title: `Hoy \u2014 ${task.title || 'evento'}`,
                    date: formatDate(task.dueDate),
                    description: getTaskDetail(task),
                    href: '/admin/agenda',
                    action: 'Ver Calendario',
                    badge: 'Alta',
                    mark: '\u{1F4C5}',
                    icon: Calendar
                });
            });

        activeLeads
            .filter((lead) => {
                const date = normalizeDate(lead.nextActionDate || lead.updatedAt || lead.createdAt);
                if (!date) return false;
                return Math.floor((today.getTime() - date.getTime()) / 86400000) >= 7;
            })
            .slice(0, 5)
            .forEach((lead) => {
                const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name || 'Cotizacion';
                items.push({
                    id: `lead-${lead._id}`,
                    category: 'Media',
                    title: `Cotizacion sin avance \u2014 ${name}`,
                    date: formatDate(lead.nextActionDate || lead.updatedAt || lead.createdAt),
                    description: 'La cotizacion activa necesita seguimiento comercial.',
                    href: '/admin/leads',
                    action: 'Ver Cotizaciones',
                    badge: 'Media',
                    mark: 'crm',
                    icon: Users
                });
            });

        data.reservations
            .filter((reservation) => String(reservation.status || '').toLowerCase() === 'activa')
            .slice(0, 4)
            .forEach((reservation) => {
                items.push({
                    id: `reservation-${reservation._id}`,
                    category: 'Baja',
                    title: `Reserva activa \u2014 ${shortId(reservation._id)}`,
                    date: reservation.status || 'Activa',
                    description: 'Reserva activa pendiente de seguimiento o conversion.',
                    href: '/admin/reservas',
                    action: 'Ver Reservas',
                    badge: 'Baja',
                    mark: 'res'
                });
            });

        return items.filter((item) => !dismissedIds.includes(item.id));
    }, [data, dismissedIds, today]);

    const groupedAlerts = useMemo(() => {
        return groups.reduce((acc, group) => {
            acc[group.key] = alerts.filter((alert) => alert.category === group.key);
            return acc;
        }, {});
    }, [alerts]);

    const totalAlerts = alerts.length;
    const visibleGroups = groups.filter((group) => {
        if (group.key === 'Novedades') return (groupedAlerts.Novedades || []).length > 0;
        return group.key === 'Alta' || group.key === 'Media' || group.key === 'Baja';
    });
    const toggleGroup = (key) => {
        setClosedGroups((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-zinc-500">
                Revisando panel de alertas...
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[720px] space-y-7 px-4 pb-24 pt-6 font-sans text-[#f4f4f5] animate-in fade-in duration-300 md:px-0 md:pt-7">
            <div className="flex flex-col justify-between gap-5 border-b border-[#27272a] pb-6 lg:flex-row lg:items-start">
                <div>
                    <h1 className="m-0 text-xl font-semibold leading-7 tracking-tight text-white">
                        Centro de Alertas
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-zinc-400">
                        {'Items que requieren atenci\u00f3n, ordenados por prioridad'}
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

            {totalAlerts === 0 ? (
                <section className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-[#33333a] bg-[#1e1e24] text-center">
                    <Check size={46} strokeWidth={2.5} className="mb-5 text-zinc-500/70" />
                    <h3 className="m-0 text-sm font-bold text-white">Todo en orden</h3>
                    <p className="m-0 mt-2 text-sm text-zinc-400">No hay alertas pendientes en este momento.</p>
                </section>
            ) : (
                <div className="space-y-9">
                    {visibleGroups.map((group) => (
                        <AlertSection
                            key={group.key}
                            group={group}
                            alerts={groupedAlerts[group.key] || []}
                            isOpen={!closedGroups[group.key]}
                            onToggle={() => toggleGroup(group.key)}
                            onDismiss={(id) => setDismissedIds((prev) => [...prev, id])}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
