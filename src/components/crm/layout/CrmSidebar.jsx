"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';

const menuGroups = [
    {
        name: 'PRINCIPAL',
        items: [
            { name: 'Dashboard', path: '/admin', icon: '📊' },
            { name: 'Calendario', path: '/admin/agenda', icon: '📅' },
            { name: 'Mis pendientes', path: '/admin/mis-pendientes', icon: '🔔' },
            { name: 'Reportes', path: '/admin/reportes', icon: '📈' },
            { name: 'Mi Espacio', path: '/admin/mi-espacio', icon: '📂' },
        ]
    },
    {
        name: 'COMERCIAL',
        items: [
            { name: 'Stock', path: '/admin/stock', icon: '🚗' },
            { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
            { name: 'Leads', path: '/admin/leads', icon: '📝' },
            { name: 'Cotizaciones', path: '/admin/cotizaciones', icon: '📄' },
            { name: 'Ventas', path: '/admin/ventas', icon: '💼' },
            { name: 'Mis ventas', path: '/admin/mis-ventas', icon: '🏆' },
        ]
    },
    {
        name: 'OPERACIÓN',
        items: [
            { name: 'Pedidos', path: '/admin/pedidos', icon: '🔍', prefetch: false },
            { name: 'Postventa', path: '/admin/postventa', icon: '📞', prefetch: false },
            { name: 'Expedientes', path: '/admin/expedientes', icon: '📁', prefetch: false },
            { name: 'Gestoría', path: '/admin/gestoria', icon: '🔑', prefetch: false },
            { name: 'Consignaciones', path: '/admin/consignaciones', icon: '🤝', prefetch: false },
            { name: 'Infracciones', path: '/admin/infracciones', icon: '🏛️', prefetch: false },
            { name: 'Teléfonos útiles', path: '/admin/telefonos', icon: '☎️', prefetch: false },
        ]
    },
    {
        name: 'FINANZAS',
        items: [
            { name: 'Finanzas', path: '/admin/finanzas', icon: '💰', prefetch: false },
            { name: 'Tesorería', path: '/admin/tesoreria', icon: '🏦', prefetch: false },
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

menuGroups[0].items[2] = {
    ...menuGroups[0].items[2],
    name: 'Alertas',
    path: '/admin/alertas'
};

export default function CrmSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved) setIsCollapsed(saved === 'true');
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebarCollapsed', next.toString());
            return next;
        });
    };

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
        if (itemName === 'Tesorería') return hasPermission(user, PERMISSIONS.CAJA_READ) || hasPermission(user, PERMISSIONS.FINANZAS_READ);
        if (itemName === 'Reportes') return hasPermission(user, PERMISSIONS.REPORTES_READ);
        if (itemName === 'Mis ventas') return true;
        if (itemName === 'Pedidos') return true;
        if (itemName === 'Expedientes') return true;
        if (itemName === 'Gestoría') return true;
        if (itemName === 'Consignaciones') return true;
        if (itemName === 'Infracciones') return true;
        if (itemName === 'Teléfonos útiles') return true;
        if (itemName === 'Sistema') return hasPermission(user, PERMISSIONS.SYSTEMHEALTH_READ);
        if (itemName === 'Exportaciones') return hasPermission(user, PERMISSIONS.EXPORTS_READ) || hasPermission(user, PERMISSIONS.EXPORTS_AUDIT);
        if (itemName === 'Equipo') return hasPermission(user, PERMISSIONS.EQUIPO_READ);
        if (itemName === 'Productividad') return hasPermission(user, PERMISSIONS.PRODUCTIVIDAD_READ);
        if (itemName === 'Metas') return hasPermission(user, PERMISSIONS.METAS_READ);
        if (itemName === 'Ayuda') return hasPermission(user, PERMISSIONS.HELP_READ);
        return true;
    };

    const renderContent = ({ showCloseButton = false, isDesktopCollapsed = false } = {}) => (
        <>
            <div className={`flex h-[calc(3.5rem+var(--safe-top,0px))] shrink-0 items-center border-b border-crm-border px-4 pt-[var(--safe-top,0px)] md:h-14 md:pt-0 ${isDesktopCollapsed ? 'justify-center' : 'gap-3'}`}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-sm font-bold text-white shadow-crm-red">
                    AS
                </div>
                {!isDesktopCollapsed && (
                    <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-bold leading-tight tracking-tight text-crm-fg">AutoSporting</span>
                        <span className="text-[10px] font-semibold uppercase text-crm-fg-muted">v2 CRM</span>
                    </div>
                )}
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

            <nav className="flex min-h-0 flex-1 touch-pan-y flex-col gap-6 overflow-y-auto overscroll-y-contain px-3 py-4 pb-[calc(1rem+var(--safe-bottom,0px))] [-webkit-overflow-scrolling:touch] custom-scrollbar">
                {menuGroups.map((group) => {
                    const visibleItems = group.items.filter(item => hasItemPermission(item.name));
                    if (visibleItems.length === 0) return null;

                    return (
                        <div key={group.name} className="flex flex-col gap-1">
                            {!isDesktopCollapsed ? (
                                <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                    {group.name}
                                </h3>
                            ) : (
                                <div className="mb-2 h-4" />
                            )}
                            {visibleItems.map((item) => {
                                const isSalesArea = item.path === '/admin/ventas' && (pathname.startsWith('/admin/ventas') || pathname.startsWith('/admin/reservas'));
                                const isActive = item.path === '/admin' ? pathname === '/admin' : isSalesArea || pathname.startsWith(item.path);
                                const baseItemClasses = "group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
                                const activeClasses = "bg-crm-red/10 text-crm-red border-l-2 border-crm-red pl-[10px]";
                                const inactiveClasses = "text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg border-l-2 border-transparent";

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.path}
                                        prefetch={item.prefetch === false ? false : undefined}
                                        onClick={closeMenu}
                                        title={isDesktopCollapsed ? item.name : undefined}
                                        style={{ textDecoration: 'none' }}
                                        className={`${baseItemClasses} ${isActive ? activeClasses : inactiveClasses} ${isDesktopCollapsed ? 'justify-center px-0' : ''}`}
                                    >
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none" role="img" aria-label={item.name}>
                                            {item.icon}
                                        </span>
                                        {!isDesktopCollapsed && <span className="truncate">{item.name}</span>}
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            <div className={`flex shrink-0 flex-col gap-1 border-t border-crm-border px-4 py-4 mt-auto ${isDesktopCollapsed ? 'items-center' : ''}`}>
                {!isDesktopCollapsed && (
                    <div className="flex flex-col mb-2">
                        <span className="text-sm font-bold text-crm-fg">{user?.displayName || user?.email?.split('@')[0] || 'Usuario'}</span>
                        <span className="text-[10px] font-bold uppercase text-crm-red">ADMINISTRADOR</span>
                    </div>
                )}
                <button
                    onClick={() => logout()}
                    title={isDesktopCollapsed ? "Cerrar sesión" : undefined}
                    className={`flex items-center gap-2 text-xs font-medium text-crm-fg-muted transition-colors hover:text-crm-fg ${isDesktopCollapsed ? 'justify-center w-full' : ''}`}
                >
                    <span className="text-base">←</span> {!isDesktopCollapsed && "Cerrar sesión"}
                </button>
                <button
                    onClick={() => window.location.reload(true)}
                    title={isDesktopCollapsed ? "Forzar recarga" : undefined}
                    className={`flex items-center gap-2 text-xs font-medium text-crm-fg-muted transition-colors hover:text-crm-fg mt-2 ${isDesktopCollapsed ? 'justify-center w-full' : ''}`}
                >
                    <span className="text-base">⟳</span> {!isDesktopCollapsed && "Forzar recarga"}
                </button>
                {!showCloseButton && (
                    <button
                        onClick={toggleCollapse}
                        title={isDesktopCollapsed ? "Expandir menú" : "Colapsar menú"}
                        className={`flex items-center ${isDesktopCollapsed ? 'justify-center' : 'justify-between'} mt-4 rounded-lg p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg transition-colors`}
                    >
                        {!isDesktopCollapsed && <span className="text-xs font-medium">Colapsar menú</span>}
                        {isDesktopCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                )}
            </div>
        </>
    );

    return (
        <>
            <aside className={`sticky top-0 hidden h-[100dvh] min-h-0 shrink-0 flex-col border-r border-crm-border bg-crm-sidebar lg:flex custom-scrollbar transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
                {renderContent({ isDesktopCollapsed: isCollapsed })}
            </aside>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex bg-black/75 backdrop-blur-sm lg:hidden">
                    <aside className="flex h-[100dvh] min-h-0 w-[min(23rem,92vw)] max-w-full flex-col border-r border-crm-border bg-crm-sidebar shadow-2xl custom-scrollbar">
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
