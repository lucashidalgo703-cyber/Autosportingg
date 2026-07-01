import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceLoans } from '../../../../hooks/useFinanceLoans';
import CrmBadge from '../../ui/CrmBadge';

function LoanModal({ isOpen, onClose, onSubmit, accounts = [], isSubmitting }) {
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [accountId, setAccountId] = useState('');
    const [personName, setPersonName] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setCurrency('USD');
            setAccountId('');
            setPersonName('');
            setReason('');
        }
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || Number(amount) <= 0) return toast.error('El monto debe ser mayor a 0');
        if (!accountId) return toast.error('Debe seleccionar una cuenta');
        if (!personName.trim()) return toast.error('Debe especificar a quién se le presta');

        onSubmit({
            amount: Number(amount),
            currency,
            accountId,
            personName,
            reason
        });
    };

    if (!isOpen) return null;

    const filteredAccounts = accounts.filter(a => a.currency === currency && a.isActive !== false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-black text-crm-fg">Registrar Préstamo</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Monto a Prestar</label>
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
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Persona (Requerido)</label>
                        <input type="text" required value={personName} onChange={(e) => setPersonName(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="¿A quién le prestas?" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Motivo (Opcional)</label>
                        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: Préstamo personal" />
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-crm-border">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition" disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50">
                            {isSubmitting ? 'Procesando...' : 'Confirmar Préstamo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ReturnLoanModal({ isOpen, onClose, loan, accounts = [], onSubmit, isSubmitting }) {
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        if (!isOpen) setAccountId('');
    }, [isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!accountId) return toast.error('Selecciona la cuenta donde ingresa el dinero');
        onSubmit(loan._id, { status: 'devuelto', targetAccountId: accountId });
    };

    if (!isOpen || !loan) return null;

    const filteredAccounts = accounts.filter(a => a.currency === loan.currency && a.isActive !== false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <h3 className="text-lg font-black text-crm-fg mb-4">Devolver Préstamo</h3>
                <p className="text-sm text-crm-fg-muted mb-4">
                    Ingresarán <span className="font-bold text-crm-fg">{loan.currency} {loan.amount}</span> de {loan.personName}.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Cuenta Destino</label>
                        <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                            <option value="">Seleccionar cuenta...</option>
                            {filteredAccounts.map(acc => (
                                <option key={acc._id} value={acc._id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-crm-border">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition" disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50">
                            {isSubmitting ? 'Procesando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function PrestamosTab({ accounts = [] }) {
    const { fetchLoans, createLoan, updateLoanStatus, loading } = useFinanceLoans();
    const [loans, setLoans] = useState([]);
    const [filter, setFilter] = useState('activos'); // activos, devueltos, todos

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [loanToReturn, setLoanToReturn] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await fetchLoans();
            setLoans(data);
        } catch (err) {
            toast.error(err.message || 'Error al cargar préstamos');
        }
    }, [fetchLoans]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreate = async (payload) => {
        setIsSubmitting(true);
        try {
            await createLoan(payload);
            toast.success('Préstamo registrado exitosamente');
            setIsCreateModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al registrar préstamo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturn = async (id, payload) => {
        setIsSubmitting(true);
        try {
            await updateLoanStatus(id, payload);
            toast.success('Préstamo marcado como devuelto');
            setLoanToReturn(null);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al actualizar préstamo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredLoans = useMemo(() => {
        if (filter === 'activos') return loans.filter(l => l.status === 'pendiente');
        if (filter === 'devueltos') return loans.filter(l => l.status === 'devuelto');
        return loans;
    }, [loans, filter]);

    const metrics = useMemo(() => {
        let activos = 0;
        let adeudadoARS = 0;
        let adeudadoUSD = 0;
        loans.forEach(l => {
            if (l.status === 'pendiente') {
                activos++;
                if (l.currency === 'ARS') adeudadoARS += l.amount;
                if (l.currency === 'USD') adeudadoUSD += l.amount;
            }
        });
        return { activos, adeudadoARS, adeudadoUSD };
    }, [loans]);

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">PRÉSTAMOS ACTIVOS</h3>
                    <p className="mt-2 text-xl font-black text-crm-fg">{metrics.activos}</p>
                </div>
                <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">TOTAL ADEUDADO</h3>
                    <p className="mt-2 text-xl font-black text-crm-red">
                        {metrics.adeudadoUSD > 0 && <span>{formatMoney(metrics.adeudadoUSD, 'USD')}</span>}
                        {metrics.adeudadoARS > 0 && <span className="ml-2">{formatMoney(metrics.adeudadoARS, 'ARS')}</span>}
                        {metrics.adeudadoUSD === 0 && metrics.adeudadoARS === 0 && "$ 0"}
                    </p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {['activos', 'devueltos', 'todos'].map(f => (
                            <button key={f} onClick={() => setFilter(f)} className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${filter === f ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4 mt-4">
                    <button onClick={() => setIsCreateModalOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95 ml-auto">
                        <Plus size={14} /> Nuevo Préstamo
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Persona</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Motivo</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Estado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td></tr>
                            ) : filteredLoans.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                                                <span className="text-2xl text-crm-fg-muted">🤝</span>
                                            </div>
                                            <h4 className="font-bold text-crm-fg">Sin préstamos</h4>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLoans.map(l => (
                                    <tr key={l._id} className="hover:bg-crm-surface-raised transition-colors">
                                        <td className="px-4 py-3 text-sm text-crm-fg">{new Date(l.date).toLocaleDateString('es-AR')}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-crm-fg">{l.personName}</td>
                                        <td className="px-4 py-3 text-xs text-crm-fg-muted">{l.reason || '-'}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{formatMoney(l.amount, l.currency)}</td>
                                        <td className="px-4 py-3">
                                            <CrmBadge variant={l.status === 'devuelto' ? 'success' : 'warning'}>
                                                {l.status === 'devuelto' ? 'DEVUELTO' : 'PENDIENTE'}
                                            </CrmBadge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {l.status === 'pendiente' && (
                                                <button onClick={() => setLoanToReturn(l)} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-crm-fg/10 px-3 text-xs font-black text-crm-fg hover:bg-crm-fg/20 transition">
                                                    Marcar devuelto
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

            <LoanModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSubmit={handleCreate} accounts={accounts} isSubmitting={isSubmitting} />

            <ReturnLoanModal isOpen={!!loanToReturn} onClose={() => setLoanToReturn(null)} loan={loanToReturn} accounts={accounts} onSubmit={handleReturn} isSubmitting={isSubmitting} />
        </div>
    );
}