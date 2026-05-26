"use client";
import { useState } from 'react';
import CrmSidebar from './CrmSidebar';
import CrmHeader from './CrmHeader';

export default function CrmShell({ children }) {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-[#0B0B0D] font-sans text-[#FAFAFA] m-0 p-0">
            <CrmSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col min-w-0">
                <CrmHeader onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
