"use client";

import React, { useState, useEffect } from 'react';
import { Save, Users, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import PermissionGuard from '../layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';

export default function LeadRoutingSettings({ initialSettings }) {
    const { token } = useAuth();
    const [saving, setSaving] = useState(false);
    const [leadRouting, setLeadRouting] = useState(initialSettings?.leadRouting || { enabled: false, rules: [] });
    const [users, setUsers] = useState([]);

    useEffect(() => {
        if (!token) return;
        fetch('/api/admin/users/active', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => setUsers(data))
        .catch(err => console.error("Error fetching users", err));
    }, [token]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ leadRouting })
            });
            if (!res.ok) throw new Error('Error al guardar configuración de asignación');
            toast.success('Reglas de asignación guardadas');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const addRule = () => {
        setLeadRouting({
            ...leadRouting,
            rules: [...leadRouting.rules, { channel: 'nuevo', enabled: true, participants: [], pausedParticipants: [], fallbackUser: null, slaMinutes: 60 }]
        });
    };

    return (
        <div className="bg-crm-surface border border-crm-border rounded-2xl p-6 max-w-2xl mt-6">
            <div className="flex items-center justify-between mb-6 border-b border-crm-border pb-4">
                <div className="flex items-center gap-3">
                    <Users className="text-blue-500" size={24} />
                    <div>
                        <h2 className="text-lg font-bold text-white">Asignación Automática (Round-Robin)</h2>
                        <p className="text-sm text-crm-fg-muted">Configura reglas por canal, SLAs y fallbacks.</p>
                    </div>
                </div>
                <label className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input type="checkbox" className="sr-only" checked={leadRouting.enabled} onChange={e => setLeadRouting({...leadRouting, enabled: e.target.checked})} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${leadRouting.enabled ? 'bg-green-500' : 'bg-crm-border'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${leadRouting.enabled ? 'transform translate-x-4' : ''}`}></div>
                    </div>
                </label>
            </div>

            {leadRouting.enabled && (
                <form onSubmit={handleSave} className="space-y-6">
                    {leadRouting.rules.map((rule, idx) => (
                        <div key={idx} className="p-4 bg-crm-bg border border-crm-border rounded-xl space-y-4">
                            <div className="flex justify-between items-center">
                                <input 
                                    type="text" 
                                    className="bg-crm-surface border border-crm-border text-white rounded p-2 text-sm"
                                    value={rule.channel} 
                                    onChange={e => {
                                        const newRules = [...leadRouting.rules];
                                        newRules[idx].channel = e.target.value;
                                        setLeadRouting({...leadRouting, rules: newRules});
                                    }} 
                                    placeholder="Canal (ej. whatsapp)" 
                                />
                                <label className="flex items-center gap-2 text-sm text-white">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-crm-border bg-crm-bg text-crm-red"
                                        checked={rule.enabled} 
                                        onChange={e => {
                                            const newRules = [...leadRouting.rules];
                                            newRules[idx].enabled = e.target.checked;
                                            setLeadRouting({...leadRouting, rules: newRules});
                                        }} 
                                    /> Activo
                                </label>
                            </div>
                            
                            <div>
                                <label className="block text-xs text-crm-fg-muted mb-1"><Clock size={12} className="inline mr-1" /> SLA Primera Respuesta (min)</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-crm-surface border border-crm-border text-white rounded p-2 text-sm"
                                    value={rule.slaMinutes}
                                    onChange={e => {
                                        const newRules = [...leadRouting.rules];
                                        newRules[idx].slaMinutes = parseInt(e.target.value) || 60;
                                        setLeadRouting({...leadRouting, rules: newRules});
                                    }}
                                />
                            </div>

                            <p className="text-xs text-crm-fg-muted"><AlertTriangle size={12} className="inline mr-1 text-yellow-500" /> Nota: Participantes y fallbacks requieren interfaz extendida de selectores.</p>
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <button type="button" onClick={addRule} className="text-sm text-blue-400 hover:text-blue-300">
                            + Agregar Canal
                        </button>
                    </div>

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
            )}
        </div>
    );
}
