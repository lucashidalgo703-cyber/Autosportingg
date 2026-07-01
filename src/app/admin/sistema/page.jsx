'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { ShieldAlert, Activity, RefreshCw, Server, Database, Users, ActivitySquare, AlertTriangle, CheckCircle2, Clock, Cloud, Mail, MessageCircle } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import SettingsTabs from '../../../components/crm/settings/SettingsTabs';
import Link from 'next/link';

export default function SystemHealthPage() {
    const { token, user, loading: authLoading } = useAuth();
    const [healthData, setHealthData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const canRead = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.SYSTEMHEALTH_READ);
    const integrationServices = healthData?.integrations ? Object.values(healthData.integrations) : [];

    const getIntegrationStatusClass = (status) => {
        if (status === 'ok') return 'text-green-400 bg-green-500/10 border-green-500/20';
        if (status === 'critical') return 'text-red-400 bg-red-500/10 border-red-500/20';
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    };

    const getIntegrationIcon = (key) => {
        if (key === 'mongodb') return <Database size={18} className="text-crm-fg-muted" />;
        if (key === 'cloudinary') return <Cloud size={18} className="text-crm-fg-muted" />;
        if (key === 'email') return <Mail size={18} className="text-crm-fg-muted" />;
        if (key === 'whatsapp') return <MessageCircle size={18} className="text-crm-fg-muted" />;
        return <Activity size={18} className="text-crm-fg-muted" />;
    };

    const loadHealthData = async () => {
        try {
            setRefreshing(true);
            setError(null);
            const res = await fetch('/api/admin/system-health', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (!res.ok || !data.ok) {
                throw new Error(data.error || data.message || 'Error al cargar salud del sistema');
            }
            
            setHealthData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!authLoading && token) {
            loadHealthData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, token]);

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
                        <p className="text-sm text-red-400 mb-6">No tenés permisos para acceder al panel de salud del sistema.</p>
                        <Link 
                            href="/admin"
                            className="bg-crm-red text-white px-6 py-2 rounded-xl font-bold hover:bg-crm-red-hover transition-colors"
                        >
                            Volver al Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-20 text-white">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        Configuración
                    </h1>
                    <p className="text-crm-fg-muted mt-1 text-sm">
                        Métricas de rendimiento, conteos y estado de base de datos.
                    </p>
                </div>
                <button 
                    onClick={loadHealthData}
                    disabled={refreshing}
                    className="flex items-center gap-2 bg-crm-surface hover:bg-crm-surface-raised border border-crm-border text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    {refreshing ? 'Actualizando...' : 'Actualizar Estado'}
                </button>
            </div>

            <SettingsTabs />

            {error ? (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <ShieldAlert size={20} />
                    <p>{error}</p>
                </div>
            ) : !healthData ? (
                <div className="text-center text-crm-fg-muted py-10">
                    No se pudo cargar la información del sistema.
                </div>
            ) : (
                <div className="space-y-6">
                    {/* A. Estado General y Database */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                                <Server size={18} className="text-crm-fg-muted" />
                                Estado General
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-crm-border">
                                    <span className="text-sm text-crm-fg-muted">Estado</span>
                                    {healthData.warnings.length === 0 ? (
                                        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20">SALUDABLE</span>
                                    ) : (
                                        <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">ADVERTENCIAS ({healthData.warnings.length})</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-crm-border">
                                    <span className="text-sm text-crm-fg-muted">Ambiente</span>
                                    <span className="text-sm text-white capitalize">{healthData.environment}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-crm-fg-muted">Generado a las</span>
                                    <span className="text-sm text-white">
                                        {new Date(healthData.generatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} hs
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                                <Database size={18} className="text-crm-fg-muted" />
                                Base de Datos
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-crm-border">
                                    <span className="text-sm text-crm-fg-muted">Conexión</span>
                                    {healthData.database.connected ? (
                                        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20 flex items-center gap-1"><CheckCircle2 size={12}/> ONLINE</span>
                                    ) : (
                                        <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20 flex items-center gap-1"><AlertTriangle size={12}/> OFFLINE</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center pb-2 border-b border-crm-border">
                                    <span className="text-sm text-crm-fg-muted">Estado Node Driver</span>
                                    <span className="text-sm text-white capitalize">{healthData.database.status}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-crm-fg-muted">Latencia</span>
                                    <span className={`text-sm font-medium ${healthData.database.latencyMs < 500 ? 'text-green-400' : 'text-red-400'}`}>
                                        {healthData.database.latencyMs} ms
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* C. Conteos Principales */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                            <ActivitySquare size={18} className="text-crm-fg-muted" />
                            Conteos Principales
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { label: 'Usuarios Activos', count: healthData.counts.activeUsers },
                                { label: 'Stock Total', count: healthData.counts.cars },
                                { label: 'Clientes', count: healthData.counts.clients },
                                { label: 'Leads', count: healthData.counts.leads },
                                { label: 'Ventas', count: healthData.counts.sales },
                                { label: 'Reservas', count: healthData.counts.reservations },
                                { label: 'Tareas', count: healthData.counts.tasks },
                                { label: 'Comunicaciones', count: healthData.counts.communicationLogs },
                                { label: 'Cuotas', count: healthData.counts.installments },
                                { label: 'Plantillas', count: healthData.counts.messageTemplates }
                            ].map((item, index) => (
                                <div key={index} className="bg-crm-bg border border-crm-border rounded-xl p-4 text-center">
                                    <p className="text-xs text-crm-fg-muted uppercase font-medium tracking-wider mb-1">{item.label}</p>
                                    <p className="text-2xl font-bold text-white">{item.count.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* D. Checks Técnicos */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                            <ShieldAlert size={18} className="text-crm-fg-muted" />
                            Checks Técnicos
                        </h2>
                        <div className="space-y-3">
                            {healthData.checks.map((check, index) => (
                                <div key={index} className="flex items-start md:items-center gap-4 bg-crm-bg border border-crm-border p-4 rounded-xl">
                                    <div className="shrink-0 mt-1 md:mt-0">
                                        {check.status === 'ok' ? (
                                            <CheckCircle2 className="text-green-500" size={24} />
                                        ) : check.status === 'warning' ? (
                                            <AlertTriangle className="text-amber-500" size={24} />
                                        ) : (
                                            <AlertTriangle className="text-red-500" size={24} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-bold text-white">{check.name}</h3>
                                        <p className="text-xs text-crm-fg-muted mt-0.5">{check.description}</p>
                                    </div>
                                    {check.suggestedAction && (
                                        <div className="hidden md:block text-right">
                                            <p className="text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md">
                                                Acción: {check.suggestedAction}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* E. Integraciones Externas */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                            <Activity size={18} className="text-crm-fg-muted" />
                            Integraciones Externas
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {integrationServices.map((service) => (
                                <div key={service.key} className="bg-crm-bg border border-crm-border rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">{getIntegrationIcon(service.key)}</div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white">{service.name}</h3>
                                                <p className="mt-1 text-xs text-crm-fg-muted">{service.detail}</p>
                                                {service.provider && service.provider !== 'none' && (
                                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-crm-fg-subtle">Modo: {service.provider}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={'shrink-0 rounded-md border px-2 py-1 text-[10px] font-black uppercase ' + getIntegrationStatusClass(service.status)}>
                                            {service.status === 'ok' ? 'OK' : service.status === 'critical' ? 'Error' : 'Pendiente'}
                                        </span>
                                    </div>
                                    {service.missing?.length > 0 && (
                                        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                                            Faltan: {service.missing.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* F. Actividad Reciente */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                            <Clock size={18} className="text-crm-fg-muted" />
                            Actividad Reciente (Auditoría)
                        </h2>
                        <div className="overflow-x-auto">
                            {healthData.recentActivity.length === 0 ? (
                                <p className="text-sm text-crm-fg-muted p-4 text-center">No hay actividad reciente registrada.</p>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-crm-border">
                                            <th className="py-2 text-xs font-semibold text-crm-fg-muted uppercase">Fecha y Hora</th>
                                            <th className="py-2 text-xs font-semibold text-crm-fg-muted uppercase">Acción</th>
                                            <th className="py-2 text-xs font-semibold text-crm-fg-muted uppercase">Módulo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {healthData.recentActivity.map(log => (
                                            <tr key={log._id} className="border-b border-crm-border last:border-0 hover:bg-crm-surface-raised transition-colors">
                                                <td className="py-3 text-crm-fg-muted pr-4 whitespace-nowrap">
                                                    {new Date(log.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs
                                                </td>
                                                <td className="py-3 text-white pr-4">
                                                    <span className="font-medium">{log.action}</span>
                                                    {log.entityLabel && <span className="text-crm-fg-muted text-xs ml-2">({log.entityLabel})</span>}
                                                </td>
                                                <td className="py-3 text-crm-fg-muted capitalize">{log.module}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
