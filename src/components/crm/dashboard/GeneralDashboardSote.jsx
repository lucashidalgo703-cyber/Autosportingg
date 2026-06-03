import Link from 'next/link';
import {
    AlertTriangle,
    Bell,
    CalendarClock,
    Car,
    ClipboardList,
    CreditCard,
    DollarSign,
    FileText,
    Landmark,
    PackageSearch,
    PieChart,
    ShoppingCart,
    Sparkles,
    Timer,
    TrendingUp,
    Truck,
    Users,
    UserRound,
    Warehouse,
    Wallet
} from 'lucide-react';

const toneClasses = {
    green: 'bg-emerald-500/15 text-emerald-400',
    blue: 'bg-blue-500/15 text-blue-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-300',
    red: 'bg-red-500/20 text-red-300',
    slate: 'bg-crm-surface-raised text-crm-fg-muted'
};

function formatNumber(value) {
    return new Intl.NumberFormat('es-AR').format(value || 0);
}

function formatCurrency(value) {
    return formatNumber(Math.round(value || 0));
}

function KpiCard({ label, value, detail, icon: Icon, tone = 'green', href, compact = false }) {
    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <p className="max-w-[10rem] text-[11px] font-semibold uppercase leading-snug tracking-[0.14em] text-crm-fg-muted">
                    {label}
                </p>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone] || toneClasses.green}`}>
                    <Icon size={18} strokeWidth={1.9} />
                </span>
            </div>
            <div className={compact ? 'mt-7' : 'mt-6'}>
                <p className={`${compact ? 'text-[30px]' : 'text-[28px]'} font-bold leading-none tracking-tight text-crm-fg`}>
                    {value}
                </p>
                {detail && (
                    <p className="mt-3 text-xs leading-relaxed text-crm-fg-muted">
                        {detail}
                    </p>
                )}
            </div>
        </>
    );

    const className = [
        'group relative block overflow-hidden rounded-xl border border-crm-border bg-crm-surface p-4 text-left transition-colors',
        compact ? 'min-h-[155px]' : 'min-h-[132px]',
        href ? 'hover:border-crm-red/35 hover:bg-crm-surface-raised' : ''
    ].join(' ');

    if (href) {
        return (
            <Link href={href} className={className}>
                {content}
            </Link>
        );
    }

    return <div className={className}>{content}</div>;
}

function CashProjectionCard({ label, value, detail, tone = 'neutral' }) {
    const colorMap = {
        neutral: 'bg-crm-surface-raised border-crm-border text-crm-fg',
        green: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
        red: 'bg-red-500/10 border-red-500/30 text-red-200'
    };

    return (
        <div className={`rounded-xl border p-3 ${colorMap[tone] || colorMap.neutral}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-crm-fg-muted">
                {label}
            </p>
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
                <CashProjectionCard
                    label="Saldo actual"
                    value={`USD ${formatCurrency(usdBalance)}`}
                    detail={`ARS ${formatCurrency(arsBalance)}`}
                />
                <CashProjectionCard
                    label="A cobrar"
                    value="USD 0"
                    detail="Sin entradas pendientes"
                    tone="green"
                />
                <CashProjectionCard
                    label="A pagar"
                    value="USD 0"
                    detail="Sin salidas previstas"
                    tone="red"
                />
                <CashProjectionCard
                    label="Resultado"
                    value={`USD ${formatCurrency(usdBalance)}`}
                    detail="Balance estimado"
                    tone={usdBalance < 0 ? 'red' : 'green'}
                />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200">
                            Entradas previstas
                        </p>
                        <span className="rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-200">
                            Top 0
                        </span>
                    </div>
                    <p className="text-xs text-emerald-100/75">Sin entradas previstas.</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-200">
                            Salidas previstas
                        </p>
                        <span className="rounded-md bg-red-500/15 px-2 py-1 text-[10px] font-bold text-red-200">
                            Top 0
                        </span>
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

function Panel({ title, subtitle, href, icon: Icon, children, className = '' }) {
    return (
        <section className={`rounded-xl border border-crm-border bg-crm-surface p-4 ${className}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    {Icon && (
                        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-crm-surface-raised text-crm-fg-muted">
                            <Icon size={16} />
                        </span>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold leading-tight text-crm-fg">{title}</h3>
                        {subtitle && <p className="mt-1 text-xs leading-relaxed text-crm-fg-muted">{subtitle}</p>}
                    </div>
                </div>
                {href && (
                    <Link href={href} className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-amber-300 transition hover:bg-crm-surface-raised hover:text-amber-200">
                        Ver mas →
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

function EmptyState({ title, text, icon: Icon }) {
    return (
        <div className="flex min-h-[190px] flex-col items-center justify-center rounded-xl border border-crm-border bg-crm-bg px-6 py-10 text-center">
            {Icon && (
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-crm-surface-raised text-crm-fg-muted">
                    <Icon size={18} />
                </span>
            )}
            <h4 className="text-sm font-semibold text-crm-fg">{title}</h4>
            {text && <p className="mt-2 max-w-sm text-xs leading-relaxed text-crm-fg-muted">{text}</p>}
        </div>
    );
}

function SmallMetric({ label, value, tone = 'neutral' }) {
    const tones = {
        neutral: 'text-crm-fg',
        green: 'text-emerald-300',
        red: 'text-red-300',
        amber: 'text-amber-300'
    };

    return (
        <div className="rounded-lg border border-crm-border bg-crm-bg p-3">
            <p className={`text-xl font-bold leading-none ${tones[tone] || tones.neutral}`}>{value}</p>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.13em] text-crm-fg-muted">{label}</p>
        </div>
    );
}

function StockOverviewPanel({ counts }) {
    const active = (counts.disponibles || 0) + (counts.reservados || 0) + (counts.pausados || 0);
    const items = [
        { label: 'Disponibles', value: counts.disponibles || 0, tone: 'green' },
        { label: 'Reservados / Senados', value: counts.reservados || 0, tone: 'amber' },
        { label: 'Vendidos', value: counts.vendidos || 0, tone: 'red' },
        { label: 'En preparacion', value: counts.pausados || 0, tone: 'neutral' }
    ];

    return (
        <Panel title="Estado del stock" icon={PieChart} className="min-h-[329px]">
            <div className="grid grid-cols-2 gap-3">
                {items.map((item) => <SmallMetric key={item.label} {...item} />)}
            </div>
            <div className="mt-5 rounded-lg border border-crm-border bg-crm-bg p-4">
                <div className="mb-3 flex items-center justify-between text-xs">
                    <span className="text-crm-fg-muted">Vehiculos activos en stock</span>
                    <span className="font-bold text-crm-fg">{formatNumber(active)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-crm-surface-raised">
                    <div className="h-full rounded-full bg-crm-red" style={{ width: `${Math.min(100, active * 4)}%` }} />
                </div>
            </div>
        </Panel>
    );
}

function MonthlyGainPanel() {
    const months = ['JUL 25', 'AGO 25', 'SEP 25', 'OCT 25', 'NOV 25', 'DIC 25', 'ENE 26', 'FEB 26', 'MAR 26', 'ABR 26', 'MAY 26', 'JUN 26'];

    return (
        <Panel title="ULTIMOS 12 MESES · GANANCIA USD" icon={TrendingUp} className="min-h-[329px]">
            <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-crm-surface-raised px-2 py-1 text-[10px] font-bold uppercase text-crm-fg-muted">Mes actual</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">Supero obj</span>
                <span className="rounded-md bg-crm-bg px-2 py-1 text-[10px] font-bold uppercase text-crm-fg-muted">Mes normal</span>
            </div>
            <p className="mb-5 text-xs text-crm-fg-muted">Objetivo USD 110k no visible - max 12m: USD 0k</p>
            <div className="flex h-32 items-end gap-2 border-b border-crm-border pb-3">
                {months.map((month, index) => (
                    <div key={month} className="flex flex-1 flex-col items-center gap-2">
                        <div className={`w-full rounded-t-md ${index === months.length - 1 ? 'h-6 bg-crm-red/70' : 'h-3 bg-crm-surface-raised'}`} />
                        <span className="text-center text-[9px] font-semibold leading-tight text-crm-fg-muted">{month}</span>
                    </div>
                ))}
            </div>
        </Panel>
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
        <section className="rounded-xl border border-crm-border bg-crm-surface p-5">
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

function LeadResponsePanel() {
    return (
        <div className="space-y-3">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300">
                Todos los leads estan contactados y asignados.
            </div>
            <section className="rounded-xl border border-crm-border bg-crm-surface p-4">
                <h3 className="text-base font-semibold text-crm-fg">Tiempo de respuesta</h3>
                <p className="mt-2 text-xs text-crm-fg-muted">Sin leads asignados en el mes para medir todavia.</p>
            </section>
        </div>
    );
}

function DeadlinesPanel() {
    return (
        <Panel title="Proximas entregas y vencimientos" subtitle="Entregas, expedientes y cuotas - proximos 7 dias" href="/admin/documentacion" icon={Timer} className="min-h-[399px]">
            <div className="grid grid-cols-3 gap-2">
                <SmallMetric label="Vencidos" value="0" tone="red" />
                <SmallMetric label="Hoy" value="0" tone="amber" />
                <SmallMetric label="Prox. 7d" value="0" tone="green" />
            </div>
            <div className="mt-4">
                <EmptyState title="Todo al dia" text="No hay entregas, expedientes ni cuotas vencidos o por vencer en los proximos 7 dias." icon={Sparkles} />
            </div>
        </Panel>
    );
}

function TopSellersPanel({ user }) {
    const name = user?.name || user?.email || 'AutoSporting';

    return (
        <Panel title={`TOP VENDEDORES - ${new Date().toLocaleDateString('es-AR', { month: 'long' }).toUpperCase()}`} href="/admin/equipo" icon={UserRound} className="min-h-[280px]">
            <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-xl">1</span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-crm-fg">{name} <span className="text-crm-fg-muted">- vos</span></p>
                        <p className="mt-1 text-xs text-crm-fg-muted">0 ventas · 0 consig.</p>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

function SalesLastSixPanel() {
    return (
        <Panel title="Ventas - ultimos 6 meses" subtitle="Cantidad de ventas cerradas por mes" href="/admin/ventas" icon={TrendingUp} className="min-h-[280px]">
            <EmptyState title="Sin ventas en el periodo" text="No hay ventas cerradas en los ultimos 6 meses." icon={ShoppingCart} />
        </Panel>
    );
}

function CashFlowMonthPanel({ metrics }) {
    return (
        <Panel title="Cash Flow del mes" subtitle="0 movimientos · admin/finanzas" href="/admin/finanzas" icon={Landmark} className="min-h-[460px]">
            <div className="grid grid-cols-3 gap-2">
                <SmallMetric label="Ingresos" value="USD 0" tone="green" />
                <SmallMetric label="Egresos" value="USD 0" tone="red" />
                <SmallMetric label="Neto" value="USD 0" tone="green" />
            </div>
            <div className="mt-4 rounded-xl border border-crm-border bg-crm-bg p-3">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-crm-fg-muted">Saldos por cuenta · 2</p>
                <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-crm-fg-muted">Caja USD</span>
                        <strong className="text-crm-fg">USD {formatCurrency(metrics.margenEstimado?.USD || 0)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-crm-fg-muted">Caja ARS</span>
                        <strong className="text-crm-fg">ARS {formatCurrency(metrics.margenEstimado?.ARS || 0)}</strong>
                    </div>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-crm-fg-muted">
                <p>Sin ingresos registrados este mes.</p>
                <p>Sin egresos registrados este mes.</p>
            </div>
        </Panel>
    );
}

function InstallmentsMonthPanel() {
    return (
        <Panel title="Cuotas a pagar - este mes" subtitle="Desde Mi Espacio Personal · 0 cuotas del mes" href="/admin/cuotas" icon={CreditCard} className="min-h-[460px]">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
                Sin cuotas vencidas
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <SmallMetric label="Total del mes" value="-" />
                <SmallMetric label="Cuotas" value="0" />
            </div>
            <p className="mt-3 text-xs text-crm-fg-muted">0 vencidas</p>
        </Panel>
    );
}

function ShowroomPanel() {
    return (
        <Panel title="Visitas en Showroom" subtitle="Trafico fisico - quien esta y cuanto hace que llego" icon={Users}>
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <SmallMetric label="Activas" value="0" />
                <SmallMetric label="Hoy" value="0" />
                <SmallMetric label="Sem." value="0" />
                <SmallMetric label="Cotizaron" value="0" />
            </div>
            <EmptyState title="Sin visitas activas" text="No hay clientes en el showroom en este momento." icon={Users} />
        </Panel>
    );
}

function MatchingOrdersPanel() {
    return (
        <Panel title="Pedidos con auto disponible" subtitle="Pedidos abiertos que matchean stock disponible" href="/admin/reservas" icon={PackageSearch}>
            <div className="mb-4 text-3xl font-bold text-crm-fg">0</div>
            <EmptyState title="Sin coincidencias" text="Cuando entre stock que matchee con un pedido abierto, va a aparecer aca." icon={PackageSearch} />
        </Panel>
    );
}

function LastOperationsPanel() {
    return (
        <Panel title="Ultimas 8 operaciones" subtitle="Ventas recientes ordenadas por fecha" href="/admin/ventas" icon={ClipboardList}>
            <p className="border-t border-crm-border py-6 text-sm text-crm-fg-muted">Sin operaciones registradas.</p>
        </Panel>
    );
}

export default function GeneralDashboardSote({ metrics, canSeeFinancials = false, user }) {
    const counts = metrics.counts || {};
    const alertCount = (metrics.alertas?.alerta60?.length || 0) + (metrics.alertas?.alerta90?.length || 0);
    const activeStock = (counts.disponibles || 0) + (counts.reservados || 0) + (counts.pausados || 0);
    const activeCapitalUsd = metrics.capitalPublicado?.USD || 0;
    const activeCapitalArs = metrics.capitalPublicado?.ARS || 0;
    const estimatedMarginUsd = metrics.margenEstimado?.USD || 0;
    const estimatedMarginArs = metrics.margenEstimado?.ARS || 0;

    const primaryCards = [
        {
            label: 'Revenue del mes',
            value: `USD ${formatCurrency(0)}`,
            detail: '0 operaciones',
            icon: DollarSign,
            tone: 'green',
            href: '/admin/ventas'
        },
        {
            label: 'Stock activo',
            value: `USD ${formatCurrency(activeCapitalUsd)}`,
            detail: `${activeStock} vehiculos · ${counts.disponibles || 0} disp.`,
            icon: Warehouse,
            tone: 'blue',
            href: '/admin/stock'
        },
        {
            label: 'Operaciones del mes',
            value: '0',
            detail: 'Sin operaciones aun',
            icon: TrendingUp,
            tone: 'amber',
            href: '/admin/ventas'
        },
        {
            label: 'Clientes sin contactar',
            value: '0',
            detail: '0 llegaron hoy',
            icon: Users,
            tone: 'purple',
            href: '/admin/clientes'
        }
    ];

    const secondaryCards = [
        {
            label: 'Vehiculos en stock',
            value: formatNumber(activeStock),
            detail: `${counts.disponibles || 0} disponibles · ${counts.reservados || 0} reservados`,
            icon: Car,
            tone: 'blue',
            href: '/admin/stock'
        },
        {
            label: 'Ventas del mes',
            value: '0',
            detail: 'USD 0',
            icon: ShoppingCart,
            tone: 'green',
            href: '/admin/ventas'
        },
        {
            label: 'Cuotas a pagar (mes)',
            value: 'Al dia ✓',
            detail: 'USD 0 este mes',
            icon: CreditCard,
            tone: 'green',
            href: '/admin/cuotas'
        },
        {
            label: 'Balance neto (USD)',
            value: canSeeFinancials ? `USD ${formatCurrency(estimatedMarginUsd)}` : 'Oculto',
            detail: canSeeFinancials ? `ARS ${formatCurrency(estimatedMarginArs)} · stock activo` : 'Sin permiso financiero',
            icon: TrendingUp,
            tone: 'purple',
            href: '/admin/finanzas'
        }
    ];

    const tertiaryCards = [
        {
            label: 'Recordatorios hoy',
            value: '0',
            detail: '',
            icon: CalendarClock,
            tone: 'amber',
            href: '/admin/agenda'
        },
        {
            label: 'Alertas pendientes',
            value: formatNumber(alertCount),
            detail: '',
            icon: Bell,
            tone: alertCount > 0 ? 'red' : 'slate',
            href: '/admin/mis-pendientes'
        },
        {
            label: 'Ticket promedio (USD)',
            value: '—',
            detail: 'Sin operaciones aun',
            icon: DollarSign,
            tone: 'green',
            href: '/admin/reportes'
        },
        {
            label: 'Stock vendidos',
            value: formatNumber(counts.vendidos || 0),
            detail: 'Historico',
            icon: Truck,
            tone: 'slate',
            href: '/admin/stock'
        }
    ];

    const compactCards = [
        {
            label: 'Cotizaciones activas',
            value: '0',
            detail: '0 aprobadas · 0 modificadas',
            icon: ClipboardList,
            tone: 'purple',
            href: '/admin/leads'
        },
        {
            label: 'Expedientes activos',
            value: '0',
            detail: '0 vencidos · 0 por vencer (7d)',
            icon: FileText,
            tone: 'amber',
            href: '/admin/documentacion'
        },
        {
            label: 'Comisiones pendientes',
            value: '0',
            detail: '0 con extra aprobado · 0 pend.',
            icon: Wallet,
            tone: 'amber',
            href: '/admin/ventas'
        },
        {
            label: 'Infracciones',
            value: '0',
            detail: 'Sin pendientes',
            icon: AlertTriangle,
            tone: 'red',
            href: '/admin/calidad-datos'
        },
        {
            label: 'Pedidos activos',
            value: '0',
            detail: 'Sin pedidos',
            icon: TrendingUp,
            tone: 'green',
            href: '/admin/reservas'
        }
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {primaryCards.map((card) => <KpiCard key={card.label} {...card} />)}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {secondaryCards.map((card) => <KpiCard key={card.label} {...card} />)}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {tertiaryCards.map((card) => <KpiCard key={card.label} {...card} />)}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {compactCards.map((card) => <KpiCard key={card.label} {...card} compact />)}
            </div>
            {canSeeFinancials && <CashProjectionPanel metrics={metrics} />}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <StockOverviewPanel counts={counts} />
                <MonthlyGainPanel />
            </div>
            <AnnualSummaryPanel soldCount={counts.vendidos || 0} />
            <LeadResponsePanel />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Panel title="Agenda - proximos 7 dias" subtitle="Todo lo que viene esta semana" href="/admin/agenda" icon={CalendarClock} className="min-h-[399px]">
                    <EmptyState title="Sin eventos proximos" text="No hay nada agendado para los proximos 7 dias." icon={CalendarClock} />
                </Panel>
                <DeadlinesPanel />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TopSellersPanel user={user} />
                <SalesLastSixPanel />
            </div>
            {canSeeFinancials && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <CashFlowMonthPanel metrics={metrics} />
                    <InstallmentsMonthPanel />
                </div>
            )}
            <ShowroomPanel />
            <MatchingOrdersPanel />
            <LastOperationsPanel />
            <p className="px-2 pb-4 text-center text-xs text-crm-fg-muted">
                Estas en la app nueva. Las secciones completas van migrando de a una.
            </p>
        </div>
    );
}
