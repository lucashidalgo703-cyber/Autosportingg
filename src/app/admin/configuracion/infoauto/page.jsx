"use client";

import React, { useState, useEffect } from 'react';
import { 
    Car, Save, RefreshCw, CheckCircle2, AlertTriangle, Key, 
    Globe, User, Lock, Activity, ShieldCheck, Database, Info, 
    ArrowRight, Check, Sparkles
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';
import toast from 'react-hot-toast';
import { ConfigSkeleton, ConfigError } from '../../../../components/crm/layout/ConfigLoaders';

export default function InfoAutoSettingsPage() {
    const { token, user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncingAll, setSyncingAll] = useState(false);
    const [error, setError] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [syncResult, setSyncResult] = useState(null);

    const [form, setForm] = useState({
        enabled: true,
        apiUrl: 'https://nexo.infoauto.com.ar',
        username: '',
        password: '',
        apiKey: '',
        autoSyncMonthly: true
    });

    const [statusInfo, setStatusInfo] = useState({
        status: 'disconnected',
        lastSyncAt: null,
        edicionActual: 'Octubre 2026'
    });

    const canEdit = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.SETTINGS_WRITE);

    const loadConfig = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/infoauto/config', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar la configuración de InfoAuto');
            const data = await res.json();
            if (data.ok && data.config) {
                setForm({
                    enabled: data.config.enabled ?? true,
                    apiUrl: data.config.apiUrl || 'https://api.infoauto.com.ar/v1',
                    username: data.config.username || '',
                    password: data.config.password || '',
                    apiKey: data.config.apiKey || '',
                    autoSyncMonthly: data.config.autoSyncMonthly ?? true
                });
                setStatusInfo({
                    status: data.config.status || 'disconnected',
                    lastSyncAt: data.config.lastSyncAt,
                    edicionActual: data.edicionActual || 'Octubre 2026'
                });
            }
        } catch (err) {
            console.error('Error cargando InfoAuto:', err);
            setError(err.message || 'Error al conectar con el servidor');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && token) {
            loadConfig();
        }
    }, [authLoading, token]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/infoauto/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok || !data.ok) throw new Error(data.error || 'Error al guardar');
            
            toast.success('Configuración de InfoAuto guardada');
            setStatusInfo(prev => ({
                ...prev,
                status: data.config?.status || prev.status,
                lastSyncAt: data.config?.lastSyncAt || prev.lastSyncAt
            }));
        } catch (err) {
            toast.error(err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/infoauto/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            setTestResult(data);
            if (data.ok) {
                toast.success('Conexión con InfoAuto exitosa');
                setStatusInfo(prev => ({ ...prev, status: 'connected' }));
            } else {
                toast.error(data.message || 'Error al validar credenciales');
            }
        } catch (err) {
            setTestResult({ ok: false, message: 'Fallo de red al probar conexión: ' + err.message });
            toast.error('Error al probar conexión');
        } finally {
            setTesting(false);
        }
    };

    const handleSyncAllStock = async () => {
        const confirm = window.confirm(
            '¿Deseas sincronizar todos los vehículos que tienen código CODIA asignado con la guía oficial vigente?'
        );
        if (!confirm) return;

        setSyncingAll(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/admin/infoauto/sync-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setSyncResult(data);
            if (data.ok) {
                toast.success(`Sincronización completada: ${data.updated} vehículos actualizados`);
                setStatusInfo(prev => ({ ...prev, lastSyncAt: new Date().toISOString() }));
            } else {
                toast.error(data.message || 'Error en la sincronización masiva');
            }
        } catch (err) {
            toast.error('Error al sincronizar: ' + err.message);
        } finally {
            setSyncingAll(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <SettingsTabs />
                <ConfigSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto space-y-6">
                <SettingsTabs />
                <ConfigError error={error} retry={loadConfig} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <SettingsTabs />

            {/* ENCABEZADO PRINCIPAL */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-crm-surface border border-crm-border rounded-2xl p-6">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <Car size={26} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <h1 className="text-xl font-bold text-white">Integración con InfoAuto</h1>
                            {statusInfo.status === 'connected' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                                    <CheckCircle2 size={12} /> Conectado
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                                    <AlertTriangle size={12} /> Configuración Pendiente
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-crm-fg-muted mt-1">
                            Vinculá el catálogo con la Guía de Precios Oficial de la Cámara del Comercio Automotor (CCA / InfoAuto Argentina)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-crm-surface-raised border border-crm-border text-crm-fg hover:text-white hover:border-crm-fg transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Activity size={14} className={testing ? 'animate-spin' : ''} />
                        {testing ? 'Probando...' : 'Probar Conexión'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <Save size={14} className={saving ? 'animate-spin' : ''} />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            {/* RESULTADO DE LA PRUEBA EN VIVO */}
            {testResult && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                    testResult.ok 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}>
                    {testResult.ok ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />}
                    <div className="space-y-1">
                        <div className="font-bold">
                            {testResult.ok ? 'Prueba de conexión exitosa' : 'Fallo en la prueba de conexión'}
                        </div>
                        <div>{testResult.message}</div>
                        {testResult.latencyMs && (
                            <div className="text-[11px] opacity-80">Latencia de respuesta: {testResult.latencyMs}ms</div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* COLUMNA IZQUIERDA: FORMULARIO DE CREDENCIALES (2 COLS) */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="bg-crm-surface border border-crm-border rounded-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Key size={16} className="text-blue-400" />
                                Credenciales de Acceso a InfoAuto
                            </h2>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="enabled"
                                    checked={form.enabled}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    className="w-4 h-4 rounded border-blue-500 text-blue-500 bg-crm-bg cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-crm-fg">Habilitar Módulo</span>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-crm-fg uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                    <Globe size={13} className="text-crm-fg-muted" />
                                    Portal Nexo InfoAuto
                                </label>
                                <input
                                    type="url"
                                    name="apiUrl"
                                    value={form.apiUrl}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    placeholder="https://nexo.infoauto.com.ar"
                                    className="w-full bg-crm-bg border border-crm-border text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
                                />
                                <p className="text-[11px] text-crm-fg-muted mt-1">
                                    Plataforma oficial Nexo InfoAuto (https://nexo.infoauto.com.ar/prices).
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-crm-fg uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                        <User size={13} className="text-crm-fg-muted" />
                                        Usuario / Email de Nexo InfoAuto
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={form.username}
                                        onChange={handleChange}
                                        disabled={!canEdit}
                                        placeholder="usuario@concesionario.com"
                                        className="w-full bg-crm-bg border border-crm-border text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-crm-fg uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                        <Lock size={13} className="text-crm-fg-muted" />
                                        Contraseña de Nexo InfoAuto
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        disabled={!canEdit}
                                        placeholder="••••••••"
                                        className="w-full bg-crm-bg border border-crm-border text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
                                    />
                                    <p className="text-[10px] text-crm-fg-muted mt-1">
                                        Se almacena de forma segura y encriptada en la base de datos de tu servidor.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-crm-fg uppercase tracking-wider mb-1.5 flex items-center gap-2">
                                    <ShieldCheck size={13} className="text-crm-fg-muted" />
                                    API Key / Client Token (Opcional según plan contratado)
                                </label>
                                <input
                                    type="text"
                                    name="apiKey"
                                    value={form.apiKey}
                                    onChange={handleChange}
                                    disabled={!canEdit}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                                    className="w-full bg-crm-bg border border-crm-border text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
                                />
                            </div>

                            <div className="pt-3 border-t border-crm-border">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="autoSyncMonthly"
                                        checked={form.autoSyncMonthly}
                                        onChange={handleChange}
                                        disabled={!canEdit}
                                        className="mt-0.5 w-4 h-4 rounded border-blue-500 text-blue-500 bg-crm-bg cursor-pointer"
                                    />
                                    <div>
                                        <span className="text-xs font-semibold text-white block">
                                            Sincronización mensual automática del stock
                                        </span>
                                        <span className="text-[11px] text-crm-fg-muted">
                                            Cuando InfoAuto publica la nueva edición oficial del mes, actualizar automáticamente las cotizaciones de todos los vehículos que posean código CODIA vinculado.
                                        </span>
                                    </div>
                                </label>
                            </div>

                            {/* BOTONES DE ACCIÓN VISIBLES DEL FORMULARIO */}
                            <div className="pt-4 border-t border-crm-border flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[11px] text-crm-fg-muted">
                                    {statusInfo.status === 'connected' ? (
                                        <span className="text-emerald-400 font-medium">✓ Credenciales verificadas</span>
                                    ) : (
                                        'Recomendado: probá la conexión antes de guardar'
                                    )}
                                </span>
                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={testing}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-crm-surface-raised border border-crm-border text-crm-fg hover:text-white hover:border-crm-fg transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <Activity size={14} className={testing ? 'animate-spin' : ''} />
                                        {testing ? 'Probando...' : 'Probar Conexión'}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <Save size={14} className={saving ? 'animate-spin' : ''} />
                                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* TARJETA DE ACCIONES MASIVAS */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <Database size={16} className="text-blue-400" />
                                Sincronización Masiva del Stock
                            </h2>
                            <span className="text-xs text-crm-fg-muted">
                                Edición vigente: <strong className="text-blue-400">{statusInfo.edicionActual}</strong>
                            </span>
                        </div>

                        <p className="text-xs text-crm-fg-muted">
                            Esta acción recorre todo el inventario de vehículos activos que tienen asignado código CODIA de InfoAuto y actualiza el valor de lista oficial con la última guía vigente.
                        </p>

                        {syncResult && (
                            <div className={`p-3 rounded-xl border text-xs ${
                                syncResult.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}>
                                <div className="font-bold">{syncResult.message}</div>
                                {syncResult.updated !== undefined && (
                                    <div className="text-[11px] mt-1 opacity-80">
                                        Total actualizados: {syncResult.updated} • Omitidos/Sin CODIA: {syncResult.skipped || 0}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <span className="text-xs text-crm-fg-muted">
                                {statusInfo.lastSyncAt ? (
                                    <>Última sincronización: <strong className="text-white">{new Date(statusInfo.lastSyncAt).toLocaleString('es-AR')}</strong></>
                                ) : (
                                    'Aún no se ha realizado ninguna sincronización masiva.'
                                )}
                            </span>

                            <button
                                type="button"
                                onClick={handleSyncAllStock}
                                disabled={syncingAll || !canEdit}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
                                {syncingAll ? 'Sincronizando stock...' : 'Sincronizar Todo el Stock Ahora'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: GUÍA Y AYUDA */}
                <div className="space-y-6">
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6 space-y-4">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Sparkles size={16} className="text-amber-400" />
                            ¿Cómo funciona la integración?
                        </h2>

                        <div className="space-y-3 text-xs text-crm-fg-muted">
                            <div className="p-3 rounded-xl bg-crm-bg/80 border border-crm-border space-y-1">
                                <strong className="text-white block">1. Asignación de Código CODIA</strong>
                                <span>
                                    Cada modelo, versión y año en la base de datos de InfoAuto posee un código numérico único llamado <strong>CODIA</strong>.
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-crm-bg/80 border border-crm-border space-y-1">
                                <strong className="text-white block">2. Recuadro en Editar Valores</strong>
                                <span>
                                    En la sección <strong>Stock &gt; Editar Valores</strong>, vas a encontrar el recuadro oficial de InfoAuto para consultar o asignar la cotización de cada vehículo.
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-crm-bg/80 border border-crm-border space-y-1">
                                <strong className="text-white block">3. Brecha de Compra y Venta</strong>
                                <span>
                                    El sistema compara en tiempo real el valor de lista de InfoAuto con el <strong>Costo de Compra</strong> (para medir el ahorro o toma ventajosa) y con el <strong>Precio Publicado</strong> (para medir el margen comercial de salida).
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-crm-bg/80 border border-crm-border space-y-1">
                                <strong className="text-white block">4. Actualización Automática</strong>
                                <span>
                                    A principios de cada mes, cuando InfoAuto emite los nuevos listados, el CRM actualiza de forma automática las cotizaciones para mantener el stock al día sin carga manual.
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-2 text-xs text-blue-200">
                        <div className="font-bold flex items-center gap-1.5 text-blue-300">
                            <Info size={14} />
                            ¿No tenés credenciales todavía?
                        </div>
                        <p className="text-[11px] leading-relaxed">
                            Podés ingresar valores de referencia manualmente en cada vehículo mientras gestionás tu cuenta con InfoAuto Empresas. Las brechas financieras funcionarán de la misma forma.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
