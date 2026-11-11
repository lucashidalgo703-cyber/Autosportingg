"use client";

import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined, Wallet } from 'lucide-react';
import { buildFinanceOverviewCharts } from '../../../utils/financeOverview';
import { summarizeFinanceInstallments } from '../../../utils/financePresentation';

const formatMoney = (amount, currency) => `${currency} ${Number(amount || 0).toLocaleString('es-AR')}`;

export default function FinanceOverview({ balances, metrics, transactions = [], installments = [], onOpenAccounts, onOpenMovements, onOpenInstallments }) {
    const [chartCurrency, setChartCurrency] = useState('ARS');
    const [chartPeriod, setChartPeriod] = useState('month');
    const chartData = useMemo(() => buildFinanceOverviewCharts(transactions, { period: chartPeriod }), [transactions, chartPeriod]);
    const chart = chartData[chartCurrency];
    const periodLabel = chartPeriod === 'month' ? new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : 'Todo el historial';

    const installmentStats = useMemo(() => summarizeFinanceInstallments(installments), [installments]);

    return (
        <div className="min-w-0 space-y-4">
            <div className="grid items-start gap-4 xl:grid-cols-2">
                <section className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-labelledby="finance-available-heading">
                    <SectionHeading id="finance-available-heading" icon={Wallet} title="Dinero disponible" description="Saldos actuales de las cuentas activas." action="Ver cuentas" onAction={onOpenAccounts}/>
                    <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                        {['ARS', 'USD'].map(currency => (
                            <button key={currency} type="button" onClick={onOpenAccounts} className="group min-w-0 rounded-xl border border-crm-border bg-crm-surface-raised p-4 text-left transition-colors hover:border-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red" aria-label={`Ver cuentas. Saldo en ${currency}: ${formatMoney(balances[currency], currency)}`}>
                                <span className="flex items-center justify-between gap-2 text-xs font-semibold text-crm-fg-muted"><span>{currency === 'ARS' ? 'Pesos argentinos' : 'Dólares estadounidenses'}</span><ArrowRight size={15} className="shrink-0 transition-colors group-hover:text-crm-red"/></span>
                                <span className="mt-3 block break-words text-xl font-bold leading-tight text-crm-fg sm:text-2xl">{formatMoney(balances[currency], currency)}</span>
                                <span className="mt-2 block text-[11px] text-crm-fg-muted">Saldo en cuentas · {currency}</span>
                            </button>
                        ))}
                    </div>
                    <p className="mb-0 mt-3 text-xs leading-5 text-crm-fg-muted">Cada moneda se informa por separado, sin conversiones.</p>
                </section>

                <section className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-labelledby="finance-activity-heading">
                    <SectionHeading id="finance-activity-heading" icon={ChartNoAxesCombined} title="Actividad acumulada" description="Ingresos y egresos de todo el historial activo." action="Ver movimientos" onAction={onOpenMovements}/>
                    <div className="mt-4 space-y-3">
                        {['ARS', 'USD'].map(currency => (
                            <div key={currency} className="rounded-xl border border-crm-border bg-crm-surface-raised px-3 py-3">
                                <p className="mb-2 text-[11px] font-bold text-crm-fg-muted">{currency}</p>
                                <dl className="m-0 grid min-w-0 grid-cols-2 gap-3">
                                    <div className="min-w-0"><dt className="flex items-center gap-1 text-[11px] text-crm-fg-muted"><ArrowDownLeft size={13} className="shrink-0 text-crm-success"/>Ingresos</dt><dd className="m-0 mt-1 break-words text-sm font-semibold text-crm-success">{formatMoney(metrics[currency].income, currency)}</dd></div>
                                    <div className="min-w-0"><dt className="flex items-center gap-1 text-[11px] text-crm-fg-muted"><ArrowUpRight size={13} className="shrink-0 text-crm-red"/>Egresos</dt><dd className="m-0 mt-1 break-words text-sm font-semibold text-crm-red">{formatMoney(metrics[currency].expense, currency)}</dd></div>
                                </dl>
                            </div>
                        ))}
                    </div>
                    <p className="mb-0 mt-3 text-xs leading-5 text-crm-fg-muted">No incluye movimientos pendientes ni anulados. El dinero disponible se muestra en las cuentas.</p>
                </section>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-labelledby="finance-installments-heading">
                <SectionHeading id="finance-installments-heading" icon={CalendarDays} title="Estado de las cuotas" description="Entrá a cada grupo para revisar sus cuotas pendientes." action="Ver todas" onAction={() => onOpenInstallments?.()}/>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <InstallmentGroup title="Vencidas" count={installmentStats.overdueCount} caption="Con fecha de vencimiento pasada" tone="text-crm-red" onClick={() => onOpenInstallments?.('Vencidas')}/>
                    <InstallmentGroup title="Por vencer" count={installmentStats.soonCount} caption="Vencen dentro de los próximos 7 días" tone="text-crm-warning" onClick={() => onOpenInstallments?.('Por vencer')}/>
                    <InstallmentGroup title="En fecha" count={installmentStats.futureCount} caption="Vencen en más de 7 días" tone="text-crm-success" onClick={() => onOpenInstallments?.('En fecha')}/>
                </div>
            </section>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4 sm:p-5" aria-labelledby="finance-charts-heading">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0"><h2 id="finance-charts-heading" className="m-0 text-sm font-bold text-crm-fg">Actividad por moneda</h2><p className="mb-0 mt-1 text-xs leading-5 text-crm-fg-muted">{periodLabel} · Sin movimientos pendientes ni anulados.</p></div>
                    <div className="flex max-w-full flex-wrap items-end gap-3">
                        <label className="min-w-0 text-[11px] font-medium text-crm-fg-muted">Período<select value={chartPeriod} onChange={event => setChartPeriod(event.target.value)} className="mt-1 block h-9 max-w-full rounded-lg border border-crm-border bg-crm-surface-raised px-2 text-xs font-semibold text-crm-fg focus:border-crm-red focus:outline-none"><option value="month">Este mes</option><option value="all">Todo el historial</option></select></label>
                        <div role="group" aria-label="Moneda de los gráficos" className="inline-flex gap-1 rounded-lg border border-crm-border bg-crm-surface-raised p-1">
                            {['ARS', 'USD'].map(currency => <button key={currency} type="button" aria-pressed={chartCurrency === currency} onClick={() => setChartCurrency(currency)} className={'rounded-md border px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ' + (chartCurrency === currency ? 'border-crm-red bg-crm-red text-white' : 'border-transparent text-crm-fg-muted hover:text-crm-fg')}>{currency}</button>)}
                        </div>
                    </div>
                </div>
                <div className="mt-4 grid items-start gap-4 xl:grid-cols-2" aria-live="polite" aria-atomic="false">
                    <div className="min-w-0 rounded-xl border border-crm-border bg-crm-surface-raised p-4">
                        <h3 className="m-0 text-xs font-bold text-crm-fg">Ingresos y egresos ({chartCurrency})</h3>
                        {chart.income === 0 && chart.expense === 0 ? <ChartEmpty>No hay ingresos ni egresos en {chartCurrency} para este período.</ChartEmpty> : <div className="mt-4 space-y-4"><ChartBar label="Ingresos" value={chart.income} max={chart.max} currency={chartCurrency} color="bg-crm-success"/><ChartBar label="Egresos" value={chart.expense} max={chart.max} currency={chartCurrency} color="bg-crm-red"/></div>}
                    </div>
                    <div className="min-w-0 rounded-xl border border-crm-border bg-crm-surface-raised p-4">
                        <h3 className="m-0 text-xs font-bold text-crm-fg">Principales egresos ({chartCurrency})</h3>
                        {chart.expenseCategories.length ? <div className="mt-4 space-y-4">{chart.expenseCategories.map(item => <ChartBar key={item.category} label={item.category.replaceAll('_', ' ')} value={item.amount} max={Math.max(...chart.expenseCategories.map(category => category.amount), 1)} currency={chartCurrency} color="bg-crm-red"/>)}</div> : <ChartEmpty>No hay egresos en {chartCurrency} para este período.</ChartEmpty>}
                    </div>
                </div>
            </section>
        </div>
    );
}

function SectionHeading({ id, icon: Icon, title, description, action, onAction }) {
    return <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 id={id} className="m-0 flex items-center gap-2 text-sm font-bold text-crm-fg"><Icon size={17} className="shrink-0 text-crm-fg-muted"/>{title}</h2><p className="mb-0 mt-1 text-xs leading-5 text-crm-fg-muted">{description}</p></div><button type="button" onClick={onAction} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-crm-border bg-crm-surface-raised px-2.5 py-1.5 text-xs font-semibold text-crm-fg transition-colors hover:border-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red">{action}<ArrowRight size={13}/></button></div>;
}

function InstallmentGroup({ title, count, caption, tone, onClick }) {
    return <button type="button" onClick={onClick} className="group min-w-0 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-left transition-colors hover:border-crm-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red"><span className="flex items-center justify-between gap-2 text-xs font-semibold text-crm-fg"><span>{title}</span><ArrowRight size={14} className="shrink-0 text-crm-fg-muted group-hover:text-crm-red"/></span><span className={'mt-2 block text-2xl font-bold ' + tone}>{count}</span><span className="mt-1 block text-[11px] leading-4 text-crm-fg-muted">{caption}</span></button>;
}

function ChartBar({ label, value, max, currency, color }) {
    const width = Math.max(0, Math.min(100, (Number(value || 0) / max) * 100));
    return <div className="min-w-0"><div className="mb-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs"><span className="min-w-0 break-words capitalize text-crm-fg-muted">{label}</span><span className="break-words font-semibold text-crm-fg">{formatMoney(value, currency)}</span></div><div className="h-2 overflow-hidden rounded-full bg-crm-surface"><div className={'h-full rounded-full transition-[width] ' + color} style={{ width: `${width}%` }}/></div></div>;
}

function ChartEmpty({ children }) {
    return <p className="mb-0 mt-4 rounded-lg border border-dashed border-crm-border p-4 text-xs leading-5 text-crm-fg-muted">{children}</p>;
}
