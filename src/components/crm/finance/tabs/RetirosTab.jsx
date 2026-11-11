import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceWithdrawals } from '../../../../hooks/useFinanceWithdrawals';

function WithdrawalModal({ isOpen, onClose, onSubmit, accounts = [], isSubmitting }) {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [accountId, setAccountId] = useState('');
    const [personName, setPersonName] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setCurrency('USD');
            setAccountId('');
            setPersonName('');
            setReason('');
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return toast.error('El monto debe ser mayor a 0');
        if (!accountId) return toast.error('Debe seleccionar una cuenta');

        onSubmit({
            amount: Number(amount),
            currency,
            accountId,
            personName,
            reason,
            notes
        });
    };

    if (!isOpen) return null;

    const filteredAccounts = accounts.filter(a => a.currency === currency && a.isActive !== false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-black text-crm-fg">Registrar Retiro</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Monto</label>
                            <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: 1000" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Moneda</label>
                            <select value={currency} onChange={(e) => { setCurrency(e.target.value); setAccountId(''); }} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Cuenta Origen</label>
                        <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                            <option value="">Seleccionar cuenta...</option>
                            {filteredAccounts.map(acc => (
                                <option key={acc._id} value={acc._id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Persona (Opcional)</label>
                        <input type="text" value={personName} onChange={(e) => setPersonName(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="¿Quién retira?" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Motivo (Opcional)</label>
                        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: Gastos operativos" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-crm-border">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition" disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50">
                            {isSubmitting ? 'Procesando...' : 'Confirmar Retiro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function RetirosTab({ accounts = [] }) {
    const { fetchWithdrawals, createWithdrawal, loading } = useFinanceWithdrawals();
    const [withdrawals, setWithdrawals] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await fetchWithdrawals();
            setWithdrawals(data);
        } catch (err) {
            toast.error(err.message || 'Error al cargar retiros');
        }
    }, [fetchWithdrawals]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreate = async (payload) => {
        setIsSubmitting(true);
        try {
            await createWithdrawal(payload);
            toast.success('Retiro registrado exitosamente');
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al registrar retiro');
        } finally {
            setIsSubmitting(false);
        }
    };

    const metrics = useMemo(() => {
        let totalARS = 0;
        let totalUSD = 0;
        withdrawals.forEach(w => {
            if (w.currency === 'ARS') totalARS += w.amount;
            if (w.currency === 'USD') totalUSD += w.amount;
        });
        return { totalARS, totalUSD };
    }, [withdrawals]);

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL RETIROS USD</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(metrics.totalUSD, 'USD')}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL RETIROS ARS</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(metrics.totalARS, 'ARS')}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        <button className="h-9 rounded-none border-b-2 border-crm-red px-2 text-sm font-black text-crm-red transition">TODOS</button>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4 mt-4">
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 ml-auto">
                        <Plus size={14} /> Nuevo retiro
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Persona / Motivo</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr><td colSpan={3} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td></tr>
                            ) : withdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <span className="text-2xl text-crm-fg-muted">💸</span>
                                            </div>
                                            <h4 className="font-bold text-crm-fg">Sin retiros registrados</h4>
                                            <p className="text-sm text-crm-fg-muted max-w-sm">Registra el primero con "Nuevo retiro".</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                withdrawals.map(w => (
                                    <tr key={w._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3 text-sm text-crm-fg">{new Date(w.date).toLocaleDateString('es-AR')}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg">{w.description}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{formatMoney(w.amount, w.currency)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <WithdrawalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreate} accounts={accounts} isSubmitting={isSubmitting} />
        </div>
    );
}