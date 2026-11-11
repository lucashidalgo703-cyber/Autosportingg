"use client";

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, ArrowRightLeft, Target, Wallet, LayoutDashboard } from 'lucide-react';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import toast from 'react-hot-toast';
import TesoreriaTransferModal from '../../../components/crm/finance/TransferModal';

const formatMoney = (amount, currency = 'ARS') => {
    return `${currency} ${Number(amount || 0).toLocaleString('es-AR')}`;
};

export default function TesoreriaPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [search, setSearch] = useState('');
    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
    const [isArqueoModalOpen, setArqueoModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('activos');

    const loadDashboard = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al cargar dashboard de tesorería');
            const json = await res.json();
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const handleTransferSubmit = async (formData) => {
        setIsSubmittingTransfer(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Error en la transferencia');
            }
            toast.success('Transferencia exitosa');
            await loadDashboard();
            setTransferModalOpen(false);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSubmittingTransfer(false);
        }
    };

    const getTabSales = (tabId) => {
        if (!data?.sales) return [];
        return data.sales.filter(s => {
            const status = String(s.status).toLowerCase();
            if (tabId === 'activos') {
                return ['señado', 'confirmada', 'pendiente_entrega'].includes(status);
            }
            if (tabId === 'procesados') {
                return ['entregada'].includes(status);
            }
            if (tabId === 'caidas') {
                return ['cancelada'].includes(status);
            }
            return false;
        });
    };

    const countActivos = getTabSales('activos').length;
    const countProcesados = getTabSales('procesados').length;
    const countCaidas = getTabSales('caidas').length;

    const tabSales = getTabSales(activeTab);
    const filteredSales = tabSales.filter(s => {
        const text = `${s.clientId?.fullName || s.clientId?.firstName || ''} ${s.clientId?.lastName || ''} ${s.vehicleId?.brand || ''} ${s.vehicleId?.name || ''} ${s.vehicleId?.plateOrVin || ''} ${s.salesperson || ''}`.toLowerCase();
        return text.includes(search.toLowerCase());
    });

    const totalArs = data?.accounts?.filter(a => a.currency === 'ARS').reduce((acc, a) => acc + (a.balance || 0), 0) || 0;
    const totalUsd = data?.accounts?.filter(a => a.currency === 'USD').reduce((acc, a) => acc + (a.balance || 0), 0) || 0;

    return (
        <PermissionGuard permission={PERMISSIONS.FINANZAS_READ}>
            <div className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-6">
                <CrmPageHeader
                    title="Expedientes Tesorería"
                    subtitle="Gestión de expedientes de tesorería y saldos de cajas."
                    actions={
                        <>
                            <button
                                onClick={() => setArqueoModalOpen(true)}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 text-sm font-bold text-crm-fg transition hover:bg-crm-surface-raised"
                            >
                                <Target size={16} />
                                Arqueo de Caja
                            </button>
                            <button
                                onClick={() => setTransferModalOpen(true)}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95"
                            >
                                <ArrowRightLeft size={16} />
                                Transferencia Interna
                            </button>
                        </>
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
                        {/* TABS DE EXPEDIENTES Y BÚSQUEDA */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-crm-border gap-4 pb-2">
                            <div className="flex gap-1 overflow-x-auto">
                                {[
                                    { id: 'activos', label: `Activos (${countActivos})` },
                                    { id: 'procesados', label: `Procesados (${countProcesados})` },
                                    { id: 'caidas', label: `Operaciones caídas (${countCaidas})` }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-3 text-sm font-black transition-colors shrink-0 ${activeTab === tab.id ? 'border-b-2 border-crm-red text-crm-red' : 'text-crm-fg-muted hover:text-crm-fg bg-transparent border-0 appearance-none'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative w-full md:w-64">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Buscar patente, cliente..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 w-full rounded-lg border border-crm-border bg-crm-surface pl-9 pr-3 text-sm text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* LISTADO DE EXPEDIENTES / VENTAS */}
                        {filteredSales.length > 0 ? (
                            <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-crm-fg">
                                        <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted">
                                            <tr>
                                                <th className="px-6 py-4">Cliente</th>
                                                <th className="px-6 py-4">Vehículo</th>
                                                <th className="px-6 py-4">Precio</th>
                                                <th className="px-6 py-4">Vendedor</th>
                                                <th className="px-6 py-4">Documentación</th>
                                                <th className="px-6 py-4">Estado</th>
                                                <th className="px-6 py-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSales.map(sale => (
                                                <tr key={sale._id} className="border-b border-crm-border last:border-0 hover:bg-crm-bg/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold">
                                                        {sale.clientId?.fullName || `${sale.clientId?.firstName || ''} ${sale.clientId?.lastName || ''}`}
                                                        {sale.clientId?.phone && <span className="block text-xs text-crm-fg-muted font-normal mt-0.5">{sale.clientId.phone}</span>}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="font-bold text-white block">{sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'N/A'}</span>
                                                        {sale.vehicleId?.plateOrVin && <span className="text-xs uppercase font-black tracking-wider text-crm-fg-muted">{sale.vehicleId.plateOrVin}</span>}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold">
                                                        {formatMoney(sale.salePrice, sale.saleCurrency)}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium">{sale.salesperson || 'Sin asignar'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${sale.documentationStatus === 'completo' ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'}`}>
                                                            {sale.documentationStatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-bold uppercase">{sale.status}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <a href={`/admin/ventas/${sale._id}`} className="text-xs font-black uppercase text-crm-red hover:underline inline-flex items-center gap-1">
                                                            Ver Expediente ↗
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-crm-border bg-crm-surface p-12 text-center shadow-sm">
                                <Target size={48} className="text-crm-border mb-4" />
                                <h3 className="text-lg font-black text-crm-fg">Sin expedientes</h3>
                                <p className="text-sm font-medium text-crm-fg-muted max-w-md mt-2">
                                    No se encontraron expedientes en esta pestaña que coincidan con la búsqueda.
                                </p>
                            </div>
                        )}

                        {/* SECCIÓN SECUNDARIA: CAJAS Y BANCOS ACTUALES */}
                        <div className="mt-12">
                            <h3 className="mb-4 text-lg font-black uppercase tracking-wider text-crm-fg-muted">Cajas y bancos actuales</h3>
                            
                            {/* SALDOS CONSOLIDADOS */}
                            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                    <h2 className="mb-4 text-base font-black text-crm-fg flex items-center gap-2">
                                        <Wallet className="text-crm-success" size={20} />
                                        Saldo Físico / Bancos (Total)
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-1">Total ARS</p>
                                            <p className="text-2xl font-black text-crm-fg">{formatMoney(totalArs, 'ARS')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-1">Total USD</p>
                                            <p className="text-2xl font-black text-crm-success">{formatMoney(totalUsd, 'USD')}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                    <h2 className="mb-4 text-base font-black text-crm-fg flex items-center gap-2">
                                        <LayoutDashboard className="text-amber-500" size={20} />
                                        Cuentas por Cobrar (Cuotas)
                                    </h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-1">A cobrar ARS</p>
                                            <p className="text-xl font-bold text-amber-500">{formatMoney(data?.cuentasPorCobrar?.ARS, 'ARS')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-1">A cobrar USD</p>
                                            <p className="text-xl font-bold text-amber-500">{formatMoney(data?.cuentasPorCobrar?.USD, 'USD')}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* CUENTAS DETALLADAS */}
                            <section className="mb-6">
                                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-crm-fg-muted">Desglose por Cuenta</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {data?.accounts?.map(acc => (
                                        <div key={acc._id} className="rounded-xl border border-crm-border bg-crm-surface p-4 flex flex-col">
                                            <span className="text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">{acc.name}</span>
                                            <span className="text-lg font-black text-crm-fg">{formatMoney(acc.balance, acc.currency)}</span>
                                            <span className="mt-2 text-[10px] text-crm-fg-subtle">{acc.type}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* CHEQUES */}
                            <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                <h2 className="mb-4 text-base font-black text-crm-fg flex items-center gap-2">
                                    <Banknote className="text-crm-blue" size={20} />
                                    Cheques en Cartera
                                </h2>
                                {data?.checks?.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-crm-fg">
                                            <thead className="bg-crm-bg text-xs font-bold uppercase text-crm-fg-muted">
                                                <tr>
                                                    <th className="px-4 py-3 rounded-l-lg">Número</th>
                                                    <th className="px-4 py-3">Banco</th>
                                                    <th className="px-4 py-3">Importe</th>
                                                    <th className="px-4 py-3">Emisión</th>
                                                    <th className="px-4 py-3">Vencimiento</th>
                                                    <th className="px-4 py-3 rounded-r-lg">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.checks.map(check => (
                                                    <tr key={check._id} className="border-b border-crm-border last:border-0 hover:bg-crm-bg/50 transition-colors">
                                                        <td className="px-4 py-3 font-medium">{check.number}</td>
                                                        <td className="px-4 py-3">{check.bank}</td>
                                                        <td className="px-4 py-3 font-bold">{formatMoney(check.amount, check.currency)}</td>
                                                        <td className="px-4 py-3">{new Date(check.issueDate).toLocaleDateString('es-AR')}</td>
                                                        <td className="px-4 py-3 text-amber-500 font-bold">{new Date(check.dueDate).toLocaleDateString('es-AR')}</td>
                                                        <td className="px-4 py-3 text-xs uppercase tracking-wider">{check.status.replace(/_/g, ' ')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-crm-fg-muted">No hay cheques en cartera registrados.</p>
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </div>

            <TesoreriaTransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setTransferModalOpen(false)}
                accounts={data?.accounts || []}
                onSubmit={handleTransferSubmit}
                isSubmitting={isSubmittingTransfer}
            />

            <ArqueoModal
                isOpen={isArqueoModalOpen}
                onClose={() => setArqueoModalOpen(false)}
                accounts={data?.accounts || []}
                onSuccess={loadDashboard}
            />
        </PermissionGuard>
    );
}

// === Subcomponents for Modals ===

function ArqueoModal({ isOpen, onClose, accounts, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        accountId: '',
        declaredBalance: '',
        notes: ''
    });

    if (!isOpen) return null;

    const selectedAccount = accounts.find(a => a._id === formData.accountId);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria/arqueo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...formData,
                    systemBalance: selectedAccount?.balance || 0
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Error al guardar arqueo');
            }
            toast.success('Arqueo registrado y auditado');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-crm-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4">
                    <h3 className="text-lg font-black text-crm-fg">Arqueo de Caja</h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-crm-fg">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Cuenta a arquear</label>
                        <select
                            required
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                            value={formData.accountId}
                            onChange={e => setFormData({...formData, accountId: e.target.value})}
                        >
                            <option value="">Seleccionar cuenta...</option>
                            {accounts.map(a => <option key={a._id} value={a._id}>{a.name} ({formatMoney(a.balance, a.currency)})</option>)}
                        </select>
                    </div>
                    {selectedAccount && (
                        <div className="p-3 bg-crm-bg rounded-lg border border-crm-border flex justify-between items-center text-sm">
                            <span className="text-crm-fg-muted">Saldo según sistema:</span>
                            <span className="font-bold text-crm-fg">{formatMoney(selectedAccount.balance, selectedAccount.currency)}</span>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Efectivo Físico Contado</label>
                        <input
                            type="number" required
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                            value={formData.declaredBalance}
                            onChange={e => setFormData({...formData, declaredBalance: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">Notas / Justificación</label>
                        <textarea
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg"
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            placeholder="Explicación si hay diferencia..."
                            rows={3}
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-crm-border mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-crm-fg-muted hover:text-crm-fg">Cancelar</button>
                        <button disabled={loading} type="submit" className="rounded-xl bg-crm-red-gradient px-6 py-2 text-sm font-black text-white shadow-crm-shadow-red disabled:opacity-50">
                            Guardar Arqueo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
