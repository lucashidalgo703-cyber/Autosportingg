"use client";
import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, KeyRound, Monitor, Laptop, CheckCircle2, X } from 'lucide-react';

export default function DeviceAuthorizeModal({ device, isOpen, onClose, onAuthorized, token }) {
    const [selectedName, setSelectedName] = useState('PC Agencia');
    const [customName, setCustomName] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !device) return null;

    const targetDeviceName = selectedName === 'custom' ? customName.trim() : selectedName;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const payload = {
                deviceId: device.deviceId,
                targetName: targetDeviceName || 'PC Agencia',
                ...(useRecoveryCode ? { recoveryCode: verificationCode.trim() } : { verificationCode: verificationCode.trim() })
            };

            const res = await fetch('/api/admin/devices/authorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Error al autorizar dispositivo');
            }

            if (onAuthorized) onAuthorized(data.device);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Autorizar Computadora Confiable</h3>
                            <p className="text-xs text-crm-fg-muted">Asignación permanente de terminal de confianza</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* Dispositivo a registrar */}
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-crm-fg-muted">ID de Instalación:</span>
                            <span className="font-mono text-crm-fg">{device.deviceId?.slice(0, 16)}...</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-crm-fg-muted">
                            <span>Entorno detectado:</span>
                            <span className="text-crm-fg">{device.clientInfo?.os || 'Windows'} · {device.clientInfo?.browser || 'Navegador'}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-crm-fg-muted">
                            <span>IP actual:</span>
                            <span className="font-mono text-crm-fg">{device.lastSeenIp || '—'}</span>
                        </div>
                    </div>

                    {/* Selector de Nombre */}
                    <div>
                        <label className="block text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">
                            Seleccionar Identificación del Equipo:
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedName('PC Agencia')}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
                                    selectedName === 'PC Agencia'
                                        ? 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500'
                                        : 'border-crm-border bg-crm-bg text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white'
                                }`}
                            >
                                <Monitor size={18} className="text-emerald-400" />
                                <span>PC Agencia</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setSelectedName('PC Privada')}
                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-semibold transition-all ${
                                    selectedName === 'PC Privada'
                                        ? 'border-emerald-500 bg-emerald-500/15 text-white ring-1 ring-emerald-500'
                                        : 'border-crm-border bg-crm-bg text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white'
                                }`}
                            >
                                <Laptop size={18} className="text-emerald-400" />
                                <span>PC Privada</span>
                            </button>
                        </div>
                    </div>

                    {/* Verificación de Seguridad Independiente */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                            <KeyRound size={16} />
                            <span>Verificación de Seguridad Obligatoria (MFA)</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-amber-200/80">
                            Por política estricta de seguridad, registrar un equipo confiable requiere el segundo factor de autenticación del Propietario.
                        </p>

                        <div className="mt-3">
                            <input
                                type="text"
                                required
                                placeholder={useRecoveryCode ? "Ingrese código de recuperación" : "Código de 6 dígitos del Authenticator"}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="w-full rounded-xl border border-amber-500/40 bg-crm-bg px-3.5 py-2.5 text-center font-mono text-sm tracking-widest text-white placeholder-crm-fg-muted focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                        </div>

                        <div className="mt-2 text-right">
                            <button
                                type="button"
                                onClick={() => { setUseRecoveryCode(!useRecoveryCode); setVerificationCode(''); }}
                                className="text-[11px] text-amber-300/80 hover:text-amber-200 underline"
                            >
                                {useRecoveryCode ? "Usar código de Authenticator (TOTP)" : "¿Usar código de recuperación offline?"}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                            <ShieldAlert size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-3 border-t border-crm-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-crm-border bg-crm-bg px-4 py-2 text-xs font-semibold text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !verificationCode.trim()}
                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                        >
                            {loading ? <span className="animate-spin">⏳</span> : <CheckCircle2 size={16} />}
                            <span>Autorizar como {targetDeviceName}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
