import React, { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Calendar, Bell, 
    Box, Users, FileText, DollarSign, Target,
    Package, FolderOpen, Briefcase, Archive, AlertTriangle,
    CreditCard, Building, Receipt, HandCoins, BarChart3,
    MessageSquare, MessageCircle, MessagesSquare, Mail, ThumbsUp,
    ShieldCheck, Moon, Lightbulb, Trash2, Settings, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MENU_GROUPS = [
    {
        title: "Principal",
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'calendario', label: 'Calendario', icon: Calendar },
            { id: 'alertas', label: 'Alertas', icon: Bell },
        ]
    },
    {
        title: "Comercial",
        items: [
            { id: 'stock', label: 'Stock', icon: Box },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'cotizacion', label: 'Cotización', icon: FileText },
            { id: 'ventas', label: 'Ventas', icon: DollarSign },
            { id: 'mis-ventas', label: 'Mis ventas', icon: Target },
        ]
    },
    {
        title: "Operación",
        items: [
            { id: 'pedidos', label: 'Pedidos', icon: Package },
            { id: 'expedientes', label: 'Expedientes', icon: FolderOpen },
            { id: 'gestoria', label: 'Gestoría', icon: Briefcase },
            { id: 'consignaciones', label: 'Consignaciones', icon: Archive },
            { id: 'infraccion', label: 'Infracción', icon: AlertTriangle },
        ]
    },
    {
        title: "Finanzas",
        items: [
            { id: 'finanzas', label: 'Finanzas', icon: BarChart3 },
            { id: 'tesoreria', label: 'Tesorería', icon: Building },
            { id: 'liquidacion', label: 'Liquidación', icon: Receipt },
            { id: 'cobros', label: 'Cobros', icon: CreditCard },
            { id: 'mis-comisiones', label: 'Mis comisiones', icon: HandCoins },
            { id: 'reportes', label: 'Reportes', icon: FileText },
        ]
    },
    {
        title: "Colaboraciones",
        items: [
            { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
            { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
            { id: 'conversaciones', label: 'Conversaciones', icon: MessagesSquare },
            { id: 'correos', label: 'Correos', icon: Mail },
            { id: 'nps', label: 'NPS', icon: ThumbsUp },
        ]
    },
    {
        title: "Administración",
        items: [
            { id: 'autorizaciones', label: 'Autorizaciones', icon: ShieldCheck },
            { id: 'dormidos', label: 'Dormidos', icon: Moon },
            { id: 'sugerencias', label: 'Sugerencias', icon: Lightbulb },
            { id: 'papelera', label: 'Papelera', icon: Trash2 },
            { id: 'configuracion', label: 'Configuración', icon: Settings },
            { id: 'mi-espacio', label: 'Mi espacio', icon: User },
        ]
    }
];

const AdminSidebar = ({ activeView, setActiveView, isMobileOpen, setIsMobileOpen }) => {
    const [hasOverdueTasks, setHasOverdueTasks] = useState(false);

    useEffect(() => {
        const fetchOverdueStatus = async () => {
            try {
                const API_URL = process.env.NEXT_PUBLIC_API_URL;
                const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
                const res = await fetch(`${baseUrl}/api/tasks`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                if (res.ok) {
                    const tasks = await res.json();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const overdue = tasks.some(t => {
                        if (t.status === 'Completada') return false;
                        const taskDate = new Date(t.dueDate);
                        taskDate.setHours(0, 0, 0, 0);
                        return taskDate < today;
                    });
                    
                    setHasOverdueTasks(overdue);
                }
            } catch (error) {
                // Ignore error silently for sidebar
            }
        };

        fetchOverdueStatus();
        // Poll every minute
        const interval = setInterval(fetchOverdueStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    // Sote CRM usually uses accordions or scrollable groups
    // For a cleaner look, we will just render the groups with a sticky scroll
    
    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-screen w-[260px] bg-[#09090b] border-r border-crm-border z-50
                flex flex-col transform transition-transform duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                
                {/* Logo Area */}
                <div className="h-20 flex items-center px-6 border-b border-crm-border shrink-0">
                    <img src="/autosporting-logo-white.png" alt="AutoSporting" className="h-8 object-contain" />
                    <span className="ml-3 font-semibold text-white tracking-tight">ERP Admin</span>
                </div>

                {/* Navigation Scrollable Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-8">
                    {MENU_GROUPS.map((group, gIndex) => (
                        <div key={gIndex} className="space-y-1">
                            <h4 className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
                                {group.title}
                            </h4>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = activeView === item.id;
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveView(item.id);
                                                setIsMobileOpen(false); // Auto close on mobile
                                            }}
                                            className={`
                                                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 bg-transparent
                                                ${isActive 
                                                    ? 'bg-red-600/10 text-red-500 border border-red-500/20' 
                                                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border border-transparent'
                                                }
                                            `}
                                        >
                                            <Icon size={18} className={isActive ? 'text-red-500' : 'text-zinc-500'} strokeWidth={isActive ? 2.5 : 2} />
                                            <span className="flex-1 text-left">{item.label}</span>
                                            
                                            {/* Red Indicator for Alertas */}
                                            {item.id === 'alertas' && hasOverdueTasks && (
                                                <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Logout Area */}
                <div className="p-4 border-t border-crm-border shrink-0">
                    <button 
                        onClick={() => {
                            localStorage.removeItem('token');
                            window.location.href = '/';
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </aside>
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}</style>
        </>
    );
};

export default AdminSidebar;
