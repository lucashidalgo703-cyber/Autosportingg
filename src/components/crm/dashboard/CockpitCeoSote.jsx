import { useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    Award,
    Car,
    Check,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    ClipboardCheck,
    ExternalLink,
    Gauge,
    Landmark,
    ShieldAlert,
    Star,
    TrendingUp,
} from 'lucide-react';

const monthLabel = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date());

function formatNumber(value) {
    return new Intl.NumberFormat('es-AR').format(value || 0);
}

function formatCurrency(value) {
    return formatNumber(Math.round(value || 0));
}

function KpiPanel({ title, icon: Icon, children, href, className = '', style }) {
    const content = (
        <div
            className={`relative h-full rounded-xl border border-crm-border bg-crm-surface p-4 transition-colors sm:rounded-2xl sm:p-5 ${href ? 'hover:border-crm-red/35 hover:bg-crm-surface-raised' : ''} ${className}`}
            style={style}
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
        red: 'border-red-500/30 bg-red-500/10 text-red-200'
    };

    return (
        <div className={`rounded-xl border p-3 ${toneMap[tone] || toneMap.neutral}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-crm-fg-muted">{label}</p>
            <p className="mt-3 text-sm font-bold leading-none">{value}</p>
            {detail && <p className="mt-2 text-[11px] text-crm-fg-muted">{detail}</p>}
        </div>
    );
}

function CashProjectionPanel({ metrics }) {
    const usdBalance = metrics.margenEstimado?.USD || 0;
    const arsBalance = metrics.margenEstimado?.ARS || 0;

    return (
        <section className="rounded-xl border border-crm-border bg-crm-surface p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-crm-fg">
                    <Landmark size={15} className="text-amber-400" />
                    Proyeccion de caja
                </h3>
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-crm-fg-muted">0 entradas · 0 salidas previstas</span>
                    <Link href="/admin/finanzas" className="font-semibold text-amber-300 transition hover:text-amber-200">
                        Ver mas →
                    </Link>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <CashProjectionCard label="Saldo actual" value={`USD ${formatCurrency(usdBalance)}`} detail={`ARS ${formatCurrency(arsBalance)}`} />
                <CashProjectionCard label="A cobrar" value="USD 0" tone="green" />
                <CashProjectionCard label="A pagar" value="USD 0" tone="red" />
                <CashProjectionCard label="Resultado" value={`USD ${formatCurrency(usdBalance)}`} tone={usdBalance < 0 ? 'red' : 'green'} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">Entradas previstas</p>
                        <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-200">Top 0</span>
                    </div>
                    <p className="text-xs text-emerald-100/75">Sin entradas previstas.</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-200">Salidas previstas</p>
                        <span className="rounded-md bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-200">Top 0</span>
                    </div>
                    <p className="text-xs text-red-100/75">Sin salidas previstas.</p>
                </div>
            </div>
            <p className="mt-4 border-t border-crm-border pt-3 text-[11px] leading-relaxed text-crm-fg-muted">
                Mismos numeros que la pantalla x Cobrar/Pagar: a cobrar toma valores, cuotas y gastos del comprador; a pagar contempla pagos a propietarios, registros y comisiones.
            </p>
        </section>
    );
}

function MonthlyGainPanel() {
    const months = ['JUL 25', 'AGO 25', 'SEP 25', 'OCT 25', 'NOV 25', 'DIC 25', 'ENE 26', 'FEB 26', 'MAR 26', 'ABR 26', 'MAY 26', 'JUN 26'];

    return (
        <section className="rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-crm-fg-muted">ULTIMOS 12 MESES · GANANCIA USD</h3>
            <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-crm-surface-raised px-2 py-1 text-[10px] font-bold uppercase text-crm-fg-muted">Mes actual</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">Supero obj</span>
                <span className="rounded-md bg-crm-bg px-2 py-1 text-[10px] font-bold uppercase text-crm-fg-muted">Mes normal</span>
            </div>
            <p className="mt-3 text-xs text-crm-fg-muted">Objetivo USD 110k no visible - max 12m: USD 0k</p>
            <div className="mt-5 flex h-36 items-end gap-2 border-b border-crm-border pb-3">
                {months.map((month, index) => (
                    <div key={month} className="flex flex-1 flex-col items-center gap-2">
                        <div className={`w-full rounded-t-md ${index === months.length - 1 ? 'h-8 bg-crm-red/70' : 'h-3 bg-crm-surface-raised'}`} />
                        <span className="text-center text-[9px] font-semibold leading-tight text-crm-fg-muted">{month}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AnnualSummaryPanel({ soldCount }) {
    const currentYear = new Date().getFullYear();
    const years = [
        { year: currentYear - 2, cars: 0, current: false },
        { year: currentYear - 1, cars: 0, current: false },
        { year: `${currentYear} · EN CURSO`, cars: soldCount || 0, current: true }
    ];

    return (
        <section className="rounded-xl border border-crm-border bg-crm-surface p-4 sm:p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-crm-fg-muted">Resumen anual</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {years.map((item) => (
                    <div key={item.year} className={`rounded-xl border p-3 ${item.current ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-crm-border bg-crm-surface-raised'}`}>
                        <p className="text-xs font-bold text-crm-fg">{item.year}</p>
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-crm-fg-muted">{formatNumber(item.cars)} autos</p>
                        <p className="mt-2 text-lg font-bold text-crm-fg">USD 0</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function CockpitCeoSote({ metrics, canSeeFinancials = false, user, selectedDate = new Date(), onPrevMonth, onNextMonth }) {
    const [showDetailsModal, setShowDetailsModal] = useState(false);
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

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                        <AlertTriangle size={16} />
                    </span>
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-crm-fg-muted">Pendientes</p>
                </div>
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                    <Check size={16} />
                    Estas al dia - no hay nada pendiente de tu parte.
                </p>
            </section>

            <section
                className="relative overflow-hidden rounded-2xl border border-indigo-400/30 p-5 text-white shadow-sm"
                style={{ background: 'linear-gradient(90deg, #4f46e5 0%, #7c22d8 52%, #4338ca 100%)' }}
            >
                <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-white/75">Cockpit CEO</p>
                        <h2 className="text-xl font-bold leading-tight sm:text-2xl">Buen dia, {userName}</h2>
                        <p className="mt-2 text-sm text-white/85">{monthLabel} - Dia {dayOfMonth} de {totalDays}</p>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/75">Avance del mes</p>
                        <p className="text-3xl font-black leading-none sm:text-4xl">{monthProgress}%</p>
                        <p className="mt-2 text-xs text-white/80">{dayOfMonth} de {totalDays} dias</p>
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

                <KpiPanel title="Ganancia del mes" icon={CircleDollarSign} href="/admin/finanzas" className="min-h-[194px]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                            <span className="mt-2 text-xs font-bold uppercase text-crm-fg-muted">USD</span>
                            <p className="text-4xl font-bold leading-none text-crm-fg sm:text-5xl">{formatCurrency(gainUsd)}</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="mt-1 text-[10px] font-bold uppercase text-crm-fg-muted">ARS</span>
                            <p className="text-2xl font-bold leading-none text-crm-fg-muted">{formatCurrency(gainArs)}</p>
                        </div>
                    </div>
                    <div className="mt-5">
                        <ProgressLine value={0} color="bg-emerald-500" />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-crm-fg-muted">OBJ: <strong className="text-crm-fg">USD 110.000</strong></span>
                        <span className="font-semibold text-crm-fg-muted">PROY: <strong className="text-crm-fg">USD 0</strong></span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-crm-fg-muted">
                        <span className="text-emerald-400">●</span>
                        Se actualiza en vivo con cada venta
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDetailsModal(true); }} className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-blue-300">
                            <ExternalLink size={12} />
                            Ver detalle del calculo
                        </button>
                    </div>
                </KpiPanel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <KpiPanel title="Ganancia x auto (USD/ARS)" icon={Award} className="min-h-[240px]">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                            <span className="mt-2 text-xs font-bold uppercase text-crm-fg-muted">USD</span>
                            <p className="text-3xl font-bold leading-none text-crm-fg sm:text-4xl">{formatCurrency(gainPerCarUsd)}</p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="mt-1 text-[10px] font-bold uppercase text-crm-fg-muted">ARS</span>
                            <p className="text-xl font-bold leading-none text-crm-fg-muted">{formatCurrency(gainPerCarArs)}</p>
                        </div>
                    </div>
                    <div className="mt-5 space-y-2 border-t border-crm-border pt-4 text-xs">
                        <p className="flex justify-between text-crm-fg-muted">HIST 2025 <span className="text-crm-fg">USD 0</span></p>
                        <p className="flex justify-between text-crm-fg-muted">HIST 2024 <span className="text-crm-fg">USD 0</span></p>
                        <p className="flex justify-between text-crm-fg-muted">HIST 2023 <span className="text-crm-fg">USD 0</span></p>
                    </div>
                    <p className="mt-5 text-xs leading-relaxed text-crm-fg-muted">Metrica real de calidad - mas importante que volumen.</p>
                </KpiPanel>

                <KpiPanel
                    title="Tu operacion"
                    icon={TrendingUp}
                    href="/admin/productividad"
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
                            Tu posicion en el ano 
                            <span className="font-bold text-purple-200">
                                {metrics.tuOperacion?.ventasUsuarioAno > 0 ? `${metrics.tuOperacion.ventasUsuarioAno} ventas en el ano` : 'Sin ventas en el ano'}
                            </span>
                        </p>
                    </div>
                    <div className="mt-5 rounded-xl border border-purple-400/20 bg-purple-500/10 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-purple-200">Traido + vendido por vos</p>
                        <p className="mt-2 text-2xl font-bold text-crm-fg">{metrics.tuOperacion?.autos100Tuyo || 0} <span className="text-xs text-crm-fg-muted">autos</span></p>
                        <p className="text-xs text-crm-fg-muted">USD {formatCurrency(metrics.tuOperacion?.ganancia100TuyoUSD || 0)} · 100% tuyo - consignacion + cierre</p>
                    </div>
                </KpiPanel>

                <KpiPanel title="Mismo mes · ano anterior" icon={Gauge} className="min-h-[240px]">
                    <div className="flex h-32 items-center justify-center rounded-xl border border-crm-border bg-crm-bg text-center">
                        <p className="text-sm italic text-crm-fg-muted">- Sin datos del ano anterior -</p>
                    </div>
                </KpiPanel>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <KpiPanel title="Ganancia infracciones · mes" icon={ShieldAlert} href="/admin/calidad-datos" className="min-h-[188px]">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-crm-fg-muted">0 gestionadas</p>
                        <p className="text-3xl font-bold text-crm-fg">ARS 0</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <p className="rounded-lg border border-crm-border bg-crm-bg p-3 text-crm-fg-muted">Ganancia bruta<br /><strong className="text-crm-fg">ARS 0</strong></p>
                        <p className="rounded-lg border border-crm-border bg-crm-bg p-3 text-crm-fg-muted">Parte AutoSporting<br /><strong className="text-crm-fg">ARS 0</strong></p>
                    </div>
                    <p className="mt-4 text-xs text-crm-fg-muted">Sin infracciones gestionadas este mes</p>
                </KpiPanel>

                <KpiPanel title="Gestoria / transferencias · mes" icon={ClipboardCheck} href="/admin/documentacion" className="min-h-[188px]">
                    <p className="text-sm text-crm-fg-muted">0 expedientes</p>
                    <div className="mt-4 rounded-xl border border-crm-border bg-crm-bg p-4">
                        <p className="text-sm font-semibold text-crm-fg">Sin gastos cargados a compradores este mes</p>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-crm-fg-muted">Total cobrado a compradores por transferencias, gestoria y tramites.</p>
                </KpiPanel>
            </div>

            <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
                            <Star size={17} />
                        </span>
                        <div>
                            <h3 className="text-base font-semibold text-crm-fg">Calificaciones de ventas- mes en curso</h3>
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
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-crm-fg-muted">Distribucion</p>
                        <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs text-crm-fg-muted">
                            {[5, 4, 3, 2, 1].map((score) => <span key={score}>{score}★<br /><strong className="text-crm-fg">0</strong></span>)}
                        </div>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-crm-bg/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-crm-fg-muted">Mejor calificado</p>
                        <p className="mt-3 text-xs leading-relaxed text-crm-fg-muted">Falta mas data (min. 2 calificaciones por vendedor para rankear).</p>
                    </div>
                </div>
            </section>

            {canSeeFinancials && <CashProjectionPanel metrics={metrics} />}
            <MonthlyGainPanel />
            <AnnualSummaryPanel soldCount={soldCount} />

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
                                                <td className="py-3 text-right">{detail.saleCurrency} {formatCurrency(detail.salePrice)}</td>
                                                <td className="py-3 text-right">{detail.purchaseCurrency || 'ARS/USD'} {formatCurrency(detail.purchasePrice)}</td>
                                                <td className="py-3 text-right font-bold text-emerald-400">
                                                    {detail.profitUSD > 0 ? `USD ${formatCurrency(detail.profitUSD)}` : detail.profitARS > 0 ? `ARS ${formatCurrency(detail.profitARS)}` : '0'}
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
        </div>
    );
}
