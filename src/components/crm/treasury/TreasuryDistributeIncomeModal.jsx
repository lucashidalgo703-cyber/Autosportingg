"use client";

import React, { useState, useEffect } from 'react';
import {
    X,
    ArrowDownRight,
    DollarSign,
    Wallet,
    ShieldCheck,
    Briefcase,
    Landmark,
    CreditCard,
    User,
    Wrench,
    Car,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Info,
    SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

const BOX_NAMES = {
    operativa: 'Caja Operativa',
    impuestos: 'Impuestos y Obligaciones',
    deudas: 'Caja Deudas',
    personal: 'Caja Personal',
    postventa: 'Fondo Postventa',
    reserva: 'Reserva de Liquidez',
    stock: 'Caja Stock / Vehículos',
    crecimiento: 'Fondo de Crecimiento'
};

const BOX_ICONS = {
    operativa: Briefcase,
    impuestos: Landmark,
    deudas: CreditCard,
    personal: User,
    postventa: Wrench,
    reserva: ShieldCheck,
    stock: Car,
    crecimiento: TrendingUp
};

export default function TreasuryDistributeIncomeModal({
    isOpen,
    onClose,
    income,
    boxes = [],
    treasuryToken,
    onSuccess
}) {
    const [allocations, setAllocations] = useState({});
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (income) {
            const initial = {};
            const suggested = income.suggestedDistribution || [];
            suggested.forEach(s => {
                initial[s.boxKey] = s.amount || 0;
            });
            setAllocations(initial);
            setNotes(`Distribución de cobro de ${income.category || 'Ingreso'} - ${income.description || ''}`);
        }
    }, [income]);

    if (!isOpen || !income) return null;

    const currency = income.currency || 'ARS';
    const totalCobrado = Number(income.totalAmount || 0);
    const terceros = Number(income.tercerosAmount || 0);
    const capitalPropio = Number(income.propioAmount || totalCobrado);

    const handleAmountChange = (boxKey, val) => {
        const num = parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
        setAllocations(prev => ({
            ...prev,
            [boxKey]: Math.max(0, num)
        }));
    };

    const handleApplySuggested = () => {
        const suggested = income.suggestedDistribution || [];
        const next = {};
        suggested.forEach(s => {
            next[s.boxKey] = s.amount || 0;
        });
        setAllocations(next);
        toast.success('Propuesta automática aplicada según prioridades y faltantes');
    };

    const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const remainingToAssign = capitalPropio - totalAllocated;
    const isOverAllocated = remainingToAssign < -0.01;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (totalAllocated <= 0) {
            toast.error('Debés asignar al menos un importe a alguna de las cajas.');
            return;
        }

        if (isOverAllocated) {
            toast.error(`La asignación excede el importe propio disponible (${formatMoney(Math.abs(remainingToAssign), currency)} de más).`);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const distributionPayload = Object.entries(allocations)
                .filter(([_, amt]) => Number(amt) > 0)
                .map(([boxKey, amt]) => ({
                    boxKey,
                    amount: Number(amt)
                }));

            const res = await fetch('/api/admin/tesoreria-estrategica/incomes/distribute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    incomeId: income.id,
                    distributions: distributionPayload,
                    notes
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al distribuir el cobro a cajas');
                return;
            }

            toast.success(data.message || 'Cobro distribuido exitosamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de red al registrar la distribución.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
            <div className="my-8 w-full max-w-2xl rounded-3xl border border-purple-500/30 bg-crm-surface p-6 sm:p-7 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-crm-border">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/15 text-purple-300">
                            <ArrowDownRight size={20} />
                        </span>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                                Dirección de Finanzas · Bandeja de Ingresos
                            </span>
                            <h2 className="text-base font-black text-white">Distribuir Cobro a Cajas</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-crm-fg-muted hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Resumen del Cobro y Separación de Fondos de Terceros */}
                <div className="mt-4 rounded-2xl border border-crm-border bg-crm-bg p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                                Cobro Registrado
                            </span>
                            <h3 className="text-sm font-black text-white">{income.description}</h3>
                            <span className="text-xs text-crm-fg-muted">
                                {income.category} · Cuenta: {income.accountName}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">Importe Total</span>
                            <span className="font-mono text-lg font-black text-emerald-400">
                                {formatMoney(totalCobrado, currency)}
                            </span>
                        </div>
                    </div>

                    {terceros > 0 && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90 flex items-start gap-2">
                            <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Separación de Capital de Terceros</p>
                                <p>{income.thirdPartyNote}</p>
                                <p className="mt-1 font-mono font-bold text-white">
                                    Monto Neto Propio a Distribuir: {formatMoney(capitalPropio, currency)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Barra de Progreso y Saldo Restante */}
                <div className="mt-4 rounded-2xl border border-crm-border bg-crm-surface-raised p-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">
                            Asignado: <span className="font-mono font-black text-purple-300">{formatMoney(totalAllocated, currency)}</span> ({Math.round((totalAllocated / capitalPropio) * 100) || 0}%)
                        </span>
                        <span className={`font-mono font-bold ${isOverAllocated ? 'text-red-400' : 'text-emerald-400'}`}>
                            {remainingToAssign >= 0 ? `Restante: ${formatMoney(remainingToAssign, currency)}` : `Excedido: ${formatMoney(Math.abs(remainingToAssign), currency)}`}
                        </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleApplySuggested}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            <SlidersHorizontal size={13} /> Aplicar propuesta sugerida por prioridades
                        </button>
                    </div>
                </div>

                {/* Formulario de Asignación por Caja */}
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {boxes.map((box) => {
                            const Icon = BOX_ICONS[box.key] || Briefcase;
                            const currentVal = allocations[box.key] || '';
                            const shortfall = currency === 'USD' ? (box.shortfallUSD || 0) : (box.shortfallARS || 0);

                            return (
                                <div key={box.key} className="flex items-center justify-between gap-3 rounded-xl border border-crm-border bg-crm-bg p-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-surface-raised text-crm-fg shrink-0">
                                            <Icon size={16} />
                                        </span>
                                        <div className="truncate">
                                            <p className="text-xs font-bold text-white truncate">{box.name}</p>
                                            <span className="text-[10px] text-crm-fg-muted block">
                                                Faltante: {formatMoney(shortfall, currency)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="relative w-36">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-crm-fg-muted">
                                                {currency}
                                            </span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={currentVal}
                                                onChange={(e) => handleAmountChange(box.key, e.target.value)}
                                                placeholder="0.00"
                                                className="w-full rounded-lg border border-crm-border bg-crm-surface pl-10 pr-2 py-1.5 font-mono text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Notas / Auditoría de la Distribución
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                            placeholder="Observación para el historial de las cajas..."
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-3 border-t border-crm-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-2.5 text-xs font-bold text-crm-fg-muted hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isOverAllocated || totalAllocated <= 0}
                            className="flex-1 rounded-xl bg-purple-600 p-2.5 text-xs font-black text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Distribuyendo...' : 'Confirmar Distribución'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
