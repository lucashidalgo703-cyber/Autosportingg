"use client";

import React, { useState, useEffect } from 'react';
import {
    SlidersHorizontal,
    Plus,
    Save,
    CheckCircle2,
    Briefcase,
    Landmark,
    CreditCard,
    User,
    Wrench,
    ShieldCheck,
    Car,
    TrendingUp,
    HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const BOX_OPTIONS = [
    { key: 'operativa', label: 'Caja Operativa' },
    { key: 'impuestos', label: 'Impuestos y Obligaciones' },
    { key: 'deudas', label: 'Caja Deudas' },
    { key: 'personal', label: 'Caja Personal' },
    { key: 'postventa', label: 'Fondo Postventa' },
    { key: 'reserva', label: 'Reserva de Liquidez' },
    { key: 'stock', label: 'Caja Stock / Vehículos' },
    { key: 'crecimiento', label: 'Fondo de Crecimiento' },
    { key: 'sin_asignar', label: 'Sin Asignar (Ambiguo)' }
];

export default function TreasuryCategoryRulesTab({
    categoryRules = [],
    treasuryToken,
    onSuccess
}) {
    const [rules, setRules] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [newBoxKey, setNewBoxKey] = useState('operativa');
    const [newNotes, setNewNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (categoryRules && categoryRules.length > 0) {
            setRules(categoryRules);
        }
    }, [categoryRules]);

    const handleBoxChange = (index, boxKey) => {
        setRules(prev => {
            const next = [...prev];
            next[index] = { ...next[index], boxKey };
            return next;
        });
    };

    const handleNotesChange = (index, notes) => {
        setRules(prev => {
            const next = [...prev];
            next[index] = { ...next[index], notes };
            return next;
        });
    };

    const handleAddRule = (e) => {
        e.preventDefault();
        if (!newCategory.trim()) {
            toast.error('Ingresá el nombre de la categoría');
            return;
        }

        const exists = rules.some(r => r.category.trim().toLowerCase() === newCategory.trim().toLowerCase());
        if (exists) {
            toast.error('Esta categoría ya cuenta con una regla definida');
            return;
        }

        setRules(prev => [
            ...prev,
            {
                category: newCategory.trim(),
                boxKey: newBoxKey,
                notes: newNotes.trim()
            }
        ]);

        setNewCategory('');
        setNewNotes('');
        toast.success('Regla agregada a la lista. Recordá presionar Guardar Cambios.');
    };

    const handleSaveRules = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({ rules })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al guardar reglas');
                return;
            }

            toast.success('Reglas de vinculación de gastos guardadas con éxito');
            if (onSuccess) onSuccess();
        } catch {
            toast.error('Error de red al guardar reglas.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-black text-white">Reglas y Presupuesto por Categoría</h2>
                    <p className="text-xs text-crm-fg-muted">
                        Vincula automáticamente las categorías de egresos de Finanzas con las Cajas estratégicas. Al cargar un gasto, comprometerá fondos de su caja asignada.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSaveRules}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                    <Save size={14} /> {isSaving ? 'Guardando...' : 'Guardar Reglas'}
                </button>
            </div>

            {/* Formulario para agregar nueva regla */}
            <form onSubmit={handleAddRule} className="rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3">
                    + Agregar o Vincular Nueva Categoría
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Categoría de Finanzas
                        </label>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Ej: Imprenta / Gestoría"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Caja Estratégica
                        </label>
                        <select
                            value={newBoxKey}
                            onChange={(e) => setNewBoxKey(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                        >
                            {BOX_OPTIONS.map(opt => (
                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Notas / Criterio
                        </label>
                        <input
                            type="text"
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            placeholder="Ej: Gastos de documentación de ventas"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="w-full rounded-xl border border-purple-500/30 bg-purple-500/15 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/25 transition-colors"
                        >
                            Agregar Regla
                        </button>
                    </div>
                </div>
            </form>

            {/* Tabla de reglas configuradas */}
            <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="border-b border-crm-border bg-crm-bg text-crm-fg-muted font-bold uppercase tracking-wider">
                        <tr>
                            <th className="p-3.5">Categoría en Finanzas</th>
                            <th className="p-3.5">Caja Destino Asignada</th>
                            <th className="p-3.5">Criterio / Observación</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {rules.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-6 text-center text-crm-fg-muted italic">
                                    No hay reglas de asignación registradas.
                                </td>
                            </tr>
                        ) : (
                            rules.map((rule, idx) => (
                                <tr key={rule.category} className="hover:bg-crm-surface-raised transition-colors">
                                    <td className="p-3.5 font-bold text-white">
                                        {rule.category}
                                    </td>
                                    <td className="p-3.5">
                                        <select
                                            value={rule.boxKey}
                                            onChange={(e) => handleBoxChange(idx, e.target.value)}
                                            className="rounded-lg border border-crm-border bg-crm-bg px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none font-bold"
                                        >
                                            {BOX_OPTIONS.map(opt => (
                                                <option key={opt.key} value={opt.key}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-3.5">
                                        <input
                                            type="text"
                                            value={rule.notes || ''}
                                            onChange={(e) => handleNotesChange(idx, e.target.value)}
                                            placeholder="Criterio de imputación..."
                                            className="w-full rounded-lg border border-crm-border bg-crm-bg px-2.5 py-1 text-xs text-crm-fg-muted focus:text-white focus:border-purple-500 focus:outline-none"
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
