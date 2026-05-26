"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CarFront, Users, UserPlus, Receipt, CalendarClock, Wallet, Landmark, FileText, BarChart3, Settings } from 'lucide-react';

const menuItems = [
    { name: 'Dashboard', path: '/crm', icon: LayoutDashboard },
    { name: 'Stock', path: '/crm/stock', icon: CarFront },
    { name: 'Clientes', path: '/crm/clientes', icon: Users },
    { name: 'Leads', path: '/crm/leads', icon: UserPlus },
    { name: 'Ventas', path: '/crm/ventas', icon: Receipt },
    { name: 'Reservas', path: '/crm/reservas', icon: CalendarClock },
    { name: 'Finanzas', path: '/crm/finanzas', icon: Wallet },
    { name: 'Cuotas', path: '/crm/cuotas', icon: Landmark },
    { name: 'Documentación', path: '/crm/documentacion', icon: FileText },
    { name: 'Reportes', path: '/crm/reportes', icon: BarChart3 },
    { name: 'Configuración', path: '/crm/configuracion', icon: Settings },
];

export default function CrmSidebar({ isOpen, onClose }) {
    const pathname = usePathname();

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
            )}
            
            <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#161619] border-r border-[#33333A] flex flex-col transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="h-14 flex items-center justify-center border-b border-[#33333A] shrink-0">
                    <span className="text-white font-bold text-lg tracking-wider">AUTOSPORTING</span>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link 
                                key={item.name} 
                                href={item.path}
                                onClick={() => onClose && onClose()}
                                style={{ textDecoration: 'none' }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-[#24242B] text-[#E63027] font-semibold border-l-2 border-[#E63027]' : 'text-[#A1A1AA] hover:bg-[#1E1E24] hover:text-white'}`}
                            >
                                <item.icon size={18} className={isActive ? 'text-[#E63027]' : 'text-[#A1A1AA]'} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
