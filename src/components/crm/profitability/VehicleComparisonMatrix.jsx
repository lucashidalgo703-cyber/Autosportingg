"use client";
import React from 'react';
import {
    Scale,
    TrendingUp,
    Clock,
    DollarSign,
    Users,
    AlertCircle,
    Info,
    X,
    CheckCircle2
} from 'lucide-react';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

export default function VehicleComparisonMatrix({ vehicles = [], onRemove, onClearAll, onViewDetail }) {
    if (vehicles.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-crm-border p-12 text-center bg-crm-surface/30">
                <Scale size={32} className="mx-auto text-crm-fg-subtle mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Sin vehículos seleccionados para comparar</h3>
                <p className="text-xs text-crm-fg-muted max-w-md mx-auto">
                    Seleccioná entre 2 y 4 vehículos en la tabla mediante las casillas de verificación para contrastar su rentabilidad real, márgenes y días de inmovilización lado a lado.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            
            {/* Header del comparador */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-crm-surface p-4 rounded-2xl border border-crm-border">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                        <Scale size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-white">
                            Matriz Comparativa de Rentabilidad Real ({vehicles.length} de 4)
                        </h3>
                        <p className="text-xs text-crm-fg-muted">
                            Prioriza ganancia real realizada, margen sobre costo y días de inmovilización. El ROI anualizado se exhibe como indicador secundario.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClearAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-crm-border bg-crm-bg text-xs font-bold text-crm-fg-muted hover:text-white transition-colors"
                >
                    <X size={13} /> Limpiar comparación
                </button>
            </div>

            {/* Tabla Comparativa en Columnas Priorizada */}
            <div className="overflow-x-auto rounded-2xl border border-crm-border bg-crm-surface custom-scrollbar">
                <table className="w-full border-collapse text-left text-xs">
                    <thead>
                        <tr className="border-b border-crm-border bg-crm-bg/80">
                            <th className="p-3.5 font-black uppercase tracking-wider text-crm-fg-muted w-52 sticky left-0 bg-crm-bg/95 z-10">
                                Métrica Clave
                            </th>
                            {vehicles.map((v) => (
                                <th key={v.carId} className="p-3.5 font-black text-white min-w-[220px]">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-black text-white">{v.brand} {v.name}</p>
                                            <p className="text-[10px] text-crm-fg-muted font-normal">
                                                Año {v.year} • {v.plateOrVin || 'Sin patente'}
                                            </p>
                                        </div>
                                        {onRemove && (
                                            <button
                                                type="button"
                                                onClick={() => onRemove(v.carId)}
                                                className="p-1 rounded text-crm-fg-subtle hover:text-white hover:bg-crm-surface transition-colors"
                                                title="Quitar de la comparación"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border/60 font-mono">
                        
                        {/* 1. PRIORIDAD 1: GANANCIA REAL (MARGEN COMERCIAL NETO) */}
                        <tr className="bg-emerald-500/10 border-b border-emerald-500/20">
                            <td className="p-3 font-sans font-black text-white sticky left-0 bg-crm-surface z-10">
                                ★ Margen Comercial Neto
                                <span className="block text-[10px] text-crm-fg-muted font-normal">
                                    Resultado neto total devengado
                                </span>
                            </td>
                            {vehicles.map(v => {
                                const val = v.vehicleType === 'sold' ? v.netProfit : v.potentialNetProfit;
                                return (
                                    <td key={v.carId} className={`p-3 font-black text-base ${
                                        val >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {formatMoney(val, v.currency)}
                                        <span className="block font-sans text-[10px] text-crm-fg-subtle font-normal">
                                            {v.vehicleType === 'sold' 
                                                ? (v.isDelivered ? 'Realizado Definitivo' : 'Devengado Condicional') 
                                                : 'Estimación Potencial'}
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>

                        {/* 1.1 Margen Agencia Propio */}
                        <tr className="bg-emerald-500/5">
                            <td className="p-3 font-sans font-bold text-emerald-300 sticky left-0 bg-crm-surface z-10">
                                ↳ Parte Neta de la Agencia
                            </td>
                            {vehicles.map(v => {
                                const val = v.vehicleType === 'sold' ? v.agencyNetProfit : v.potentialAgencyNetProfit;
                                return (
                                    <td key={v.carId} className="p-3 font-bold text-sm text-emerald-400">
                                        {formatMoney(val, v.currency)}
                                        <span className="block font-sans text-[10px] text-crm-fg-subtle font-normal">
                                            {v.participation?.agencyPercentage}% de participación
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>

                        {/* 2. PRIORIDAD 2: MARGEN % SOBRE COSTO */}
                        <tr className="bg-cyan-500/5">
                            <td className="p-3 font-sans font-black text-white sticky left-0 bg-crm-surface z-10">
                                ★ Margen % sobre Costo Real
                                <span className="block text-[10px] text-crm-fg-muted font-normal">
                                    Rentabilidad directa de la inversión
                                </span>
                            </td>
                            {vehicles.map(v => {
                                const pct = v.vehicleType === 'sold' ? v.marginOnCostPct : v.potentialMarginPct;
                                return (
                                    <td key={v.carId} className="p-3 text-cyan-400 font-black text-base">
                                        {pct !== null ? `${pct}%` : 'N/D'}
                                        <span className="block font-sans text-[10px] text-crm-fg-subtle font-normal">
                                            Sobre venta: {v.marginOnSalePct !== null ? `${v.marginOnSalePct}%` : 'N/D'}
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>

                        {/* 3. PRIORIDAD 3: DÍAS DE INMOVILIZACIÓN (ROTACIÓN) */}
                        <tr className="bg-amber-500/5">
                            <td className="p-3 font-sans font-black text-white sticky left-0 bg-crm-surface z-10">
                                ★ Días de Inmovilización
                                <span className="block text-[10px] text-crm-fg-muted font-normal">
                                    Tiempo de permanencia en inventario
                                </span>
                            </td>
                            {vehicles.map(v => {
                                const days = v.daysImmobilized || v.daysInStock || 1;
                                return (
                                    <td key={v.carId} className="p-3 font-sans">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black ${
                                            days >= 90 
                                                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                                : days >= 60
                                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                        }`}>
                                            <Clock size={12} /> {days} días
                                        </span>
                                        <span className="block text-[10px] text-crm-fg-subtle mt-0.5">
                                            {days >= 90 ? 'Rotación Crítica (+90d)' : days >= 60 ? 'Atención (+60d)' : 'Rotación Rápida'}
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>

                        {/* 4. Precio Venta / Lista */}
                        <tr>
                            <td className="p-3 font-sans font-bold text-crm-fg-muted sticky left-0 bg-crm-surface z-10">
                                Precio Venta / Lista
                            </td>
                            {vehicles.map(v => (
                                <td key={v.carId} className="p-3 text-white font-bold text-sm">
                                    {formatMoney(v.vehicleType === 'sold' ? v.agreedPrice : v.listPrice, v.currency)}
                                </td>
                            ))}
                        </tr>

                        {/* 5. Inversión y Capital Propio */}
                        <tr>
                            <td className="p-3 font-sans font-bold text-crm-fg-muted sticky left-0 bg-crm-surface z-10">
                                Inversión Total / Capital Propio
                            </td>
                            {vehicles.map(v => (
                                <td key={v.carId} className="p-3 text-crm-fg">
                                    <strong className="text-white block">
                                        {formatMoney(v.agencyCapitalInvested, v.currency)} (Propio)
                                    </strong>
                                    <span className="text-[10px] text-crm-fg-subtle">
                                        Total Op: {formatMoney(v.vehicleType === 'sold' ? v.totalCostWithSaleExpenses : v.totalEconomicCost, v.currency)}
                                    </span>
                                </td>
                            ))}
                        </tr>

                        {/* 6. Velocidad del Capital */}
                        <tr>
                            <td className="p-3 font-sans font-bold text-crm-fg-muted sticky left-0 bg-crm-surface z-10">
                                Velocidad del Capital ($ / día)
                            </td>
                            {vehicles.map(v => {
                                const daily = v.vehicleType === 'sold' 
                                    ? v.capitalEfficiency?.agencyDailyProfit 
                                    : v.capitalEfficiency?.potentialDailyProfit;
                                return (
                                    <td key={v.carId} className="p-3 text-emerald-400 font-bold">
                                        {formatMoney(daily, v.currency)} / día
                                    </td>
                                );
                            })}
                        </tr>

                        {/* 7. INDICADOR SECUNDARIO: ROI ANUALIZADO PROYECTADO */}
                        <tr className="bg-purple-500/10 border-t border-purple-500/20">
                            <td className="p-3 font-sans font-bold text-purple-300 sticky left-0 bg-crm-surface z-10">
                                <span>[Indicador Secundario]</span>
                                <span className="block font-black text-white">ROI Anualizado Proyectado</span>
                                <span className="block text-[10px] text-purple-400/80 font-normal">
                                    Proyección teórica a 365 días
                                </span>
                            </td>
                            {vehicles.map(v => {
                                const roi = v.vehicleType === 'sold'
                                    ? v.capitalEfficiency?.agencyAnnualizedRoiPct
                                    : v.capitalEfficiency?.potentialAnnualizedRoiPct;
                                return (
                                    <td key={v.carId} className="p-3 text-purple-300 font-bold text-xs">
                                        <span className="text-sm font-black text-white">
                                            {roi !== null ? `${roi}%` : 'N/D'}
                                        </span>
                                        <span className="block font-sans text-[10px] text-crm-fg-subtle font-normal mt-0.5">
                                            Teórico bajo reinversión continua
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>

                        {/* Acciones */}
                        <tr>
                            <td className="p-3 font-sans font-bold text-crm-fg-muted sticky left-0 bg-crm-surface z-10">
                                Acciones
                            </td>
                            {vehicles.map(v => (
                                <td key={v.carId} className="p-3 font-sans">
                                    {onViewDetail && (
                                        <button
                                            type="button"
                                            onClick={() => onViewDetail(v)}
                                            className="px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 text-xs font-bold transition-colors"
                                        >
                                            Ver Ficha Completa
                                        </button>
                                    )}
                                </td>
                            ))}
                        </tr>

                    </tbody>
                </table>
            </div>

            {/* Panel de Supuestos Identificados y Metodología */}
            <div className="rounded-2xl border border-blue-500/30 bg-crm-surface p-5 space-y-3">
                <div className="flex items-center gap-2 border-b border-crm-border/60 pb-3">
                    <Info size={16} className="text-blue-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        Metodología Contable y Supuestos del Comparador
                    </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-crm-fg-muted leading-relaxed">
                    <div className="space-y-1.5">
                        <p><strong className="text-white">1. Prioridad de Rentabilidad Real:</strong> Las decisiones comerciales deben basarse en el <strong className="text-emerald-400">Margen Comercial Neto</strong>, el <strong className="text-cyan-400">Margen % sobre Costo</strong> y los <strong className="text-amber-300">Días de Inmovilización</strong> reales. El ROI anualizado es una métrica secundaria complementaria.</p>
                        <p><strong className="text-white">2. Supuesto de Inmovilización:</strong> Los días se computan desde la fecha de ingreso físico al inventario hasta la fecha de venta confirmada (o fecha actual para stock).</p>
                    </div>
                    <div className="space-y-1.5">
                        <p><strong className="text-white">3. Carácter Secundario del ROI Anualizado:</strong> La fórmula <code className="bg-crm-bg px-1.5 py-0.5 rounded text-cyan-300 font-mono">(Margen / Inversión) × (365 / Días)</code> es una proyección teórica que asume la reinversión inmediata y total del capital a la misma tasa de margen durante 365 días.</p>
                        <p><strong className="text-white">4. No Duplicación de Permutas:</strong> Los vehículos recibidos en parte de pago transfieren su valor comercial acordado como costo base del nuevo activo sin generar doble reconocimiento de utilidades.</p>
                    </div>
                </div>
            </div>

        </div>
    );
}
