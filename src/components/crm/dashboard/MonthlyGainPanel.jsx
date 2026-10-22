import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Target,
    Info,
    X,
    Search,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    Car,
    ArrowUpRight,
    Wallet,
    Layers,
    Clock,
    ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(value) {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return new Intl.NumberFormat('es-AR').format(Math.round(value));
}

function formatUSD(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Math.round(value));
}

function formatCompact(value, currency = 'USD') {
    if (value === null || value === undefined || isNaN(value)) return '0';
    const num = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (currency === 'USD') {
        if (num >= 1000000) return `${sign}${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${sign}${(num / 1000).toFixed(1)}k`;
        return `${sign}${Math.round(num)}`;
    } else {
        if (num >= 1000000) return `${sign}${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${sign}${(num / 1000).toFixed(0)}k`;
        return `${sign}${Math.round(num)}`;
    }
}

export default function MonthlyGainPanel({
    gainsData = null,
    selectedDate = new Date(),
    canSeeFinancials = true,
    hideAmounts = false,
    dolarBlue = null
}) {
    // 1. Selector de Métrica: 'projected' (Ganancia Comercial) | 'released' (Ganancia Cobrada / Liberada)
    const [metricMode, setMetricMode] = useState('projected');
    const isProjected = metricMode === 'projected';

    // 2. Selector de Moneda: 'USD' | 'ARS'
    const [currency, setCurrency] = useState('USD');
    const isUSD = currency === 'USD';

    // 3. Configuración de Objetivo mensual (sincronizado con backend CrmSettings)
    const initialTargetUSD = Number(gainsData?.cockpitTargetUSD) || 110000;
    const [objectiveUSD, setObjectiveUSD] = useState(initialTargetUSD);
    const [showTargetModal, setShowTargetModal] = useState(false);
    const [tempTargetInput, setTempTargetInput] = useState(String(initialTargetUSD));
    const [isSavingTarget, setIsSavingTarget] = useState(false);
    const [forceScaleWithTarget, setForceScaleWithTarget] = useState(false);
    const [showTargetLine, setShowTargetLine] = useState(true);

    // 4. Modal de Auditoría / Detalle de operaciones
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditMonthFilter, setAuditMonthFilter] = useState('ALL'); // 'ALL' | monthKey
    const [auditSearchQuery, setAuditSearchQuery] = useState('');

    // 5. Interacción con las barras (hover)
    const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);

    // Sincronizar objetivo con backend o localStorage
    useEffect(() => {
        if (gainsData?.cockpitTargetUSD && Number(gainsData.cockpitTargetUSD) > 0) {
            setObjectiveUSD(Number(gainsData.cockpitTargetUSD));
            setTempTargetInput(String(gainsData.cockpitTargetUSD));
            try {
                localStorage.setItem('crm_cockpit_monthly_target_usd', String(gainsData.cockpitTargetUSD));
            } catch {}
            return;
        }
        try {
            const saved = localStorage.getItem('crm_cockpit_monthly_target_usd');
            if (saved && !isNaN(Number(saved)) && Number(saved) > 0) {
                setObjectiveUSD(Number(saved));
                setTempTargetInput(saved);
            }
        } catch {}
    }, [gainsData?.cockpitTargetUSD]);

    // Guardar objetivo mensual con persistencia en backend
    const handleSaveTarget = async (val) => {
        const num = Number(val);
        if (!Number.isFinite(num) || num <= 0) {
            toast.error('Ingrese un objetivo mensual válido mayor a 0');
            return;
        }

        setIsSavingTarget(true);
        setObjectiveUSD(num);
        try {
            localStorage.setItem('crm_cockpit_monthly_target_usd', String(num));
        } catch {}

        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch('/api/admin/dashboard/cockpit-target', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ targetUSD: num })
            });

            if (res.ok) {
                toast.success(`Objetivo mensual de USD ${formatNumber(num)} guardado en el CRM.`);
            } else {
                const errData = await res.json().catch(() => ({}));
                toast(
                    `Objetivo guardado en tu navegador. (${errData.message || 'Sin permisos para cambiar la meta global'})`,
                    { icon: '⚠️' }
                );
            }
        } catch (err) {
            toast('Objetivo guardado localmente en este equipo.', { icon: 'ℹ️' });
        } finally {
            setIsSavingTarget(false);
            setShowTargetModal(false);
        }
    };

    // Tasa Dólar Blue actual de referencia
    const currentBlueRate = (dolarBlue && Number(dolarBlue.rate) > 0) ? Number(dolarBlue.rate) : 1565;

    // Colección activa según la métrica seleccionada
    const activeDataSet = useMemo(() => {
        if (metricMode === 'released' && gainsData?.released) {
            return gainsData.released;
        }
        return gainsData?.projected || gainsData;
    }, [metricMode, gainsData]);

    // Meses de los últimos 12 meses para el gráfico
    const months = useMemo(() => {
        if (!activeDataSet || !Array.isArray(activeDataSet.months) || activeDataSet.months.length === 0) {
            return Array.from({ length: 12 }).map((_, i) => {
                const d = new Date(selectedDate);
                d.setDate(1);
                d.setMonth(d.getMonth() - (11 - i));
                const shortLabel = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).toUpperCase();
                return {
                    index: i,
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                    label: shortLabel,
                    fullLabel: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
                    isCurrentMonth: i === 11,
                    isSelectedMonth: i === 11,
                    salesCount: 0,
                    gainARS: 0,
                    gainUSD: 0,
                    incompleteCount: 0,
                    status: 'empty',
                    sales: []
                };
            });
        }
        return activeDataSet.months;
    }, [activeDataSet, selectedDate]);

    // Resúmenes globales de la métrica activa
    const totalAccumulated = isUSD
        ? (activeDataSet?.totalAccumulatedUSD ?? months.reduce((acc, m) => acc + (m.gainUSD || 0), 0))
        : (activeDataSet?.totalAccumulatedARS ?? months.reduce((acc, m) => acc + (m.gainARS || 0), 0));

    const totalOperationsCount = activeDataSet?.totalSalesCount12m ?? months.reduce((acc, m) => acc + (m.salesCount || 0), 0);
    const activeMonthsCount = activeDataSet?.activeMonthsCount || months.filter(m => m.salesCount > 0).length || 1;
    const monthlyAverage = Math.round(totalAccumulated / (activeMonthsCount || 1));

    // Valor del objetivo en la moneda activa
    const targetValue = isUSD ? objectiveUSD : Math.round(objectiveUSD * currentBlueRate);

    // Máximo y mínimo valor real registrado en los 12 meses
    const maxRealValue = useMemo(() => {
        const values = months.map(m => (isUSD ? (m.gainUSD || 0) : (m.gainARS || 0)));
        return Math.max(...values, 0);
    }, [months, isUSD]);

    const minRealValue = useMemo(() => {
        const values = months.map(m => (isUSD ? (m.gainUSD || 0) : (m.gainARS || 0)));
        return Math.min(...values, 0);
    }, [months, isUSD]);

    // Determinar si el objetivo está fuera de escala respecto a la realidad histórica
    const isTargetOutOfScale = targetValue > (maxRealValue * 1.5);

    // Techo de escala para el gráfico
    const chartCeiling = useMemo(() => {
        if (forceScaleWithTarget || !isTargetOutOfScale) {
            return Math.max(targetValue, maxRealValue, 1000) * 1.1;
        }
        return Math.max(maxRealValue, 1000) * 1.18;
    }, [forceScaleWithTarget, isTargetOutOfScale, targetValue, maxRealValue]);

    // Posición porcentual de la línea de objetivo
    const targetLinePercent = Math.min(100, Math.max(0, Math.round((targetValue / chartCeiling) * 100)));

    // Elementos para el modal de auditoría
    const allOperations = useMemo(() => {
        const list = [];
        months.forEach(m => {
            if (Array.isArray(m.sales)) {
                m.sales.forEach(s => {
                    list.push({ ...s, monthKey: m.key, monthLabel: m.label, monthFull: m.fullLabel });
                });
            }
        });
        return list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [months]);

    const filteredOperations = useMemo(() => {
        return allOperations.filter(op => {
            if (auditMonthFilter !== 'ALL' && op.monthKey !== auditMonthFilter) return false;
            if (!auditSearchQuery.trim()) return true;
            const q = auditSearchQuery.toLowerCase();
            return (
                (op.carName || '').toLowerCase().includes(q) ||
                (op.plate || '').toLowerCase().includes(q) ||
                (op.clientName || '').toLowerCase().includes(q) ||
                (op.concept || '').toLowerCase().includes(q)
            );
        });
    }, [allOperations, auditMonthFilter, auditSearchQuery]);

    return (
        <section className="rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5 shadow-sm">
            {/* Header con Título, Selectores y Acciones */}
            <div className="flex flex-col gap-3.5 border-b border-crm-border/60 pb-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Título e Identificador */}
                    <div className="flex items-start sm:items-center gap-2.5">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                            isProjected ? 'bg-indigo-500/15 text-indigo-400' : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                            {isProjected ? <TrendingUp size={17} /> : <Wallet size={17} />}
                        </span>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-crm-fg">
                                    ÚLTIMOS 12 MESES · {isProjected ? 'GANANCIA COMERCIAL' : 'GANANCIA COBRADA / LIBERADA'} ({currency})
                                </h3>
                                <span className="rounded-full bg-crm-surface-raised px-2 py-0.5 text-[10px] font-semibold text-crm-fg-muted">
                                    {totalOperationsCount} {isProjected ? 'ventas' : 'cobros'}
                                </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-crm-fg-muted">
                                {isProjected
                                    ? 'Resultado esperado por operación comercial según fecha de venta · No representa dinero cobrado en caja'
                                    : 'Parte de la ganancia respaldada por cobros reales tras recuperar el capital invertido · Agrupado por fecha de cobro · No equivale a lo distribuido por Tesorería'}
                            </p>
                        </div>
                    </div>

                    {/* Controles de Vista: Métrica, Moneda y Objetivo */}
                    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                        {/* 1. Selector de Métrica Dual */}
                        <div className="inline-flex rounded-lg border border-crm-border bg-crm-bg/90 p-0.5 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setMetricMode('projected')}
                                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                                    isProjected
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-crm-fg-muted hover:text-crm-fg'
                                }`}
                                title="Ganancia comercial: margen de cada venta (precio menos costo, gastos, comisión y parte de socios), agrupado por fecha de venta"
                            >
                                Comercial
                            </button>
                            <button
                                type="button"
                                onClick={() => setMetricMode('released')}
                                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                                    !isProjected
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-crm-fg-muted hover:text-crm-fg'
                                }`}
                                title="Ganancia cobrada: parte del margen respaldada por cobros reales tras recuperar el capital, agrupada por fecha de cobro"
                            >
                                Cobrada
                            </button>
                        </div>

                        {/* 2. Selector de Moneda */}
                        <div className="inline-flex rounded-lg border border-crm-border bg-crm-bg/90 p-0.5 text-xs font-semibold">
                            <button
                                type="button"
                                onClick={() => setCurrency('USD')}
                                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                                    isUSD
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                USD
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrency('ARS')}
                                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                                    !isUSD
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-crm-fg-muted hover:text-crm-fg'
                                }`}
                            >
                                ARS
                            </button>
                        </div>

                        {/* 3. Botón Configurar Objetivo */}
                        <button
                            type="button"
                            onClick={() => {
                                setTempTargetInput(String(objectiveUSD));
                                setShowTargetModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-crm-border bg-crm-surface-raised px-2.5 py-1.5 text-xs font-medium text-crm-fg hover:border-indigo-500/40 hover:text-white transition cursor-pointer"
                            title="Configurar objetivo mensual compartido"
                        >
                            <Target size={13} className="text-indigo-400" />
                            <span>Obj: {isUSD ? `USD ${formatCompact(objectiveUSD, 'USD')}` : `ARS ${formatCompact(targetValue, 'ARS')}`}</span>
                        </button>

                        {/* 4. Botón Ver Detalle / Auditoría */}
                        <button
                            type="button"
                            onClick={() => {
                                setAuditMonthFilter('ALL');
                                setShowAuditModal(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-crm-border bg-crm-surface-raised px-2.5 py-1.5 text-xs font-medium text-crm-fg hover:border-crm-red/40 hover:text-white transition cursor-pointer"
                        >
                            <Search size={13} className="text-crm-fg-muted" />
                            <span>Auditar 12m</span>
                        </button>
                    </div>
                </div>

                {/* Banner contextual de la métrica activa */}
                <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[11px] border ${
                    isProjected
                        ? 'border-indigo-500/25 bg-indigo-500/10 text-indigo-200'
                        : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                }`}>
                    <div className="flex items-center gap-2">
                        <Info size={13} className="shrink-0" />
                        <span>
                            {isProjected ? (
                                <>
                                    <strong>Ganancia Comercial:</strong> Mide el resultado total esperado de cada operación (precio pactado menos costo real de compra/toma, gastos directos, comisiones y derechos de socios).
                                </>
                            ) : (
                                <>
                                    <strong>Ganancia Cobrada / Liberada:</strong> Mide la parte del margen respaldada por cobros reales, una vez recuperado el capital invertido. Imputa cobros de cuotas y saldos al mes en que se cobran. La ganancia distribuida por Tesorería a obligaciones, reservas o cajas es un indicador distinto.
                                </>
                            )}
                        </span>
                    </div>
                    <span className="shrink-0 font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-black/20">
                        {isProjected ? 'Por fecha de venta' : 'Por fecha de cobro'}
                    </span>
                </div>
            </div>

            {/* Resumen Superior: Acumulado, Promedio, Máximo Histórico y Cotización */}
            <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-crm-border/60 bg-crm-bg/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Total Acumulado 12m</p>
                    <p className="mt-1 text-base font-extrabold text-crm-fg sm:text-lg">
                        {hideAmounts ? '***' : isUSD ? `USD ${formatUSD(totalAccumulated)}` : `ARS ${formatNumber(totalAccumulated)}`}
                    </p>
                </div>
                <div className="rounded-lg border border-crm-border/60 bg-crm-bg/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Promedio Mensual (Activo)</p>
                    <p className="mt-1 text-base font-extrabold text-indigo-300 sm:text-lg">
                        {hideAmounts ? '***' : isUSD ? `USD ${formatUSD(monthlyAverage)}` : `ARS ${formatNumber(monthlyAverage)}`}
                    </p>
                </div>
                <div className="rounded-lg border border-crm-border/60 bg-crm-bg/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Máx. Mes Histórico</p>
                    <p className="mt-1 text-base font-extrabold text-emerald-400 sm:text-lg">
                        {hideAmounts ? '***' : isUSD ? `USD ${formatUSD(maxRealValue)}` : `ARS ${formatNumber(maxRealValue)}`}
                    </p>
                </div>
                <div className="rounded-lg border border-crm-border/60 bg-crm-bg/40 p-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Fuente de Cotización</p>
                    <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xs font-semibold text-amber-300">Ámbito — Dólar Blue</span>
                        <span className="text-[10px] text-crm-fg-muted">histórico</span>
                    </div>
                </div>
            </div>

            {/* Leyenda y Estado de Escala del Objetivo */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase">
                    <span className="inline-flex items-center gap-1 rounded-md border border-crm-red/40 bg-crm-red/10 px-2 py-0.5 text-crm-red">
                        <span className="h-1.5 w-1.5 rounded-full bg-crm-red" /> Mes seleccionado
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Superó obj
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-indigo-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Con margen
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-crm-border bg-crm-surface-raised px-2 py-0.5 text-crm-fg-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-crm-fg-muted/60" /> Sin operaciones
                    </span>
                </div>

                {/* Aviso claro sobre la escala del objetivo sin deformar el gráfico */}
                {isTargetOutOfScale && !forceScaleWithTarget ? (
                    <div className="flex items-center gap-2 rounded-md border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 text-[11px] text-crm-fg-muted">
                        <Info size={13} className="text-indigo-400 shrink-0" />
                        <span>
                            Objetivo {isUSD ? `USD ${formatCompact(objectiveUSD, 'USD')}` : `ARS ${formatCompact(targetValue, 'ARS')}`} fuera de escala (máx 12m: {isUSD ? `USD ${formatCompact(maxRealValue, 'USD')}` : `ARS ${formatCompact(maxRealValue, 'ARS')}`}).
                        </span>
                        <button
                            type="button"
                            onClick={() => setForceScaleWithTarget(true)}
                            className="font-semibold text-indigo-300 hover:text-white underline ml-1 cursor-pointer"
                        >
                            Ver a escala obj
                        </button>
                    </div>
                ) : forceScaleWithTarget ? (
                    <button
                        type="button"
                        onClick={() => setForceScaleWithTarget(false)}
                        className="text-[11px] text-indigo-300 hover:text-white underline cursor-pointer"
                    >
                        Volver a escala adaptativa de datos reales
                    </button>
                ) : null}
            </div>

            {/* GRÁFICO INTERACTIVO DE BARRAS (12 MESES) */}
            <div className="relative mt-4 h-48 sm:h-52 w-full rounded-lg border border-crm-border/60 bg-crm-bg/60 p-2 sm:p-3">
                {/* Líneas horizontales de guía */}
                <div className="absolute inset-x-3 inset-y-3 pointer-events-none flex flex-col justify-between opacity-15">
                    <div className="border-b border-dashed border-crm-fg" />
                    <div className="border-b border-dashed border-crm-fg" />
                    <div className="border-b border-dashed border-crm-fg" />
                </div>

                {/* Línea horizontal del Objetivo (si está dentro de la escala del gráfico) */}
                {showTargetLine && (!isTargetOutOfScale || forceScaleWithTarget) && targetLinePercent <= 100 && (
                    <div
                        className="absolute inset-x-2 border-t-2 border-dashed border-indigo-400/60 pointer-events-none transition-all z-10"
                        style={{ bottom: `${targetLinePercent}%` }}
                    >
                        <span className="absolute right-2 -top-3 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300 border border-indigo-400/30">
                            Obj: {isUSD ? `USD ${formatCompact(objectiveUSD, 'USD')}` : `ARS ${formatCompact(targetValue, 'ARS')}`}
                        </span>
                    </div>
                )}

                {/* Contenedor de las 12 barras */}
                <div className="flex h-full w-full items-end gap-1.5 sm:gap-2.5">
                    {months.map((m, idx) => {
                        const val = isUSD ? (m.gainUSD || 0) : (m.gainARS || 0);
                        const isPositive = val > 0;
                        const isNegative = val < 0;
                        const isZero = val === 0 && m.salesCount === 0;
                        const exceedsTarget = isPositive && val >= targetValue;

                        // Altura proporcional respecto al techo
                        const ratio = chartCeiling > 0 ? Math.min(1, Math.max(0, Math.abs(val) / chartCeiling)) : 0;
                        const barHeightPercent = isZero
                            ? 6
                            : Math.max(8, Math.min(100, Math.round(ratio * 100)));

                        const isHovered = hoveredMonthIndex === idx;

                        // Estilo visual de la barra
                        let barBg = 'bg-crm-surface-raised';
                        let barBorder = 'border-crm-border';

                        if (m.isSelectedMonth) {
                            barBorder = 'border-crm-red ring-2 ring-crm-red/40';
                        }

                        if (exceedsTarget) {
                            barBg = 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)]';
                            barBorder = 'border-emerald-300';
                        } else if (isPositive) {
                            barBg = isProjected
                                ? 'bg-gradient-to-t from-indigo-600/80 to-indigo-400/90'
                                : 'bg-gradient-to-t from-emerald-600/80 to-teal-400/90';
                            barBorder = isProjected ? 'border-indigo-400/50' : 'border-emerald-400/50';
                        } else if (isNegative) {
                            barBg = 'bg-gradient-to-t from-red-600/80 to-red-400/90';
                            barBorder = 'border-red-400';
                        } else if (m.incompleteCount > 0) {
                            barBg = 'bg-amber-500/20';
                            barBorder = 'border-amber-400/60 border-dashed';
                        }

                        return (
                            <div
                                key={m.key || idx}
                                onMouseEnter={() => setHoveredMonthIndex(idx)}
                                onMouseLeave={() => setHoveredMonthIndex(null)}
                                onClick={() => {
                                    setAuditMonthFilter(m.key);
                                    setShowAuditModal(true);
                                }}
                                className="group relative flex flex-1 h-full flex-col justify-end items-center cursor-pointer select-none"
                            >
                                {/* Tooltip flotante interactivo */}
                                {isHovered && (
                                    <div className="absolute -top-32 z-30 w-52 -translate-x-1/2 left-1/2 rounded-xl border border-crm-border bg-crm-surface p-2.5 shadow-2xl backdrop-blur-md text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                        <div className="flex items-center justify-between border-b border-crm-border/60 pb-1.5 mb-1.5">
                                            <p className="text-[11px] font-bold text-crm-fg capitalize">{m.fullLabel}</p>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                exceedsTarget
                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                    : isPositive
                                                    ? 'bg-indigo-500/20 text-indigo-300'
                                                    : isNegative
                                                    ? 'bg-red-500/20 text-red-300'
                                                    : 'bg-crm-surface-raised text-crm-fg-muted'
                                            }`}>
                                                {exceedsTarget ? 'Superó obj' : isPositive ? 'Margen' : isNegative ? 'Pérdida' : 'Sin movimientos'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black text-crm-fg">
                                            {isUSD ? `USD ${formatUSD(m.gainUSD)}` : `ARS ${formatNumber(m.gainARS)}`}
                                        </p>
                                        <p className="text-[10px] text-crm-fg-muted">
                                            Equiv: {isUSD ? `ARS ${formatNumber(m.gainARS)}` : `USD ${formatUSD(m.gainUSD)}`}
                                        </p>
                                        <div className="mt-1.5 pt-1.5 border-t border-crm-border/40 text-[10px] space-y-0.5">
                                            <p className="text-crm-fg-muted">
                                                {isProjected ? 'Ventas' : 'Cobros'}: <strong className="text-crm-fg">{m.salesCount} {isProjected ? 'ops' : 'ingresos'}</strong>
                                            </p>
                                            {m.salesCount > 0 && targetValue > 0 && (
                                                <p className="text-indigo-300 font-semibold">
                                                    {Math.round((val / targetValue) * 100)}% del objetivo mensual
                                                </p>
                                            )}
                                            {m.incompleteCount > 0 && (
                                                <p className="text-amber-400 font-semibold">
                                                    {m.incompleteCount} con datos pendientes
                                                </p>
                                            )}
                                        </div>
                                        <p className="mt-1 text-[9px] text-indigo-400 underline font-semibold">
                                            Click para auditar detalle →
                                        </p>
                                    </div>
                                )}

                                {/* Importe abreviado encima de la barra */}
                                <div className="mb-1 text-center">
                                    <span className={`text-[9px] sm:text-[10px] font-bold transition ${
                                        isHovered
                                            ? 'text-white scale-105'
                                            : isPositive
                                            ? 'text-crm-fg'
                                            : isNegative
                                            ? 'text-red-400'
                                            : 'text-crm-fg-muted/60'
                                    }`}>
                                        {hideAmounts ? '***' : isZero ? '—' : formatCompact(val, currency)}
                                    </span>
                                </div>

                                {/* Barra física */}
                                <div
                                    className={`w-full rounded-t-md border transition-all duration-300 ${barBg} ${barBorder} ${
                                        isHovered ? 'brightness-125 scale-[1.03]' : ''
                                    }`}
                                    style={{ height: `${barHeightPercent}%` }}
                                />

                                {/* Etiqueta del mes debajo */}
                                <div className="mt-2 text-center">
                                    <span className={`block text-[9px] sm:text-[10px] font-bold tracking-tight ${
                                        m.isSelectedMonth
                                            ? 'text-crm-red font-black'
                                            : isHovered
                                            ? 'text-white'
                                            : 'text-crm-fg-muted'
                                    }`}>
                                        {m.label}
                                    </span>
                                    {m.isCurrentMonth && (
                                        <span className="block mx-auto h-1 w-1 rounded-full bg-crm-red mt-0.5" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Aclaración reglamentaria de transparencia contable */}
            <p className="mt-3 text-[11px] leading-relaxed text-crm-fg-muted">
                {isProjected ? (
                    <>
                        * <strong>Ganancia Comercial:</strong> Mide el resultado esperado por operación cerrada (precio pactado menos costo real de adquisición, gastos directos del vehículo y venta, comisiones y derechos de socios). No representa dinero disponible en caja ni ganancia neta total de la empresa (no descuenta gastos fijos/generales del negocio). Conversión a USD según cotizaciones históricas de Ámbito Financiero — dólar blue (venta) a la fecha de cada venta como equivalencia informativa.
                    </>
                ) : (
                    <>
                        * <strong>Ganancia Cobrada / Liberada:</strong> Mide la parte del margen respaldada por cobros efectivos, tras recuperar el 100% del capital invertido (las permutas no son efectivo). No reconoce cuotas futuras pendientes como cobradas y no se confunde con la ganancia distribuida por Tesorería. Conversión a USD según cotización histórica de Ámbito Financiero — dólar blue (venta) a la fecha efectiva de cada cobro.
                    </>
                )}
            </p>

            {/* MODAL 1: Configurar Objetivo Mensual */}
            {showTargetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <div className="flex items-center gap-2">
                                <Target size={18} className="text-indigo-400" />
                                <h3 className="text-base font-bold text-white">Configurar Objetivo Mensual</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowTargetModal(false)}
                                className="text-crm-fg-muted hover:text-white cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-crm-fg-muted">
                                    Objetivo mensual en Dólares (USD)
                                </label>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <span className="rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm font-bold text-indigo-400">
                                        USD
                                    </span>
                                    <input
                                        type="number"
                                        min="1000"
                                        step="1000"
                                        value={tempTargetInput}
                                        onChange={(e) => setTempTargetInput(e.target.value)}
                                        className="w-full rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none"
                                        placeholder="ej. 15000 o 110000"
                                    />
                                </div>
                                <p className="mt-1 text-[11px] text-crm-fg-muted">
                                    Equivalente actual: ARS {formatNumber(Number(tempTargetInput || 0) * currentBlueRate)} (a cotización Blue {formatNumber(currentBlueRate)})
                                </p>
                            </div>

                            {/* Presets rápidos */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Sugerencias rápidas:</p>
                                <div className="mt-1.5 flex flex-wrap gap-2">
                                    {[15000, 25000, 50000, 110000].map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setTempTargetInput(String(amt))}
                                            className="rounded-md border border-crm-border bg-crm-surface-raised px-2.5 py-1 text-xs font-semibold text-crm-fg hover:border-indigo-500 hover:text-white transition cursor-pointer"
                                        >
                                            USD {formatCompact(amt, 'USD')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-crm-border flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTargetModal(false)}
                                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-crm-fg-muted hover:text-white cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={isSavingTarget}
                                    onClick={() => handleSaveTarget(tempTargetInput)}
                                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {isSavingTarget ? 'Guardando...' : 'Guardar Objetivo'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Auditoría y Detalle de Operaciones de los 12 Meses */}
            {showAuditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-6xl rounded-2xl border border-crm-border bg-crm-surface p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Encabezado del Modal */}
                        <div className="flex items-center justify-between border-b border-crm-border pb-3 shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    {isProjected ? <TrendingUp size={18} className="text-indigo-400" /> : <Wallet size={18} className="text-emerald-400" />}
                                    Auditoría · {isProjected ? 'Ganancia Comercial' : 'Ganancia Cobrada / Liberada'} (12 Meses)
                                </h3>
                                <p className="text-xs text-crm-fg-muted mt-0.5">
                                    {isProjected
                                        ? 'Operaciones comerciales cerradas, deduplicación de costos y cotizaciones históricas aplicadas'
                                        : 'Cobros reales de Tesorería, amortización de capital inicial y margen liberado a cajas'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAuditModal(false)}
                                className="text-crm-fg-muted hover:text-white p-1 cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Filtros de la tabla */}
                        <div className="mt-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-crm-fg-muted">Mes:</span>
                                <select
                                    value={auditMonthFilter}
                                    onChange={(e) => setAuditMonthFilter(e.target.value)}
                                    className="rounded-lg border border-crm-border bg-crm-bg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none"
                                >
                                    <option value="ALL">Todos los 12 meses ({allOperations.length} registros)</option>
                                    {months.map(m => (
                                        <option key={m.key} value={m.key}>
                                            {m.fullLabel} ({m.salesCount} {isProjected ? 'ventas' : 'cobros'} · {isUSD ? `USD ${formatCompact(m.gainUSD, 'USD')}` : `ARS ${formatCompact(m.gainARS, 'ARS')}`})
                                        </option>
                                    ))}
                                </select>

                                {/* Selector de métrica dentro del modal para comparar rápidamente */}
                                <div className="inline-flex rounded-lg border border-crm-border bg-crm-bg p-0.5 text-xs font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => setMetricMode('projected')}
                                        className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                                            isProjected ? 'bg-indigo-600 text-white' : 'text-crm-fg-muted hover:text-white'
                                        }`}
                                    >
                                        Comercial
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMetricMode('released')}
                                        className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                                            !isProjected ? 'bg-emerald-600 text-white' : 'text-crm-fg-muted hover:text-white'
                                        }`}
                                    >
                                        Cobrada
                                    </button>
                                </div>
                            </div>

                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                                <input
                                    type="text"
                                    placeholder="Buscar por auto, patente, cliente..."
                                    value={auditSearchQuery}
                                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                                    className="w-full sm:w-64 rounded-lg border border-crm-border bg-crm-bg pl-8 pr-3 py-1.5 text-xs text-white placeholder-crm-fg-muted focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Tabla de operaciones o cobros */}
                        <div className="mt-4 flex-1 overflow-y-auto border border-crm-border rounded-xl">
                            {isProjected ? (
                                /* TABLA 1: MARGEN PROYECTADO POR VENTA */
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 bg-crm-surface-raised border-b border-crm-border text-crm-fg-muted uppercase text-[10px] tracking-wider font-bold z-10">
                                        <tr>
                                            <th className="py-2.5 px-3">Fecha Venta</th>
                                            <th className="py-2.5 px-3">Cliente</th>
                                            <th className="py-2.5 px-3">Vehículo / Patente</th>
                                            <th className="py-2.5 px-3 text-right">Precio Pactado</th>
                                            <th className="py-2.5 px-3 text-right">Costo Compra/Toma</th>
                                            <th className="py-2.5 px-3 text-right">Gastos / Comis.</th>
                                            <th className="py-2.5 px-3 text-right">Socio / Inversor</th>
                                            <th className="py-2.5 px-3 text-right font-black text-indigo-300">Margen ARS</th>
                                            <th className="py-2.5 px-3 text-center">Dólar Ámbito</th>
                                            <th className="py-2.5 px-3 text-right font-black text-emerald-400">Margen USD</th>
                                            <th className="py-2.5 px-3 text-center">Op.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border/40 text-crm-fg">
                                        {filteredOperations.length === 0 ? (
                                            <tr>
                                                <td colSpan={11} className="py-8 text-center text-crm-fg-muted">
                                                    No se encontraron ventas para el filtro seleccionado.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOperations.map(op => {
                                                const hasMissingCost = op.cost === null || op.cost === undefined || !op.calculable;
                                                return (
                                                    <tr key={op.id} className="hover:bg-crm-bg/40 transition">
                                                        <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                                                            {op.dateDisplay}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                                                            {op.clientName}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                                <span>{op.carName}</span>
                                                                {op.isConsigned && (
                                                                    <span className="rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                                                                        Consignado
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-crm-fg-muted font-mono">{op.plate || 'S/D'}</div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                                            {op.saleCurrency} {formatNumber(op.salePrice)}
                                                            {op.hasFinancing && (
                                                                <div className="text-[9px] text-crm-fg-muted font-normal">
                                                                    Auto: {formatNumber(op.vehiclePrice)} | Int: {formatNumber(op.interestAmount)}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-crm-fg-muted whitespace-nowrap">
                                                            {hasMissingCost ? (
                                                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                                                                    Costo pendiente
                                                                </span>
                                                            ) : (
                                                                formatNumber(op.cost)
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-crm-fg-muted whitespace-nowrap">
                                                            {formatNumber((op.expenses || 0) + (op.commissions || 0))}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                                            {op.investorPct > 0 ? (
                                                                <span className="text-[10px] font-bold text-amber-300">
                                                                    {op.investorPct}% (-{formatNumber(op.investorProfit)})
                                                                </span>
                                                            ) : (
                                                                <span className="text-crm-fg-muted">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-indigo-300 whitespace-nowrap">
                                                            {op.agencyProfitARS !== null ? formatNumber(op.agencyProfitARS) : <span className="text-amber-400">Incompleto</span>}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                            {op.rateUsed ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span
                                                                        className={`rounded border px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                                                                            op.isSubstituted
                                                                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                                                : 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300'
                                                                        }`}
                                                                        title={`${op.rateSource} (${op.rateDate || ''}): ${op.rateNote || ''}`}
                                                                    >
                                                                        ${formatNumber(op.rateUsed)}
                                                                    </span>
                                                                    {op.isSubstituted && (
                                                                        <span className="text-[8px] text-amber-300/80">Sustitución</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-amber-400">S/D</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                                                            {op.agencyProfitUSD !== null ? `USD ${formatUSD(op.agencyProfitUSD)}` : <span className="text-amber-400">Incompleto</span>}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                            <Link
                                                                href={`/admin/ventas?saleId=${op.id}`}
                                                                target="_blank"
                                                                className="inline-flex items-center justify-center h-6 w-6 rounded bg-crm-surface-raised text-crm-fg-muted hover:text-white hover:bg-crm-red transition cursor-pointer"
                                                                title="Ver operación en CRM"
                                                            >
                                                                <ArrowUpRight size={13} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                /* TABLA 2: GANANCIA COBRADA / LIBERADA REALES EN TESORERÍA */
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="sticky top-0 bg-crm-surface-raised border-b border-crm-border text-crm-fg-muted uppercase text-[10px] tracking-wider font-bold z-10">
                                        <tr>
                                            <th className="py-2.5 px-3">Fecha Cobro</th>
                                            <th className="py-2.5 px-3">Cliente</th>
                                            <th className="py-2.5 px-3">Vehículo Imputado</th>
                                            <th className="py-2.5 px-3">Concepto Cobro</th>
                                            <th className="py-2.5 px-3 text-right">Importe Cobrado</th>
                                            <th className="py-2.5 px-3 text-right">Inversión Recuperada</th>
                                            <th className="py-2.5 px-3 text-right font-black text-emerald-300">Ganancia Cobrada ARS</th>
                                            <th className="py-2.5 px-3 text-center">Dólar Ámbito (Cobro)</th>
                                            <th className="py-2.5 px-3 text-right font-black text-emerald-400">Ganancia Cobrada USD</th>
                                            <th className="py-2.5 px-3 text-center">Op.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-crm-border/40 text-crm-fg">
                                        {filteredOperations.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="py-8 text-center text-crm-fg-muted">
                                                    No se encontraron cobros con margen liberado para el filtro seleccionado.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredOperations.map(op => {
                                                return (
                                                    <tr key={op.id} className="hover:bg-crm-bg/40 transition">
                                                        <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                                                            {op.dateDisplay}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                                                            {op.clientName}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-bold text-white">{op.carName}</div>
                                                            <div className="text-[10px] text-crm-fg-muted font-mono">{op.plate || 'S/D'}</div>
                                                        </td>
                                                        <td className="py-2.5 px-3 font-medium text-crm-fg-muted">
                                                            {op.concept}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                                                            {op.currency} {formatNumber(op.amountCollected)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono text-crm-fg-muted whitespace-nowrap">
                                                            ARS {formatNumber(op.realInvestment)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-300 whitespace-nowrap">
                                                            ARS {formatNumber(op.agencyProfitARS)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                            {op.rateUsed ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span
                                                                        className={`rounded border px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                                                                            op.isSubstituted
                                                                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                                                                : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300'
                                                                        }`}
                                                                        title={`${op.rateSource} (${op.rateDate || ''}): ${op.rateNote || ''}`}
                                                                    >
                                                                        ${formatNumber(op.rateUsed)}
                                                                    </span>
                                                                    {op.isSubstituted && (
                                                                        <span className="text-[8px] text-amber-300/80">Sustitución</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-amber-400">S/D</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400 whitespace-nowrap">
                                                            USD {formatUSD(op.agencyProfitUSD)}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                            {op.saleId ? (
                                                                <Link
                                                                    href={`/admin/ventas?saleId=${op.saleId}`}
                                                                    target="_blank"
                                                                    className="inline-flex items-center justify-center h-6 w-6 rounded bg-crm-surface-raised text-crm-fg-muted hover:text-white hover:bg-crm-red transition cursor-pointer"
                                                                    title="Ver venta vinculada"
                                                                >
                                                                    <ArrowUpRight size={13} />
                                                                </Link>
                                                            ) : (
                                                                <span className="text-crm-fg-muted">—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pie del Modal con resumen y aclaración de cotización */}
                        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-crm-fg-muted shrink-0 border-t border-crm-border pt-3">
                            <div className="space-y-0.5">
                                <p>
                                    Mostrando <strong>{filteredOperations.length}</strong> de {allOperations.length} {isProjected ? 'ventas' : 'cobros'}.
                                </p>
                                <p className="text-[10px] text-crm-fg-muted/80">
                                    * Cotización provista por Ámbito Financiero — dólar blue (venta). La conversión a USD es una equivalencia informativa.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAuditModal(false)}
                                className="rounded-lg bg-crm-surface-raised px-4 py-1.5 text-xs font-bold text-white hover:bg-crm-surface transition cursor-pointer self-end sm:self-auto"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
