'use client';

import React from 'react';
import Link from 'next/link';
import { Users, MessageSquare, ShieldAlert, Settings } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';

export default function ConfiguracionPage() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
        );
    }

    const role = user?.role;
    const canViewUsers = ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.USUARIOS_READ) || hasPermission(user, PERMISSIONS.USUARIOS_WRITE);
    const canViewTemplates = ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.MESSAGETEMPLATES_READ) || hasPermission(user, PERMISSIONS.MESSAGETEMPLATES_WRITE);
    const canViewSettings = ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.SETTINGS_READ) || hasPermission(user, PERMISSIONS.SETTINGS_WRITE);

    if (!canViewUsers && !canViewTemplates && !canViewSettings) {
        return (
            <div className="max-w-7xl mx-auto p-4">
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 text-center">
                    <ShieldAlert size={48} />
                    <div>
                        <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
                        <p>No tenés permisos para acceder a configuración.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white tracking-tight">Configuración</h1>
                <p className="text-neutral-400 mt-1">Ajustes y opciones de configuración del CRM AutoSporting.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {canViewUsers && (
                    <Link 
                        href="/admin/configuracion/usuarios"
                        className="group flex items-start gap-4 p-6 rounded-2xl border border-white/10 bg-[#111217] hover:border-white/30 hover:bg-white/[0.02] transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#E63027] group-hover:text-white transition-colors border border-white/10">
                            <Users size={24} className="text-neutral-400 group-hover:text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-1">Usuarios y Permisos</h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                Gestionar usuarios del sistema, roles, permisos y accesos al CRM.
                            </p>
                        </div>
                    </Link>
                )}

                {canViewTemplates && (
                    <Link 
                        href="/admin/configuracion/plantillas"
                        className="group flex items-start gap-4 p-6 rounded-2xl border border-white/10 bg-[#111217] hover:border-white/30 hover:bg-white/[0.02] transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#E63027] group-hover:text-white transition-colors border border-white/10">
                            <MessageSquare size={24} className="text-neutral-400 group-hover:text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-1">Plantillas Comerciales</h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                Administrar los mensajes predefinidos para agilizar la comunicación de ventas y postventa.
                            </p>
                        </div>
                    </Link>
                )}

                {canViewSettings && (
                    <Link 
                        href="/admin/configuracion/general"
                        className="group flex items-start gap-4 p-6 rounded-2xl border border-white/10 bg-[#111217] hover:border-white/30 hover:bg-white/[0.02] transition-all"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-[#E63027] group-hover:text-white transition-colors border border-white/10">
                            <Settings size={24} className="text-neutral-400 group-hover:text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-1">Configuración General</h3>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                                Parámetros operativos, reglas de negocio y opciones globales del CRM.
                            </p>
                        </div>
                    </Link>
                )}

            </div>
        </div>
    );
}
