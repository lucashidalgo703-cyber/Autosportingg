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
            <div className="flex items-center gap-4 relative" ref={dropdownRef}>
                <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="text-[#A1A1AA] hover:text-white bg-transparent border-none p-1 cursor-pointer relative"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
                
                {/* Dropdown Notificaciones */}
                {showDropdown && (
                    <div className="absolute top-10 right-10 w-80 bg-[#1E1E24] border border-[#33333A] rounded-xl shadow-2xl overflow-hidden flex flex-col z-50">
                        <div className="p-3 border-b border-[#33333A] flex justify-between items-center bg-[#161619]">
                            <h3 className="text-white text-sm font-bold">Notificaciones</h3>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">
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
                                        <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${n.severity === 'danger' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-yellow-500' : n.severity === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
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
                        <Link href="/admin/notificaciones" onClick={() => setShowDropdown(false)} className="p-2 text-center text-xs font-bold text-white bg-[#24242B] hover:bg-[#33333A] transition-colors border-t border-[#33333A]">
                            Ver todas las notificaciones
                        </Link>
                    </div>
                )}

                <div className="w-8 h-8 rounded-full bg-[#24242B] border border-[#33333A] flex items-center justify-center text-white cursor-pointer">
                    <User size={16} />
                </div>
            </div>
        </header>
    );
}
