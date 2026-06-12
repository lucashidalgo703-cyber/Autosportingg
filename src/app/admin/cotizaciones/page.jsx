"use client";
import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import CrmButton from '../../../components/crm/ui/CrmButton';
import QuoteList from '../../../components/crm/quotes/QuoteList';
import Link from 'next/link';

export default function AdminCotizacionesPage() {
    const { user, token } = useAuth();
    const canWrite = hasPermission(user, PERMISSIONS.COTIZACIONES_WRITE);
    
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', status: '' });
    const [stats, setStats] = useState({ total: 0, aprobadas: 0, pendientes: 0 });

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams(filters);
            const res = await fetch(`/api/admin/quotes?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setQuotes(data.quotes);
                
                // Calculate quick stats if not filtering heavily
                if (!filters.search && !filters.status) {
                    setStats({
                        total: data.total,
                        aprobadas: data.quotes.filter(q => q.status === 'aprobada').length,
                        pendientes: data.quotes.filter(q => q.status === 'pendiente').length
                    });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchQuotes();
    }, [token]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchQuotes();
    };

    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-20 md:p-6">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Cotizaciones</h1>
                        </div>
                        <p className="m-0 text-sm text-crm-fg-muted">
                            Gestión independiente de presupuestos y propuestas comerciales.
                        </p>
                    </div>

                    {canWrite && (
                        <Link href="/admin/cotizaciones/nueva" passHref legacyBehavior>
                            <CrmButton variant="primary" size="sm" className="w-full gap-2 md:w-auto">
                                <Plus size={16} />
                                Nueva Cotización
                            </CrmButton>
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-crm-border bg-crm-surface p-4">
                        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Total</p>
                        <p className="m-0 mt-2 text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="rounded-xl border border-crm-border bg-crm-surface p-4">
                        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Pendientes</p>
                        <p className="m-0 mt-2 text-2xl font-bold text-amber-300">{stats.pendientes}</p>
                    </div>
                    <div className="rounded-xl border border-crm-border bg-crm-surface p-4">
                        <p className="m-0 text-[11px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Aprobadas</p>
                        <p className="m-0 mt-2 text-2xl font-bold text-emerald-300">{stats.aprobadas}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4 border-b border-crm-border pb-6 pt-2">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por número o vehículo..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="h-[38px] w-full rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted outline-none focus:border-crm-red"
                            />
                        </div>
                        <select
                            value={filters.status}
                            onChange={(e) => {
                                setFilters({ ...filters, status: e.target.value });
                                // Small timeout to let state update before fetching
                                setTimeout(() => fetchQuotes(), 0);
                            }}
                            className="h-[38px] rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none focus:border-crm-red sm:w-[180px]"
                        >
                            <option value="">Todos los estados</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="enviada">Enviada</option>
                            <option value="en_revision">En Revisión</option>
                            <option value="aprobada">Aprobada</option>
                            <option value="modificada">Modificada</option>
                            <option value="rechazada">Rechazada</option>
                        </select>
                        <CrmButton type="submit" variant="secondary" className="sm:w-auto">
                            Filtrar
                        </CrmButton>
                    </form>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-crm-border bg-crm-surface">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                    </div>
                ) : (
                    <QuoteList quotes={quotes} />
                )}
            </div>
        </div>
    );
}
