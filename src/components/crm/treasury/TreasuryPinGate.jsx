"use client";

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertTriangle, Eye, EyeOff, RotateCcw, CheckCircle2, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TreasuryPinGate({
    securityStatus,
    isLoadingStatus = false,
    statusError = null,
    onAuthorized,
    onRefreshStatus
}) {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    // Modal de recuperación de PIN
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [recoveryPassword, setRecoveryPassword] = useState('');
    const [recoveryNewPin, setRecoveryNewPin] = useState('');
    const [recoveryConfirmPin, setRecoveryConfirmPin] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Temporizador si está bloqueado
    const [lockCountdown, setLockCountdown] = useState(
        securityStatus?.isLocked ? (securityStatus.lockRemainingMinutes || 15) * 60 : 0
    );

    useEffect(() => {
        if (securityStatus?.isLocked) {
            setLockCountdown((securityStatus.lockRemainingMinutes || 15) * 60);
        } else {
            setLockCountdown(0);
        }
    }, [securityStatus]);

    useEffect(() => {
        if (lockCountdown <= 0) return;
        const interval = setInterval(() => {
            setLockCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    if (onRefreshStatus) onRefreshStatus();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [lockCountdown, onRefreshStatus]);

    const formatCountdown = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const isCheckingStatus = Boolean(isLoadingStatus) || (!securityStatus && !statusError);
    const hasStatusFetchError = Boolean(statusError) || (!isCheckingStatus && typeof securityStatus?.pinConfigured !== 'boolean');
    // Mostrar el formulario de creación de PIN únicamente cuando el servidor confirme pinConfigured === false
    const isFirstTimeSetup = !isCheckingStatus && !hasStatusFetchError && securityStatus?.pinConfigured === false;
    const isPinConfigured = !isCheckingStatus && !hasStatusFetchError && securityStatus?.pinConfigured === true;
    const isLocked = Boolean(securityStatus?.isLocked) || lockCountdown > 0;

    // Manejar ingreso numérico desde teclado en pantalla
    const handleKeypadPress = (val) => {
        if (isLocked || isSubmitting || !isPinConfigured) return;
        setErrorMessage(null);
        if (val === 'backspace') {
            setPin(prev => prev.slice(0, -1));
        } else if (val === 'clear') {
            setPin('');
        } else if (pin.length < 4) {
            setPin(prev => prev + val);
        }
    };

    // Envío automático al completar 4 dígitos (solo cuando el servidor confirmó que el PIN está configurado)
    useEffect(() => {
        if (isPinConfigured && pin.length === 4 && !isLocked && !isSubmitting) {
            handleVerifyPin(pin);
        }
    }, [pin, isPinConfigured, isLocked]);

    const handleVerifyPin = async (pinToVerify = pin) => {
        if (!/^\d{4}$/.test(pinToVerify)) {
            setErrorMessage('El PIN debe contener exactamente 4 dígitos.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/pin/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ pin: pinToVerify })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setPin('');
                if (data.isLocked) {
                    setLockCountdown(data.lockRemainingMinutes * 60 || 900);
                    setErrorMessage(data.message);
                    if (onRefreshStatus) onRefreshStatus();
                } else {
                    setErrorMessage(data.message || 'PIN incorrecto.');
                }
                return;
            }

            toast.success('Acceso autorizado a Tesorería Estratégica');
            onAuthorized(data.treasuryToken);
        } catch (err) {
            setErrorMessage('Error de conexión al validar el PIN.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSetupInitialPin = async (e) => {
        e.preventDefault();
        if (!/^\d{4}$/.test(pin)) {
            setErrorMessage('El PIN debe tener 4 dígitos numéricos.');
            return;
        }
        if (pin !== confirmPin) {
            setErrorMessage('La confirmación del PIN no coincide.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/pin/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ pin, confirmPin })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                setErrorMessage(data.message || 'Error al configurar el PIN.');
                return;
            }

            toast.success('PIN configurado exitosamente.');
            onAuthorized(data.treasuryToken);
        } catch {
            setErrorMessage('Error de conexión al configurar el PIN.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecoverPin = async (e) => {
        e.preventDefault();
        if (!recoveryPassword) {
            toast.error('Ingresá tu contraseña de acceso al CRM.');
            return;
        }
        if (!/^\d{4}$/.test(recoveryNewPin)) {
            toast.error('El nuevo PIN debe tener exactamente 4 dígitos.');
            return;
        }
        if (recoveryNewPin !== recoveryConfirmPin) {
            toast.error('La confirmación del nuevo PIN no coincide.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/pin/recover', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    password: recoveryPassword,
                    newPin: recoveryNewPin,
                    confirmNewPin: recoveryConfirmPin
                })
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al restablecer el PIN.');
                return;
            }

            toast.success('Identidad validada. PIN restablecido con éxito.');
            setShowRecoveryModal(false);
            setRecoveryPassword('');
            setRecoveryNewPin('');
            setRecoveryConfirmPin('');
            setPin('');
            onAuthorized(data.treasuryToken);
        } catch {
            toast.error('Error al contactar al servidor.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-[75vh] w-full items-center justify-center p-4">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-purple-500/25 bg-crm-surface/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
                {/* Glow decorativo de alta seguridad */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-purple-500/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />

                {/* Encabezado */}
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/15 text-purple-300 shadow-lg shadow-purple-500/10">
                        {isLocked ? <AlertTriangle size={32} className="text-amber-400" /> : <Lock size={30} />}
                    </div>
                    <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-300">
                        Área de Dirección Privada
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                        Tesorería Estratégica
                    </h2>
                    <p className="mt-2 text-xs leading-relaxed text-crm-fg-muted max-w-xs">
                        {isCheckingStatus
                            ? 'Verificando acceso…'
                            : hasStatusFetchError
                            ? 'No se pudo verificar el estado de seguridad con el servidor.'
                            : isFirstTimeSetup
                            ? 'Configurá tu PIN privado de 4 dígitos para proteger los saldos reales, cajas y conciliación de capital.'
                            : isLocked
                            ? 'Acceso bloqueado por intentos fallidos. Aguardá al vencimiento del temporizador o reautenticate con tu contraseña.'
                            : 'Ingresá tu PIN de 4 dígitos para acceder a la dirección de tesorería y asignación de cajas.'}
                    </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-crm-red/10 p-3.5 text-xs text-red-200">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
                        <span className="font-semibold leading-snug">{errorMessage}</span>
                    </div>
                )}

                {/* Estado de Carga ("Verificando acceso…") o Error de Conexión ("Reintentar") */}
                {isCheckingStatus ? (
                    <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-crm-border bg-crm-bg/60 p-8 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-3 border-purple-500 border-t-transparent mb-3" />
                        <span className="text-xs font-bold text-crm-fg-muted">Verificando acceso…</span>
                    </div>
                ) : hasStatusFetchError ? (
                    <div className="mt-6 flex flex-col items-center rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                        <AlertTriangle size={28} className="text-red-400 mb-2" />
                        <span className="text-xs font-bold text-red-200">
                            {statusError || 'Error de conexión al consultar el estado de acceso.'}
                        </span>
                        <button
                            type="button"
                            onClick={() => onRefreshStatus && onRefreshStatus()}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-500 transition-colors"
                        >
                            <RotateCcw size={14} /> Reintentar
                        </button>
                    </div>
                ) : isLocked ? (
                    <div className="mt-6 flex flex-col items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
                        <Timer size={28} className="text-amber-300 animate-pulse mb-2" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                            Bloqueo de Seguridad Activo
                        </span>
                        <div className="mt-2 font-mono text-3xl font-black text-white">
                            {formatCountdown(lockCountdown)}
                        </div>
                        <p className="mt-2 text-xs text-crm-fg-muted">
                            Restan {Math.ceil(lockCountdown / 60)} minuto(s). Podés reestablecer el acceso inmediatamente validando tu contraseña de propietario.
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowRecoveryModal(true)}
                            className="mt-4 rounded-xl border border-purple-500/40 bg-purple-500/20 px-4 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/30 transition-colors"
                        >
                            Reestablecer con Contraseña
                        </button>
                    </div>
                ) : isFirstTimeSetup ? (
                    /* Formulario de Configuración Inicial */
                    <form onSubmit={handleSetupInitialPin} className="mt-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">
                                Crear PIN (4 dígitos)
                            </label>
                            <input
                                type="password"
                                maxLength={4}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="••••"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                className="w-full text-center tracking-[0.5em] text-2xl font-bold rounded-xl border border-crm-border bg-crm-bg p-3 text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">
                                Confirmar PIN
                            </label>
                            <input
                                type="password"
                                maxLength={4}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="••••"
                                value={confirmPin}
                                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                className="w-full text-center tracking-[0.5em] text-2xl font-bold rounded-xl border border-crm-border bg-crm-bg p-3 text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || pin.length !== 4 || confirmPin.length !== 4}
                            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 p-3.5 text-sm font-black text-white shadow-lg transition-opacity hover:opacity-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando PIN seguro...' : 'Establecer PIN y Acceder'}
                        </button>
                    </form>
                ) : (
                    /* Teclado e Indicador de PIN */
                    <div className="mt-6 flex flex-col items-center">
                        {/* Indicadores de Dígitos (4 puntos) */}
                        <div className="flex gap-4 mb-6">
                            {[0, 1, 2, 3].map((idx) => {
                                const filled = pin.length > idx;
                                return (
                                    <div
                                        key={idx}
                                        className={`h-4 w-4 rounded-full transition-all duration-200 ${
                                            filled
                                                ? 'bg-purple-400 shadow-md shadow-purple-500/50 scale-110'
                                                : 'border-2 border-crm-border bg-crm-bg/70'
                                        }`}
                                    />
                                );
                            })}
                        </div>

                        {/* Teclado Numérico */}
                        <div className="grid w-full max-w-[280px] grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => handleKeypadPress(String(num))}
                                    className="flex h-14 items-center justify-center rounded-2xl border border-crm-border/70 bg-crm-bg/90 text-xl font-bold text-white transition hover:border-purple-500/50 hover:bg-crm-surface-raised active:scale-95"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => handleKeypadPress('clear')}
                                className="flex h-14 items-center justify-center rounded-2xl border border-crm-border/70 bg-crm-bg/50 text-xs font-bold uppercase tracking-wider text-crm-fg-muted hover:text-white transition active:scale-95"
                            >
                                C
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadPress('0')}
                                className="flex h-14 items-center justify-center rounded-2xl border border-crm-border/70 bg-crm-bg/90 text-xl font-bold text-white transition hover:border-purple-500/50 hover:bg-crm-surface-raised active:scale-95"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={() => handleKeypadPress('backspace')}
                                className="flex h-14 items-center justify-center rounded-2xl border border-crm-border/70 bg-crm-bg/50 text-base text-crm-fg-muted hover:text-white transition active:scale-95"
                                aria-label="Borrar dígito"
                            >
                                ⌫
                            </button>
                        </div>

                        {/* Pie con opciones y advertencia */}
                        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-crm-fg-muted">
                            <span className="flex items-center gap-1.5 font-medium text-emerald-400/90">
                                <ShieldCheck size={14} /> Autorización temporal de 15 minutos
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowRecoveryModal(true)}
                                className="mt-2 text-purple-300 hover:text-purple-200 transition-colors underline"
                            >
                                ¿Olvidaste tu PIN? Reestablecer con contraseña
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Recuperación con Reautenticación de Contraseña */}
            {showRecoveryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
                    <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-crm-surface p-6 shadow-2xl">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                                    <KeyRound size={20} />
                                </span>
                                <div>
                                    <h3 className="text-base font-black text-white">Reestablecer PIN Privado</h3>
                                    <p className="text-xs text-crm-fg-muted">Reautenticación obligatoria de Propietario</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRecoveryModal(false)}
                                className="text-crm-fg-muted hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleRecoverPin} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">
                                    Contraseña actual de tu usuario del CRM
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={recoveryPassword}
                                        onChange={(e) => setRecoveryPassword(e.target.value)}
                                        placeholder="Ingresá tu contraseña de inicio de sesión"
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-3 pr-10 text-sm text-white focus:border-purple-500 focus:outline-none"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-crm-fg-muted hover:text-white"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">
                                        Nuevo PIN (4 dígitos)
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="••••"
                                        value={recoveryNewPin}
                                        onChange={(e) => setRecoveryNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        className="w-full text-center font-mono tracking-widest text-lg font-bold rounded-xl border border-crm-border bg-crm-bg p-3 text-white focus:border-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">
                                        Confirmar PIN
                                    </label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        placeholder="••••"
                                        value={recoveryConfirmPin}
                                        onChange={(e) => setRecoveryConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        className="w-full text-center font-mono tracking-widest text-lg font-bold rounded-xl border border-crm-border bg-crm-bg p-3 text-white focus:border-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRecoveryModal(false)}
                                    className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-xs font-bold text-crm-fg-muted hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !recoveryPassword || recoveryNewPin.length !== 4}
                                    className="flex-1 rounded-xl bg-purple-600 p-3 text-xs font-black text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Verificando...' : 'Validar y Cambiar PIN'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
