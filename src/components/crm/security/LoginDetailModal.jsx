"use client";
import React, { useState } from 'react';
import { 
    X, Shield, CheckCircle2, AlertTriangle, Globe, Monitor, 
    Key, Clock, Hash, Smartphone, Laptop, Info, ChevronDown, ChevronUp, Lock
} from 'lucide-react';

export default function LoginDetailModal({ item, onClose }) {
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

    if (!item) return null;

    const isSuccess = item.result === 'SUCCESS';
    const isLoopback = item.ipType === 'loopback' || item.ip === '127.0.0.1' || item.ip === '::1';

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
                                {isSuccess ? 'Autenticación Exitosa' : 'Acceso Denegado / Rechazado'}
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
                        
                        {/* Identidad / Cuenta */}
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                    <Shield size={14} />
                                    <span>{isSuccess ? 'Cuenta Autenticada' : 'Correo Ingresado'}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    isSuccess 
                                        ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300' 
                                        : 'border-amber-500/30 bg-amber-500/20 text-amber-300'
                                }`}>
                                    {isSuccess ? 'Identidad Verificada' : 'Identidad No Verificada'}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-white">
                                {isSuccess ? item.userEmail : (item.attemptedEmail || item.userEmail)}
                            </p>
                            {isSuccess && item.userName && (
                                <p className="text-xs text-crm-fg-muted">{item.userName}</p>
                            )}
                        </div>

                        {/* Método de Autenticación */}
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <Key size={14} />
                                <span>Método de Autenticación</span>
                            </div>
                            <p className="text-sm font-bold text-white capitalize">{item.authMethod}</p>
                            <p className="text-xs text-crm-fg-muted">Acción: {item.action}</p>
                        </div>

                        {/* Dispositivo y Estado de Confianza */}
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                    <Monitor size={14} />
                                    <span>Terminal / Dispositivo</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    item.deviceType === 'trusted'
                                        ? 'border-blue-500/30 bg-blue-500/20 text-blue-300'
                                        : item.deviceType === 'revoked'
                                        ? 'border-red-500/30 bg-red-500/20 text-red-300'
                                        : 'border-crm-border bg-crm-surface text-crm-fg-muted'
                                }`}>
                                    {item.deviceBadgeLabel || 'Navegador Web'}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-white">
                                {item.deviceName || 'Navegador sin terminal asignada'}
                            </p>
                            {item.deviceId && (
                                <p className="text-xs text-crm-fg-muted font-mono truncate">
                                    ID: {item.deviceId}
                                </p>
                            )}
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <Globe size={14} />
                                <span>{isLoopback ? 'Conexión Local (Loopback)' : 'Red e IP Pública'}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isLoopback 
                                    ? 'border-purple-500/30 bg-purple-500/20 text-purple-300' 
                                    : 'border-crm-border bg-crm-surface text-crm-fg-muted'
                            }`}>
                                {item.ipLabel || (isLoopback ? 'Conexión local' : 'IP Pública')}
                            </span>
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

                    {/* Sesión Vinculada */}
                    {item.sessionId && (
                        <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                <Lock size={14} />
                                <span>Identificador de Sesión</span>
                            </div>
                            <p className="text-xs font-mono text-crm-fg break-all bg-black/20 p-2 rounded border border-white/5">
                                {item.sessionId}
                            </p>
                        </div>
                    )}

                    {/* Apartado Secundario: Datos Técnicos y Firma Criptográfica */}
                    <div className="border border-crm-border/60 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                            className="w-full flex items-center justify-between p-3.5 bg-crm-surface-raised/60 hover:bg-crm-surface-raised text-xs font-bold text-crm-fg-muted transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <Hash size={14} />
                                <span>Datos Técnicos y Custodia Criptográfica</span>
                            </span>
                            {showTechnicalDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {showTechnicalDetails && (
                            <div className="p-4 bg-crm-surface/40 space-y-3 border-t border-crm-border/60 text-xs font-mono">
                                <div>
                                    <span className="text-crm-fg-muted font-sans font-bold block mb-1">
                                        Firma Criptográfica HMAC-SHA256:
                                    </span>
                                    <p className="text-crm-fg break-all bg-black/40 p-2.5 rounded border border-white/5">
                                        {item.currentHash || 'Sin firma HMAC (registro no firmado)'}
                                    </p>
                                </div>
                                {item.metadata && Object.keys(item.metadata).length > 0 && (
                                    <div>
                                        <span className="text-crm-fg-muted font-sans font-bold block mb-1">
                                            Metadatos Adicionales:
                                        </span>
                                        <pre className="text-crm-fg bg-black/40 p-2.5 rounded border border-white/5 overflow-x-auto text-[11px]">
                                            {JSON.stringify(item.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="sticky bottom-0 z-10 flex justify-end border-t border-crm-border bg-crm-surface/95 px-6 py-4 backdrop-blur">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold rounded-xl border border-crm-border bg-crm-surface-raised text-white hover:bg-crm-surface transition-colors"
                    >
                        Cerrar Detalle
                    </button>
                </div>
            </div>
        </div>
    );
}
