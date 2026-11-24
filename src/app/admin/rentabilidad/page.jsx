"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    TrendingUp,
    DollarSign,
    Car,
    Clock,
    Scale,
    Filter,
    Download,
    Printer,
    Search,
    Calendar,
    Users,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Percent,
    ArrowUpRight,
    ArrowDownRight,
    Eye,
    ShieldAlert,
    Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { canReadRentabilidad } from '../../../utils/adminPermissions';
import VehicleProfitabilityDetailModal from '../../../components/crm/profitability/VehicleProfitabilityDetailModal';
import VehicleComparisonMatrix from '../../../components/crm/profitability/VehicleComparisonMatrix';

function formatMoney(amount, currency = 'ARS') {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/D';
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toLocaleString('es-AR');
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD ' : '$ '}${formatted}`;
}

function formatLocalYmd(d) {
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function RentabilidadPage() {
    const { user, token, loading: authLoading } = useAuth();

    // Permisos
    const isAuthorized = useMemo(() => canReadRentabilidad(user), [user]);

    // Estado de filtros
    const [activeTab, setActiveTab] = useState('sold'); // 'sold' | 'stock' | 'compare'
    const [periodPreset, setPeriodPreset] = useState('all'); // Por defecto 'all' para cargar todo lo registrado sin corte
    const [selectedMonth, setSelectedMonth] = useState('all'); // 'all' o 'YYYY-MM'
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [participationFilter, setParticipationFilter] = useState('all');
    const [deliveryFilter, setDeliveryFilter] = useState('all'); // 'all' | 'delivered' | 'pending_delivery'
    const [currencyView, setCurrencyView] = useState('USD'); // 'USD' | 'ARS'
    const [referenceRate, setReferenceRate] = useState('');

    // Datos y carga
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    // Modal de detalle y comparador
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [comparedVehicles, setComparedVehicles] = useState([]);

    // Cargar datos desde la API oficial de rentabilidad
    const fetchData = useCallback(async () => {
        if (!token || !isAuthorized) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (periodPreset !== 'all' && startDate) params.set('startDate', startDate);
            if (periodPreset !== 'all' && endDate) params.set('endDate', endDate);
            if (search) params.set('search', search);
            if (statusFilter !== 'all') params.set('statusFilter', statusFilter);
            if (participationFilter !== 'all') params.set('participationFilter', participationFilter);
            if (deliveryFilter !== 'all') params.set('deliveryFilter', deliveryFilter);
            if (referenceRate) params.set('exchangeRate', referenceRate);

            const res = await fetch(`/api/admin/profitability?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || 'Error cargando rentabilidad');
            setData(result);
        } catch (error) {
            console.error('Error cargando rentabilidad:', error);
            toast.error(error.message || 'Error al obtener rentabilidad');
        } finally {
            setLoading(false);
        }
    }, [token, isAuthorized, periodPreset, startDate, endDate, search, statusFilter, participationFilter, deliveryFilter, referenceRate]);

    useEffect(() => {
        if (isAuthorized) {
            fetchData();
        }
    }, [fetchData, isAuthorized]);

    // Opciones dinámicas de meses (últimos 18 meses)
    const monthOptions = useMemo(() => {
        const months = [];
        const now = new Date();
        for (let i = 0; i < 18; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const val = `${y}-${m}`;
            const label = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
            const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
            months.push({ value: val, label: capitalized });
        }
        return months;
    }, []);

    // Nombre legible del mes o período activo
    const activePeriodLabel = useMemo(() => {
        if (periodPreset === 'all' || (!startDate && !endDate)) return 'Histórico Completo';
        if (selectedMonth && selectedMonth !== 'all' && periodPreset === 'month_select') {
            const match = monthOptions.find(o => o.value === selectedMonth);
            if (match) return match.label;
            return selectedMonth;
        }
        if (periodPreset === 'month') return 'Este Mes';
        if (periodPreset === 'last_month') return 'Mes Anterior';
        if (periodPreset === 'quarter') return 'Últimos 3 Meses';
        if (periodPreset === 'year') return 'Año Actual';
        if (startDate && endDate) return `${startDate} a ${endDate}`;
        return 'Período Seleccionado';
    }, [periodPreset, selectedMonth, startDate, endDate, monthOptions]);

    // Manejo de presets de fechas con fechas locales exactas sin desfase horario
    const applyDatePreset = (preset) => {
        setPeriodPreset(preset);
        const today = new Date();
        if (preset === 'month') {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            setSelectedMonth(ym);
            setStartDate(formatLocalYmd(start));
            setEndDate(formatLocalYmd(end));
        } else if (preset === 'last_month') {
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const end = new Date(today.getFullYear(), today.getMonth(), 0);
            const ym = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
            setSelectedMonth(ym);
            setStartDate(formatLocalYmd(start));
            setEndDate(formatLocalYmd(end));
        } else if (preset === 'quarter') {
            const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            setSelectedMonth('custom');
            setStartDate(formatLocalYmd(start));
            setEndDate(formatLocalYmd(end));
        } else if (preset === 'year') {
            const start = new Date(today.getFullYear(), 0, 1);
            const end = new Date(today.getFullYear(), 11, 31);
            setSelectedMonth('custom');
            setStartDate(formatLocalYmd(start));
            setEndDate(formatLocalYmd(end));
        } else if (preset === 'all') {
            setSelectedMonth('all');
            setStartDate('');
            setEndDate('');
        }
    };

    // Selección directa de mes específico
    const handleMonthSelect = (ym) => {
        if (!ym) return;
        if (ym === 'all') {
            applyDatePreset('all');
            return;
        }
        setSelectedMonth(ym);
        setPeriodPreset('month_select');
        const [y, m] = ym.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0);
        setStartDate(formatLocalYmd(start));
        setEndDate(formatLocalYmd(end));
    };

    // Auto-detectar moneda con datos activos si la vista actual no tiene volumen
    useEffect(() => {
        if (data?.summary?.realized) {
            const arsVol = (data.summary.realized.totalSalesVolume?.ARS || 0) + (data.summary.realized.totalRealizedNetProfit?.ARS || 0);
            const usdVol = (data.summary.realized.totalSalesVolume?.USD || 0) + (data.summary.realized.totalRealizedNetProfit?.USD || 0);
            if (arsVol > 0 && usdVol === 0 && currencyView !== 'ARS') {
                setCurrencyView('ARS');
            } else if (usdVol > 0 && arsVol === 0 && currencyView !== 'USD') {
                setCurrencyView('USD');
            }
        }
    }, [data, currencyView]);

    // Selección para comparación (máximo 4)
    const toggleCompare = (v) => {
        const exists = comparedVehicles.some(item => item.carId === v.carId);
        if (exists) {
            setComparedVehicles(prev => prev.filter(item => item.carId !== v.carId));
        } else {
            if (comparedVehicles.length >= 4) {
                toast.error('Podés comparar un máximo de 4 vehículos a la vez.');
                return;
            }
            setComparedVehicles(prev => [...prev, v]);
            toast.success(`Vehículo agregado al comparador (${comparedVehicles.length + 1} de 4)`);
        }
    };

    // Exportar CSV
    const handleExportCsv = () => {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (search) params.set('search', search);
        if (statusFilter !== 'all') params.set('statusFilter', statusFilter);
        if (participationFilter !== 'all') params.set('participationFilter', participationFilter);
        params.set('view', activeTab === 'stock' ? 'stock' : 'sold');

        const url = `/api/admin/profitability/export/csv?${params.toString()}`;
        window.open(url, '_blank');
        toast.success('Iniciando descarga de informe autorizado...');
    };

    // Bloqueo de seguridad si no está autorizado
    if (authLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="animate-spin text-purple-400" size={32} />
                    <span className="text-sm font-bold text-crm-fg-muted">Verificando credenciales financieras...</span>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center p-4">
                <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-crm-surface p-6 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30">
                        <ShieldAlert size={28} />
                    </div>
                    <div className="space-y-1.5">
                        <h2 className="text-lg font-black text-white">Acceso Financiero Restringido</h2>
                        <p className="text-xs text-crm-fg-muted leading-relaxed">
                            La sección de <strong className="text-white">Rentabilidad Real por Vehículo</strong> contiene información sensible de márgenes económicos y retornos del capital. Está reservada exclusivamente para el Propietario y perfiles con permiso financiero explícito.
                        </p>
                    </div>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full py-2.5 rounded-xl bg-crm-surface-raised border border-crm-border text-xs font-bold text-white hover:bg-white/10 transition-colors"
                    >
                        Volver a la vista anterior
                    </button>
                </div>
            </div>
        );
    }

    const summary = data?.summary || {};
    const realized = summary.realized || {};
    const inStock = summary.inStock || {};
    const soldList = data?.soldVehicles || [];
    const stockList = data?.stockVehicles || [];

    return (
        <div className="space-y-6 pb-12 animate-fadeIn crm-no-print">
            
            {/* Header del módulo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-crm-border pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <TrendingUp size={12} /> DIRECCIÓN ESTRATÉGICA
                        </span>
                        <span className="text-xs text-crm-fg-subtle">• Rendimiento Unitario Canónico</span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white">
                        RENTABILIDAD REAL POR VEHÍCULO
                    </h1>
                    <p className="text-xs text-crm-fg-muted">
                        Análisis económico devengado, márgenes de contribución, días de inmovilización y retorno del capital propio.
                    </p>
                </div>

                {/* Acciones principales de exportación y moneda */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Toggle de Moneda */}
                    <div className="flex rounded-xl border border-crm-border bg-crm-bg p-1">
                        <button
                            type="button"
                            onClick={() => setCurrencyView('USD')}
                            className={`rounded-lg px-3 py-1 text-xs font-black transition-colors ${
                                currencyView === 'USD' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'
                            }`}
                        >
                            USD
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrencyView('ARS')}
                            className={`rounded-lg px-3 py-1 text-xs font-black transition-colors ${
                                currencyView === 'ARS' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'
                            }`}
                        >
                            ARS
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-white hover:bg-crm-surface-raised transition-colors shadow-sm"
                        title="Exportar informe autorizado a CSV"
                    >
                        <Download size={14} className="text-purple-300" /> Exportar CSV
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-white hover:bg-crm-surface-raised transition-colors shadow-sm"
                        title="Imprimir informe ejecutivo"
                    >
                        <Printer size={14} className="text-purple-300" /> Imprimir
                    </button>

                    <button
                        type="button"
                        onClick={fetchData}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted hover:text-white transition-colors"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Barra Superior de Período y Selector de Mes Activo */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-crm-surface p-3 sm:px-4 sm:py-3 rounded-2xl border border-crm-border shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                        <Calendar size={14} className="text-purple-400" />
                        <span>Mes / Período de Ventas:</span>
                    </div>

                    {/* Selector Desplegable de Mes Directo */}
                    <div className="flex items-center gap-1.5 bg-crm-bg px-2.5 py-1.5 rounded-xl border border-purple-500/30">
                        <select
                            value={selectedMonth}
                            onChange={(e) => handleMonthSelect(e.target.value)}
                            className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-crm-surface text-white">📅 Todo el Histórico de Ventas</option>
                            <optgroup label="Seleccionar Mes Específico" className="bg-crm-surface text-white">
                                {monthOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-crm-surface text-white">
                                        {opt.label}
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* Presets rápidos */}
                    {[
                        { id: 'month', label: 'Este Mes' },
                        { id: 'last_month', label: 'Mes Anterior' },
                        { id: 'quarter', label: 'Trimestre' },
                        { id: 'all', label: 'Histórico Completo' }
                    ].map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyDatePreset(preset.id)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                periodPreset === preset.id
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-crm-bg border border-crm-border text-crm-fg-muted hover:text-white'
                            }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-crm-fg-muted font-mono">Período Activo:</span>
                    <span className="font-bold text-white bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-md text-[11px]">
                        {activePeriodLabel}
                    </span>
                </div>
            </div>

            {/* RESUMEN EJECUTIVO (Cards Principales) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Margen Comercial Neto del Período */}
                <div className="rounded-2xl border border-emerald-500/30 bg-crm-surface p-4 sm:p-5 relative overflow-hidden space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted" title="Margen de contribución devengado por unidad antes de gastos fijos de estructura general e impuestos">
                            Margen Comercial Neto ({currencyView})
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                            <TrendingUp size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                        {formatMoney(realized.totalRealizedAgencyNetProfit?.[currencyView] || 0, currencyView)}
                    </p>
                    <div className="space-y-1 pt-1 border-t border-crm-border/60 text-[11px] text-crm-fg-muted">
                        <div className="flex items-center justify-between">
                            <span>Total Operaciones:</span>
                            <strong className="text-white font-mono">
                                {formatMoney(realized.totalRealizedNetProfit?.[currencyView] || 0, currencyView)}
                            </strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-emerald-300">
                                <CheckCircle2 size={10} /> Entregadas (Definitivo):
                            </span>
                            <strong className="text-white font-mono">
                                {formatMoney(realized.deliveredAgencyNetProfit?.[currencyView] || 0, currencyView)}
                            </strong>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-amber-300">
                                <Clock size={10} /> Pendientes (Condicional):
                            </span>
                            <strong className="text-amber-300 font-mono">
                                {formatMoney(realized.pendingDeliveryAgencyNetProfit?.[currencyView] || 0, currencyView)}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* 2. Margen Promedio */}
                <div className="rounded-2xl border border-cyan-500/30 bg-crm-surface p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                            Margen Promedio de Venta
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                            <Percent size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-cyan-400 font-mono">
                        {realized.averageMarginOnSalePct?.[currencyView] !== undefined 
                            ? `${realized.averageMarginOnSalePct[currencyView]}%` 
                            : `${realized.averageMarginPct || 0}%`}
                    </p>
                    <div className="space-y-1 pt-1 border-t border-crm-border/60 text-xs text-crm-fg-muted">
                        <div className="flex items-center justify-between">
                            <span>Margen s/ costo:</span>
                            <strong className="text-white font-mono">
                                {realized.averageMarginOnCostPct?.[currencyView] || 0}%
                            </strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span>Promedio x unidad:</span>
                            <strong className="text-white font-mono">{realized.averageMarginPct || 0}%</strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span>Unidades calculables:</span>
                            <strong className="text-white">{realized.calculableCount || 0} de {realized.totalCount || 0}</strong>
                        </div>
                    </div>
                </div>

                {/* 3. Vehículos Vendidos */}
                <div className="rounded-2xl border border-purple-500/30 bg-crm-surface p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                            Vehículos Vendidos
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                            <Car size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-white font-mono">
                        {realized.totalCount || 0} <span className="text-xs font-normal text-crm-fg-muted">unidades</span>
                    </p>
                    <div className="space-y-1 pt-1 border-t border-crm-border/60 text-[11px] text-crm-fg-muted">
                        <div className="flex items-center justify-between">
                            <span>Volumen total:</span>
                            <strong className="text-white font-mono">
                                {formatMoney(realized.totalSalesVolume?.[currencyView] || 0, currencyView)}
                            </strong>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                            <span>Entregados: <strong className="text-emerald-400">{realized.deliveredCount || 0}</strong></span>
                            <span>Pendientes: <strong className="text-amber-300">{realized.pendingDeliveryCount || 0}</strong></span>
                        </div>
                    </div>
                </div>

                {/* 4. Rotación Promedio */}
                <div className="rounded-2xl border border-amber-500/30 bg-crm-surface p-4 sm:p-5 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                            Rotación Promedio
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                            <Clock size={14} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-amber-300 font-mono">
                        {realized.averageDaysImmobilized || 0} <span className="text-xs font-normal text-crm-fg-muted">días</span>
                    </p>
                    <div className="flex items-center justify-between text-xs text-crm-fg-muted pt-1 border-t border-crm-border/60">
                        <span>Stock inmovilizado actual:</span>
                        <strong className="text-white">{inStock.averageDaysInStock || 0} d. prom.</strong>
                    </div>
                </div>

            </div>

            {/* SEPARACIÓN RIGUROSA: Ganancia Económica vs Dinero Cobrado en Efectivo */}
            <div className="rounded-2xl border border-purple-500/25 bg-crm-surface p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-crm-border pb-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-bold text-xs">
                            ⚖️
                        </span>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-white">
                                Regla Central: Margen Económico Devengado vs Efectivo Cobrado — {activePeriodLabel}
                            </h3>
                            <p className="text-[11px] text-crm-fg-muted">
                                Las permutas y las cuotas diferidas no son dinero disponible. Conciliación estricta de las operaciones de {activePeriodLabel}.
                            </p>
                        </div>
                    </div>
                    <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 self-start sm:self-auto">
                        Criterio Canónico AutoSporting
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs font-mono">
                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                            <span className="text-crm-fg-muted font-sans font-bold">1. Margen Comercial Devengado ({currencyView})</span>
                            <span className="text-[10px] text-emerald-400 font-bold font-sans">Agencia: {formatMoney(realized.totalRealizedAgencyNetProfit?.[currencyView] || 0, currencyView)}</span>
                        </div>
                        <p className="text-base font-bold text-white">
                            {formatMoney(realized.totalRealizedNetProfit?.[currencyView] || 0, currencyView)}
                        </p>
                        <p className="text-[10px] text-crm-fg-subtle font-sans">Margen total atribuible a las ventas de {activePeriodLabel}</p>
                    </div>

                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3 space-y-1">
                        <span className="text-crm-fg-muted font-sans font-bold">2. Efectivo Realmente Cobrado ({currencyView})</span>
                        <p className="text-base font-bold text-emerald-400">
                            {formatMoney(realized.totalCashCollected?.[currencyView] || 0, currencyView)}
                        </p>
                        <p className="text-[10px] text-crm-fg-subtle font-sans">Señas y cobros reales ingresados por ventas de {activePeriodLabel}</p>
                    </div>

                    <div className="rounded-xl border border-crm-border bg-crm-bg p-3 space-y-1">
                        <span className="text-crm-fg-muted font-sans font-bold">3. Saldo a Cobrar en Cuotas ({currencyView})</span>
                        <p className="text-base font-bold text-amber-300">
                            {formatMoney(realized.totalPendingReceivable?.[currencyView] || 0, currencyView)}
                        </p>
                        <p className="text-[10px] text-crm-fg-subtle font-sans">Financiación diferida y cuotas pendientes de {activePeriodLabel}</p>
                    </div>
                </div>
            </div>

            {/* BARRA DE FILTROS */}
            <div className="rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5 space-y-4">
                
                {/* Presets de Fecha */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-crm-border/60 pb-3">
                    <div className="flex items-center gap-2">
                        <Filter size={15} className="text-purple-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-white">Período de Análisis:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Selector Desplegable de Mes Directo en Barra de Filtros */}
                        <div className="flex items-center gap-1.5 bg-crm-bg px-2.5 py-1 rounded-xl border border-purple-500/30">
                            <Calendar size={13} className="text-purple-400" />
                            <select
                                value={selectedMonth}
                                onChange={(e) => handleMonthSelect(e.target.value)}
                                className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
                            >
                                <option value="all" className="bg-crm-surface text-white">📅 Todo el Histórico de Ventas</option>
                                <optgroup label="Seleccionar Mes Específico" className="bg-crm-surface text-white">
                                    {monthOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value} className="bg-crm-surface text-white">
                                            {opt.label}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {[
                            { id: 'month', label: 'Este Mes' },
                            { id: 'last_month', label: 'Mes Anterior' },
                            { id: 'quarter', label: 'Trimestre' },
                            { id: 'all', label: 'Histórico Completo' }
                        ].map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyDatePreset(preset.id)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                                    periodPreset === preset.id
                                        ? 'bg-purple-600 text-white shadow-sm'
                                        : 'bg-crm-bg border border-crm-border text-crm-fg-muted hover:text-white'
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Controles de Filtro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    
                    {/* Búsqueda por modelo / marca / patente */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-3 text-crm-fg-muted" />
                        <input
                            type="text"
                            placeholder="Buscar por modelo, marca o patente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg pl-9 pr-3 text-xs text-white placeholder-crm-fg-subtle focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Filtro por Participación */}
                    <div>
                        <select
                            value={participationFilter}
                            onChange={(e) => setParticipationFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors font-bold"
                        >
                            <option value="all">Participación: Todas las operaciones</option>
                            <option value="agency">100% Agencia (Capital Propio)</option>
                            <option value="shared">Con Socios / Coparticipación</option>
                        </select>
                    </div>

                    {/* Fechas personalizadas */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setPeriodPreset('custom');
                            }}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-2.5 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors"
                        />
                        <span className="text-crm-fg-subtle text-xs">a</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setPeriodPreset('custom');
                            }}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-2.5 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Estado específico */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors font-bold"
                        >
                            <option value="all">Estado: Todos</option>
                            <option value="Disponible">En Stock: Disponible</option>
                            <option value="Reservado">En Stock: Reservado</option>
                            <option value="Vendido">Vendido</option>
                        </select>
                    </div>

                    {/* Filtro por Entrega y Reconocimiento */}
                    <div>
                        <select
                            value={deliveryFilter}
                            onChange={(e) => setDeliveryFilter(e.target.value)}
                            className="w-full h-9 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors font-bold"
                        >
                            <option value="all">Entrega: Todas las ventas</option>
                            <option value="delivered">Solo Entregadas (Definitivas)</option>
                            <option value="pending_delivery">Pendientes Entrega (Condicional)</option>
                        </select>
                    </div>

                </div>
            </div>

            {/* TABS DE VISTA PRINCIPAL */}
            <div className="flex border-b border-crm-border gap-2">
                <button
                    type="button"
                    onClick={() => setActiveTab('sold')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                        activeTab === 'sold'
                            ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-xl'
                            : 'border-transparent text-crm-fg-muted hover:text-white'
                    }`}
                >
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    Vendidos (Resultados Realizados)
                    <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-bold">
                        {soldList.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('stock')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                        activeTab === 'stock'
                            ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-xl'
                            : 'border-transparent text-crm-fg-muted hover:text-white'
                    }`}
                >
                    <Clock size={14} className="text-amber-400" />
                    En Stock (Rentabilidad Potencial)
                    <span className="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300 font-bold">
                        {stockList.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('compare')}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                        activeTab === 'compare'
                            ? 'border-purple-500 text-purple-300 bg-purple-500/10 rounded-t-xl'
                            : 'border-transparent text-crm-fg-muted hover:text-white'
                    }`}
                >
                    <Scale size={14} className="text-cyan-400" />
                    Comparador & Eficiencia del Capital
                    {comparedVehicles.length > 0 && (
                        <span className="ml-1 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">
                            {comparedVehicles.length}
                        </span>
                    )}
                </button>
            </div>

            {/* TABLA 1: VENDIDOS (RESULTADOS REALIZADOS) */}
            {activeTab === 'sold' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-crm-fg-muted">
                        <span>
                            Mostrando <strong className="text-white">{soldList.length}</strong> operaciones concretadas.
                        </span>
                        <span className="text-[11px] text-crm-fg-subtle">
                            Podés tildar casillas para enviar vehículos al comparador.
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-crm-border bg-crm-surface custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-crm-border bg-crm-bg/80 text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                    <th className="p-3 w-10 text-center">Comp.</th>
                                    <th className="p-3">Vehículo</th>
                                    <th className="p-3 text-center">Entrega / Política</th>
                                    <th className="p-3">Fechas</th>
                                    <th className="p-3 text-center">Inmovilizado</th>
                                    <th className="p-3 text-right">Precio Venta</th>
                                    <th className="p-3 text-right">Costo Total</th>
                                    <th className="p-3 text-right" title="Margen Comercial Neto / Contribución antes de costos fijos de estructura general e impuestos">Margen Com. Neto</th>
                                    <th className="p-3 text-center">Margen %</th>
                                    <th className="p-3 text-center">Participación</th>
                                    <th className="p-3 text-right">Margen Agencia</th>
                                    <th className="p-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border/60 font-mono">
                                {soldList.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="p-12 text-center text-crm-fg-muted font-sans">
                                            No se encontraron ventas concretadas con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    soldList.map((v) => {
                                        const isCompared = comparedVehicles.some(c => c.carId === v.carId);
                                        const cur = v.currency;
                                        return (
                                            <tr key={v.carId} className="hover:bg-white/[0.02] transition-colors">
                                                
                                                {/* Checkbox de Comparación */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isCompared}
                                                        onChange={() => toggleCompare(v)}
                                                        className="h-4 w-4 rounded border-crm-border bg-crm-bg text-purple-600 focus:ring-0 cursor-pointer"
                                                        title="Agregar / Quitar del comparador"
                                                    />
                                                </td>

                                                {/* Vehículo */}
                                                <td className="p-3 font-sans">
                                                    <p className="font-bold text-white text-sm">{v.brand} {v.name}</p>
                                                    <p className="text-[11px] text-crm-fg-muted flex items-center gap-1.5">
                                                        <span>Año {v.year}</span>
                                                        {v.plateOrVin && (
                                                            <span className="font-mono bg-crm-bg px-1.5 py-0.2 rounded border border-crm-border/60 text-[10px]">
                                                                {v.plateOrVin}
                                                            </span>
                                                        )}
                                                        {v.tradeIns?.hasTradeInOrigin && (
                                                            <span className="text-[10px] text-purple-300 font-bold">
                                                                [Toma Permuta]
                                                            </span>
                                                        )}
                                                    </p>
                                                </td>

                                                {/* Estado de Entrega y Reconocimiento */}
                                                <td className="p-3 text-center font-sans">
                                                    {v.isDelivered ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                            <CheckCircle2 size={10} /> Entregada
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30" title="Devengado condicional a la entrega física y transferencia">
                                                            <Clock size={10} /> Pendiente
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Fechas */}
                                                <td className="p-3 font-sans text-[11px] text-crm-fg-muted">
                                                    <p>Ingreso: <strong className="text-crm-fg">{v.intakeDate || 'N/D'}</strong></p>
                                                    <p>Venta: <strong className="text-white">{v.saleDate || 'N/D'}</strong></p>
                                                </td>

                                                {/* Días Inmovilizado */}
                                                <td className="p-3 text-center font-sans">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                                        v.daysImmobilized >= 90
                                                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                            : v.daysImmobilized >= 60
                                                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                    }`}>
                                                        <Clock size={11} /> {v.daysImmobilized} d.
                                                    </span>
                                                </td>

                                                {/* Precio Venta */}
                                                <td className="p-3 text-right text-white font-bold">
                                                    {formatMoney(v.agreedPrice, cur)}
                                                </td>

                                                {/* Costo Total */}
                                                <td className="p-3 text-right text-crm-fg">
                                                    {formatMoney(v.totalCostWithSaleExpenses, cur)}
                                                    <span className="block font-sans text-[10px] text-crm-fg-subtle">
                                                        {v.acquisitionSource}
                                                    </span>
                                                </td>

                                                {/* Ganancia Neta */}
                                                <td className={`p-3 text-right font-bold ${
                                                    v.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    {formatMoney(v.netProfit, cur)}
                                                </td>

                                                {/* Margen % */}
                                                <td className="p-3 text-center text-cyan-400 font-bold">
                                                    {v.marginOnCostPct !== null ? `${v.marginOnCostPct}%` : 'N/D'}
                                                </td>

                                                {/* Participación */}
                                                <td className="p-3 text-center font-sans">
                                                    {v.participation?.hasPartner ? (
                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                            {v.participation.agencyPercentage}% Propio
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                            100% Agencia
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Ganancia Agencia */}
                                                <td className={`p-3 text-right font-bold ${
                                                    v.agencyNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    {formatMoney(v.agencyNetProfit, cur)}
                                                </td>

                                                {/* Acciones */}
                                                <td className="p-3 text-center font-sans">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedVehicle(v)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 text-xs font-bold transition-colors"
                                                    >
                                                        <Eye size={12} /> Ficha
                                                    </button>
                                                </td>

                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TABLA 2: EN STOCK (RENTABILIDAD POTENCIAL) */}
            {activeTab === 'stock' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-crm-fg-muted">
                        <span>
                            Mostrando <strong className="text-white">{stockList.length}</strong> vehículos disponibles en inventario.
                        </span>
                        <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Estimaciones potenciales no realizadas
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-crm-border bg-crm-surface custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-crm-border bg-crm-bg/80 text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                                    <th className="p-3 w-10 text-center">Comp.</th>
                                    <th className="p-3">Vehículo</th>
                                    <th className="p-3 text-center">Estado</th>
                                    <th className="p-3 text-center">Días en Salón</th>
                                    <th className="p-3 text-right">Precio de Lista</th>
                                    <th className="p-3 text-right">Costo Inmovilizado</th>
                                    <th className="p-3 text-right">Capital Propio</th>
                                    <th className="p-3 text-right">Margen Potencial</th>
                                    <th className="p-3 text-center">Margen % Pot.</th>
                                    <th className="p-3 text-center">Participación</th>
                                    <th className="p-3 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border/60 font-mono">
                                {stockList.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-12 text-center text-crm-fg-muted font-sans">
                                            No se encontraron vehículos en stock con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    stockList.map((v) => {
                                        const isCompared = comparedVehicles.some(c => c.carId === v.carId);
                                        const cur = v.currency;
                                        return (
                                            <tr key={v.carId} className="hover:bg-white/[0.02] transition-colors">
                                                
                                                {/* Checkbox de Comparación */}
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isCompared}
                                                        onChange={() => toggleCompare(v)}
                                                        className="h-4 w-4 rounded border-crm-border bg-crm-bg text-purple-600 focus:ring-0 cursor-pointer"
                                                        title="Agregar / Quitar del comparador"
                                                    />
                                                </td>

                                                {/* Vehículo */}
                                                <td className="p-3 font-sans">
                                                    <p className="font-bold text-white text-sm">{v.brand} {v.name}</p>
                                                    <p className="text-[11px] text-crm-fg-muted flex items-center gap-1.5">
                                                        <span>Año {v.year}</span>
                                                        {v.plateOrVin && (
                                                            <span className="font-mono bg-crm-bg px-1.5 py-0.2 rounded border border-crm-border/60 text-[10px]">
                                                                {v.plateOrVin}
                                                            </span>
                                                        )}
                                                    </p>
                                                </td>

                                                {/* Estado */}
                                                <td className="p-3 text-center font-sans">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                                                        v.status === 'Disponible'
                                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    }`}>
                                                        {v.status}
                                                    </span>
                                                </td>

                                                {/* Días en Stock */}
                                                <td className="p-3 text-center font-sans">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                                        v.daysInStock >= 90
                                                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                            : v.daysInStock >= 60
                                                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                    }`}>
                                                        <Clock size={11} /> {v.daysInStock} d.
                                                    </span>
                                                </td>

                                                {/* Precio Lista */}
                                                <td className="p-3 text-right text-white font-bold">
                                                    {formatMoney(v.listPrice, cur)}
                                                </td>

                                                {/* Costo Inmovilizado */}
                                                <td className="p-3 text-right text-crm-fg">
                                                    {formatMoney(v.totalEconomicCost, v.acquisitionCurrency || cur)}
                                                </td>

                                                {/* Capital Propio */}
                                                <td className="p-3 text-right text-white font-bold">
                                                    {formatMoney(v.agencyCapitalInvested, v.acquisitionCurrency || cur)}
                                                </td>

                                                {/* Margen Potencial */}
                                                <td className={`p-3 text-right font-bold ${
                                                    v.potentialNetProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                    {formatMoney(v.potentialNetProfit, cur)}
                                                </td>

                                                {/* Margen % Potencial */}
                                                <td className="p-3 text-center text-cyan-400 font-bold">
                                                    {v.potentialMarginPct !== null ? `${v.potentialMarginPct}%` : 'N/D'}
                                                </td>

                                                {/* Participación */}
                                                <td className="p-3 text-center font-sans">
                                                    {v.participation?.hasPartner ? (
                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                                            {v.participation.agencyPercentage}% Propio
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                            100% Agencia
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Acciones */}
                                                <td className="p-3 text-center font-sans">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedVehicle(v)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 text-xs font-bold transition-colors"
                                                    >
                                                        <Eye size={12} /> Ficha
                                                    </button>
                                                </td>

                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TABLA 3: COMPARADOR & EFICIENCIA DEL CAPITAL */}
            {activeTab === 'compare' && (
                <VehicleComparisonMatrix
                    vehicles={comparedVehicles}
                    onRemove={(carId) => setComparedVehicles(prev => prev.filter(c => c.carId !== carId))}
                    onClearAll={() => setComparedVehicles([])}
                    onViewDetail={(v) => setSelectedVehicle(v)}
                />
            )}

            {/* MODAL DE FICHA DETALLADA DE RENTABILIDAD */}
            {selectedVehicle && (
                <VehicleProfitabilityDetailModal
                    isOpen={Boolean(selectedVehicle)}
                    onClose={() => setSelectedVehicle(null)}
                    vehicle={selectedVehicle}
                    onNavigateToStock={(id) => {
                        window.location.href = `/admin/stock/${id}`;
                    }}
                />
            )}

        </div>
    );
}
