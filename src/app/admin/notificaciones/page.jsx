"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Bell, CheckCheck, Filter, RefreshCw, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
    const { user, hasPermission } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // all, unread, read
    const [filterSeverity, setFilterSeverity] = useState('all'); // all, danger, warning, info, success
    const [filterModule, setFilterModule] = useState('all'); 
    
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await fetch('/api/admin/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (key) => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/admin/notifications/${key}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === key ? { ...n, read: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const token = localStorage.getItem('token');
            const unreadKeys = notifications.filter(n => !n.read).map(n => n.id);
            if (unreadKeys.length === 0) return;
            await fetch(`/api/admin/notifications/read-all`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ keys: unreadKeys })
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filterStatus === 'unread' && n.read) return false;
        if (filterStatus === 'read' && !n.read) return false;
        if (filterSeverity !== 'all' && n.severity !== filterSeverity) return false;
        if (filterModule !== 'all' && n.module !== filterModule) return false;
        return true;
    });

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'danger': return <ShieldAlert size={18} className="text-red-500" />;
            case 'warning': return <AlertTriangle size={18} className="text-yellow-500" />;
            case 'success': return <CheckCheck size={18} className="text-green-500" />;
            case 'info':
            default: return <Info size={18} className="text-blue-500" />;
        }
    };

    if (!user) return null;

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Bell className="text-indigo-500" />
                        Centro de Notificaciones
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Alertas y recordatorios operativos de todo el sistema.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchNotifications}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1E1E24] border border-[#33333A] rounded-xl text-white text-sm font-bold hover:bg-[#2A2A32] transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        Actualizar
                    </button>
                    {notifications.some(n => !n.read) && (
                        <button 
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-2 px-4 py-2 bg-[#E63027] rounded-xl text-white text-sm font-bold hover:bg-[#C42620] transition-colors"
                        >
                            <CheckCheck size={16} />
                            Marcar todas como leídas
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-[#161619] border border-[#33333A] rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
                <Filter size={16} className="text-gray-400" />
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-[#0B0B0D] border border-[#33333A] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                >
                    <option value="all">Todas</option>
                    <option value="unread">No leídas</option>
                    <option value="read">Leídas</option>
                </select>
                <select 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="bg-[#0B0B0D] border border-[#33333A] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                >
                    <option value="all">Cualquier Severidad</option>
                    <option value="danger">Urgente / Peligro</option>
                    <option value="warning">Advertencia</option>
                    <option value="info">Informativa</option>
                </select>
                <select 
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="bg-[#0B0B0D] border border-[#33333A] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
                >
                    <option value="all">Todos los Módulos</option>
                    <option value="cuotas">Cuotas</option>
                    <option value="agenda">Agenda / Tareas</option>
                    <option value="documentacion">Documentación</option>
                    <option value="postventa">Postventa</option>
                    <option value="reservas">Reservas</option>
                    {['owner', 'admin'].includes(user.role) && <option value="auditoria">Auditoría</option>}
                </select>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : filteredNotifications.length === 0 ? (
                <div className="bg-[#161619] border border-[#33333A] rounded-xl p-12 text-center flex flex-col items-center">
                    <Bell size={48} className="text-gray-600 mb-4" />
                    <h3 className="text-xl font-bold text-white">Todo al día</h3>
                    <p className="text-gray-400 mt-2">No tienes notificaciones con estos filtros.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredNotifications.map((n) => (
                        <div key={n.id} className={`flex flex-col md:flex-row md:items-center gap-4 bg-[#161619] border border-[#33333A] rounded-xl p-4 transition-all ${n.read ? 'opacity-60 grayscale-[50%]' : 'hover:border-gray-500 shadow-lg relative overflow-hidden'}`}>
                            {!n.read && (
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${n.severity === 'danger' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-yellow-500' : n.severity === 'success' ? 'bg-green-500' : 'bg-[#E63027]'}`}></div>
                            )}
                            <div className="flex items-start gap-4 flex-1 pl-2">
                                <div className="mt-1">
                                    {getSeverityIcon(n.severity)}
                                </div>
                                <div>
                                    <h3 className={`text-sm font-bold ${n.read ? 'text-gray-400' : 'text-white'}`}>{n.title}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{n.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-[#24242B] px-2 py-0.5 rounded-md">
                                            {n.module}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            {new Date(n.createdAt).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-4 md:mt-0 pl-10 md:pl-0">
                                {!n.read && (
                                    <button 
                                        onClick={() => handleMarkAsRead(n.id)}
                                        className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                    >
                                        Marcar leída
                                    </button>
                                )}
                                <Link 
                                    href={n.href}
                                    className="px-4 py-2 bg-[#24242B] hover:bg-[#33333A] border border-[#33333A] rounded-lg text-white text-xs font-bold transition-colors"
                                >
                                    Ver Módulo
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
