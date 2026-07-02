"use client";

import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Save, User, Mail, ShieldCheck, FileKey, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const safeRole = user?.role || 'usuario';
    const roleLabel = (safeRole === 'owner' || safeRole === 'admin') 
        ? 'Administrador' 
        : safeRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        // Lógica simulada de guardado
        setTimeout(() => {
            toast.success('Perfil actualizado correctamente');
            setIsSaving(false);
        }, 1000);
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }
        setIsSaving(true);
        // Lógica simulada
        setTimeout(() => {
            toast.success('Contraseña actualizada');
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
            setIsSaving(false);
        }, 1000);
    };

    return (
        <div className="flex flex-col gap-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Mi Perfil</h1>
                <p className="text-crm-fg-muted text-sm">Administra tu información personal y credenciales de acceso.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Resumen Lateral */}
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="bg-crm-surface border border-crm-border rounded-xl p-6 flex flex-col items-center text-center shadow-sm">
                        <div className="w-24 h-24 rounded-full bg-crm-surface-raised border border-crm-border flex items-center justify-center text-4xl font-bold text-crm-fg mb-4">
                            {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <h2 className="text-lg font-bold text-white">{user?.displayName || 'Usuario'}</h2>
                        <p className="text-sm text-crm-fg-muted mb-4">{user?.email}</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-crm-red/10 border border-crm-red/20 text-xs font-bold text-crm-red uppercase tracking-wider">
                            <ShieldCheck size={14} />
                            {roleLabel}
                        </div>
                    </div>
                </div>

                {/* Formularios */}
                <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
                    {/* Datos Personales */}
                    <div className="bg-crm-surface border border-crm-border rounded-xl shadow-sm overflow-hidden">
                        <div className="border-b border-crm-border p-4 bg-crm-topbar/50 flex items-center gap-2">
                            <User size={18} className="text-crm-fg-muted" />
                            <h3 className="font-bold text-crm-fg">Información Básica</h3>
                        </div>
                        <form onSubmit={handleSaveProfile} className="p-5 flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1.5">Nombre Completo</label>
                                    <input 
                                        type="text" name="displayName" value={formData.displayName} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:border-crm-red focus:ring-1 focus:ring-crm-red focus:outline-none transition-colors"
                                        placeholder="Ej. Juan Pérez"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1.5">Correo Electrónico</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail size={14} className="text-crm-fg-muted" />
                                        </div>
                                        <input 
                                            type="email" name="email" value={formData.email} onChange={handleChange} disabled
                                            className="w-full bg-crm-surface-raised border border-crm-border text-crm-fg-muted rounded-lg pl-9 pr-3 py-2 text-sm cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-[10px] text-crm-fg-subtle mt-1">El correo electrónico no puede ser modificado.</p>
                                </div>
                            </div>
                            <div className="flex justify-end mt-2">
                                <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-crm-red hover:bg-crm-red-hover text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Cambio de Contraseña */}
                    <div className="bg-crm-surface border border-crm-border rounded-xl shadow-sm overflow-hidden">
                        <div className="border-b border-crm-border p-4 bg-crm-topbar/50 flex items-center gap-2">
                            <FileKey size={18} className="text-crm-fg-muted" />
                            <h3 className="font-bold text-crm-fg">Cambiar Contraseña</h3>
                        </div>
                        <form onSubmit={handlePasswordChange} className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1.5">Contraseña Actual</label>
                                <input 
                                    type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange}
                                    className="w-full md:w-1/2 bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:border-crm-red focus:ring-1 focus:ring-crm-red focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1.5">Nueva Contraseña</label>
                                    <input 
                                        type="password" name="newPassword" value={formData.newPassword} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:border-crm-red focus:ring-1 focus:ring-crm-red focus:outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1.5">Confirmar Contraseña</label>
                                    <input 
                                        type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                                        className="w-full bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 text-sm focus:border-crm-red focus:ring-1 focus:ring-crm-red focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end mt-2">
                                <button type="submit" disabled={isSaving || !formData.newPassword || formData.newPassword.length < 6} className="flex items-center gap-2 bg-crm-surface-raised hover:bg-crm-border border border-crm-border text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Actualizar Contraseña'}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
