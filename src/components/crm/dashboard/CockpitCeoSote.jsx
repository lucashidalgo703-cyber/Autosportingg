import { useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    ArrowUpRight,
    Award,
    Car,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    ClipboardCheck,
    DollarSign,
    ExternalLink,
    Gauge,
    Landmark,
    ShieldAlert,
    Star,
    TrendingUp,
} from 'lucide-react';
import UpcomingDuesPanel from './UpcomingDuesPanel';
import AnnualBillingPanel from './AnnualBillingPanel';
import MonthlyGainPanel from './MonthlyGainPanel';

const monthLabel = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date());

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


function KpiPanel({ title, icon: Icon, children, href, onClick, className = '', style }) {
    const content = (
        <div
            className={`relative h-full rounded-xl border border-crm-border bg-crm-surface p-4 transition-colors sm:rounded-2xl sm:p-5 ${(href || onClick) ? 'hover:border-crm-red/35 hover:bg-crm-surface-raised cursor-pointer' : ''} ${className}`}
            style={style}
            onClick={onClick}
        >
            <div className="mb-5 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-surface-raised text-crm-fg-muted">
                    <Icon size={16} />
                </span>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-crm-fg-muted">{title}</p>
            </div>
            {children}
        </div>
    );

    if (href) {
        return <Link href={href} className="block text-inherit no-underline">{content}</Link>;
    }

    return content;
}

function ProgressLine({ value = 0, color = 'bg-crm-red' }) {
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-crm-bg">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
        </div>
    );
}

function CashProjectionCard({ label, value, detail, tone = 'neutral' }) {
    const toneMap = {
        neutral: 'border-crm-border bg-crm-surface-raised text-crm-fg',
        green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        red: 'border-red-500/30 bg-crm-red/10 text-red-200'
    };

    return (
        <div className={`rounded-xl border p-3 ${toneMap[tone] || toneMap.neutral}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-crm-fg-muted">{label}</p>
            <p className="mt-3 text-sm font-bold leading-none">{value}</p>
            {detail && <p className="mt-2 text-[11px] text-crm-fg-muted">{detail}</p>}
        </div>
    );
}

function CashProjectionPanel({ metrics, hideAmounts }) {
    const netCashUSD = metrics.finanzas?.saldos?.USD ?? 0;
    const netCashARS = metrics.finanzas?.saldos?.ARS ?? 0;

    return (
        <section className="rounded-xl border border-crm-border bg-crm-surface p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-crm-fg">
                        <Landmark size={15} className="text-amber-400" />
                        Proyección de caja
                    </h3>
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        Proyección pendiente de integración
                    </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-crm-fg-muted">Cronograma en desarrollo</span>
                    <Link href="/admin/finanzas" className="font-semibold text-amber-300 transition hover:text-amber-200">
                        Ver Tesorería →
                    </Link>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <CashProjectionCard
                    label="Flujo neto del mes"
                    value={hideAmounts ? '***' : `USD ${formatCurrency(netCashUSD)}`}
                    detail={hideAmounts ? '***' : `ARS ${formatCurrency(netCashARS)}`}
                    tone={netCashUSD < 0 ? 'red' : netCashUSD > 0 ? 'green' : 'neutral'}
                />
                <CashProjectionCard
                    label="A cobrar"
                    value="Pendiente"
                    detail="Cálculo dinámico en desarrollo"
                    tone="neutral"
                />
                <CashProjectionCard
                    label="A pagar"
                    value="Pendiente"
                    detail="Cálculo dinámico en desarrollo"
                    tone="neutral"
                />
                <CashProjectionCard
                    label="Resultado proyectado"
                    value="Pendiente"
                    detail="No usar margen como liquidez"
                    tone="neutral"
                />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Entradas previstas</p>
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">En desarrollo</span>
                    </div>
                    <p className="text-xs text-crm-fg-muted">Integración con cuotas y cobros pendientes de ventas en proceso.</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Salidas previstas</p>
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">En desarrollo</span>
                    </div>
                    <p className="text-xs text-crm-fg-muted">Integración con pagos a propietarios, comisiones y egresos programados en proceso.</p>
                </div>
            </div>
            <p className="mt-4 border-t border-crm-border pt-3 text-[11px] leading-relaxed text-crm-fg-muted">
                Módulo en desarrollo: no utilizar estos valores como saldo disponible ni proyección confirmada de liquidez hasta completar la integración con Tesorería.
            </p>
        </section>
    );
}



export default function CockpitCeoSote({ metrics, canSeeFinancials = false, user, selectedDate = new Date(), onPrevMonth, onNextMonth, hideAmounts = false }) {
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [selectedRateType, setSelectedRateType] = useState('venta'); // 'venta' | 'compra'
    const counts = metrics.counts || {};
    const soldCount = counts.vendidos || 0;
    const userName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const today = new Date();
    const isCurrentMonth = selectedDate.getMonth() === today.getMonth() && selectedDate.getFullYear() === today.getFullYear();
    const totalDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    // Use actual day of month if current month, otherwise use total days of that month
    const dayOfMonth = isCurrentMonth ? today.getDate() : totalDays;
    const monthProgress = Math.max(1, Math.round((dayOfMonth / totalDays) * 100));
    const salesObjective = 30;
    const salesPercent = Math.min(100, Math.round((soldCount / salesObjective) * 100));
    const gainUsd = canSeeFinancials ? metrics.margenEstimado?.USD || 0 : 0;
    const gainArs = canSeeFinancials ? metrics.margenEstimado?.ARS || 0 : 0;
    const gainPerCarUsd = soldCount > 0 ? gainUsd / soldCount : 0;
    const gainPerCarArs = soldCount > 0 ? gainArs / soldCount : 0;

    const monthLabel = selectedDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const viewingLabel = isCurrentMonth ? 'Mes Actual' : monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    const monthParam = `?month=${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;

    // Métricas de Facturación Mensual
    const mb = metrics.monthlyBilling || {};
    const rateApplied = selectedRateType === 'compra' ? (mb.blueRateCompra || mb.blueRateVenta) : (mb.blueRateVenta || mb.blueRateCompra);
    const isConversionOk = Boolean(rateApplied && rateApplied > 0);
    const totalOriginalARS = mb.totalOriginalARS || 0;
    const totalOriginalUSD = mb.totalOriginalUSD || 0;
    const otherCurrencies = mb.otherCurrencies || [];
    const salesList = mb.sales || [];
    const blueInfo = mb.blueData || {};
    const isPastPeriod = Boolean(mb.isPastMonth);

    // Totales equivalentes dinámicos según punta elegida (venta o compra)
    const totalEquivARS = isConversionOk
        ? (totalOriginalARS + (totalOriginalUSD * rateApplied))
        : null;
    const totalEquivUSD = isConversionOk
        ? (totalOriginalUSD + (totalOriginalARS / rateApplied))
        : null;

    return (
        <div className="space-y-4">
            {metrics.patentesPendientes && metrics.patentesPendientes.length > 0 ? (
                <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                                <AlertTriangle size={16} />
                            </span>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">Alertas de Stock y Gestoría</p>
                                <p className="mt-1 text-sm font-semibold text-crm-fg">
                                    Hay <strong className="text-amber-300">{metrics.patentesPendientes.length}</strong> {metrics.patentesPendientes.length === 1 ? 'vehículo en stock con patente / libre deuda pendiente' : 'vehículos en stock con patentes / libre deuda pendientes'}.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/admin/alertas"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 hover:text-white"
                        >
                            Ver Alertas de Patentes →
                        </Link>
                    </div>
                </section>
            ) : (
                <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                    <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                            <AlertTriangle size={16} />
                        </span>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crm-fg-muted">Pendientes</p>
                    </div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                        <Check size={16} />
                        Estás al día - no hay nada pendiente de tu parte.
                    </p>
                </section>
            )}

            <UpcomingDuesPanel user={user} hideAmounts={hideAmounts} />

            <section
                className="relative overflow-hidden rounded-2xl border border-indigo-400/30 p-5 text-white shadow-sm"
                style={{ background: 'linear-gradient(90deg, #4f46e5 0%, #7c22d8 52%, #4338ca 100%)' }}
            >
                <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">Cockpit CEO</p>
                        <h2 className="text-xl font-bold leading-tight sm:text-2xl">Buen día, {userName}</h2>
                        <p className="mt-2 text-sm text-white/85">{monthLabel} - Día {dayOfMonth} de {totalDays}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">Avance del mes</p>
                        <p className="text-3xl font-black leading-none sm:text-4xl">{monthProgress}%</p>
                        <p className="mt-2 text-xs text-white/80">{dayOfMonth} de {totalDays} días</p>
                    </div>
                </div>
                <div
                    className="absolute inset-y-0 right-0 w-1/2"
                    style={{ background: 'linear-gradient(270deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)' }}
                />
            </section>

            <section className="flex h-[54px] items-center justify-between rounded-xl border border-crm-border bg-crm-surface px-4 py-0">
                <button type="button" onClick={onPrevMonth} className="appearance-none m-0 flex h-8 w-8 items-center justify-center rounded-lg border-0 bg-transparent p-0 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg cursor-pointer">
                    <ChevronLeft size={16} />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-crm-fg-muted">Viendo cockpit de</p>
                    <p className="text-sm font-bold text-crm-fg">{viewingLabel}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onNextMonth} disabled={isCurrentMonth} className={`appearance-none m-0 flex h-8 w-8 items-center justify-center rounded-lg border-0 p-0 ${isCurrentMonth ? 'text-crm-border cursor-not-allowed' : 'text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg cursor-pointer bg-transparent'}`}>
                        <ChevronRight size={16} />
                    </button>
                    {isCurrentMonth ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">● EN VIVO</span>
                    ) : (
                        <span className="rounded-full border border-crm-border bg-crm-surface-raised px-3 py-1 text-xs font-bold text-crm-fg-muted">HISTÓRICO</span>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <KpiPanel title="Autos vendidos" icon={Car} href={`/admin/ventas${monthParam}`} className="min-h-[194px]">
                    <div className="flex items-end gap-3">
                        <p className="text-5xl font-bold leading-none text-crm-fg sm:text-6xl">{formatNumber(soldCount)}</p>
                        <p className="mb-2 text-lg text-crm-fg-muted">/ {salesObjective} obj</p>
                    </div>
                    <div className="mt-5">
                        <ProgressLine value={salesPercent} color="bg-crm-red" />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase text-crm-fg-muted">Proy. fin mes: <span className="text-crm-fg">0</span></p>
                </KpiPanel>

                <KpiPanel
                    title="Facturación de ventas del mes"
                    icon={DollarSign}
                    onClick={() => setShowBillingModal(true)}
                    className="min-h-[194px] flex flex-col justify-between"
                >
                    <div className="space-y-1.5">
                        {/* Importe Principal: ARS Equivalente */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">ARS</span>
                            <p className="text-2xl font-black leading-tight text-crm-fg sm:text-3xl lg:text-[28px] xl:text-3xl break-words tracking-tight">
                                {hideAmounts
                                    ? '***'
                                    : totalEquivARS !== null
                                    ? formatCurrency(totalEquivARS)
                                    : formatCurrency(totalOriginalARS)}
                            </p>
                        </div>

                        {/* Importe Secundario: USD Equivalente */}
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">USD</span>
                            <p className="text-sm font-bold text-crm-fg-muted sm:text-base">
                                {hideAmounts ? (
                                    '***'
                                ) : totalEquivUSD !== null ? (
                                    `USD ${formatUSD(totalEquivUSD)}`
                                ) : isConversionOk ? (
                                    'USD —'
                                ) : (
                                    <span className="text-xs font-semibold text-amber-300">
                                        Conversión no disponible{totalOriginalUSD > 0 ? ` (USD ${formatCurrency(totalOriginalUSD)})` : ''}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Aclaración reglamentaria de volumen comercial */}
                    <p className="mt-2 text-[11px] leading-snug text-crm-fg-muted">
                        Total pactado en ventas del período; incluye importes pendientes de cobro. Representa volumen comercial pactado, no necesariamente facturación fiscal emitida.
                    </p>

                    {/* Información explícita de cotización Ámbito Financiero */}
                    <div className="mt-3 border-t border-crm-border/60 pt-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-crm-fg-muted">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-white">Dólar Blue:</span>
                                {isConversionOk ? (
                                    <span className="text-emerald-300 font-bold">
                                        ARS {formatCurrency(rateApplied)} ({selectedRateType === 'compra' ? 'Punta Compra' : 'Punta Venta'})
                                    </span>
                                ) : (
                                    <span className="text-amber-300 font-medium">No disponible</span>
                                )}
                            </div>
                            <span className="text-[9px] text-crm-fg-muted/80">Ámbito Financiero</span>
                        </div>

                        {/* Indicador de mes anterior */}
                        {isPastPeriod && (
                            <p className="mt-1 text-[9px] italic text-amber-300/90">
                                * Equivalencia calculada con cotización actual (no histórica).
                            </p>
                        )}

                        {/* Selector de punta y Botón Ver Detalle */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
                            {/* Selector Venta / Compra */}
                            <div
                                className="inline-flex rounded-lg border border-crm-border bg-crm-surface-raised p-0.5 text-[9px]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSelectedRateType('venta'); }}
                                    className={`rounded px-1.5 py-0.5 font-bold transition ${selectedRateType === 'venta' ? 'bg-indigo-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                                    title="Punta Vendedora (Ámbito)"
                                >
                                    Venta
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSelectedRateType('compra'); }}
                                    className={`rounded px-1.5 py-0.5 font-bold transition ${selectedRateType === 'compra' ? 'bg-indigo-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                                    title="Punta Compradora (Ámbito)"
                                >
                                    Compra
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowBillingModal(true);
                                }}
                                className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-500/20 transition cursor-pointer"
                            >
                                <ExternalLink size={11} />
                                Ver detalle ({salesList.length})
                            </button>
                        </div>
                    </div>
                </KpiPanel>

                <KpiPanel title="Ganancia del mes" icon={CircleDollarSign} onClick={() => setShowDetailsModal(true)} className="min-h-[194px]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                            <span className="mt-2 text-xs font-bold uppercase text-crm-fg-muted">USD</span>
                            <p className="text-4xl font-bold leading-none text-crm-fg sm:text-5xl">{hideAmounts ? '***' : formatCurrency(gainUsd)}</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="mt-1 text-[10px] font-bold uppercase text-crm-fg-muted">ARS</span>
                            <p className="text-2xl font-bold leading-none text-crm-fg-muted">{hideAmounts ? '***' : formatCurrency(gainArs)}</p>
                        </div>
                    </div>
                    <div className="mt-5">
                        <ProgressLine value={0} color="bg-emerald-500" />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-crm-fg-muted">OBJ: <strong className="text-crm-fg">{hideAmounts ? '***' : 'USD 110.000'}</strong></span>
                        <span className="font-semibold text-crm-fg-muted">PROY: <strong className="text-crm-fg">{hideAmounts ? '***' : 'USD 0'}</strong></span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-crm-fg-muted">
                        <span className="text-emerald-400">●</span>
                        Se actualiza en vivo con cada venta
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDetailsModal(true); }} className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-300">
                            <ExternalLink size={12} />
                            Ver detalle del cálculo
                        </button>
                    </div>
                </KpiPanel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <KpiPanel title="Ganancia x auto (USD/ARS)" icon={Award} className="min-h-[240px]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                            <span className="mt-2 text-xs font-bold uppercase text-crm-fg-muted">USD</span>
                            <p className="text-3xl font-bold leading-none text-crm-fg sm:text-4xl">{hideAmounts ? '***' : formatCurrency(gainPerCarUsd)}</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="mt-1 text-[10px] font-bold uppercase text-crm-fg-muted">ARS</span>
                            <p className="text-xl font-bold leading-none text-crm-fg-muted">{hideAmounts ? '***' : formatCurrency(gainPerCarArs)}</p>
                        </div>
                    </div>
                    <div className="mt-5 space-y-2 border-t border-crm-border pt-4 text-xs">
                        <p className="flex justify-between text-crm-fg-muted">HIST 2025 <span className="text-crm-fg">{hideAmounts ? '***' : 'USD 0'}</span></p>
                        <p className="flex justify-between text-crm-fg-muted">HIST 2024 <span className="text-crm-fg">{hideAmounts ? '***' : 'USD 0'}</span></p>
                        <p className="flex justify-between text-crm-fg-muted">HIST 2023 <span className="text-crm-fg">{hideAmounts ? '***' : 'USD 0'}</span></p>
                    </div>
                    <p className="mt-5 text-xs leading-relaxed text-crm-fg-muted">Métrica real de calidad - más importante que volumen.</p>
                </KpiPanel>

                <KpiPanel
                    title="Tu operación"
                    icon={TrendingUp}
                    href="/admin/mis-ventas"
                    className="min-h-[240px]"
                    style={{ background: 'linear-gradient(135deg, #1E1E24 0%, #262342 100%)' }}
                >
                    <div className="flex items-end justify-between gap-4">
                        <div className="flex items-end gap-2">
                            <p className="text-4xl font-bold leading-none text-crm-fg sm:text-5xl">{metrics.tuOperacion?.ventasUsuarioAno || 0}</p>
                            <p className="mb-1 text-crm-fg-muted">/ {metrics.tuOperacion?.ventasTotalesAno || 0}</p>
                        </div>
                        <p className="text-sm font-black text-purple-300">
                            {metrics.tuOperacion?.ventasTotalesAno > 0 
                                ? Math.round(((metrics.tuOperacion?.ventasUsuarioAno || 0) / metrics.tuOperacion.ventasTotalesAno) * 100) 
                                : 0}%
                        </p>
                    </div>
                    <div className="mt-5 border-t border-purple-400/20 pt-4">
                        <p className="flex justify-between text-xs text-crm-fg-muted">
                            Tu posición en el año 
                            <span className="font-bold text-purple-200">
                                {metrics.tuOperacion?.ventasUsuarioAno > 0 
                                    ? `${metrics.tuOperacion.ventasUsuarioAno} ${metrics.tuOperacion.ventasUsuarioAno === 1 ? 'venta' : 'ventas'} en el año` 
                                    : 'Sin ventas en el año'}
                            </span>
                        </p>
                    </div>
                    <div className="mt-5 rounded-xl border border-purple-400/20 bg-purple-500/10 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-purple-200">Traído + vendido por vos</p>
                        <p className="mt-2 text-2xl font-bold text-crm-fg">{metrics.tuOperacion?.autos100Tuyo || 0} <span className="text-xs text-crm-fg-muted">{metrics.tuOperacion?.autos100Tuyo === 1 ? 'auto' : 'autos'}</span></p>
                        <p className="text-xs text-crm-fg-muted">{hideAmounts ? '***' : `USD ${formatCurrency(metrics.tuOperacion?.ganancia100TuyoUSD || 0)}`} · 100% tuyo - consignación + cierre</p>
                    </div>
                </KpiPanel>

                <KpiPanel title="Mismo mes · año anterior" icon={Gauge} className="min-h-[240px]">
                    <div className="flex h-32 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-center">
                        <p className="text-sm italic text-crm-fg-muted">- Sin datos del año anterior -</p>
                    </div>
                </KpiPanel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <KpiPanel title="Ganancia infracciones · mes" icon={ShieldAlert} href="/admin/infracciones" className="min-h-[188px]">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-crm-fg-muted">0 gestionadas</p>
                        <p className="text-3xl font-bold text-crm-fg">{hideAmounts ? '***' : 'ARS 0'}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <p className="rounded-lg border border-crm-border bg-crm-bg p-3 text-crm-fg-muted">Ganancia bruta<br /><strong className="text-crm-fg">{hideAmounts ? '***' : 'ARS 0'}</strong></p>
                        <p className="rounded-lg border border-crm-border bg-crm-bg p-3 text-crm-fg-muted">Parte AutoSporting<br /><strong className="text-crm-fg">{hideAmounts ? '***' : 'ARS 0'}</strong></p>
                    </div>
                    <p className="mt-4 text-xs text-crm-fg-muted">Sin infracciones gestionadas este mes</p>
                </KpiPanel>

                <KpiPanel title="Gestoría / transferencias · mes" icon={ClipboardCheck} href="/admin/expedientes" className="min-h-[188px]">
                    <p className="text-sm text-crm-fg-muted">0 expedientes</p>
                    <div className="mt-4 rounded-xl border border-crm-border bg-crm-bg p-4">
                        <p className="text-sm font-semibold text-crm-fg">Sin gastos cargados a compradores este mes</p>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-crm-fg-muted">Total cobrado a compradores por transferencias, gestoría y trámites.</p>
                </KpiPanel>
            </div>

            <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                            <Star size={17} />
                        </span>
                        <div>
                            <h3 className="text-base font-semibold text-crm-fg">Calificaciones de ventas - mes en curso</h3>
                            <p className="mt-1 text-xs text-crm-fg-muted">0 recibidas · 0 pedidas · 0% del total</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-emerald-500/20 bg-crm-bg/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-crm-fg-muted">Promedio</p>
                        <p className="mt-3 text-xl font-bold text-crm-fg">Sin calif.</p>
                        <p className="mt-2 text-xs text-crm-fg-muted">Pedile a los compradores que califiquen</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-crm-bg/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-crm-fg-muted">Distribución</p>
                        <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs text-crm-fg-muted">
                            {[5, 4, 3, 2, 1].map((score) => <span key={score}>{score}★<br /><strong className="text-crm-fg">0</strong></span>)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-crm-bg/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-crm-fg-muted">Mejor calificado</p>
                        <p className="mt-3 text-xs leading-relaxed text-crm-fg-muted">Falta más data (min. 2 calificaciones por vendedor para rankear).</p>
                    </div>
                </div>
            </section>

            {canSeeFinancials && <CashProjectionPanel metrics={metrics} hideAmounts={hideAmounts} />}
            <MonthlyGainPanel
                gainsData={metrics.last12MonthsGains}
                selectedDate={selectedDate}
                canSeeFinancials={canSeeFinancials}
                hideAmounts={hideAmounts}
                dolarBlue={metrics.dolarBlue}
            />
            <AnnualBillingPanel
                annualSummary={metrics.annualSummary}
                historicalTotal={metrics.historicalTotal}
                dolarBlueInitial={metrics.dolarBlue}
                hideAmounts={hideAmounts}
                canSeeFinancials={canSeeFinancials}
            />

            {showDetailsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-3xl rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">Detalle de Ganancias (Mes Actual)</h2>
                            <button onClick={() => setShowDetailsModal(false)} className="text-crm-fg-muted hover:text-white">✕</button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-crm-border text-xs text-crm-fg-muted">
                                    <tr>
                                        <th className="pb-3">Vehículo</th>
                                        <th className="pb-3 text-right">Precio Venta</th>
                                        <th className="pb-3 text-right">Costo Compra</th>
                                        <th className="pb-3 text-right">Ganancia Bruta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-crm-border">
                                    {(metrics.salesDetails || []).length === 0 ? (
                                        <tr><td colSpan="4" className="py-4 text-center text-crm-fg-muted">No hay ganancias registradas este mes.</td></tr>
                                    ) : (
                                        (metrics.salesDetails || []).map((detail, idx) => (
                                            <tr key={idx} className="hover:bg-crm-surface-raised transition-colors">
                                                <td className="py-3 font-medium text-white">{detail.carName}</td>
                                                <td className="py-3 text-right">{detail.saleCurrency} {hideAmounts ? '***' : formatCurrency(detail.salePrice)}</td>
                                                <td className="py-3 text-right">{detail.purchaseCurrency || 'ARS/USD'} {hideAmounts ? '***' : formatCurrency(detail.purchasePrice)}</td>
                                                <td className="py-3 text-right font-bold text-emerald-400">
                                                    {hideAmounts ? '***' : detail.profitUSD > 0 ? `USD ${formatCurrency(detail.profitUSD)}` : detail.profitARS > 0 ? `ARS ${formatCurrency(detail.profitARS)}` : '0'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Facturación de Ventas del Mes */}
            {showBillingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm">
                    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-crm-border bg-crm-surface shadow-2xl overflow-hidden">
                        {/* Header del Modal */}
                        <div className="flex items-start justify-between border-b border-crm-border p-4 sm:p-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-white sm:text-xl">
                                        Facturación de ventas del mes
                                    </h2>
                                    <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30">
                                        {viewingLabel}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-crm-fg-muted">
                                    Total pactado en ventas del período; incluye importes pendientes de cobro. Representa volumen comercial pactado, no necesariamente facturación fiscal emitida.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBillingModal(false)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white transition cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Resumen Superior del Modal */}
                        <div className="border-b border-crm-border bg-crm-surface-raised/40 p-4 sm:px-6">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {/* Total Equivalente en ARS */}
                                <div className="rounded-xl border border-crm-border bg-crm-bg/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                        Total equivalente en ARS
                                    </p>
                                    <p className="mt-1 text-xl font-black text-white sm:text-2xl tracking-tight">
                                        {hideAmounts ? '***' : totalEquivARS !== null ? `ARS ${formatCurrency(totalEquivARS)}` : `ARS ${formatCurrency(totalOriginalARS)}`}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-crm-fg-muted">
                                        Original ARS: {hideAmounts ? '***' : `ARS ${formatCurrency(totalOriginalARS)}`}
                                    </p>
                                </div>

                                {/* Total Equivalente en USD */}
                                <div className="rounded-xl border border-crm-border bg-crm-bg/70 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                                        Total equivalente en USD
                                    </p>
                                    <p className="mt-1 text-xl font-black text-indigo-200 sm:text-2xl tracking-tight">
                                        {hideAmounts ? '***' : totalEquivUSD !== null ? `USD ${formatUSD(totalEquivUSD)}` : 'Conversión no disponible'}
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-crm-fg-muted">
                                        Original USD: {hideAmounts ? '***' : `USD ${formatCurrency(totalOriginalUSD)}`}
                                    </p>
                                </div>

                                {/* Ficha de Cotización */}
                                <div className="rounded-xl border border-crm-border bg-crm-bg/70 p-3 lg:col-span-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                            Cotización Ámbito Financiero · Dólar Blue
                                        </p>
                                        <div className="inline-flex rounded-md border border-crm-border bg-crm-surface p-0.5 text-[9px]">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedRateType('venta')}
                                                className={`rounded px-1.5 py-0.5 font-bold transition ${selectedRateType === 'venta' ? 'bg-indigo-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                                            >
                                                Venta ({mb.blueRateVenta ? `$${formatCurrency(mb.blueRateVenta)}` : 'S/D'})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedRateType('compra')}
                                                className={`rounded px-1.5 py-0.5 font-bold transition ${selectedRateType === 'compra' ? 'bg-indigo-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                                            >
                                                Compra ({mb.blueRateCompra ? `$${formatCurrency(mb.blueRateCompra)}` : 'S/D'})
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                        <span className="text-white font-semibold">
                                            Cotización aplicada: <strong className="text-emerald-400">ARS {formatCurrency(rateApplied)}</strong> ({selectedRateType === 'compra' ? 'punta compradora' : 'punta vendedora'})
                                        </span>
                                        <span className="text-crm-fg-muted">
                                            Actualizado: {blueInfo.publishedAt || blueInfo.lastFetchedDisplay || 'Reciente'}
                                        </span>
                                    </div>
                                    {isPastPeriod && (
                                        <p className="mt-1 text-[10px] text-amber-300">
                                            * Mostrando equivalencia a cotización actual (no histórica).
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Aviso de Ventas Consignadas y otras monedas */}
                            <div className="mt-3 flex flex-col gap-1.5 text-xs text-crm-fg-muted">
                                <p className="flex items-center gap-1.5">
                                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
                                    <span>
                                        <strong>Ventas consignadas:</strong> Identificadas con la etiqueta <span className="rounded bg-amber-500/20 px-1 py-0.2 font-bold text-amber-300 border border-amber-500/30 text-[10px]">CONSIGNACIÓN</span>. Su importe de venta no representa íntegramente ingresos propios de la agencia.
                                    </span>
                                </p>
                                {otherCurrencies.length > 0 && (
                                    <p className="text-amber-300 font-semibold">
                                        Monedas adicionales: {otherCurrencies.map(c => `${c.currency} ${formatCurrency(c.amount)}`).join(', ')} (Pendiente de conversión).
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tabla de Ventas */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            {salesList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-crm-fg-muted">
                                    <Car size={36} className="mb-2 opacity-30" />
                                    <p className="text-sm font-semibold text-crm-fg">Sin ventas registradas en este período</p>
                                    <p className="text-xs">No hay operaciones válidas confirmadas o entregadas en {viewingLabel}.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 border-b border-crm-border bg-crm-surface text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                            <tr>
                                                <th className="py-2.5 pr-3">Fecha</th>
                                                <th className="py-2.5 pr-3">Cliente</th>
                                                <th className="py-2.5 pr-3">Vehículo y Patente</th>
                                                <th className="py-2.5 pr-3">Forma de Pago</th>
                                                <th className="py-2.5 pr-3 text-right">Importe Pactado</th>
                                                <th className="py-2.5 pr-3">Desglose (Auto / Intereses)</th>
                                                <th className="py-2.5 pr-3 text-right">Equivalente Blue</th>
                                                <th className="py-2.5 text-right">Operación</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-crm-border/60">
                                            {salesList.map((sale, idx) => {
                                                const equivConverted = isConversionOk
                                                    ? (sale.originalCurrency === 'USD'
                                                        ? `ARS ${formatCurrency(sale.originalPrice * rateApplied)}`
                                                        : sale.originalCurrency === 'ARS'
                                                        ? `USD ${formatUSD(sale.originalPrice / rateApplied)}`
                                                        : '—')
                                                    : '—';

                                                return (
                                                    <tr key={sale.id || idx} className="hover:bg-crm-surface-raised transition-colors">
                                                        <td className="py-3 pr-3 font-mono text-[11px] text-crm-fg-muted whitespace-nowrap">
                                                            {sale.dateDisplay}
                                                        </td>
                                                        <td className="py-3 pr-3 font-medium text-white max-w-[140px] truncate">
                                                            {sale.clientName}
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            <div className="font-semibold text-crm-fg flex items-center gap-1.5 flex-wrap">
                                                                <span>{sale.carName}</span>
                                                                {sale.isConsigned && (
                                                                    <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/30" title="Vehículo consignado - Importe no representa íntegramente ingresos propios">
                                                                        CONSIGNACIÓN
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {sale.plate && sale.plate !== 'S/D' && (
                                                                <span className="mt-0.5 inline-block font-mono text-[10px] font-bold text-crm-fg-muted bg-crm-surface-raised px-1.5 py-0.5 rounded border border-crm-border/50">
                                                                    {sale.plate}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-3">
                                                            <span className="rounded bg-crm-surface-raised px-2 py-0.5 text-[10px] font-semibold text-crm-fg-muted uppercase">
                                                                {sale.paymentMethod}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 pr-3 text-right font-bold text-white whitespace-nowrap">
                                                            {hideAmounts ? '***' : `${sale.originalCurrency} ${formatCurrency(sale.originalPrice)}`}
                                                        </td>
                                                        <td className="py-3 pr-3 text-crm-fg-muted text-[11px]">
                                                            {sale.hasFinancing ? (
                                                                <div className="space-y-0.5">
                                                                    <p>Vehículo: <strong className="text-crm-fg">{hideAmounts ? '***' : `${sale.originalCurrency} ${formatCurrency(sale.vehiclePrice)}`}</strong></p>
                                                                    <p>Intereses: <strong className="text-amber-300">{hideAmounts ? '***' : `${sale.originalCurrency} ${formatCurrency(sale.interestAmount)}`}</strong></p>
                                                                </div>
                                                            ) : (
                                                                <span className="text-crm-fg-muted/70">Sin intereses (contado/permuta)</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 pr-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                                                            {hideAmounts ? '***' : equivConverted}
                                                        </td>
                                                        <td className="py-3 text-right whitespace-nowrap">
                                                            <Link
                                                                href={sale.saleRef || '/admin/ventas'}
                                                                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-300 hover:text-white underline"
                                                            >
                                                                Ver venta <ArrowUpRight size={11} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer del Modal con Totales Coincidentes */}
                        <div className="flex flex-col gap-3 border-t border-crm-border bg-crm-surface-raised/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="text-xs text-crm-fg-muted">
                                Total en el período: <strong className="text-white">{salesList.length}</strong> operaciones · <span className="text-emerald-400 font-bold">{hideAmounts ? '***' : totalEquivARS !== null ? `ARS ${formatCurrency(totalEquivARS)}` : `ARS ${formatCurrency(totalOriginalARS)}`}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBillingModal(false)}
                                className="rounded-lg border border-crm-border bg-crm-surface px-4 py-2 text-xs font-semibold text-white hover:bg-crm-surface-raised transition cursor-pointer self-end sm:self-auto"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
