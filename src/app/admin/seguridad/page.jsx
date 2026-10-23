"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
    ShieldAlert, ShieldCheck, History, Laptop, Monitor, Key, 
    RefreshCw, Filter, Search, AlertTriangle, CheckCircle2, 
    User, Globe, Smartphone, Lock, Ban, Eye, KeyRound, 
    Calendar, Clock, Info, Check, PlusCircle, Trash2, Fingerprint
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import DeviceAuthorizeModal from '../../../components/crm/security/DeviceAuthorizeModal';
import DeviceForensicModal from '../../../components/crm/security/DeviceForensicModal';
import LoginDetailModal from '../../../components/crm/security/LoginDetailModal';
import AlertReviewModal from '../../../components/crm/security/AlertReviewModal';
import { 
    registerNewPasskey, 
    revokeUserPasskey 
} from '../../../services/passkeyClientService';
import toast from 'react-hot-toast';

export default function SecurityCenterPage() {
    const { token, user } = useAuth();
    const isOwner = user?.role === 'owner';

    // Tabs: 'history' | 'alerts' | 'devices' | 'sessions'
    const [activeTab, setActiveTab] = useState('history');

    // Period selector para el panel principal: '24h' | '7d' | '30d'
    const [period, setPeriod] = useState('24h');

    // Loading states
    const [loadingOverview, setLoadingOverview] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingDevices, setLoadingDevices] = useState(false);

    // Data states
    const [overview, setOverview] = useState(null);
    const [historyItems, setHistoryItems] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyFilters, setHistoryFilters] = useState({
        search: '',
        status: 'all',
        method: 'all',
        period: 'all'
    });

    const [alerts, setAlerts] = useState([]);
    const [alertsTotal, setAlertsTotal] = useState(0);
    const [alertsPage, setAlertsPage] = useState(1);
    const [alertFilters, setAlertFilters] = useState({
        status: 'pending',
        severity: 'all'
    });
    const [alertCounts, setAlertCounts] = useState({ pending: 0, critical: 0 });

    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const [devices, setDevices] = useState([]);
    const [totalPasskeys, setTotalPasskeys] = useState(0);

    // Modals
    const [selectedLoginItem, setSelectedLoginItem] = useState(null);
    const [reviewingAlert, setReviewingAlert] = useState(null);
    const [authorizingDevice, setAuthorizingDevice] = useState(null);
    const [selectedForensicDeviceId, setSelectedForensicDeviceId] = useState(null);
    const [registeringPasskey, setRegisteringPasskey] = useState(false);

    // 1. Cargar Métricas y KPIs del Panel Principal
    const fetchOverview = useCallback(async () => {
        if (!token) return;
        setLoadingOverview(true);
        try {
            const res = await fetch(`/api/admin/security/overview?period=${period}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOverview(data);
            }
        } catch (err) {
            console.error('Error fetching security overview:', err);
        } finally {
            setLoadingOverview(false);
        }
    }, [token, period]);

    // 2. Cargar Historial de Logins
    const fetchHistory = useCallback(async () => {
        if (!token) return;
        setLoadingHistory(true);
        try {
            const queryParams = new URLSearchParams({
                page: String(historyPage),
                limit: '20',
                ...(historyFilters.search && { search: historyFilters.search }),
                ...(historyFilters.status !== 'all' && { status: historyFilters.status }),
                ...(historyFilters.method !== 'all' && { method: historyFilters.method }),
                ...(historyFilters.period !== 'all' && { period: historyFilters.period })
            });

            const res = await fetch(`/api/admin/security/logins?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistoryItems(data.items || []);
                setHistoryTotal(data.total || 0);
            }
        } catch (err) {
            console.error('Error fetching login history:', err);
        } finally {
            setLoadingHistory(false);
        }
    }, [token, historyPage, historyFilters]);

    // 3. Cargar Alertas Automáticas
    const fetchAlerts = useCallback(async () => {
        if (!token) return;
        setLoadingAlerts(true);
        try {
            const queryParams = new URLSearchParams({
                page: String(alertsPage),
                limit: '20',
                ...(alertFilters.status !== 'all' && { status: alertFilters.status }),
                ...(alertFilters.severity !== 'all' && { severity: alertFilters.severity })
            });

            const res = await fetch(`/api/admin/security/alerts?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts || []);
                setAlertsTotal(data.total || 0);
                if (data.counts) {
                    setAlertCounts(data.counts);
                }
            }
        } catch (err) {
            console.error('Error fetching security alerts:', err);
        } finally {
            setLoadingAlerts(false);
        }
    }, [token, alertsPage, alertFilters]);

    // 4. Cargar Sesiones Activas
    const fetchSessions = useCallback(async () => {
        if (!token) return;
        setLoadingSessions(true);
        try {
            const res = await fetch('/api/admin/security/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
                setCurrentSessionId(data.currentSessionId);
            }
        } catch (err) {
            console.error('Error fetching sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    }, [token]);

    // 5. Cargar Dispositivos y Passkeys
    const fetchDevices = useCallback(async () => {
        if (!token) return;
        setLoadingDevices(true);
        try {
            const res = await fetch('/api/admin/security/devices', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDevices(data.devices || []);
                setTotalPasskeys(data.totalPasskeys || 0);
            }
        } catch (err) {
            console.error('Error fetching devices:', err);
        } finally {
            setLoadingDevices(false);
        }
    }, [token]);

    // Disparadores de carga
    useEffect(() => {
        if (token) {
            fetchOverview();
        }
    }, [token, fetchOverview]);

    useEffect(() => {
        if (token && activeTab === 'history') {
            fetchHistory();
        }
    }, [token, activeTab, fetchHistory]);

    useEffect(() => {
        if (token && activeTab === 'alerts') {
            fetchAlerts();
        }
    }, [token, activeTab, fetchAlerts]);

    useEffect(() => {
        if (token && activeTab === 'sessions') {
            fetchSessions();
        }
    }, [token, activeTab, fetchSessions]);

    useEffect(() => {
        if (token && activeTab === 'devices') {
            fetchDevices();
        }
    }, [token, activeTab, fetchDevices]);

    const handleRefreshAll = () => {
        fetchOverview();
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'alerts') fetchAlerts();
        if (activeTab === 'sessions') fetchSessions();
        if (activeTab === 'devices') fetchDevices();
        toast.success('Centro de Seguridad actualizado');
    };

    // Revocar sesión individual
    const handleRevokeSession = async (sessionId) => {
        if (!confirm('¿Confirma que desea revocar esta sesión de usuario?')) return;
        try {
            const res = await fetch(`/api/admin/security/sessions/${sessionId}/revoke`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Sesión revocada exitosamente');
                fetchSessions();
                fetchOverview();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Error al revocar sesión');
            }
        } catch {
            toast.error('Error de comunicación con el servidor');
        }
    };

    // Cerrar todas las demás sesiones
    const handleRevokeOtherSessions = async () => {
        if (!confirm('¿Cerrar todas las demás sesiones activas excepto esta terminal?')) return;
        try {
            const res = await fetch('/api/admin/security/sessions/revoke-others', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Se revocaron ${data.revokedCount} sesiones activas`);
                fetchSessions();
                fetchOverview();
            } else {
                toast.error(data.message || 'Error al cerrar sesiones');
            }
        } catch {
            toast.error('Error de comunicación con el servidor');
        }
    };

    // Revocar dispositivo
    const handleRevokeDevice = async (deviceId) => {
        const reason = prompt('Ingrese motivo de la revocación del dispositivo:', 'Revocado por el propietario desde el Centro de Seguridad');
        if (!reason) return;
        try {
            const res = await fetch(`/api/admin/devices/${deviceId}/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                toast.success('Dispositivo revocado y sesiones terminadas');
                fetchDevices();
                fetchOverview();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Error al revocar dispositivo');
            }
        } catch {
            toast.error('Error de comunicación con el servidor');
        }
    };

    // Registrar Passkey (Windows Hello / Hardware)
    const handleRegisterPasskey = async () => {
        setRegisteringPasskey(true);
        try {
            const passkeyName = prompt('Nombre descriptivo para la Passkey:', 'AutoSporting — PRUEBA LOCAL');
            if (!passkeyName) {
                setRegisteringPasskey(false);
                return;
            }

            await registerNewPasskey({
                token,
                name: passkeyName,
                friendlyName: passkeyName
            });

            toast.success('Passkey registrada exitosamente con Windows Hello');
            fetchDevices();
            fetchOverview();
        } catch (err) {
            toast.error(err.message || 'Error durante el registro de Passkey');
        } finally {
            setRegisteringPasskey(false);
        }
    };

    // Revocar Passkey
    const handleRevokePasskey = async (credentialId, name) => {
        if (!confirm(`¿Confirma que desea revocar la Passkey '${name}'?`)) return;
        try {
            await revokeUserPasskey({
                token,
                credentialId,
                reason: 'Revocada desde el Centro de Seguridad'
            });
            toast.success('Passkey revocada');
            fetchDevices();
            fetchOverview();
        } catch (err) {
            toast.error(err.message || 'Error al revocar Passkey');
        }
    };

    if (!isOwner) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-400 mb-4">
                    <ShieldAlert size={36} />
                </div>
                <h1 className="text-xl font-bold text-white mb-2">Acceso Exclusivo del Propietario</h1>
                <p className="max-w-md text-sm text-crm-fg-muted mb-6">
                    El Centro de Seguridad y control de accesos está restringido estrictamente a la cuenta autorizada del Propietario.
                </p>
            </div>
        );
    }

    const kpis = overview?.kpis || {
        successfulLogins24h: 0,
        failedLogins24h: 0,
        activeTrustedDevices: 0,
        openSessions: 0,
        pendingAlerts: 0,
        lastSuccessfulLogin: null
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-300">
            
            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-crm-border pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-md">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black tracking-tight text-white">
                                    Centro de Seguridad
                                </h1>
                                <span className="rounded-full border border-crm-red/30 bg-crm-red/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-crm-red">
                                    Owner Only
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Control de accesos, dispositivos de confianza, sesiones activas y alertas automáticas
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Selector de Rango Temporal */}
                    <div className="flex rounded-xl border border-crm-border bg-crm-surface p-1">
                        {[
                            { id: '24h', label: '24 Horas' },
                            { id: '7d', label: '7 Días' },
                            { id: '30d', label: '30 Días' }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setPeriod(btn.id)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    period === btn.id
                                        ? 'bg-crm-red-gradient text-white shadow-sm'
                                        : 'text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleRefreshAll}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-crm-border bg-crm-surface text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-all"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={14} className={loadingOverview ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                </div>
            </div>

            {/* SECCIÓN 1: PANEL PRINCIPAL (INDICADORES Y KPIS REALES) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                
                {/* KPI 1: Inicios Exitosos 24h */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4.5 space-y-2 hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Logins Exitosos (24h)
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{kpis.successfulLogins24h}</span>
                        <span className="text-[10px] text-emerald-400 font-bold">Autenticados</span>
                    </div>
                    <p className="text-[11px] text-crm-fg-muted">En el periodo: {overview?.periodStats?.totalSuccessful || 0}</p>
                </div>

                {/* KPI 2: Intentos Rechazados */}
                <div className={`rounded-2xl border p-4.5 space-y-2 transition-all ${
                    kpis.failedLogins24h > 0
                        ? 'border-red-500/40 bg-red-500/10'
                        : 'border-crm-border bg-crm-surface hover:border-crm-border-hover'
                }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Intentos Rechazados
                        </span>
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                            kpis.failedLogins24h > 0
                                ? 'border-red-500/40 bg-red-500/20 text-red-400'
                                : 'border-crm-border bg-crm-surface text-crm-fg-muted'
                        }`}>
                            <AlertTriangle size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${kpis.failedLogins24h > 0 ? 'text-red-300' : 'text-white'}`}>
                            {kpis.failedLogins24h}
                        </span>
                        <span className="text-[10px] font-bold text-red-400">En 24h</span>
                    </div>
                    <p className="text-[11px] text-crm-fg-muted">En el periodo: {overview?.periodStats?.totalFailed || 0}</p>
                </div>

                {/* KPI 3: Dispositivos Confiables */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4.5 space-y-2 hover:border-blue-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Terminales Confiables
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400">
                            <Monitor size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{kpis.activeTrustedDevices}</span>
                        <span className="text-[10px] text-blue-400 font-bold">Activas</span>
                    </div>
                    <p className="text-[11px] text-crm-fg-muted">PC Agencia y PC Privada</p>
                </div>

                {/* KPI 4: Sesiones Abiertas */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4.5 space-y-2 hover:border-purple-500/30 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Sesiones Abiertas (Revocables)
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400" title="Tokens JWT revocables en MongoDB. No constituyen presencia en línea por latido continuo.">
                            <KeyRound size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{kpis.openSessions}</span>
                        <span className="text-[10px] text-purple-400 font-bold">En MongoDB</span>
                    </div>
                    <p className="text-[11px] text-crm-fg-muted">Tokens JWT con TTL y revocación inmediata</p>
                </div>

                {/* KPI 5: Alertas Pendientes */}
                <div className={`rounded-2xl border p-4.5 space-y-2 transition-all ${
                    kpis.pendingAlerts > 0
                        ? 'border-amber-500/40 bg-amber-500/10'
                        : 'border-crm-border bg-crm-surface hover:border-crm-border-hover'
                }`}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Alertas Pendientes
                        </span>
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
                            kpis.pendingAlerts > 0
                                ? 'border-amber-500/40 bg-amber-500/20 text-amber-400'
                                : 'border-crm-border bg-crm-surface text-crm-fg-muted'
                        }`}>
                            <ShieldAlert size={16} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${kpis.pendingAlerts > 0 ? 'text-amber-300' : 'text-white'}`}>
                            {kpis.pendingAlerts}
                        </span>
                        {alertCounts.critical > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                {alertCounts.critical} Críticas
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-crm-fg-muted">Requieren verificación</p>
                </div>

                {/* KPI 6: Último Acceso Exitoso */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4.5 space-y-2 hover:border-crm-red/30 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Último Acceso Exitoso
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-crm-red/30 bg-crm-red/10 text-crm-red">
                            <Clock size={16} />
                        </div>
                    </div>
                    {kpis.lastSuccessfulLogin ? (
                        <>
                            <p className="text-xs font-bold text-white truncate">
                                {new Date(kpis.lastSuccessfulLogin.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                <span className="text-[10px] text-crm-fg-muted ml-1 font-normal">
                                    ({new Date(kpis.lastSuccessfulLogin.timestamp).toLocaleDateString('es-AR')})
                                </span>
                            </p>
                            <p className="text-[11px] text-crm-fg-muted truncate">
                                {kpis.lastSuccessfulLogin.deviceName} • {kpis.lastSuccessfulLogin.browser}
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-crm-fg-muted">Sin registros recientes</p>
                    )}
                </div>
            </div>

            {/* NAVEGACIÓN POR PESTAÑAS */}
            <div className="border-b border-crm-border">
                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === 'history'
                                ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm'
                                : 'text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface'
                        }`}
                    >
                        <History size={16} />
                        <span>Historial de Inicios de Sesión</span>
                        {historyTotal > 0 && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/20 text-white">
                                {historyTotal}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === 'alerts'
                                ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm'
                                : 'text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface'
                        }`}
                    >
                        <AlertTriangle size={16} />
                        <span>Alertas de Seguridad</span>
                        {kpis.pendingAlerts > 0 && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                                {kpis.pendingAlerts}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('devices')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === 'devices'
                                ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm'
                                : 'text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface'
                        }`}
                    >
                        <Laptop size={16} />
                        <span>Dispositivos y Passkeys</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/20 text-white">
                            {devices.length} Disp. • {totalPasskeys} Pk
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('sessions')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                            activeTab === 'sessions'
                                ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm'
                                : 'text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface'
                        }`}
                    >
                        <KeyRound size={16} />
                        <span>Sesiones Abiertas (Revocables)</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/20 text-white">
                            {sessions.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* TAB 1: HISTORIAL DE INICIOS DE SESIÓN */}
            {activeTab === 'history' && (
                <div className="space-y-4">
                    {/* Filtros y Búsqueda */}
                    <div className="flex flex-col md:flex-row gap-3 p-4 rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                            <input
                                type="text"
                                placeholder="Buscar por IP, correo, terminal o motivo..."
                                value={historyFilters.search}
                                onChange={(e) => {
                                    setHistoryFilters(prev => ({ ...prev, search: e.target.value }));
                                    setHistoryPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-crm-border bg-crm-surface-raised text-crm-fg placeholder:text-crm-fg-muted/60 focus:border-crm-red focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Filtro Resultado */}
                            <select
                                value={historyFilters.status}
                                onChange={(e) => {
                                    setHistoryFilters(prev => ({ ...prev, status: e.target.value }));
                                    setHistoryPage(1);
                                }}
                                className="px-3 py-2 text-xs rounded-xl border border-crm-border bg-crm-surface-raised text-crm-fg focus:border-crm-red focus:outline-none"
                            >
                                <option value="all">Todos los Resultados</option>
                                <option value="success">Solo Exitosos</option>
                                <option value="failed">Solo Rechazados</option>
                            </select>

                            {/* Filtro Periodo */}
                            <select
                                value={historyFilters.period}
                                onChange={(e) => {
                                    setHistoryFilters(prev => ({ ...prev, period: e.target.value }));
                                    setHistoryPage(1);
                                }}
                                className="px-3 py-2 text-xs rounded-xl border border-crm-border bg-crm-surface-raised text-crm-fg focus:border-crm-red focus:outline-none"
                            >
                                <option value="all">Todo el Historial</option>
                                <option value="24h">Últimas 24 Horas</option>
                                <option value="7d">Últimos 7 Días</option>
                                <option value="30d">Últimos 30 Días</option>
                            </select>
                        </div>
                    </div>

                    {/* Disclaimer Geolocalización */}
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200">
                        <Info size={16} className="shrink-0 mt-0.5 text-blue-400" />
                        <p className="text-xs leading-relaxed">
                            <strong>Aviso de Privacidad y Geolocalización:</strong> La geolocalización aproximada de las direcciones IP refleja enrutamiento de red y telecomunicaciones de proveedores de internet. No representa ni certifica un domicilio físico exacto ni prueba de presencia o identidad física.
                        </p>
                    </div>

                    {/* Lista / Tabla de Logins */}
                    {loadingHistory ? (
                        <div className="flex justify-center p-12">
                            <RefreshCw size={28} className="animate-spin text-crm-red" />
                        </div>
                    ) : historyItems.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                            <History size={36} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-bold">No se encontraron registros de inicio de sesión</p>
                            <p className="text-xs mt-1">Ajuste los filtros o el rango temporal</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {historyItems.map((item) => {
                                const isSuccess = item.result === 'SUCCESS';
                                return (
                                    <div
                                        key={item.id}
                                        className="flex flex-col lg:flex-row lg:items-center justify-between p-4 rounded-xl border border-crm-border bg-crm-surface hover:bg-crm-surface-raised hover:border-crm-border-hover transition-all gap-3"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                                                isSuccess
                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                                    : 'border-red-500/30 bg-red-500/10 text-red-400'
                                            }`}>
                                                {isSuccess ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-bold text-white">
                                                        {item.userEmail}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                        isSuccess
                                                            ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                                                            : 'border-red-500/30 bg-red-500/20 text-red-300'
                                                    }`}>
                                                        {isSuccess ? 'Exitoso' : 'Rechazado'}
                                                    </span>
                                                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-crm-border bg-crm-surface text-crm-fg-muted">
                                                        {item.authMethod}
                                                    </span>
                                                    {item.deviceName && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-300">
                                                            {item.deviceName}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-crm-fg-muted">
                                                    <span>{new Date(item.timestamp).toLocaleString('es-AR')}</span>
                                                    <span>•</span>
                                                    <span className="font-mono text-crm-fg">{item.ip}</span>
                                                    <span>•</span>
                                                    <span>{item.browser} ({item.os})</span>
                                                </div>
                                                {item.failureReason && (
                                                    <p className="text-xs text-red-400 font-medium mt-1">
                                                        Motivo: {item.failureReason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                                            <button
                                                onClick={() => setSelectedLoginItem(item)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crm-border bg-crm-surface text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                                            >
                                                <Eye size={14} />
                                                <span>Ver Detalle</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Paginación */}
                            {historyTotal > 20 && (
                                <div className="flex items-center justify-between pt-4 border-t border-crm-border">
                                    <span className="text-xs text-crm-fg-muted">
                                        Página {historyPage} de {Math.ceil(historyTotal / 20)} ({historyTotal} registros)
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={historyPage <= 1}
                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-crm-border bg-crm-surface text-crm-fg disabled:opacity-40"
                                        >
                                            Anterior
                                        </button>
                                        <button
                                            disabled={historyPage >= Math.ceil(historyTotal / 20)}
                                            onClick={() => setHistoryPage(p => p + 1)}
                                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-crm-border bg-crm-surface text-crm-fg disabled:opacity-40"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ALERTAS DE SEGURIDAD */}
            {activeTab === 'alerts' && (
                <div className="space-y-4">
                    {/* Filtros de Alertas */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => { setAlertFilters(prev => ({ ...prev, status: 'pending' })); setAlertPage(1); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                    alertFilters.status === 'pending'
                                        ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                                        : 'border-crm-border text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                Pendientes ({alertCounts.pending})
                            </button>
                            <button
                                onClick={() => { setAlertFilters(prev => ({ ...prev, status: 'reviewed' })); setAlertPage(1); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                    alertFilters.status === 'reviewed'
                                        ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                        : 'border-crm-border text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                Revisadas
                            </button>
                            <button
                                onClick={() => { setAlertFilters(prev => ({ ...prev, status: 'all' })); setAlertPage(1); }}
                                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                    alertFilters.status === 'all'
                                        ? 'border-crm-red/40 bg-crm-red/20 text-white'
                                        : 'border-crm-border text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                Todas
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-crm-fg-muted font-bold">Severidad:</span>
                            <select
                                value={alertFilters.severity}
                                onChange={(e) => {
                                    setAlertFilters(prev => ({ ...prev, severity: e.target.value }));
                                    setAlertPage(1);
                                }}
                                className="px-3 py-1.5 text-xs rounded-xl border border-crm-border bg-crm-surface-raised text-crm-fg focus:border-crm-red focus:outline-none"
                            >
                                <option value="all">Todas las Severidades</option>
                                <option value="critical">Solo Críticas</option>
                                <option value="warning">Solo Advertencias</option>
                                <option value="info">Solo Informativas</option>
                            </select>
                        </div>
                    </div>

                    {/* Aviso Desacoplado de Notificaciones */}
                    <div className="p-3.5 rounded-xl border border-crm-border bg-crm-surface-raised flex items-center justify-between text-xs text-crm-fg-muted">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-crm-red" />
                            <span>
                                <strong>Canales de notificación:</strong> Almacenamiento interno de auditoría activo. Canales externos (WhatsApp, Email, SMS) diseñados en estado latente.
                            </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/30 border border-white/5">
                            DISPATCHER_READY
                        </span>
                    </div>

                    {/* Lista de Alertas */}
                    {loadingAlerts ? (
                        <div className="flex justify-center p-12">
                            <RefreshCw size={28} className="animate-spin text-crm-red" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                            <CheckCircle2 size={36} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                            <p className="text-sm font-bold text-white">No hay alertas de seguridad en esta categoría</p>
                            <p className="text-xs mt-1">El sistema no registra anomalías pendientes de revisión.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map((alert) => {
                                const isCritical = alert.severity === 'critical';
                                const isWarning = alert.severity === 'warning';
                                const isReviewed = alert.status === 'reviewed';

                                return (
                                    <div
                                        key={alert.alertId}
                                        className={`p-4 rounded-xl border transition-all ${
                                            isReviewed
                                                ? 'border-crm-border bg-crm-surface opacity-75'
                                                : isCritical
                                                ? 'border-red-500/40 bg-red-500/10'
                                                : isWarning
                                                ? 'border-amber-500/40 bg-amber-500/10'
                                                : 'border-blue-500/40 bg-blue-500/10'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                                                        isCritical
                                                            ? 'border-red-500/40 bg-red-500/20 text-red-300'
                                                            : isWarning
                                                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                                                            : 'border-blue-500/40 bg-blue-500/20 text-blue-300'
                                                    }`}>
                                                        {alert.severity}
                                                    </span>
                                                    <span className="text-sm font-bold text-white">
                                                        {alert.title}
                                                    </span>
                                                    {isReviewed && (
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 text-emerald-300">
                                                            Revisada
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-crm-fg-muted">
                                                    {alert.description}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-crm-fg-muted font-mono">
                                                    <span>{new Date(alert.createdAt).toLocaleString('es-AR')}</span>
                                                    {alert.ip && <span>• IP: {alert.ip}</span>}
                                                    {alert.userEmail && <span>• Usuario: {alert.userEmail}</span>}
                                                </div>

                                                {isReviewed && alert.reviewNotes && (
                                                    <div className="mt-2 p-2.5 rounded-lg bg-black/20 border border-white/5 text-xs text-emerald-200">
                                                        <strong>Notas de verificación:</strong> {alert.reviewNotes}
                                                        {alert.reviewedBy && (
                                                            <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                                                Por {alert.reviewedBy.name || alert.reviewedBy.email} el {new Date(alert.reviewedAt).toLocaleString('es-AR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {!isReviewed && (
                                                <div className="shrink-0 self-end md:self-center">
                                                    <button
                                                        onClick={() => setReviewingAlert(alert)}
                                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-xs font-bold text-white shadow-sm transition-all"
                                                    >
                                                        <Check size={14} />
                                                        <span>Marcar Revisada</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: DISPOSITIVOS Y PASSKEYS */}
            {activeTab === 'devices' && (
                <div className="space-y-8">
                    {/* Sub-panel Dispositivos */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-bold text-white">Dispositivos Autorizados</h3>
                                <p className="text-xs text-crm-fg-muted">
                                    Terminales físicas con identidad criptográfica ECDSA P-256
                                </p>
                            </div>
                            <button
                                onClick={() => setAuthorizingDevice({ deviceId: 'nueva_terminal' })}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-crm-red-gradient text-xs font-bold text-white shadow-crm-shadow-red shadow-sm"
                            >
                                <PlusCircle size={15} />
                                <span>Autorizar Nuevo Dispositivo</span>
                            </button>
                        </div>

                        {/* Aclaración sobre Identidad de Dispositivo */}
                        <div className="flex items-start gap-3 p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-200 text-xs leading-relaxed">
                            <Info size={16} className="shrink-0 text-blue-400 mt-0.5" />
                            <div>
                                <span className="font-bold text-white">Aclaración de Identidad: </span>
                                Un &quot;dispositivo confiable&quot; representa una clave criptográfica (ECDSA P-256) custodiada en el almacenamiento local del navegador web, no una prueba física inmutable de identidad humana de la persona.
                            </div>
                        </div>

                        {loadingDevices ? (
                            <div className="flex justify-center p-8">
                                <RefreshCw size={24} className="animate-spin text-crm-red" />
                            </div>
                        ) : devices.length === 0 ? (
                            <div className="p-8 text-center rounded-2xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                                <Laptop size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-bold">No hay dispositivos autorizados</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {devices.map((dev) => {
                                    const isTrusted = dev.status === 'trusted';
                                    const isRevoked = dev.status === 'revoked';

                                    return (
                                        <div
                                            key={dev.deviceId}
                                            className="rounded-2xl border border-crm-border bg-crm-surface p-5 space-y-4 hover:border-crm-border-hover transition-all"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                                                        isTrusted 
                                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                                                            : isRevoked
                                                            ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                                            : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                                    }`}>
                                                        {dev.deviceName?.includes('Privada') ? <Laptop size={20} /> : <Monitor size={20} />}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white">{dev.deviceName}</h4>
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                                            isTrusted
                                                                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                                                                : isRevoked
                                                                ? 'border-red-500/30 bg-red-500/20 text-red-300'
                                                                : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                                                        }`}>
                                                            {dev.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1 text-xs text-crm-fg-muted font-mono">
                                                <p className="truncate">ID: {dev.deviceId}</p>
                                                <p>Visto: {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString('es-AR') : 'Nunca'}</p>
                                                {dev.passkeys && dev.passkeys.length > 0 && (
                                                    <p className="text-blue-300 font-sans font-medium pt-1">
                                                        🔑 {dev.passkeys.length} Passkey(s) asociada(s)
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-crm-border">
                                                <button
                                                    onClick={() => setSelectedForensicDeviceId(dev.deviceId)}
                                                    className="text-xs font-bold text-crm-fg-muted hover:text-white flex items-center gap-1"
                                                >
                                                    <Eye size={13} />
                                                    <span>Auditoría Forense</span>
                                                </button>

                                                {isTrusted && (
                                                    <button
                                                        onClick={() => handleRevokeDevice(dev.deviceId)}
                                                        className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1"
                                                    >
                                                        <Ban size={13} />
                                                        <span>Revocar</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sub-panel Passkeys */}
                    <div className="space-y-4 pt-6 border-t border-crm-border">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-bold text-white">Passkeys / WebAuthn (FIDO2)</h3>
                                <p className="text-xs text-crm-fg-muted">
                                    Credenciales criptográficas en hardware (Windows Hello / Touch ID / YubiKey)
                                </p>
                            </div>
                            <button
                                onClick={handleRegisterPasskey}
                                disabled={registeringPasskey}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all disabled:opacity-50"
                            >
                                <Fingerprint size={16} />
                                <span>{registeringPasskey ? 'Esperando Biometría...' : 'Registrar Passkey (Windows Hello)'}</span>
                            </button>
                        </div>

                        {/* Listado de passkeys asociadas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {devices.flatMap(d => d.passkeys || []).map((pk) => (
                                <div
                                    key={pk.credentialId}
                                    className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                                                <Key size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-white">{pk.name}</h4>
                                                <span className="text-[10px] text-purple-300 uppercase font-mono">
                                                    {pk.deviceType}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRevokePasskey(pk.credentialId, pk.name)}
                                            className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                            title="Revocar passkey"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] font-mono text-crm-fg-muted truncate">
                                        ID: {pk.credentialId}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: SESIONES ABIERTAS */}
            {activeTab === 'sessions' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-crm-border bg-crm-surface">
                        <div>
                            <h3 className="text-sm font-bold text-white">Sesiones Abiertas (Revocables)</h3>
                            <p className="text-xs text-crm-fg-muted">
                                Registros en base de datos con TTL/expiración. No constituyen presencia en línea continua por WebSocket o latido de red.
                            </p>
                        </div>
                        {sessions.length > 1 && (
                            <button
                                onClick={handleRevokeOtherSessions}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-xs font-bold text-white shadow-sm transition-all"
                            >
                                <Ban size={14} />
                                <span>Cerrar Todas las Demás Sesiones</span>
                            </button>
                        )}
                    </div>

                    {loadingSessions ? (
                        <div className="flex justify-center p-8">
                            <RefreshCw size={24} className="animate-spin text-crm-red" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                            <KeyRound size={32} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-bold">No hay sesiones abiertas registradas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((sess) => (
                                <div
                                    key={sess.sessionId}
                                    className={`p-4 rounded-xl border transition-all ${
                                        sess.isCurrent
                                            ? 'border-emerald-500/40 bg-emerald-500/10'
                                            : 'border-crm-border bg-crm-surface'
                                    }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                                                sess.isCurrent
                                                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                                                    : 'border-crm-border bg-crm-surface text-crm-fg-muted'
                                            }`}>
                                                <KeyRound size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white">
                                                        {sess.deviceName || 'Terminal de trabajo'}
                                                    </span>
                                                    {sess.isCurrent && (
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 text-emerald-300">
                                                            Esta Sesión (Actual)
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-crm-fg-muted font-mono truncate mt-0.5">
                                                    ID: {sess.sessionId}
                                                </p>
                                                <p className="text-xs text-crm-fg-muted mt-1">
                                                    Iniciada: {sess.loginAt ? new Date(sess.loginAt).toLocaleString('es-AR') : 'S/D'} • Expira: {sess.expiresAt ? new Date(sess.expiresAt).toLocaleString('es-AR') : 'S/D'}
                                                </p>
                                            </div>
                                        </div>

                                        {!sess.isCurrent && (
                                            <div className="shrink-0 self-end md:self-center">
                                                <button
                                                    onClick={() => handleRevokeSession(sess.sessionId)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-colors"
                                                >
                                                    <Ban size={13} />
                                                    <span>Cerrar Sesión</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* MODALES AUXILIARES */}
            {selectedLoginItem && (
                <LoginDetailModal
                    item={selectedLoginItem}
                    onClose={() => setSelectedLoginItem(null)}
                />
            )}

            {reviewingAlert && (
                <AlertReviewModal
                    alert={reviewingAlert}
                    onClose={() => setReviewingAlert(null)}
                    onReviewSuccess={(updated) => {
                        setAlerts(prev => prev.map(a => a.alertId === updated.alertId ? updated : a));
                        fetchOverview();
                        fetchAlerts();
                    }}
                />
            )}

            {authorizingDevice && (
                <DeviceAuthorizeModal
                    device={authorizingDevice}
                    onClose={() => setAuthorizingDevice(null)}
                    onSuccess={() => {
                        setAuthorizingDevice(null);
                        fetchDevices();
                        fetchOverview();
                    }}
                />
            )}

            {selectedForensicDeviceId && (
                <DeviceForensicModal
                    deviceId={selectedForensicDeviceId}
                    onClose={() => setSelectedForensicDeviceId(null)}
                />
            )}
        </div>
    );
}
