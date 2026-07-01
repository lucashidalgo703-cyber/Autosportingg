"use client";
import React, { useEffect, useState } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { parseResponseSafe } from '../../../utils/apiHelper';
import CrmButton from '../../../components/crm/ui/CrmButton';
import CrmSelect from '../../../components/crm/ui/CrmSelect';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import QuoteList from '../../../components/crm/quotes/QuoteList';
import QuoteCreateModal from '../../../components/crm/quotes/QuoteCreateModal';
import toast from 'react-hot-toast';

export default function AdminCotizacionesPage() {
    const { user, token } = useAuth();
    const canWrite = hasPermission(user, PERMISSIONS.COTIZACIONES_WRITE);

    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);
    const [confirmMigrateModal, setConfirmMigrateModal] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [sellers, setSellers] = useState([]);
    const [filters, setFilters] = useState({ search: '', status: '', sellerId: '', dateFrom: '', dateTo: '' });
    const [stats, setStats] = useState({ total: 0, aprobadas: 0, pendientes: 0, rechazadas: 0 });

    const fetchQuotes = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams(filters);
            const res = await fetch(`/api/admin/quotes?${query.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            setQuotes(data.quotes || data || []);

            // Calculate quick stats if not filtering heavily
            if (!filters.search && !filters.status && !filters.sellerId && !filters.dateFrom && !filters.dateTo) {
                const quotesList = data.quotes || data || [];
                setStats({
                    total: data.total || quotesList.length,
                    aprobadas: quotesList.filter(q => q.status === 'aprobada').length,
                    pendientes: quotesList.filter(q => q.status === 'pendiente').length,
                    rechazadas: quotesList.filter(q => q.status === 'rechazada').length
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSellers = async () => {
        try {
            const res = await fetch('/api/admin/users/active', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            setSellers(data);
        } catch (error) {
            console.error('Error fetching sellers', error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchQuotes();
            fetchSellers();
        }
    }, [token, filters.status]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchQuotes();
    };

    const handleMigrateDrafts = async () => {
        try {
            setMigrating(true);
            const res = await fetch('/api/admin/quotes/migrate-drafts', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await parseResponseSafe(res);
            toast.success(data.message || `Migrados: ${data.migrated}`);
            fetchQuotes();
        } catch (error) {
            toast.error('Error migrando borradores');
        } finally {
            setMigrating(false);
            setConfirmMigrateModal(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-20 md:p-6">
            <ConfirmModal
                isOpen={confirmMigrateModal}
                onClose={() => setConfirmMigrateModal(false)}
                onConfirm={handleMigrateDrafts}
                title="Migrar borradores"
                message="¿Estás seguro de que deseas migrar todos los borradores antiguos al nuevo formato? Esta acción no se puede deshacer."
                confirmText={migrating ? "Migrando..." : "Confirmar migración"}
                isDanger={false}
            />
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="m-0 text-[26px] font-bold leading-tight text-crm-fg">Cotizaciones</h1>
                        </div>
                        <p className="m-0 text-sm text-crm-fg-muted">
                            {stats.pendientes} pendientes · {stats.aprobadas} aprobadas · {stats.rechazadas} rechazadas
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {hasPermission(user, PERMISSIONS.COTIZACIONES_WRITE) && (
                            <CrmButton
                                variant="secondary"
                                size="sm"
                                className="w-full md:w-auto"
                                onClick={() => setConfirmMigrateModal(true)}
                                disabled={migrating}
                            >
                                {migrating ? 'Migrando...' : 'Migrar borradores'}
                            </CrmButton>
                        )}
                        {canWrite && (
                            <CrmButton variant="primary" size="sm" className="w-full gap-2 md:w-auto" onClick={() => setIsCreateModalOpen(true)}>
                                <Plus size={16} />
                                Nueva cotización
                            </CrmButton>
                        )}
                    </div>
                </div>

                <div className="-mx-1 flex items-center gap-6 border-b border-crm-border px-1">
                    {[
                        { id: '', label: 'Todas' },
                        { id: 'pendiente', label: 'Pendientes' },
                        { id: 'aprobada', label: 'Aprobadas' },
                        { id: 'rechazada', label: 'Rechazadas' }
                    ].map(tab => {
                        const isActive = filters.status === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setFilters({ ...filters, status: tab.id })}
                                className={`m-0 appearance-none border-0 border-b-2 bg-transparent px-1 pb-3 pt-1 text-sm font-semibold transition-colors ${
                                    isActive
                                        ? 'border-crm-red text-crm-red'
                                        : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-col gap-4 border-b border-crm-border pb-6 pt-2">
                    <form onSubmit={handleSearch} className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                                <input
                                    type="text"
                                    placeholder="Cliente, vehículo, notas..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="h-[38px] w-full rounded-lg border border-crm-border bg-crm-surface py-2 pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted outline-none focus:border-crm-red"
                                />
                            </div>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="h-[38px] rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none focus:border-crm-red sm:w-[150px]"
                            >
                                <option value="">Todos los estados</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="enviada">Enviada</option>
                                <option value="en_revision">En Revisión</option>
                                <option value="aprobada">Aprobada</option>
                                <option value="modificada">Modificada</option>
                                <option value="rechazada">Rechazada</option>
                            </select>
                            <select
                                value={filters.sellerId}
                                onChange={(e) => setFilters({ ...filters, sellerId: e.target.value })}
                                className="h-[38px] rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none focus:border-crm-red sm:w-[150px]"
                            >
                                <option value="">Cualquier vendedor</option>
                                {sellers.map(s => (
                                    <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                className="h-[38px] rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none focus:border-crm-red sm:w-[130px]"
                            />
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                className="h-[38px] rounded-lg border border-crm-border bg-crm-surface px-3 text-sm text-crm-fg outline-none focus:border-crm-red sm:w-[130px]"
                            />
                            <CrmButton type="submit" variant="secondary" className="sm:w-auto h-[38px]">
                                Filtrar
                            </CrmButton>
                        </div>
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

            <QuoteCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    fetchQuotes();
                }}
            />
        </div>
    );
}
