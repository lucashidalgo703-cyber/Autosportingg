"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CarFront, Users, UserPlus, Receipt, CalendarClock, Wallet, Landmark, FileText, BarChart3, Settings, Target, Star, UserCog, ClipboardList, Flag } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS, ROLES } from '../../../utils/adminPermissions';

const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Mis pendientes', path: '/admin/mis-pendientes', icon: ClipboardList },
    { name: 'Equipo', path: '/admin/equipo', icon: Users, prefetch: false },
    { name: 'Productividad', path: '/admin/productividad', icon: BarChart3, prefetch: false },
    { name: 'Metas', path: '/admin/metas', icon: Flag, prefetch: false },
    { name: 'Stock', path: '/admin/stock', icon: CarFront },
    { name: 'Clientes', path: '/admin/clientes', icon: Users },
    { name: 'Leads', path: '/admin/leads', icon: UserPlus },
    { name: 'Agenda', path: '/admin/agenda', icon: CalendarClock },
    { name: 'Ventas', path: '/admin/ventas', icon: Receipt },
    { name: 'Reservas', path: '/admin/reservas', icon: CalendarClock },
    { name: 'Finanzas', path: '/admin/finanzas', icon: Wallet, prefetch: false },
    { name: 'Cuotas', path: '/admin/cuotas', icon: Landmark },
    { name: 'Cobranzas', path: '/admin/cobranzas', icon: Target },
    { name: 'Documentación', path: '/admin/documentacion', icon: FileText, prefetch: false },
    { name: 'Postventa', path: '/admin/postventa', icon: Star, prefetch: false },
    { name: 'Reportes', path: '/admin/reportes', icon: BarChart3, prefetch: false },
    { name: 'Auditoría', path: '/admin/auditoria', icon: FileText, prefetch: false },
    { name: 'Usuarios', path: '/admin/configuracion/usuarios', icon: UserCog, prefetch: false },
    { name: 'Configuración', path: '/admin/configuracion', icon: Settings, prefetch: false },
];

export default function CrmSidebar({ isOpen, onClose }) {
    const pathname = usePathname();
    const { user } = useAuth();

    // Filtramos menu items basado en permisos
    const visibleMenuItems = menuItems.filter(item => {
        if (item.name === 'Configuración' || item.name === 'Usuarios') {
            return hasPermission(user, PERMISSIONS.USUARIOS_READ);
        }
        if (item.name === 'Finanzas') {
            return hasPermission(user, PERMISSIONS.FINANZAS_READ);
        }
        if (item.name === 'Cuotas') {
            return hasPermission(user, PERMISSIONS.CUOTAS_READ);
        }
        if (item.name === 'Cobranzas') {
            return hasPermission(user, PERMISSIONS.COBRANZAS_READ);
        }
        if (item.name === 'Reportes') {
            return hasPermission(user, PERMISSIONS.REPORTES_READ);
        }
        if (item.name === 'Auditoría') {
            return hasPermission(user, PERMISSIONS.AUDITORIA_READ);
        }
        if (item.name === 'Equipo') {
            return hasPermission(user, PERMISSIONS.EQUIPO_READ);
        }
        if (item.name === 'Productividad') {
            return hasPermission(user, PERMISSIONS.PRODUCTIVIDAD_READ);
        }
        if (item.name === 'Metas') {
            return hasPermission(user, PERMISSIONS.METAS_READ);
        }
        return true; 
    });

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
            )}
            
            <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#161619] border-r border-[#33333A] flex flex-col transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-14 flex items-center justify-center border-b border-[#33333A] shrink-0">
                    <span className="text-white font-bold text-lg tracking-wider">AUTOSPORTING</span>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                    {visibleMenuItems.map((item) => {
                        const isActive = item.path === '/admin' ? pathname === '/admin' : pathname.startsWith(item.path);
                        return (
                            <Link 
                                key={item.name} 
                                href={item.path}
                                prefetch={item.prefetch === false ? false : undefined}
                                onClick={() => onClose && onClose()}
                                style={{ textDecoration: 'none' }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#24242B] text-[#E63027] font-semibold border-l-2 border-[#E63027]' : 'text-[#A1A1AA] hover:bg-[#1E1E24] hover:text-white'}`}
                            >
                                <item.icon size={18} className={isActive ? 'text-[#E63027]' : 'text-[#A1A1AA]'} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
