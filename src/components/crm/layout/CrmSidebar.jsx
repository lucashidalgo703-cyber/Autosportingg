"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';

const menuGroups = [
    {
        name: 'PRINCIPAL',
        items: [
            { name: 'Dashboard', path: '/admin', icon: '📊' },
            { name: 'Agenda', path: '/admin/agenda', icon: '📅' },
            { name: 'Mis pendientes', path: '/admin/mis-pendientes', icon: '🔔' },
            { name: 'Reportes', path: '/admin/reportes', icon: '📈' },
            { name: 'Mi Espacio', path: '/admin/mis-pendientes', icon: '📂' },
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
            { name: 'Metas', path: '/admin/metas', icon: '⭐', prefetch: false },
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

    const closeMenu = () => {
        if (typeof onClose === 'function') onClose();
    };

    const handleClose = (event) => {
        event?.stopPropagation?.();
        closeMenu();
    };

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

    const renderContent = ({ showCloseButton = false } = {}) => (
        <>
            <div className="flex h-[calc(3.5rem+var(--safe-top,0px))] shrink-0 items-center gap-3 border-b border-crm-border px-4 pt-[var(--safe-top,0px)] md:h-14 md:pt-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-sm font-bold text-white shadow-crm-red">
                    AS
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold leading-tight tracking-tight text-crm-fg">AutoSporting</span>
                    <span className="text-[10px] font-semibold uppercase text-crm-fg-muted">v2 CRM</span>
                </div>
                {showCloseButton && (
                    <button
                        type="button"
                        onClick={handleClose}
                        onMouseDown={handleClose}
                        onTouchEnd={handleClose}
                        className="m-0 flex h-11 w-11 shrink-0 appearance-none items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg transition-colors active:bg-crm-surface-raised"
                        aria-label="Cerrar menu"
                    >
                        <X size={22} />
                    </button>
                )}
            </div>

            <nav className="flex flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-3 py-4 pb-[calc(1rem+var(--safe-bottom,0px))] custom-scrollbar">
                {menuGroups.map((group) => {
                    const visibleItems = group.items.filter(item => hasItemPermission(item.name));
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={group.name} className="flex flex-col gap-1">
                            <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                {group.name}
                            </h3>
                            {visibleItems.map((item) => {
                                const isActive = item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
                                const baseItemClasses = "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
                                const activeClasses = "bg-crm-red/10 text-crm-red border-l-2 border-crm-red pl-[10px]";
                                const inactiveClasses = "text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg border-l-2 border-transparent";

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.path}
                                        prefetch={item.prefetch === false ? false : undefined}
                                        onClick={closeMenu}
                                        onTouchEnd={closeMenu}
                                        style={{ textDecoration: 'none' }}
                                        className={`${baseItemClasses} ${isActive ? activeClasses : inactiveClasses}`}
                                    >
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none" role="img" aria-label={item.name}>
                                            {item.icon}
                                        </span>
                                        <span className="truncate">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>
        </>
    );

    return (
        <>
            <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-crm-border bg-crm-sidebar lg:flex custom-scrollbar">
                {renderContent()}
            </aside>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex bg-black/75 backdrop-blur-sm lg:hidden">
                    <aside className="flex h-[100dvh] w-[min(23rem,92vw)] max-w-full flex-col border-r border-crm-border bg-crm-sidebar shadow-2xl custom-scrollbar">
                        {renderContent({ showCloseButton: true })}
                    </aside>
                    <button
                        type="button"
                        aria-label="Cerrar menu"
                        className="m-0 min-w-0 flex-1 appearance-none border-0 bg-transparent p-0"
                        onClick={handleClose}
                        onTouchEnd={handleClose}
                    />
                </div>
            )}
        </>
    );
}
