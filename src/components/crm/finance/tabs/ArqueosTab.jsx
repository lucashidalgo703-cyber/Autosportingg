import React, { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceCashCounts } from '../../../../hooks/useFinanceCashCounts';

function CashCountModal({ isOpen, onClose, onSubmit, isSubmitting, accounts = [] }) {
    const [accountId, setAccountId] = useState('');
    const [declaredBalance, setDeclaredBalance] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAccountId('');
            setDeclaredBalance('');
            setNotes('');
        }
    }, [isOpen]);

    const selectedAccount = accounts.find(a => a._id === accountId);
    const difference = selectedAccount && declaredBalance !== ''
        ? Number(declaredBalance) - selectedAccount.balance
        : 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!accountId) return toast.error('Selecciona una cuenta');
        if (declaredBalance === '') return toast.error('Ingresa el saldo físico contado');

        onSubmit({
            accountId,
            declaredBalance: Number(declaredBalance),
            notes
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-black text-crm-fg">Nuevo Arqueo</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Cuenta a Arquear</label>
                        <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                            <option value="">Seleccionar cuenta...</option>
                            {accounts.filter(a => a.isActive !== false).map(acc => (
                                <option key={acc._id} value={acc._id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </select>
                    </div>

                    {selectedAccount && (
                        <div className="rounded-lg bg-crm-surface-raised p-3 border border-crm-border space-y-1">
                            <p className="text-xs font-black text-crm-fg-muted uppercase">Saldo en Sistema</p>
                            <p className="text-lg font-bold text-crm-fg">
                                {selectedAccount.currency === 'USD' ? 'USD' : '$'} {selectedAccount.balance.toLocaleString('es-AR')}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Saldo Físico Declarado</label>
                        <input type="number" required step="0.01" value={declaredBalance} onChange={(e) => setDeclaredBalance(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Dinero real en la caja..." />
                    </div>

                    {selectedAccount && declaredBalance !== '' && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-xs font-black text-crm-fg-muted uppercase">Diferencia:</span>
                            <span className={`text-sm font-bold ${difference > 0 ? 'text-green-500' : difference < 0 ? 'text-crm-red' : 'text-crm-fg'}`}>
                                {difference > 0 ? '+' : ''}{difference.toLocaleString('es-AR')} {selectedAccount.currency}
                            </span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Notas (Opcional)</label>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: Faltó dar un vuelto..." />
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-crm-border">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition" disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50">
                            {isSubmitting ? 'Guardando...' : 'Confirmar Arqueo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ArqueosTab({ accounts = [] }) {
    const { fetchCashCounts, createCashCount, loading } = useFinanceCashCounts();
    const [counts, setCounts] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await fetchCashCounts();
            setCounts(data);
        } catch (err) {
            toast.error(err.message || 'Error al cargar arqueos');
        }
    }, [fetchCashCounts]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async (payload) => {
        setIsSubmitting(true);
        try {
            await createCashCount(payload);
            toast.success('Arqueo registrado');
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al guardar arqueo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-crm-fg">Arqueos de Caja</h2>
                        <p className="text-sm text-crm-fg-muted">Registra el conteo físico de dinero de tus cuentas operativas.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95">
                        <Plus size={14} /> Nuevo Arqueo
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Cuenta</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Sistema</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Físico</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Diferencia</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Usuario / Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td></tr>
                            ) : counts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <span className="text-2xl text-crm-fg-muted">🧾</span>
                                            <h4 className="font-bold text-crm-fg">Sin arqueos</h4>
                                            <p className="text-sm text-crm-fg-muted">No hay registros de arqueo de caja.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                counts.map(c => (
                                    <tr key={c._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3 text-sm text-crm-fg">{new Date(c.countedAt).toLocaleString('es-AR')}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{c.accountName}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg">{formatMoney(c.systemBalance, c.currency)}</td>
                                        <td className="px-4 py-3 text-sm text-crm-fg">{formatMoney(c.declaredBalance, c.currency)}</td>
                                        <td className="px-4 py-3 text-sm font-bold">
                                            <span className={c.difference > 0 ? 'text-green-500' : c.difference < 0 ? 'text-crm-red' : 'text-crm-fg-muted'}>
                                                {c.difference > 0 ? '+' : ''}{formatMoney(c.difference, c.currency)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-bold text-crm-fg">{c.createdBy || 'Sistema'}</p>
                                            {c.notes && <p className="text-xs text-crm-fg-muted max-w-[200px] truncate" title={c.notes}>{c.notes}</p>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <CashCountModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSave} isSubmitting={isSubmitting} accounts={accounts} />
        </div>
    );
}