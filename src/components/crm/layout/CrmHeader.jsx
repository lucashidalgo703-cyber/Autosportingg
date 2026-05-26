"use client";
import { Search, Bell, User } from 'lucide-react';

export default function CrmHeader({ onMenuClick }) {
    return (
        <header className="h-14 bg-[#161619] border-b border-[#33333A] flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="lg:hidden text-[#A1A1AA] hover:text-white bg-transparent border-none p-1 cursor-pointer">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <div className="hidden md:flex items-center bg-[#0B0B0D] rounded-md px-3 py-1.5 border border-[#33333A]">
                    <Search size={16} className="text-[#A1A1AA]" />
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="bg-transparent border-none text-sm text-white ml-2 focus:outline-none placeholder-[#A1A1AA]"
                    />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button className="text-[#A1A1AA] hover:text-white bg-transparent border-none p-1 cursor-pointer relative">
                    <Bell size={20} />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-[#EF3329] rounded-full"></span>
                </button>
                <div className="w-8 h-8 rounded-full bg-[#24242B] border border-[#33333A] flex items-center justify-center text-white cursor-pointer">
                    <User size={16} />
                </div>
            </div>
        </header>
    );
}
