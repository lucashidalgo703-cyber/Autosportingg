"use client";

import React, { useState, useEffect } from 'react';
import { Bot, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { PERMISSIONS } from '../../../../utils/adminPermissions';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';
import toast from 'react-hot-toast';

export default function AsistenteConfigPage() {
    const { token } = useAuth();
    const [config, setConfig] = useState({ enabled: false, provider: 'openai' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => {
            if (data.settings && data.settings.assistantConfig) {
                setConfig(data.settings.assistantConfig);
            }
                
            setLoading(false);
        })
        .catch(err => {
            toast.error('Error al cargar configuración');
            setLoading(false);
        });
    }, [token]);

    const parseErrorMessage = async (res) => {
        const data = await res.json().catch(() => ({}));
        return data.message || data.error || 'Error al guardar configuracion';
    };

    const saveAssistantConfig = async (endpoint) => {
        return fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ assistantConfig: config })
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!token) return toast.error('Sesion expirada. Volve a iniciar sesion.');

        setSaving(true);
        try {
            let res = await saveAssistantConfig('/api/admin/settings/assistant');

            if (!res.ok && ![401, 403].includes(res.status)) {
                res = await saveAssistantConfig('/api/admin/settings');
            }

            if (!res.ok) throw new Error(await parseErrorMessage(res));
            toast.success('Configuracion de Asistente guardada');
        } catch (error) {
            toast.error(error.message || 'Error al guardar configuracion');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PermissionGuard permission={PERMISSIONS.SETTINGS_READ}>
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-20 text-white">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold tracking-tight text-white">Configuración</h1>
                    <p className="text-crm-fg-muted mt-1 text-sm">Roster del CRM, roles y 2FA</p>
                </div>

                <SettingsTabs />

                {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>
                ) : (
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6 max-w-2xl">
                        <div className="flex items-center gap-3 mb-6 border-b border-crm-border pb-4">
                            <Bot className="text-blue-500" size={24} />
                            <div>
                                <h2 className="text-lg font-bold">Arturito (Modo sugerencia)</h2>
                                <p className="text-sm text-crm-fg-muted">Configuración técnica para integraciones de la IA Arturito.</p>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3 mb-6">
                            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-xs text-blue-400">
                                <strong>Aviso:</strong> Arturito se encuentra en "Modo Sugerencia". Puede generar borradores de respuesta contextuales en la bandeja de WhatsApp, los cuales siempre requieren revisión humana antes de enviarse. La API Key se lee de forma segura desde la variable de entorno <code>OPENAI_API_KEY</code> en el backend, por lo que no es necesario ni seguro ingresarla aquí.
                            </p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red focus:ring-offset-crm-bg"
                                    checked={config.enabled}
                                    onChange={e => setConfig({...config, enabled: e.target.checked})}
                                />
                                <div>
                                    <span className="block font-bold">Habilitar Integración IA</span>
                                    <span className="block text-xs text-crm-fg-muted">Activa el motor subyacente para procesar datos.</span>
                                </div>
                            </label>

                            <div className="space-y-4 pt-4 border-t border-crm-border">
                                <div>
                                    <label className="block text-sm font-bold text-crm-fg-muted mb-2">Proveedor de IA</label>
                                    <select 
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-4 py-3 text-white outline-none focus:border-crm-red disabled:opacity-50"
                                        value={config.provider}
                                        onChange={e => setConfig({...config, provider: e.target.value})}
                                        disabled={!config.enabled}
                                    >
                                        <option value="openai">OpenAI (ChatGPT)</option>
                                        <option value="anthropic">Anthropic (Claude)</option>
                                        <option value="custom">Otro / Personalizado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <PermissionGuard permission={PERMISSIONS.SETTINGS_WRITE}>
                                    <button 
                                        type="submit" 
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-crm-red-gradient text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
                                    </button>
                                </PermissionGuard>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </PermissionGuard>
    );
}
