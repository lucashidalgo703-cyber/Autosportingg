"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CarFront, Users, UserPlus, Receipt, CalendarClock, Wallet, Landmark, FileText, BarChart3, Settings, Target, Star, UserCog, ClipboardList, Flag, ShieldAlert, Activity, Download, HelpCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS, ROLES } from '../../../utils/adminPermissions';

const menuGroups = [
    {
        name: 'PRINCIPAL',
        items: [
            { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
            { name: 'Mis pendientes', path: '/admin/mis-pendientes', icon: ClipboardList },
            { name: 'Agenda', path: '/admin/agenda', icon: CalendarClock },
        ]
    },
    {
        name: 'COMERCIAL',
        items: [
            { name: 'Stock', path: '/admin/stock', icon: CarFront },
            { name: 'Clientes', path: '/admin/clientes', icon: Users },
            { name: 'Leads', path: '/admin/leads', icon: UserPlus },
            { name: 'Ventas', path: '/admin/ventas', icon: Receipt },
            { name: 'Reservas', path: '/admin/reservas', icon: CalendarClock },
        ]
    },
    {
        name: 'FINANZAS',
        items: [
            { name: 'Finanzas', path: '/admin/finanzas', icon: Wallet, prefetch: false },
            { name: 'Cuotas', path: '/admin/cuotas', icon: Landmark },
            { name: 'Cobranzas', path: '/admin/cobranzas', icon: Target },
        ]
    },
    {
        name: 'OPERACIÓN',
        items: [
            { name: 'Documentación', path: '/admin/documentacion', icon: FileText, prefetch: false },
            { name: 'Postventa', path: '/admin/postventa', icon: Star, prefetch: false },
        ]
    },
    {
        name: 'COLABORACIÓN',
        items: [
            { name: 'Equipo', path: '/admin/equipo', icon: Users, prefetch: false },
            { name: 'Productividad', path: '/admin/productividad', icon: BarChart3, prefetch: false },
            { name: 'Metas', path: '/admin/metas', icon: Flag, prefetch: false },
        ]
    },
    {
        name: 'ADMINISTRACIÓN',
        items: [
            { name: 'Reportes', path: '/admin/reportes', icon: BarChart3, prefetch: false },
            { name: 'Auditoría', path: '/admin/auditoria', icon: FileText, prefetch: false },
            { name: 'Usuarios', path: '/admin/configuracion/usuarios', icon: UserCog, prefetch: false },
            { name: 'Calidad de Datos', path: '/admin/calidad-datos', icon: ShieldAlert, prefetch: false },
            { name: 'Exportaciones', path: '/admin/exportaciones', icon: Download, prefetch: false },
            { name: 'Sistema', path: '/admin/sistema', icon: Activity, prefetch: false },
            { name: 'Configuración', path: '/admin/configuracion', icon: Settings, prefetch: false },
            { name: 'Ayuda', path: '/admin/ayuda', icon: HelpCircle, prefetch: false },
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
                <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
            )}
            
            <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#161619] border-r border-[#33333A] flex flex-col transition-transform duration-300 z-40 custom-scrollbar ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-14 flex items-center justify-center border-b border-[#33333A] shrink-0">
                    <span className="text-[#FAFAFA] font-bold text-lg tracking-wider">AUTOSPORTING</span>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 custom-scrollbar">
                    {menuGroups.map((group) => {
                        const visibleItems = group.items.filter(item => hasItemPermission(item.name));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.name} className="flex flex-col gap-1">
                                <h3 className="px-3 text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">
                                    {group.name}
                                </h3>
                                {visibleItems.map((item) => {
                                    const isActive = item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
                                    return (
                                        <Link 
                                            key={item.name} 
                                            href={item.path}
                                            prefetch={item.prefetch === false ? false : undefined}
                                            onClick={() => onClose && onClose()}
                                            style={{ textDecoration: 'none' }}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#EF3329]/10 text-[#FAFAFA] font-semibold border border-[#EF3329]/20' : 'text-[#A1A1AA] hover:bg-[#28282E] hover:text-[#FAFAFA]'}`}
                                        >
                                            <item.icon size={18} className={isActive ? 'text-[#EF3329]' : 'text-[#A1A1AA]'} />
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
