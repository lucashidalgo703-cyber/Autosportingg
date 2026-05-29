"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Users, BarChart3, AlertTriangle, CheckCircle, FileText, UserMinus, Search, Eye } from 'lucide-react';
import Link from 'next/link';

export default function TeamDashboardPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    // Filtros
    const [roleFilter, setRoleFilter] = useState('todos');
    const [searchUser, setSearchUser] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
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
        fetchDashboard();
    }, []);

    if (!user) return null;

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
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
                        <Users className="text-blue-500" />
                        Gestión de Equipo
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Carga operativa, leads y métricas de desempeño por responsable.
                    </p>
                </div>
            </div>

            {/* Tarjetas Superiores */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Usuarios Activos</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalUsers}</div>
                    <div className="text-xs text-gray-500 mt-1">{globalStats.totalVentas} Ventas / {globalStats.totalAdmin} Admin</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Tareas Pend.</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalTasks}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-red-400 text-xs font-bold uppercase mb-1">Tareas Vencidas</div>
                    <div className="text-2xl text-red-400 font-bold">{globalStats.totalOverdueTasks}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Leads Activos</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalLeads}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Ventas Activas</div>
                    <div className="text-2xl text-white font-bold">{globalStats.totalSales}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-yellow-500 text-xs font-bold uppercase mb-1">Leads Huerfanos</div>
                    <div className="text-2xl text-yellow-500 font-bold">{globalStats.totalUnassignedLeads}</div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar usuario..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="w-full md:w-64 pl-10 pr-4 py-2 bg-[#161619] border border-[#33333A] rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                </div>
                <select 
                    value={roleFilter} 
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="w-full md:w-48 px-4 py-2 bg-[#161619] border border-[#33333A] rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                    <option value="todos">Todos los roles</option>
                    <option value="ventas">Ventas</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                </select>
            </div>

            {/* Tabla por Responsable */}
            <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#33333A] bg-[#24242B]">
                                <th className="p-4 text-xs uppercase font-bold text-gray-400">Usuario</th>
                                <th className="p-4 text-xs uppercase font-bold text-gray-400">Rol</th>
                                <th className="p-4 text-xs uppercase font-bold text-gray-400">Tareas Pend/Venc</th>
                                <th className="p-4 text-xs uppercase font-bold text-gray-400">Leads</th>
                                <th className="p-4 text-xs uppercase font-bold text-gray-400">Ventas</th>
                                <th className="p-4 text-xs uppercase font-bold text-gray-400">Postventas Crit.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeam.map(u => (
                                <tr key={u._id} className="border-b border-[#33333A] hover:bg-[#1E1E24] transition-colors">
                                    <td className="p-4 text-sm text-white font-medium flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                        {u.name}
                                    </td>
                                    <td className="p-4 text-sm text-gray-400 capitalize">{u.role.replace('_', ' ')}</td>
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
                                            <span className="text-gray-500">0</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredTeam.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-500">
                                        No se encontraron usuarios activos con esos filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Operaciones sin Responsable */}
            <div className="bg-[#161619] border border-red-900/50 rounded-xl overflow-hidden mb-8">
                <div className="p-4 border-b border-red-900/50 bg-red-900/10 flex items-center gap-2">
                    <UserMinus className="text-red-500" size={20} />
                    <h2 className="text-lg font-bold text-white">Operaciones sin Responsable</h2>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[#24242B] p-4 rounded-lg border border-[#33333A]">
                        <div className="text-gray-400 text-xs font-bold uppercase mb-1">Leads Huérfanos</div>
                        <div className="text-xl text-yellow-500 font-bold">{unassigned.leads.length}</div>
                    </div>
                    <div className="bg-[#24242B] p-4 rounded-lg border border-[#33333A]">
                        <div className="text-gray-400 text-xs font-bold uppercase mb-1">Reservas Sueltas</div>
                        <div className="text-xl text-white font-bold">{unassigned.reservations.length}</div>
                    </div>
                    <div className="bg-[#24242B] p-4 rounded-lg border border-[#33333A]">
                        <div className="text-gray-400 text-xs font-bold uppercase mb-1">Ventas Sin Dueño</div>
                        <div className="text-xl text-white font-bold">{unassigned.sales.length}</div>
                    </div>
                    <div className="bg-[#24242B] p-4 rounded-lg border border-[#33333A]">
                        <div className="text-gray-400 text-xs font-bold uppercase mb-1">Tareas Sueltas</div>
                        <div className="text-xl text-white font-bold">{unassigned.tasks.length}</div>
                    </div>
                </div>
            </div>

        </div>
    );
}
