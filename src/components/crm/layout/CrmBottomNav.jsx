"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CrmBottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', path: '/admin', icon: '📊' },
        { name: 'Stock', path: '/admin/stock', icon: '🚗' },
        { name: 'Clientes', path: '/admin/clientes', icon: '👥' },
        { name: 'Ventas', path: '/admin/ventas', icon: '💼' },
        { name: 'Agenda', path: '/admin/agenda', icon: '📅' },
    ];

    return (
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-crm-border bg-crm-topbar/95 pb-[var(--safe-bottom,0px)] backdrop-blur md:hidden">
            {navItems.map((item) => {
                // Determine if active. For dashboard exact match is better, for others prefix match.
                const isActive = item.path === '/admin' 
                    ? pathname === '/admin' 
                    : pathname.startsWith(item.path);

                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        className={`flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                            isActive ? 'text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg'
                        }`}
                    >
                        <span className="text-xl leading-none flex items-center justify-center h-6 w-6">
                            {item.icon}
                        </span>
                        <span className="truncate w-full text-center px-1">
                            {item.name}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
