import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useFinanceBudgets } from '../../../../hooks/useFinanceBudgets';
import CrmBadge from '../../ui/CrmBadge';
import ConfirmModal from '../../ui/ConfirmModal';

function BudgetModal({ isOpen, onClose, onSubmit, isSubmitting, initialData = null }) {
    const [category, setCategory] = useState('');
    const [plannedAmount, setPlannedAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setCategory(initialData.category);
                setPlannedAmount(initialData.plannedAmount);
                setCurrency(initialData.currency);
                setNotes(initialData.notes || '');
            } else {
                setCategory('');
                setPlannedAmount('');
                setCurrency('USD');
                setNotes('');
            }
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!category.trim()) return toast.error('Categoría es requerida');
        if (!plannedAmount || Number(plannedAmount) < 0) return toast.error('Monto inválido');

        onSubmit({
            category,
            plannedAmount: Number(plannedAmount),
            currency,
            notes
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-xl">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-lg font-black text-crm-fg">
                        {initialData ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Categoría</label>
                        <input type="text" required value={category} onChange={(e) => setCategory(e.target.value)} disabled={!!initialData} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none disabled:opacity-50" placeholder="Ej: Mantenimiento, Alquiler..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Monto Planeado</label>
                            <input type="number" required min="0" step="0.01" value={plannedAmount} onChange={(e) => setPlannedAmount(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Ej: 1500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-crm-fg-muted">Moneda</label>
                            <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!!initialData} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none disabled:opacity-50">
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-crm-fg-muted">Notas (Opcional)</label>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-fg focus:border-crm-red focus:outline-none" placeholder="Observaciones..." />
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

export default function PresupuestoTab() {
    const { fetchBudgets, createBudget, updateBudget, deleteBudget, loading } = useFinanceBudgets();
    const [budgets, setBudgets] = useState([]);

    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, id: null });

    const loadData = useCallback(async () => {
        try {
            const data = await fetchBudgets(selectedPeriod);
            setBudgets(data);
        } catch (err) {
            toast.error(err.message || 'Error al cargar presupuestos');
        }
    }, [fetchBudgets, selectedPeriod]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async (payload) => {
        setIsSubmitting(true);
        try {
            if (editingBudget) {
                await updateBudget(editingBudget._id, payload);
                toast.success('Presupuesto actualizado');
            } else {
                await createBudget({ ...payload, period: selectedPeriod });
                toast.success('Presupuesto creado');
            }
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al guardar presupuesto');
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
            await deleteBudget(id);
            toast.success('Eliminado');
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al eliminar');
        }
    };

    const formatMoney = (amount, currency = 'USD') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const openCreate = () => {
        setEditingBudget(null);
        setIsModalOpen(true);
    };

    const openEdit = (b) => {
        setEditingBudget(b);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-black text-crm-fg-muted uppercase">Mes:</label>
                        <input
                            type="month"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="rounded-lg border border-crm-border bg-crm-bg px-3 py-1.5 text-sm font-bold text-crm-fg focus:border-crm-red focus:outline-none"
                        />
                    </div>
                    <button onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red transition hover:opacity-95">
                        <Plus size={14} /> Nuevo Presupuesto
                    </button>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Categoría</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Presupuesto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Ejecutado</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Disponible</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Progreso</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-sm text-crm-fg-muted">Cargando...</td></tr>
                            ) : budgets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <span className="text-2xl text-crm-fg-muted">📊</span>
                                            <h4 className="font-bold text-crm-fg">Sin presupuestos</h4>
                                            <p className="text-sm text-crm-fg-muted">No hay metas presupuestadas para este mes.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                budgets.map(b => {
                                    const disponible = b.plannedAmount - b.executedAmount;
                                    const progress = b.plannedAmount > 0 ? (b.executedAmount / b.plannedAmount) * 100 : 0;
                                    const progressClamped = Math.min(progress, 100);
                                    let progressColor = 'bg-green-500';
                                    if (progress > 80) progressColor = 'bg-yellow-500';
                                    if (progress > 100) progressColor = 'bg-crm-red';

                                    return (
                                        <tr key={b._id} className="hover:bg-crm-surface-raised transition-colors">
                                            <td className="px-4 py-3 text-sm font-bold text-crm-fg">
                                                {b.category}
                                                {b.notes && <span className="ml-2 text-xs font-normal text-crm-fg-muted truncate max-w-[100px] inline-block align-bottom">{b.notes}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-crm-fg">{formatMoney(b.plannedAmount, b.currency)}</td>
                                            <td className="px-4 py-3 text-sm text-crm-fg">{formatMoney(b.executedAmount, b.currency)}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-crm-fg">
                                                <span className={disponible < 0 ? 'text-crm-red' : ''}>
                                                    {formatMoney(disponible, b.currency)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-24 rounded-full bg-crm-bg overflow-hidden">
                                                        <div className={`h-full ${progressColor} transition-all`} style={{ width: `${progressClamped}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-crm-fg-muted">{progress.toFixed(0)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => openEdit(b)} className="p-1.5 text-crm-fg-muted hover:text-crm-fg transition"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDelete(b._id)} className="p-1.5 text-crm-fg-muted hover:text-crm-red transition"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <BudgetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSave} isSubmitting={isSubmitting} initialData={editingBudget} />

            <ConfirmModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Presupuesto"
                message="¿Estás seguro de que deseas eliminar este presupuesto?"
                confirmText="Eliminar"
                isDestructive={true}
            />
        </div>
    );
}