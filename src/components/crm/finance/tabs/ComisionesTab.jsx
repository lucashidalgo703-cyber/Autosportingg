import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { parseResponseSafe } from '../../../../utils/apiHelper';
import CrmBadge from '../../ui/CrmBadge';
import ConfirmModal from '../../ui/ConfirmModal';

export default function ComisionesTab() {
    const [period, setPeriod] = useState('');
    const [statusFilter, setStatusFilter] = useState('pendiente');
    const [settlements, setSettlements] = useState([]);
    const [loading, setLoading] = useState(false);

    // For marking as paid
    const [confirmingPayment, setConfirmingPayment] = useState(null);
    const [paymentAccount, setPaymentAccount] = useState('');
    const [accounts, setAccounts] = useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = new URL(window.location.origin + '/api/admin/finance/seller-commissions');
            if (period) url.searchParams.append('period', period);
            if (statusFilter !== 'todas') url.searchParams.append('status', statusFilter);

            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            setSettlements(await parseResponseSafe(res));

            // Also fetch accounts for payment
            const accRes = await fetch('/api/admin/accounts', { headers: { Authorization: `Bearer ${token}` } });
            setAccounts(await parseResponseSafe(accRes));

        } catch (error) {
            toast.error('Error cargando comisiones: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [period, statusFilter]);

    const [paying, setPaying] = useState(false);

    const handleMarkPaid = async () => {
        if (!paymentAccount) return toast.error('Debe seleccionar una cuenta origen');
        if (paying) return;
        setPaying(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/settlements/${confirmingPayment._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: 'pagada', accountId: paymentAccount })
            });
            await parseResponseSafe(res);
            toast.success('Comisión marcada como pagada');
            setConfirmingPayment(null);
            setPaymentAccount('');
            fetchData();
        } catch (error) {
            toast.error('Error al pagar: ' + error.message);
        } finally {
            setPaying(false);
        }
    };

    const formatMoney = (amount, cur) => {
        return `${cur} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    // Metrics
    const totalPendienteUSD = settlements.filter(s => s.status !== 'pagada' && s.status !== 'anulada' && s.currency === 'USD').reduce((a, b) => a + b.totalAmount, 0);
    const totalPagadoUSD = settlements.filter(s => s.status === 'pagada' && s.currency === 'USD').reduce((a, b) => a + b.totalAmount, 0);
    const totalUSD = totalPendienteUSD + totalPagadoUSD;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL COMISIONES (VISIBLES)</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(totalUSD, 'USD')}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">YA PAGADAS ✅</h3>
                    <p className="mt-2 text-xl font-black text-crm-success">{formatMoney(totalPagadoUSD, 'USD')}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">PENDIENTES ⏳</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(totalPendienteUSD, 'USD')}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        <button
                            onClick={() => setStatusFilter('pendiente')}
                            className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${statusFilter === 'pendiente' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            PENDIENTES
                        </button>
                        <button
                            onClick={() => setStatusFilter('pagada')}
                            className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${statusFilter === 'pagada' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            PAGADAS
                        </button>
                        <button
                            onClick={() => setStatusFilter('todas')}
                            className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${statusFilter === 'todas' ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            TODAS
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="month"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="h-9 rounded-lg border border-crm-border bg-crm-bg px-3 text-xs font-bold text-crm-fg outline-none transition focus:border-crm-red"
                        />
                        {period && (
                            <button onClick={() => setPeriod('')} className="text-xs text-crm-fg-muted hover:text-crm-fg">Limpiar mes</button>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Período</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Usuario</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Ventas Incluidas</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Total</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Estado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-crm-fg-muted">Cargando comisiones...</td></tr>
                            ) : settlements.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <span className="text-2xl text-crm-fg-muted">🏆</span>
                                            </div>
                                            <h4 className="font-bold text-crm-fg">No hay liquidaciones encontradas</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">No existen comisiones que coincidan con los filtros aplicados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                settlements.map(s => (
                                    <tr key={s._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3 text-crm-fg font-medium">{s.period}</td>
                                        <td className="px-4 py-3 text-crm-fg font-bold">@{s.username}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg-muted">{s.includedSales?.length || 0} ventas</td>
                                        <td className="px-4 py-3 text-right font-black text-crm-fg">{formatMoney(s.totalAmount, s.currency)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <CrmBadge variant={s.status === 'pagada' ? 'success' : s.status === 'anulada' ? 'danger' : s.status === 'borrador' ? 'warning' : 'info'}>
                                                {s.status}
                                            </CrmBadge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {s.status !== 'pagada' && s.status !== 'anulada' && (
                                                <button
                                                    onClick={() => setConfirmingPayment(s)}
                                                    className="inline-flex items-center gap-1 rounded bg-crm-success/20 px-2 py-1 text-xs font-bold text-crm-success hover:bg-crm-success/30 transition"
                                                >
                                                    <Check size={12}/> Pagar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            <p className="text-[11px] font-bold text-crm-fg-muted uppercase tracking-wider mt-4">Las comisiones manuales y ajustes se gestionan desde el módulo nativo de Liquidaciones.</p>

            {confirmingPayment && (() => {
                const compatibleAccounts = accounts.filter(a => a.isActive !== false && a.currency === confirmingPayment.currency);
                return (
                    <ConfirmModal
                        isOpen={!!confirmingPayment}
                        onClose={() => {
                            if (!paying) setConfirmingPayment(null);
                        }}
                        onConfirm={handleMarkPaid}
                        title="Confirmar Pago de Comisión"
                        message={`¿Confirmás el pago de ${formatMoney(confirmingPayment.totalAmount, confirmingPayment.currency)} al usuario @${confirmingPayment.username}? Esta acción restará saldo de la cuenta origen seleccionada.`}
                        confirmText={paying ? "Pagando..." : "Confirmar Pago"}
                        isConfirmDisabled={paying || !paymentAccount}
                    >
                        <div className="mt-4">
                            <label className="block text-xs font-bold text-crm-fg-muted uppercase tracking-wider mb-2">Cuenta Origen de Pago</label>
                            {compatibleAccounts.length === 0 ? (
                                <p className="text-sm font-bold text-crm-red mt-2">No hay cuentas activas en esta moneda.</p>
                            ) : (
                                <select
                                    value={paymentAccount}
                                    onChange={(e) => setPaymentAccount(e.target.value)}
                                    disabled={paying}
                                    className="w-full h-10 rounded-lg border border-crm-border bg-crm-bg px-3 text-sm font-bold text-crm-fg outline-none transition focus:border-crm-red disabled:opacity-50"
                                >
                                    <option value="">-- Seleccionar cuenta --</option>
                                    {compatibleAccounts.map(acc => (
                                        <option key={acc._id} value={acc._id}>{acc.name} ({acc.currency}) - Saldo: {acc.balance}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </ConfirmModal>
                );
            })()}
        </div>
    );
}