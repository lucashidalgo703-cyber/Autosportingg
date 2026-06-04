"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import CrmSidebar from './CrmSidebar';
import CrmHeader from './CrmHeader';
import CrmBottomNav from './CrmBottomNav';

export default function CrmShell({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    const closeSidebar = () => setSidebarOpen(false);

    useEffect(() => {
        if (!isSidebarOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isSidebarOpen]);

    useEffect(() => {
        setSidebarOpen(false);
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
                <main className="min-w-0 flex-1 overscroll-contain overflow-x-hidden overflow-y-auto pb-[calc(5.25rem+var(--safe-bottom,0px))] md:pb-0">
                    {children}
                </main>
                <CrmBottomNav isHidden={isSidebarOpen} />
            </div>
        </div>
    );
}
