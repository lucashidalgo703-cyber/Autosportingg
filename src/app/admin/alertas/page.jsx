"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    Bell,
    Calendar,
    Check,
    ChevronRight,
    Clock,
    FileText,
    Flag,
    Sparkles,
    Users
} from 'lucide-react';

const priorityConfig = {
    Alta: {
        border: 'border-l-red-600',
        badge: 'border-red-600/20 bg-red-600/10 text-red-500',
        counterActive: 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
        counterText: 'text-red-500'
    },
    Novedades: {
        border: 'border-l-emerald-500',
        badge: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
        counterActive: 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        counterText: 'text-emerald-400'
    },
    Media: {
        border: 'border-l-amber-500',
        badge: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
        counterActive: 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]',
        counterText: 'text-amber-400'
    },
    Baja: {
        border: 'border-l-blue-500',
        badge: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
        counterActive: 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]',
        counterText: 'text-blue-400'
    }
};

const tabs = ['Todas', 'Alta', 'Novedades', 'Media', 'Baja'];

const toArray = (value) => Array.isArray(value) ? value : [];

const getId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || value.id || '';
};

const formatShortId = (value) => {
    const id = getId(value);
    return id ? id.toString().slice(-6).toUpperCase() : 'SIN ID';
};

const isPendingStatus = (status) => String(status || '').toLowerCase() === 'pendiente';

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

export default function AdminAlertasPage() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Todas');
    const [data, setData] = useState({
        tasks: [],
        leads: [],
        sales: [],
        reservations: [],
        goals: []
    });

    useEffect(() => {
        const loadAlerts = async () => {
            setLoading(true);

            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const [tasksRes, leadsRes, salesRes, reservationsRes, goalsRes] = await Promise.all([
                    fetch('/api/admin/crm-tasks', { headers }),
                    fetch('/api/leads', { headers }),
                    fetch('/api/admin/sales', { headers }),
                    fetch('/api/admin/reservations', { headers }),
                    fetch('/api/admin/team-goals/progress', { headers }).catch(() => ({ ok: false }))
                ]);

                const tasks = tasksRes.ok ? await tasksRes.json() : [];
                const leads = leadsRes.ok ? await leadsRes.json() : [];
                const sales = salesRes.ok ? await salesRes.json() : [];
                const reservations = reservationsRes.ok ? await reservationsRes.json() : [];
                const goals = goalsRes && goalsRes.ok ? await goalsRes.json() : [];

                setData({
                    tasks: toArray(tasks),
                    leads: toArray(leads),
                    sales: toArray(sales),
                    reservations: toArray(reservations),
                    goals: toArray(goals)
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
        const pendingTasks = data.tasks.filter((task) => isPendingStatus(task.status));
        const overdueTasks = pendingTasks.filter((task) => {
            const date = normalizeDate(task.dueDate);
            return date && date < today;
        });
        const todayTasks = pendingTasks.filter((task) => {
            const date = normalizeDate(task.dueDate);
            return date && date.getTime() === today.getTime();
        });
        const activeLeads = data.leads.filter((lead) => !['perdido', 'convertido'].includes(String(lead.crmStatus || '').toLowerCase()));
        const activeReservations = data.reservations.filter((reservation) => String(reservation.status || '').toLowerCase() === 'activa');
        const activeSales = data.sales.filter((sale) => !['entregada', 'cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase()));
        const postSalePendings = activeSales.filter((sale) => ['incidencia', 'pendiente', 'contactado'].includes(String(sale.postSaleStatus || '').toLowerCase()));
        const docPendings = activeSales.filter((sale) => String(sale.documentationStatus || '').toLowerCase() !== 'completo');
        const slowLeads = activeLeads.filter((lead) => {
            const date = normalizeDate(lead.nextActionDate || lead.updatedAt || lead.createdAt);
            if (!date) return false;
            const days = Math.floor((today.getTime() - date.getTime()) / 86400000);
            return days >= 7;
        });

        const items = [];

        overdueTasks.slice(0, 8).forEach((task) => {
            items.push({
                id: `task-${task._id}`,
                category: 'Alta',
                title: task.title || 'Tarea vencida',
                description: task.description || 'Tarea del calendario que requiere atencion inmediata.',
                date: formatDate(task.dueDate),
                icon: AlertTriangle,
                actionLabel: 'Ver agenda',
                href: '/admin/agenda'
            });
        });

        postSalePendings.slice(0, 6).forEach((sale) => {
            items.push({
                id: `postventa-${sale._id}`,
                category: 'Alta',
                title: `Postventa pendiente: ${formatShortId(sale._id)}`,
                description: `La venta ${formatShortId(sale._id)} requiere seguimiento de postventa.`,
                date: sale.postSaleStatus || 'Pendiente',
                icon: AlertTriangle,
                actionLabel: 'Ver postventa',
                href: '/admin/postventa'
            });
        });

        docPendings.slice(0, 6).forEach((sale) => {
            items.push({
                id: `doc-${sale._id}`,
                category: 'Media',
                title: `Documentacion pendiente: ${formatShortId(sale._id)}`,
                description: 'La operacion tiene documentacion sin completar.',
                date: sale.documentationStatus || 'Pendiente',
                icon: FileText,
                actionLabel: 'Ver documentacion',
                href: '/admin/documentacion'
            });
        });

        todayTasks.slice(0, 6).forEach((task) => {
            items.push({
                id: `today-${task._id}`,
                category: 'Media',
                title: task.title || 'Tarea para hoy',
                description: task.description || 'Compromiso programado para el dia de hoy.',
                date: 'Hoy',
                icon: Calendar,
                actionLabel: 'Ver agenda',
                href: '/admin/agenda'
            });
        });

        slowLeads.slice(0, 5).forEach((lead) => {
            const name = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.name || 'Cotizacion';
            items.push({
                id: `lead-${lead._id}`,
                category: 'Media',
                title: `Cotizacion sin avance: ${name}`,
                description: 'Esta cotizacion activa necesita seguimiento comercial.',
                date: formatDate(lead.nextActionDate || lead.updatedAt || lead.createdAt),
                icon: Users,
                actionLabel: 'Ver cotizaciones',
                href: '/admin/leads'
            });
        });

        activeReservations.slice(0, 4).forEach((reservation) => {
            items.push({
                id: `reservation-${reservation._id}`,
                category: 'Baja',
                title: `Reserva activa: ${formatShortId(reservation._id)}`,
                description: 'Reserva activa pendiente de seguimiento o conversion.',
                date: reservation.status || 'Activa',
                icon: Bell,
                actionLabel: 'Ver reservas',
                href: '/admin/reservas'
            });
        });

        data.goals.slice(0, 4).forEach((goal) => {
            items.push({
                id: `goal-${goal.goalId || goal._id || goal.userId}`,
                category: 'Baja',
                title: `Meta activa: ${goal.periodLabel || goal.periodType || 'Periodo actual'}`,
                description: `Avance general registrado: ${goal.overallPercent || 0}%.`,
                date: goal.endDate ? `Vence ${formatDate(goal.endDate)}` : 'En curso',
                icon: Flag,
                actionLabel: 'Ver metas',
                href: '/admin/metas'
            });
        });

        items.unshift({
            id: 'system-news',
            category: 'Novedades',
            title: 'Centro de alertas AutoSporting',
            description: 'Panel unificado de tareas demoradas, avisos comerciales y seguimiento operativo.',
            date: 'Hoy',
            icon: Sparkles,
            actionLabel: 'Ver dashboard',
            href: '/admin'
        });

        return items;
    }, [data, today]);

    const counts = useMemo(() => {
        return alerts.reduce((acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, { Alta: 0, Novedades: 0, Media: 0, Baja: 0 });
    }, [alerts]);

    const displayAlerts = activeTab === 'Todas'
        ? alerts
        : alerts.filter((alert) => alert.category === activeTab);

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-zinc-500">
                Revisando panel de alertas...
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-24 pt-6 font-sans text-[#f4f4f5] animate-in fade-in duration-300 md:px-6 md:pt-7">
            <div className="flex flex-col justify-between gap-4 border-b border-[#33333a] pb-6 md:flex-row md:items-center">
                <div>
                    <h1 className="m-0 flex items-center gap-3 text-2xl font-bold tracking-tight text-white">
                        Alertas
                    </h1>
                    <p className="m-0 mt-1 text-sm font-medium text-zinc-500">
                        Notificaciones dinamicas del sistema, tareas demoradas y avisos operativos.
                    </p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {tabs.slice(1).map((tab) => {
                        const config = priorityConfig[tab];
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`m-0 flex h-12 w-16 cursor-pointer appearance-none flex-col items-center justify-center rounded-xl border transition-all ${
                                    isActive
                                        ? config.counterActive
                                        : 'border-[#33333a] bg-[#18181b]/40 hover:border-zinc-700'
                                }`}
                                title={`Prioridad ${tab}`}
                            >
                                <span className={`text-lg font-bold tracking-tight ${config.counterText}`}>
                                    {counts[tab] || 0}
                                </span>
                                <span className="mt-0.5 text-[7px] font-bold uppercase leading-none tracking-widest text-zinc-500">
                                    {tab === 'Novedades' ? 'NOV' : tab.toUpperCase()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeTab !== 'Todas' && (
                <div className="flex justify-start">
                    <button
                        type="button"
                        onClick={() => setActiveTab('Todas')}
                        className="m-0 flex appearance-none items-center gap-1.5 rounded-lg border border-[#33333a] bg-[#18181b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-white"
                    >
                        <span>Ver todas las alertas</span>
                        <ChevronRight size={12} />
                    </button>
                </div>
            )}

            <section className="w-full space-y-4">
                {displayAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#33333a] bg-[#18181b]/50 py-16 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 shadow-lg">
                            <Check size={22} strokeWidth={3} />
                        </div>
                        <h3 className="mt-2 text-sm font-bold uppercase tracking-wider text-white">Todo en orden</h3>
                        <p className="text-xs font-medium text-zinc-500">
                            No hay alertas de prioridad "{activeTab}" pendientes en este momento.
                        </p>
                    </div>
                ) : (
                    <div className="grid w-full grid-cols-1 gap-3">
                        {displayAlerts.map((alert) => {
                            const Icon = alert.icon || Bell;
                            const config = priorityConfig[alert.category] || priorityConfig.Media;

                            return (
                                <article
                                    key={alert.id}
                                    className={`group flex flex-col justify-between gap-4 rounded-r-xl border border-white/5 border-l-4 bg-[#18181b]/50 p-5 transition-all hover:border-white/10 sm:flex-row sm:items-center ${config.border}`}
                                >
                                    <div className="flex flex-1 items-start gap-4">
                                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#33333a] bg-[#1e1e24] text-zinc-400">
                                            <Icon size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${config.badge}`}>
                                                    {alert.category}
                                                </span>
                                                <h4 className="m-0 text-sm font-bold text-white">{alert.title}</h4>
                                            </div>
                                            <p className="m-0 max-w-2xl text-xs font-medium leading-relaxed text-zinc-400">
                                                {alert.description}
                                            </p>
                                            <div className="flex items-center gap-1.5 pt-1 text-[10px] font-medium text-zinc-500">
                                                <Clock size={11} />
                                                <span>Estado: {alert.date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="shrink-0 border-t border-[#27272a] pt-3 sm:border-none sm:pt-0">
                                        <Link
                                            href={alert.href}
                                            className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${config.badge}`}
                                        >
                                            {alert.actionLabel}
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
