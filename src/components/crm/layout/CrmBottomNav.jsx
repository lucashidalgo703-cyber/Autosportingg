"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { getMobileNavigation, isNavigationActive } from '../../../utils/crmNavigation';

export default function CrmBottomNav({ isHidden = false }) {
    const pathname = usePathname();
    const { user } = useAuth();
    const navItems = getMobileNavigation(user);

    return (
        <nav aria-label="Accesos rápidos" style={{ gridTemplateColumns: `repeat(${navItems.length || 1}, minmax(0, 1fr))` }} className={`fixed inset-x-0 bottom-0 z-30 min-h-[53px] border-t border-crm-border bg-crm-topbar/95 pb-[var(--safe-bottom,0px)] shadow-[0_-12px_30px_rgba(0,0,0,0.35)] backdrop-blur md:hidden ${isHidden ? 'hidden' : 'grid'}`}>
            {navItems.map((item) => {
                const isActive = isNavigationActive(pathname, item.path);

                return (
                    <Link
                        key={item.path}
                        href={item.path}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-semibold no-underline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red ${
                            isActive ? 'text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg'
                        }`}
                    >
                        {isActive && (
                            <span className="absolute top-0 h-0.5 w-8 rounded-full bg-crm-red" />
                        )}
                        <span aria-hidden="true" className={`flex h-6 w-6 items-center justify-center rounded-lg text-lg leading-none ${isActive ? 'bg-crm-red/10' : 'bg-transparent'}`}>
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
