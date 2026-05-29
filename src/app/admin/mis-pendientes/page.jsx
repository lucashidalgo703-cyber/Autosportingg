"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ClipboardList, Calendar, CheckSquare, Users, Car, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function MisPendientesPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    
    const [data, setData] = useState({
        tasks: [],
        leads: [],
        sales: [],
        reservations: []
    });

    useEffect(() => {
        const loadAll = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                const [tasksRes, leadsRes, salesRes, resRes] = await Promise.all([
                    fetch('/api/admin/crm-tasks', { headers }),
                    fetch('/api/leads', { headers }), // Asumiendo GET /api/leads devuelve leads
                    fetch('/api/admin/sales', { headers }),
                    fetch('/api/admin/reservations', { headers })
                ]);

                const tasks = tasksRes.ok ? await tasksRes.json() : [];
                const leads = leadsRes.ok ? await leadsRes.json() : [];
                const sales = salesRes.ok ? await salesRes.json() : [];
                const reservations = resRes.ok ? await resRes.json() : [];

                // Filter by assignedTo
                const myUserId = user.userId || user.id; // Dependiendo de la estructura
                
                const myTasks = tasks.filter(t => t.assignedTo && t.assignedTo.toString() === myUserId);
                const myLeads = leads.filter(l => l.assignedTo && l.assignedTo.toString() === myUserId);
                const mySales = sales.filter(s => s.assignedTo && s.assignedTo.toString() === myUserId);
                const myReservations = reservations.filter(r => r.assignedTo && r.assignedTo.toString() === myUserId);

                setData({
                    tasks: myTasks,
                    leads: myLeads,
                    sales: mySales,
                    reservations: myReservations
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [user]);

    if (!user) return null;

    if (loading) {
        return (
            <div className="p-6 flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const today = new Date().setHours(0,0,0,0);

    const pendingTasks = data.tasks.filter(t => t.status === 'pendiente');
    const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) < today);
    const todayTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).setHours(0,0,0,0) === today);

    const activeLeads = data.leads.filter(l => !['perdido', 'convertido'].includes(l.crmStatus));
    const activeReservations = data.reservations.filter(r => r.status === 'activa');
    const activeSales = data.sales.filter(s => !['entregada', 'cancelada', 'borrador'].includes(s.status));
    
    // De activeSales, cuáles tienen postventa incidencia o pendiente
    const postSalePendings = activeSales.filter(s => ['incidencia', 'pendiente', 'contactado'].includes(s.postSaleStatus));
    const docPendings = activeSales.filter(s => s.documentationStatus !== 'completo');

    return (
        <div className="p-6 font-sans">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ClipboardList className="text-indigo-500" />
                    Mis Pendientes
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                    Resumen de todas las entidades, clientes y tareas que tienes asignadas.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* TAREAS */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-5 flex flex-col">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-[#33333A] pb-2">
                        <CheckSquare size={18} className="text-blue-500" />
                        Mis Tareas
                    </h2>
                    {pendingTasks.length === 0 ? (
                        <p className="text-gray-500 text-sm">No tienes tareas pendientes.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {overdueTasks.map(t => (
                                <Link key={t._id} href="/admin/agenda" className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg hover:border-red-500 transition-colors">
                                    <div className="text-red-400 font-bold text-xs uppercase mb-1 flex items-center gap-1"><AlertTriangle size={12}/> Vencida</div>
                                    <div className="text-white text-sm font-bold">{t.title}</div>
                                </Link>
                            ))}
                            {todayTasks.map(t => (
                                <Link key={t._id} href="/admin/agenda" className="p-3 bg-[#24242B] border border-[#33333A] rounded-lg hover:border-blue-500 transition-colors">
                                    <div className="text-blue-400 font-bold text-xs uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Para Hoy</div>
                                    <div className="text-white text-sm font-bold">{t.title}</div>
                                </Link>
                            ))}
                            {pendingTasks.filter(t => !overdueTasks.includes(t) && !todayTasks.includes(t)).slice(0, 5).map(t => (
                                <Link key={t._id} href="/admin/agenda" className="p-3 bg-[#1E1E24] border border-[#33333A] rounded-lg hover:border-gray-500 transition-colors">
                                    <div className="text-white text-sm font-bold">{t.title}</div>
                                    {t.dueDate && <div className="text-gray-500 text-xs mt-1">Vence: {new Date(t.dueDate).toLocaleDateString('es-AR')}</div>}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* LEADS & RESERVAS */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-5 flex flex-col">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-[#33333A] pb-2">
                        <Users size={18} className="text-yellow-500" />
                        Comercial (Leads y Reservas)
                    </h2>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Leads Activos ({activeLeads.length})</h3>
                            {activeLeads.length === 0 ? <p className="text-gray-600 text-xs">Sin leads asignados.</p> : (
                                <div className="flex flex-col gap-2">
                                    {activeLeads.slice(0,4).map(l => (
                                        <Link key={l._id} href="/admin/leads" className="block text-sm text-white bg-[#24242B] p-2 rounded hover:bg-[#33333A] truncate">
                                            {l.name} - <span className="text-yellow-500">{l.crmStatus}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Reservas Activas ({activeReservations.length})</h3>
                            {activeReservations.length === 0 ? <p className="text-gray-600 text-xs">Sin reservas asignadas.</p> : (
                                <div className="flex flex-col gap-2">
                                    {activeReservations.map(r => (
                                        <Link key={r._id} href="/admin/reservas" className="block text-sm text-white bg-[#24242B] p-2 rounded hover:bg-[#33333A] truncate">
                                            Reserva ID: {r._id.toString().slice(-6).toUpperCase()}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* OPERACIONES */}
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-5 flex flex-col">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-[#33333A] pb-2">
                        <Car size={18} className="text-green-500" />
                        Operaciones (Ventas, Doc, Postventa)
                    </h2>
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Ventas en Curso ({activeSales.length})</h3>
                            {activeSales.length === 0 ? <p className="text-gray-600 text-xs">Sin ventas asignadas.</p> : (
                                <div className="flex flex-col gap-2">
                                    {activeSales.slice(0,3).map(s => (
                                        <Link key={s._id} href={`/admin/ventas/${s._id}`} className="block text-sm text-white bg-[#24242B] p-2 rounded hover:bg-[#33333A] truncate">
                                            Venta: {s._id.toString().slice(-6).toUpperCase()}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 text-red-400">Postventa Crítica ({postSalePendings.length})</h3>
                            {postSalePendings.length === 0 ? <p className="text-gray-600 text-xs">Sin postventas críticas.</p> : (
                                <div className="flex flex-col gap-2">
                                    {postSalePendings.slice(0,3).map(s => (
                                        <Link key={s._id} href={`/admin/postventa`} className="block text-sm text-white bg-red-900/20 p-2 rounded hover:bg-red-900/40 truncate border border-red-900/50">
                                            Venta: {s._id.toString().slice(-6).toUpperCase()} - {s.postSaleStatus}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Docs Pendientes ({docPendings.length})</h3>
                            {docPendings.length === 0 ? <p className="text-gray-600 text-xs">Todo al día.</p> : (
                                <div className="flex flex-col gap-2">
                                    {docPendings.slice(0,3).map(s => (
                                        <Link key={s._id} href={`/admin/documentacion`} className="block text-sm text-white bg-[#24242B] p-2 rounded hover:bg-[#33333A] truncate">
                                            Venta: {s._id.toString().slice(-6).toUpperCase()}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
