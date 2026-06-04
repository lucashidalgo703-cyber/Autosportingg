"use client";
import { useState } from 'react';
import CrmSidebar from './CrmSidebar';
import CrmHeader from './CrmHeader';
import CrmBottomNav from './CrmBottomNav';

export default function CrmShell({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="m-0 flex min-h-[100dvh] bg-crm-bg p-0 font-sans text-crm-fg">
            <CrmSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex min-w-0 flex-1 flex-col">
                <CrmHeader onMenuClick={() => setSidebarOpen(true)} />
                <main className="min-w-0 flex-1 overscroll-contain overflow-x-hidden overflow-y-auto pb-[calc(5.25rem+var(--safe-bottom,0px))] md:pb-0">
                    {children}
                </main>
                <CrmBottomNav />
            </div>
        </div>
    );
}
