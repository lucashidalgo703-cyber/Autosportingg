"use client";
import { Search, Bell, User, X, CheckCheck } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CrmHeader({ onMenuClick }) {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('/api/admin/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data);
                }
            } catch (error) {
                console.error("Error fetching notifications", error);
            }
        };
        fetchNotifs();
        // Opcional: polling cada 5 min
        const interval = setInterval(fetchNotifs, 300000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = async (e, key) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/admin/notifications/${key}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === key ? { ...n, read: true } : n));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            const unreadKeys = notifications.filter(n => !n.read).map(n => n.id);
            if (unreadKeys.length === 0) return;
            await fetch(`/api/admin/notifications/read-all`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ keys: unreadKeys })
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <header className="sticky top-0 z-30 flex h-[calc(3.5rem+var(--safe-top,0px))] items-center justify-between gap-2 border-b border-crm-border bg-crm-topbar/95 px-3 pt-[var(--safe-top,0px)] backdrop-blur md:h-14 md:gap-4 md:px-6 md:pt-0">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={onMenuClick} className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <div className="hidden md:flex relative items-center w-64">
                    <Search size={16} className="absolute left-3 text-crm-fg-muted" />
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="w-full rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-9 text-sm text-crm-fg placeholder:text-crm-fg-subtle focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red transition-all"
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4 relative" ref={dropdownRef}>
                <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg transition-colors relative"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-crm-red-brand rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
                
                {/* Dropdown Notificaciones */}
                {showDropdown && (
                    <div className="absolute top-10 right-0 md:right-10 w-80 bg-crm-surface border border-crm-border rounded-xl shadow-2xl overflow-hidden flex flex-col z-50">
                        <div className="p-3 border-b border-crm-border flex justify-between items-center bg-crm-topbar">
                            <h3 className="text-white text-sm font-bold">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs text-[#EF3329] hover:text-[#C42620] font-semibold">
                                    Marcar leídas
                                </button>
                            )}
                        </div>
                        <div className="flex-1 max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">No hay notificaciones.</div>
                            ) : (
                                notifications.slice(0, 10).map((n) => (
                                    <div key={n.id} className={`p-3 border-b border-[#33333A] flex gap-3 group relative cursor-pointer ${n.read ? 'opacity-60' : 'bg-[#24242B]/30'}`} onClick={() => { setShowDropdown(false); router.push(n.href); }}>
                                        <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.severity === 'danger' ? 'bg-[#E63027]' : n.severity === 'warning' ? 'bg-[#f59e0b]' : n.severity === 'success' ? 'bg-[#10b981]' : 'bg-[#EF3329]'}`}></div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-xs font-bold truncate ${n.read ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                                            <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{n.description}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">{new Date(n.createdAt).toLocaleDateString('es-AR')} {n.severity === 'danger' ? 'Urgente' : ''}</p>
                                        </div>
                                        {!n.read && (
                                            <button 
                                                onClick={(e) => handleMarkAsRead(e, n.id)}
                                                className="absolute right-2 top-2 p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Marcar leída"
                                            >
                                                <CheckCheck size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <Link href="/admin/notificaciones" onClick={() => setShowDropdown(false)} className="p-2 text-center text-xs font-bold text-crm-fg bg-crm-surface-raised hover:bg-crm-border transition-colors border-t border-crm-border">
                            Ver todas las notificaciones
                        </Link>
                    </div>
                )}

                <div className="h-9 w-9 rounded-lg bg-crm-surface hover:bg-crm-surface-raised border border-crm-border flex items-center justify-center text-crm-fg cursor-pointer transition-colors">
                    <User size={16} />
                </div>
            </div>
        </header>
    );
}
