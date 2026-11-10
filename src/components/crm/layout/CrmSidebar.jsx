"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Wrench } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { getCrmRoleLabel, isNavigationActive } from '../../../utils/crmNavigation';

const menuGroups = [
    {
        name: 'PRINCIPAL',
        items: [
            { name: 'Dashboard', path: '/admin', icon: '📊' },
            { name: 'Calendario', path: '/admin/agenda', icon: '📅' },
            { name: 'Alertas', path: '/admin/alertas', icon: '🔔' },
            { name: 'Reportes', path: '/admin/reportes', icon: '📈' },
            { name: 'Mi Espacio', path: '/admin/mi-espacio', icon: '📂' },
        ]
    },
    {
        name: 'COMERCIAL',
        items: [
            { name: 'Stock', path: '/admin/stock', icon: '🚗' },
            { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
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
            { name: 'Reclamos', path: '/admin/reclamos', icon: '⚠️', prefetch: false },
            { name: 'Gestoría', path: '/admin/gestoria', icon: '🔑', prefetch: false },
            { name: 'Consignaciones', path: '/admin/consignaciones', icon: '🤝', prefetch: false },
            { name: 'Infracciones', path: '/admin/infracciones', icon: '🏛️', prefetch: false },
            { name: 'Taller', path: '/admin/taller', icon: <Wrench className="h-5 w-5" />, prefetch: false },
            { name: 'Teléfonos útiles', path: '/admin/telefonos', icon: '☎️', prefetch: false },
        ]
    },
    {
        name: 'FINANZAS',
        items: [
            { name: 'Finanzas', path: '/admin/finanzas', icon: '💰', prefetch: false },
            { name: 'Tesorería', path: '/admin/tesoreria', icon: '🏦', prefetch: false },
            { name: 'Liquidaciones', path: '/admin/liquidaciones', icon: '🧾', prefetch: false },
            { name: 'Mis comisiones', path: '/admin/mis-comisiones', icon: '💸', prefetch: false },
        ]
    },
    {
        name: 'DIRECCIÓN ESTRATÉGICA',
        isStrategic: true,
        items: [
            {
                name: 'Tesorería Estratégica',
                path: '/admin/tesoreria-estrategica',
                icon: '🔒',
                badge: 'PIN',
                prefetch: false,
                isPrivate: true
            }
        ]
    },
    {
        name: 'COLABORACIÓN',
        items: [
            { name: 'Mensajes', path: '/admin/mensajes', icon: '📩', prefetch: false },
            { name: 'WhatsApp', path: '/admin/whatsapp', icon: '📱', prefetch: false },
            { name: 'Correos', path: '/admin/correos', icon: '📧', prefetch: false },
            { name: 'NPS', path: '/admin/nps', icon: '⭐', prefetch: false },
        ]
    },
    {
        name: 'ADMINISTRACIÓN',
        items: [
            { name: 'Autorizaciones', path: '/admin/autorizaciones', icon: '🛡️', prefetch: false },
            { name: 'Clientes Dormidos', path: '/admin/dormidos', icon: '💤', prefetch: false },
            { name: 'Sugerencias', path: '/admin/sugerencias', icon: '💡', prefetch: false },
            { name: 'Papelera', path: '/admin/papelera', icon: '🗑️', prefetch: false },
            { name: 'Configuración', path: '/admin/configuracion', icon: '⚙️', prefetch: false },
            { name: 'Oportunidades', path: '/admin/oportunidades', icon: '🤝', prefetch: false },
        ]
    }
];

export default function CrmSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { theme } = useTheme();
    const [featureState, setFeatureState] = useState({ token: null, flags: {} });
    const { user, logout, token } = useAuth();
    const flags = featureState.token === token ? featureState.flags : {};
    const drawerRef = useRef(null);
    const closeButtonRef = useRef(null);

    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        let active = true;
        fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (active && data?.ok && data.settings?.featureFlags) {
                setFeatureState({ token, flags: data.settings.featureFlags });
            }
        })
        .catch(err => { if (err.name !== 'AbortError') console.error("Error fetching settings in sidebar:", err); });
        return () => { active = false; controller.abort(); };
    }, [token]);

    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement;
        closeButtonRef.current?.focus();
        const trapFocus = event => {
            if (event.key !== 'Tab' || !drawerRef.current) return;
            const controls = [...drawerRef.current.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
            const first = controls[0];
            const last = controls.at(-1);
            if (!first) { event.preventDefault(); return; }
            if (!drawerRef.current.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', trapFocus);
        return () => {
            document.removeEventListener('keydown', trapFocus);
            if (previousFocus?.isConnected && previousFocus.getClientRects().length > 0) previousFocus.focus();
            else document.getElementById('main-content')?.focus();
        };
    }, [isOpen]);

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
        if (itemName === 'Tesorería Estratégica') return user?.role === 'owner' || user?.role === 'admin';
        if (itemName === 'Liquidaciones') return hasPermission(user, PERMISSIONS.LIQUIDACIONES_READ);
        if (itemName === 'Mis comisiones') return hasPermission(user, PERMISSIONS.COMISIONES_READ);
        if (itemName === 'Mensajes') return hasPermission(user, PERMISSIONS.MENSAJES_READ);
        if (itemName === 'Sugerencias') return true; // Todos pueden ver
        if (itemName === 'WhatsApp') return hasPermission(user, PERMISSIONS.WHATSAPP_READ) && (flags?.enableWhatsapp !== false);
        if (itemName === 'Correos') return hasPermission(user, PERMISSIONS.CORREOS_READ);
        if (itemName === 'NPS') return hasPermission(user, PERMISSIONS.NPS_READ) && (flags?.enableNps !== false);
        if (itemName === 'Reportes') return hasPermission(user, PERMISSIONS.REPORTES_READ);
        if (itemName === 'Mis ventas') return true;
        if (itemName === 'Clientes Dormidos') return hasPermission(user, PERMISSIONS.DORMANT_READ);
        if (itemName === 'Pedidos') return true;
        if (itemName === 'Expedientes') return true;
        if (itemName === 'Reclamos') return hasPermission(user, PERMISSIONS.RECLAMOS_READ);
        if (itemName === 'Taller') return hasPermission(user, PERMISSIONS.TALLER_READ);
        if (itemName === 'Gestoría') return true;
        if (itemName === 'Consignaciones') return true;
        if (itemName === 'Infracciones') return true;
        if (itemName === 'Teléfonos útiles') return true;
        if (itemName === 'Auditoría') return hasPermission(user, PERMISSIONS.AUDITORIA_READ);
        if (itemName === 'Papelera') return hasPermission(user, PERMISSIONS.TRASH_READ) && (flags?.enableTrash !== false);
        if (itemName === 'Autorizaciones') return hasPermission(user, PERMISSIONS.APPROVALS_READ) && (flags?.enableApprovals !== false);
        if (itemName === 'Sistema') return hasPermission(user, PERMISSIONS.SYSTEMHEALTH_READ);
        if (itemName === 'Exportaciones') return hasPermission(user, PERMISSIONS.EXPORTS_READ) || hasPermission(user, PERMISSIONS.EXPORTS_AUDIT);
        if (itemName === 'Equipo') return hasPermission(user, PERMISSIONS.EQUIPO_READ);
        if (itemName === 'Productividad') return hasPermission(user, PERMISSIONS.PRODUCTIVIDAD_READ);
        if (itemName === 'Metas') return hasPermission(user, PERMISSIONS.METAS_READ);
        if (itemName === 'Ayuda') return hasPermission(user, PERMISSIONS.HELP_READ);
        if (itemName === 'Oportunidades') return hasPermission(user, PERMISSIONS.STOCK_READ) || user?.role === 'owner';
        return true;
    };

    const renderContent = ({ showCloseButton = false, isDesktopCollapsed = false } = {}) => (
        <>
            <div className={`flex h-[calc(3.5rem+var(--safe-top,0px))] shrink-0 items-center border-b border-crm-border px-3 pt-[var(--safe-top,0px)] md:h-14 md:pt-0 ${isDesktopCollapsed ? 'justify-center' : 'gap-2'}`}>
                {!isDesktopCollapsed ? (
                    <div className="flex items-center gap-2 py-1 select-none">
                        <img
                            src="/logo-header-final-user.png"
                            alt="AutoSporting"
                            className={`h-8 w-auto object-contain ${theme === 'light' ? 'invert' : ''}`}
                        />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-crm-red bg-crm-red/10 border border-crm-red/20 px-1.5 py-0.5 rounded">
                            CRM
                        </span>
                    </div>
                ) : (
                    <button type="button" aria-label="Expandir menú" aria-expanded={false} aria-controls="crm-navigation-desktop" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-sm font-bold text-crm-fg shadow-crm-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red" onClick={() => setIsCollapsed(false)}>
                        AS
                    </button>
                )}
                
                {!isDesktopCollapsed && (
                    <button 
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="ml-auto hidden md:flex h-7 w-7 items-center justify-center rounded border border-crm-border bg-crm-surface text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        title="Colapsar menú"
                        aria-label="Colapsar menú"
                        aria-expanded={true}
                        aria-controls="crm-navigation-desktop"
                    >
                        <span aria-hidden="true" className="text-xs">◀</span>
                    </button>
                )}

                {showCloseButton && (
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={handleClose}
                        onMouseDown={handleClose}
                        onTouchEnd={handleClose}
                        className="m-0 flex h-11 w-11 shrink-0 appearance-none items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg transition-colors active:bg-crm-surface-raised"
                        aria-label="Cerrar menú"
                    >
                        <X size={22} />
                    </button>
                )}
            </div>

            <nav aria-label="Navegación principal" className={`flex min-h-0 flex-1 touch-pan-y flex-col gap-6 overflow-y-auto overscroll-y-contain py-4 pb-[calc(1rem+var(--safe-bottom,0px))] [-webkit-overflow-scrolling:touch] custom-scrollbar ${isDesktopCollapsed ? 'px-2' : 'pl-2 pr-6'}`}>
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
                                const isActive = isNavigationActive(pathname, item.path);
                                const isPrivate = item.isPrivate;
                                const baseItemClasses = "relative group flex min-h-9 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red";
                                const activeClasses = isPrivate
                                    ? "bg-purple-500/15 text-purple-300 border-l-2 border-purple-500 pl-[10px]"
                                    : "bg-crm-red/10 text-crm-red border-l-2 border-crm-red pl-[10px]";
                                const inactiveClasses = isPrivate
                                    ? "text-purple-300/80 hover:bg-purple-500/10 hover:text-purple-200 border-l-2 border-transparent"
                                    : "text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg border-l-2 border-transparent";

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.path}
                                        aria-label={item.name}
                                        aria-current={isActive ? 'page' : undefined}
                                        prefetch={item.prefetch === false ? false : undefined}
                                        onClick={closeMenu}
                                        title={isDesktopCollapsed ? item.name : undefined}
                                        style={{ textDecoration: 'none' }}
                                        className={`${baseItemClasses} ${isActive ? activeClasses : inactiveClasses} ${isDesktopCollapsed ? 'justify-center px-0' : ''}`}
                                    >
                                        <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
                                            {item.icon}
                                        </span>
                                        {!isDesktopCollapsed && (
                                            <div className="flex flex-1 items-center justify-between min-w-0">
                                                <span className="truncate">{item.name}</span>
                                                {item.badge && (
                                                    <span className="ml-2 rounded border border-purple-500/30 bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-purple-300">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        {isDesktopCollapsed && (
                                            <div aria-hidden="true" className="pointer-events-none absolute left-[3.2rem] z-[100] hidden animate-in fade-in zoom-in-95 whitespace-nowrap rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-crm-fg shadow-xl group-hover:block">
                                                {item.name}
                                            </div>
                                        )}
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
                        <span className="text-[10px] font-bold uppercase text-crm-red">{getCrmRoleLabel(user?.role)}</span>
                    </div>
                )}
                <button
                    type="button"
                    aria-label="Cerrar sesión"
                    onClick={() => logout()}
                    title={isDesktopCollapsed ? "Cerrar sesión" : undefined}
                    className={`flex items-center gap-2 text-xs font-medium text-crm-fg-muted transition-colors hover:text-crm-fg ${isDesktopCollapsed ? 'justify-center w-full' : ''}`}
                >
                    <span aria-hidden="true" className="text-base">←</span> {!isDesktopCollapsed && "Cerrar sesión"}
                </button>
                <button
                    type="button"
                    aria-label="Forzar recarga"
                    onClick={() => window.location.reload(true)}
                    title={isDesktopCollapsed ? "Forzar recarga" : undefined}
                    className={`flex items-center gap-2 text-xs font-medium text-crm-fg-muted transition-colors hover:text-crm-fg mt-2 ${isDesktopCollapsed ? 'justify-center w-full' : ''}`}
                >
                    <span aria-hidden="true" className="text-base">⟳</span> {!isDesktopCollapsed && "Forzar recarga"}
                </button>

            </div>
        </>
    );

    return (
        <>
            <aside id="crm-navigation-desktop" aria-label="Menú principal" className={`sticky top-0 hidden h-[100dvh] min-h-0 shrink-0 flex-col border-r border-crm-border bg-crm-sidebar md:flex custom-scrollbar transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
                {renderContent({ isDesktopCollapsed: isCollapsed })}
            </aside>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex bg-black/75 backdrop-blur-sm md:hidden">
                    <aside ref={drawerRef} id="crm-navigation-drawer" role="dialog" aria-modal="true" aria-label="Menú principal" className="flex h-[100dvh] min-h-0 w-[min(23rem,92vw)] max-w-full flex-col border-r border-crm-border bg-crm-sidebar shadow-2xl custom-scrollbar">
                        {renderContent({ showCloseButton: true })}
                    </aside>
                    <button
                        type="button"
                        aria-label="Cerrar menú"
                        className="m-0 min-w-0 flex-1 appearance-none border-0 bg-transparent p-0"
                        onClick={handleClose}
                        onTouchEnd={handleClose}
                    />
                </div>
            )}
        </>
    );
}
