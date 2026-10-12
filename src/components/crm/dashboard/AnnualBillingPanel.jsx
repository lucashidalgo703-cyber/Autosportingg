import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    Calendar,
    Car,
    DollarSign,
    TrendingUp,
    Search,
    X,
    ExternalLink,
    ChevronRight,
    ArrowUpRight,
    RefreshCw,
    Info,
    AlertCircle,
    CheckCircle2,
    SlidersHorizontal,
    Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(value) {
    return new Intl.NumberFormat('es-AR').format(value || 0);
}

function formatCurrency(value) {
    return formatNumber(Math.round(value || 0));
}

function formatUSD(value) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

export default function AnnualBillingPanel({
    annualSummary = {},
    historicalTotal = null,
    dolarBlueInitial = null,
    hideAmounts = false,
    canSeeFinancials = true,
    className = ''
}) {
    const currentYear = new Date().getFullYear();

    // Estado de la cotización del Dólar Blue
    const [blueData, setBlueData] = useState(dolarBlueInitial);
    const [isRefreshingRate, setIsRefreshingRate] = useState(false);
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualRateInput, setManualRateInput] = useState('');

    // Estado del gráfico interactivo
    const [chartMetric, setChartMetric] = useState('billing'); // 'billing' | 'units'
    const [hoveredMonth, setHoveredMonth] = useState(null);

    // Modal de detalle de operaciones
    const [selectedModal, setSelectedModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currencyFilter, setCurrencyFilter] = useState('ALL'); // 'ALL' | 'USD' | 'ARS'

    // Actualizar blueData si cambia el prop
    useEffect(() => {
        if (dolarBlueInitial) {
            setBlueData(dolarBlueInitial);
        }
    }, [dolarBlueInitial]);

    // Consultar cotización al montar si no vino en el dashboard o para verificar frescura
    useEffect(() => {
        let mounted = true;
        const checkRate = async () => {
            if (!blueData || !blueData.rate) {
                try {
                    const res = await fetch('/api/dolar-blue');
                    if (res.ok) {
                        const json = await res.json();
                        if (mounted && json?.ok && json.data?.rate) {
                            setBlueData(json.data);
                        }
                    }
                } catch (e) {
                    // Silencioso para no romper dashboard
                }
            }
        };
        checkRate();
        return () => { mounted = false; };
    }, []);

    // Función para actualizar cotización desde el botón
    const handleRefreshBlueRate = async () => {
        try {
            setIsRefreshingRate(true);
            const res = await fetch('/api/dolar-blue?refresh=true');
            const json = await res.json();
            if (json?.ok && json.data) {
                setBlueData(json.data);
                if (json.data.status === 'outdated') {
                    toast.error(json.data.warning || 'No se pudo actualizar con Ámbito. Se mantiene la última cotización.');
                } else {
                    toast.success(`Cotización actualizada: ARS ${formatCurrency(json.data.rate)} (Ámbito)`);
                }
            } else {
                toast.error('Error al consultar Ámbito Financiero');
            }
        } catch (err) {
            toast.error('Error de red al actualizar cotización');
        } finally {
            setIsRefreshingRate(false);
        }
    };

    // Función para guardar cotización manual
    const handleSaveManualRate = async (e) => {
        e.preventDefault();
        const num = parseFloat(String(manualRateInput).replace(/\./g, '').replace(',', '.'));
        if (!num || num <= 0) {
            toast.error('Ingresá una cotización válida mayor a cero');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/dolar-blue/manual', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ rate: num })
            });
            const json = await res.json();
            if (json?.ok && json.data) {
                setBlueData(json.data);
                setShowManualModal(false);
                setManualRateInput('');
                toast.success(`Cotización manual fijada en ARS ${formatCurrency(num)}`);
            } else {
                toast.error(json?.message || 'Error al guardar cotización manual');
            }
        } catch {
            toast.error('Error al guardar cotización manual');
        }
    };

    // Cotización vendedora numérica vigente
    const activeBlueRate = useMemo(() => {
        if (!blueData || !blueData.rate) return null;
        const val = Number(blueData.rate);
        return isNaN(val) || val <= 0 ? null : val;
    }, [blueData]);

    // Lista de años DINÁMICA: ÚNICAMENTE los años que tienen operaciones registradas
    // ¡Nunca más tarjetas fijas de 2024 ni años con 0 ventas!
    const activeYearsList = useMemo(() => {
        const rawEntries = Object.values(annualSummary || {});
        const withSales = rawEntries.filter((item) => (item.carsCount || 0) > 0);

        if (withSales.length === 0) {
            // Si no hay ninguna venta en el CRM, mostrar únicamente el año actual
            return [{
                year: currentYear,
                carsCount: 0,
                totalARS: 0,
                totalUSD: 0,
                sales: [],
                monthlyBreakdown: []
            }];
        }

        return [...withSales].sort((a, b) => Number(b.year) - Number(a.year));
    }, [annualSummary, currentYear]);

    // Año seleccionado para el gráfico (por defecto el año más reciente con ventas)
    const [selectedYearForChart, setSelectedYearForChart] = useState(
        activeYearsList[0]?.year || currentYear
    );

    // Si cambian los años, asegurar que el año seleccionado sea válido
    useEffect(() => {
        if (activeYearsList.length > 0 && !activeYearsList.some(y => y.year === selectedYearForChart)) {
            setSelectedYearForChart(activeYearsList[0].year);
        }
    }, [activeYearsList, selectedYearForChart]);

    // Datos del año seleccionado para el gráfico
    const selectedYearData = useMemo(() => {
        return activeYearsList.find(y => y.year === selectedYearForChart) || activeYearsList[0];
    }, [activeYearsList, selectedYearForChart]);

    // Meses del gráfico para el año seleccionado
    const chartMonths = useMemo(() => {
        if (selectedYearData?.monthlyBreakdown && selectedYearData.monthlyBreakdown.length === 12) {
            return selectedYearData.monthlyBreakdown;
        }

        const MONTH_NAMES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const MONTH_NAMES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const ySales = selectedYearData?.sales || [];

        return Array.from({ length: 12 }, (_, idx) => {
            const mSales = ySales.filter(s => new Date(s.date).getMonth() === idx);
            const mARS = mSales.filter(s => s.saleCurrency === 'ARS').reduce((acc, s) => acc + (Number(s.salePrice) || 0), 0);
            const mUSD_orig = mSales.filter(s => s.saleCurrency === 'USD').reduce((acc, s) => acc + (Number(s.salePrice) || 0), 0);
            const mUSD_equiv = (activeBlueRate && mARS > 0) ? (mARS / activeBlueRate) : 0;

            return {
                monthIndex: idx,
                name: MONTH_NAMES_SHORT[idx],
                fullName: MONTH_NAMES_FULL[idx],
                year: selectedYearForChart,
                carsCount: mSales.length,
                amountARS: mARS,
                amountUSD_orig: mUSD_orig,
                amountUSD_equiv: mUSD_equiv,
                hasSales: mSales.length > 0,
                sales: mSales
            };
        });
    }, [selectedYearData, selectedYearForChart, activeBlueRate]);

    // Valores máximos del año para escalar el gráfico
    const maxBilling = useMemo(() => {
        const max = Math.max(...chartMonths.map(m => m.amountARS), 0);
        return max > 0 ? max : 1;
    }, [chartMonths]);

    const maxUnits = useMemo(() => {
        const max = Math.max(...chartMonths.map(m => m.carsCount), 0);
        return max > 0 ? max : 1;
    }, [chartMonths]);

    // Totales históricos y cálculos
    const totalCarsHistorical = historicalTotal?.carsCount || 0;
    const totalArsHistorical = historicalTotal?.totalARS || 0;
    const totalUsdOriginalHistorical = historicalTotal?.totalUSD || 0;

    // Equivalente USD al blue de hoy del total acumulado en ARS
    const totalEquivalentUSD = useMemo(() => {
        if (!activeBlueRate || totalArsHistorical <= 0) return null;
        return totalArsHistorical / activeBlueRate;
    }, [activeBlueRate, totalArsHistorical]);

    // Ticket promedio histórico
    const avgTicketARS = totalCarsHistorical > 0 ? Math.round(totalArsHistorical / totalCarsHistorical) : 0;
    const avgTicketUSD = (activeBlueRate && avgTicketARS > 0) ? (avgTicketARS / activeBlueRate) : null;

    // Fecha/año de inicio dinámico
    const earliestYear = historicalTotal?.startYear || (activeYearsList.length > 0 ? activeYearsList[activeYearsList.length - 1].year : currentYear);
    const startPeriodLabel = earliestYear === currentYear 
        ? `Año ${currentYear}` 
        : `Ventas registradas desde ${earliestYear} hasta hoy`;

    // Manejo del modal detallado
    const handleOpenModal = (title, period, sales, totalARS, totalUSDOrig) => {
        setSelectedModal({
            title,
            period,
            sales: sales || [],
            totalARS: totalARS || 0,
            totalUSDOrig: totalUSDOrig || 0
        });
        setSearchQuery('');
        setCurrencyFilter('ALL');
    };

    const handleCloseModal = () => {
        setSelectedModal(null);
        setSearchQuery('');
    };

    // Ventas filtradas en el modal
    const filteredModalSales = useMemo(() => {
        if (!selectedModal || !Array.isArray(selectedModal.sales)) return [];
        let list = selectedModal.sales;

        if (currencyFilter !== 'ALL') {
            list = list.filter((s) => s.saleCurrency === currencyFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter((s) => {
                const car = (s.carName || '').toLowerCase();
                const plate = (s.plate || '').toLowerCase();
                const client = (s.clientName || '').toLowerCase();
                const seller = (s.salesperson || '').toLowerCase();
                const method = (s.paymentMethod || '').toLowerCase();
                return car.includes(q) || plate.includes(q) || client.includes(q) || seller.includes(q) || method.includes(q);
            });
        }

        return list;
    }, [selectedModal, searchQuery, currencyFilter]);

    // Totales del modal
    const modalTotals = useMemo(() => {
        return filteredModalSales.reduce(
            (acc, s) => {
                if (s.saleCurrency === 'USD') {
                    acc.usd += Number(s.salePrice) || 0;
                    acc.profitUSD += Number(s.profitUSD) || 0;
                } else {
                    acc.ars += Number(s.salePrice) || 0;
                    acc.profitARS += Number(s.profitARS) || 0;
                }
                return acc;
            },
            { usd: 0, ars: 0, profitUSD: 0, profitARS: 0 }
        );
    }, [filteredModalSales]);

    const modalEquivalentUSD = activeBlueRate && modalTotals.ars > 0 ? (modalTotals.ars / activeBlueRate) : null;

    return (
        <section className={`rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5 ${className}`}>
            {/* Header del Panel */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-crm-fg-muted">
                        <DollarSign size={14} className="text-emerald-400" />
                        Facturación anual e histórica
                    </h3>
                    <p className="mt-1 text-xs text-crm-fg-muted">
                        {startPeriodLabel} · <span className="text-crm-fg-muted/80">Importe de ventas registradas; no equivale a cobros en caja</span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        handleOpenModal(
                            'Histórico Total de Operaciones',
                            `Período completo (${earliestYear} - ${currentYear})`,
                            historicalTotal?.sales || [],
                            totalArsHistorical,
                            totalUsdOriginalHistorical
                        )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20 hover:text-white cursor-pointer self-start sm:self-auto"
                >
                    <ExternalLink size={13} />
                    Ver histórico completo ({totalCarsHistorical} ventas)
                </button>
            </div>

            {/* TARJETA PRINCIPAL: FACTURACIÓN TOTAL EN ARS Y EQUIVALENTE EN USD AL BLUE DEL DÍA */}
            <div className="mb-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/35 via-crm-surface-raised to-crm-surface p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* Sección Izquierda: Título y Totales en ARS / USD */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md border border-indigo-400/30 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                Acumulado Total
                            </span>
                            <span className="text-xs font-medium text-crm-fg-muted">
                                {startPeriodLabel}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {/* Facturación Total en ARS */}
                            <div className="rounded-xl border border-crm-border/60 bg-crm-bg/70 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                    Facturación Total (ARS)
                                </p>
                                <p className="mt-1.5 text-2xl font-black text-white sm:text-3xl tracking-tight">
                                    {hideAmounts ? '***' : `ARS ${formatCurrency(totalArsHistorical)}`}
                                </p>
                                <p className="mt-1 text-[11px] text-crm-fg-muted">
                                    Suma total pactada en pesos
                                </p>
                            </div>

                            {/* Equivalente en USD al Blue de Hoy */}
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                        Equivalente en USD al blue de hoy
                                    </p>
                                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300">
                                        BLUE VENDEDOR
                                    </span>
                                </div>
                                <p className="mt-1.5 text-2xl font-black text-emerald-400 sm:text-3xl tracking-tight">
                                    {hideAmounts ? (
                                        '***'
                                    ) : totalEquivalentUSD !== null ? (
                                        `USD ${formatUSD(totalEquivalentUSD)}`
                                    ) : (
                                        <span className="text-base text-amber-300">Cotización no disponible</span>
                                    )}
                                </p>
                                <p className="mt-1 text-[11px] text-emerald-200/80">
                                    {activeBlueRate ? (
                                        `Calculado a ARS ${formatCurrency(activeBlueRate)} por USD`
                                    ) : (
                                        'Sin cotización activa'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Indicador de ventas pactadas en USD original si existieran */}
                        {totalUsdOriginalHistorical > 0 && (
                            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-2 text-xs text-purple-200">
                                <strong>Ventas pactadas originalmente en USD:</strong> USD {formatCurrency(totalUsdOriginalHistorical)} (no duplicadas en el equivalente en pesos).
                            </div>
                        )}
                    </div>

                    {/* Sección Derecha: Indicadores de Vehículos y Ticket Promedio */}
                    <div className="flex flex-col gap-3 lg:border-l lg:border-crm-border/60 lg:pl-6">
                        <div className="rounded-xl border border-crm-border bg-crm-bg/60 p-3.5 min-w-[220px]">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                    Vehículos vendidos
                                </span>
                                <Car size={15} className="text-indigo-400" />
                            </div>
                            <p className="mt-1 text-xl font-bold text-crm-fg">
                                {formatNumber(totalCarsHistorical)} <span className="text-xs text-crm-fg-muted font-normal">{totalCarsHistorical === 1 ? 'unidad' : 'unidades'}</span>
                            </p>
                        </div>

                        <div className="rounded-xl border border-crm-border bg-crm-bg/60 p-3.5 min-w-[220px]">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                    Ticket promedio x vehículo
                                </span>
                                <TrendingUp size={15} className="text-emerald-400" />
                            </div>
                            <p className="mt-1 text-base font-bold text-crm-fg">
                                {hideAmounts ? '***' : `ARS ${formatCurrency(avgTicketARS)}`}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-emerald-400">
                                {hideAmounts ? (
                                    '***'
                                ) : avgTicketUSD !== null ? (
                                    `≈ USD ${formatUSD(avgTicketUSD)} (Blue)`
                                ) : (
                                    '—'
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* GRÁFICO DE BARRAS MENSUAL EN ARS PARA EL AÑO SELECCIONADO */}
            <div className="mb-5 rounded-xl border border-crm-border bg-crm-bg p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-crm-fg">
                                {chartMetric === 'billing' ? 'Facturación mensual (ARS)' : 'Vehículos vendidos por mes'} · {selectedYearForChart}
                            </h4>
                            <span className="rounded bg-crm-surface-raised px-2 py-0.5 text-[10px] font-bold text-crm-fg-muted border border-crm-border/60">
                                {chartMonths.reduce((acc, m) => acc + m.carsCount, 0)} ventas en el año
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-crm-fg-muted">
                            {chartMetric === 'billing' 
                                ? 'Importe facturado mes a mes en pesos y su equivalente en dólares blue' 
                                : 'Cantidad de unidades vendidas en cada mes del año'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Selector de Año si hay más de 1 año con ventas */}
                        {activeYearsList.length > 1 && (
                            <div className="flex items-center rounded-lg border border-crm-border bg-crm-surface p-0.5">
                                {activeYearsList.map((yItem) => (
                                    <button
                                        key={yItem.year}
                                        type="button"
                                        onClick={() => setSelectedYearForChart(yItem.year)}
                                        className={`rounded-md px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                            selectedYearForChart === yItem.year
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-crm-fg-muted hover:text-crm-fg'
                                        }`}
                                    >
                                        {yItem.year}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selector para alternar entre "Facturación" y "Vehículos vendidos" */}
                        <div className="flex items-center rounded-lg border border-crm-border bg-crm-surface p-0.5">
                            <button
                                type="button"
                                onClick={() => setChartMetric('billing')}
                                className={`rounded-md px-3 py-1 text-xs font-bold transition cursor-pointer ${
                                    chartMetric === 'billing'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-crm-fg-muted hover:text-crm-fg'
                                    }`}
                            >
                                Facturación
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartMetric('units')}
                                className={`rounded-md px-3 py-1 text-xs font-bold transition cursor-pointer ${
                                    chartMetric === 'units'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-crm-fg-muted hover:text-crm-fg'
                                    }`}
                            >
                                Vehículos vendidos
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contenedor del Gráfico de Barras Responsivo */}
                <div className="relative pt-6 pb-2">
                    {/* Tooltip interactivo flotante al pasar el cursor */}
                    {hoveredMonth !== null && (
                        <div className="pointer-events-none mb-3 rounded-lg border border-crm-border bg-crm-surface p-2.5 shadow-xl sm:hidden">
                            <p className="text-xs font-bold text-white">
                                {chartMonths[hoveredMonth]?.fullName} {selectedYearForChart}
                            </p>
                            <p className="text-xs text-emerald-400 font-semibold">
                                {chartMonths[hoveredMonth]?.hasSales 
                                    ? `ARS ${formatCurrency(chartMonths[hoveredMonth].amountARS)} (≈ USD ${formatUSD(chartMonths[hoveredMonth].amountUSD_equiv)})`
                                    : 'Sin ventas en este mes'}
                            </p>
                            <p className="text-[11px] text-crm-fg-muted">
                                {chartMonths[hoveredMonth]?.carsCount} {chartMonths[hoveredMonth]?.carsCount === 1 ? 'vehículo vendido' : 'vehículos vendidos'}
                            </p>
                        </div>
                    )}

                    <div className="flex h-44 items-end gap-1.5 sm:gap-3 border-b border-crm-border/60 pb-2 px-1">
                        {chartMonths.map((m, idx) => {
                            const value = chartMetric === 'billing' ? m.amountARS : m.carsCount;
                            const maxValue = chartMetric === 'billing' ? maxBilling : maxUnits;
                            const ratio = maxValue > 0 ? (value / maxValue) : 0;
                            const heightPercent = m.hasSales 
                                ? Math.max(14, Math.min(100, Math.round(ratio * 100))) 
                                : 6;

                            const isHovered = hoveredMonth === idx;

                            return (
                                <div
                                    key={m.name}
                                    onMouseEnter={() => setHoveredMonth(idx)}
                                    onMouseLeave={() => setHoveredMonth(null)}
                                    className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                                >
                                    {/* Tooltip flotante en Desktop */}
                                    <div
                                        className={`pointer-events-none absolute bottom-full mb-2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-crm-border bg-crm-surface-raised px-3 py-2 text-left shadow-2xl transition-opacity group-hover:block ${
                                            idx > 8 ? 'right-0 translate-x-0' : idx < 3 ? 'left-0 translate-x-0' : 'left-1/2'
                                        }`}
                                    >
                                        <p className="text-xs font-bold text-white">
                                            {m.fullName} {selectedYearForChart}
                                        </p>
                                        <div className="mt-1 space-y-0.5 text-[11px]">
                                            <p className="font-semibold text-emerald-300">
                                                {m.hasSales 
                                                    ? hideAmounts ? '***' : `ARS ${formatCurrency(m.amountARS)}`
                                                    : 'Mes sin operaciones'}
                                            </p>
                                            {m.hasSales && activeBlueRate && !hideAmounts && (
                                                <p className="text-crm-fg-muted">
                                                    ≈ USD {formatUSD(m.amountUSD_equiv)} (al Blue de hoy)
                                                </p>
                                            )}
                                            <p className="text-indigo-200">
                                                {m.carsCount} {m.carsCount === 1 ? 'vehículo vendido' : 'vehículos vendidos'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Barra visual con colores CRM Sote */}
                                    <div className="w-full flex items-end justify-center h-full">
                                        <div
                                            className={`w-full max-w-[36px] rounded-t-md transition-all duration-200 ${
                                                !m.hasSales
                                                    ? 'bg-crm-surface-raised/40 border-t border-crm-border/40 group-hover:bg-crm-surface-raised'
                                                    : chartMetric === 'billing'
                                                    ? isHovered
                                                        ? 'bg-emerald-400 shadow-lg shadow-emerald-500/20'
                                                        : 'bg-gradient-to-t from-emerald-600/50 to-emerald-400 border-t border-emerald-300'
                                                    : isHovered
                                                    ? 'bg-indigo-400 shadow-lg shadow-indigo-500/20'
                                                    : 'bg-gradient-to-t from-indigo-600/50 to-indigo-400 border-t border-indigo-300'
                                            }`}
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                    </div>

                                    {/* Etiqueta del Mes */}
                                    <span
                                        className={`mt-2 text-center text-[10px] font-bold tracking-tight transition-colors ${
                                            isHovered ? 'text-white' : m.hasSales ? 'text-crm-fg' : 'text-crm-fg-muted/60'
                                        }`}
                                    >
                                        {m.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Leyenda y estado bajo el gráfico */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-crm-fg-muted">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                            Mes con ventas
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-sm bg-crm-surface-raised border border-crm-border/60" />
                            Mes sin operaciones
                        </span>
                    </div>
                    <p className="text-[11px] text-crm-fg-muted">
                        Pasa el cursor sobre cada mes para ver el detalle de facturación y cantidad de ventas
                    </p>
                </div>
            </div>

            {/* TARJETAS ANUALES COMPACTAS (Generadas dinámicamente: solo años con ventas válidas) */}
            <div className="mb-5">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-crm-fg-muted">
                        Resumen por año
                    </h4>
                    <span className="text-[11px] text-crm-fg-muted">
                        {activeYearsList.length} {activeYearsList.length === 1 ? 'año con operaciones' : 'años con operaciones'}
                    </span>
                </div>

                <div className={`grid grid-cols-1 gap-3 ${activeYearsList.length === 1 ? 'md:grid-cols-1' : activeYearsList.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                    {activeYearsList.map((item) => {
                        const isCurrent = Number(item.year) === currentYear;
                        const isSelectedForChart = item.year === selectedYearForChart;
                        const cars = item.carsCount || 0;
                        const totalARS = item.totalARS || 0;
                        const equivUSD = (activeBlueRate && totalARS > 0) ? (totalARS / activeBlueRate) : null;
                        const ticketARS = cars > 0 ? Math.round(totalARS / cars) : 0;
                        const ticketUSD = (activeBlueRate && ticketARS > 0) ? (ticketARS / activeBlueRate) : null;

                        return (
                            <div
                                key={item.year}
                                onClick={() => {
                                    setSelectedYearForChart(item.year);
                                    handleOpenModal(
                                        `Facturación Anual ${item.year}`,
                                        isCurrent ? `Año ${item.year} · En Curso` : `Año ${item.year} · Cerrado`,
                                        item.sales || [],
                                        totalARS,
                                        item.totalUSD || 0
                                    );
                                }}
                                className={`group relative cursor-pointer rounded-xl border p-4 transition-all hover:border-indigo-400/60 hover:bg-crm-surface-raised ${
                                    isSelectedForChart
                                        ? 'border-indigo-400/60 bg-indigo-500/10 shadow-sm'
                                        : 'border-crm-border bg-crm-surface-raised'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-white">
                                            {item.year}
                                        </p>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                                            isCurrent ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-crm-bg text-crm-fg-muted'
                                        }`}>
                                            {isCurrent ? 'En Curso' : 'Cerrado'}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-indigo-300 opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-0.5">
                                        Ver operaciones <ArrowUpRight size={12} />
                                    </span>
                                </div>

                                <div className="mt-3 flex items-baseline justify-between border-b border-crm-border/60 pb-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                        Facturación ARS
                                    </p>
                                    <p className="text-base font-bold text-white">
                                        {hideAmounts ? '***' : `ARS ${formatCurrency(totalARS)}`}
                                    </p>
                                </div>

                                <div className="mt-2.5 flex items-baseline justify-between border-b border-crm-border/60 pb-2.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                                        Equiv. USD (Blue)
                                    </p>
                                    <p className="text-sm font-bold text-emerald-400">
                                        {hideAmounts ? (
                                            '***'
                                        ) : equivUSD !== null ? (
                                            `USD ${formatUSD(equivUSD)}`
                                        ) : (
                                            '—'
                                        )}
                                    </p>
                                </div>

                                <div className="mt-2.5 flex items-center justify-between text-xs text-crm-fg-muted pt-1">
                                    <span>
                                        <strong className="text-crm-fg">{formatNumber(cars)}</strong> {cars === 1 ? 'auto vendido' : 'autos vendidos'}
                                    </span>
                                    <span className="text-[11px]">
                                        Ticket prom: <strong className="text-crm-fg">{hideAmounts ? '***' : `ARS ${formatCurrency(ticketARS)}`}</strong>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* BARRA INFORMATIVA DE COTIZACIÓN DEL DÓLAR BLUE (ÁMBITO FINANCIERO) */}
            <div className="rounded-xl border border-crm-border bg-crm-surface-raised/40 p-3.5 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                                <DollarSign size={14} />
                            </span>
                            <div>
                                <p className="text-xs font-bold text-white">
                                    Cotización utilizada: <span className="text-emerald-400 font-extrabold">{activeBlueRate ? `Dólar blue vendedor: ARS ${formatCurrency(activeBlueRate)}` : 'No disponible'}</span>
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-crm-fg-muted">
                                    <span>
                                        Fuente: <a href="https://www.ambito.com/contenidos/dolar.html" target="_blank" rel="noopener noreferrer" className="font-semibold text-indigo-300 hover:text-white underline inline-flex items-center gap-0.5">
                                            {blueData?.source || 'Ámbito Financiero'} <ExternalLink size={10} />
                                        </a>
                                    </span>
                                    {blueData?.publishedAt && (
                                        <span>· Publicación: <strong className="text-crm-fg">{blueData.publishedAt}</strong></span>
                                    )}
                                    {blueData?.lastFetchedDisplay && (
                                        <span>· Última consulta: <strong className="text-crm-fg">{blueData.lastFetchedDisplay}</strong></span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Badges de estado */}
                        {blueData?.status === 'ok' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                                <CheckCircle2 size={11} /> Cotización al día
                            </span>
                        )}
                        {blueData?.status === 'outdated' && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/20">
                                <AlertCircle size={11} /> Cotización previa guardada
                            </span>
                        )}
                        {blueData?.isManual && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                                <Edit3 size={11} /> Cotización manual
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={handleRefreshBlueRate}
                            disabled={isRefreshingRate}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-semibold text-crm-fg transition hover:bg-crm-surface-raised hover:text-white disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw size={12} className={isRefreshingRate ? 'animate-spin text-emerald-400' : ''} />
                            {isRefreshingRate ? 'Consultando...' : 'Actualizar cotización'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setManualRateInput(activeBlueRate ? String(activeBlueRate) : '');
                                setShowManualModal(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-crm-border bg-crm-surface px-2.5 py-1.5 text-xs font-semibold text-crm-fg-muted transition hover:bg-crm-surface-raised hover:text-crm-fg cursor-pointer"
                            title="Ingresar cotización manual"
                        >
                            <SlidersHorizontal size={12} />
                        </button>
                    </div>
                </div>

                {blueData?.warning && (
                    <p className="mt-2 text-[11px] text-amber-300/90 border-t border-crm-border/40 pt-2 flex items-center gap-1">
                        <AlertCircle size={12} /> {blueData.warning}
                    </p>
                )}
            </div>

            {/* MODAL PARA INGRESAR COTIZACIÓN MANUAL */}
            {showManualModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowManualModal(false);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-white">Ingresar cotización manual</h3>
                            <button
                                type="button"
                                onClick={() => setShowManualModal(false)}
                                className="text-crm-fg-muted hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <p className="text-xs text-crm-fg-muted leading-relaxed">
                            Si la consulta automática a Ámbito Financiero no está disponible o deseás fijar un valor de cotización específico para simulación, ingresalo a continuación:
                        </p>
                        <form onSubmit={handleSaveManualRate} className="mt-4 space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                    Dólar blue vendedor (ARS por USD)
                                </label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-crm-fg-muted text-xs">ARS</span>
                                    <input
                                        type="text"
                                        value={manualRateInput}
                                        onChange={(e) => setManualRateInput(e.target.value)}
                                        placeholder="ej. 1550"
                                        className="w-full rounded-lg border border-crm-border bg-crm-bg py-2 pl-12 pr-3 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowManualModal(false)}
                                    className="rounded-lg border border-crm-border px-3 py-1.5 text-xs font-semibold text-crm-fg-muted hover:text-white cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                                >
                                    Guardar cotización
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETALLADO DE OPERACIONES HISTÓRICAS */}
            {selectedModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCloseModal();
                    }}
                >
                    <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                        {/* Header del Modal */}
                        <div className="flex items-center justify-between border-b border-crm-border px-5 py-4 sm:px-6">
                            <div className="min-w-0 pr-4">
                                <h3 className="truncate text-lg font-bold text-crm-fg sm:text-xl">
                                    {selectedModal.title}
                                </h3>
                                <p className="mt-0.5 text-xs text-crm-fg-muted">
                                    {selectedModal.period} · {selectedModal.sales.length} operaciones registradas
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="inline-flex h-8 w-8 appearance-none items-center justify-center rounded-lg border border-crm-border bg-crm-surface-raised p-0 text-crm-fg-muted transition hover:bg-crm-surface hover:text-crm-fg cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Métricas del Modal */}
                        <div className="grid grid-cols-2 gap-3 border-b border-crm-border bg-crm-surface-raised/40 p-4 sm:grid-cols-4 sm:px-6">
                            <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Operaciones</p>
                                <p className="mt-1 text-xl font-bold text-crm-fg">{formatNumber(filteredModalSales.length)}</p>
                            </div>
                            <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Facturación ARS</p>
                                <p className="mt-1 text-xl font-bold text-white">
                                    {hideAmounts ? '***' : `ARS ${formatCurrency(modalTotals.ars)}`}
                                </p>
                            </div>
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Equiv. USD (Blue)</p>
                                <p className="mt-1 text-xl font-bold text-emerald-400">
                                    {hideAmounts ? (
                                        '***'
                                    ) : modalEquivalentUSD !== null ? (
                                        `USD ${formatUSD(modalEquivalentUSD)}`
                                    ) : (
                                        '—'
                                    )}
                                </p>
                            </div>
                            <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Ticket Promedio</p>
                                <p className="mt-1 text-xl font-bold text-crm-fg">
                                    {hideAmounts ? (
                                        '***'
                                    ) : filteredModalSales.length > 0 ? (
                                        `ARS ${formatCurrency(Math.round(modalTotals.ars / filteredModalSales.length))}`
                                    ) : (
                                        '—'
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Filtros y Buscador */}
                        <div className="flex flex-col gap-3 border-b border-crm-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por vehículo, patente, cliente, vendedor o medio de pago..."
                                    className="w-full rounded-lg border border-crm-border bg-crm-bg py-2 pl-9 pr-3 text-xs text-crm-fg placeholder-crm-fg-muted focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                <span className="text-[11px] font-semibold text-crm-fg-muted mr-1">Moneda:</span>
                                {['ALL', 'ARS', 'USD'].map((curr) => (
                                    <button
                                        key={curr}
                                        type="button"
                                        onClick={() => setCurrencyFilter(curr)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                            currencyFilter === curr
                                                ? 'bg-indigo-600 text-white'
                                                : 'border border-crm-border bg-crm-surface-raised text-crm-fg-muted hover:text-crm-fg'
                                        }`}
                                    >
                                        {curr === 'ALL' ? 'Todas' : curr}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tabla de Operaciones */}
                        <div className="flex-1 overflow-y-auto px-5 py-2 sm:px-6">
                            {filteredModalSales.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <Car size={32} className="text-crm-fg-muted mb-3 opacity-40" />
                                    <p className="text-sm font-semibold text-crm-fg">No se encontraron operaciones</p>
                                    <p className="mt-1 text-xs text-crm-fg-muted">
                                        {searchQuery ? 'Prueba con otro término de búsqueda o filtro.' : 'No hay ventas registradas en este período.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 border-b border-crm-border bg-crm-surface text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                            <tr>
                                                <th className="py-3 pr-4">Fecha</th>
                                                <th className="py-3 pr-4">Vehículo</th>
                                                <th className="py-3 pr-4">Cliente</th>
                                                <th className="py-3 pr-4">Vendedor</th>
                                                <th className="py-3 pr-4">Forma de Pago</th>
                                                <th className="py-3 pr-4 text-right">Precio de Venta</th>
                                                <th className="py-3 text-right">Equiv. Blue Hoy</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-crm-border/60">
                                            {filteredModalSales.map((sale, idx) => {
                                                const sDate = sale.date ? new Date(sale.date) : null;
                                                const is2025 = sDate && sDate.getFullYear() === 2025;
                                                const formattedDate = sDate && !isNaN(sDate.getTime())
                                                    ? sDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                    : '—';

                                                const sPrice = Number(sale.salePrice) || 0;
                                                const equivRowUSD = (activeBlueRate && sale.saleCurrency === 'ARS' && sPrice > 0)
                                                    ? (sPrice / activeBlueRate)
                                                    : null;

                                                return (
                                                    <tr key={sale.id || idx} className="hover:bg-crm-surface-raised transition-colors">
                                                        <td className="py-3 pr-4 whitespace-nowrap text-crm-fg-muted font-mono text-[11px]">
                                                            {formattedDate}
                                                            {is2025 && (
                                                                <span className="ml-1.5 inline-block rounded bg-purple-500/20 px-1 py-0.2 text-[9px] font-bold text-purple-300">
                                                                    2025
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <div className="font-semibold text-crm-fg">
                                                                {sale.carName}
                                                            </div>
                                                            {sale.plate && sale.plate !== 'S/D' && (
                                                                <span className="mt-0.5 inline-block rounded bg-crm-surface-raised px-1.5 py-0.5 font-mono text-[10px] font-bold text-crm-fg-muted border border-crm-border/50">
                                                                    {sale.plate}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-4 text-crm-fg">
                                                            {sale.clientName}
                                                        </td>
                                                        <td className="py-3 pr-4 text-crm-fg-muted">
                                                            {sale.salesperson}
                                                        </td>
                                                        <td className="py-3 pr-4">
                                                            <span className="rounded bg-crm-surface-raised px-2 py-0.5 text-[10px] font-medium text-crm-fg-muted border border-crm-border/50">
                                                                {sale.paymentMethod || 'Contado'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 pr-4 text-right font-bold text-white whitespace-nowrap">
                                                            {hideAmounts ? '***' : `${sale.saleCurrency} ${formatCurrency(sale.salePrice)}`}
                                                        </td>
                                                        <td className="py-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                                                            {hideAmounts ? (
                                                                '***'
                                                            ) : sale.saleCurrency === 'USD' ? (
                                                                <span className="text-purple-300">USD {formatCurrency(sale.salePrice)} (Orig.)</span>
                                                            ) : equivRowUSD !== null ? (
                                                                `USD ${formatUSD(equivRowUSD)}`
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer del Modal */}
                        <div className="flex items-center justify-between border-t border-crm-border bg-crm-surface-raised/30 px-5 py-3 sm:px-6">
                            <p className="text-xs text-crm-fg-muted">
                                Mostrando <strong className="text-crm-fg">{filteredModalSales.length}</strong> de <strong className="text-crm-fg">{selectedModal.sales.length}</strong> operaciones
                            </p>
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="rounded-lg border border-crm-border bg-crm-surface px-4 py-1.5 text-xs font-semibold text-crm-fg transition hover:bg-crm-surface-raised cursor-pointer"
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
