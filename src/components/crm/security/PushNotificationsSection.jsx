"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Bell, BellRing, Smartphone, ShieldAlert, ShieldCheck, 
    RefreshCw, Trash2, Send, CheckCircle2, AlertTriangle, 
    Laptop, HelpCircle, Lock, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
    isPushSupported, 
    getNotificationPermission, 
    subscribeToPushNotifications, 
    fetchPushSubscriptions, 
    revokePushSubscription, 
    sendTestPushNotification,
    updatePushPreferences 
} from '../../../services/pushClientService';

export default function PushNotificationsSection({ token, isOwner }) {
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState('default');
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);
    const [revokingId, setRevokingId] = useState(null);
    const [nonCriticalEnabled, setNonCriticalEnabled] = useState(true);

    // Comprobación inicial de soporte y permisos
    useEffect(() => {
        const isSupp = isPushSupported();
        setSupported(isSupp);
        setPermission(getNotificationPermission());
    }, []);

    // Cargar suscripciones del servidor
    const loadSubscriptions = useCallback(async () => {
        if (!token || !isOwner) return;
        setLoading(true);
        try {
            const list = await fetchPushSubscriptions({ token });
            setSubscriptions(list);
            if (list.length > 0) {
                setNonCriticalEnabled(list[0].preferences?.nonCriticalEnabled !== false);
            }
        } catch (err) {
            toast.error(err.message || 'Error al cargar suscripciones');
        } finally {
            setLoading(false);
        }
    }, [token, isOwner]);

    useEffect(() => {
        loadSubscriptions();
    }, [loadSubscriptions]);

    // Acción explícita para activar notificaciones en el dispositivo actual
    const handleEnableNotifications = async () => {
        setSubscribing(true);
        try {
            const res = await subscribeToPushNotifications({ token });
            toast.success(`Dispositivo '${res.subscription.deviceName}' suscrito a alertas de seguridad.`);
            setPermission('granted');
            await loadSubscriptions();
        } catch (err) {
            toast.error(err.message || 'No se pudo activar las notificaciones push.');
            setPermission(getNotificationPermission());
        } finally {
            setSubscribing(false);
        }
    };

    // Envío de notificación de prueba
    const handleSendTest = async () => {
        setSendingTest(true);
        try {
            const res = await sendTestPushNotification({ token });
            toast.success(`Notificación de prueba enviada a ${res.targetsCount} dispositivo(s).`);
        } catch (err) {
            toast.error(err.message || 'Error al enviar notificación de prueba');
        } finally {
            setSendingTest(false);
        }
    };

    // Revocar suscripción de un dispositivo
    const handleRevoke = async (subscriptionId) => {
        if (!confirm('¿Seguro que deseas revocar este dispositivo? Dejará de recibir alertas de seguridad push.')) {
            return;
        }
        setRevokingId(subscriptionId);
        try {
            await revokePushSubscription({ token, subscriptionId });
            toast.success('Suscripción revocada correctamente.');
            await loadSubscriptions();
        } catch (err) {
            toast.error(err.message || 'Error al revocar la suscripción');
        } finally {
            setRevokingId(null);
        }
    };

    // Actualizar preferencia de alertas no críticas
    const handleToggleNonCritical = async () => {
        const newValue = !nonCriticalEnabled;
        setNonCriticalEnabled(newValue);

        try {
            // Actualizar en todas las suscripciones activas del propietario
            for (const sub of subscriptions) {
                await updatePushPreferences({
                    token,
                    subscriptionId: sub.subscriptionId,
                    nonCriticalEnabled: newValue
                });
            }
            toast.success(`Alertas de alta prioridad ${newValue ? 'activadas' : 'silenciadas'}.`);
        } catch (err) {
            toast.error('Error al actualizar preferencias: ' + err.message);
            setNonCriticalEnabled(!newValue);
        }
    };

    if (!isOwner) {
        return (
            <div className="p-8 text-center rounded-2xl border border-crm-border bg-crm-surface text-crm-fg">
                <Lock size={36} className="mx-auto mb-3 text-crm-red" />
                <h3 className="text-base font-bold">Acceso Restringido</h3>
                <p className="text-xs text-crm-fg-muted mt-1">
                    Solo el propietario del sistema está autorizado a configurar y recibir alertas push críticas.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* ENCABEZADO DE LA SECCIÓN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-crm-border bg-crm-surface">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-crm-red/10 border border-crm-red/20 text-crm-red">
                        <BellRing size={24} />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-crm-fg">NOTIFICACIONES DE SEGURIDAD</h2>
                        <p className="text-xs text-crm-fg-muted mt-0.5">
                            Recepción instantánea de alertas críticas en tu celular (sin requerir la pantalla abierta).
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadSubscriptions}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-crm-border bg-crm-surface-raised text-crm-fg hover:border-crm-red/40 transition-colors disabled:opacity-50"
                        title="Actualizar estado"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        <span>Actualizar</span>
                    </button>

                    {subscriptions.length > 0 && (
                        <button
                            onClick={handleSendTest}
                            disabled={sendingTest}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-crm-surface-raised text-crm-fg border border-crm-border hover:border-crm-fg/40 transition-all disabled:opacity-50"
                        >
                            <Send size={14} className={sendingTest ? 'animate-pulse' : ''} />
                            <span>{sendingTest ? 'Enviando...' : 'Enviar Prueba'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ESTADO EN EL DISPOSITIVO ACTUAL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-crm-border bg-crm-surface flex flex-col justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Soporte en este navegador
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            {supported ? (
                                <>
                                    <CheckCircle2 size={18} className="text-emerald-500" />
                                    <span className="text-sm font-bold text-emerald-500">Compatible con Web Push</span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle size={18} className="text-amber-500" />
                                    <span className="text-sm font-bold text-amber-500">No compatible / Requiere PWA</span>
                                </>
                            )}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted/80 mt-2">
                            {supported 
                                ? 'Estándares W3C Push API y Service Worker operativos.'
                                : 'En iOS, añade la app a la Pantalla de Inicio desde Safari para activar Web Push.'}
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-crm-border/60">
                        {permission === 'granted' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Permiso Concedido
                            </span>
                        ) : permission === 'denied' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Permiso Bloqueado
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Permiso No Solicitado
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-4 rounded-2xl border border-crm-border bg-crm-surface flex flex-col justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Terminales Suscritas
                        </div>
                        <div className="text-2xl font-bold font-mono text-crm-fg mt-1">
                            {subscriptions.length}
                        </div>
                        <p className="text-[11px] text-crm-fg-muted/80 mt-2">
                            Equipos autorizados para recibir alertas de intrusión y accesos en tiempo real.
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-crm-border/60">
                        <span className="text-[11px] text-crm-fg-muted font-mono">
                            {subscriptions.length > 0 ? 'Canal activo y en escucha' : 'Sin dispositivos vinculados'}
                        </span>
                    </div>
                </div>

                <div className="p-4 rounded-2xl border border-crm-border bg-crm-surface flex flex-col justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Acción en este Equipo
                        </div>
                        <p className="text-xs text-crm-fg mt-1">
                            Habilita el receptor de notificaciones en el navegador actual.
                        </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-crm-border/60">
                        <button
                            onClick={handleEnableNotifications}
                            disabled={subscribing || !supported}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Bell size={14} className={subscribing ? 'animate-bounce' : ''} />
                            <span>{subscribing ? 'Suscribiendo...' : 'Activar en este dispositivo'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* CONFIGURACIÓN DE CATEGORÍAS DE ALERTAS */}
            <div className="p-5 rounded-2xl border border-crm-border bg-crm-surface space-y-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-crm-red" />
                    <h3 className="text-xs sm:text-sm font-bold text-crm-fg">POLÍTICA DE CATEGORÍAS Y FILTRADO</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Alertas Críticas (Obligatorias) */}
                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-rose-400">ALERTAS CRÍTICAS</span>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                                    OBLIGATORIO
                                </span>
                            </div>
                            <p className="text-[11px] text-crm-fg-muted mt-1 leading-relaxed">
                                Intento de uso de dispositivo revocado, acceso con sesión revocada, recuperación de emergencia y anomalías de auditoría.
                            </p>
                            <p className="text-[10px] text-rose-400/80 mt-2 font-mono flex items-center gap-1">
                                <Lock size={10} /> No puede desactivarse silenciosamente por directiva de seguridad.
                            </p>
                        </div>
                        <div className="pt-1">
                            <ToggleRight size={28} className="text-rose-500 cursor-not-allowed opacity-80" />
                        </div>
                    </div>

                    {/* Alertas de Alta Prioridad (Configurables) */}
                    <div className="p-4 rounded-xl border border-crm-border bg-crm-surface-raised flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-crm-fg">ALERTAS DE ALTA PRIORIDAD</span>
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                                    CONFIGURABLE
                                </span>
                            </div>
                            <p className="text-[11px] text-crm-fg-muted mt-1 leading-relaxed">
                                Logins desde terminales no reconocidas, 5 intentos fallidos en 10 min, registro de nueva passkey o dispositivo confiable.
                            </p>
                            <p className="text-[10px] text-crm-fg-muted mt-2">
                                Estado actual: {nonCriticalEnabled ? 'Activo (recibiendo avisos)' : 'Silenciado'}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleNonCritical}
                            className="pt-1 text-crm-red hover:opacity-80 transition-opacity"
                            title={nonCriticalEnabled ? 'Desactivar alta prioridad' : 'Activar alta prioridad'}
                        >
                            {nonCriticalEnabled ? (
                                <ToggleRight size={28} className="text-emerald-500" />
                            ) : (
                                <ToggleLeft size={28} className="text-crm-fg-muted" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* LISTADO DE DISPOSITIVOS SUSCRITOS */}
            <div className="p-5 rounded-2xl border border-crm-border bg-crm-surface space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Smartphone size={18} className="text-crm-fg" />
                        <h3 className="text-xs sm:text-sm font-bold text-crm-fg">DISPOSITIVOS SUSCRITOS AL RECEPTOR PUSH</h3>
                    </div>
                    <span className="text-xs font-mono text-crm-fg-muted">
                        Total: {subscriptions.length}
                    </span>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-xs text-crm-fg-muted flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-crm-red" />
                        <span>Cargando terminales suscritas...</span>
                    </div>
                ) : subscriptions.length === 0 ? (
                    <div className="py-8 text-center rounded-xl border border-dashed border-crm-border text-crm-fg-muted space-y-2">
                        <Smartphone size={28} className="mx-auto text-crm-fg-muted/60" />
                        <p className="text-xs font-semibold">No hay ningún dispositivo suscrito a alertas push.</p>
                        <p className="text-[11px] text-crm-fg-muted/70">
                            Haz clic en &quot;Activar en este dispositivo&quot; para comenzar a recibir alertas en tu teléfono o PC.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-crm-border text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider">
                                    <th className="py-3 px-3">Dispositivo</th>
                                    <th className="py-3 px-3">Plataforma</th>
                                    <th className="py-3 px-3">Fecha Suscripción</th>
                                    <th className="py-3 px-3">Última Actividad</th>
                                    <th className="py-3 px-3">Entregas</th>
                                    <th className="py-3 px-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border/60 text-xs text-crm-fg">
                                {subscriptions.map(sub => (
                                    <tr key={sub.subscriptionId} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="py-3 px-3 font-semibold">
                                            <div className="flex items-center gap-2">
                                                <Smartphone size={16} className="text-crm-fg-muted" />
                                                <span>{sub.deviceName}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[11px] text-crm-fg-muted">
                                            {sub.os} · {sub.browser}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[11px] text-crm-fg-muted">
                                            {new Date(sub.createdAt).toLocaleDateString('es-AR', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[11px] text-crm-fg-muted">
                                            {sub.lastSeenAt ? new Date(sub.lastSeenAt).toLocaleDateString('es-AR', {
                                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                                            }) : 'Sin registro'}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-[11px]">
                                            <span className="text-emerald-400">{sub.stats?.sentCount || 0} exitosas</span>
                                            {sub.stats?.failureCount > 0 && (
                                                <span className="text-rose-400 ml-1.5 font-bold">({sub.stats.failureCount} fallos)</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            <button
                                                onClick={() => handleRevoke(sub.subscriptionId)}
                                                disabled={revokingId === sub.subscriptionId}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all disabled:opacity-50"
                                                title="Revocar suscripción"
                                            >
                                                <Trash2 size={13} />
                                                <span>{revokingId === sub.subscriptionId ? 'Revocando...' : 'Revocar'}</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* GUÍA DE COMPATIBILIDAD CON CELULARES (IPHONE & ANDROID) */}
            <div className="p-5 rounded-2xl border border-crm-border bg-crm-surface/70 space-y-3">
                <div className="flex items-center gap-2">
                    <Info size={16} className="text-blue-400" />
                    <h4 className="text-xs font-bold text-crm-fg uppercase tracking-wider">
                        Instrucciones de Instalación en Celulares
                    </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-crm-fg-muted">
                    <div className="p-3.5 rounded-xl border border-crm-border bg-crm-surface-raised space-y-1.5">
                        <span className="font-bold text-crm-fg flex items-center gap-1.5">
                            <span className="text-base"></span> Apple iPhone (iOS 16.4+)
                        </span>
                        <p className="text-[11px] leading-relaxed">
                            1. Abre Safari y accede al CRM sobre conexión segura HTTPS.
                        </p>
                        <p className="text-[11px] leading-relaxed">
                            2. Toca el botón <strong>Compartir</strong> y selecciona <strong>&quot;Agregar a la pantalla de inicio&quot;</strong>.
                        </p>
                        <p className="text-[11px] leading-relaxed">
                            3. Abre la aplicación desde el ícono en tu pantalla de inicio y activa las notificaciones aquí.
                        </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-crm-border bg-crm-surface-raised space-y-1.5">
                        <span className="font-bold text-crm-fg flex items-center gap-1.5">
                            <Smartphone size={14} className="text-emerald-500" /> Android (Google Chrome)
                        </span>
                        <p className="text-[11px] leading-relaxed">
                            1. Abre Chrome y navega al CRM.
                        </p>
                        <p className="text-[11px] leading-relaxed">
                            2. Toca directamente <strong>&quot;Activar en este dispositivo&quot;</strong> y presiona <strong>&quot;Permitir&quot;</strong> en el diálogo del sistema.
                        </p>
                        <p className="text-[11px] leading-relaxed">
                            3. Opcional: Toca los tres puntos de Chrome y elige &quot;Instalar aplicación&quot;.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
