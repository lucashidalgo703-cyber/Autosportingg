import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceRecurrences } from '../../../../hooks/useFinanceRecurrences';
import CrmBadge from '../../ui/CrmBadge';
import ConfirmModal from '../../ui/ConfirmModal';

function RecurrenceModal({ isOpen, onClose, onSubmit, isSubmitting, accounts = [], initialData = null }) {
    const [name, setName] = useState('');
    const [type, setType] = useState('Egreso');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('ARS');
    const [dayOfMonth, setDayOfMonth] = useState('');
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setType(initialData.type);
                setCategory(initialData.category);
                setAmount(initialData.amount);
                setCurrency(initialData.currency);
                setDayOfMonth(initialData.dayOfMonth);
                setAccountId(initialData.accountId?._id || initialData.accountId);
            } else {
                setName('');
                setType('Egreso');
                setCategory('');
                setAmount('');
                setCurrency('ARS');
                setDayOfMonth('1');
                setAccountId('');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !category.trim()) return toast.error('Nombre y categoría son requeridos');
        if (!amount || Number(amount) <= 0) return toast.error('Monto debe ser mayor a 0');
        if (!accountId) return toast.error('Selecciona una cuenta');
        if (Number(dayOfMonth) < 1 || Number(dayOfMonth) > 31) return toast.error('Día debe ser entre 1 y 31');

        onSubmit({
            name, type, category,
            amount: Number(amount),
            currency,
            dayOfMonth: Number(dayOfMonth),
            accountId
        });
    };

    if (!isOpen) return null;

    const filteredAccounts = accounts.filter(a => a.currency === currency && a.isActive !== false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-black text-crm-fg">
                        {initialData ? 'Editar Recurrencia' : 'Nueva Recurrencia'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Nombre</label>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: Alquiler Local" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Tipo</label>
                            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                                <option value="Egreso">Egreso</option>
                                <option value="Ingreso">Ingreso</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Día del mes</label>
                            <input type="number" required min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Categoría Contable</label>
                        <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: Alquiler" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Monto</label>
                            <input type="number" required min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" />
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
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Cuenta Asociada</label>
                        <select required value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none">
                            <option value="">Seleccionar cuenta...</option>
                            {filteredAccounts.map(acc => (
                                <option key={acc._id} value={acc._id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-crm-border">
                        <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-black text-crm-fg-muted hover:bg-crm-bg transition" disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-crm-red-gradient px-4 py-2 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95 disabled:opacity-50">
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function RecurrenciasTab({ accounts = [] }) {
    const { fetchRecurrences, createRecurrence, updateRecurrence, deleteRecurrence, generateMonth, loading } = useFinanceRecurrences();
    const [rules, setRules] = useState([]);

    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null });
    const [confirmGenerateModal, setConfirmGenerateModal] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const data = await fetchRecurrences(true);
            setRules(data);
        } catch (err) {
            toast.error(err.message || 'Error al cargar recurrencias');
        }
    }, [fetchRecurrences]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async (payload) => {
        setIsSubmitting(true);
        try {
            if (editingRule) {
                await updateRecurrence(editingRule._id, payload);
                toast.success('Regla actualizada');
            } else {
                await createRecurrence(payload);
                toast.success('Regla creada');
            }
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al guardar regla');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        setConfirmDeleteModal({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDeleteModal.id;
        if (!id) return;
        try {
            await deleteRecurrence(id);
            toast.success('Recurrencia eliminada');
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al eliminar');
        }
    };

    const handleToggleActive = async (rule) => {
        try {
            await updateRecurrence(rule._id, { isActive: !rule.isActive });
            toast.success(rule.isActive ? 'Recurrencia pausada' : 'Recurrencia activada');
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al cambiar estado');
        }
    };

    const handleGenerate = () => {
        setConfirmGenerateModal(true);
    };

    const confirmGenerate = async () => {
        setIsSubmitting(true);
        try {
            const res = await generateMonth(selectedPeriod);
            toast.success(`Generación completada: ${res.created} creadas, ${res.skipped} omitidas, ${res.errors} errores.`);
        } catch (err) {
            toast.error(err.message || 'Error al generar mes');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const openCreate = () => {
        setEditingRule(null);
        setIsModalOpen(true);
    };

    const openEdit = (r) => {
        setEditingRule(r);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-black text-crm-fg-muted uppercase">Mes a Generar:</label>
                        <input
                            type="month"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="rounded-lg border border-crm-border bg-crm-bg px-3 py-1.5 text-sm font-bold text-crm-fg focus:border-crm-red focus:outline-none"
                        />
                        <button onClick={handleGenerate} disabled={isSubmitting} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-fg px-4 text-xs font-black text-crm-bg transition hover:bg-crm-fg/90 disabled:opacity-50">
                            <PlayCircle size={14} /> {isSubmitting ? 'Generando...' : 'Generar Mes'}
                        </button>
                    </div>
                    <button onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95">
                        <Plus size={14} /> Nueva Recurrencia
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Día</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Nombre / Categoría</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Cuenta</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td></tr>
                            ) : rules.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <span className="text-2xl text-crm-fg-muted">🔄</span>
                                            <h4 className="font-bold text-crm-fg">Sin recurrencias</h4>
                                            <p className="text-sm text-crm-fg-muted">Configura pagos o cobros automáticos.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rules.map(r => (
                                    <tr key={r._id} className={`hover:bg-crm-surface-raised transition-colors ${!r.isActive ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">{r.dayOfMonth}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-bold text-crm-fg">{r.name}</p>
                                            <p className="text-xs text-crm-fg-muted">{r.category} ({r.type})</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-crm-fg">
                                            <span className={r.type === 'Egreso' ? 'text-crm-red' : 'text-green-500'}>
                                                {r.type === 'Egreso' ? '-' : '+'}{formatMoney(r.amount, r.currency)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-crm-fg">{r.accountId?.name || '---'}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                                            <button onClick={() => handleToggleActive(r)} className={`p-1.5 transition ${r.isActive ? 'text-crm-fg-muted hover:text-crm-warning' : 'text-crm-warning hover:text-green-500'}`} title={r.isActive ? 'Pausar' : 'Activar'}><CheckCircle2 size={14} /></button>
                                            <button onClick={() => openEdit(r)} className="p-1.5 text-crm-fg-muted hover:text-crm-fg transition" title="Editar"><Edit2 size={14} /></button>
                                            <button onClick={() => handleDelete(r._id)} className="p-1.5 text-crm-fg-muted hover:text-crm-red transition" title="Eliminar"><Trash2 size={14} /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <RecurrenceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSave} accounts={accounts} isSubmitting={isSubmitting} initialData={editingRule} />

            <ConfirmModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Desactivar Recurrencia"
                message="¿Estás seguro de que deseas desactivar esta recurrencia? Se guardará en la auditoría pero ya no generará transacciones."
                confirmText="Desactivar"
                isDestructive={true}
            />

            <ConfirmModal
                isOpen={confirmGenerateModal}
                onClose={() => setConfirmGenerateModal(false)}
                onConfirm={confirmGenerate}
                title="Generar Transacciones"
                message={`¿Generar transacciones para ${selectedPeriod}? Esto solo creará las transacciones que no hayan sido generadas antes para este mes.`}
                confirmText="Generar"
                isDestructive={false}
            />
        </div>
    );
}