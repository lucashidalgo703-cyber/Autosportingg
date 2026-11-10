"use client";
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import CrmSidebar from './CrmSidebar';
import CrmHeader from './CrmHeader';
import CrmBottomNav from './CrmBottomNav';

export default function CrmShell({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

    useEffect(() => {
        closeSidebar();
    }, [pathname, closeSidebar]);

    useEffect(() => {
        if (!isSidebarOpen) return;

        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyOverflowY = document.body.style.overflowY;
        const previousHtmlOverflowY = document.documentElement.style.overflowY;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflowY = 'hidden';
        const desktop = window.matchMedia('(min-width: 768px)');
        const handleResize = () => { if (desktop.matches) closeSidebar(); };
        handleResize();

        const handleEscape = (event) => {
            if (event.key === 'Escape') closeSidebar();
        };

        window.addEventListener('keydown', handleEscape);
        desktop.addEventListener('change', handleResize);
        return () => {
            window.removeEventListener('keydown', handleEscape);
            desktop.removeEventListener('change', handleResize);
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.overflowY = previousBodyOverflowY;
            document.documentElement.style.overflowY = previousHtmlOverflowY;
        };
    }, [isSidebarOpen, closeSidebar]);

    return (
        <div data-admin-shell className="m-0 flex min-h-[100dvh] w-full max-w-full overflow-x-clip bg-crm-bg p-0 font-sans text-crm-fg">
            <CrmSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-clip">
                <CrmHeader onMenuClick={() => setSidebarOpen(true)} isMenuOpen={isSidebarOpen} />
                <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 touch-pan-y overflow-x-clip pb-[calc(4.25rem+var(--safe-bottom,0px))] md:pb-0 outline-none">
                    {children}
                </main>
                <CrmBottomNav isHidden={isSidebarOpen} />
            </div>
        </div>
    );
}
