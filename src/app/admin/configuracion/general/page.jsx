'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../../utils/adminPermissions';
import { Save, AlertCircle, RotateCcw, Building2, Clock, Settings, Bell } from 'lucide-react';
import PermissionGuard from '../../../../components/crm/layout/PermissionGuard';
import Link from 'next/link';

export default function GeneralSettingsPage() {
    const { token, user, loading: authLoading } = useAuth();
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const canEdit = ['owner', 'admin'].includes(user?.role) || hasPermission(user, PERMISSIONS.SETTINGS_WRITE);

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar configuración');
            const data = await res.json();
            setSettings(data);
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
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error al guardar');
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

    if (!settings) return null;

    return (
        <PermissionGuard permission={PERMISSIONS.SETTINGS_READ}>
            <div className="max-w-4xl mx-auto p-6 pb-20">
                <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Link href="/admin/configuracion" className="text-neutral-400 hover:text-white transition-colors text-sm">
                                Configuración
                            </Link>
                            <span className="text-neutral-600">/</span>
                            <span className="text-white text-sm">General</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <Settings className="text-red-500" />
                            Configuración General
                        </h1>
                        <p className="text-neutral-400 mt-1 text-sm">
                            Parámetros operativos y reglas de negocio del CRM.
                        </p>
                    </div>
                </div>

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

                <form onSubmit={handleSave} className="space-y-6">
                    {/* A. Datos de Agencia */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
                            <Building2 size={18} className="text-neutral-400" />
                            Datos de la Agencia
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Nombre</label>
                                <input 
                                    type="text" 
                                    value={settings.agencyName} 
                                    onChange={e => handleChange(null, 'agencyName', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Email Comercial</label>
                                <input 
                                    type="email" 
                                    value={settings.commercialEmail} 
                                    onChange={e => handleChange(null, 'commercialEmail', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Teléfono Principal</label>
                                <input 
                                    type="text" 
                                    value={settings.mainPhone} 
                                    onChange={e => handleChange(null, 'mainPhone', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Link Google Reviews</label>
                                <input 
                                    type="url" 
                                    value={settings.googleReviewsUrl} 
                                    onChange={e => handleChange(null, 'googleReviewsUrl', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Dirección Física</label>
                                <input 
                                    type="text" 
                                    value={settings.address} 
                                    onChange={e => handleChange(null, 'address', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* B. Parámetros Operativos */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
                            <Settings size={18} className="text-neutral-400" />
                            Parámetros Operativos
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Días para Lead sin seguimiento</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="1" max="60"
                                        value={settings.thresholds?.leadWithoutFollowupDays || 7} 
                                        onChange={e => handleChange('thresholds', 'leadWithoutFollowupDays', parseInt(e.target.value) || 7)}
                                        disabled={!canEdit}
                                        className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-neutral-500">días</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Días para Reserva antigua</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="1" max="60"
                                        value={settings.thresholds?.oldReservationDays || 7} 
                                        onChange={e => handleChange('thresholds', 'oldReservationDays', parseInt(e.target.value) || 7)}
                                        disabled={!canEdit}
                                        className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-neutral-500">días</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Días para Postventa pendiente</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="1" max="90"
                                        value={settings.thresholds?.postSalePendingDays || 7} 
                                        onChange={e => handleChange('thresholds', 'postSalePendingDays', parseInt(e.target.value) || 7)}
                                        disabled={!canEdit}
                                        className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-neutral-500">días</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Días para rotación crítica de Stock</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number" min="15" max="365"
                                        value={settings.thresholds?.stockCriticalDays || 90} 
                                        onChange={e => handleChange('thresholds', 'stockCriticalDays', parseInt(e.target.value) || 90)}
                                        disabled={!canEdit}
                                        className="w-24 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-neutral-500">días</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* C. Horarios y Moneda */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 border-b border-neutral-800 pb-2">
                            <Clock size={18} className="text-neutral-400" />
                            Horarios Comerciales
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Lunes a Viernes</label>
                                <input 
                                    type="text" 
                                    value={settings.businessHours?.mondayToFriday || "09:00 - 18:00"} 
                                    onChange={e => handleChange('businessHours', 'mondayToFriday', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Sábados</label>
                                <input 
                                    type="text" 
                                    value={settings.businessHours?.saturday || "09:00 - 13:00"} 
                                    onChange={e => handleChange('businessHours', 'saturday', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">Domingos</label>
                                <input 
                                    type="text" 
                                    value={settings.businessHours?.sunday || "Cerrado"} 
                                    onChange={e => handleChange('businessHours', 'sunday', e.target.value)}
                                    disabled={!canEdit}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500 disabled:opacity-50"
                                />
                            </div>
                        </div>
                    </div>

                    {canEdit && (
                        <div className="flex justify-end gap-4 mt-6 border-t border-neutral-800 pt-6">
                            <button 
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </PermissionGuard>
    );
}
