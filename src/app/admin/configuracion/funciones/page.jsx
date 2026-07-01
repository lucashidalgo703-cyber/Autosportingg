"use client";

import React, { useState, useEffect } from 'react';
import { ToggleLeft, Save } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { PERMISSIONS } from '../../../../utils/adminPermissions';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';
import LeadRoutingSettings from '../../../../components/crm/settings/LeadRoutingSettings';
import toast from 'react-hot-toast';

export default function FuncionesConfigPage() {
    const { token } = useAuth();
    const [flags, setFlags] = useState({ enableNps: true, enableApprovals: true, enableTrash: true, enableWhatsapp: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => {
            if (data.settings && data.settings.featureFlags) {
                setFlags(data.settings.featureFlags);
            }
            if (data.settings) {
                // Attach to window or state
                window.__fullSettings = data.settings;
            }

            setLoading(false);
        })
        .catch(err => {
            toast.error('Error al cargar configuración');
            setLoading(false);
        });
    }, [token]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings/features', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(flags)
            });
            if (!res.ok) throw new Error('Error al guardar configuración');
            toast.success('Módulos actualizados con éxito');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const modules = [
        { id: 'enableWhatsapp', name: 'Módulo de WhatsApp & Correos', desc: 'Activa el panel centralizado de envíos de plantillas y comunicación.' },
        { id: 'enableNps', name: 'Encuestas NPS (Calidad)', desc: 'Permite el envío y gestión de encuestas de satisfacción postventa.' },
        { id: 'enableApprovals', name: 'Gobernanza: Autorizaciones', desc: 'Exige que las anulaciones y borrados pasen por un flujo de aprobación.' },
        { id: 'enableTrash', name: 'Gobernanza: Papelera Segura', desc: 'Evita la eliminación definitiva de datos críticos usando retención por 30 días.' }
    ];

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
                            <ToggleLeft className="text-green-500" size={24} />
                            <div>
                                <h2 className="text-lg font-bold">Módulos del Sistema</h2>
                                <p className="text-sm text-crm-fg-muted">Nota: Desactivar un módulo ocultará temporalmente sus menús para los usuarios.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6">
                            {modules.map(mod => (
                                <label key={mod.id} className="flex items-start gap-3 p-4 bg-crm-bg border border-crm-border rounded-xl cursor-pointer hover:border-crm-red/30 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 mt-0.5 rounded border-crm-border bg-crm-bg text-crm-red focus:ring-crm-red focus:ring-offset-crm-bg"
                                        checked={flags[mod.id]}
                                        onChange={e => setFlags({...flags, [mod.id]: e.target.checked})}
                                    />
                                    <div>
                                        <span className="block font-bold">{mod.name}</span>
                                        <span className="block text-sm text-crm-fg-muted mt-1">{mod.desc}</span>
                                    </div>
                                </label>
                            ))}

                            <div className="flex justify-end pt-4 border-t border-crm-border">
                                <PermissionGuard permission={PERMISSIONS.SETTINGS_WRITE}>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-crm-red-gradient text-white px-6 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        <Save size={18} /> {saving ? 'Guardando...' : 'Aplicar Cambios'}
                                    </button>
                                </PermissionGuard>
                            </div>
                        </form>
                    </div>
                )}

                {!loading && <LeadRoutingSettings initialSettings={typeof window !== 'undefined' ? window.__fullSettings : null} />}
            </div>
        </PermissionGuard>
    );
}
