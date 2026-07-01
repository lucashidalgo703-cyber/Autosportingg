"use client";
import { Search, Bell, User, X, CheckCheck, Menu, Car, Users, Handshake, ChevronRight, Loader2, DollarSign, ShoppingCart, Moon, Star, Sun } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import toast from 'react-hot-toast';

const formatCurrency = (val) => new Intl.NumberFormat('es-AR').format(Math.round(val || 0));

export default function CrmHeader({ onMenuClick }) {
    const { theme, toggleTheme } = useTheme();
    const { user } = useAuth();
    const canSeeFinancials = hasPermission(user, PERMISSIONS.FINANZAS_READ);

    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const [summaryData, setSummaryData] = useState({ ars: 0, usd: 0, sales: 0, stock: 0, accountsError: false, subscription: null });
    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const searchRef = useRef(null);

    const dropdownRef = useRef(null);
    const router = useRouter();

    // Buscar datos
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
                    const data = await res.json();
                    setSearchResults(data);
                    setShowSearchDropdown(true);
                }
            } catch (err) {
                console.error("Error searching", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch('/api/admin/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
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
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                let ars = 0, usd = 0;
                let accountsError = false;

                if (canSeeFinancials) {
                    try {
                        const accRes = await fetch('/api/admin/accounts', { headers: { 'Authorization': `Bearer ${token}` } });
                        if (accRes.ok && accRes.headers.get('content-type')?.includes('application/json')) {
                            const accounts = await accRes.json();
                            const getBal = (curr) => {
                                return accounts
                                    .filter(a => a.currency === curr && a.isActive !== false)
                                    .reduce((sum, a) => sum + (a.balance || 0), 0);
                            };
                            ars = getBal('ARS');
                            usd = getBal('USD');
                        } else {
                            accountsError = true;
                        }
                    } catch (e) {
                        accountsError = true;
                    }
                }

                let sales = 0, stock = 0;
                try {
                    const headers = { 'Authorization': `Bearer ${token}` };
                    const [carsRes, salesRes] = await Promise.all([
                        fetch('/api/admin/cars', { headers }),
                        fetch('/api/admin/sales', { headers })
                    ]);

                    if (carsRes.ok && salesRes.ok && carsRes.headers.get('content-type')?.includes('application/json') && salesRes.headers.get('content-type')?.includes('application/json')) {
                        const [carsData, salesData] = await Promise.all([
                            carsRes.json(),
                            salesRes.json()
                        ]);
                        const today = new Date();

                        stock = carsData.filter((car) => (car.status || 'disponible').toLowerCase() === 'disponible').length;
                        sales = salesData.filter((sale) => {
                            const saleDate = new Date(sale.saleDate || sale.createdAt);
                            const status = (sale.status || '').toLowerCase();

                            return status !== 'cancelada'
                                && status !== 'borrador'
                                && saleDate.getMonth() === today.getMonth()
                                && saleDate.getFullYear() === today.getFullYear();
                        }).length;
                    }
                } catch (e) {}

                let subscription = null;
                try {
                    const subRes = await fetch('/api/admin/company/subscription-summary', { headers: { 'Authorization': `Bearer ${token}` } });
                    if (subRes.ok && subRes.headers.get('content-type')?.includes('application/json')) {
                        subscription = await subRes.json();
                    }
                } catch (e) {}

                setSummaryData({ ars, usd, sales, stock, accountsError, subscription });
            } catch (err) {}
        };
        fetchSummary();
        const interval = setInterval(fetchSummary, 60000);
        return () => clearInterval(interval);
    }, [canSeeFinancials]);

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
        <div className="relative flex items-center w-full" ref={searchRef}>
            <Search size={16} className="pointer-events-none absolute left-3 text-crm-fg-muted" />
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length >= 2) setShowSearchDropdown(true);
                }}
                onFocus={() => {
                    if (searchQuery.length >= 2 && searchResults.length > 0) setShowSearchDropdown(true);
                }}
                placeholder="Buscar clientes, vehículos, ventas…"
                className="m-0 h-10 w-full appearance-none rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-9 text-base text-crm-fg placeholder:text-crm-fg-subtle transition-all focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red md:h-9 md:text-sm"
            />
            {isSearching && (
                <div className="absolute right-3">
                    <Loader2 size={14} className="animate-spin text-crm-fg-subtle" />
                </div>
            )}
            {searchQuery && !isSearching && (
                <button 
                    onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchDropdown(false); }}
                    className="absolute right-2 p-1 text-crm-fg-muted hover:text-white"
                >
                    <X size={14} />
                </button>
            )}

            {/* Dropdown de resultados */}
            {showSearchDropdown && (
                <div className="absolute top-full mt-2 left-0 w-full md:w-[400px] bg-crm-surface border border-crm-border rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {searchResults.length === 0 && !isSearching ? (
                            <div className="p-4 text-center text-sm text-crm-fg-muted">
                                No se encontraron resultados para "{searchQuery}"
                            </div>
                        ) : (
                            <div className="py-2">
                                {searchResults.map((res) => (
                                    <div 
                                        key={res.id} 
                                        onClick={() => {
                                            setShowSearchDropdown(false);
                                            router.push(res.url);
                                        }}
                                        className="px-4 py-3 hover:bg-crm-surface-raised cursor-pointer border-b border-crm-border/50 last:border-0 flex items-start gap-3 transition-colors group"
                                    >
                                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-crm-bg flex items-center justify-center border border-crm-border shrink-0 text-crm-fg-subtle group-hover:text-crm-fg group-hover:border-crm-red/30 transition-colors">
                                            {res.type === 'car' ? <Car size={16} /> : res.type === 'client' ? <Users size={16} /> : <Handshake size={16} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-crm-fg truncate group-hover:text-white">{res.title}</p>
                                            <p className="text-xs text-crm-fg-muted truncate mt-0.5">{res.subtitle}</p>
                                        </div>
                                        <ChevronRight size={14} className="mt-2 text-crm-fg-subtle opacity-0 group-hover:opacity-100 group-hover:text-crm-red transition-all -translate-x-2 group-hover:translate-x-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="bg-crm-bg border-t border-crm-border px-4 py-2 text-[10px] uppercase font-bold text-crm-fg-subtle text-center tracking-wider">
                        Búsqueda Global
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <header className="sticky top-0 z-30 flex flex-col border-b border-crm-border bg-crm-topbar/95 pt-[var(--safe-top,0px)] backdrop-blur">
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

                    <div className="flex-1 min-w-0 md:w-80 md:flex-none">
                        {searchInput}
                    </div>
                </div>

                <div className="hidden flex-1 items-center justify-center gap-6 xl:flex">
                    {canSeeFinancials && !summaryData.accountsError && (
                        <div className="flex items-center gap-3 rounded-full bg-crm-surface-raised px-3 py-1.5 text-xs font-semibold text-crm-fg-muted shadow-sm">
                            <span className="flex items-center gap-1" title="Caja Fuerte USD"><DollarSign size={13} className="text-emerald-400"/> USD {formatCurrency(summaryData.usd)}</span>
                            <span className="h-3 w-px bg-crm-border"></span>
                            <span className="flex items-center gap-1" title="Caja Fuerte ARS">ARS {formatCurrency(summaryData.ars)}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-4 text-xs font-semibold text-crm-fg-muted">
                        <span className="flex items-center gap-1.5 rounded-full bg-crm-surface-raised px-3 py-1.5 shadow-sm" title="Ventas del mes"><ShoppingCart size={13} className="text-amber-400"/> {summaryData.sales} ventas</span>
                        <span className="flex items-center gap-1.5 rounded-full bg-crm-surface-raised px-3 py-1.5 shadow-sm" title="Stock disponible"><Car size={13} className="text-blue-400"/> {summaryData.stock} disponibles</span>
                        {(summaryData.subscription?.enabled || summaryData.subscription?.planLabel) && (
                            <span className="flex items-center gap-1.5 rounded-full bg-crm-surface-raised px-3 py-1.5 shadow-sm" title="Plan actual"><Star size={13} className="text-violet-400"/> {summaryData.subscription?.planLabel || 'Premium'}</span>
                        )}
                    </div>
                </div>

                <div className="relative flex shrink-0 items-center gap-1 md:gap-2" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="relative m-0 flex h-10 w-10 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg md:h-9 md:w-9"
                        title={theme === 'dark' ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
                        aria-label="Cambiar tema"
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="relative m-0 flex h-10 w-10 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg md:h-9 md:w-9"
                        aria-label="Notificaciones"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-crm-red-brand px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-crm-topbar">
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

                    <div className="flex items-center gap-3 ml-2">
                        <div className="hidden flex-col items-end md:flex">
                            <span className="text-xs font-bold text-crm-fg leading-none">{user?.displayName || user?.email?.split('@')[0] || 'Usuario'}</span>
                            <span className="text-[10px] font-bold uppercase text-crm-red mt-1 leading-none">ADMINISTRADOR</span>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-sm font-bold text-crm-fg transition-colors hover:bg-crm-surface-raised">
                            {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
