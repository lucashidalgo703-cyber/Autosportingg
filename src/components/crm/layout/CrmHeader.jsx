"use client";
import { Search, Bell, User, X, CheckCheck, Menu } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CrmHeader({ onMenuClick }) {
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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

    const searchInput = (
        <div className="relative flex items-center">
            <Search size={16} className="pointer-events-none absolute left-3 text-crm-fg-muted" />
            <input
                type="text"
                placeholder="Buscar..."
                className="m-0 h-10 w-full appearance-none rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-9 text-base text-crm-fg placeholder:text-crm-fg-subtle transition-all focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red md:h-9 md:text-sm"
            />
        </div>
    );

    return (
        <header className="sticky top-0 z-30 border-b border-crm-border bg-crm-topbar/95 pt-[var(--safe-top,0px)] backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-2 px-3 md:gap-4 md:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none md:gap-4">
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="m-0 flex h-10 w-10 shrink-0 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg lg:hidden"
                        aria-label="Abrir menu"
                    >
                        <Menu size={22} />
                    </button>

                    <div className="min-w-0 md:hidden">
                        <p className="m-0 truncate text-sm font-bold leading-tight text-crm-fg">AutoSporting</p>
                        <p className="m-0 text-[10px] font-semibold uppercase text-crm-fg-muted">v2 CRM</p>
                    </div>

                    <div className="hidden w-72 md:block">
                        {searchInput}
                    </div>
                </div>

                <div className="relative flex shrink-0 items-center gap-1.5 md:gap-3" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setMobileSearchOpen(prev => !prev)}
                        className="m-0 flex h-10 w-10 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg md:hidden"
                        aria-label={mobileSearchOpen ? 'Cerrar busqueda' : 'Abrir busqueda'}
                    >
                        {mobileSearchOpen ? <X size={19} /> : <Search size={19} />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="relative m-0 flex h-10 w-10 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg md:h-9 md:w-9"
                        aria-label="Notificaciones"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-crm-red-brand px-1 text-[9px] font-bold text-white">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showDropdown && (
                        <div className="absolute right-0 top-12 z-50 flex max-h-[min(26rem,calc(100dvh-5rem))] w-[calc(100vw-1rem)] max-w-80 flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface shadow-2xl md:right-10">
                            <div className="flex items-center justify-between border-b border-crm-border bg-crm-topbar p-3">
                                <h3 className="m-0 text-sm font-bold text-white">Notificaciones</h3>
                                {unreadCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleMarkAllRead}
                                        className="m-0 appearance-none border-0 bg-transparent text-xs font-semibold text-crm-red hover:text-crm-red-hover"
                                    >
                                        Marcar leidas
                                    </button>
                                )}
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-crm-fg-muted">No hay notificaciones.</div>
                                ) : (
                                    notifications.slice(0, 10).map((n) => (
                                        <div key={n.id} className={`group relative flex cursor-pointer gap-3 border-b border-crm-border p-3 ${n.read ? 'opacity-60' : 'bg-crm-surface-raised/30'}`} onClick={() => { setShowDropdown(false); router.push(n.href); }}>
                                            <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.severity === 'danger' ? 'bg-crm-red-brand' : n.severity === 'warning' ? 'bg-crm-warning' : n.severity === 'success' ? 'bg-crm-success' : 'bg-crm-red'}`} />
                                            <div className="min-w-0 flex-1 pr-6">
                                                <p className={`m-0 truncate text-xs font-bold ${n.read ? 'text-crm-fg-muted' : 'text-white'}`}>{n.title}</p>
                                                <p className="m-0 mt-0.5 line-clamp-2 text-[11px] text-crm-fg-muted">{n.description}</p>
                                                <p className="m-0 mt-1 text-[10px] text-crm-fg-subtle">{new Date(n.createdAt).toLocaleDateString('es-AR')} {n.severity === 'danger' ? 'Urgente' : ''}</p>
                                            </div>
                                            {!n.read && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleMarkAsRead(e, n.id)}
                                                    className="absolute right-2 top-2 m-0 appearance-none border-0 bg-transparent p-1 text-crm-fg-muted opacity-100 transition-opacity hover:text-white md:opacity-0 md:group-hover:opacity-100"
                                                    title="Marcar leida"
                                                >
                                                    <CheckCheck size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <Link href="/admin/notificaciones" onClick={() => setShowDropdown(false)} className="border-t border-crm-border bg-crm-surface-raised p-3 text-center text-xs font-bold text-crm-fg transition-colors hover:bg-crm-border">
                                Ver todas las notificaciones
                            </Link>
                        </div>
                    )}

                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg transition-colors hover:bg-crm-surface-raised md:h-9 md:w-9">
                        <User size={16} />
                    </div>
                </div>
            </div>

            {mobileSearchOpen && (
                <div className="border-t border-crm-border px-3 py-2 md:hidden">
                    {searchInput}
                </div>
            )}
        </header>
    );
}
