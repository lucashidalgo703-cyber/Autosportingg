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
        <nav className="fixed inset-x-0 bottom-0 z-30 grid min-h-[68px] grid-cols-5 border-t border-crm-border bg-crm-topbar/95 pb-[var(--safe-bottom,0px)] shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
            {navItems.map((item) => {
                const isActive = item.path === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.path);

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
