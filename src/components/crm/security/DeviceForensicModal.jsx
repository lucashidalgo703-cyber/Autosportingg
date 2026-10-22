"use client";
import React, { useState, useEffect } from 'react';
import { 
    Monitor, Laptop, ShieldCheck, ShieldAlert, ShieldX, Clock, Globe, 
    User, Car, DollarSign, AlertTriangle, FileDown, History, X, RefreshCw, Ban
} from 'lucide-react';

export default function DeviceForensicModal({ deviceId, isOpen, onClose, token, isOwner, onDeviceRevoked }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sesiones'); // 'sesiones' | 'modificaciones' | 'autos' | 'finanzas' | 'fallos' | 'confianza'
    const [revoking, setRevoking] = useState(false);
    const [revokeReason, setRevokeReason] = useState('');
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

    const fetchForensicData = async () => {
        if (!deviceId || !token) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/devices/${deviceId}/audit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (e) {
            console.error('Error fetching forensic audit:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && deviceId) {
            fetchForensicData();
        }
    }, [isOpen, deviceId]);

    if (!isOpen) return null;

    const handleRevoke = async () => {
        if (!revokeReason.trim()) return;
        setRevoking(true);
        try {
            const res = await fetch(`/api/admin/devices/${deviceId}/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason: revokeReason.trim() })
            });
            if (res.ok) {
                if (onDeviceRevoked) onDeviceRevoked(deviceId);
                setShowRevokeConfirm(false);
                fetchForensicData();
            }
        } catch (e) {
            console.error('Error revoking device:', e);
        } finally {
            setRevoking(false);
        }
    };

    const device = data?.device;
    const summary = data?.summary;
    const isTrusted = device?.status === 'trusted';
    const isRevoked = device?.status === 'revoked';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="flex flex-col w-full max-w-5xl h-[88vh] rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border p-5 bg-crm-bg/40">
                    <div className="flex items-center gap-3.5">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                            isTrusted ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                            isRevoked ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                            'border-amber-500/30 bg-amber-500/10 text-amber-400'
                        }`}>
                            {device?.deviceName?.includes('Privada') ? <Laptop size={22} /> : <Monitor size={22} />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-white">{device?.deviceName || 'Cargando...'}</h2>
                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                    isTrusted ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' :
                                    isRevoked ? 'border-red-500/30 bg-red-500/15 text-red-300' :
                                    'border-amber-500/30 bg-amber-500/15 text-amber-300'
                                }`}>
                                    {isTrusted ? 'Confiable' : isRevoked ? 'Revocado' : 'Desconocido'}
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted font-mono mt-0.5">
                                ID: {deviceId} · {device?.clientInfo?.os || 'OS'} · {device?.clientInfo?.browser || 'Browser'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isOwner && !isRevoked && (
                            <button
                                onClick={() => setShowRevokeConfirm(true)}
                                className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                            >
                                <Ban size={14} />
                                <span>Revocar Acceso</span>
                            </button>
                        )}
                        <button
                            onClick={fetchForensicData}
                            className="rounded-xl border border-crm-border bg-crm-bg p-2 text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-white"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-xl border border-crm-border bg-crm-bg p-2 text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-white"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Sub-tarjetas de Resumen Forense */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-crm-border bg-crm-bg/20 text-xs">
                    <div className="rounded-xl border border-crm-border bg-crm-surface-raised p-3">
                        <span className="text-crm-fg-muted block text-[10px] font-bold uppercase tracking-wider">Sesiones Totales</span>
                        <span className="text-base font-bold text-white mt-1 block">{summary?.totalSessions || 0}</span>
                        <span className="text-[10px] text-emerald-400">{summary?.activeSessions || 0} activas</span>
                    </div>
                    <div className="rounded-xl border border-crm-border bg-crm-surface-raised p-3">
                        <span className="text-crm-fg-muted block text-[10px] font-bold uppercase tracking-wider">Usuarios Distintos</span>
                        <span className="text-base font-bold text-white mt-1 block">{summary?.distinctUsersCount || 0}</span>
                        <span className="text-[10px] text-crm-fg-muted truncate block">{summary?.users?.join(', ') || '—'}</span>
                    </div>
                    <div className="rounded-xl border border-crm-border bg-crm-surface-raised p-3">
                        <span className="text-crm-fg-muted block text-[10px] font-bold uppercase tracking-wider">Última IP Detectada</span>
                        <span className="text-sm font-mono font-bold text-white mt-1 block truncate">{device?.lastSeenIp || '—'}</span>
                        <span className="text-[10px] text-crm-fg-muted">{summary?.ips?.length || 1} IP(s) históricas</span>
                    </div>
                    <div className="rounded-xl border border-crm-border bg-crm-surface-raised p-3">
                        <span className="text-crm-fg-muted block text-[10px] font-bold uppercase tracking-wider">Última Actividad</span>
                        <span className="text-xs font-semibold text-white mt-1 block">
                            {device?.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('es-AR') : '—'}
                        </span>
                        <span className="text-[10px] text-crm-fg-muted truncate block">Por: {device?.lastSeenUser || '—'}</span>
                    </div>
                </div>

                {/* Pestañas Forenses */}
                <div className="flex border-b border-crm-border bg-crm-bg px-4 overflow-x-auto text-xs">
                    <button
                        onClick={() => setActiveTab('sesiones')}
                        className={`px-3.5 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'sesiones' ? 'border-crm-red text-white' : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <Clock size={14} />
                        <span>Inicios/Cierres ({data?.sessions?.length || 0})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('modificaciones')}
                        className={`px-3.5 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'modificaciones' ? 'border-crm-red text-white' : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <History size={14} />
                        <span>Modificaciones Antes/Después ({data?.modificaciones?.length || 0})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('autos')}
                        className={`px-3.5 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'autos' ? 'border-crm-red text-white' : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <Car size={14} />
                        <span>Vehículos Consultados ({data?.vehicleConsults?.length || 0})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('finanzas')}
                        className={`px-3.5 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'finanzas' ? 'border-crm-red text-white' : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <DollarSign size={14} />
                        <span>Operaciones Financieras ({data?.financialOperations?.length || 0})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('fallos')}
                        className={`px-3.5 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'fallos' ? 'border-crm-red text-white' : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <AlertTriangle size={14} />
                        <span>Fallos y Alertas ({data?.failedLogins?.length || 0})</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('confianza')}
                        className={`px-3.5 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            activeTab === 'confianza' ? 'border-crm-red text-white' : 'border-transparent text-crm-fg-muted hover:text-white'
                        }`}
                    >
                        <ShieldCheck size={14} />
                        <span>Historial de Confianza ({data?.trustHistory?.length || 0})</span>
                    </button>
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-crm-fg-muted text-sm gap-2">
                            <RefreshCw size={18} className="animate-spin" />
                            <span>Recuperando evidencia forense del dispositivo...</span>
                        </div>
                    ) : (
                        <>
                            {/* PESTAÑA: SESIONES */}
                            {activeTab === 'sesiones' && (
                                <div className="space-y-2">
                                    {(!data?.sessions || data.sessions.length === 0) ? (
                                        <p className="text-center py-10 text-xs text-crm-fg-muted">Sin sesiones registradas para este equipo.</p>
                                    ) : (
                                        data.sessions.map((s, idx) => (
                                            <div key={s._id || idx} className="flex items-center justify-between p-3 rounded-xl border border-crm-border bg-crm-bg/40 text-xs hover:bg-crm-surface-raised transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-2.5 w-2.5 rounded-full ${s.status === 'active' ? 'bg-emerald-400 animate-pulse' : s.status === 'revoked' ? 'bg-red-400' : 'bg-crm-fg-muted'}`} />
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white">{s.userName}</span>
                                                            <span className="text-[10px] text-crm-fg-muted uppercase">({s.userRole})</span>
                                                            <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${s.status === 'active' ? 'bg-emerald-500/15 text-emerald-300' : s.status === 'revoked' ? 'bg-red-500/15 text-red-300' : 'bg-crm-surface text-crm-fg-muted'}`}>
                                                                {s.status}
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] font-mono text-crm-fg-muted">IP: {s.ip} · {s.userAgent?.slice(0, 50)}...</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-semibold text-white block">{new Date(s.loginAt).toLocaleDateString('es-AR')}</span>
                                                    <span className="text-[10px] text-crm-fg-muted">{new Date(s.loginAt).toLocaleTimeString('es-AR')}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA: MODIFICACIONES ANTES / DESPUÉS */}
                            {activeTab === 'modificaciones' && (
                                <div className="space-y-2">
                                    {(!data?.modificaciones || data.modificaciones.length === 0) ? (
                                        <p className="text-center py-10 text-xs text-crm-fg-muted">Sin modificaciones registradas desde este equipo.</p>
                                    ) : (
                                        data.modificaciones.map((m, idx) => (
                                            <div key={m._id || idx} className="p-3.5 rounded-xl border border-crm-border bg-crm-bg/40 text-xs space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white">{m.action}</span>
                                                        <span className="text-crm-fg-muted font-semibold">· {m.entityLabel || m.entityType}</span>
                                                    </div>
                                                    <span className="text-[11px] text-crm-fg-muted">{new Date(m.createdAt).toLocaleString('es-AR')}</span>
                                                </div>
                                                <p className="text-crm-fg">{m.description}</p>
                                                {m.metadata?.changes && Array.isArray(m.metadata.changes) && (
                                                    <div className="mt-2 rounded-lg border border-crm-border bg-crm-surface p-2.5 font-mono text-[11px] space-y-1">
                                                        {m.metadata.changes.map((ch, cidx) => (
                                                            <div key={cidx} className="flex items-center gap-2">
                                                                <span className="font-semibold text-crm-fg-muted">{ch.field}:</span>
                                                                <span className="text-red-400 line-through">{String(ch.oldValue ?? 'vacio')}</span>
                                                                <span className="text-crm-fg-muted">→</span>
                                                                <span className="text-emerald-400 font-bold">{String(ch.newValue ?? 'vacio')}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA: VEHÍCULOS CONSULTADOS */}
                            {activeTab === 'autos' && (
                                <div className="space-y-2">
                                    {(!data?.vehicleConsults || data.vehicleConsults.length === 0) ? (
                                        <p className="text-center py-10 text-xs text-crm-fg-muted">Sin fichas de autos consultadas desde este navegador.</p>
                                    ) : (
                                        data.vehicleConsults.map((v, idx) => (
                                            <div key={v._id || idx} className="flex items-center justify-between p-3 rounded-xl border border-crm-border bg-crm-bg/40 text-xs">
                                                <div className="flex items-center gap-2.5">
                                                    <Car size={16} className="text-amber-400" />
                                                    <div>
                                                        <span className="font-bold text-white block">{v.entityLabel || 'Vehículo'}</span>
                                                        <span className="text-[11px] text-crm-fg-muted">Consultado por {v.userName}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] text-crm-fg-muted">{new Date(v.createdAt).toLocaleString('es-AR')}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA: OPERACIONES FINANCIERAS */}
                            {activeTab === 'finanzas' && (
                                <div className="space-y-2">
                                    {(!data?.financialOperations || data.financialOperations.length === 0) ? (
                                        <p className="text-center py-10 text-xs text-crm-fg-muted">Sin operaciones de caja o tesorería ejecutadas desde este equipo.</p>
                                    ) : (
                                        data.financialOperations.map((f, idx) => (
                                            <div key={f._id || idx} className="flex items-center justify-between p-3 rounded-xl border border-crm-border bg-crm-bg/40 text-xs">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-emerald-400">{f.action}</span>
                                                        <span className="text-white font-medium">{f.entityLabel}</span>
                                                    </div>
                                                    <p className="text-[11px] text-crm-fg-muted mt-0.5">{f.description}</p>
                                                </div>
                                                <span className="text-[11px] text-crm-fg-muted">{new Date(f.createdAt).toLocaleString('es-AR')}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA: FALLOS Y ALERTAS */}
                            {activeTab === 'fallos' && (
                                <div className="space-y-2">
                                    {(!data?.failedLogins || data.failedLogins.length === 0) ? (
                                        <p className="text-center py-10 text-xs text-crm-fg-muted">Sin intentos de acceso fallidos registrados.</p>
                                    ) : (
                                        data.failedLogins.map((fl, idx) => (
                                            <div key={fl._id || idx} className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-xs flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <AlertTriangle size={16} className="text-red-400" />
                                                    <div>
                                                        <span className="font-bold text-red-300 block">{fl.action}</span>
                                                        <span className="text-[11px] text-red-200/80">{fl.description} · IP: {fl.ip}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[11px] text-red-200/70">{new Date(fl.createdAt).toLocaleString('es-AR')}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA: HISTORIAL PERMANENTE DE CONFIANZA */}
                            {activeTab === 'confianza' && (
                                <div className="space-y-2">
                                    {(!data?.trustHistory || data.trustHistory.length === 0) ? (
                                        <p className="text-center py-10 text-xs text-crm-fg-muted">Sin eventos de confianza registrados.</p>
                                    ) : (
                                        data.trustHistory.map((th, idx) => (
                                            <div key={th._id || idx} className="p-3 rounded-xl border border-crm-border bg-crm-bg/40 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className={`font-bold ${
                                                        th.event.includes('AUTORIZADO') ? 'text-emerald-400' :
                                                        th.event.includes('REVOCADO') ? 'text-red-400' :
                                                        'text-amber-400'
                                                    }`}>
                                                        {th.event}
                                                    </span>
                                                    <span className="text-[11px] text-crm-fg-muted">{new Date(th.timestamp).toLocaleString('es-AR')}</span>
                                                </div>
                                                <p className="text-crm-fg">{th.details}</p>
                                                <div className="text-[10px] text-crm-fg-muted flex items-center gap-2">
                                                    <span>Por: {th.performedBy?.name || 'Sistema'}</span>
                                                    <span>· Método: {th.authMethod || 'MFA'}</span>
                                                    <span>· IP: {th.ip || '—'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Modal de Confirmación de Revocación */}
                {showRevokeConfirm && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-crm-surface p-5 shadow-2xl space-y-4">
                            <div className="flex items-center gap-2 text-red-400">
                                <ShieldAlert size={20} />
                                <h3 className="font-bold text-sm text-white">¿Confirmar revocación de {device?.deviceName}?</h3>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Al revocar esta computadora, todas las sesiones activas en este navegador se terminarán de inmediato en todos los servidores. Los accesos posteriores serán bloqueados.
                            </p>
                            <div>
                                <label className="block text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">
                                    Motivo de la revocación (obligatorio):
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Computadora reemplazada, robo o sospecha de acceso no autorizado"
                                    value={revokeReason}
                                    onChange={(e) => setRevokeReason(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white placeholder-crm-fg-muted focus:border-red-400 focus:outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={() => setShowRevokeConfirm(false)}
                                    className="px-3 py-1.5 rounded-xl border border-crm-border text-xs text-crm-fg-muted hover:bg-crm-surface-raised"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={revoking || !revokeReason.trim()}
                                    onClick={handleRevoke}
                                    className="px-3 py-1.5 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
                                >
                                    {revoking ? 'Revocando...' : 'Confirmar Revocación'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
