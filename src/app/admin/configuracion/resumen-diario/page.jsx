"use client";

import React, { useState, useEffect } from 'react';
import { Save, Info, Bell, Clock, Mail, CheckSquare } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { PERMISSIONS, hasPermission } from '../../../../utils/adminPermissions';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';
import toast from 'react-hot-toast';
import { ConfigSkeleton, ConfigError } from '../../../../components/crm/layout/ConfigLoaders';

export default function ResumenDiarioConfigPage() {
    const { user } = useAuth();
    const canWrite = hasPermission(user, PERMISSIONS.SETTINGS_WRITE);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    
    const [config, setConfig] = useState({
        enabled: false,
        sendTime: "08:00",
        recipients: "", // We will manage it as string for the textarea/input and convert to array
        channel: "internal",
        sections: {
            newLeads: true,
            unansweredConversations: true,
            dailySales: true,
            dueInstallments: true,
            openComplaints: true,
            criticalAlerts: true
        }
    });

    const fetchSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/settings', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (!res.ok) throw new Error('Error al cargar configuración');
                const data = await res.json();
                
                const dailySummary = data.settings?.dailySummary;
                if (dailySummary) {
                    setConfig({
                        enabled: dailySummary.enabled ?? false,
                        sendTime: dailySummary.sendTime || "08:00",
                        recipients: (dailySummary.recipients || []).join(', '),
                        channel: dailySummary.channel || "internal",
                        sections: {
                            newLeads: dailySummary.sections?.newLeads ?? true,
                            unansweredConversations: dailySummary.sections?.unansweredConversations ?? true,
                            dailySales: dailySummary.sections?.dailySales ?? true,
                            dueInstallments: dailySummary.sections?.dueInstallments ?? true,
                            openComplaints: dailySummary.sections?.openComplaints ?? true,
                            criticalAlerts: dailySummary.sections?.criticalAlerts ?? true,
                        }
                    });
                }
        } catch (error) {
            setError(error.message || 'Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                enabled: config.enabled,
                sendTime: config.sendTime,
                recipients: config.recipients.split(',').map(e => e.trim()).filter(e => e),
                channel: config.channel,
                sections: config.sections
            };

            const res = await fetch('/api/admin/settings/daily-summary', {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al guardar la configuración');
            }

            toast.success('Configuración guardada correctamente');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSectionChange = (key) => {
        setConfig(prev => ({
            ...prev,
            sections: {
                ...prev.sections,
                [key]: !prev.sections[key]
            }
        }));
    };

    return (
        <PermissionGuard permission={PERMISSIONS.SETTINGS_READ}>
            <div className="max-w-7xl mx-auto p-4 md:p-6 w-full space-y-6 pb-20">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>
                    <p className="text-crm-fg-muted mt-1 text-sm">Resumen Diario</p>
                </div>
                <SettingsTabs />
                
                {loading ? (
                    <div className="mt-6"><ConfigSkeleton /></div>
                ) : error ? (
                    <ConfigError error={error} onRetry={fetchSettings} />
                ) : (
                    <div className="max-w-4xl w-full space-y-6">
                        <div>
                            <h2 className="text-2xl font-black text-crm-fg flex items-center gap-2">
                                <Bell className="text-crm-red" /> Resumen Diario
                            </h2>
                            <p className="text-sm text-crm-fg-muted mt-1">Configura el envío automático del resumen de actividad diaria del sistema.</p>
                        </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="text-sm font-bold text-blue-700">Estado de Implementación</h4>
                        <p className="text-xs text-blue-600/80 mt-1">
                            El canal <strong>Interno</strong> se encuentra disponible para guardar la configuración. Los canales <strong>Email</strong> y <strong>WhatsApp</strong> requerirán configuración de credenciales y un servicio de envío que se habilitará en una fase futura. No se simularán envíos si no se dispone del backend real.
                        </p>
                    </div>
                </div>

                <div className="bg-crm-surface border border-crm-border rounded-2xl shadow-sm overflow-hidden p-6 space-y-6">
                    {/* Habilitar / Deshabilitar */}
                    <div className="flex items-center justify-between bg-crm-bg border border-crm-border p-4 rounded-xl">
                        <div>
                            <h3 className="font-bold text-crm-fg text-sm">Habilitar Resumen Diario</h3>
                            <p className="text-xs text-crm-fg-muted">Activa el envío programado del resumen.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={config.enabled}
                                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-crm-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crm-red"></div>
                        </label>
                    </div>

                    <div className={`space-y-6 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Configuración de Envío */}
                        <div>
                            <h3 className="font-bold text-crm-fg text-sm mb-4">Parámetros de Envío</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-crm-fg flex items-center gap-1"><Clock size={14}/> Hora de Envío</label>
                                    <input 
                                        type="time" 
                                        value={config.sendTime}
                                        onChange={(e) => setConfig({ ...config, sendTime: e.target.value })}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:outline-none focus:border-crm-red"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-crm-fg flex items-center gap-1"><Mail size={14}/> Canal de Envío</label>
                                    <select 
                                        value={config.channel}
                                        onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:outline-none focus:border-crm-red"
                                    >
                                        <option value="internal">Notificación Interna (CRM)</option>
                                        <option value="email">Email (Pendiente Fase Futura)</option>
                                        <option value="whatsapp">WhatsApp (Pendiente Fase Futura)</option>
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-crm-fg">Destinatarios (Emails separados por coma)</label>
                                    <input 
                                        type="text" 
                                        placeholder="ejemplo@autosporting.com, otro@ejemplo.com"
                                        value={config.recipients}
                                        onChange={(e) => setConfig({ ...config, recipients: e.target.value })}
                                        className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-sm text-crm-fg focus:outline-none focus:border-crm-red"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Secciones del Resumen */}
                        <div>
                            <h3 className="font-bold text-crm-fg text-sm mb-4">Secciones a Incluir</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                    { key: 'newLeads', label: 'Leads Nuevos' },
                                    { key: 'unansweredConversations', label: 'Conversaciones sin responder' },
                                    { key: 'dailySales', label: 'Ventas del Día' },
                                    { key: 'dueInstallments', label: 'Cuotas Próximas/Vencidas' },
                                    { key: 'openComplaints', label: 'Reclamos Abiertos' },
                                    { key: 'criticalAlerts', label: 'Alertas Críticas' },
                                ].map((sec) => (
                                    <div key={sec.key} className="flex items-center gap-3 bg-crm-bg border border-crm-border p-3 rounded-xl cursor-pointer hover:border-crm-red/50 transition-colors" onClick={() => handleSectionChange(sec.key)}>
                                        <div className={`flex items-center justify-center w-5 h-5 rounded border ${config.sections[sec.key] ? 'bg-crm-red border-crm-red text-white' : 'border-crm-border bg-crm-surface'}`}>
                                            {config.sections[sec.key] && <CheckSquare size={14} className="stroke-[3px]" />}
                                        </div>
                                        <span className="text-sm font-medium text-crm-fg">{sec.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {canWrite && (
                    <div className="flex justify-end mt-6">
                            <button 
                                onClick={handleSave} 
                                disabled={saving || !canWrite}
                                className="flex items-center gap-2 bg-crm-red-gradient text-white px-6 py-2 rounded-xl font-black hover:shadow-crm-shadow-red disabled:opacity-50 transition-all text-sm"
                            >
                                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                        </div>
                )}
            </div>
                )}
            </div>
        </PermissionGuard>
    );
}
