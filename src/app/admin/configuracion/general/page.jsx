'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';
import { Save, AlertCircle, RotateCcw, Building2, Clock, Settings, Bell, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import SettingsTabs from '../../../../components/crm/settings/SettingsTabs';

export default function GeneralSettingsPage() {
    const { token, user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const canRead = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.SETTINGS_READ) || hasPermission(user, PERMISSIONS.SETTINGS_WRITE);
    const canEdit = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.SETTINGS_WRITE);

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar configuración');
            const data = await res.json();
            if (data.ok && data.settings) {
                setSettings(data.settings);
            } else {
                throw new Error(data.error || 'Respuesta inválida del servidor');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading && token) {
            loadSettings();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, token]);

    const handleChange = (section, field, value) => {
        if (section) {
            setSettings(prev => ({
                ...prev,
                [section]: { ...prev[section], [field]: value }
            }));
        } else {
            setSettings(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMessage('');
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(data.message || data.error || 'Error al guardar');
            }
            if (data.settings) {
                setSettings(data.settings);
            }
            setSuccessMessage('Configuración guardada correctamente.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || loading) {
        return <div className="flex justify-center items-center h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div></div>;
    }

    if (!canRead) {
        return (
            <div className="p-8 max-w-2xl mx-auto mt-10">
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
                        <p className="text-sm text-red-400 mb-6">No tenés permisos para acceder a la configuración general.</p>
                        <Link 
                            href="/admin/configuracion"
                            className="bg-crm-red text-white px-6 py-2 rounded-xl font-bold hover:bg-crm-red-hover transition-colors"
                        >
                            Volver a Configuración
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20 text-white w-full">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Configuración</h1>
                    <p className="text-sm text-crm-fg-muted mt-1">Roster del CRM, roles y 2FA</p>
                </div>
            </div>

            <SettingsTabs />

            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}
            {successMessage && (
                <div className="mb-6 bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{successMessage}</p>
                </div>
            )}

            {!settings ? (
                <div className="text-center text-crm-fg-muted py-10">
                    No se pudo cargar la configuración general.
                </div>
            ) : (
                <form onSubmit={handleSave} className="space-y-6">
                    {/* A. Datos de Agencia */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                            <Building2 size={18} className="text-crm-fg-muted" />
                            Datos de la Agencia
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Nombre</label>
                                <input 
                                    type="text" 
                                    value={settings.agencyName} 
                                    onChange={e => handleChange(null, 'agencyName', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Email Comercial</label>
                                <input 
                                    type="email" 
                                    value={settings.commercialEmail} 
                                    onChange={e => handleChange(null, 'commercialEmail', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Teléfono Principal</label>
                                <input 
                                    type="text" 
                                    value={settings.mainPhone} 
                                    onChange={e => handleChange(null, 'mainPhone', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Link Google Reviews</label>
                                <input 
                                    type="url" 
                                    value={settings.googleReviewsUrl} 
                                    onChange={e => handleChange(null, 'googleReviewsUrl', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Dirección Física</label>
                                <input 
                                    type="text" 
                                    value={settings.address} 
                                    onChange={e => handleChange(null, 'address', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* B. Parámetros Operativos */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                            <Settings size={18} className="text-crm-fg-muted" />
                            Parámetros Operativos
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Días para Lead sin seguimiento</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="1" max="60"
                                        value={settings.thresholds?.leadWithoutFollowupDays || 7} 
                                        onChange={e => handleChange('thresholds', 'leadWithoutFollowupDays', parseInt(e.target.value) || 7)}
                                        disabled={!canEdit}
                                        className="w-24 bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                    />
                                    <span className="text-sm text-crm-fg-muted">días</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Días para Reserva antigua</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="1" max="60"
                                        value={settings.thresholds?.oldReservationDays || 7} 
                                        onChange={e => handleChange('thresholds', 'oldReservationDays', parseInt(e.target.value) || 7)}
                                        disabled={!canEdit}
                                        className="w-24 bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                    />
                                    <span className="text-sm text-crm-fg-muted">días</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Días para Postventa pendiente</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="1" max="90"
                                        value={settings.thresholds?.postSalePendingDays || 7} 
                                        onChange={e => handleChange('thresholds', 'postSalePendingDays', parseInt(e.target.value) || 7)}
                                        disabled={!canEdit}
                                        className="w-24 bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                    />
                                    <span className="text-sm text-crm-fg-muted">días</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Días para rotación crítica de Stock</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="15" max="365"
                                        value={settings.thresholds?.stockCriticalDays || 90} 
                                        onChange={e => handleChange('thresholds', 'stockCriticalDays', parseInt(e.target.value) || 90)}
                                        disabled={!canEdit}
                                        className="w-24 bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                    />
                                    <span className="text-sm text-crm-fg-muted">días</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* C. Horarios y Moneda */}
                    <div className="bg-crm-surface border border-crm-border rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-crm-border pb-2">
                            <Clock size={18} className="text-crm-fg-muted" />
                            Horarios Comerciales
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Lunes a Viernes</label>
                                <input 
                                    type="text" 
                                    value={settings.businessHours?.mondayToFriday || "09:00 - 18:00"} 
                                    onChange={e => handleChange('businessHours', 'mondayToFriday', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Sábados</label>
                                <input 
                                    type="text" 
                                    value={settings.businessHours?.saturday || "09:00 - 13:00"} 
                                    onChange={e => handleChange('businessHours', 'saturday', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crm-fg-muted mb-1">Domingos</label>
                                <input 
                                    type="text" 
                                    value={settings.businessHours?.sunday || "Cerrado"} 
                                    onChange={e => handleChange('businessHours', 'sunday', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-3 py-2 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {canEdit && (
                        <div className="flex justify-end gap-4 mt-6 border-t border-crm-border pt-6">
                            <button 
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-crm-red hover:bg-crm-red-hover text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-black/20 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    )}
                </form>
            )}
        </div>
    );
}
