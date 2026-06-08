"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
    Banknote,
    Briefcase,
    CalendarDays,
    Car,
    CheckCircle2,
    CreditCard,
    Droplets,
    ExternalLink,
    Flame,
    Landmark,
    ListChecks,
    Wallet
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useAdminCars } from '../../../hooks/useAdminCars';
import { useAdminCrmTasks } from '../../../hooks/useAdminCrmTasks';
import { useAdminInstallments } from '../../../hooks/useAdminInstallments';
import { useAdminSales } from '../../../hooks/useAdminSales';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';

const tabs = [
    { label: 'Mi dia', icon: ListChecks },
    { label: 'Mis ventas', icon: Briefcase },
    { label: 'URGENTE', icon: Flame },
    { label: 'Pagos realizados', icon: Wallet },
    { label: 'Deudas', icon: Droplets },
    { label: 'Gastos fijos', icon: CreditCard },
    { label: 'Cuotas a pagar', icon: CreditCard },
    { label: 'Cuotas a cobrar', icon: Banknote },
    { label: 'Saldo agencia', icon: Landmark },
    { label: 'Mis autos', icon: Car },
    { label: 'Patrimonio', icon: Wallet },
    { label: 'Pendientes', icon: CheckCircle2 },
    { label: 'Calendario', icon: CalendarDays },
    { label: 'Contactos', icon: ExternalLink }
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

const isWithinNext7Days = (value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);
    return date >= start && date <= end;
};

const money = (value, currency = 'ARS') => {
    const number = Number(value || 0);
    const symbol = currency === 'USD' ? 'USD' : '$';
    return `${symbol} ${number.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};

function StatCard({ icon: Icon, value, label, note, tone = 'neutral' }) {
    const tones = {
        red: 'border-red-500/40 bg-red-500/10 text-red-200',
        green: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
        indigo: 'border-indigo-500/35 bg-indigo-500/10 text-indigo-200',
        violet: 'border-violet-500/35 bg-violet-500/10 text-violet-200',
        amber: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
        neutral: 'border-[#33333a] bg-[#1e1e24] text-white'
    };

    return (
        <div className={`rounded-xl border p-4 ${tones[tone] || tones.neutral}`}>
            <Icon size={19} className="mb-4 text-current opacity-80" />
            <div className="text-2xl font-black leading-none text-white">{value}</div>
            <p className="m-0 mt-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
            {note && <p className="m-0 mt-1 text-xs leading-4 text-zinc-400">{note}</p>}
        </div>
    );
}

function SectionTitle({ children, meta }) {
    return (
        <div className="mb-3 flex items-center justify-between">
            <h3 className="m-0 text-xs font-black uppercase tracking-widest text-zinc-400">{children}</h3>
            {meta && <span className="text-xs font-medium text-zinc-500">{meta}</span>}
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

    const [activeTab, setActiveTab] = useState('Mi dia');
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
        const toPay = monthInstallments
            .filter((item) => String(item.status || '').toLowerCase() !== 'pagada')
            .reduce((acc, item) => acc + Number(item.amount || 0) - Number(item.paidAmount || 0), 0);
        const toCollect = monthInstallments
            .filter((item) => String(item.status || '').toLowerCase() !== 'pagada')
            .reduce((acc, item) => acc + Number(item.amount || 0) - Number(item.paidAmount || 0), 0);

        const monthTransactions = data.transactions.filter((transaction) => isSameMonth(transaction.date || transaction.createdAt, now));
        const paidThisMonth = monthTransactions
            .filter((transaction) => ['egreso', 'gasto', 'pago'].includes(String(transaction.type || '').toLowerCase()))
            .reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0);
        const collectedThisMonth = monthTransactions
            .filter((transaction) => ['ingreso', 'cobro'].includes(String(transaction.type || '').toLowerCase()))
            .reduce((acc, transaction) => acc + Number(transaction.amount || 0), 0);
        const monthIncomeUsd = thisMonthSales
            .filter((sale) => sale.saleCurrency === 'USD')
            .reduce((acc, sale) => acc + Number(sale.salePrice || 0), 0);

        return {
            pendingTasks,
            todayTasks: pendingTasks.filter((task) => isToday(task.dueDate)),
            next7: pendingTasks.filter((task) => isWithinNext7Days(task.dueDate)),
            availableStock,
            thisMonthSales,
            activeFiles,
            toPay,
            toCollect,
            paidThisMonth,
            collectedThisMonth,
            monthIncomeUsd
        };
    }, [data]);

    const displayName = user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Equipo');
    const role = user?.role === 'admin' ? 'Administrador' : (user?.role || 'Usuario');

    if (loading) {
        return (
            <div className="flex h-72 items-center justify-center font-sans text-xs font-bold uppercase tracking-wider text-zinc-500">
                Cargando mi espacio...
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-7xl px-3 py-5 pb-24 font-sans text-[#f4f4f5] animate-in fade-in duration-300 sm:px-4 sm:py-6">
            <header className="mb-5 border-b border-[#33333a] pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="m-0 text-2xl font-bold leading-8 text-white">Mi Espacio — {displayName}</h1>
                        <p className="m-0 mt-1 text-sm font-medium text-zinc-400">
                            Tu zona personal — separada de la operacion de la agencia. Solo vos ves esto.
                        </p>
                    </div>
                    <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200">
                        {role}
                    </span>
                </div>
            </header>

            <nav className="mb-5 overflow-x-auto rounded-2xl border border-[#33333a] bg-[#1e1e24] p-1.5" aria-label="Pestanas de Mi Espacio">
                <div className="flex min-w-max gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.label;
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                onClick={() => setActiveTab(tab.label)}
                                className={`m-0 inline-flex h-9 appearance-none items-center gap-2 rounded-xl border-0 px-3 text-sm font-bold transition-colors ${
                                    active
                                        ? 'bg-[#ef3329] text-white shadow-[0_0_22px_rgba(239,51,41,0.35)]'
                                        : 'bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white'
                                }`}
                                aria-pressed={active}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <p className="m-0 mb-5 text-sm text-zinc-400">
                Tu resumen como administrador — <strong className="text-zinc-300">{formatMonth(new Date())}</strong>
            </p>

            <SectionTitle>Plata este mes</SectionTitle>
            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={CreditCard} value={money(summary.toPay)} label="A pagar este mes" note="Cuotas + deudas que vencen" tone="red" />
                <StatCard icon={Banknote} value={money(summary.paidThisMonth)} label="Ya pague este mes" note="Suma de pagos registrados" tone="green" />
                <StatCard icon={Wallet} value={money(summary.toCollect)} label="A cobrar este mes" note="Cuotas a cobrar que vencen" tone="indigo" />
                <StatCard icon={Wallet} value={money(summary.collectedThisMonth)} label="Ya cobre este mes" note="Suma de cobros registrados" tone="green" />
            </section>

            <SectionTitle meta={`${summary.next7.length} eventos`}>Proximos 7 dias</SectionTitle>
            <section className="mb-6 rounded-xl border border-[#33333a] bg-[#1e1e24] px-4 py-3">
                {summary.next7.length === 0 ? (
                    <p className="m-0 text-sm text-zinc-500">Nada que vence en los proximos 7 dias. Aprovecha la calma.</p>
                ) : (
                    <div className="space-y-2">
                        {summary.next7.slice(0, 5).map((task) => (
                            <div key={task._id} className="flex items-center justify-between gap-4 text-sm">
                                <span className="truncate text-white">{task.title || 'Pendiente'}</span>
                                <span className="shrink-0 text-xs text-zinc-500">{new Date(task.dueDate).toLocaleDateString('es-AR')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <SectionTitle>Tu agencia</SectionTitle>
            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={Car} value={summary.availableStock.length} label="Stock disponible" tone="green" />
                <StatCard icon={Briefcase} value={summary.thisMonthSales.length} label="Ventas del mes" tone="indigo" />
                <StatCard icon={Landmark} value={summary.activeFiles.length} label="Expedientes activos" tone="violet" />
                <StatCard icon={Wallet} value={money(summary.monthIncomeUsd, 'USD')} label="Ingresos del mes" tone="amber" />
            </section>

            <SectionTitle>Hoy</SectionTitle>
            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatCard icon={CheckCircle2} value={summary.pendingTasks.length} label="Mis pendientes" tone="neutral" />
                <StatCard icon={CalendarDays} value={summary.todayTasks.length} label="Eventos hoy" tone="neutral" />
                <StatCard icon={Wallet} value="USD 0" label="Gastos fijos / mes" note="Piso comprometido" tone="indigo" />
            </section>
        </div>
    );
}
