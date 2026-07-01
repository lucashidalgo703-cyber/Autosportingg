"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Users, FileText, Bot, ToggleLeft, DatabaseBackup, ShieldCheck, Activity, CalendarClock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';

export default function SettingsTabs() {
    const pathname = usePathname();
    const { user } = useAuth();
    const role = user?.role;

    const tabs = [
        { 
            name: 'Usuarios', 
            path: '/admin/configuracion/usuarios', 
            icon: Users,
            visible: ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.USUARIOS_READ)
        },
        { 
            name: 'Empresa', 
            path: '/admin/configuracion/general', 
            icon: Building2,
            visible: ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.SETTINGS_READ)
        },
        { 
            name: 'Arturito', 
            path: '/admin/configuracion/asistente', 
            icon: Bot,
            visible: ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.SETTINGS_READ)
        },
        { 
            name: 'Resumen diario', 
            path: '/admin/configuracion/resumen-diario', 
            icon: CalendarClock,
            visible: ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.SETTINGS_READ)
        },
        { 
            name: 'Flags de migración', 
            path: '/admin/configuracion/funciones', 
            icon: ToggleLeft,
            visible: ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.SETTINGS_READ)
        },
        { 
            name: 'Backups', 
            path: '/admin/configuracion/backups', 
            icon: DatabaseBackup,
            visible: role === 'owner' // Only owner can export full DB
        },
        { 
            name: '2FA admin', 
            path: '/admin/configuracion/2fa', 
            icon: ShieldCheck,
            visible: true // All users should be able to setup 2FA
        },
        { 
            name: 'Sistema', 
            path: '/admin/sistema', 
            icon: Activity,
            visible: ['owner', 'admin'].includes(role) || hasPermission(user, PERMISSIONS.SYSTEMHEALTH_READ)
        }
    ];

    return (
        <div className="w-full border-b border-crm-border mb-6 overflow-x-auto hide-scrollbar">
            <div className="flex gap-2 min-w-max pb-2 px-1">
                {tabs.map((tab) => {
                    if (!tab.visible) return null;
                    const isActive = pathname === tab.path;
                    const Icon = tab.icon;
                    return (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                isActive 
                                    ? 'bg-crm-red-gradient text-white shadow-crm-shadow-red shadow-sm' 
                                    : 'text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface border border-transparent hover:border-crm-border'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.name}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
