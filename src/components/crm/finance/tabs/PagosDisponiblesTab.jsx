import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CreditCard, Search, DollarSign, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinancePayables } from '../../../../hooks/useFinancePayables';
import CrmBadge from '../../ui/CrmBadge';

function OwnerPaymentModal({ isOpen, onClose, onSubmit, accounts = [], isSubmitting }) {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [accountId, setAccountId] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setCurrency('USD');
            setAccountId('');
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) {
            return toast.error('El monto debe ser mayor a 0');
        }
        if (!accountId) {
            return toast.error('Debe seleccionar una cuenta');
        }
        onSubmit({
            amount: Number(amount),
            currency,
            accountId,
            notes
        });
    };

    if (!isOpen) return null;

    const filteredAccounts = accounts.filter(a => a.currency === currency && a.isActive !== false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-black text-crm-fg">Registrar Pago a Propietario</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Monto</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                                placeholder="Ej: 5000"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Moneda</label>
                            <select
                                value={currency}
                                onChange={(e) => {
                                    setCurrency(e.target.value);
                                    setAccountId('');
                                }}
                                className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                            >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Cuenta Origen</label>
                        <select
                            required
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                        >
                            <option value="">Seleccionar cuenta...</option>
                            {filteredAccounts.map(acc => (
                                <option key={acc._id} value={acc._id}>
                                    {acc.name} ({acc.currency})
                                </option>
                            ))}
                        </select>
                        {filteredAccounts.length === 0 && (
                            <p className="text-xs text-crm-red flex items-center gap-1 mt-1">
                                <AlertCircle size={12} /> No hay cuentas activas en {currency}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Notas (Opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none min-h-[80px]"
                            placeholder="Detalles del pago..."
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-crm-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Procesando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function PagosDisponiblesTab({ accounts = [] }) {
    const { fetchPayables, registerOwnerPayment, loading } = useFinancePayables();
    const [payables, setPayables] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await fetchPayables({ status: statusFilter, search: searchTerm });
            setPayables(data);
        } catch (err) {
            toast.error(err.message || 'Error al cargar pagos');
        }
    }, [fetchPayables, statusFilter, searchTerm]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePaymentSubmit = async (payload) => {
        if (!selectedSaleId) return;
        setIsSubmitting(true);
        try {
            await registerOwnerPayment(selectedSaleId, payload);
            toast.success('Pago registrado correctamente');
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al registrar pago');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const metrics = useMemo(() => {
        let abonadoUSD = 0;
        let abonadoARS = 0;
        let pendientes = 0;

        payables.forEach(p => {
            if (p.paidToOwnerUSD > 0) abonadoUSD += p.paidToOwnerUSD;
            if (p.paidToOwnerARS > 0) abonadoARS += p.paidToOwnerARS;
            if (p.status === 'sin_pagos') pendientes++;
        });

        return { abonadoUSD, abonadoARS, pendientes };
    }, [payables]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">⏳ VENTAS PENDIENTES DE PAGO</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{metrics.pendientes}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">✅ YA ABONADO A PROPIETARIOS</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(metrics.abonadoUSD, 'USD')} / {formatMoney(metrics.abonadoARS, 'ARS')}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {['todos', 'sin_pagos', 'con_pagos'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setStatusFilter(filter)}
                                className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${
                                    statusFilter === filter
                                        ? 'border-crm-red text-crm-red'
                                        : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                {filter === 'todos' ? 'TODOS' : filter === 'sin_pagos' ? 'SIN PAGOS' : 'CON PAGOS'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar propietario o vehículo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 w-full rounded-lg border border-crm-border bg-crm-bg pl-9 pr-3 text-sm text-crm-fg focus:border-crm-red focus:outline-none"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Propietario / Vehículo</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Venta (Ref)</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Ref. Costo (Informativo)</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Abonado ARS/USD</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Estado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td>
                                </tr>
                            ) : payables.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <CreditCard className="text-crm-fg-muted" size={24} />
                                            </div>
                                            <h4 className="font-bold text-crm-fg">Aún no hay pagos disponibles</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">No se encontraron ventas activas con propietarios asociados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                payables.map(p => (
                                    <tr key={p.saleId} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-crm-fg text-sm">{p.ownerName}</div>
                                            <div className="text-xs text-crm-fg-muted">{p.vehicle?.name || p.vehicle?.brand || 'Sin vehículo'} {p.vehicle?.plateOrVin ? `(${p.vehicle.plateOrVin})` : ''}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-crm-fg text-sm">{formatMoney(p.salePrice, p.saleCurrency)}</div>
                                            <div className="text-xs text-crm-fg-muted text-[10px]">{p.saleId.slice(-6)}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {p.purchasePrice ? (
                                                <div className="text-sm text-crm-fg-subtle">{formatMoney(p.purchasePrice, p.purchaseCurrency)}</div>
                                            ) : (
                                                <span className="text-xs text-crm-fg-muted">N/D</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-crm-success">
                                                {p.paidToOwnerARS > 0 ? `${formatMoney(p.paidToOwnerARS, 'ARS')} ` : ''}
                                                {p.paidToOwnerUSD > 0 ? `${formatMoney(p.paidToOwnerUSD, 'USD')}` : ''}
                                                {p.paidToOwnerARS === 0 && p.paidToOwnerUSD === 0 ? '-' : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <CrmBadge variant={p.status === 'con_pagos' ? 'success' : 'warning'}>
                                                {p.status === 'con_pagos' ? 'CON PAGOS' : 'SIN PAGOS'}
                                            </CrmBadge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedSaleId(p.saleId);
                                                    setIsModalOpen(true);
                                                }}
                                                className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-crm-fg/10 px-3 text-xs font-black text-crm-fg hover:bg-crm-fg/20 transition"
                                            >
                                                <DollarSign size={12} /> Pagar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <OwnerPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handlePaymentSubmit}
                accounts={accounts}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}