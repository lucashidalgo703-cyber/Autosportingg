"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS, ROLES } from '../../../utils/adminPermissions';

const menuGroups = [
    {
        name: 'PRINCIPAL',
        items: [
            { name: 'Dashboard', path: '/admin', icon: '📊' },
            { name: 'Agenda', path: '/admin/agenda', icon: '📅' },
            { name: 'Mis pendientes', path: '/admin/mis-pendientes', icon: '🔔' },
            { name: 'Reportes', path: '/admin/reportes', icon: '📈' },
            { name: 'Mi Espacio', path: '/admin/mis-pendientes', icon: '📂' }, // Mapping Mi Espacio to mis-pendientes as fallback
        ]
    },
    {
        name: 'COMERCIAL',
        items: [
            { name: 'Stock', path: '/admin/stock', icon: '🚗' },
            { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
            { name: 'Leads', path: '/admin/leads', icon: '📝' },
            { name: 'Ventas', path: '/admin/ventas', icon: '💼' },
            { name: 'Reservas', path: '/admin/reservas', icon: '🔍' },
        ]
    },
    {
        name: 'OPERACIÓN',
        items: [
            { name: 'Postventa', path: '/admin/postventa', icon: '📞', prefetch: false },
            { name: 'Documentación', path: '/admin/documentacion', icon: '📁', prefetch: false },
            { name: 'Auditoría', path: '/admin/auditoria', icon: '📋', prefetch: false },
            { name: 'Calidad de Datos', path: '/admin/calidad-datos', icon: '🔑', prefetch: false },
        ]
    },
    {
        name: 'FINANZAS',
        items: [
            { name: 'Finanzas', path: '/admin/finanzas', icon: '💰', prefetch: false },
            { name: 'Cuotas', path: '/admin/cuotas', icon: '💸' },
            { name: 'Cobranzas', path: '/admin/cobranzas', icon: '💵' },
        ]
    },
    {
        name: 'COLABORACIÓN',
        items: [
            { name: 'Notificaciones', path: '/admin/notificaciones', icon: '💬', prefetch: false },
            { name: 'Equipo', path: '/admin/equipo', icon: '👥', prefetch: false },
            { name: 'Productividad', path: '/admin/productividad', icon: '📈', prefetch: false },
            { name: 'Metas', path: '/admin/metas', icon: '⭐', prefetch: false }, // Unique Metas location
        ]
    },
    {
        name: 'ADMINISTRACIÓN',
        items: [
            { name: 'Configuración', path: '/admin/configuracion', icon: '⚙️', prefetch: false },
            { name: 'Usuarios', path: '/admin/configuracion/usuarios', icon: '👥', prefetch: false },
            { name: 'Plantillas', path: '/admin/configuracion/plantillas', icon: '📝', prefetch: false },
            { name: 'General', path: '/admin/configuracion/general', icon: '🏢', prefetch: false },
            { name: 'Exportaciones', path: '/admin/exportaciones', icon: '📤', prefetch: false },
            { name: 'Sistema', path: '/admin/sistema', icon: '🛡️', prefetch: false },
            { name: 'Ayuda', path: '/admin/ayuda', icon: '💡', prefetch: false },
        ]
    }
];

export default function CrmSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { user } = useAuth();

    const hasItemPermission = (itemName) => {
        if (itemName === 'Usuarios') return hasPermission(user, PERMISSIONS.USUARIOS_READ);
        if (itemName === 'Configuración') return hasPermission(user, PERMISSIONS.USUARIOS_READ) || hasPermission(user, PERMISSIONS.MESSAGETEMPLATES_READ);
        if (itemName === 'Finanzas') return hasPermission(user, PERMISSIONS.FINANZAS_READ);
        if (itemName === 'Cuotas') return hasPermission(user, PERMISSIONS.CUOTAS_READ);
        if (itemName === 'Cobranzas') return hasPermission(user, PERMISSIONS.COBRANZAS_READ);
        if (itemName === 'Reportes') return hasPermission(user, PERMISSIONS.REPORTES_READ);
        if (itemName === 'Auditoría') return hasPermission(user, PERMISSIONS.AUDITORIA_READ);
        if (itemName === 'Calidad de Datos') return hasPermission(user, PERMISSIONS.DATAQUALITY_READ);
        if (itemName === 'Sistema') return hasPermission(user, PERMISSIONS.SYSTEMHEALTH_READ);
        if (itemName === 'Exportaciones') return hasPermission(user, PERMISSIONS.EXPORTS_READ) || hasPermission(user, PERMISSIONS.EXPORTS_AUDIT);
        if (itemName === 'Equipo') return hasPermission(user, PERMISSIONS.EQUIPO_READ);
        if (itemName === 'Productividad') return hasPermission(user, PERMISSIONS.PRODUCTIVIDAD_READ);
        if (itemName === 'Metas') return hasPermission(user, PERMISSIONS.METAS_READ);
        if (itemName === 'Ayuda') return hasPermission(user, PERMISSIONS.HELP_READ);
        return true; 
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm lg:hidden" onClick={onClose} />
            )}
            
            <aside className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(23rem,92vw)] max-w-full flex-col border-r border-crm-border bg-crm-sidebar transition-transform duration-300 lg:sticky lg:w-64 custom-scrollbar ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex h-[calc(3.5rem+var(--safe-top,0px))] shrink-0 items-center gap-3 border-b border-crm-border px-4 pt-[var(--safe-top,0px)] md:h-14 md:pt-0">
                    <div className="w-9 h-9 rounded-lg bg-crm-surface border border-crm-border flex items-center justify-center shadow-crm-red text-white font-bold text-sm shrink-0">
                        AS
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-crm-fg font-bold text-sm leading-tight tracking-tight">AutoSporting</span>
                        <span className="text-crm-fg-muted text-[10px] uppercase font-semibold">v2 CRM</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        onPointerDown={(event) => {
                            event.preventDefault();
                            onClose();
                        }}
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg lg:hidden"
                        aria-label="Cerrar menu"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <nav className="flex flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(1rem+var(--safe-bottom,0px))] custom-scrollbar">
                    {menuGroups.map((group) => {
                        const visibleItems = group.items.filter(item => hasItemPermission(item.name));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.name} className="flex flex-col gap-1">
                                <h3 className="px-3 text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">
                                    {group.name}
                                </h3>
                                {visibleItems.map((item) => {
                                    const isActive = item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
                                    
                                    const baseItemClasses = "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
                                    const activeClasses = "bg-crm-red/10 text-crm-red border-l-2 border-crm-red pl-[10px]";
                                    const inactiveClasses = "text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg border-l-2 border-transparent";
                                    
                                    return (
                                        <Link 
                                            key={item.name} 
                                            href={item.path}
                                            prefetch={item.prefetch === false ? false : undefined}
                                            onClick={() => onClose && onClose()}
                                            style={{ textDecoration: 'none' }}
                                            className={`${baseItemClasses} ${isActive ? activeClasses : inactiveClasses}`}
                                        >
                                            <span 
                                                className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none"
                                                role="img"
                                                aria-label={item.name}
                                            >
                                                {item.icon}
                                            </span>
                                            <span>{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
