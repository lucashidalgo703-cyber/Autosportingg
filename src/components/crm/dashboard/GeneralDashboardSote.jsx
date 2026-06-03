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
    ShoppingCart,
    TrendingUp,
    Truck,
    Users,
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
        </section>
    );
}

export default function GeneralDashboardSote({ metrics, canSeeFinancials = false }) {
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
        </div>
    );
}
