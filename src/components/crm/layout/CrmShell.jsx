"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import CrmSidebar from './CrmSidebar';
import CrmHeader from './CrmHeader';
import CrmBottomNav from './CrmBottomNav';

export default function CrmShell({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    const restorePageScroll = () => {
        if (typeof document === 'undefined') return;
        document.body.style.overflow = '';
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
    };

    const closeSidebar = () => {
        restorePageScroll();
        setSidebarOpen(false);
    };

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyOverflowY = document.body.style.overflowY;
        const previousHtmlOverflowY = document.documentElement.style.overflowY;

        restorePageScroll();

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.overflowY = previousBodyOverflowY;
            document.documentElement.style.overflowY = previousHtmlOverflowY;
        };
    }, []);

    useEffect(() => {
        closeSidebar();
    }, [pathname]);

    useEffect(() => {
        if (!isSidebarOpen) return;

        const handleEscape = (event) => {
            if (event.key === 'Escape') closeSidebar();
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isSidebarOpen]);

    return (
        <div data-admin-shell className="m-0 flex min-h-[100dvh] w-full max-w-full overflow-x-hidden bg-crm-bg p-0 font-sans text-crm-fg">
            <CrmSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
            <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
                <CrmHeader onMenuClick={() => setSidebarOpen(true)} />
                <main className="min-w-0 flex-1 touch-pan-y overflow-x-hidden pb-[calc(5.25rem+var(--safe-bottom,0px))] md:pb-0">
                    {children}
                </main>
                <CrmBottomNav isHidden={isSidebarOpen} />
            </div>
        </div>
    );
}
