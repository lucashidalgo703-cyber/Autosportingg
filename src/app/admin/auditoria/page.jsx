"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
    ShieldAlert, Search, RefreshCw, Filter, Monitor, Laptop, 
    ShieldCheck, ShieldX, Clock, Globe, History, User, Car, 
    DollarSign, AlertTriangle, CheckCircle2, ExternalLink, Lock, 
    PlusCircle, Ban, Eye, KeyRound
} from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { useAuth } from '../../../context/AuthContext';
import DeviceAuthorizeModal from '../../../components/crm/security/DeviceAuthorizeModal';
import DeviceForensicModal from '../../../components/crm/security/DeviceForensicModal';
import { getPersistentDeviceId } from '../../../services/deviceSecurityService';

export default function AuditPage() {
    const { user, token } = useAuth();
    const isOwner = user?.role === 'owner';

    // Tabs: 'dispositivos' | 'logs'
    const [activeTab, setActiveTab] = useState('dispositivos');

    // Estado de Dispositivos
    const [devices, setDevices] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [currentDeviceId, setCurrentDeviceId] = useState('');
    const [authorizingDevice, setAuthorizingDevice] = useState(null);
    const [selectedForensicDeviceId, setSelectedForensicDeviceId] = useState(null);

    // Estado de Logs
    const [logs, setLogs] = useState([]);
    const [totalLogs, setTotalLogs] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        module: '',
        action: '',
        deviceId: '',
        deviceName: ''
    });

    const limit = 50;

    // Obtener ID del dispositivo del navegador actual
    useEffect(() => {
        const id = getPersistentDeviceId();
        setCurrentDeviceId(id);
    }, []);

    // Cargar dispositivos registrados
    const fetchDevices = useCallback(async () => {
        if (!token) return;
        setLoadingDevices(true);
        try {
            const res = await fetch('/api/admin/devices', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDevices(data.devices || []);
            }
        } catch (error) {
            console.error('Error fetching devices:', error);
        } finally {
            setLoadingDevices(false);
        }
    }, [token]);

    // Cargar logs de auditoría
    const fetchLogs = useCallback(async () => {
        if (!token) return;
        setLoadingLogs(true);
        try {
            const queryParams = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                ...(filters.search && { search: filters.search }),
                ...(filters.module && { module: filters.module }),
                ...(filters.action && { action: filters.action }),
                ...(filters.deviceId && { deviceId: filters.deviceId }),
                ...(filters.deviceName && { deviceName: filters.deviceName })
            });

            const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Error al cargar logs');
            
            const data = await res.json();
            setLogs(data.logs || []);
            setTotalLogs(data.total || 0);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    }, [token, page, filters]);

    // Inicializar datos
    useEffect(() => {
        if (token) {
            fetchDevices();
        }
    }, [token, fetchDevices]);

    useEffect(() => {
        if (token && activeTab === 'logs') {
            fetchLogs();
        }
    }, [token, activeTab, page, filters.module, filters.action, filters.deviceId, filters.deviceName, fetchLogs]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const handleRefreshAll = () => {
        if (activeTab === 'dispositivos') {
            fetchDevices();
        } else {
            fetchLogs();
        }
    };

    // Clasificación de computadoras
    const pcAgencia = devices.find(d => d.deviceName === 'PC Agencia' && d.status === 'trusted');
    const pcPrivada = devices.find(d => d.deviceName === 'PC Privada' && d.status === 'trusted');
    const unknownDevices = devices.filter(d => d.status === 'unknown' || d.status === 'pending_verification');
    const revokedDevices = devices.filter(d => d.status === 'revoked');
    
    // Dispositivo actual de este navegador
    const currentDeviceMatch = devices.find(d => d.deviceId === currentDeviceId);

    return (
        <PermissionGuard permission={PERMISSIONS.AUDITORIA_READ}>
            <div className="max-w-7xl mx-auto flex flex-col h-full min-h-[85vh] text-crm-fg">
                
                {/* Header Superior */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-crm-red/10 flex items-center justify-center border border-crm-red/20 text-crm-red">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Seguridad y Auditoría</h1>
                            <p className="text-xs text-crm-fg-muted mt-0.5">
                                Registro definitivo de terminales autorizadas, control de sesiones y auditoría forense inmutable.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefreshAll}
                            disabled={loadingDevices || loadingLogs}
                            className="h-10 px-4 rounded-xl bg-crm-surface hover:bg-crm-surface-raised text-white text-sm transition-colors flex items-center gap-2 border border-crm-border"
                        >
                            <RefreshCw size={16} className={(loadingDevices || loadingLogs) ? "animate-spin" : ""} />
                            <span>Actualizar</span>
                        </button>
                    </div>
                </div>

                {/* Navegación por Pestañas */}
                <div className="w-full border-b border-crm-border mb-6 overflow-x-auto hide-scrollbar">
                    <div className="flex gap-2 min-w-max pb-2 px-1">
                        <button
                            onClick={() => setActiveTab('dispositivos')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'dispositivos'
                                    ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm'
                                    : 'text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface border border-transparent hover:border-crm-border'
                            }`}
                        >
                            <Monitor size={16} />
                            <span>Mis Computadoras y Dispositivos</span>
                            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-black/20 text-white font-mono">
                                {devices.filter(d => d.status === 'trusted').length} Confiables
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('logs')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'logs'
                                    ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm'
                                    : 'text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface border border-transparent hover:border-crm-border'
                            }`}
                        >
                            <History size={16} />
                            <span>Auditoría General de Actividad</span>
                            {totalLogs > 0 && (
                                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-black/20 text-white font-mono">
                                    {totalLogs}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* CONTENIDO TAB 1: MIS COMPUTADORAS Y DISPOSITIVOS */}
                {activeTab === 'dispositivos' && (
                    <div className="space-y-6">

                        {/* Banner de Estado del Navegador Actual */}
                        <div className={`rounded-2xl border p-4.5 transition-all ${
                            currentDeviceMatch?.status === 'trusted'
                                ? 'border-emerald-500/30 bg-emerald-500/10'
                                : currentDeviceMatch?.status === 'revoked'
                                ? 'border-red-500/30 bg-red-500/10'
                                : 'border-amber-500/30 bg-amber-500/10'
                        }`}>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                                        currentDeviceMatch?.status === 'trusted'
                                            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400'
                                            : currentDeviceMatch?.status === 'revoked'
                                            ? 'border-red-500/40 bg-red-500/20 text-red-400'
                                            : 'border-amber-500/40 bg-amber-500/20 text-amber-400'
                                    }`}>
                                        {currentDeviceMatch?.deviceName?.includes('Privada') ? <Laptop size={20} /> : <Monitor size={20} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs uppercase tracking-wider font-bold text-crm-fg-muted">
                                                Navegador Actual:
                                            </span>
                                            <span className="text-sm font-bold text-white">
                                                {currentDeviceMatch?.deviceName || 'Terminal No Asignada'}
                                            </span>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                                currentDeviceMatch?.status === 'trusted'
                                                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                                                    : currentDeviceMatch?.status === 'revoked'
                                                    ? 'border-red-500/30 bg-red-500/20 text-red-300'
                                                    : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                                            }`}>
                                                {currentDeviceMatch?.status === 'trusted' ? 'Confiable Reconocido' :
                                                 currentDeviceMatch?.status === 'revoked' ? 'Acceso Revocado' : 'Desconocido / Pendiente'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-crm-fg-muted mt-0.5">
                                            ID: <span className="font-mono text-crm-fg">{currentDeviceId?.slice(0, 24)}...</span> · {currentDeviceMatch?.clientInfo?.os || 'Windows'} · {currentDeviceMatch?.clientInfo?.browser || 'Navegador'} · IP: <span className="font-mono text-crm-fg">{currentDeviceMatch?.lastSeenIp || 'Local'}</span>
                                        </p>
                                    </div>
                                </div>

                                {isOwner && (!currentDeviceMatch || currentDeviceMatch.status !== 'trusted') && (
                                    <button
                                        onClick={() => setAuthorizingDevice({
                                            deviceId: currentDeviceId,
                                            clientInfo: currentDeviceMatch?.clientInfo || { os: 'Windows', browser: 'Navegador' },
                                            lastSeenIp: currentDeviceMatch?.lastSeenIp || 'IP actual'
                                        })}
                                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                                    >
                                        <ShieldCheck size={16} />
                                        <span>Autorizar este equipo con MFA</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Grid de Terminales Principales */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                                    Terminales Confiables Designadas
                                </h2>
                                <span className="text-xs text-crm-fg-muted">
                                    Equipos oficiales para gestión y administración del CRM
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                
                                {/* TARJETA 1: PC AGENCIA */}
                                <div className={`rounded-2xl border bg-crm-surface p-5 flex flex-col justify-between transition-all ${
                                    pcAgencia ? 'border-emerald-500/30 shadow-lg shadow-emerald-950/20' : 'border-crm-border border-dashed'
                                }`}>
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                                                    pcAgencia 
                                                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' 
                                                        : 'border-crm-border bg-crm-bg text-crm-fg-muted'
                                                }`}>
                                                    <Monitor size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                        <span>PC Agencia</span>
                                                        {pcAgencia && currentDeviceId === pcAgencia.deviceId && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                Este equipo
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-crm-fg-muted">Terminal de salón / operaciones de la agencia</p>
                                                </div>
                                            </div>

                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${
                                                pcAgencia 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                                    : 'bg-crm-bg text-crm-fg-muted border-crm-border'
                                            }`}>
                                                {pcAgencia ? 'Confiable' : 'No Vinculada'}
                                            </span>
                                        </div>

                                        {pcAgencia ? (
                                            <div className="mt-5 space-y-2.5 bg-crm-bg p-3.5 rounded-xl border border-crm-border text-xs">
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Identificador persistente:</span>
                                                    <span className="font-mono text-crm-fg">{pcAgencia.deviceId.slice(0, 20)}...</span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Entorno de software:</span>
                                                    <span className="text-crm-fg">{pcAgencia.clientInfo?.os || 'Windows'} · {pcAgencia.clientInfo?.browser || 'Chrome'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Última IP registrada:</span>
                                                    <span className="font-mono text-crm-fg">{pcAgencia.lastSeenIp || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Último acceso:</span>
                                                    <span className="text-crm-fg">
                                                        {pcAgencia.lastSeenAt ? new Date(pcAgencia.lastSeenAt).toLocaleString() : '—'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Sesiones totales registradas:</span>
                                                    <span className="font-bold text-white">{pcAgencia.totalSessions || 0}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-5 bg-crm-bg p-4 rounded-xl border border-crm-border text-xs text-crm-fg-muted space-y-2">
                                                <p>Esta terminal aún no ha sido registrada como PC Agencia.</p>
                                                <p className="text-[11px] text-crm-fg-subtle">
                                                    Para vincularla, inicie sesión desde la computadora de la agencia con la cuenta de Propietario e ingrese el código MFA.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-crm-border flex gap-2">
                                        {pcAgencia ? (
                                            <>
                                                <button
                                                    onClick={() => setSelectedForensicDeviceId(pcAgencia.deviceId)}
                                                    className="flex-1 py-2 px-3 rounded-xl bg-crm-surface-raised hover:bg-crm-border text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-crm-border"
                                                >
                                                    <Eye size={14} className="text-emerald-400" />
                                                    <span>Auditoría Forense (12 Pts)</span>
                                                </button>
                                                {isOwner && (
                                                    <button
                                                        onClick={() => setSelectedForensicDeviceId(pcAgencia.deviceId)}
                                                        className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors border border-red-500/20 flex items-center gap-1"
                                                        title="Revocar confianza"
                                                    >
                                                        <Ban size={14} />
                                                        <span>Revocar</span>
                                                    </button>
                                                )}
                                            </>
                                        ) : isOwner ? (
                                            <button
                                                onClick={() => setAuthorizingDevice({
                                                    deviceId: currentDeviceId,
                                                    clientInfo: { os: 'Windows', browser: 'Navegador' },
                                                    lastSeenIp: 'IP actual'
                                                })}
                                                className="w-full py-2 px-3 rounded-xl bg-crm-red hover:bg-crm-red-hover text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <ShieldCheck size={14} />
                                                <span>Registrar Navegador Actual como PC Agencia</span>
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                {/* TARJETA 2: PC PRIVADA */}
                                <div className={`rounded-2xl border bg-crm-surface p-5 flex flex-col justify-between transition-all ${
                                    pcPrivada ? 'border-emerald-500/30 shadow-lg shadow-emerald-950/20' : 'border-crm-border border-dashed'
                                }`}>
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                                                    pcPrivada 
                                                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' 
                                                        : 'border-crm-border bg-crm-bg text-crm-fg-muted'
                                                }`}>
                                                    <Laptop size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                                        <span>PC Privada</span>
                                                        {pcPrivada && currentDeviceId === pcPrivada.deviceId && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                Este equipo
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-xs text-crm-fg-muted">Equipo privado / portátil del Propietario</p>
                                                </div>
                                            </div>

                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold border uppercase tracking-wider ${
                                                pcPrivada 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                                    : 'bg-crm-bg text-crm-fg-muted border-crm-border'
                                            }`}>
                                                {pcPrivada ? 'Confiable' : 'No Vinculada'}
                                            </span>
                                        </div>

                                        {pcPrivada ? (
                                            <div className="mt-5 space-y-2.5 bg-crm-bg p-3.5 rounded-xl border border-crm-border text-xs">
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Identificador persistente:</span>
                                                    <span className="font-mono text-crm-fg">{pcPrivada.deviceId.slice(0, 20)}...</span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Entorno de software:</span>
                                                    <span className="text-crm-fg">{pcPrivada.clientInfo?.os || 'Windows'} · {pcPrivada.clientInfo?.browser || 'Chrome'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Última IP registrada:</span>
                                                    <span className="font-mono text-crm-fg">{pcPrivada.lastSeenIp || '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Último acceso:</span>
                                                    <span className="text-crm-fg">
                                                        {pcPrivada.lastSeenAt ? new Date(pcPrivada.lastSeenAt).toLocaleString() : '—'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-crm-fg-muted">
                                                    <span>Sesiones totales registradas:</span>
                                                    <span className="font-bold text-white">{pcPrivada.totalSessions || 0}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mt-5 bg-crm-bg p-4 rounded-xl border border-crm-border text-xs text-crm-fg-muted space-y-2">
                                                <p>Esta terminal aún no ha sido registrada como PC Privada.</p>
                                                <p className="text-[11px] text-crm-fg-subtle">
                                                    Para vincularla, inicie sesión desde su computadora personal privada con la cuenta de Propietario e ingrese el código MFA.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-crm-border flex gap-2">
                                        {pcPrivada ? (
                                            <>
                                                <button
                                                    onClick={() => setSelectedForensicDeviceId(pcPrivada.deviceId)}
                                                    className="flex-1 py-2 px-3 rounded-xl bg-crm-surface-raised hover:bg-crm-border text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-crm-border"
                                                >
                                                    <Eye size={14} className="text-emerald-400" />
                                                    <span>Auditoría Forense (12 Pts)</span>
                                                </button>
                                                {isOwner && (
                                                    <button
                                                        onClick={() => setSelectedForensicDeviceId(pcPrivada.deviceId)}
                                                        className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-colors border border-red-500/20 flex items-center gap-1"
                                                        title="Revocar confianza"
                                                    >
                                                        <Ban size={14} />
                                                        <span>Revocar</span>
                                                    </button>
                                                )}
                                            </>
                                        ) : isOwner ? (
                                            <button
                                                onClick={() => setAuthorizingDevice({
                                                    deviceId: currentDeviceId,
                                                    clientInfo: { os: 'Windows', browser: 'Navegador' },
                                                    lastSeenIp: 'IP actual'
                                                })}
                                                className="w-full py-2 px-3 rounded-xl bg-crm-red hover:bg-crm-red-hover text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <ShieldCheck size={14} />
                                                <span>Registrar Navegador Actual como PC Privada</span>
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN: OTROS DISPOSITIVOS DETECTADOS */}
                        <div className="bg-crm-surface border border-crm-border rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-amber-400" />
                                        <span>Otros Dispositivos y Navegadores Detectados</span>
                                    </h3>
                                    <p className="text-xs text-crm-fg-muted mt-0.5">
                                        Navegadores no autorizados que iniciaron sesión o enviaron solicitudes
                                    </p>
                                </div>
                                <span className="text-xs px-2.5 py-1 rounded-md bg-crm-bg border border-crm-border font-mono text-crm-fg-muted">
                                    {unknownDevices.length} detectados
                                </span>
                            </div>

                            {unknownDevices.length === 0 ? (
                                <div className="p-6 text-center text-xs text-crm-fg-muted border border-crm-border/60 rounded-xl bg-crm-bg/50">
                                    No se registran dispositivos desconocidos o pendientes.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-crm-border text-crm-fg-muted font-bold uppercase tracking-wider">
                                                <th className="py-2.5 px-3">Identificador</th>
                                                <th className="py-2.5 px-3">Entorno</th>
                                                <th className="py-2.5 px-3">Última IP</th>
                                                <th className="py-2.5 px-3">Último Acceso</th>
                                                <th className="py-2.5 px-3">Estado</th>
                                                <th className="py-2.5 px-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-crm-border/60">
                                            {unknownDevices.map(dev => (
                                                <tr key={dev.deviceId} className="hover:bg-crm-surface-raised transition-colors">
                                                    <td className="py-3 px-3 font-mono text-crm-fg">
                                                        {dev.deviceId.slice(0, 16)}...
                                                        {dev.deviceId === currentDeviceId && (
                                                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300">
                                                                Actual
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-3 text-crm-fg-muted">
                                                        {dev.clientInfo?.os || 'SO Desconocido'} · {dev.clientInfo?.browser || 'Browser'}
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-crm-fg-muted">
                                                        {dev.lastSeenIp || '—'}
                                                    </td>
                                                    <td className="py-3 px-3 text-crm-fg-muted">
                                                        {dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleString() : '—'}
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-amber-500/30 bg-amber-500/10 text-amber-300">
                                                            {dev.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {isOwner && (
                                                                <button
                                                                    onClick={() => setAuthorizingDevice(dev)}
                                                                    className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                                                                >
                                                                    <ShieldCheck size={12} />
                                                                    <span>Autorizar</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => setSelectedForensicDeviceId(dev.deviceId)}
                                                                className="px-2.5 py-1 rounded bg-crm-bg hover:bg-crm-border text-white border border-crm-border text-xs font-semibold transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye size={12} />
                                                                <span>Forense</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* SECCIÓN: DISPOSITIVOS REVOCADOS (SI EXISTEN) */}
                        {revokedDevices.length > 0 && (
                            <div className="bg-crm-surface border border-red-500/30 rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Ban size={16} className="text-red-400" />
                                        <h3 className="text-sm font-bold text-white">Dispositivos Revocados y Bloqueados</h3>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/30 font-mono text-red-300">
                                        {revokedDevices.length} bloqueados
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {revokedDevices.map(rev => (
                                        <div key={rev.deviceId} className="flex items-center justify-between p-3 rounded-xl bg-crm-bg border border-crm-border text-xs">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-red-400">{rev.deviceName || 'Dispositivo'}</span>
                                                    <span className="font-mono text-crm-fg-muted">({rev.deviceId.slice(0, 16)}...)</span>
                                                </div>
                                                <p className="text-crm-fg-muted mt-0.5">
                                                    Última actividad: {rev.lastSeenAt ? new Date(rev.lastSeenAt).toLocaleString() : '—'} · IP: {rev.lastSeenIp || '—'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedForensicDeviceId(rev.deviceId)}
                                                className="px-3 py-1 rounded bg-crm-surface hover:bg-crm-surface-raised text-crm-fg border border-crm-border text-xs font-semibold"
                                            >
                                                Ver Auditoría
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* CONTENIDO TAB 2: AUDITORÍA GENERAL DE ACTIVIDAD */}
                {activeTab === 'logs' && (
                    <div className="flex flex-col flex-1">
                        
                        {/* Filtros */}
                        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 mb-5">
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por usuario, descripción, entidad, IP o terminal..." 
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl pl-9 pr-4 py-2 text-xs text-crm-fg placeholder-crm-fg-muted focus:outline-none focus:border-crm-red transition-colors"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {/* Filtro Módulo */}
                                <select
                                    value={filters.module}
                                    onChange={(e) => { setFilters(prev => ({ ...prev, module: e.target.value })); setPage(1); }}
                                    className="bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-xs text-crm-fg focus:outline-none focus:border-crm-red transition-colors min-w-[130px]"
                                >
                                    <option value="">Todos los Módulos</option>
                                    <option value="usuarios">Usuarios / Login</option>
                                    <option value="seguridad">Seguridad y Terminales</option>
                                    <option value="stock">Stock de Vehículos</option>
                                    <option value="ventas">Ventas y Boletos</option>
                                    <option value="finanzas">Finanzas y Pagos</option>
                                    <option value="navegacion">Navegación / Rutas</option>
                                    <option value="cuotas">Cuotas</option>
                                </select>

                                {/* Filtro Dispositivo */}
                                <select
                                    value={filters.deviceName}
                                    onChange={(e) => { setFilters(prev => ({ ...prev, deviceName: e.target.value })); setPage(1); }}
                                    className="bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-xs text-crm-fg focus:outline-none focus:border-crm-red transition-colors min-w-[140px]"
                                >
                                    <option value="">Todas las Terminales</option>
                                    <option value="PC Agencia">PC Agencia</option>
                                    <option value="PC Privada">PC Privada</option>
                                    <option value="Dispositivo desconocido">Dispositivos Desconocidos</option>
                                </select>

                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-crm-red text-white rounded-xl text-xs font-bold hover:bg-crm-red-hover transition-colors"
                                >
                                    Buscar
                                </button>
                            </div>
                        </form>

                        {/* Tabla de Auditoría Enriquecida */}
                        <div className="bg-crm-surface border border-crm-border rounded-2xl overflow-hidden flex-1 flex flex-col justify-between">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[850px] text-xs">
                                    <thead>
                                        <tr className="border-b border-crm-border bg-crm-bg/60 text-crm-fg-muted font-bold uppercase tracking-wider">
                                            <th className="p-3.5">Fecha y Hora</th>
                                            <th className="p-3.5">Usuario</th>
                                            <th className="p-3.5">Terminal / Dispositivo</th>
                                            <th className="p-3.5">Acción / Módulo</th>
                                            <th className="p-3.5">Detalle e IP</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border">
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-crm-fg-muted">
                                                    {loadingLogs ? 'Cargando registros de auditoría...' : 'No hay registros que coincidan con la búsqueda.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map(log => {
                                                const isAgencia = log.deviceName === 'PC Agencia';
                                                const isPrivada = log.deviceName === 'PC Privada';
                                                const isRevoked = log.deviceStatus === 'revoked';
                                                
                                                return (
                                                    <tr key={log._id} className="hover:bg-crm-surface-raised transition-colors">
                                                        
                                                        {/* Fecha y Hora */}
                                                        <td className="p-3.5 whitespace-nowrap">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-bold text-white">
                                                                    {new Date(log.createdAt).toLocaleDateString()}
                                                                </span>
                                                                <span className="font-mono text-crm-fg-muted text-[11px]">
                                                                    {new Date(log.createdAt).toLocaleTimeString()}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Usuario */}
                                                        <td className="p-3.5">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-bold text-white">{log.userName}</span>
                                                                <span className="text-[10px] uppercase text-crm-fg-muted font-mono">{log.userRole}</span>
                                                            </div>
                                                        </td>

                                                        {/* Terminal / Dispositivo */}
                                                        <td className="p-3.5">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <button
                                                                    onClick={() => log.deviceId && setSelectedForensicDeviceId(log.deviceId)}
                                                                    disabled={!log.deviceId}
                                                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                                                        isAgencia
                                                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                                                            : isPrivada
                                                                            ? 'border-teal-500/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20'
                                                                            : isRevoked
                                                                            ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                                                                            : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                                                                    }`}
                                                                >
                                                                    {isAgencia ? <Monitor size={12} /> : 
                                                                     isPrivada ? <Laptop size={12} /> : 
                                                                     isRevoked ? <Ban size={12} /> : <AlertTriangle size={12} />}
                                                                    <span>{log.deviceName || 'Dispositivo desconocido'}</span>
                                                                </button>
                                                                
                                                                {log.deviceId && (
                                                                    <span className="font-mono text-[10px] text-crm-fg-subtle">
                                                                        ID: {log.deviceId.slice(0, 10)}...
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Acción / Módulo */}
                                                        <td className="p-3.5">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                                                                    log.action.includes('FALLIDO') || log.action.includes('ELIMINADA') || log.action.includes('REVOCADO')
                                                                        ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                                                        : log.action.includes('AUTORIZADO') || log.action.includes('LOGIN')
                                                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                                        : 'bg-crm-bg text-crm-fg border border-crm-border'
                                                                }`}>
                                                                    {log.action}
                                                                </span>
                                                                <span className="text-[11px] text-crm-fg-muted capitalize">
                                                                    {log.module}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* Detalle e IP */}
                                                        <td className="p-3.5">
                                                            <p className="text-crm-fg text-xs max-w-md break-words">
                                                                {log.description}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1 text-[11px] text-crm-fg-muted font-mono">
                                                                {log.entityLabel && (
                                                                    <span className="text-crm-fg-muted">
                                                                        Ref: {log.entityLabel}
                                                                    </span>
                                                                )}
                                                                <span>IP: {log.ipAddress || '—'}</span>
                                                            </div>
                                                        </td>

                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            {totalLogs > limit && (
                                <div className="p-3.5 border-t border-crm-border flex justify-between items-center bg-crm-surface">
                                    <span className="text-xs text-crm-fg-muted">
                                        Mostrando {logs.length} de {totalLogs} registros
                                    </span>
                                    <div className="flex gap-2">
                                        <button 
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="px-3 py-1 rounded bg-crm-bg text-crm-fg-muted border border-crm-border text-xs disabled:opacity-50 hover:bg-crm-surface-raised transition-colors"
                                        >
                                            Anterior
                                        </button>
                                        <button 
                                            disabled={page * limit >= totalLogs}
                                            onClick={() => setPage(p => p + 1)}
                                            className="px-3 py-1 rounded bg-crm-bg text-crm-fg-muted border border-crm-border text-xs disabled:opacity-50 hover:bg-crm-surface-raised transition-colors"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {/* MODAL 1: AUTORIZAR COMPUTADORA CON MFA */}
                <DeviceAuthorizeModal
                    device={authorizingDevice}
                    isOpen={!!authorizingDevice}
                    onClose={() => setAuthorizingDevice(null)}
                    token={token}
                    onAuthorized={() => {
                        fetchDevices();
                        if (activeTab === 'logs') fetchLogs();
                    }}
                />

                {/* MODAL 2: AUDITORÍA FORENSE COMPLETA (12 PUNTOS) */}
                <DeviceForensicModal
                    deviceId={selectedForensicDeviceId}
                    isOpen={!!selectedForensicDeviceId}
                    onClose={() => setSelectedForensicDeviceId(null)}
                    token={token}
                    isOwner={isOwner}
                    onDeviceRevoked={() => {
                        fetchDevices();
                        if (activeTab === 'logs') fetchLogs();
                    }}
                />

            </div>
        </PermissionGuard>
    );
}
