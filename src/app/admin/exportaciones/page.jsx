'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { Download, ShieldAlert, FileText, Database, Package, Users, UserPlus, CalendarClock, Receipt, Target, MessageSquare, Flag } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import Link from 'next/link';

export default function ExportacionesPage() {
    const { token, user, loading: authLoading } = useAuth();
    const [availableExports, setAvailableExports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState('');

    const canRead = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.EXPORTS_READ) || hasPermission(user, PERMISSIONS.EXPORTS_AUDIT);

    useEffect(() => {
        if (!authLoading && token) {
            loadAvailableExports();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, token]);

    const loadAvailableExports = async () => {
        try {
            setError(null);
            const res = await fetch('/api/admin/exports', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (!res.ok || !data.ok) {
                throw new Error(data.error || 'Error al cargar opciones de exportación');
            }
            
            setAvailableExports(data.available || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type) => {
        try {
            setDownloading(type);
            const res = await fetch(`/api/admin/exports/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || data.error || 'Error en la descarga');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            a.download = `autosporting_${type}_${dateStr}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (err) {
            alert(err.message);
        } finally {
            setDownloading('');
        }
    };

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>;
    }

    if (!canRead) {
        return (
            <div className="p-8 max-w-2xl mx-auto mt-10">
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
                        <p className="text-sm text-red-400 mb-6">No tenés permisos para acceder a las exportaciones.</p>
                        <Link 
                            href="/admin"
                            className="bg-[#E63027] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#C42620] transition-colors"
                        >
                            Volver al Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const exportModules = [
        { id: 'stock', title: 'Stock', icon: Package, desc: 'Inventario de vehículos' },
        { id: 'clientes', title: 'Clientes', icon: Users, desc: 'Base de clientes' },
        { id: 'leads', title: 'Leads', icon: UserPlus, desc: 'Oportunidades de venta' },
        { id: 'reservas', title: 'Reservas', icon: CalendarClock, desc: 'Reservas activas e históricas' },
        { id: 'ventas', title: 'Ventas', icon: Receipt, desc: 'Expedientes de ventas' },
        { id: 'cuotas', title: 'Cuotas', icon: Target, desc: 'Estado de cuotas' },
        { id: 'tareas', title: 'Tareas', icon: CalendarClock, desc: 'Agenda y recordatorios' },
        { id: 'comunicaciones', title: 'Comunicaciones', icon: MessageSquare, desc: 'Historial de contactos' },
        { id: 'plantillas', title: 'Plantillas', icon: FileText, desc: 'Mensajes predefinidos' },
        { id: 'metas', title: 'Metas', icon: Flag, desc: 'Objetivos comerciales' },
        { id: 'auditoria', title: 'Auditoría', icon: ShieldAlert, desc: 'Registro de actividades' },
    ];

    return (
        <div className="max-w-7xl mx-auto p-6 pb-20 text-white">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Download className="text-[#E63027]" />
                    Exportaciones
                </h1>
                <p className="text-neutral-400 mt-1 text-sm">
                    Descargá los datos de los módulos operativos en formato CSV para respaldo o análisis externo.
                </p>
            </div>

            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <ShieldAlert size={20} />
                    <p>{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {exportModules.map(mod => {
                    const isAvailable = availableExports.includes(mod.id);
                    const Icon = mod.icon;
                    return (
                        <div key={mod.id} className={`bg-[#1E1E24] border border-[#33333A] rounded-2xl p-5 flex flex-col ${!isAvailable ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-neutral-300">
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{mod.title}</h3>
                                </div>
                            </div>
                            <p className="text-xs text-neutral-400 mb-5 flex-1">{mod.desc}</p>
                            
                            <button
                                onClick={() => handleDownload(mod.id)}
                                disabled={!isAvailable || downloading === mod.id}
                                className="w-full flex items-center justify-center gap-2 bg-[#E63027] hover:bg-[#C42620] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-bold rounded-xl transition-colors"
                            >
                                {downloading === mod.id ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Exportando...
                                    </>
                                ) : (
                                    <>
                                        <Download size={16} />
                                        Descargar CSV
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
