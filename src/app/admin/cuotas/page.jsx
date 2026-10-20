"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Search,
    Filter,
    Plus,
    Clock,
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    DollarSign,
    Car,
    User,
    ArrowRight,
    CreditCard,
    History,
    FileText,
    Calendar,
    HandCoins,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import CrmBadge from '../../../components/crm/ui/CrmBadge';
import RescheduleInstallmentModal from '../../../components/crm/installments/RescheduleInstallmentModal';
import CancelRescheduleModal from '../../../components/crm/installments/CancelRescheduleModal';
import InstallmentHistoryModal from '../../../components/crm/installments/InstallmentHistoryModal';
import TreasuryCollectAndDistributeModal from '../../../components/crm/treasury/TreasuryCollectAndDistributeModal';
import PayInstallmentModal from '../../../components/crm/installments/PayInstallmentModal';
import InstallmentModal from '../../../components/crm/installments/InstallmentModal';

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CuotasPage() {
    const today = useMemo(() => new Date(), []);
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    const [criteria, setCriteria] = useState('original'); // 'original' | 'rescheduled' | 'collected'
    const [statusFilter, setStatusFilter] = useState('todas'); // 'todas' | 'pendiente' | 'pagada' | 'reprogramada'
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyPrevPending, setShowOnlyPrevPending] = useState(false);

    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState({
        ars: { totalExpected: 0, totalCollected: 0, totalPending: 0, countTotal: 0, countPaid: 0, countPending: 0, countRescheduled: 0 },
        usd: { totalExpected: 0, totalCollected: 0, totalPending: 0, countTotal: 0, countPaid: 0, countPending: 0, countRescheduled: 0 }
    });
    const [previousPendingCount, setPreviousPendingCount] = useState(0);

    // Modales
    const [rescheduleModalItem, setRescheduleModalItem] = useState(null);
    const [cancelModalItem, setCancelModalItem] = useState(null);
    const [historyModalId, setHistoryModalId] = useState(null);
    const [collectModalItem, setCollectModalItem] = useState(null);
    const [directPayItem, setDirectPayItem] = useState(null);
    const [isCreateInstallmentOpen, setIsCreateInstallmentOpen] = useState(false);

    // Cuentas de banco para pagos
    const [accounts, setAccounts] = useState([]);

    const fetchAccounts = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/accounts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAccounts(data.accounts || (Array.isArray(data) ? data : []));
            }
        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    }, []);

    const fetchMonthlyData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                month: String(selectedMonth),
                year: String(selectedYear),
                criteria,
                status: statusFilter,
                search: searchTerm,
                onlyPreviousPending: showOnlyPrevPending ? 'true' : 'false'
            });

            const res = await fetch(`/api/admin/installments/monthly?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Error al obtener cuotas del mes');
            }

            const data = await res.json();
            setItems(data.items || []);
            if (data.summary) setSummary(data.summary);
            setPreviousPendingCount(data.previousPendingCount || 0);
        } catch (err) {
            console.error(err);
            toast.error(err.message || 'Error cargando datos');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, criteria, statusFilter, searchTerm, showOnlyPrevPending]);

    useEffect(() => {
        fetchMonthlyData();
    }, [fetchMonthlyData]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    // Navegación de mes
    const handlePrevMonth = () => {
        setShowOnlyPrevPending(false);
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(prev => prev - 1);
        } else {
            setSelectedMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = () => {
        setShowOnlyPrevPending(false);
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(prev => prev + 1);
        } else {
            setSelectedMonth(prev => prev + 1);
        }
    };

    const handleResetToCurrentMonth = () => {
        setShowOnlyPrevPending(false);
        setSelectedMonth(today.getMonth() + 1);
        setSelectedYear(today.getFullYear());
    };

    const isCurrentMonth = selectedMonth === (today.getMonth() + 1) && selectedYear === today.getFullYear() && !showOnlyPrevPending;

    // Manejador de registro de cobro
    const handlePayClick = (item) => {
        if (item.saleId?._id || item.saleId) {
            setCollectModalItem(item);
        } else {
            setDirectPayItem(item);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header principal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarDays className="text-blue-500" size={24} />
                        <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                            Cuotas y Cobranzas
                        </h1>
                    </div>
                    <p className="text-xs text-neutral-400">
                        Gestión mensual de cuotas, cobranzas y reprogramaciones pactadas
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCreateInstallmentOpen(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-500/10"
                    >
                        <Plus size={16} />
                        <span>Nueva Cuota / Plan</span>
                    </button>
                    <button
                        onClick={fetchMonthlyData}
                        className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="Actualizar datos"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Barra de navegación de mes y año */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Selector y botones de mes */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-black/40 border border-neutral-800 rounded-xl p-1">
                        <button
                            onClick={handlePrevMonth}
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                            title="Mes anterior"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="px-3 py-1 text-sm font-bold text-white flex items-center gap-2">
                            <span>{MONTH_NAMES[selectedMonth - 1]}</span>
                            <span className="text-neutral-400 font-mono">{selectedYear}</span>
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
                            title="Mes siguiente"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {!isCurrentMonth && (
                        <button
                            onClick={handleResetToCurrentMonth}
                            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
                        >
                            <RotateCcw size={13} />
                            <span>Mes actual</span>
                        </button>
                    )}

                    {/* Botón de pendientes de meses anteriores */}
                    <button
                        onClick={() => setShowOnlyPrevPending(prev => !prev)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border ${
                            showOnlyPrevPending
                                ? 'bg-amber-500 text-black border-amber-400'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                        }`}
                    >
                        <AlertCircle size={14} />
                        <span>Pendientes anteriores:</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                            showOnlyPrevPending ? 'bg-black text-amber-400' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                            {previousPendingCount}
                        </span>
                    </button>
                </div>

                {/* Criterio de fecha */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Criterio:</span>
                    <select
                        value={criteria}
                        onChange={(e) => {
                            setCriteria(e.target.value);
                            setShowOnlyPrevPending(false);
                        }}
                        disabled={showOnlyPrevPending}
                        className="bg-black/50 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                    >
                        <option value="original">Vencimiento original (defecto)</option>
                        <option value="rescheduled">Fecha de cobro prevista</option>
                        <option value="collected">Cobros realizados en el mes</option>
                    </select>
                </div>
            </div>

            {/* Resumen del mes separado por moneda */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resumen ARS */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                $
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Resumen ARS</h3>
                                <span className="text-[10px] text-neutral-400 font-medium">Moneda nacional</span>
                            </div>
                        </div>
                        <div className="flex gap-2 text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {summary.ars.countPaid} pagadas
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {summary.ars.countRescheduled} reprog.
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                                {summary.ars.countPending} pendientes
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total a cobrar</span>
                            <span className="text-sm md:text-base font-bold font-mono text-white">
                                ${summary.ars.totalExpected.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Efectivo cobrado</span>
                            <span className="text-sm md:text-base font-bold font-mono text-emerald-400">
                                ${summary.ars.totalCollected.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Saldo pendiente</span>
                            <span className="text-sm md:text-base font-bold font-mono text-amber-400">
                                ${summary.ars.totalPending.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resumen USD */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                                USD
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Resumen USD</h3>
                                <span className="text-[10px] text-neutral-400 font-medium">Dólares estadounidenses</span>
                            </div>
                        </div>
                        <div className="flex gap-2 text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {summary.usd.countPaid} pagadas
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {summary.usd.countRescheduled} reprog.
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300">
                                {summary.usd.countPending} pendientes
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Total a cobrar</span>
                            <span className="text-sm md:text-base font-bold font-mono text-white">
                                USD {summary.usd.totalExpected.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Efectivo cobrado</span>
                            <span className="text-sm md:text-base font-bold font-mono text-emerald-400">
                                USD {summary.usd.totalCollected.toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-neutral-500 block">Saldo pendiente</span>
                            <span className="text-sm md:text-base font-bold font-mono text-amber-400">
                                USD {summary.usd.totalPending.toLocaleString('es-AR')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros de estado y buscador */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Pestañas de estado */}
                <div className="flex gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
                    {[
                        { key: 'todas', label: 'Todas' },
                        { key: 'pendiente', label: 'Pendientes' },
                        { key: 'pagada', label: 'Pagadas' },
                        { key: 'reprogramada', label: 'Reprogramadas' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                                statusFilter === tab.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, patente o vehículo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                </div>
            </div>

            {/* Lista / Tabla de cuotas */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-neutral-400 gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-xs">Cargando cuotas del mes...</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-16 text-center text-neutral-400 space-y-2">
                        <CalendarDays className="mx-auto text-neutral-600" size={32} />
                        <h4 className="text-sm font-bold text-white">No hay cuotas para el criterio seleccionado</h4>
                        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                            {showOnlyPrevPending
                                ? 'No se registran cuotas pendientes de meses anteriores.'
                                : 'Probá navegando a otro mes o cambiando los filtros de búsqueda.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-crm-surface border-b border-neutral-800 text-[10px] uppercase tracking-wider text-neutral-400 font-bold">
                                <tr>
                                    <th className="py-3 px-4">Cliente</th>
                                    <th className="py-3 px-4">Vehículo</th>
                                    <th className="py-3 px-4">Cuota</th>
                                    <th className="py-3 px-4">Importe</th>
                                    <th className="py-3 px-4">Cobrado / Saldo</th>
                                    <th className="py-3 px-4">Vencimiento</th>
                                    <th className="py-3 px-4">Estado</th>
                                    <th className="py-3 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                                {items.map((item) => {
                                    const clientName = item.client?.fullName || item.client?.firstName || 'Sin cliente';
                                    const clientPhone = item.client?.phone || '';
                                    const vehicleText = item.vehicle?.brand ? `${item.vehicle.brand} ${item.vehicle.name || ''}` : 'Vehículo';
                                    const vehiclePlate = item.vehicle?.plateOrVin || '';

                                    const curr = item.currency === 'USD' ? 'USD' : '$';
                                    const origDueStr = item.originalDueDate ? new Date(item.originalDueDate).toLocaleDateString('es-AR') : '-';
                                    const effDueStr = item.effectiveDueDate ? new Date(item.effectiveDueDate).toLocaleDateString('es-AR') : '-';

                                    return (
                                        <tr key={item._id} className="hover:bg-neutral-800/40 transition-colors">
                                            {/* Cliente */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white">{clientName}</span>
                                                    {clientPhone && <span className="text-[10px] text-neutral-500 font-mono">{clientPhone}</span>}
                                                </div>
                                            </td>

                                            {/* Vehículo */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white">{vehicleText}</span>
                                                    {vehiclePlate && (
                                                        <span className="text-[10px] font-mono text-neutral-400 font-semibold">
                                                            {vehiclePlate}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Número de cuota y venta */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white font-mono">
                                                        #{item.installmentNumber || 1} de {item.totalInstallments || 1}
                                                    </span>
                                                    {item.saleId?._id && (
                                                        <Link
                                                            href={`/admin/ventas/${item.saleId._id}`}
                                                            className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                                                        >
                                                            Ver venta
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Importe pactado */}
                                            <td className="py-3.5 px-4">
                                                <span className="font-mono font-bold text-white text-xs">
                                                    {curr} {Number(item.amount || 0).toLocaleString('es-AR')}
                                                </span>
                                            </td>

                                            {/* Cobrado y saldo */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-col font-mono text-[11px]">
                                                    <span className="text-emerald-400">
                                                        Cobrado: {curr} {Number(item.paidAmount || 0).toLocaleString('es-AR')}
                                                    </span>
                                                    <span className="text-amber-400 font-bold">
                                                        Saldo: {curr} {Number(item.pendingAmount || 0).toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Fechas de vencimiento */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-col text-[11px]">
                                                    <span className="text-neutral-400">
                                                        Orig: <strong className="font-mono text-neutral-300">{origDueStr}</strong>
                                                    </span>
                                                    {item.isRescheduled && (
                                                        <span className="text-amber-400 font-bold">
                                                            Acordada: <strong className="font-mono">{effDueStr}</strong>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Estado principal y alertas */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    {item.mainStatus === 'PAGADO' ? (
                                                        <CrmBadge variant="success">PAGADO</CrmBadge>
                                                    ) : item.mainStatus === 'REPROGRAMADO' ? (
                                                        <CrmBadge variant="warning">REPROGRAMADO</CrmBadge>
                                                    ) : (
                                                        <CrmBadge variant="neutral">PENDIENTE</CrmBadge>
                                                    )}

                                                    {/* Alertas complementarias */}
                                                    {item.isAgreedDateOverdue && (
                                                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                                                            Fecha acordada vencida
                                                        </span>
                                                    )}
                                                    {item.isOverdue && !item.isAgreedDateOverdue && (
                                                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                                                            Vencida: {item.daysOverdue} {item.daysOverdue === 1 ? 'día' : 'días'}
                                                        </span>
                                                    )}
                                                    {item.isPartial && (
                                                        <span className="text-[10px] font-medium text-amber-300">
                                                            Pago parcial registrado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Acciones por fila */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    {/* Registrar pago */}
                                                    {item.mainStatus !== 'PAGADO' && (
                                                        <button
                                                            onClick={() => handlePayClick(item)}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shadow-sm"
                                                            title="Registrar cobro de cuota"
                                                        >
                                                            Cobrar
                                                        </button>
                                                    )}

                                                    {/* Reprogramar */}
                                                    {item.mainStatus !== 'PAGADO' && (
                                                        <button
                                                            onClick={() => setRescheduleModalItem(item)}
                                                            className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[11px] font-semibold transition-colors border border-neutral-700"
                                                            title="Reprogramar fecha de vencimiento"
                                                        >
                                                            Reprogramar
                                                        </button>
                                                    )}

                                                    {/* Cancelar reprogramación */}
                                                    {item.isRescheduled && (
                                                        <button
                                                            onClick={() => setCancelModalItem(item)}
                                                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[11px] font-semibold transition-colors border border-red-500/20"
                                                            title="Restaurar fecha de vencimiento original"
                                                        >
                                                            Restaurar
                                                        </button>
                                                    )}

                                                    {/* Ver historial */}
                                                    <button
                                                        onClick={() => setHistoryModalId(item._id)}
                                                        className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                                                        title="Ver historial de cuota"
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Reprogramación */}
            <RescheduleInstallmentModal
                isOpen={Boolean(rescheduleModalItem)}
                onClose={() => setRescheduleModalItem(null)}
                installment={rescheduleModalItem}
                onSuccess={fetchMonthlyData}
            />

            {/* Modal de Cancelar Reprogramación */}
            <CancelRescheduleModal
                isOpen={Boolean(cancelModalItem)}
                onClose={() => setCancelModalItem(null)}
                installment={cancelModalItem}
                onSuccess={fetchMonthlyData}
            />

            {/* Modal de Historial */}
            <InstallmentHistoryModal
                isOpen={Boolean(historyModalId)}
                onClose={() => setHistoryModalId(null)}
                installmentId={historyModalId}
            />

            {/* Modal de Cobro Tesorería Estratégica */}
            {collectModalItem && (
                <TreasuryCollectAndDistributeModal
                    isOpen={Boolean(collectModalItem)}
                    onClose={() => setCollectModalItem(null)}
                    accounts={accounts}
                    initialSaleId={collectModalItem.saleId?._id || collectModalItem.saleId}
                    initialInstallmentId={collectModalItem._id}
                    onSuccess={() => {
                        setCollectModalItem(null);
                        fetchMonthlyData();
                    }}
                />
            )}

            {/* Modal de Pago Directo cuando no tiene venta asociada */}
            {directPayItem && (
                <PayInstallmentModal
                    isOpen={Boolean(directPayItem)}
                    onClose={() => setDirectPayItem(null)}
                    installment={directPayItem}
                    accounts={accounts}
                    onPay={async (id, payData) => {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`/api/admin/installments/${id}/pay`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(payData)
                        });
                        const d = await res.json();
                        if (!res.ok) throw new Error(d.message || 'Error registrando cobro');
                        toast.success('Cobro registrado exitosamente');
                        setDirectPayItem(null);
                        fetchMonthlyData();
                    }}
                />
            )}

            {/* Modal de Creación de Nueva Cuota */}
            <InstallmentModal
                isOpen={isCreateInstallmentOpen}
                onClose={() => setIsCreateInstallmentOpen(false)}
                mode="create"
                onSave={async (newInstData) => {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/admin/installments', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(newInstData)
                    });
                    const d = await res.json();
                    if (!res.ok) throw new Error(d.message || 'Error creando cuota');
                    toast.success('Cuota creada con éxito');
                    setIsCreateInstallmentOpen(false);
                    fetchMonthlyData();
                }}
            />
        </div>
    );
}
