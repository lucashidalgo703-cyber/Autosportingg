"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
    Banknote,
    BarChart3,
    Briefcase,
    CalendarDays,
    Car,
    CheckCircle2,
    CreditCard,
    Droplets,
    Flame,
    HandCoins,
    Landmark,
    Plus,
    Receipt,
    Repeat,
    Trophy,
    Users,
    Wallet
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import { useAdminInstallments } from '../../../hooks/useAdminInstallments';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';

const TAB_MI_DIA = 'Mi d\u00eda';

const tabs = [
    { label: TAB_MI_DIA, icon: BarChart3 },
    { label: 'Mis ventas', icon: Trophy },
    { label: 'URGENTE', icon: Flame },
    { label: 'Pagos realizados', icon: Wallet },
    { label: 'Deudas', icon: HandCoins },
    { label: 'Gastos fijos', icon: Receipt },
    { label: 'Cuotas a pagar', icon: CreditCard },
    { label: 'Cuotas a cobrar', icon: HandCoins },
    { label: 'Saldo agencia', icon: Repeat },
    { label: 'Mis autos', icon: Car },
    { label: 'Patrimonio', icon: BarChart3 },
    { label: 'Pendientes', icon: CheckCircle2 },
    { label: 'Calendario', icon: CalendarDays },
    { label: 'Contactos', icon: Users }
];

const formatMonth = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const isSameMonth = (value, baseDate) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() === baseDate.getMonth() && date.getFullYear() === baseDate.getFullYear();
};

const isToday = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

const getDateOnly = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const isWithinNext7Days = (value) => {
    const date = getDateOnly(value);
    if (!date) return false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return date >= start && date <= end;
};

const money = (value, currency = 'ARS') => {
    const number = Number(value || 0);
    const symbol = currency === 'USD' ? 'USD' : '$';
    return `${symbol} ${number.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};

const sumAmount = (items, currency = null) => (
    items
        .filter((item) => !currency || item.currency === currency || item.saleCurrency === currency)
        .reduce((acc, item) => acc + Number(item.amount || item.salePrice || 0), 0)
);

function ActionButton({ children }) {
    return (
        <button
            type="button"
            className="m-0 inline-flex h-9 appearance-none items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-crm-red/40 bg-crm-red px-3 text-xs font-bold text-white shadow-[0_0_22px_rgba(239,51,41,0.28)] transition-all hover:bg-crm-red-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red focus-visible:ring-offset-2 focus-visible:ring-offset-crm-bg"
        >
            <Plus size={14} />
            {children}
        </button>
    );
}

function StatCard({ icon: Icon, value, label, note, tone = 'neutral' }) {
    const tones = {
        red: 'border-crm-red/40 bg-crm-red/10 text-red-200',
        green: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200',
        indigo: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-200',
        violet: 'border-purple-500/30 bg-purple-500/5 text-purple-200',
        amber: 'border-amber-500/30 bg-amber-500/5 text-amber-100',
        neutral: 'border-crm-border bg-crm-surface text-crm-fg'
    };

    return (
        <div className={`rounded-xl border p-4 ${tones[tone] || tones.neutral}`}>
            <div className="mb-1 flex items-center justify-between">
                <Icon size={18} className="text-current opacity-80" />
            </div>
            <div className="space-y-0.5 text-lg font-bold tabular-nums text-current md:text-2xl">{value}</div>
            <p className="m-0 mt-1 text-[10px] uppercase tracking-wider text-crm-fg-subtle">{label}</p>
            {note && <p className="m-0 mt-0.5 text-xs leading-4 text-crm-fg-muted">{note}</p>}
        </div>
    );
}

function SectionTitle({ children, meta }) {
    return (
        <div className="mb-2 flex items-center justify-between gap-3">
            <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-crm-fg-muted">{children}</h3>
            {meta && <span className="shrink-0 text-xs font-medium text-crm-fg-subtle">{meta}</span>}
        </div>
    );
}

function PanelHeader({ title, subtitle, action }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 className="m-0 text-lg font-bold leading-7 text-crm-fg">{title}</h2>
                {subtitle && <p className="m-0 mt-1 max-w-3xl text-xs leading-4 text-crm-fg-subtle">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

function EmptyState({ title, text, actionLabel }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-crm-border bg-crm-surface px-6 py-12 text-center">
            <div className="space-y-1">
                <h3 className="m-0 text-sm font-semibold text-crm-fg">{title}</h3>
                <p className="m-0 mx-auto max-w-sm text-sm leading-5 text-crm-fg-muted">{text}</p>
            </div>
            {actionLabel && (
                <div className="mt-2">
                    <ActionButton>{actionLabel}</ActionButton>
                </div>
            )}
        </div>
    );
}

function ListPanel({ items, renderItem, emptyTitle, emptyText, actionLabel }) {
    if (!items.length) {
        return <EmptyState title={emptyTitle} text={emptyText} actionLabel={actionLabel} />;
    }

    return (
        <div className="space-y-2">
            {items.map(renderItem)}
        </div>
    );
}

function SimpleRow({ keyValue, title, meta, amount }) {
    return (
        <div key={keyValue} className="flex items-center justify-between gap-4 rounded-xl border border-crm-border bg-crm-surface p-4">
            <div className="min-w-0">
                <div className="truncate text-sm font-bold text-crm-fg">{title}</div>
                {meta && <div className="mt-1 text-xs text-crm-fg-subtle">{meta}</div>}
            </div>
            {amount && <div className="shrink-0 text-sm font-black text-crm-fg">{amount}</div>}
        </div>
    );
}

export default function MiEspacioPage() {
    const { user } = useAuth();
    const { refresh: fetchCars } = useAdminCars();
    const { fetchTasks } = useAdminCrmTasks();
    const { fetchInstallments } = useAdminInstallments();
    const { fetchSales } = useAdminSales();
    const { fetchTransactions } = useAdminTransactions();

    const [activeTab, setActiveTab] = useState(TAB_MI_DIA);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        cars: [],
        tasks: [],
        installments: [],
        sales: [],
        transactions: []
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [cars, tasks, installments, sales, transactions] = await Promise.all([
                    fetchCars(),
                    fetchTasks(),
                    fetchInstallments(),
                    fetchSales(),
                    fetchTransactions()
                ]);

                setData({
                    cars: Array.isArray(cars) ? cars : [],
                    tasks: Array.isArray(tasks) ? tasks : [],
                    installments: Array.isArray(installments) ? installments : [],
                    sales: Array.isArray(sales) ? sales : [],
                    transactions: Array.isArray(transactions) ? transactions : []
                });
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const summary = useMemo(() => {
        const now = new Date();
        const pendingTasks = data.tasks.filter((task) => task.status === 'pendiente');
        const overdueTasks = pendingTasks.filter((task) => {
            const date = getDateOnly(task.dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date && date < today;
        });
        const thisMonthSales = data.sales.filter((sale) => (
            isSameMonth(sale.saleDate || sale.createdAt, now) &&
            !['cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase())
        ));
        const availableStock = data.cars.filter((car) => (
            ['disponible', 'publicado', 'activo'].includes(String(car.status || '').toLowerCase())
        ));
        const activeFiles = data.sales.filter((sale) => (
            !['entregada', 'cancelada', 'borrador'].includes(String(sale.status || '').toLowerCase())
        ));

        const monthInstallments = data.installments.filter((item) => isSameMonth(item.dueDate, now));
        const unpaidInstallments = data.installments.filter((item) => String(item.status || '').toLowerCase() !== 'pagada');
        const monthUnpaidInstallments = monthInstallments.filter((item) => String(item.status || '').toLowerCase() !== 'pagada');
        const paidInstallments = monthInstallments.filter((item) => String(item.status || '').toLowerCase() === 'pagada');
        const toPay = monthUnpaidInstallments.reduce((acc, item) => acc + Number(item.amount || 0) - Number(item.paidAmount || 0), 0);

        const monthTransactions = data.transactions.filter((transaction) => isSameMonth(transaction.date || transaction.createdAt, now));
        const expenseTransactions = monthTransactions.filter((transaction) => ['egreso', 'gasto', 'pago'].includes(String(transaction.type || '').toLowerCase()));
        const incomeTransactions = monthTransactions.filter((transaction) => ['ingreso', 'cobro'].includes(String(transaction.type || '').toLowerCase()));
        const paidThisMonth = sumAmount(expenseTransactions);
        const collectedThisMonth = sumAmount(incomeTransactions);
        const monthIncomeUsd = thisMonthSales
            .filter((sale) => sale.saleCurrency === 'USD')
            .reduce((acc, sale) => acc + Number(sale.salePrice || 0), 0);

        return {
            pendingTasks,
            overdueTasks,
            urgentTasks: [...overdueTasks, ...pendingTasks.filter((task) => isWithinNext7Days(task.dueDate))],
            todayTasks: pendingTasks.filter((task) => isToday(task.dueDate)),
            next7: pendingTasks.filter((task) => isWithinNext7Days(task.dueDate)),
            availableStock,
            thisMonthSales,
            activeFiles,
            monthInstallments,
            monthUnpaidInstallments,
            unpaidInstallments,
            paidInstallments,
            expenseTransactions,
            incomeTransactions,
            toPay,
            toCollect: toPay,
            paidThisMonth,
            collectedThisMonth,
            monthIncomeUsd
        };
    }, [data]);

    const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const role = user?.role === 'admin' ? 'Administrador' : (user?.role || 'Usuario');

    const renderMiDia = () => (
        <div className="space-y-6">
            <p className="m-0 mb-5 text-sm text-crm-fg-muted">
                Tu resumen como administrador <span aria-hidden="true">—</span> <strong className="text-crm-fg-muted">{formatMonth(new Date())}</strong>
            </p>

            <section>
                <SectionTitle>Plata este mes</SectionTitle>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard icon={CreditCard} value={money(summary.toPay)} label="A pagar este mes" note="Cuotas + deudas que vencen" tone="red" />
                    <StatCard icon={Banknote} value={money(summary.paidThisMonth)} label="Ya pagué este mes" note="Suma de pagos registrados" tone="green" />
                    <StatCard icon={Wallet} value={money(summary.toCollect)} label="A cobrar este mes" note="Cuotas a cobrar que vencen" tone="indigo" />
                    <StatCard icon={Wallet} value={money(summary.collectedThisMonth)} label="Ya cobré este mes" note="Suma de cobros registrados" tone="green" />
                </div>
            </section>

            <section>
                <SectionTitle meta={`${summary.next7.length} eventos`}>Próximos 7 días</SectionTitle>
                <div className="rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-xs text-crm-fg-subtle">
                    {summary.next7.length === 0 ? (
                        <p className="m-0">Nada que vence en los próximos 7 días. Aprovechá la calma.</p>
                    ) : (
                        <div className="space-y-2">
                            {summary.next7.slice(0, 5).map((task) => (
                                <SimpleRow
                                    key={task._id}
                                    keyValue={task._id}
                                    title={task.title || 'Pendiente'}
                                    meta={task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-AR') : 'Sin fecha'}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section>
                <SectionTitle>Tu agencia</SectionTitle>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <StatCard icon={Car} value={summary.availableStock.length} label="Stock disponible" tone="green" />
                    <StatCard icon={Briefcase} value={summary.thisMonthSales.length} label="Ventas del mes" tone="indigo" />
                    <StatCard icon={Landmark} value={summary.activeFiles.length} label="Expedientes activos" tone="violet" />
                    <StatCard icon={Wallet} value={money(summary.monthIncomeUsd, 'USD')} label="Ingresos del mes" tone="amber" />
                </div>
            </section>

            <section>
                <SectionTitle>Hoy</SectionTitle>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <StatCard icon={CheckCircle2} value={summary.pendingTasks.length} label="Mis pendientes" tone="neutral" />
                    <StatCard icon={CalendarDays} value={summary.todayTasks.length} label="Eventos hoy" tone="neutral" />
                    <StatCard icon={Wallet} value="USD 0" label="Gastos fijos / mes" note="Piso comprometido" tone="indigo" />
                </div>
            </section>
        </div>
    );

    const renderTabPanel = () => {
        if (activeTab === TAB_MI_DIA) return renderMiDia();

        if (activeTab === 'Mis ventas') {
            return (
                <>
                    <PanelHeader title={`Mis ventas — ${summary.thisMonthSales.length} operaciones`} subtitle="Tu actividad comercial del mes en AutoSporting." />
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <StatCard icon={Trophy} value={summary.thisMonthSales.length} label="Ventas del mes" tone="indigo" />
                        <StatCard icon={Wallet} value={money(summary.monthIncomeUsd, 'USD')} label="Ingresos USD" tone="green" />
                        <StatCard icon={Briefcase} value={summary.activeFiles.length} label="Operaciones abiertas" tone="violet" />
                    </section>
                    <ListPanel
                        items={summary.thisMonthSales.slice(0, 8)}
                        emptyTitle="Sin ventas registradas"
                        emptyText="Todavía no hay operaciones asociadas a tu usuario este mes."
                        renderItem={(sale) => (
                            <SimpleRow
                                key={sale._id}
                                keyValue={sale._id}
                                title={`Venta ${String(sale._id || '').slice(-6).toUpperCase()}`}
                                meta={sale.saleDate ? new Date(sale.saleDate).toLocaleDateString('es-AR') : 'Sin fecha'}
                                amount={sale.saleCurrency ? money(sale.salePrice, sale.saleCurrency) : undefined}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'URGENTE') {
            return (
                <>
                    <PanelHeader title={`URGENTE — ${summary.urgentTasks.length} pendientes`} subtitle="Tus anotaciones de cosas urgentes a pagar. Cada item muestra cuántos días faltan para el vencimiento." action={<ActionButton>Nuevo urgente</ActionButton>} />
                    <ListPanel
                        items={summary.urgentTasks.slice(0, 10)}
                        emptyTitle="Sin items urgentes"
                        emptyText="Anotá acá pagos / trámites con vencimiento para no olvidarlos."
                        actionLabel="Agregar urgente"
                        renderItem={(task) => (
                            <SimpleRow
                                key={task._id}
                                keyValue={task._id}
                                title={task.title || 'Pendiente urgente'}
                                meta={task.dueDate ? `Vence ${new Date(task.dueDate).toLocaleDateString('es-AR')}` : 'Sin fecha'}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Pagos realizados') {
            return (
                <>
                    <PanelHeader title={`Pagos realizados — ${summary.expenseTransactions.length} items`} subtitle="Todos tus pagos en un solo lugar — los manuales + los parciales que cargaste en Deudas, Urgente y Cuotas a pagar." action={<ActionButton>Registrar pago manual</ActionButton>} />
                    <div className="inline-flex rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-crm-fg-muted">Mes: Ver todos</div>
                    <ListPanel
                        items={summary.expenseTransactions.slice(0, 10)}
                        emptyTitle="Sin pagos registrados"
                        emptyText="Todavía no hay pagos cargados para mostrar."
                        renderItem={(tx) => (
                            <SimpleRow
                                key={tx._id}
                                keyValue={tx._id}
                                title={tx.concept || tx.description || 'Pago'}
                                meta={tx.date ? new Date(tx.date).toLocaleDateString('es-AR') : tx.category || 'Movimiento'}
                                amount={money(tx.amount, tx.currency)}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Deudas') {
            return (
                <>
                    <PanelHeader title={`Deudas — ${summary.unpaidInstallments.length} activas`} subtitle="Plata que le debés a otras personas. Solo vos lo ves." action={<ActionButton>Nueva deuda</ActionButton>} />
                    <ListPanel
                        items={summary.unpaidInstallments.slice(0, 10)}
                        emptyTitle="Sin deudas registradas"
                        emptyText="Si le debés plata a alguien, anotalo acá para no perderle la huella."
                        actionLabel="Nueva deuda"
                        renderItem={(item) => (
                            <SimpleRow
                                key={item._id}
                                keyValue={item._id}
                                title={`Cuota ${item.installmentNumber || ''}`.trim()}
                                meta={item.dueDate ? `Vence ${new Date(item.dueDate).toLocaleDateString('es-AR')}` : item.status || 'Pendiente'}
                                amount={money(Number(item.amount || 0) - Number(item.paidAmount || 0), item.currency)}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Gastos fijos') {
            return (
                <>
                    <PanelHeader title="Gastos fijos / Suscripciones — 0 ítems" action={<ActionButton>Nuevo gasto fijo</ActionButton>} />
                    <EmptyState title="Sin gastos fijos" text="Cargá tus gastos fijos: alquiler, prepaga, internet, ABL, sueldos, suscripciones, etc." />
                </>
            );
        }

        if (activeTab === 'Cuotas a pagar') {
            const overdue = summary.unpaidInstallments.filter((item) => {
                const date = getDateOnly(item.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date && date < today;
            });
            const totalDebt = summary.unpaidInstallments.reduce((acc, item) => acc + Number(item.amount || 0) - Number(item.paidAmount || 0), 0);

            return (
                <>
                    <PanelHeader
                        title={`Cuotas a pagar — ${summary.unpaidInstallments.length} pendientes`}
                        subtitle="Tarjeta, hipoteca, préstamos — todo lo que pagás en cuotas."
                        action={(
                            <div className="flex flex-wrap gap-2">
                                <ActionButton>Nueva cuota</ActionButton>
                                <ActionButton>Plan automático</ActionButton>
                            </div>
                        )}
                    />
                    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard icon={Flame} value={overdue.length} label="Vencidas" tone="red" />
                        <StatCard icon={CheckCircle2} value={overdue.length === 0 ? 'Al día ✓' : overdue.length} label="Estado" tone="green" />
                        <StatCard icon={CalendarDays} value={summary.monthUnpaidInstallments.length} label="Vence este mes" tone="indigo" />
                        <StatCard icon={Wallet} value={money(totalDebt)} label="Total adeudado" tone="amber" />
                    </section>
                    <ListPanel
                        items={summary.unpaidInstallments.slice(0, 10)}
                        emptyTitle="Sin cuotas registradas"
                        emptyText="Cargá tus deudas: tarjeta de crédito, hipoteca, préstamo, leasing, viaje en cuotas..."
                        renderItem={(item) => (
                            <SimpleRow
                                key={item._id}
                                keyValue={item._id}
                                title={`Cuota ${item.installmentNumber || ''}`.trim()}
                                meta={item.dueDate ? `Vence ${new Date(item.dueDate).toLocaleDateString('es-AR')}` : 'Sin vencimiento'}
                                amount={money(Number(item.amount || 0) - Number(item.paidAmount || 0), item.currency)}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Cuotas a cobrar') {
            return (
                <>
                    <PanelHeader
                        title={`Cuotas a cobrar — ${summary.monthUnpaidInstallments.length} pendientes`}
                        subtitle="Plata que te tienen que pagar — préstamos personales, fiados, etc. Solo vos lo ves."
                        action={(
                            <div className="flex flex-wrap gap-2">
                                <ActionButton>Nueva cuota</ActionButton>
                                <ActionButton>Plan automático</ActionButton>
                            </div>
                        )}
                    />
                    <ListPanel
                        items={summary.monthUnpaidInstallments.slice(0, 10)}
                        emptyTitle="Sin cuotas a cobrar"
                        emptyText="Anotá la plata que te deben — préstamos a amigos, fiados, ventas en cuotas privadas..."
                        actionLabel="Nueva cuota"
                        renderItem={(item) => (
                            <SimpleRow
                                key={item._id}
                                keyValue={item._id}
                                title={`Cuota a cobrar ${item.installmentNumber || ''}`.trim()}
                                meta={item.dueDate ? `Vence ${new Date(item.dueDate).toLocaleDateString('es-AR')}` : 'Sin vencimiento'}
                                amount={money(Number(item.amount || 0) - Number(item.paidAmount || 0), item.currency)}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Saldo agencia') {
            return (
                <>
                    <PanelHeader title="Préstamos cruzados con la agencia — 0 sin saldar" subtitle="Registrá cuando sacás plata de la caja para uso personal o cuando ponés tuya en la agencia." action={<ActionButton>Nuevo movimiento</ActionButton>} />
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <StatCard icon={Wallet} value="USD 0" label="Agencia me debe" note="$ 0" tone="green" />
                        <StatCard icon={Wallet} value="USD 0" label="Yo debo a agencia" note="$ 0" tone="red" />
                        <StatCard icon={Repeat} value="USD 0" label="Neto" note="A favor mío" tone="indigo" />
                    </section>
                </>
            );
        }

        if (activeTab === 'Mis autos') {
            return (
                <>
                    <PanelHeader title="Mis autos personales — 0 registrados" action={<ActionButton>Nuevo auto personal</ActionButton>} />
                    <EmptyState title="Sin autos personales" text="Registrá autos personales separados del stock operativo de la agencia." />
                </>
            );
        }

        if (activeTab === 'Patrimonio') {
            const stockUsd = summary.availableStock
                .filter((car) => car.currency === 'USD')
                .reduce((acc, car) => acc + Number(car.price || 0), 0);
            const debtArs = summary.unpaidInstallments.reduce((acc, item) => acc + Number(item.amount || 0) - Number(item.paidAmount || 0), 0);

            return (
                <>
                    <PanelHeader title={`Resumen patrimonial — ${displayName}`} subtitle="Vista consolidada de activos y pasivos personales. Cada moneda se calcula por separado — el tipo de cambio es volátil." />
                    <div className="inline-flex rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-crm-fg-muted">Incluir stock propio (USD)</div>
                    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <StatCard icon={Car} value={money(stockUsd, 'USD')} label="Activos estimados" tone="green" />
                        <StatCard icon={Droplets} value={money(debtArs)} label="Pasivos" tone="red" />
                        <StatCard icon={BarChart3} value={money(stockUsd, 'USD')} label="Patrimonio neto" tone="indigo" />
                    </section>
                </>
            );
        }

        if (activeTab === 'Pendientes') {
            return (
                <>
                    <PanelHeader title={`Mis pendientes — ${summary.pendingTasks.length} sin completar`} action={<ActionButton>Nueva tarea</ActionButton>} />
                    <ListPanel
                        items={summary.pendingTasks.slice(0, 12)}
                        emptyTitle="Sin pendientes"
                        emptyText="Cargá tus tareas: llamar al contador, renovar registro, ver médico, comprar regalo cumple..."
                        actionLabel="Nueva tarea"
                        renderItem={(task) => (
                            <SimpleRow
                                key={task._id}
                                keyValue={task._id}
                                title={task.title || 'Tarea pendiente'}
                                meta={task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-AR') : task.type || 'General'}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Calendario') {
            const personalEvents = [...summary.todayTasks, ...summary.next7].filter((task, index, arr) => (
                arr.findIndex((item) => item._id === task._id) === index
            ));
            return (
                <>
                    <PanelHeader title={`Mi calendario personal — ${personalEvents.length} eventos`} subtitle="Eventos no laborales: cumpleaños familia, médico, vacaciones, eventos de los chicos…" action={<ActionButton>Nuevo evento</ActionButton>} />
                    <ListPanel
                        items={personalEvents.slice(0, 10)}
                        emptyTitle="Sin eventos personales"
                        emptyText="Cargá cumpleaños, vacaciones, turnos médicos, eventos de los chicos…"
                        actionLabel="Nuevo evento"
                        renderItem={(task) => (
                            <SimpleRow
                                key={task._id}
                                keyValue={task._id}
                                title={task.title || 'Evento'}
                                meta={task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-AR') : 'Sin fecha'}
                            />
                        )}
                    />
                </>
            );
        }

        if (activeTab === 'Contactos') {
            return (
                <>
                    <PanelHeader title="Mis contactos clave — 0 registrados" subtitle="Tu agenda personal — separada de los clientes de la agencia." action={<ActionButton>Nuevo contacto</ActionButton>} />
                    <EmptyState title="Sin contactos personales" text="Cargá contactos personales, proveedores o referencias que quieras mantener separadas de clientes." />
                </>
            );
        }

        return renderMiDia();
    };

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-crm-fg-subtle">
                Cargando mi espacio...
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl p-4 pb-24 font-sans text-crm-fg animate-in fade-in duration-300 md:p-6">
            <header className="mb-5 border-b border-crm-border pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="m-0 text-xl font-semibold leading-7 text-crm-fg">Mi Espacio — {displayName}</h1>
                        <p className="m-0 mt-0.5 text-sm text-crm-fg-muted">
                            Tu zona personal — separada de la operación de la agencia. Solo vos ves esto.
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-200">
                        {role}
                    </span>
                </div>
            </header>

            <nav className="mb-5 overflow-x-auto rounded-xl border border-crm-border bg-crm-surface p-1" aria-label="Pestañas de Mi Espacio">
                <div className="flex min-w-max gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.label;
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                onClick={() => setActiveTab(tab.label)}
                                className={`m-0 inline-flex shrink-0 appearance-none items-center gap-1.5 whitespace-nowrap rounded-lg border-0 px-3 py-1.5 text-xs font-medium transition-colors ${
                                    active
                                        ? 'bg-crm-red text-white shadow'
                                        : 'bg-transparent text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg'
                                }`}
                                aria-pressed={active}
                                title={tab.label}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <section className={activeTab === TAB_MI_DIA ? '' : 'space-y-4'}>
                {renderTabPanel()}
            </section>
        </div>
    );
}
