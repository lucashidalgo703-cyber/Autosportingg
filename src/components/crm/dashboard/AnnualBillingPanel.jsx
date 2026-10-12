import React, { useState, useMemo } from 'react';
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
    CheckCircle2
} from 'lucide-react';

function formatNumber(value) {
    return new Intl.NumberFormat('es-AR').format(value || 0);
}

function formatCurrency(value) {
    return formatNumber(Math.round(value || 0));
}

export default function AnnualBillingPanel({
    annualSummary = {},
    historicalTotal = null,
    hideAmounts = false,
    canSeeFinancials = true,
    className = ''
}) {
    const [selectedModal, setSelectedModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currencyFilter, setCurrencyFilter] = useState('ALL'); // 'ALL' | 'USD' | 'ARS'

    const currentYear = new Date().getFullYear();

    // Convertir annualSummary en un array ordenado por año descendente
    const yearsList = useMemo(() => {
        const rawEntries = Object.values(annualSummary || {});
        if (rawEntries.length === 0) {
            return [
                { year: currentYear - 2, carsCount: 0, totalARS: 0, totalUSD: 0, sales: [] },
                { year: currentYear - 1, carsCount: 0, totalARS: 0, totalUSD: 0, sales: [] },
                { year: currentYear, carsCount: 0, totalARS: 0, totalUSD: 0, sales: [] }
            ];
        }
        return [...rawEntries].sort((a, b) => Number(b.year) - Number(a.year));
    }, [annualSummary, currentYear]);

    const totalCarsHistorical = historicalTotal?.carsCount || 0;
    const totalUsdHistorical = historicalTotal?.totalUSD || 0;
    const totalArsHistorical = historicalTotal?.totalARS || 0;
    const startYear = historicalTotal?.startYear || currentYear;

    const handleOpenModal = (title, period, sales, totalUSD, totalARS) => {
        setSelectedModal({
            title,
            period,
            sales: sales || [],
            totalUSD: totalUSD || 0,
            totalARS: totalARS || 0
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

    // Totales dinámicos según el filtro aplicado en el modal
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

    return (
        <section className={`rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5 ${className}`}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-crm-fg-muted">
                        <DollarSign size={14} className="text-emerald-400" />
                        Facturación anual e histórica
                    </h3>
                    <p className="mt-1 text-xs text-crm-fg-muted">
                        Cálculo automático desde la apertura del CRM ({startYear} - {currentYear})
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        handleOpenModal(
                            'Histórico Total de Facturación',
                            `Desde el inicio (${startYear} - ${currentYear})`,
                            historicalTotal?.sales || [],
                            totalUsdHistorical,
                            totalArsHistorical
                        )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20 hover:text-white cursor-pointer"
                >
                    <ExternalLink size={13} />
                    Ver histórico completo ({totalCarsHistorical} ventas)
                </button>
            </div>

            {/* Tarjeta destacada de Facturación Histórica Acumulada */}
            <div
                onClick={() =>
                    handleOpenModal(
                        'Histórico Total de Facturación',
                        `Desde el inicio (${startYear} - ${currentYear})`,
                        historicalTotal?.sales || [],
                        totalUsdHistorical,
                        totalArsHistorical
                    )
                }
                className="group mb-4 cursor-pointer rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-crm-surface-raised to-crm-surface p-4 transition-all hover:border-indigo-400/60 hover:shadow-lg sm:p-5"
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-md border border-indigo-400/30 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                Acumulado Total
                            </span>
                            <span className="text-xs font-medium text-crm-fg-muted">
                                Desde {startYear} hasta hoy
                            </span>
                        </div>
                        <h4 className="mt-2 text-lg font-bold text-crm-fg group-hover:text-indigo-200 transition-colors">
                            Facturación Total Histórica
                        </h4>
                        <p className="mt-1 text-xs text-crm-fg-muted">
                            {formatNumber(totalCarsHistorical)} {totalCarsHistorical === 1 ? 'operación registrada' : 'operaciones registradas'} en el CRM
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="border-l border-crm-border/60 pl-4 sm:pl-6">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Total USD</p>
                            <p className="mt-1 text-xl font-black text-emerald-400 sm:text-2xl">
                                {hideAmounts ? '***' : `USD ${formatCurrency(totalUsdHistorical)}`}
                            </p>
                        </div>
                        {totalArsHistorical > 0 && (
                            <div className="border-l border-crm-border/60 pl-4 sm:pl-6">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Total ARS</p>
                                <p className="mt-1 text-lg font-bold text-crm-fg-muted sm:text-xl">
                                    {hideAmounts ? '***' : `ARS ${formatCurrency(totalArsHistorical)}`}
                                </p>
                            </div>
                        )}
                        <span className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 transition-transform group-hover:translate-x-1">
                            <ChevronRight size={18} />
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid de Resumen Anual */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {yearsList.map((item) => {
                    const isCurrent = Number(item.year) === currentYear;
                    const cars = item.carsCount || 0;
                    const totalUSD = item.totalUSD || 0;
                    const totalARS = item.totalARS || 0;

                    return (
                        <div
                            key={item.year}
                            onClick={() =>
                                handleOpenModal(
                                    `Facturación Anual ${item.year}`,
                                    isCurrent ? `Año ${item.year} · En Curso` : `Año ${item.year} · Cerrado`,
                                    item.sales || [],
                                    totalUSD,
                                    totalARS
                                )
                            }
                            className={`group cursor-pointer rounded-xl border p-4 transition-all hover:border-crm-red/40 hover:bg-crm-surface-raised ${
                                isCurrent
                                    ? 'border-indigo-400/40 bg-indigo-500/10'
                                    : 'border-crm-border bg-crm-surface-raised'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-crm-fg">
                                    {item.year} {isCurrent ? '· EN CURSO' : ''}
                                </p>
                                <span className="text-[11px] font-semibold text-indigo-300 opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-0.5">
                                    Ver ventas <ArrowUpRight size={12} />
                                </span>
                            </div>

                            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-crm-fg-muted">
                                {formatNumber(cars)} {cars === 1 ? 'auto vendido' : 'autos vendidos'}
                            </p>

                            <div className="mt-2 space-y-1">
                                <p className="text-lg font-bold text-crm-fg">
                                    {hideAmounts ? '***' : `USD ${formatCurrency(totalUSD)}`}
                                </p>
                                {totalARS > 0 && (
                                    <p className="text-xs font-semibold text-crm-fg-muted">
                                        + {hideAmounts ? '***' : `ARS ${formatCurrency(totalARS)}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL DETALLADO DE VENTAS Y FACTURACIÓN */}
            {selectedModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
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
                                    {selectedModal.period} · {selectedModal.sales.length} operaciones totales
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

                        {/* Métricas destacadas dentro del Modal */}
                        <div className="grid grid-cols-2 gap-3 border-b border-crm-border bg-crm-surface-raised/40 p-4 sm:grid-cols-4 sm:px-6">
                            <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Operaciones</p>
                                <p className="mt-1 text-xl font-bold text-crm-fg">{formatNumber(filteredModalSales.length)}</p>
                            </div>
                            <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Facturación USD</p>
                                <p className="mt-1 text-xl font-bold text-emerald-400">
                                    {hideAmounts ? '***' : `USD ${formatCurrency(modalTotals.usd)}`}
                                </p>
                            </div>
                            <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Facturación ARS</p>
                                <p className="mt-1 text-xl font-bold text-crm-fg">
                                    {hideAmounts ? '***' : `ARS ${formatCurrency(modalTotals.ars)}`}
                                </p>
                            </div>
                            {canSeeFinancials && (
                                <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Margen USD</p>
                                    <p className="mt-1 text-xl font-bold text-indigo-300">
                                        {hideAmounts ? '***' : `USD ${formatCurrency(modalTotals.profitUSD)}`}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Barra de Filtros y Búsqueda */}
                        <div className="flex flex-col gap-3 border-b border-crm-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por auto, patente, cliente, vendedor o medio de pago..."
                                    className="w-full rounded-lg border border-crm-border bg-crm-bg py-2 pl-9 pr-3 text-xs text-crm-fg placeholder-crm-fg-muted focus:border-crm-red focus:outline-none"
                                />
                            </div>
                            <div className="flex items-center gap-1.5 self-start sm:self-auto">
                                <span className="text-[11px] font-semibold text-crm-fg-muted mr-1">Moneda:</span>
                                {['ALL', 'USD', 'ARS'].map((curr) => (
                                    <button
                                        key={curr}
                                        type="button"
                                        onClick={() => setCurrencyFilter(curr)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                                            currencyFilter === curr
                                                ? 'bg-crm-red text-white'
                                                : 'border border-crm-border bg-crm-surface-raised text-crm-fg-muted hover:text-crm-fg'
                                        }`}
                                    >
                                        {curr === 'ALL' ? 'Todas' : curr}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tabla de Ventas */}
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
                                                <th className="py-3 pr-4">Medio de Pago</th>
                                                <th className="py-3 pr-4 text-right">Precio Venta</th>
                                                {canSeeFinancials && <th className="py-3 text-right">Ganancia</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-crm-border/60">
                                            {filteredModalSales.map((sale, idx) => {
                                                const sDate = sale.date ? new Date(sale.date) : null;
                                                const formattedDate = sDate && !isNaN(sDate.getTime())
                                                    ? sDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                    : '—';

                                                return (
                                                    <tr key={sale.id || idx} className="hover:bg-crm-surface-raised transition-colors">
                                                        <td className="py-3 pr-4 whitespace-nowrap text-crm-fg-muted font-mono text-[11px]">
                                                            {formattedDate}
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
                                                        <td className="py-3 pr-4 text-right font-bold text-emerald-400 whitespace-nowrap">
                                                            {hideAmounts ? '***' : `${sale.saleCurrency} ${formatCurrency(sale.salePrice)}`}
                                                        </td>
                                                        {canSeeFinancials && (
                                                            <td className="py-3 text-right font-bold whitespace-nowrap">
                                                                {hideAmounts ? (
                                                                    '***'
                                                                ) : sale.profitUSD > 0 ? (
                                                                    <span className="text-emerald-400 font-mono">USD {formatCurrency(sale.profitUSD)}</span>
                                                                ) : sale.profitARS > 0 ? (
                                                                    <span className="text-emerald-400 font-mono">ARS {formatCurrency(sale.profitARS)}</span>
                                                                ) : (
                                                                    <span className="text-crm-fg-muted">—</span>
                                                                )}
                                                            </td>
                                                        )}
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
