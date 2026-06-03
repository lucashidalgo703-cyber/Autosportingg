"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { BarChart3, Users, Activity, CheckCircle, AlertTriangle, UserMinus, Calendar, Flag } from 'lucide-react';
import Link from 'next/link';
import GoalStatusBadge from '../../../components/crm/goals/GoalStatusBadge';

export default function ProductivityDashboardPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // Filters
    const [period, setPeriod] = useState('30d');
    const [filterRole, setFilterRole] = useState('');
    const [filterModule, setFilterModule] = useState('');

    const fetchProductivity = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({
                period,
                ...(filterRole && { role: filterRole }),
                ...(filterModule && { module: filterModule })
            });

            const res = await fetch(`/api/admin/team-productivity?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 403) throw new Error("Sin permisos para ver productividad.");
                throw new Error("Error cargando dashboard de productividad.");
            }

            const result = await res.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProductivity();
        }
    }, [user, period, filterRole, filterModule]);

    if (!user) return null;

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-900/20 text-red-400 p-4 rounded-lg border border-red-900/50 flex items-center gap-2">
                    <AlertTriangle size={20} /> {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-crm-red/10 rounded-xl flex items-center justify-center text-crm-red">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Productividad del Equipo</h1>
                        <p className="text-sm text-crm-fg-muted">Las métricas se calculan desde la activación de auditoría.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-crm-surface border border-crm-border text-white text-sm rounded-lg p-2 focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                    >
                        <option value="7d">Últimos 7 días</option>
                        <option value="30d">Últimos 30 días</option>
                        <option value="90d">Últimos 90 días</option>
                        <option value="year">Este año</option>
                    </select>

                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="bg-crm-surface border border-crm-border text-white text-sm rounded-lg p-2 focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                    >
                        <option value="">Todos los roles</option>
                        <option value="ventas">Ventas</option>
                        <option value="administrativo">Administrativo</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select
                        value={filterModule}
                        onChange={(e) => setFilterModule(e.target.value)}
                        className="bg-crm-surface border border-crm-border text-white text-sm rounded-lg p-2 focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                    >
                        <option value="">Todos los módulos</option>
                        <option value="leads">Leads</option>
                        <option value="ventas">Ventas</option>
                        <option value="reservas">Reservas</option>
                        <option value="agenda">Agenda</option>
                        <option value="clientes">Clientes</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-red"></div>
                </div>
            ) : data ? (
                <>
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-crm-bg border border-crm-border rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-crm-red mb-2">
                                <Activity size={16} /> <span className="text-xs font-bold uppercase">Acciones Auditadas</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{data.summary.totalActions}</div>
                        </div>
                        <div className="bg-crm-bg border border-crm-border rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-green-500 mb-2">
                                <CheckCircle size={16} /> <span className="text-xs font-bold uppercase">Tareas Cmpl.</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{data.summary.totalTasksCompleted}</div>
                        </div>
                        <div className="bg-crm-bg border border-crm-border rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-yellow-500 mb-2">
                                <Users size={16} /> <span className="text-xs font-bold uppercase">Leads Trabajados</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{data.summary.totalLeadsWorked}</div>
                        </div>
                        <div className="bg-crm-bg border border-crm-border rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <UserMinus size={16} /> <span className="text-xs font-bold uppercase">Sin Actividad</span>
                            </div>
                            <div className="text-3xl text-white font-bold">{data.summary.usersNoActivity}</div>
                        </div>
                    </div>

                    {/* GOALS SUMMARY CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <div className="bg-crm-bg border border-crm-red/20 rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-crm-red mb-2">
                                <Flag size={16} /> <span className="text-xs font-bold uppercase">Metas Activas</span>
                            </div>
                            <div className="text-3xl text-white font-bold">
                                {data.usersProductivity.reduce((acc, u) => acc + (u.goalSummary?.activeGoals || 0), 0)}
                            </div>
                        </div>
                        <div className="bg-crm-bg border border-green-900/50 rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-green-500 mb-2">
                                <CheckCircle size={16} /> <span className="text-xs font-bold uppercase">Cumplidas</span>
                            </div>
                            <div className="text-3xl text-white font-bold">
                                {data.usersProductivity.reduce((acc, u) => acc + (u.goalSummary?.completedGoals || 0), 0)}
                            </div>
                        </div>
                        <div className="bg-crm-bg border border-yellow-900/50 rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-yellow-500 mb-2">
                                <AlertTriangle size={16} /> <span className="text-xs font-bold uppercase">Atrasadas</span>
                            </div>
                            <div className="text-3xl text-white font-bold">
                                {data.usersProductivity.reduce((acc, u) => acc + (u.goalSummary?.behindGoals || 0), 0)}
                            </div>
                        </div>
                        <div className="bg-crm-bg border border-red-900/50 rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <UserMinus size={16} /> <span className="text-xs font-bold uppercase">Vencidas</span>
                            </div>
                            <div className="text-3xl text-white font-bold">
                                {data.usersProductivity.reduce((acc, u) => acc + (u.goalSummary?.overdueGoals || 0), 0)}
                            </div>
                        </div>
                        <div className="bg-crm-bg border border-crm-border rounded-xl p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 text-crm-fg-muted mb-2">
                                <Activity size={16} /> <span className="text-xs font-bold uppercase">Cumpl. Promedio</span>
                            </div>
                            <div className="text-3xl text-white font-bold">
                                {(() => {
                                    const total = data.usersProductivity.reduce((acc, u) => acc + (u.goalSummary?.averageCompletion || 0), 0);
                                    const usersWithGoals = data.usersProductivity.filter(u => u.goalSummary?.activeGoals > 0).length;
                                    return usersWithGoals > 0 ? Math.round(total / usersWithGoals) : 0;
                                })()}%
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* RANKING POR USUARIO (Colspan 2) */}
                        <div className="xl:col-span-2 bg-crm-surface border border-crm-border rounded-xl overflow-hidden flex flex-col">
                            <div className="p-5 border-b border-crm-border bg-crm-bg flex items-center justify-between">
                                <h2 className="font-bold text-white uppercase text-sm">Ranking Operativo del Equipo</h2>
                                <span className="text-xs text-crm-fg-muted bg-crm-surface-raised px-2 py-1 rounded">Basado en score</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-crm-border bg-crm-surface">
                                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase">Usuario</th>
                                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase">Acciones</th>
                                            <th className="p-4 text-xs font-bold text-green-500 uppercase">T. Cmpl.</th>
                                            <th className="p-4 text-xs font-bold text-yellow-500 uppercase">Leads</th>
                                            <th className="p-4 text-xs font-bold text-crm-red uppercase">Score</th>
                                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase">Metas (Prom)</th>
                                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase">Estado</th>
                                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.usersProductivity.length === 0 ? (
                                            <tr><td colSpan="8" className="p-4 text-center text-sm text-crm-fg-muted">No hay datos en el período seleccionado.</td></tr>
                                        ) : (
                                            data.usersProductivity.map((u, i) => (
                                                <tr key={u._id} className="border-b border-crm-border hover:bg-crm-surface-raised transition-colors">
                                                    <td className="p-4 flex items-center gap-3">
                                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-crm-surface text-crm-fg-muted'}`}>
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">{u.name}</div>
                                                            <div className="text-xs text-crm-fg-muted capitalize">{u.role}</div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-crm-fg font-medium">{u.totalActions}</td>
                                                    <td className="p-4 text-sm text-green-400 font-bold">{u.tasksCompleted}</td>
                                                    <td className="p-4 text-sm text-yellow-400 font-bold">{u.leadsWorked}</td>
                                                    <td className="p-4">
                                                        <div className="bg-crm-red/10 text-crm-red font-bold text-xs px-2 py-1 rounded inline-block">
                                                            {u.score} pts
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-sm text-white font-bold">
                                                        {u.goalSummary?.activeGoals > 0 ? (
                                                            <span>{u.goalSummary.averageCompletion}% <span className="text-crm-fg-muted text-xs font-normal">({u.goalSummary.activeGoals})</span></span>
                                                        ) : (
                                                            <span className="text-crm-fg-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <GoalStatusBadge status={u.goalSummary?.mainStatus === 'sin_meta' ? null : u.goalSummary?.mainStatus} />
                                                        {(!u.goalSummary || u.goalSummary.mainStatus === 'sin_meta') && <span className="text-xs text-crm-fg-muted">Sin metas</span>}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <Link href={`/admin/metas?userId=${u._id}`} className="text-xs bg-crm-surface hover:bg-crm-surface-raised text-white px-3 py-1.5 rounded transition-colors mr-2">
                                                            Metas
                                                        </Link>
                                                        <Link href={`/admin/equipo/${u._id}`} className="text-xs bg-crm-surface hover:bg-crm-surface-raised text-white px-3 py-1.5 rounded transition-colors">
                                                            Detalle
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA */}
                        <div className="flex flex-col gap-8">
                            
                            {/* ACTIVIDAD DIARIA */}
                            <div className="bg-crm-surface border border-crm-border rounded-xl overflow-hidden">
                                <div className="p-5 border-b border-crm-border bg-crm-bg flex items-center gap-2">
                                    <Calendar size={18} className="text-crm-red" />
                                    <h2 className="font-bold text-white uppercase text-sm">Actividad Diaria</h2>
                                </div>
                                <div className="p-5">
                                    {data.dailyActivity.length === 0 ? (
                                        <p className="text-sm text-crm-fg-muted text-center">Sin actividad registrada.</p>
                                    ) : (
                                        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                            {data.dailyActivity.map((day, idx) => {
                                                const maxActions = Math.max(...data.dailyActivity.map(d => d.actions));
                                                const percent = maxActions > 0 ? (day.actions / maxActions) * 100 : 0;
                                                return (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <div className="text-xs text-crm-fg-muted w-16">{day.date.slice(5)}</div>
                                                        <div className="flex-1 bg-crm-bg h-4 rounded overflow-hidden">
                                                            <div className="bg-crm-red h-full rounded" style={{ width: `${percent}%` }}></div>
                                                        </div>
                                                        <div className="text-xs text-white font-bold w-6 text-right">{day.actions}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ACTIVIDAD POR MÓDULO */}
                            <div className="bg-crm-surface border border-crm-border rounded-xl overflow-hidden">
                                <div className="p-5 border-b border-crm-border bg-crm-bg flex items-center gap-2">
                                    <BarChart3 size={18} className="text-green-500" />
                                    <h2 className="font-bold text-white uppercase text-sm">Por Módulo</h2>
                                </div>
                                <div className="p-5">
                                    {Object.keys(data.moduleActivityMap).length === 0 ? (
                                        <p className="text-sm text-crm-fg-muted text-center">Sin actividad.</p>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {Object.entries(data.moduleActivityMap)
                                                .sort((a,b) => b[1] - a[1])
                                                .map(([mod, count]) => (
                                                <div key={mod} className="flex justify-between items-center border-b border-crm-border pb-2 last:border-0 last:pb-0">
                                                    <span className="text-sm text-crm-fg capitalize">{mod}</span>
                                                    <span className="text-sm font-bold text-white bg-crm-surface-raised px-2 py-0.5 rounded">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BAJA ACTIVIDAD */}
                            {data.lowActivityUsers.length > 0 && (
                                <div className="bg-crm-surface border border-crm-red/20 rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-crm-red/20 bg-crm-red/10 flex items-center gap-2">
                                        <AlertTriangle size={18} className="text-crm-red" />
                                        <h2 className="font-bold text-crm-red uppercase text-sm">Alerta: Baja Actividad</h2>
                                    </div>
                                    <div className="p-4 flex flex-col gap-3">
                                        {data.lowActivityUsers.map(u => (
                                            <div key={u._id} className="flex justify-between items-center bg-crm-bg p-2 rounded border border-crm-border">
                                                <div>
                                                    <div className="text-sm font-bold text-white">{u.name}</div>
                                                    <div className="text-xs text-crm-red">
                                                        {u.totalActions === 0 ? 'Sin acciones' : `${u.tasksOverdue} tareas vencidas`}
                                                    </div>
                                                </div>
                                                <Link href={`/admin/equipo/${u._id}`} className="text-xs text-crm-red hover:underline">Ver</Link>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
