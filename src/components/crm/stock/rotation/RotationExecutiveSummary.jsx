// src/components/crm/stock/rotation/RotationExecutiveSummary.jsx
"use client";

import React from 'react';
import {
    TrendingDown,
    Clock,
    AlertTriangle,
    DollarSign,
    ShieldAlert,
    CheckCircle2,
    Briefcase,
    Flame
} from 'lucide-react';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

export default function RotationExecutiveSummary({ kpis = {}, activeCurrency = 'ARS', onCurrencyChange }) {
    const cur = activeCurrency || 'ARS';

    const capitalSlow = kpis.capitalOwnImmobilizedSlowRotation?.[cur] || 0;
    const capitalTotal = kpis.totalCapitalOwnInStock?.[cur] || 0;
    const partnerCapital = kpis.totalPartnerCapitalInStock?.[cur] || 0;
    const inventoryListValue = kpis.totalInventoryListValue?.[cur] || 0;
    const recoverableLiquidity = kpis.potentialRecoverableLiquidity?.[cur] || 0;

    const avgSoldDays = kpis.averageSoldRotationDays || 0;
    const attentionCount = kpis.unitsRequiringAttentionCount || 0;
    const criticalCount = kpis.criticalUnitsCount || 0;
    const totalCount = kpis.totalStockCount || 0;

    return (
        <div className="space-y-4">
            
            {/* Header del resumen con selector de moneda explícito (sin mezclar ARS y USD) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-crm-border/60 pb-3">
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs">
                        📊
                    </span>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-white">
                            Diagnóstico Ejecutivo de Rotación & Capital
                        </h2>
                        <p className="text-[11px] text-crm-fg-muted">
                            Métricas canónicas calculadas sobre el stock físico. Monedas evaluadas de forma separada y estricta.
                        </p>
                    </div>
                </div>

                {/* Selector de moneda explícito */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-[11px] font-mono text-crm-fg-muted">Moneda de análisis:</span>
                    <div className="flex rounded-xl border border-crm-border bg-crm-bg p-0.5">
                        <button
                            type="button"
                            onClick={() => onCurrencyChange('ARS')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-black transition-colors ${
                                cur === 'ARS' ? 'bg-purple-600 text-white shadow-sm' : 'text-crm-fg-muted hover:text-white'
                            }`}
                        >
                            ARS
                        </button>
                        <button
                            type="button"
                            onClick={() => onCurrencyChange('USD')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-black transition-colors ${
                                cur === 'USD' ? 'bg-purple-600 text-white shadow-sm' : 'text-crm-fg-muted hover:text-white'
                            }`}
                        >
                            USD
                        </button>
                    </div>
                </div>
            </div>

            {/* Cuatro Indicadores Principales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Capital Propio en Baja Rotación (>60d) */}
                <div className="rounded-2xl border border-red-500/30 bg-crm-surface p-4 sm:p-5 relative overflow-hidden space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted" title="Capital propio invertido en unidades con más de 60 días inmovilizadas">
                            Capital Propio Lenta Rotación ({cur})
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                            <Flame size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-red-400 font-mono">
                        {formatMoney(capitalSlow, cur)}
                    </p>
                    <div className="space-y-1 pt-1 border-t border-crm-border/60 text-[11px] text-crm-fg-muted">
                        <div className="flex items-center justify-between">
                            <span>Total propio en stock:</span>
                            <strong className="text-white font-mono">{formatMoney(capitalTotal, cur)}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span>Capital de socios:</span>
                            <span className="text-purple-300 font-mono">{formatMoney(partnerCapital, cur)}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Rotación Promedio de Vendidos */}
                <div className="rounded-2xl border border-cyan-500/30 bg-crm-surface p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                            Rotación Promedio Histórica
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                            <Clock size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-cyan-400 font-mono">
                        {avgSoldDays} <span className="text-xs font-normal text-crm-fg-muted">días de venta</span>
                    </p>
                    <div className="space-y-1 pt-1 border-t border-crm-border/60 text-[11px] text-crm-fg-muted">
                        <div className="flex items-center justify-between">
                            <span>Objetivo saludable:</span>
                            <strong className="text-emerald-400 font-mono">≤ 45 días</strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span>Benchmark sectorial:</span>
                            <span className="text-white">35 a 55 días</span>
                        </div>
                    </div>
                </div>

                {/* 3. Unidades que Requieren Atención */}
                <div className="rounded-2xl border border-amber-500/30 bg-crm-surface p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                            Unidades en Atención
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                            <AlertTriangle size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-amber-300 font-mono">
                        {attentionCount} <span className="text-xs font-normal text-crm-fg-muted">de {totalCount} unidades</span>
                    </p>
                    <div className="space-y-1 pt-1 border-t border-crm-border/60 text-[11px] text-crm-fg-muted">
                        <div className="flex items-center justify-between">
                            <span className="text-red-400 flex items-center gap-1 font-bold">
                                <ShieldAlert size={10} /> Críticas (+90 días):
                            </span>
                            <strong className="text-red-400 font-mono">{criticalCount}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span>En seguimiento (61-90 d):</span>
                            <strong className="text-amber-300 font-mono">{Math.max(0, attentionCount - criticalCount)}</strong>
                        </div>
                    </div>
                </div>

                {/* 4. Liquidez Potencial Recuperable */}
                <div className="rounded-2xl border border-emerald-500/30 bg-crm-surface p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted" title="Capital propio neto recuperable mediante la venta del inventario">
                            Liquidez Potencial Recuperable ({cur})
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                            <DollarSign size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                        {formatMoney(recoverableLiquidity, cur)}
                    </p>
                    <div className="space-y-1 pt-1 border-t border-crm-border/60 text-[11px] text-crm-fg-muted">
                        <div className="flex items-center justify-between">
                            <span>Valor lista total:</span>
                            <strong className="text-white font-mono">{formatMoney(inventoryListValue, cur)}</strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span>Excluye permutas y socios</span>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
