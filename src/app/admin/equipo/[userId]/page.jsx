"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, CheckCircle, AlertTriangle, Calendar, FileText, Activity, Flag } from 'lucide-react';
import Link from 'next/link';
import QuickAssignModal from '../../../../components/crm/team/QuickAssignModal';
import GoalStatusBadge from '../../../../components/crm/goals/GoalStatusBadge';
import GoalProgressBar from '../../../../components/crm/goals/GoalProgressBar';

export default function UserDetailDashboardPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [assignModal, setAssignModal] = useState({ isOpen: false, entityType: '', entityId: '', entityTitle: '' });

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/team-dashboard/${params.userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                if (res.status === 403) throw new Error("Sin permisos para ver este detalle.");
                throw new Error("Error cargando detalle del responsable");
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
        fetchDetail();
    }, [params.userId]);

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
                <button onClick={() => router.push('/admin/equipo')} className="text-gray-400 hover:text-white mb-4 flex items-center gap-2">
                    <ArrowLeft size={16} /> Volver a Equipo
                </button>
                <div className="bg-red-900/20 text-red-400 p-4 rounded-lg border border-red-900/50">
                    <AlertTriangle className="inline mr-2" /> {error}
                </div>
            </div>
        );
    }

    const { user: targetUser, tasks, leads, reservations, sales, recentLogs, goals } = data;

    const pendingTasks = tasks.filter(t => t.status === 'pendiente');
    const today = new Date().setHours(0,0,0,0);
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < today);
    const activeLeads = leads.filter(l => !['perdido', 'convertido'].includes(l.crmStatus));
    const activeReservations = reservations.filter(r => r.status === 'activa');
    const activeSales = sales.filter(s => !['cancelada', 'entregada', 'borrador'].includes(s.status));
    const pendingDocs = sales.filter(s => s.documentationStatus !== 'completo');
    const criticalPostSales = sales.filter(s => ['incidencia', 'pendiente', 'contactado'].includes(s.postSaleStatus));

    return (
        <div className="p-6 font-sans">
            <button onClick={() => router.push('/admin/equipo')} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
                <ArrowLeft size={16} /> Volver a Gestión de Equipo
            </button>

            <div className="bg-[#161619] border border-[#33333A] rounded-xl p-6 mb-8 flex items-center gap-4">
                <div className="w-16 h-16 bg-[#24242B] rounded-full flex items-center justify-center text-indigo-500">
                    <Users size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        {targetUser.name}
                        <div className={`w-3 h-3 rounded-full ${targetUser.active ? 'bg-green-500' : 'bg-red-500'}`} title={targetUser.active ? 'Activo' : 'Inactivo'}></div>
                    </h1>
                    <div className="text-sm text-gray-400 flex items-center gap-4 mt-1">
                        <span className="capitalize">{targetUser.role.replace('_', ' ')}</span>
                        <span>{targetUser.email}</span>
                        {targetUser.lastLoginAt && <span>Último acceso: {new Date(targetUser.lastLoginAt).toLocaleDateString()}</span>}
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Tareas Pendientes</div>
                    <div className="text-2xl text-white font-bold">{pendingTasks.length}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-red-400 text-xs font-bold uppercase mb-1">Tareas Vencidas</div>
                    <div className="text-2xl text-red-400 font-bold">{overdueTasks.length}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Leads Activos</div>
                    <div className="text-2xl text-white font-bold">{activeLeads.length}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Reservas Activas</div>
                    <div className="text-2xl text-white font-bold">{activeReservations.length}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">Ventas en Curso</div>
                    <div className="text-2xl text-white font-bold">{activeSales.length}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-yellow-500 text-xs font-bold uppercase mb-1">Docs Pendientes</div>
                    <div className="text-2xl text-yellow-500 font-bold">{pendingDocs.length}</div>
                </div>
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-red-400 text-xs font-bold uppercase mb-1">Postventa Crítica</div>
                    <div className="text-2xl text-red-400 font-bold">{criticalPostSales.length}</div>
                </div>
            </div>

            {/* METAS */}
            {goals && goals.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Flag className="text-indigo-500" size={24} />
                            Metas Activas
                        </h2>
                        <Link href={`/admin/metas?userId=${targetUser._id}`} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                            Gestionar Metas
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {goals.map(goal => (
                            <div key={goal.goalId} className="bg-[#161619] border border-[#33333A] rounded-xl p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="text-sm text-indigo-400 font-bold uppercase">{goal.periodLabel || goal.periodType}</div>
                                        <div className="text-xs text-gray-500 mt-1">{new Date(goal.startDate).toLocaleDateString()} al {new Date(goal.endDate).toLocaleDateString()}</div>
                                    </div>
                                    <GoalStatusBadge status={goal.status} />
                                </div>
                                
                                <div className="mb-6">
                                    <GoalProgressBar percent={goal.overallPercent} />
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {Object.entries(goal.progress).map(([key, p]) => (
                                        <div key={key} className="bg-[#24242B] border border-[#33333A] p-3 rounded-lg">
                                            <div className="text-xs text-gray-400 uppercase font-bold mb-2">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="text-xl font-bold text-white">{p.real}<span className="text-sm text-gray-500 ml-1">/ {p.target}</span></div>
                                                <div className={`text-xs font-bold ${p.percent >= 100 ? 'text-green-400' : 'text-indigo-400'}`}>{p.percent}%</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* TAREAS */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#33333A] bg-[#24242B] flex items-center gap-2">
                        <CheckCircle size={18} className="text-blue-500" />
                        <h2 className="font-bold text-white uppercase text-sm">Tareas Pendientes</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
                        {pendingTasks.length === 0 ? <p className="text-sm text-gray-500">Sin tareas pendientes.</p> : null}
                        {pendingTasks.map(t => (
                            <div key={t._id} className="bg-[#24242B] border border-[#33333A] p-3 rounded flex justify-between items-center">
                                <div>
                                    <Link href="/admin/agenda" className="text-sm font-bold text-white hover:text-indigo-400">{t.title}</Link>
                                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                        <span className={t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < today ? 'text-red-400 font-bold' : ''}>
                                            Vence: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                        <span>| Prioridad: {t.priority}</span>
                                    </div>
                                </div>
                                <button onClick={() => setAssignModal({ isOpen: true, entityType: 'task', entityId: t._id, entityTitle: t.title })} className="text-xs bg-[#33333A] hover:bg-[#4A4A55] text-white px-2 py-1 rounded">Reasignar</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* LEADS */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#33333A] bg-[#24242B] flex items-center gap-2">
                        <Users size={18} className="text-yellow-500" />
                        <h2 className="font-bold text-white uppercase text-sm">Leads Asignados ({activeLeads.length})</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
                        {activeLeads.length === 0 ? <p className="text-sm text-gray-500">Sin leads activos.</p> : null}
                        {activeLeads.map(l => (
                            <div key={l._id} className="bg-[#24242B] border border-[#33333A] p-3 rounded flex justify-between items-center">
                                <div>
                                    <Link href="/admin/leads" className="text-sm font-bold text-white hover:text-yellow-400">{l.name}</Link>
                                    <div className="text-xs text-gray-400 mt-1">Estado: <span className="text-yellow-500 uppercase">{l.crmStatus}</span></div>
                                </div>
                                <button onClick={() => setAssignModal({ isOpen: true, entityType: 'lead', entityId: l._id, entityTitle: l.name })} className="text-xs bg-[#33333A] hover:bg-[#4A4A55] text-white px-2 py-1 rounded">Reasignar</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RESERVAS */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#33333A] bg-[#24242B] flex items-center gap-2">
                        <Calendar size={18} className="text-indigo-500" />
                        <h2 className="font-bold text-white uppercase text-sm">Reservas Activas ({activeReservations.length})</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
                        {activeReservations.length === 0 ? <p className="text-sm text-gray-500">Sin reservas activas.</p> : null}
                        {activeReservations.map(r => (
                            <div key={r._id} className="bg-[#24242B] border border-[#33333A] p-3 rounded flex justify-between items-center">
                                <div>
                                    <Link href="/admin/reservas" className="text-sm font-bold text-white hover:text-indigo-400">
                                        Reserva #{r._id.toString().slice(-6).toUpperCase()}
                                    </Link>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Cliente: {r.clientId?.fullName || 'N/A'} <br/>
                                        Vehículo: {r.vehicleId?.brand} {r.vehicleId?.model}
                                    </div>
                                </div>
                                <button onClick={() => setAssignModal({ isOpen: true, entityType: 'reservation', entityId: r._id, entityTitle: `Reserva #${r._id.toString().slice(-6).toUpperCase()}` })} className="text-xs bg-[#33333A] hover:bg-[#4A4A55] text-white px-2 py-1 rounded">Reasignar</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* VENTAS EN CURSO */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#33333A] bg-[#24242B] flex items-center gap-2">
                        <FileText size={18} className="text-green-500" />
                        <h2 className="font-bold text-white uppercase text-sm">Ventas en Curso ({activeSales.length})</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-2 max-h-96 overflow-y-auto">
                        {activeSales.length === 0 ? <p className="text-sm text-gray-500">Sin ventas en curso.</p> : null}
                        {activeSales.map(s => (
                            <div key={s._id} className="bg-[#24242B] border border-[#33333A] p-3 rounded flex justify-between items-center">
                                <div>
                                    <Link href={`/admin/ventas/${s._id}`} className="text-sm font-bold text-white hover:text-green-400">
                                        Venta #{s._id.toString().slice(-6).toUpperCase()}
                                    </Link>
                                    <div className="text-xs text-gray-400 mt-1 flex flex-col gap-1">
                                        <span>Cliente: {s.clientId?.fullName || 'N/A'}</span>
                                        <span>Vehículo: {s.vehicleId?.brand} {s.vehicleId?.model}</span>
                                        <span>Docs: <span className={s.documentationStatus === 'completo' ? 'text-green-400' : 'text-yellow-500'}>{s.documentationStatus}</span></span>
                                    </div>
                                </div>
                                <button onClick={() => setAssignModal({ isOpen: true, entityType: 'sale', entityId: s._id, entityTitle: `Venta #${s._id.toString().slice(-6).toUpperCase()}` })} className="text-xs bg-[#33333A] hover:bg-[#4A4A55] text-white px-2 py-1 rounded">Reasignar</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACTIVIDAD RECIENTE */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl overflow-hidden flex flex-col lg:col-span-2">
                    <div className="p-4 border-b border-[#33333A] bg-[#24242B] flex items-center gap-2">
                        <Activity size={18} className="text-indigo-400" />
                        <h2 className="font-bold text-white uppercase text-sm">Últimas Acciones (30 Días)</h2>
                    </div>
                    <div className="p-4">
                        {recentLogs.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay actividad reciente en los últimos 30 días.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#33333A]">
                                            <th className="p-2 text-xs text-gray-400 font-bold uppercase">Fecha</th>
                                            <th className="p-2 text-xs text-gray-400 font-bold uppercase">Acción</th>
                                            <th className="p-2 text-xs text-gray-400 font-bold uppercase">Módulo</th>
                                            <th className="p-2 text-xs text-gray-400 font-bold uppercase">Descripción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentLogs.map(log => (
                                            <tr key={log._id} className="border-b border-[#33333A]/50 hover:bg-[#1E1E24]">
                                                <td className="p-2 text-xs text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td className="p-2 text-xs text-indigo-400 font-bold">{log.action}</td>
                                                <td className="p-2 text-xs text-gray-300 uppercase">{log.module}</td>
                                                <td className="p-2 text-xs text-white">{log.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <QuickAssignModal 
                isOpen={assignModal.isOpen} 
                onClose={() => setAssignModal({ ...assignModal, isOpen: false })} 
                entityType={assignModal.entityType} 
                entityId={assignModal.entityId} 
                entityTitle={assignModal.entityTitle} 
                onAssigned={fetchDetail} 
            />
        </div>
    );
}
