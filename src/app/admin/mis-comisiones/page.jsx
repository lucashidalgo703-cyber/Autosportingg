"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Wallet, History, Target, TrendingUp, CheckCircle, Clock, Search, Info, Plus, X } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS, hasPermission } from '../../../utils/adminPermissions';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import { useAuth } from '../../../context/AuthContext';
import { useAdminUsers } from '../../../hooks/useAdminUsers';
import toast from 'react-hot-toast';

const formatMoney = (amount, currency = 'ARS') => {
    return `${currency} ${Number(amount || 0).toLocaleString('es-AR')}`;
};

const getStatusBadge = (status) => {
    const badges = {
        'borrador': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        'revisada': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'aprobada': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'pagada': 'bg-crm-success/10 text-crm-success border-crm-success/20',
        'anulada': 'bg-crm-red/10 text-crm-red border-crm-red/20',
    };
    return badges[status] || 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
};

export default function MisComisionesPage() {
    const { user } = useAuth();
    const { users, fetchUsers } = useAdminUsers();

    const [data, setData] = useState({ settlements: [], pendingSales: [], targetUsername: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'historial'

    const [filterPeriod, setFilterPeriod] = useState('');
    const [filterSeller, setFilterSeller] = useState('');

    const [showModal, setShowModal] = useState(false);

    const canReadOthers = hasPermission(user, PERMISSIONS.LIQUIDACIONES_READ);
    const canWrite = hasPermission(user, PERMISSIONS.LIQUIDACIONES_WRITE);

    useEffect(() => {
        if (canReadOthers) {
            fetchUsers();
        }
    }, [canReadOthers, fetchUsers]);

    const loadCommissions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (filterSeller) params.append('seller', filterSeller);
            if (filterPeriod) {
                if (!/^\d{4}-\d{2}$/.test(filterPeriod)) {
                    toast.error('El formato del período debe ser YYYY-MM');
                    setLoading(false);
                    return;
                }
                params.append('period', filterPeriod);
            }

            const res = await fetch(`/api/admin/my-commissions?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar comisiones');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCommissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterSeller, filterPeriod]);

    // Calcular resúmenes
    const summaries = useMemo(() => {
        const totals = {
            ARS: { aCobrar: 0, pendiente: 0, cobrado: 0 },
            USD: { aCobrar: 0, pendiente: 0, cobrado: 0 }
        };

        // Pendientes (Ventas)
        data.pendingSales.forEach(s => {
            const cur = ['ARS', 'USD'].includes(s.saleCurrency) ? s.saleCurrency : 'USD';
            const price = s.salePrice || 0;
            const pct = (s.commissionSettings?.sellerPct || 0) / 100;
            const comm = price * pct;

            totals[cur].aCobrar += comm;
            totals[cur].pendiente += comm;
        });

        // Ya Cobrado (Borrador/Revisada/Aprobada también es pendiente, Pagada es cobrado)
        data.settlements.forEach(s => {
            if (s.status === 'anulada') return;
            const cur = ['ARS', 'USD'].includes(s.currency) ? s.currency : 'USD';
            const amt = s.totalAmount || 0;

            if (s.status === 'pagada') {
                totals[cur].cobrado += amt;
            } else {
                totals[cur].aCobrar += amt;
                totals[cur].pendiente += amt;
            }
        });

        return totals;
    }, [data]);

    const renderPendingSales = () => {
        if (data.pendingSales.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-crm-border rounded-2xl bg-crm-surface">
                    <Target size={48} className="text-crm-fg-muted mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-crm-fg">Al día</h3>
                    <p className="text-sm text-crm-fg-muted max-w-md mt-2">No hay ventas pendientes de liquidar para este criterio.</p>
                </div>
            );
        }

        return (
            <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-crm-fg">
                        <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted">
                            <tr>
                                <th className="px-4 py-4">Vehículo</th>
                                <th className="px-4 py-4">Estado Venta</th>
                                <th className="px-4 py-4 text-right">Precio Venta</th>
                                <th className="px-4 py-4 text-right">Comisión Pactada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.pendingSales.map(s => (
                                <tr key={s._id} className="border-t border-crm-border hover:bg-crm-bg/50 transition-colors">
                                    <td className="px-4 py-3 font-bold">{s.vehicleId?.brand} {s.vehicleId?.model} ({s.vehicleId?.year})</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-blue-500/10 text-blue-400 border-blue-500/20">
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">{formatMoney(s.salePrice, s.saleCurrency)}</td>
                                    <td className="px-4 py-3 text-right font-black text-crm-success">
                                        {s.commissionSettings?.isManual ? 'Variable (Manual)' : `${s.commissionSettings?.sellerPct || 0}%`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderHistory = () => {
        if (data.settlements.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-crm-border rounded-2xl bg-crm-surface">
                    <History size={48} className="text-crm-fg-muted mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-crm-fg">Sin Historial</h3>
                    <p className="text-sm text-crm-fg-muted max-w-md mt-2">Aún no hay liquidaciones generadas para este criterio.</p>
                </div>
            );
        }

        return (
            <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-crm-fg">
                        <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted">
                            <tr>
                                <th className="px-4 py-4">Período</th>
                                <th className="px-4 py-4">Vendedor</th>
                                <th className="px-4 py-4">Fecha Creación</th>
                                <th className="px-4 py-4 text-center">Ventas</th>
                                <th className="px-4 py-4 text-right">Monto Liquidado</th>
                                <th className="px-4 py-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.settlements.map(s => (
                                <tr key={s._id} className="border-t border-crm-border hover:bg-crm-bg/50 transition-colors">
                                    <td className="px-4 py-3 font-bold">{s.period}</td>
                                    <td className="px-4 py-3">{s.username}</td>
                                    <td className="px-4 py-3 text-crm-fg-muted">{new Date(s.createdAt).toLocaleDateString('es-AR')}</td>
                                    <td className="px-4 py-3 text-center">{s.includedSales?.length || 0}</td>
                                    <td className="px-4 py-3 text-right font-black text-crm-success">{formatMoney(s.totalAmount, s.currency)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${getStatusBadge(s.status)}`}>
                                            {s.status || 'Sin estado'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <PermissionGuard permission={PERMISSIONS.COMISIONES_READ}>
            <div className="mx-auto w-full max-w-5xl p-4 pb-24 md:p-6">
                <CrmPageHeader
                    title="Mis Comisiones"
                    subtitle={canReadOthers ? "Gestión y seguimiento de honorarios de asesores." : "Seguimiento personal de honorarios y operaciones a liquidar."}
                    action={
                        canWrite ? (
                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 rounded-xl bg-crm-red px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600"
                            >
                                <Plus size={16} /> Cargar comisión manual
                            </button>
                        ) : null
                    }
                />

                {error && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-crm-warning/20 bg-crm-warning/10 p-4 text-sm font-bold text-crm-warning">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-4">
                            {canReadOthers && (
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                                    <select
                                        value={filterSeller}
                                        onChange={(e) => setFilterSeller(e.target.value)}
                                        className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red appearance-none"
                                    >
                                        <option value="">Todos los vendedores...</option>
                                        {users.map(u => (
                                            <option key={u._id} value={u.username}>{u.name || u.username} ({u.email})</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex-1 min-w-[200px]">
                                <input
                                    type="month"
                                    value={filterPeriod}
                                    onChange={(e) => {
                                        if (e.target.value && !/^\d{4}-\d{2}$/.test(e.target.value)) return;
                                        setFilterPeriod(e.target.value)
                                    }}
                                    className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                                />
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-3">Total a cobrar</h3>
                                <div className="space-y-2">
                                    <p className="text-xl font-black text-crm-success">{formatMoney(summaries.ARS.aCobrar, 'ARS')}</p>
                                    <p className="text-xl font-black text-crm-success">{formatMoney(summaries.USD.aCobrar, 'USD')}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-3">Pendiente</h3>
                                <div className="space-y-2">
                                    <p className="text-xl font-black text-crm-fg">{formatMoney(summaries.ARS.pendiente, 'ARS')}</p>
                                    <p className="text-xl font-black text-crm-fg">{formatMoney(summaries.USD.pendiente, 'USD')}</p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-3">Ya cobrado</h3>
                                <div className="space-y-2">
                                    <p className="text-xl font-black text-crm-fg-muted">{formatMoney(summaries.ARS.cobrado, 'ARS')}</p>
                                    <p className="text-xl font-black text-crm-fg-muted">{formatMoney(summaries.USD.cobrado, 'USD')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-crm-border">
                            <button
                                onClick={() => setActiveTab('pendientes')}
                                className={`px-4 py-3 text-sm font-black transition-colors ${activeTab === 'pendientes' ? 'border-b-2 border-crm-red text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg bg-transparent border-0 appearance-none'}`}
                            >
                                <span className="flex items-center gap-2"><TrendingUp size={16} /> Por Liquidar</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('historial')}
                                className={`px-4 py-3 text-sm font-black transition-colors ${activeTab === 'historial' ? 'border-b-2 border-crm-red text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg bg-transparent border-0 appearance-none'}`}
                            >
                                <span className="flex items-center gap-2"><History size={16} /> Historial de Pagos</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div>
                            {activeTab === 'pendientes' ? renderPendingSales() : renderHistory()}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Manual Commission */}
            {showModal && (
                <ManualCommissionModal
                    users={users}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        loadCommissions();
                    }}
                />
            )}
        </PermissionGuard>
    );
}

function ManualCommissionModal({ users, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        period: '',
        amount: '',
        type: 'bono',
        currency: 'USD',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!/^\d{4}-\d{2}$/.test(formData.period)) {
            toast.error('El periodo debe tener formato YYYY-MM');
            return;
        }

        const rawAmount = Number(formData.amount);
        if (!rawAmount || rawAmount === 0) {
            toast.error('El monto no puede ser cero');
            return;
        }

        // Frontend convierte el monto según el tipo
        const finalAmount = formData.type === 'bono' ? Math.abs(rawAmount) : -Math.abs(rawAmount);

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/finance/seller-commissions/manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: formData.username,
                    period: formData.period,
                    amount: finalAmount,
                    currency: formData.currency,
                    notes: formData.notes
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al cargar comisión');
            }

            toast.success('Comisión manual cargada exitosamente');
            onSuccess();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-crm-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between border-b border-crm-border bg-crm-bg p-4">
                    <h3 className="text-lg font-bold text-crm-fg">Cargar Comisión Manual</h3>
                    <button onClick={onClose} className="rounded-full p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-4 flex-1">
                    <form id="manual-comm-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Vendedor</label>
                            <select
                                required
                                value={formData.username}
                                onChange={e => setFormData({...formData, username: e.target.value})}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                            >
                                <option value="">Seleccionar vendedor...</option>
                                {users.map(u => (
                                    <option key={u._id} value={u.username}>{u.name || u.username} ({u.email})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Período (YYYY-MM)</label>
                            <input
                                type="month"
                                required
                                value={formData.period}
                                onChange={e => setFormData({...formData, period: e.target.value})}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Tipo</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                                >
                                    <option value="bono">Bono (+)</option>
                                    <option value="descuento">Descuento (-)</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Moneda</label>
                                <select
                                    value={formData.currency}
                                    onChange={e => setFormData({...formData, currency: e.target.value})}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                                >
                                    <option value="ARS">ARS</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Monto Bruto</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-bold text-crm-fg-muted">Notas</label>
                            <textarea
                                rows="3"
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value})}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-crm-fg outline-none focus:border-crm-red"
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="border-t border-crm-border bg-crm-bg p-4 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 font-bold text-crm-fg-muted hover:bg-crm-surface-raised"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="manual-comm-form"
                        disabled={loading}
                        className="rounded-xl bg-crm-red px-6 py-2 font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
