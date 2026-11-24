// src/components/crm/stock/rotation/LiquidityRecoveryTool.jsx
"use client";

import React, { useState } from 'react';
import {
    Sparkles,
    DollarSign,
    Layers,
    Clock,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Scale
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

export default function LiquidityRecoveryTool({ vehicles = [], defaultCurrency = 'ARS', token }) {
    const [isOpen, setIsOpen] = useState(false);
    const [targetInput, setTargetInput] = useState('');
    const [currency, setCurrency] = useState(defaultCurrency);
    const [loading, setLoading] = useState(false);
    const [planData, setPlanData] = useState(null);
    const [selectedPackageIdx, setSelectedPackageIdx] = useState(0);

    const handleCalculatePlan = async (e) => {
        if (e) e.preventDefault();
        const amt = Number(targetInput);
        if (!amt || amt <= 0) {
            toast.error('Ingresá un importe objetivo de liquidez válido (mayor a 0).');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/admin/stock/rotation/liquidity-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetAmount: amt,
                    currency
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Error al calcular el plan');
            setPlanData(result.plan);
            setSelectedPackageIdx(0);
            toast.success('Plan de recuperación de capital calculado');
        } catch (error) {
            console.error('Error calculando plan de liquidez:', error);
            toast.error(error.message || 'Error al calcular plan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-purple-500/30 bg-crm-surface overflow-hidden transition-all shadow-sm">
            
            {/* Header del acordeón */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-crm-border/60"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black uppercase tracking-wider text-white">
                                Plan de Recuperación Estratégica de Capital
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Optimizador de Liquidez
                            </span>
                        </div>
                        <p className="text-xs text-crm-fg-muted">
                            Ingresá un objetivo de efectivo y el sistema identificará las combinaciones de stock para liberar capital con menor sacrificio de margen.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                    <span>{isOpen ? 'Ocultar Plan' : 'Desplegar Plan'}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Contenido desplegable */}
            {isOpen && (
                <div className="p-4 sm:p-5 space-y-5 animate-fadeIn">
                    
                    {/* Formulario de entrada */}
                    <form onSubmit={handleCalculatePlan} className="flex flex-wrap items-end gap-3 bg-crm-bg p-3.5 rounded-xl border border-crm-border">
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                Objetivo de Efectivo / Liquidez a Recuperar:
                            </label>
                            <div className="relative">
                                <DollarSign size={14} className="absolute left-3 top-3 text-purple-400" />
                                <input
                                    type="number"
                                    placeholder="Ej: 30000000"
                                    value={targetInput}
                                    onChange={(e) => setTargetInput(e.target.value)}
                                    className="w-full h-9 rounded-xl border border-crm-border bg-crm-surface pl-9 pr-3 text-xs text-white font-mono placeholder-crm-fg-subtle focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 w-28">
                            <label className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                Moneda:
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full h-9 rounded-xl border border-crm-border bg-crm-surface px-3 text-xs text-white font-bold focus:border-purple-500 focus:outline-none cursor-pointer"
                            >
                                <option value="ARS">ARS ($)</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="h-9 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {loading ? 'Calculando...' : 'Resolver Combinaciones'}
                        </button>
                    </form>

                    {/* Resultados del plan */}
                    {planData && planData.packages?.length > 0 && (
                        <div className="space-y-4">
                            
                            {/* Selector de paquetes */}
                            <div className="flex flex-wrap gap-2 border-b border-crm-border/60 pb-3">
                                {planData.packages.map((pkg, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedPackageIdx(idx)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                                            selectedPackageIdx === idx
                                                ? 'bg-purple-600 text-white shadow-sm'
                                                : 'bg-crm-bg border border-crm-border text-crm-fg-muted hover:text-white'
                                        }`}
                                    >
                                        <Layers size={13} />
                                        <span>{pkg.packageName}</span>
                                        <span className="font-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
                                            {pkg.totalUnits} un. ({pkg.coveragePct}%)
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Detalle del paquete activo */}
                            {planData.packages[selectedPackageIdx] && (() => {
                                const activePkg = planData.packages[selectedPackageIdx];
                                return (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl text-xs space-y-1">
                                            <p className="font-bold text-white flex items-center gap-1.5">
                                                <CheckCircle2 size={13} className="text-emerald-400" />
                                                {activePkg.description}
                                            </p>
                                            <p className="text-[11px] text-crm-fg-muted">
                                                {activePkg.notice}
                                            </p>
                                        </div>

                                        {/* Métricas clave del paquete */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                                            <div className="bg-crm-bg p-3 rounded-xl border border-crm-border">
                                                <span className="text-crm-fg-muted block text-[10px] font-sans">Capital Propio Liberable:</span>
                                                <strong className="text-base text-emerald-400">
                                                    {formatMoney(activePkg.accumulatedRecoverable, currency)}
                                                </strong>
                                                <span className="text-[10px] text-crm-fg-subtle block font-sans">
                                                    Objetivo: {formatMoney(activePkg.targetAmount, currency)} ({activePkg.coveragePct}%)
                                                </span>
                                            </div>

                                            <div className="bg-crm-bg p-3 rounded-xl border border-crm-border">
                                                <span className="text-crm-fg-muted block text-[10px] font-sans">Valor Lista de Unidades:</span>
                                                <strong className="text-base text-white">
                                                    {formatMoney(activePkg.accumulatedListValue, currency)}
                                                </strong>
                                                <span className="text-[10px] text-crm-fg-subtle block font-sans">
                                                    {activePkg.totalUnits} vehículos seleccionados
                                                </span>
                                            </div>

                                            <div className="bg-crm-bg p-3 rounded-xl border border-crm-border">
                                                <span className="text-crm-fg-muted block text-[10px] font-sans">Ganancia Proyectada:</span>
                                                <strong className="text-base text-cyan-400">
                                                    {formatMoney(activePkg.accumulatedNetProfit, currency)}
                                                </strong>
                                                <span className="text-[10px] text-crm-fg-subtle block font-sans">
                                                    Margen comercial retenido
                                                </span>
                                            </div>

                                            <div className="bg-crm-bg p-3 rounded-xl border border-crm-border">
                                                <span className="text-crm-fg-muted block text-[10px] font-sans">Rotación Promedio:</span>
                                                <strong className="text-base text-amber-300">
                                                    {activePkg.averageDaysInStock} días
                                                </strong>
                                                <span className="text-[10px] text-crm-fg-subtle block font-sans">
                                                    Antigüedad ponderada
                                                </span>
                                            </div>
                                        </div>

                                        {/* Tabla de unidades del paquete */}
                                        <div className="overflow-x-auto rounded-xl border border-crm-border">
                                            <table className="w-full text-left text-xs font-mono">
                                                <thead className="bg-crm-bg text-[10px] font-black uppercase text-crm-fg-muted border-b border-crm-border">
                                                    <tr>
                                                        <th className="p-2.5">Vehículo</th>
                                                        <th className="p-2.5 text-center">Antigüedad</th>
                                                        <th className="p-2.5 text-right">Precio Lista</th>
                                                        <th className="p-2.5 text-right">Capital Propio</th>
                                                        <th className="p-2.5 text-center">Prioridad</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-crm-border/60">
                                                    {activePkg.vehicles.map((v) => (
                                                        <tr key={v.carId} className="hover:bg-white/[0.02]">
                                                            <td className="p-2.5 font-sans">
                                                                <strong className="text-white">{v.brand} {v.name} ({v.year})</strong>
                                                                {v.plate && <span className="ml-1 text-[10px] text-crm-fg-muted">[{v.plate}]</span>}
                                                            </td>
                                                            <td className="p-2.5 text-center font-sans">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    v.daysInStock >= 90 ? 'bg-red-500/20 text-red-400' :
                                                                    v.daysInStock >= 60 ? 'bg-amber-500/20 text-amber-400' :
                                                                    'bg-cyan-500/20 text-cyan-300'
                                                                }`}>
                                                                    {v.daysInStock} d.
                                                                </span>
                                                            </td>
                                                            <td className="p-2.5 text-right text-white">
                                                                {formatMoney(v.price, currency)}
                                                            </td>
                                                            <td className="p-2.5 text-right text-emerald-400 font-bold">
                                                                {formatMoney(v.capitalOwnInvested, currency)}
                                                            </td>
                                                            <td className="p-2.5 text-center font-sans">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    v.priorityTier === 'Urgente' ? 'bg-red-500/20 text-red-400' :
                                                                    v.priorityTier === 'Alta' ? 'bg-amber-500/20 text-amber-400' :
                                                                    'bg-cyan-500/20 text-cyan-300'
                                                                }`}>
                                                                    {v.priorityTier} ({v.priorityScore} pts)
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                    </div>
                                );
                            })()}

                        </div>
                    )}

                </div>
            )}

        </div>
    );
}
