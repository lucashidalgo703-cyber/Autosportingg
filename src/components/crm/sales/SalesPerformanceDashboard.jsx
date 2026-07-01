import React from 'react';
import { Target, TrendingUp, Trophy, Filter, Award } from 'lucide-react';

export default function SalesPerformanceDashboard({
    goalData,
    goalLoading,
    currentUser,
    totals,
    mySales,
    myReservations
}) {
    const goals = Array.isArray(goalData) ? goalData : [];
    const currentUserIds = [currentUser?.id, currentUser?.userId, currentUser?._id]
        .filter(Boolean)
        .map(String);
    const currentUserNames = [currentUser?.email, currentUser?.username, currentUser?.name, currentUser?.displayName]
        .filter(Boolean)
        .map(value => String(value).toLowerCase());

    const belongsToCurrentUser = (goal) => {
        const goalUser = goal?.userId;
        const goalUserId = typeof goalUser === 'object' ? goalUser?._id : goalUser;
        const goalUserNames = [goalUser?.email, goalUser?.name]
            .filter(Boolean)
            .map(value => String(value).toLowerCase());

        return (
            (goalUserId && currentUserIds.includes(String(goalUserId))) ||
            goalUserNames.some(value => currentUserNames.includes(value))
        );
    };

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentGoal = goals
        .filter(belongsToCurrentUser)
        .filter(goal => {
            const start = goal.startDate ? new Date(goal.startDate).getTime() : 0;
            const end = goal.endDate ? new Date(goal.endDate).getTime() : 0;
            return start <= now.getTime() && now.getTime() <= end;
        })
        .sort((a, b) => new Date(b.endDate || 0) - new Date(a.endDate || 0))[0] || null;

    const getGoalMetric = (goal) => {
        if (!goal?.progress) return null;

        const salesMetric = goal.progress.salesUpdated;
        if (salesMetric?.target > 0) {
            return {
                real: salesMetric.real || 0,
                target: salesMetric.target,
                label: 'ventas actualizadas',
                percent: salesMetric.percent ?? goal.overallPercent ?? 0
            };
        }

        const metrics = Object.values(goal.progress).filter(metric => metric?.target > 0);
        if (metrics.length === 0) return null;

        const real = metrics.reduce((sum, metric) => sum + (metric.real || 0), 0);
        const target = metrics.reduce((sum, metric) => sum + (metric.target || 0), 0);
        return {
            real,
            target,
            label: 'acciones',
            percent: goal.overallPercent ?? (target > 0 ? Math.round((real / target) * 100) : 0)
        };
    };

    const goalMetric = getGoalMetric(currentGoal);

    // Default goal fallback if no active goal is found (as requested in plan)
    const fallbackGoalMetric = {
        real: closedSales?.length || 0,
        target: 10,
        label: 'ventas',
        percent: ((closedSales?.length || 0) / 10) * 100
    };
    const activeMetric = goalMetric || fallbackGoalMetric;

    // Niveles Logic
    const getLevel = (percent) => {
        if (percent >= 100) return { title: 'Top Seller', icon: '🏆', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' };
        if (percent >= 50) return { title: 'En Ritmo', icon: '🔥', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20' };
        return { title: 'Arrancando', icon: '🌱', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    };
    
    const userLevel = getLevel(activeMetric.percent || 0);

    const monthSales = mySales.filter(s => {
        const d = new Date(s.saleDate || s.createdAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonth;
    });

    const monthReservations = myReservations.filter(r => {
        const d = new Date(r.createdAt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === currentMonth;
    });

    const activeReservations = monthReservations.filter(r => r.status === 'activa' || r.status === 'pendiente');
    const closedSales = monthSales.filter(s => ['entregada'].includes(s.status));
    const inProgressSales = monthSales.filter(s => ['confirmada', 'pendiente_entrega'].includes(s.status));

    const funnelLeads = '--';
    const funnelReservations = monthReservations.length;
    const funnelSales = closedSales.length + inProgressSales.length;

    const totalVendidoUSD = closedSales.reduce((acc, sale) => {
        if (sale.saleCurrency === 'USD') return acc + (sale.salePrice || 0);
        return acc;
    }, 0);

    return (
        <div className="flex flex-col gap-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="text-crm-red" size={20} />
                        <h2 className="text-base font-bold text-crm-fg m-0">Objetivo Mensual</h2>
                    </div>
                    {goalLoading ? (
                        <div className="animate-pulse h-16 bg-crm-border/30 rounded-lg" />
                    ) : (
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-end gap-3 mb-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${userLevel.bg} ${userLevel.color}`}>
                                    <span className="text-sm">{userLevel.icon}</span>
                                    <span className="text-xs font-bold uppercase tracking-wide">{userLevel.title}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-end gap-3">
                                <span className="text-3xl font-bold text-crm-fg">{activeMetric.real}</span>
                                <span className="text-sm font-medium text-crm-fg-muted mb-1">/ {activeMetric.target} {activeMetric.label}</span>
                            </div>
                            <div className="w-full bg-crm-border rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-crm-red h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(activeMetric.percent || 0, 100)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 text-xs text-crm-fg-muted mt-1">
                                <span className="truncate">{currentGoal ? (currentGoal.periodLabel || 'Meta activa') : 'Meta fija predeterminada'}</span>
                                <span>{Math.round(activeMetric.percent || 0)}% completado</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-crm-border bg-crm-surface p-5 lg:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="text-crm-red" size={20} />
                        <h2 className="text-base font-bold text-crm-fg m-0">Resumen del Mes</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col bg-crm-bg rounded-lg p-3">
                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted mb-1">Cerradas</span>
                            <span className="text-2xl font-bold text-crm-fg">{closedSales.length}</span>
                        </div>
                        <div className="flex flex-col bg-crm-bg rounded-lg p-3">
                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted mb-1">En curso</span>
                            <span className="text-2xl font-bold text-crm-fg">{inProgressSales.length}</span>
                        </div>
                        <div className="flex flex-col bg-crm-bg rounded-lg p-3">
                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted mb-1">Reservas activas</span>
                            <span className="text-2xl font-bold text-crm-fg">{activeReservations.length}</span>
                        </div>
                        <div className="flex flex-col bg-crm-bg rounded-lg p-3">
                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted mb-1">Monto (USD)</span>
                            <span className="text-xl font-bold text-emerald-400">
                                {totalVendidoUSD > 0 ? `$${totalVendidoUSD.toLocaleString('en-US')}` : '--'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="text-crm-red" size={20} />
                        <h2 className="text-base font-bold text-crm-fg m-0">Funnel de Ventas</h2>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-sm font-medium text-crm-fg">Leads</span>
                            </div>
                            <span className="text-sm font-bold text-crm-fg">{funnelLeads}</span>
                        </div>
                        <div className="flex items-center justify-between ml-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <span className="text-sm font-medium text-crm-fg">Reservas</span>
                            </div>
                            <span className="text-sm font-bold text-crm-fg">{funnelReservations}</span>
                        </div>
                        <div className="flex items-center justify-between ml-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <span className="text-sm font-medium text-crm-fg">Ventas</span>
                            </div>
                            <span className="text-sm font-bold text-crm-fg">{funnelSales}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="text-crm-red" size={20} />
                        <h2 className="text-base font-bold text-crm-fg m-0">Ranking Mensual</h2>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-yellow-500">1</span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">Equipo A</span>
                                    <span className="text-xs text-crm-fg-muted">15 ventas</span>
                                </div>
                            </div>
                            <Trophy size={16} className="text-yellow-500" />
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-crm-bg border border-crm-border">
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-gray-400">2</span>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">Vos</span>
                                    <span className="text-xs text-crm-fg-muted">{closedSales.length} ventas</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Award className="text-crm-red" size={20} />
                        <h2 className="text-base font-bold text-crm-fg m-0">Premios Consignaciones</h2>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-emerald-500">Consignador Estrella</span>
                                <span className="text-xs text-crm-fg-muted">2 vehículos captados</span>
                            </div>
                            <Award size={20} className="text-emerald-500" />
                        </div>
                        <p className="text-[10px] text-crm-fg-muted text-center mt-2">
                            Alcanzá 5 consignaciones para desbloquear el premio mayor.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
