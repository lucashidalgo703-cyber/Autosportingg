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
        card: 'border-red-500/40 bg-red-950/20',
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
        card: 'border-emerald-500/40 bg-emerald-950/25',
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
        card: 'border-yellow-500/40 bg-yellow-950/20',
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
        card: 'border-blue-500/40 bg-blue-950/20',
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

function AlertCard({ alert, theme, onDismiss }) {
    const Icon = alert.icon || Bell;

    return (
        <article className={`relative rounded-xl border p-4 shadow-sm ${theme.card}`}>
            <div className="flex items-start gap-3">
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/20 text-[8px] font-black uppercase text-blue-300">
                    {alert.mark || 'new'}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className={`m-0 text-sm font-bold ${theme.text}`}>{alert.title}</h3>
                            <p className="m-0 mt-1 text-xs font-medium text-zinc-400">{alert.date}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${theme.badge}`}>
                                {alert.badge}
                            </span>
                            <button
                                type="button"
                                onClick={() => onDismiss(alert.id)}
                                className="m-0 inline-flex h-7 w-7 appearance-none items-center justify-center rounded-lg border-0 bg-transparent p-0 text-zinc-500 transition-colors hover:text-white"
                                aria-label="Descartar alerta"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <p className="m-0 mt-2 max-w-3xl text-xs leading-relaxed text-zinc-400">
                        {alert.description}
                    </p>

                    <Link
                        href={alert.href}
                        className={`mt-2 inline-flex text-xs font-bold no-underline ${theme.text}`}
                    >
                        {alert.action} →
                    </Link>
                </div>
            </div>
        </article>
    );
}

function AlertSection({ group, alerts, onDismiss }) {
    return (
        <section className="space-y-3">
            <div className="flex items-center gap-3">
                <ChevronDown size={15} className="text-zinc-500" />
                <span className={`h-4 w-4 rounded-full ${group.dot}`} />
                <h2 className={`m-0 text-sm font-black uppercase tracking-[0.08em] ${group.text}`}>{group.title}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${group.pill}`}>
                    {alerts.length}
                </span>
            </div>

            {alerts.length === 0 ? (
                <p className="m-0 pl-7 text-sm italic text-zinc-500">{group.empty}</p>
            ) : (
                <div className="pl-0">
                    {alerts.map((alert) => (
                        <AlertCard key={alert.id} alert={alert} theme={group} onDismiss={onDismiss} />
                    ))}
                </div>
            )}
        </section>
    );
}

export default function AdminAlertasPage() {
    const [loading, setLoading] = useState(true);
    const [dismissedIds, setDismissedIds] = useState([]);
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
                    title: task.title || 'Tarea vencida',
                    date: formatDate(task.dueDate),
                    description: task.description || 'Tarea del calendario que requiere atención inmediata.',
                    href: '/admin/agenda',
                    action: 'Ver Agenda',
                    badge: 'Alta',
                    mark: '!'
                });
            });

        activeSales
            .filter((sale) => ['incidencia', 'pendiente', 'contactado'].includes(String(sale.postSaleStatus || '').toLowerCase()))
            .slice(0, 5)
            .forEach((sale) => {
                items.push({
                    id: `postventa-${sale._id}`,
                    category: 'Alta',
                    title: `Postventa pendiente — ${shortId(sale._id)}`,
                    date: sale.postSaleStatus || 'Pendiente',
                    description: 'La operación requiere seguimiento de postventa.',
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
                const name = `${car.brand || ''} ${car.name || car.model || ''} ${car.year || ''}`.replace(/\s+/g, ' ').trim() || 'Vehículo en stock';
                const price = car.currency && car.price ? `${car.currency} ${Number(car.price).toLocaleString('es-AR')}` : 'Sin precio publicado';
                items.push({
                    id: `stock-new-${car._id || car.id}`,
                    category: 'Novedades',
                    title: `Nuevo vehículo en stock — ${name}`,
                    date: formatDate(car.createdAt || car.updatedAt),
                    description: `Ingresó hace poco. Estado: ${car.status || 'Disponible'}. Precio: ${price}. Ubicación: ${car.location || 'Stock principal'}.`,
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
                    title: `Documentación pendiente — ${shortId(sale._id)}`,
                    date: sale.documentationStatus || 'Pendiente',
                    description: 'La operación tiene documentación sin completar.',
                    href: '/admin/documentacion',
                    action: 'Ver Documentación',
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
                    category: 'Media',
                    title: task.title || 'Tarea para hoy',
                    date: 'Hoy',
                    description: task.description || 'Compromiso programado para hoy.',
                    href: '/admin/agenda',
                    action: 'Ver Agenda',
                    badge: 'Media',
                    mark: 'cal',
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
                const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name || 'Cotización';
                items.push({
                    id: `lead-${lead._id}`,
                    category: 'Media',
                    title: `Cotización sin avance — ${name}`,
                    date: formatDate(lead.nextActionDate || lead.updatedAt || lead.createdAt),
                    description: 'La cotización activa necesita seguimiento comercial.',
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
                    title: `Reserva activa — ${shortId(reservation._id)}`,
                    date: reservation.status || 'Activa',
                    description: 'Reserva activa pendiente de seguimiento o conversión.',
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
                    <h1 className="m-0 text-2xl font-bold tracking-tight text-white">
                        Centro de Alertas
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-zinc-400">
                        Items que requieren atención, ordenados por prioridad
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    {groups.map((group) => (
                        <div
                            key={group.key}
                            className={`flex h-[70px] flex-col items-center justify-center rounded-xl border px-4 py-2.5 ${group.counter}`}
                        >
                            <span className="text-3xl font-black leading-none">{groupedAlerts[group.key]?.length || 0}</span>
                            <span className="mt-1 text-xs font-bold">{group.short}</span>
                        </div>
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
                    {groups.map((group) => (
                        <AlertSection
                            key={group.key}
                            group={group}
                            alerts={groupedAlerts[group.key] || []}
                            onDismiss={(id) => setDismissedIds((prev) => [...prev, id])}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
