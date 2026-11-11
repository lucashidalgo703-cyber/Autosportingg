import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, Search, CreditCard, AlertCircle, CheckCircle2, ArrowUpRight, HandCoins } from 'lucide-react';
import CrmBadge from '../ui/CrmBadge';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { summarizeFinanceInstallments } from '../../../utils/financePresentation';

const FILTERS = ['Todos', 'Pendientes', 'Vencidas', 'Por vencer', 'En fecha', 'Abonadas'];
const formatMoney = (amount, currency = 'ARS') => currency + ' ' + Number(amount || 0).toLocaleString('es-AR');
const getClientName = item => item.clientName || item.customerName || item.clientId?.fullName || '';
const linkedId = value => typeof value === 'object' ? value?._id : value;
const isPaid = item => ['pagada', 'pagada_manual'].includes(String(item.status || '').toLowerCase());

function getStatusInfo(item, dueSummary) {
    if (isPaid(item)) return { label: 'Abonada', tone: 'success', icon: CheckCircle2 };
    if (String(item.status || '').toLowerCase() === 'parcial') return { label: 'Parcial', tone: 'warning', icon: HandCoins };
    if (dueSummary.overdueCount) return { label: 'Vencida', tone: 'danger', icon: AlertCircle };
    if (dueSummary.soonCount) return { label: 'Por vencer', tone: 'warning', icon: CalendarDays };
    return { label: 'En fecha', tone: 'success', icon: CheckCircle2 };
}

export default function CuotasFinancieras({ installments, loading, onPayInstallment, onNewInstallment, onGeneratePlan, filterState: controlledFilterState, onFilterChange }) {
    const { user } = useAuth();
    const [localFilterState, setLocalFilterState] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    const filterState = controlledFilterState ?? localFilterState;
    const setFilterState = value => {
        if (controlledFilterState === undefined) setLocalFilterState(value);
        onFilterChange?.(value);
    };
    const clearFilters = () => {
        setSearchTerm('');
        setFilterState('Todos');
    };
    const hasFilters = filterState !== 'Todos' || searchTerm.length > 0;
    const canViewSales = hasPermission(user, PERMISSIONS.VENTAS_READ);
    const canViewClients = hasPermission(user, PERMISSIONS.CLIENTES_READ);

    const filteredInstallments = useMemo(() => {
        const now = new Date();
        const search = searchTerm.trim().toLowerCase();
        return (installments || []).filter(item => {
            if (String(item.status || '').toLowerCase() === 'anulada') return false;
            const text = [item.concept, item.clientName, item.customerName, item.clientId?.fullName, item.notes, item.vehicleId?.brand, item.vehicleId?.name, item.vehicleId?.plateOrVin].filter(Boolean).join(' ').toLowerCase();
            if (search && !text.includes(search)) return false;
            if (filterState === 'Pendientes') return !isPaid(item);
            if (filterState === 'Abonadas') return isPaid(item);
            const due = summarizeFinanceInstallments([item], now);
            if (filterState === 'Vencidas') return due.overdueCount > 0;
            if (filterState === 'Por vencer') return due.soonCount > 0;
            if (filterState === 'En fecha') return due.futureCount > 0;
            return true;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [installments, filterState, searchTerm]);

    const stats = useMemo(() => summarizeFinanceInstallments(installments), [installments]);
    const filteredSummary = useMemo(() => summarizeFinanceInstallments(filteredInstallments), [filteredInstallments]);
    const counters = [
        { label: 'Cuotas pendientes', value: stats.pendingCount, filter: 'Pendientes', tone: 'text-crm-fg' },
        { label: 'Vencidas', value: stats.overdueCount, filter: 'Vencidas', tone: 'text-crm-red' },
        { label: 'Próximos 7 días', value: stats.soonCount, filter: 'Por vencer', tone: 'text-amber-400' },
        { label: 'En fecha', value: stats.futureCount, filter: 'En fecha', tone: 'text-emerald-400' }
    ];

    if (loading) {
        return (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface" role="status" aria-label="Cargando cuotas">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
            </div>
        );
    }

    return (
        <div className="min-w-0 space-y-4">
            <section aria-label="Resumen de todas las cuotas" className="space-y-2">
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-6">
                    <div className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-3">
                        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Pendiente total</h3>
                        <p className="break-words text-sm font-bold text-crm-fg">{formatMoney(stats.pending.ARS, 'ARS')}</p>
                        <p className="mt-1 break-words text-sm font-bold text-crm-fg-secondary">{formatMoney(stats.pending.USD, 'USD')}</p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-3">
                        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Abonado registrado</h3>
                        <p className="break-words text-sm font-bold text-crm-fg">{formatMoney(stats.paid.ARS, 'ARS')}</p>
                        <p className="mt-1 break-words text-sm font-bold text-crm-fg-secondary">{formatMoney(stats.paid.USD, 'USD')}</p>
                    </div>
                    {counters.map(counter => (
                        <button key={counter.filter} type="button" onClick={() => setFilterState(counter.filter)} aria-pressed={filterState === counter.filter} aria-label={counter.label + ': ' + counter.value + '. Ver cuotas'} className={'min-w-0 rounded-2xl border bg-crm-surface p-3 text-left transition-colors hover:bg-crm-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ' + (filterState === counter.filter ? 'border-crm-red' : 'border-crm-border')}>
                            <span className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">{counter.label}</span>
                            <span className={'block text-xl font-bold ' + counter.tone}>{counter.value}</span>
                        </button>
                    ))}
                </div>
                <p className="px-1 text-[11px] text-crm-fg-muted">Totales de todas las cuotas, sin anuladas. Importes separados por moneda.</p>
            </section>

            <section aria-label="Buscar y filtrar cuotas" className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1" aria-label="Estado de las cuotas">
                        {FILTERS.map(filter => (
                            <button key={filter} type="button" onClick={() => setFilterState(filter)} aria-pressed={filterState === filter} className={'min-h-9 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crm-red ' + (filterState === filter ? 'border-crm-red bg-crm-surface-raised text-crm-fg' : 'border-transparent text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg')}>
                                {filter}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-muted" size={16} />
                        <input aria-label="Buscar cuotas" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar concepto, cliente o patente..." className="h-10 w-full rounded-xl border border-crm-border bg-crm-surface-raised pl-10 pr-3 text-sm text-crm-fg outline-none transition focus:border-crm-red" />
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-crm-border pt-3">
                    <span className="rounded-lg bg-crm-surface-raised px-2.5 py-1.5 text-xs font-semibold text-crm-fg">{filteredInstallments.length} {filteredInstallments.length === 1 ? 'cuota' : 'cuotas'}</span>
                    {hasFilters && <button type="button" onClick={clearFilters} className="min-h-9 px-2 text-xs font-semibold text-crm-fg-muted hover:text-crm-fg">Limpiar filtros</button>}
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <button type="button" onClick={onGeneratePlan} className="inline-flex min-h-9 items-center rounded-lg border border-crm-border bg-crm-surface-raised px-3 text-xs font-semibold text-crm-fg transition hover:bg-crm-surface">Plan automático</button>
                        <button type="button" onClick={onNewInstallment} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-crm-red px-3 text-xs font-bold text-white transition hover:bg-crm-red-hover">
                            <Plus size={14} /> Nueva cuota
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-crm-fg-muted">
                    <span>Saldo de las cuotas mostradas:</span>
                    <span className="font-semibold text-crm-fg">{formatMoney(filteredSummary.pending.ARS, 'ARS')}</span>
                    <span className="font-semibold text-crm-fg">{formatMoney(filteredSummary.pending.USD, 'USD')}</span>
                </div>
            </section>

            <section aria-label="Listado de cuotas" className="min-w-0 space-y-3">
                {filteredInstallments.length > 0 ? filteredInstallments.map(item => {
                    const dueSummary = summarizeFinanceInstallments([item]);
                    const statusInfo = getStatusInfo(item, dueSummary);
                    const StatusIcon = statusInfo.icon;
                    const balance = Number(item.amount || 0) - Number(item.paidAmount || 0);
                    const clientName = getClientName(item);
                    const saleId = linkedId(item.saleId);
                    const clientId = linkedId(item.clientId);
                    const vehicleName = [item.vehicleId?.brand, item.vehicleId?.name, item.vehicleId?.plateOrVin].filter(Boolean).join(' · ');

                    return (
                        <article key={item._id} className="min-w-0 rounded-2xl border border-crm-border bg-crm-surface p-3 sm:p-4">
                            <div className="flex min-w-0 flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <div className={'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-crm-surface-raised ' + (statusInfo.tone === 'danger' ? 'text-crm-red' : statusInfo.tone === 'warning' ? 'text-amber-400' : 'text-emerald-400')}>
                                        <StatusIcon size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                                            <h4 className="min-w-0 break-words text-sm font-bold text-crm-fg">{item.concept || 'Cuota'}</h4>
                                            <CrmBadge variant={statusInfo.tone}>{statusInfo.label}</CrmBadge>
                                            {dueSummary.overdueCount > 0 && statusInfo.label !== 'Vencida' && <CrmBadge variant="danger">Vencida</CrmBadge>}
                                            {item.type && <span className="rounded border border-crm-border bg-crm-surface-raised px-1.5 text-[10px] font-semibold uppercase text-crm-fg-muted">A {item.type}</span>}
                                        </div>
                                        {clientName ? <p className="break-words text-xs font-medium text-crm-fg-secondary">{clientName}</p> : <p className="text-xs text-crm-fg-muted">Sin cliente identificado</p>}
                                        {vehicleName && <p className="mt-1 break-words text-xs text-crm-fg-muted">{vehicleName}</p>}
                                        {item.notes && <p className="mt-1 break-words text-xs text-crm-fg-muted">{item.notes}</p>}
                                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                                            <span className={'inline-flex items-center gap-1 ' + (dueSummary.overdueCount ? 'font-semibold text-crm-red' : 'text-crm-fg-muted')}>
                                                <CalendarDays size={13} /> Vence: {new Date(item.dueDate).toLocaleDateString('es-AR')}
                                            </span>
                                            {canViewSales && saleId && <Link href={'/admin/ventas/' + encodeURIComponent(String(saleId))} className="inline-flex items-center gap-1 font-semibold text-crm-fg-secondary no-underline hover:text-crm-red">Ver operación <ArrowUpRight size={13} /></Link>}
                                            {canViewClients && clientId && <Link href={'/admin/clientes/' + encodeURIComponent(String(clientId))} className="inline-flex items-center gap-1 font-semibold text-crm-fg-secondary no-underline hover:text-crm-red">Ver cliente <ArrowUpRight size={13} /></Link>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-crm-border pt-3 lg:max-w-[45%] lg:justify-end lg:border-t-0 lg:pt-0">
                                    <div className="min-w-0 text-left lg:text-right">
                                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Saldo pendiente</p>
                                        <p className="break-words text-base font-bold text-crm-fg">{formatMoney(balance, item.currency)}</p>
                                    </div>
                                    {!isPaid(item) && <button type="button" onClick={() => onPayInstallment(item)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-crm-red px-4 text-sm font-bold text-white transition hover:bg-crm-red-hover">
                                        <HandCoins size={15} /> Saldar
                                    </button>}
                                </div>
                            </div>
                        </article>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-crm-border bg-crm-surface px-4 py-8 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-crm-surface-raised"><CreditCard className="text-crm-fg-muted" size={22} /></div>
                        <h4 className="text-sm font-bold text-crm-fg">{hasFilters ? 'No hay cuotas que coincidan' : 'No hay cuotas para mostrar'}</h4>
                        <p className="max-w-sm text-xs leading-5 text-crm-fg-muted">{searchTerm ? 'Probá con otro cliente, concepto o patente, o limpiá los filtros.' : filterState !== 'Todos' ? 'No se encontraron cuotas en el estado seleccionado.' : 'Las cuotas que registres o generes aparecerán en este listado.'}</p>
                        {hasFilters && <button type="button" onClick={clearFilters} className="min-h-9 rounded-lg border border-crm-border bg-crm-surface-raised px-3 text-xs font-semibold text-crm-fg hover:bg-crm-surface">Limpiar filtros</button>}
                    </div>
                )}
            </section>
        </div>
    );
}
