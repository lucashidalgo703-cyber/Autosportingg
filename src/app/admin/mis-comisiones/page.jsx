"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Wallet, History, Target, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';

const formatMoney = (amount, currency = 'ARS') => {
    return \`\${currency} \${Number(amount || 0).toLocaleString('es-AR')}\`;
};

const getStatusBadge = (status) => {
    const badges = {
        'borrador': 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        'revisada': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'aprobada': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'pagada': 'bg-crm-success/10 text-crm-success border-crm-success/20',
        'anulada': 'bg-crm-red/10 text-crm-red border-crm-red/20',
    };
    return badges[status] || badges['borrador'];
};

export default function MisComisionesPage() {
    const [data, setData] = useState({ settlements: [], pendingSales: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pendientes'); // 'pendientes' | 'historial'

    useEffect(() => {
        const loadCommissions = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const res = await fetch('/api/admin/my-commissions', {
                    headers: { 'Authorization': \`Bearer \${token}\` }
                });
                if (!res.ok) throw new Error('Error al cargar mis comisiones');
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadCommissions();
    }, []);

    const renderPendingSales = () => {
        if (data.pendingSales.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-crm-border rounded-2xl bg-crm-surface">
                    <Target size={48} className="text-crm-fg-muted mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-crm-fg">Al día</h3>
                    <p className="text-sm text-crm-fg-muted max-w-md mt-2">No tienes ventas pendientes de liquidar. ¡Sigue vendiendo para generar nuevas comisiones!</p>
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
                                <th className="px-4 py-4">Precio Venta</th>
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
                                    <td className="px-4 py-3">{formatMoney(s.salePrice, s.saleCurrency)}</td>
                                    <td className="px-4 py-3 text-right font-black text-crm-success">
                                        {s.commissionSettings?.isManual ? 'Variable (Manual)' : \`\${s.commissionSettings?.sellerPct || 0}%\`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-crm-bg p-4 border-t border-crm-border text-xs text-crm-fg-muted">
                    Estas ventas están confirmadas o entregadas y formarán parte de tu próxima liquidación.
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
                    <p className="text-sm text-crm-fg-muted max-w-md mt-2">Aún no tienes liquidaciones generadas.</p>
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
                                <th className="px-4 py-4">Fecha Creación</th>
                                <th className="px-4 py-4 text-center">Ventas Incluidas</th>
                                <th className="px-4 py-4 text-right">Monto Liquidado</th>
                                <th className="px-4 py-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.settlements.map(s => (
                                <tr key={s._id} className="border-t border-crm-border hover:bg-crm-bg/50 transition-colors">
                                    <td className="px-4 py-3 font-bold">{s.period}</td>
                                    <td className="px-4 py-3 text-crm-fg-muted">{new Date(s.createdAt).toLocaleDateString('es-AR')}</td>
                                    <td className="px-4 py-3 text-center">{s.includedSales?.length || 0}</td>
                                    <td className="px-4 py-3 text-right font-black text-crm-success">{formatMoney(s.totalAmount, s.currency)}</td>
                                    <td className="px-4 py-3">
                                        <span className={\`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide \${getStatusBadge(s.status)}\`}>
                                            {s.status}
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
                    subtitle="Seguimiento personal de honorarios y operaciones a liquidar."
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
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                                        <Clock size={20} />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-crm-fg-muted">Ventas Pendientes</h3>
                                </div>
                                <p className="text-3xl font-black text-crm-fg">{data.pendingSales.length}</p>
                                <p className="text-xs text-crm-fg-subtle mt-1">Esperando próxima liquidación</p>
                            </div>

                            <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-crm-success/10 text-crm-success rounded-lg">
                                        <Wallet size={20} />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-crm-fg-muted">Liquidaciones</h3>
                                </div>
                                <p className="text-3xl font-black text-crm-fg">{data.settlements.length}</p>
                                <p className="text-xs text-crm-fg-subtle mt-1">Histórico generado</p>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-crm-border">
                            <button
                                onClick={() => setActiveTab('pendientes')}
                                className={\`px-4 py-3 text-sm font-black transition-colors \${activeTab === 'pendientes' ? 'border-b-2 border-crm-red text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg bg-transparent border-0 appearance-none'}\`}
                            >
                                <span className="flex items-center gap-2"><TrendingUp size={16} /> Por Liquidar</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('historial')}
                                className={\`px-4 py-3 text-sm font-black transition-colors \${activeTab === 'historial' ? 'border-b-2 border-crm-red text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg bg-transparent border-0 appearance-none'}\`}
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
        </PermissionGuard>
    );
}
