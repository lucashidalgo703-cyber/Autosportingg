"use client";
import { Search, Bell, X, CheckCheck, Menu, Car, Users, Handshake, ChevronRight, Loader2, DollarSign, ShoppingCart, Star, Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { saleCalendarKey } from '../../../utils/saleCalendarDate';
import { buildCashProjection, getArgentinaDateKey } from '../../../utils/cashProjection';
import toast from 'react-hot-toast';
import UserProfileMenu from './UserProfileMenu';
import OfflineSyncControl from '../offline/OfflineSyncControl';

const formatCurrency = (val) => new Intl.NumberFormat('es-AR').format(Math.round(val || 0));

export default function CrmHeader(props) {
    const { token } = useAuth();
    // A new session cannot reuse the previous user's search, alerts or balances.
    return <CrmHeaderSession key={token || 'signed-out'} {...props} />;
}

function CrmHeaderSession({ onMenuClick, isMenuOpen = false }) {
    const { theme, toggleTheme } = useTheme();
    const { user, token } = useAuth();
    const canSeeFinancials = hasPermission(user, PERMISSIONS.FINANZAS_READ);
    const canSeeStock = hasPermission(user, PERMISSIONS.STOCK_READ);
    const canSeeSales = hasPermission(user, PERMISSIONS.VENTAS_READ);

    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const [summaryData, setSummaryData] = useState({ ars: null, usd: null, sales: null, stock: null, accountsError: false, subscription: null });
    
    // Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const searchRef = useRef(null);
    const searchInputRef = useRef(null);
    const searchDismissedRef = useRef(false);
    const notificationButtonRef = useRef(null);
    const notificationPanelRef = useRef(null);

    const dropdownRef = useRef(null);

    // Buscar datos
    useEffect(() => {
        if (searchQuery.trim().length < 2 || !token) {
            setSearchResults([]);
            setShowSearchDropdown(false);
            setIsSearching(false);
            return;
        }
        const controller = new AbortController();
        let active = true;
        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal
                });
                if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
                    const data = await res.json();
                    if (active) { setSearchResults(Array.isArray(data) ? data : []); setSearchError(false); if (!searchDismissedRef.current) setShowSearchDropdown(true); }
                } else throw new Error('No se pudo consultar el buscador.');
            } catch (err) {
                if (active && err.name !== 'AbortError') { setSearchResults([]); setSearchError(true); if (!searchDismissedRef.current) setShowSearchDropdown(true); }
            } finally {
                if (active) setIsSearching(false);
            }
        }, 300);

        return () => { active = false; clearTimeout(delayDebounceFn); controller.abort(); };
    }, [searchQuery, token]);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        let active = true;
        const fetchNotifs = async () => {
            try {
                const res = await fetch('/api/admin/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal
                });
                if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
                    const data = await res.json();
                    if (active) setNotifications(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                if (error.name !== 'AbortError') console.error("Error fetching notifications", error);
            }
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 300000);
        return () => { active = false; clearInterval(interval); controller.abort(); };
    }, [token]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                searchDismissedRef.current = true;
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleEscape = event => {
            if (event.key !== 'Escape') return;
            if (searchRef.current?.contains(document.activeElement)) searchInputRef.current?.focus();
            else if (notificationPanelRef.current?.contains(document.activeElement)) notificationButtonRef.current?.focus();
            setShowDropdown(false);
            searchDismissedRef.current = true;
            setShowSearchDropdown(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();
        let active = true;
        let summaryRevision = 0;
        const readJson = async url => {
            try {
                const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal });
                return response.ok && response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
            } catch { return null; }
        };
        const fetchSummary = async () => {
            const revision = ++summaryRevision;
            const [accounts, carsData, salesData, subscription] = await Promise.all([
                canSeeFinancials ? readJson('/api/admin/accounts') : null,
                canSeeStock ? readJson('/api/admin/cars?limit=1') : null,
                canSeeSales ? readJson('/api/admin/sales') : null,
                readJson('/api/admin/company/subscription-summary')
            ]);
            if (!active || revision !== summaryRevision) return;
            const balances = Array.isArray(accounts) ? buildCashProjection({ accounts }).openingBalances : { ARS: null, USD: null };
            const salesArray = Array.isArray(salesData) ? salesData : salesData?.sales;
            const currentMonth = getArgentinaDateKey().slice(0, 7);
            const sales = Array.isArray(salesArray) ? salesArray.filter(sale => !['borrador', 'cancelada'].includes(sale.status) && saleCalendarKey(sale).slice(0, 7) === currentMonth).length : null;
            setSummaryData({ ars: balances.ARS, usd: balances.USD, sales, stock: carsData?.summary?.disponibles ?? null, accountsError: canSeeFinancials && !Array.isArray(accounts), subscription });
        };
        fetchSummary();
        const interval = setInterval(fetchSummary, 300000);
        window.addEventListener('account-balance-updated', fetchSummary);
        return () => { active = false; clearInterval(interval); window.removeEventListener('account-balance-updated', fetchSummary); controller.abort(); };
    }, [token, canSeeFinancials, canSeeStock, canSeeSales]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = async (e, key) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token) return;
        try {
            const response = await fetch(`/api/admin/notifications/${key}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('No se pudo marcar la notificación.');
            setNotifications(prev => prev.map(n => n.id === key ? { ...n, read: true } : n));
        } catch (err) {
            toast.error('No se pudo marcar la notificación como leída.');
        }
    };

    const handleMarkAllRead = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!token) return;
        try {
            const unreadKeys = notifications.filter(n => !n.read).map(n => n.id);
            if (unreadKeys.length === 0) return;
            const response = await fetch(`/api/admin/notifications/read-all`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ keys: unreadKeys })
            });
            if (!response.ok) throw new Error('No se pudieron marcar las notificaciones.');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            toast.error('No se pudieron marcar las notificaciones como leídas.');
        }
    };

    const searchInput = (
        <div className="relative flex w-full min-w-0 items-center" ref={searchRef}>
            <Search size={16} className="pointer-events-none absolute left-3 text-crm-fg-muted" />
            <input
                ref={searchInputRef}
                type="text"
                aria-label="Buscar clientes, vehículos y ventas"
                aria-expanded={showSearchDropdown}
                aria-controls="crm-global-search-results"
                value={searchQuery}
                onChange={(e) => {
                    searchDismissedRef.current = false;
                    setSearchQuery(e.target.value);
                    setSearchResults([]);
                    setSearchError(false);
                    setIsSearching(e.target.value.trim().length >= 2);
                    setShowSearchDropdown(e.target.value.trim().length >= 2);
                }}
                onFocus={() => {
                    if (searchQuery.trim().length >= 2) { searchDismissedRef.current = false; setShowSearchDropdown(true); }
                }}
                placeholder="Buscar clientes, vehículos, ventas…"
                className="m-0 h-10 w-full min-w-0 appearance-none rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-9 text-base text-crm-fg placeholder:text-crm-fg-subtle transition-all focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red md:h-9 md:text-sm"
            />
            {isSearching && (
                <div className="absolute right-3">
                    <Loader2 size={14} className="animate-spin text-crm-fg-subtle" />
                </div>
            )}
            {searchQuery && !isSearching && (
                <button 
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => { searchInputRef.current?.focus(); searchDismissedRef.current = true; setSearchQuery(''); setSearchResults([]); setIsSearching(false); setShowSearchDropdown(false); }}
                    className="absolute right-2 p-1 text-crm-fg-muted hover:text-white"
                >
                    <X size={14} />
                </button>
            )}

            {/* Dropdown de resultados */}
            {showSearchDropdown && (
                <div id="crm-global-search-results" role="region" aria-label="Resultados de búsqueda global" className="fixed left-4 right-4 top-[calc(3.5rem+var(--safe-top,0px))] z-50 mt-2 w-auto overflow-hidden rounded-xl border border-crm-border bg-crm-surface shadow-2xl md:absolute md:left-0 md:right-auto md:top-full md:w-[400px] md:max-w-[calc(100vw-2rem)]">
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {isSearching ? <p role="status" className="p-4 text-center text-sm text-crm-fg-muted">Buscando…</p> : searchError ? <p role="alert" className="p-4 text-center text-sm text-crm-fg-muted">No se pudo realizar la búsqueda. Volvé a intentarlo.</p> : searchResults.length === 0 ? (
                            <div role="status" className="p-4 text-center text-sm text-crm-fg-muted">
                                No se encontraron resultados para "{searchQuery}"
                            </div>
                        ) : (
                            <div className="py-2">
                                {searchResults.map((res) => (
                                    <Link
                                        key={`${res.type}:${res.id}`}
                                        href={res.url}
                                        onClick={() => setShowSearchDropdown(false)}
                                        className="px-4 py-3 hover:bg-crm-surface-raised focus-visible:bg-crm-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red cursor-pointer border-b border-crm-border/50 last:border-0 flex items-start gap-3 transition-colors group no-underline"
                                    >
                                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-crm-bg flex items-center justify-center border border-crm-border shrink-0 text-crm-fg-subtle group-hover:text-crm-fg group-hover:border-crm-red/30 transition-colors">
                                            {res.type === 'car' ? <Car size={16} /> : res.type === 'client' ? <Users size={16} /> : <Handshake size={16} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-crm-fg truncate group-hover:text-white">{res.title}</p>
                                            <p className="text-xs text-crm-fg-muted truncate mt-0.5">{res.subtitle}</p>
                                        </div>
                                        <ChevronRight size={14} className="mt-2 text-crm-fg-subtle opacity-0 group-hover:opacity-100 group-hover:text-crm-red transition-all -translate-x-2 group-hover:translate-x-0" />
                                    </Link>
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
        <header className="sticky top-0 z-30 flex w-full min-w-0 flex-col border-b border-crm-border bg-crm-topbar/95 pt-[var(--safe-top,0px)] backdrop-blur">
            <div className="flex h-14 w-full min-w-0 items-center gap-2 px-3 md:gap-3 md:px-4 2xl:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3 xl:basis-44 xl:grow-0 xl:shrink min-[1440px]:basis-64 2xl:basis-80">
                    <button
                        type="button"
                        onClick={onMenuClick}
                        className="m-0 flex h-10 w-10 shrink-0 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg md:hidden"
                        aria-label="Abrir menú"
                        aria-controls="crm-navigation-drawer"
                        aria-expanded={isMenuOpen}
                    >
                        <Menu size={22} />
                    </button>

                    <div className="min-w-0 flex-1">
                        {searchInput}
                    </div>
                </div>

                <div className="hidden min-w-0 flex-1 items-center xl:flex">
                    <div role="region" aria-label="Resumen comercial" tabIndex={(canSeeFinancials&&!summaryData.accountsError)||canSeeSales||canSeeStock||summaryData.subscription?.enabled||summaryData.subscription?.planLabel ? 0 : -1} className="flex w-full min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain whitespace-nowrap rounded-lg py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red">
                    {canSeeFinancials && !summaryData.accountsError && (
                        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-crm-surface-raised px-2 py-1.5 text-[11px] font-semibold text-crm-fg-muted shadow-sm">
                            <span className="flex shrink-0 items-center gap-1 tabular-nums" title="Saldo registrado en cuentas USD"><DollarSign size={13} className="text-emerald-400"/> USD {summaryData.usd === null ? '—' : formatCurrency(summaryData.usd)}</span>
                            <span className="h-3 w-px bg-crm-border"></span>
                            <span className="flex shrink-0 items-center gap-1 tabular-nums" title="Saldo registrado en cuentas ARS">ARS {summaryData.ars === null ? '—' : formatCurrency(summaryData.ars)}</span>
                        </div>
                    )}
                    <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold text-crm-fg-muted">
                        {canSeeSales && <span className="flex shrink-0 items-center gap-1 rounded-lg bg-crm-surface-raised px-2 py-1.5 shadow-sm tabular-nums" title="Ventas del mes"><ShoppingCart size={13} className="text-amber-400"/> {summaryData.sales ?? '—'} ventas</span>}
                        {canSeeStock && <span className="flex shrink-0 items-center gap-1 rounded-lg bg-crm-surface-raised px-2 py-1.5 shadow-sm tabular-nums" title="Stock disponible"><Car size={13} className="text-blue-400"/> Stock {summaryData.stock ?? '—'}</span>}
                        {(summaryData.subscription?.enabled || summaryData.subscription?.planLabel) && (
                            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-crm-surface-raised px-2 py-1.5 shadow-sm" title={'Plan actual: '+(summaryData.subscription?.planLabel || 'Premium')}><Star size={13} className="shrink-0 text-violet-400"/> <span className="max-w-32 truncate">{summaryData.subscription?.planLabel || 'Premium'}</span></span>
                        )}
                    </div>
                    </div>
                </div>

                <div className="relative ml-auto flex min-w-fit shrink-0 items-center gap-1 md:gap-1.5" ref={dropdownRef}>
                    <OfflineSyncControl />

                    <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'} title={theme === 'dark' ? 'Cambiar a modo día' : 'Cambiar a modo noche'} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red md:flex">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    <button
                        ref={notificationButtonRef}
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="relative m-0 flex h-10 w-10 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg md:h-9 md:w-9"
                        aria-label="Notificaciones"
                        aria-expanded={showDropdown}
                        aria-controls="crm-header-notifications"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-crm-red-brand px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-crm-topbar">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showDropdown && (
                        <div ref={notificationPanelRef} id="crm-header-notifications" role="region" aria-label="Notificaciones" className="absolute right-0 top-12 z-50 flex max-h-[min(26rem,calc(100dvh-5rem))] w-[calc(100vw-1rem)] max-w-80 flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface shadow-2xl md:right-10">
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
                                        <div key={n.id} className={`group relative border-b border-crm-border ${n.read ? 'opacity-60' : 'bg-crm-surface-raised/30'}`}>
                                            <Link href={n.href || '/admin/notificaciones'} onClick={() => setShowDropdown(false)} className="flex gap-3 p-3 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-crm-red">
                                            <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${n.severity === 'danger' ? 'bg-crm-red-brand' : n.severity === 'warning' ? 'bg-crm-warning' : n.severity === 'success' ? 'bg-crm-success' : 'bg-crm-red'}`} />
                                            <div className="min-w-0 flex-1 pr-6">
                                                <p className={`m-0 truncate text-xs font-bold ${n.read ? 'text-crm-fg-muted' : 'text-white'}`}>{n.title}</p>
                                                <p className="m-0 mt-0.5 line-clamp-2 text-[11px] text-crm-fg-muted">{n.description}</p>
                                                <p className="m-0 mt-1 text-[10px] text-crm-fg-subtle">{new Date(n.createdAt).toLocaleDateString('es-AR')} {n.severity === 'danger' ? 'Urgente' : ''}</p>
                                            </div>
                                            </Link>
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

                    <div className="shrink-0 md:ml-1">
                        <UserProfileMenu />
                    </div>
                </div>
            </div>
        </header>
    );
}
