"use client";
import { useState } from 'react';
import CrmSidebar from './CrmSidebar';
import CrmHeader from './CrmHeader';
import CrmBottomNav from './CrmBottomNav';

export default function CrmShell({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-crm-bg font-sans text-crm-fg m-0 p-0">
            <CrmSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <CrmHeader onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto pb-[calc(4rem+var(--safe-bottom,0px))] md:pb-0">
                    {children}
                </main>
                <CrmBottomNav />
            </div>
        </div>
    );
}
