"use client";
import React from 'react';
import { 
    X, Shield, CheckCircle2, AlertTriangle, Globe, Monitor, 
    Key, Clock, Hash, Smartphone, Laptop, Info 
} from 'lucide-react';

export default function LoginDetailModal({ item, onClose }) {
    if (!item) return null;

    const isSuccess = item.result === 'SUCCESS';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-crm-border bg-crm-surface text-crm-fg shadow-2xl custom-scrollbar">
                
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-crm-border bg-crm-surface/95 px-6 py-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                            isSuccess 
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                                : 'border-red-500/30 bg-red-500/10 text-red-400'
                        }`}>
                            {isSuccess ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">
                                Detalle de Intento de Acceso
                            </h3>
                            <p className="text-xs text-crm-fg-muted font-mono">
                                ID Registro: {item.id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Status Banner */}
                    <div className={`p-4 rounded-xl border ${
                        isSuccess 
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' 
                            : 'border-red-500/20 bg-red-500/10 text-red-300'
                    }`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold uppercase tracking-wider">
                                Resultado: {isSuccess ? 'Autenticación Exitosa' : 'Acceso Denegado / Rechazado'}
                            </span>
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-black/30 border border-white/10">
                                {new Date(item.timestamp).toLocaleString('es-AR')}
                            </span>
                        </div>
                        {item.failureReason && (
                            <p className="text-xs mt-2 text-red-200">
                                <strong>Motivo técnico:</strong> {item.failureReason}
                            </p>
                        )}
                    </div>

                    {/* Grid Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Usuario */}
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <Shield size={14} />
                                <span>Identidad</span>
                            </div>
                            <p className="text-sm font-bold text-white">{item.userEmail}</p>
                            {item.userName && (
                                <p className="text-xs text-crm-fg-muted">{item.userName}</p>
                            )}
                        </div>

                        {/* Método */}
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <Key size={14} />
                                <span>Método de Autenticación</span>
                            </div>
                            <p className="text-sm font-bold text-white capitalize">{item.authMethod}</p>
                            <p className="text-xs text-crm-fg-muted">Acción: {item.action}</p>
                        </div>

                        {/* Dispositivo */}
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <Monitor size={14} />
                                <span>Terminal / Dispositivo</span>
                            </div>
                            <p className="text-sm font-bold text-white">
                                {item.deviceName || 'Dispositivo no asignado'}
                            </p>
                            <p className="text-xs text-crm-fg-muted font-mono truncate">
                                ID: {item.deviceId || 'Sin huella de terminal'}
                            </p>
                        </div>

                        {/* Entorno / Navegador */}
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <Laptop size={14} />
                                <span>Navegador y Sistema Operativo</span>
                            </div>
                            <p className="text-sm font-bold text-white">{item.browser}</p>
                            <p className="text-xs text-crm-fg-muted">{item.os}</p>
                        </div>
                    </div>

                    {/* Red y Geolocalización */}
                    <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                            <Globe size={14} />
                            <span>Red e IP Pública</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-bold text-white">{item.ip || 'No disponible'}</span>
                            <span className="text-xs text-crm-fg-muted font-semibold">
                                {item.geoApproximation?.location || 'No disponible'}
                            </span>
                        </div>
                        
                        {/* Disclaimer Obligatorio */}
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200">
                            <Info size={16} className="shrink-0 mt-0.5 text-blue-400" />
                            <p className="text-xs leading-relaxed">
                                {item.geoApproximation?.disclaimer || 'Aproximada por IP - Puede variar por VPN o proveedor. No constituye dirección física exacta ni prueba de presencia o identidad física.'}
                            </p>
                        </div>
                    </div>

                    {/* Cadena Criptográfica HMAC */}
                    {item.currentHash && (
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2 font-mono">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted font-sans">
                                <Hash size={14} />
                                <span>Custodia Criptográfica (HMAC-SHA256)</span>
                            </div>
                            <p className="text-xs text-crm-fg-muted break-all bg-black/30 p-2.5 rounded border border-white/5">
                                {item.currentHash}
                            </p>
                        </div>
                    )}

                    {/* Sesión ID */}
                    {item.sessionId && (
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                Identificador de Sesión
                            </span>
                            <p className="text-xs font-mono text-white break-all">
                                {item.sessionId}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end border-t border-crm-border bg-crm-surface px-6 py-4">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-crm-border bg-crm-surface text-sm font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
