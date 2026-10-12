"use client";

import React, { useState } from 'react';
import {
    Calendar,
    Car,
    TrendingUp,
    ShieldCheck,
    DollarSign,
    Wallet,
    AlertCircle,
    CheckCircle2,
    Info,
    SlidersHorizontal,
    ArrowRight
} from 'lucide-react';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

export default function TreasuryPlanningTab({
    planning = {},
    summary = {},
    boxes = [],
    verificationStatus = 'pendiente_verificar'
}) {
    const {
        availableToBuyARS = 0,
        availableToBuyUSD = 0,
        paymentCalendar = [],
        cashProjection = [],
        kangooSimulationPreset = {}
    } = planning;

    // Estado del simulador de compra
    const [simVehicle, setSimVehicle] = useState('Renault Kangoo');
    const [simCurrency, setSimCurrency] = useState('ARS');
    const [simTotalPrice, setSimTotalPrice] = useState(21200000);
    const [simSharePercent, setSimSharePercent] = useState(50);
    const [simExpenses, setSimExpenses] = useState(800000);

    // Cargar preset Kangoo 50% ($10.600.000)
    const handleLoadKangooPreset = () => {
        setSimVehicle('Renault Kangoo');
        setSimCurrency('ARS');
        setSimTotalPrice(21200000);
        setSimSharePercent(50);
        setSimExpenses(800000);
    };

    // Cálculos de la simulación
    const simOwnContribution = Math.round((simTotalPrice * (simSharePercent / 100)));
    const simTotalRequired = simOwnContribution + (Number(simExpenses) || 0);

    const availablePool = simCurrency === 'USD' ? availableToBuyUSD : availableToBuyARS;
    const isAffordable = availablePool >= simTotalRequired;
    const difference = availablePool - simTotalRequired;

    return (
        <div className="space-y-6">
            {/* Encabezado y Advertencia de Verificación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-black text-white">Planificación de Caja y Capacidad de Compra</h2>
                    <p className="text-xs text-crm-fg-muted">
                        Proyección conservadora de compromisos, liquidez no afectada y simulador de compras de stock sin alterar registros.
                    </p>
                </div>
                {verificationStatus === 'pendiente_verificar' && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300">
                        <AlertCircle size={14} /> Recomendaciones preliminares (Saldos pendientes de verificar)
                    </div>
                )}
            </div>

            {/* Tarjeta Destacada: Disponible para Comprar */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-crm-surface to-emerald-950/20 p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300">
                                <Car size={18} />
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                                Indicador Clave de Solvencia
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-white">Disponible para Comprar Stock</h3>
                        <p className="text-xs text-crm-fg-muted max-w-xl leading-relaxed">
                            Capital neto asignable a reposición de inventario tras proteger la <strong>Reserva de meses lentos</strong>, obligaciones tributarias y deudas comprometidas (descontados una sola vez).
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="rounded-xl border border-crm-border bg-crm-bg/80 p-3.5 min-w-[170px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                                Disponible en ARS
                            </span>
                            <p className="font-mono text-xl font-black text-cyan-300 mt-1">
                                {formatMoney(availableToBuyARS, 'ARS')}
                            </p>
                        </div>

                        <div className="rounded-xl border border-crm-border bg-crm-bg/80 p-3.5 min-w-[170px]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted block">
                                Disponible en USD
                            </span>
                            <p className="font-mono text-xl font-black text-emerald-400 mt-1">
                                {formatMoney(availableToBuyUSD, 'USD')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN SIMULADOR DE COMPRA */}
            <div className="rounded-2xl border border-purple-500/30 bg-crm-surface p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-crm-border">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                            <SlidersHorizontal size={18} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-white">Simulador de Compra de Vehículo</h3>
                            <span className="text-[10px] text-crm-fg-muted block">
                                Análisis previo de viabilidad sin crear movimientos ni afectar saldos reales
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleLoadKangooPreset}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors"
                    >
                        ⚡ Simular 50% de Kangoo ($10.600.000)
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Vehículo / Modelo
                        </label>
                        <input
                            type="text"
                            value={simVehicle}
                            onChange={(e) => setSimVehicle(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Precio Total ({simCurrency})
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={simTotalPrice}
                            onChange={(e) => setSimTotalPrice(Number(e.target.value) || 0)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 font-mono text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Participación Propia (%)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={simSharePercent}
                                onChange={(e) => setSimSharePercent(Number(e.target.value) || 0)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 font-mono text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                            />
                            <span className="text-xs font-bold text-purple-300">%</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Gastos de Alistamiento / Transf.
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            value={simExpenses}
                            onChange={(e) => setSimExpenses(Number(e.target.value) || 0)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 font-mono text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* Resultado del Simulador */}
                <div className={`rounded-2xl border p-4 sm:p-5 ${isAffordable ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                {isAffordable ? (
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                ) : (
                                    <AlertCircle size={18} className="text-red-400" />
                                )}
                                <h4 className={`text-sm font-black ${isAffordable ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {isAffordable
                                        ? 'Operación Viable: Se cuenta con liquidez disponible para la compra'
                                        : 'Capacidad Insuficiente: La compra comprometería fondos protegidos o de reserva'}
                                </h4>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Aporte propio ({simSharePercent}%): <strong>{formatMoney(simOwnContribution, simCurrency)}</strong> · Gastos: <strong>{formatMoney(simExpenses, simCurrency)}</strong> · Total requerido: <strong className="text-white">{formatMoney(simTotalRequired, simCurrency)}</strong>.
                            </p>
                        </div>

                        <div className="text-right shrink-0">
                            <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">
                                {isAffordable ? 'Margen Remanente Disponible' : 'Faltante de Capital'}
                            </span>
                            <span className={`font-mono text-lg font-black ${isAffordable ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatMoney(Math.abs(difference), simCurrency)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN PROYECCIÓN DE CAJA A 30, 60 Y 90 DÍAS */}
            <div className="space-y-3">
                <div>
                    <h3 className="text-sm font-black text-white">Proyección de Caja (Escenario Conservador)</h3>
                    <p className="text-xs text-crm-fg-muted">
                        Simula la solvencia de la empresa descontando gastos fijos y compromisos registrados, sin depender de ventas futuras ni de la Tracker pendiente.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cashProjection.map((proj, idx) => (
                        <div key={idx} className="rounded-2xl border border-crm-border bg-crm-surface p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-purple-300 uppercase tracking-wider">
                                    {proj.period}
                                </span>
                                <span className="rounded bg-crm-surface-raised px-2 py-0.5 text-[10px] font-bold text-crm-fg-muted">
                                    {proj.days} días
                                </span>
                            </div>

                            <div className="pt-2 border-t border-crm-border space-y-1 font-mono">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[11px] text-crm-fg-muted">Proyectado ARS</span>
                                    <span className={`font-bold ${proj.projectedARS >= 0 ? 'text-white' : 'text-red-400'}`}>
                                        {formatMoney(proj.projectedARS, 'ARS')}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-[11px] text-crm-fg-muted">Proyectado USD</span>
                                    <span className={`font-bold ${proj.projectedUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {formatMoney(proj.projectedUSD, 'USD')}
                                    </span>
                                </div>
                            </div>

                            <p className="text-[10px] text-crm-fg-muted leading-relaxed pt-2 border-t border-crm-border/60">
                                {proj.notes}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECCIÓN CALENDARIO DE PAGOS */}
            <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="p-4 border-b border-crm-border bg-crm-bg flex items-center justify-between">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                            Calendario de Pagos y Compromisos
                        </h3>
                        <span className="text-[10px] text-crm-fg-muted">
                            Egresos pendientes y gastos recurrentes calendarizados por caja
                        </span>
                    </div>
                    <span className="rounded-lg bg-crm-surface-raised px-2.5 py-1 text-xs font-bold text-crm-fg">
                        {paymentCalendar.length} compromisos
                    </span>
                </div>

                <div className="divide-y divide-crm-border">
                    {paymentCalendar.length === 0 ? (
                        <p className="p-6 text-center text-xs text-crm-fg-muted italic">
                            No hay compromisos pendientes de pago registrados en el calendario.
                        </p>
                    ) : (
                        paymentCalendar.map((item, idx) => (
                            <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-crm-surface-raised transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{item.description}</span>
                                        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                                            {item.boxName}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-crm-fg-muted">
                                        {item.category} {item.dueDateDay ? `· Vence día ${item.dueDateDay} de cada mes` : (item.date ? `· Fecha: ${new Date(item.date).toLocaleDateString('es-AR')}` : '')}
                                    </span>
                                </div>

                                <div className="text-right">
                                    <span className="font-mono font-bold text-red-400">
                                        -{formatMoney(item.amount, item.currency)}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
