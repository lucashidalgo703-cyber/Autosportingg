"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { canAccessCrmPath, isSalesRole } from '../../../utils/adminPermissions';

export default function CrmBottomNav({ isHidden = false }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const isSales = isSalesRole(user);

    const navItems = (isSales ? [
        { name: 'Negociación', path: '/admin/stock', icon: '🚗' },
        { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
        { name: 'Mis Ventas', path: '/admin/mis-ventas', icon: '🏆' },
        { name: 'Calendario', path: '/admin/agenda', icon: '📅' },
    ] : [
        { name: 'Dashboard', path: '/admin', icon: '📊' },
        { name: 'Stock', path: '/admin/stock', icon: '🚗' },
        { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
        { name: 'Ventas', path: '/admin/ventas', icon: '💼' },
        { name: 'Calendario', path: '/admin/agenda', icon: '📅' },
    ]).filter(item => canAccessCrmPath(user, item.path));

    return (
        <nav style={{ gridTemplateColumns: `repeat(${Math.max(1, navItems.length)}, minmax(0, 1fr))` }} className={`fixed inset-x-0 bottom-0 z-30 min-h-[68px] border-t border-crm-border bg-crm-topbar/95 pb-[var(--safe-bottom,0px)] shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur md:hidden ${isHidden ? 'hidden' : 'grid'}`}>
            {navItems.map((item) => {
                const isSalesArea = item.path === '/admin/ventas' && (pathname.startsWith('/admin/ventas') || pathname.startsWith('/admin/reservas'));
                const isActive = item.path === '/admin'
                    ? pathname === '/admin'
                    : isSalesArea || pathname.startsWith(item.path);

                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-semibold no-underline transition-colors ${
                            isActive ? 'text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg'
                        }`}
                    >
                        {isActive && (
                            <span className="absolute top-0 h-0.5 w-8 rounded-full bg-crm-red" />
                        )}
                        <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-lg leading-none ${isActive ? 'bg-crm-red/10' : 'bg-transparent'}`}>
                            {item.icon}
                        </span>
                        <span className="block w-full truncate text-center leading-none">
                            {item.name}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
