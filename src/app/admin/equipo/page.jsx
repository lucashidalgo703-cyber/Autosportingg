"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Users, BarChart3, AlertTriangle, CheckCircle, FileText, UserMinus, Search, Eye, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import QuickAssignModal from '../../../components/crm/team/QuickAssignModal';

export default function TeamDashboardPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // Filtros
    const [roleFilter, setRoleFilter] = useState('todos');
    const [searchUser, setSearchUser] = useState('');

    // Asignación rápida
    const [assignModal, setAssignModal] = useState({ isOpen: false, entityType: '', entityId: '', entityTitle: '' });

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/team-dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 403) throw new Error("Sin permisos para ver el equipo.");
                throw new Error("Error cargando dashboard");
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
        fetchDashboard();
    }, []);

    if (!user) return null;

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-crm-red"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-900/20 text-red-400 p-4 rounded-lg border border-red-900/50">
                    <AlertTriangle className="inline mr-2" /> {error}
                </div>
            </div>
        );
    }

    const { teamData, unassigned, globalStats } = data;

    // Filtrar teamData
    const filteredTeam = teamData.filter(u => {
        if (roleFilter !== 'todos' && u.role !== roleFilter) return false;
        if (searchUser && !u.name.toLowerCase().includes(searchUser.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="p-6 font-sans">
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="text-crm-red" />
                        Gestión de Equipo
                    </h1>
                    <p className="text-sm text-crm-fg-muted mt-1">
                        Carga operativa, leads y métricas de desempeño por responsable.
                    </p>
                </div>
            </div>

            {/* Tarjetas Superiores */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Usuarios Activos</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalUsers}</div>
                    <div className="text-xs text-crm-fg-muted mt-1">{globalStats.totalVentas} Ventas / {globalStats.totalAdmin} Admin</div>
                </div>
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Tareas Pend.</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalTasks}</div>
                </div>
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-red-400 text-xs font-bold uppercase mb-1">Tareas Vencidas</div>
                    <div className="text-2xl text-red-400 font-bold">{globalStats.totalOverdueTasks}</div>
                </div>
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Leads Activos</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalLeads}</div>
                </div>
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Ventas Activas</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalSales}</div>
                </div>
                <div className="bg-crm-bg border border-crm-border rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-yellow-500 text-xs font-bold uppercase mb-1">Leads Huerfanos</div>
                    <div className="text-2xl text-yellow-500 font-bold">{globalStats.totalUnassignedLeads}</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuario..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="w-full md:w-64 pl-10 pr-4 py-2 bg-crm-bg border border-crm-border rounded-lg text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                    />
                </div>
                <select 
                    value={roleFilter} 
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full md:w-48 px-4 py-2 bg-crm-bg border border-crm-border rounded-lg text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red"
                >
                    <option value="todos">Todos los roles</option>
                    <option value="ventas">Ventas</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                </select>
            </div>

            {/* Tabla por Responsable */}
            <div className="bg-crm-surface border border-crm-border rounded-xl overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-crm-border bg-crm-bg">
                                <th className="p-4 text-xs uppercase font-bold text-crm-fg-muted">Usuario</th>
                                <th className="p-4 text-xs uppercase font-bold text-crm-fg-muted">Rol</th>
                                <th className="p-4 text-xs uppercase font-bold text-crm-fg-muted">Tareas Pend/Venc</th>
                                <th className="p-4 text-xs uppercase font-bold text-crm-fg-muted">Leads</th>
                                <th className="p-4 text-xs uppercase font-bold text-crm-fg-muted">Ventas</th>
                                <th className="p-4 text-xs uppercase font-bold text-crm-fg-muted">Postventas Crit.</th>
                                <th className="p-4 text-xs uppercase font-bold text-crm-fg-muted">Metas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeam.map(u => (
                                <tr key={u._id} className="border-b border-crm-border hover:bg-crm-surface-raised transition-colors">
                                    <td className="p-4 text-sm font-medium flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-crm-border'}`}></div>
                                        <Link href={`/admin/equipo/${u._id}`} className="text-white hover:text-crm-red hover:underline">
                                            {u.name}
                                        </Link>
                                    </td>
                                    <td className="p-4 text-sm text-crm-fg-muted capitalize">{u.role.replace('_', ' ')}</td>
                                    <td className="p-4 text-sm">
                                        <span className="text-white font-bold">{u.stats.pendingTasks}</span>
                                        {u.stats.overdueTasks > 0 && <span className="text-red-400 ml-1 text-xs">({u.stats.overdueTasks} v)</span>}
                                    </td>
                                    <td className="p-4 text-sm text-white">{u.stats.activeLeads}</td>
                                    <td className="p-4 text-sm text-white">{u.stats.activeSales}</td>
                                    <td className="p-4 text-sm">
                                        {u.stats.criticalPostSales > 0 ? (
                                            <span className="text-red-400 font-bold">{u.stats.criticalPostSales}</span>
                                        ) : (
                                            <span className="text-crm-fg-muted">0</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {u.goalSummary && u.goalSummary.activeGoals > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs text-crm-fg-muted">
                                                    {u.goalSummary.activeGoals} activas ({u.goalSummary.averageCompletion}%)
                                                </div>
                                                <div>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase whitespace-nowrap ${
                                                        u.goalSummary.mainStatus === 'superado' ? 'bg-green-600/30 text-green-300' :
                                                        u.goalSummary.mainStatus === 'cumplido' ? 'bg-green-500/20 text-green-400' :
                                                        u.goalSummary.mainStatus === 'proximo_vencer' ? 'bg-orange-500/20 text-orange-400' :
                                                        u.goalSummary.mainStatus === 'atrasado' ? 'bg-yellow-500/20 text-yellow-500' :
                                                        u.goalSummary.mainStatus === 'vencido' ? 'bg-red-500/20 text-red-400' :
                                                        u.goalSummary.mainStatus === 'sin_avance' ? 'bg-crm-bg text-crm-fg-muted' :
                                                        'bg-crm-red/10 text-crm-red'
                                                    }`}>
                                                        {u.goalSummary.mainStatus.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-crm-fg-muted italic">Sin metas</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredTeam.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-crm-fg-muted">
                                        No se encontraron usuarios activos con esos filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Operaciones sin Responsable */}
            <div className="bg-crm-surface border border-crm-border rounded-xl overflow-hidden mb-8">
                <div className="p-4 border-b border-crm-border bg-crm-red/10 flex items-center gap-2">
                    <UserMinus className="text-crm-red" size={20} />
                    <h2 className="text-lg font-bold text-white">Operaciones sin Responsable</h2>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 border-b border-crm-border">
                    <div className="bg-crm-bg p-4 rounded-lg border border-crm-border">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Leads Huérfanos</div>
                        <div className="text-xl text-yellow-500 font-bold">{unassigned.leads.length}</div>
                    </div>
                    <div className="bg-crm-bg p-4 rounded-lg border border-crm-border">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Reservas Sueltas</div>
                        <div className="text-xl text-white font-bold">{unassigned.reservations.length}</div>
                    </div>
                    <div className="bg-crm-bg p-4 rounded-lg border border-crm-border">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Ventas Sin Dueño</div>
                        <div className="text-xl text-white font-bold">{unassigned.sales.length}</div>
                    </div>
                    <div className="bg-crm-bg p-4 rounded-lg border border-crm-border">
                        <div className="text-crm-fg-muted text-xs font-bold uppercase mb-1">Tareas Sueltas</div>
                        <div className="text-xl text-white font-bold">{unassigned.tasks.length}</div>
                    </div>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-crm-surface">
                    {unassigned.leads.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase mb-3">Leads ({unassigned.leads.length})</h3>
                            <div className="flex flex-col gap-2">
                                {unassigned.leads.slice(0, 5).map(l => (
                                    <div key={l._id} className="bg-crm-bg p-3 rounded border border-crm-border flex justify-between items-center">
                                        <div>
                                            <div className="text-sm text-white font-bold">{l.name}</div>
                                            <div className="text-xs text-yellow-500">{l.crmStatus}</div>
                                        </div>
                                        <button 
                                            onClick={() => setAssignModal({ isOpen: true, entityType: 'lead', entityId: l._id, entityTitle: l.name })}
                                            className="px-3 py-1 bg-crm-surface-raised hover:bg-crm-red-hover text-white rounded text-xs transition-colors flex items-center gap-1 border border-crm-border hover:border-crm-red-hover"
                                        >
                                            <PlusCircle size={14} /> Asignar
                                        </button>
                                    </div>
                                ))}
                                {unassigned.leads.length > 5 && <div className="text-xs text-crm-fg-muted text-center py-2">Mostrando 5 de {unassigned.leads.length}</div>}
                            </div>
                        </div>
                    )}

                    {unassigned.sales.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase mb-3">Ventas ({unassigned.sales.length})</h3>
                            <div className="flex flex-col gap-2">
                                {unassigned.sales.slice(0, 5).map(s => (
                                    <div key={s._id} className="bg-crm-bg p-3 rounded border border-crm-border flex justify-between items-center">
                                        <div>
                                            <div className="text-sm text-white font-bold">Venta #{s._id.toString().slice(-6).toUpperCase()}</div>
                                            <div className="text-xs text-crm-fg-muted">{s.status.replace('_', ' ')}</div>
                                        </div>
                                        <button 
                                            onClick={() => setAssignModal({ isOpen: true, entityType: 'sale', entityId: s._id, entityTitle: `Venta #${s._id.toString().slice(-6).toUpperCase()}` })}
                                            className="px-3 py-1 bg-crm-surface-raised hover:bg-crm-red-hover text-white rounded text-xs transition-colors flex items-center gap-1 border border-crm-border hover:border-crm-red-hover"
                                        >
                                            <PlusCircle size={14} /> Asignar
                                        </button>
                                    </div>
                                ))}
                                {unassigned.sales.length > 5 && <div className="text-xs text-crm-fg-muted text-center py-2">Mostrando 5 de {unassigned.sales.length}</div>}
                            </div>
                        </div>
                    )}

                    {unassigned.tasks.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase mb-3">Tareas ({unassigned.tasks.length})</h3>
                            <div className="flex flex-col gap-2">
                                {unassigned.tasks.slice(0, 5).map(t => (
                                    <div key={t._id} className="bg-crm-bg p-3 rounded border border-crm-border flex justify-between items-center">
                                        <div>
                                            <div className="text-sm text-white font-bold">{t.title}</div>
                                            <div className="text-xs text-crm-fg-muted">Vence: {new Date(t.dueDate).toLocaleDateString('es-AR')}</div>
                                        </div>
                                        <button 
                                            onClick={() => setAssignModal({ isOpen: true, entityType: 'task', entityId: t._id, entityTitle: t.title })}
                                            className="px-3 py-1 bg-crm-surface-raised hover:bg-crm-red-hover text-white rounded text-xs transition-colors flex items-center gap-1 border border-crm-border hover:border-crm-red-hover"
                                        >
                                            <PlusCircle size={14} /> Asignar
                                        </button>
                                    </div>
                                ))}
                                {unassigned.tasks.length > 5 && <div className="text-xs text-crm-fg-muted text-center py-2">Mostrando 5 de {unassigned.tasks.length}</div>}
                            </div>
                        </div>
                    )}

                    {unassigned.reservations.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-crm-fg-muted uppercase mb-3">Reservas ({unassigned.reservations.length})</h3>
                            <div className="flex flex-col gap-2">
                                {unassigned.reservations.slice(0, 5).map(r => (
                                    <div key={r._id} className="bg-crm-bg p-3 rounded border border-crm-border flex justify-between items-center">
                                        <div>
                                            <div className="text-sm text-white font-bold">Reserva #{r._id.toString().slice(-6).toUpperCase()}</div>
                                            <div className="text-xs text-crm-fg-muted">{r.status}</div>
                                        </div>
                                        <button 
                                            onClick={() => setAssignModal({ isOpen: true, entityType: 'reservation', entityId: r._id, entityTitle: `Reserva #${r._id.toString().slice(-6).toUpperCase()}` })}
                                            className="px-3 py-1 bg-crm-surface-raised hover:bg-crm-red-hover text-white rounded text-xs transition-colors flex items-center gap-1 border border-crm-border hover:border-crm-red-hover"
                                        >
                                            <PlusCircle size={14} /> Asignar
                                        </button>
                                    </div>
                                ))}
                                {unassigned.reservations.length > 5 && <div className="text-xs text-crm-fg-muted text-center py-2">Mostrando 5 de {unassigned.reservations.length}</div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <QuickAssignModal 
                isOpen={assignModal.isOpen} 
                onClose={() => setAssignModal({ ...assignModal, isOpen: false })} 
                entityType={assignModal.entityType} 
                entityId={assignModal.entityId} 
                entityTitle={assignModal.entityTitle} 
                onAssigned={fetchDashboard} 
            />
        </div>
    );
}
