import React, { useState, useMemo } from 'react';
import { CalendarDays, Filter, Search, CreditCard, AlertCircle, CheckCircle2, ChevronRight, HandCoins } from 'lucide-react';
import CrmBadge from '../ui/CrmBadge';

export default function CuotasFinancieras({ installments, loading, onPayInstallment }) {
    const [filterPeriod, setFilterPeriod] = useState('este_mes'); // este_mes, proximo_mes, todas
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInstallments = useMemo(() => {
        if (!installments) return [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return installments.filter(item => {
            // Ocultar pagadas y anuladas siempre
            const status = String(item.status || '').toLowerCase();
            if (status === 'pagada' || status === 'anulada') return false;

            // Filtro de búsqueda
            const text = `${item.concept || ''} ${item.clientName || ''} ${item.notes || ''}`.toLowerCase();
            if (searchTerm && !text.includes(searchTerm.toLowerCase())) return false;

            // Filtro de tiempo
            const dueDate = new Date(item.dueDate);
            const dueMonth = dueDate.getMonth();
            const dueYear = dueDate.getFullYear();

            if (filterPeriod === 'este_mes') {
                return dueMonth === currentMonth && dueYear === currentYear;
            } else if (filterPeriod === 'proximo_mes') {
                let nextMonth = currentMonth + 1;
                let nextYear = currentYear;
                if (nextMonth > 11) {
                    nextMonth = 0;
                    nextYear++;
                }
                return dueMonth === nextMonth && dueYear === nextYear;
            }
            
            return true; // 'todas'
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [installments, filterPeriod, searchTerm]);

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const getStatusInfo = (item) => {
        const dueDate = new Date(item.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dueDate < today) {
            return { label: 'Vencida', tone: 'danger', icon: AlertCircle };
        } else {
            const diffTime = Math.abs(dueDate - today);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) {
                return { label: 'Por vencer', tone: 'warning', icon: CalendarDays };
            }
            return { label: 'En fecha', tone: 'success', icon: CheckCircle2 };
        }
    };

    const totals = useMemo(() => {
        return filteredInstallments.reduce((acc, item) => {
            const balance = Number(item.amount || 0) - Number(item.paidAmount || 0);
            if (item.currency === 'USD') acc.USD += balance;
            else acc.ARS += balance;
            return acc;
        }, { ARS: 0, USD: 0 });
    }, [filteredInstallments]);

    if (loading) {
        return (
            <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <h3 className="text-sm font-bold text-crm-fg-muted mb-2 uppercase tracking-wider">A Cobrar / Pagar (ARS)</h3>
                    <p className="text-3xl font-black text-crm-fg">{formatMoney(totals.ARS, 'ARS')}</p>
                </div>
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <h3 className="text-sm font-bold text-crm-fg-muted mb-2 uppercase tracking-wider">A Cobrar / Pagar (USD)</h3>
                    <p className="text-3xl font-black text-crm-fg">{formatMoney(totals.USD, 'USD')}</p>
                </div>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar cuotas por concepto, cliente..."
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        />
                    </div>

                    <div className="flex bg-crm-bg border border-crm-border rounded-xl p-1">
                        <button
                            onClick={() => setFilterPeriod('este_mes')}
                            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterPeriod === 'este_mes' ? 'bg-crm-surface border border-crm-border shadow-sm text-crm-fg' : 'text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            Este Mes
                        </button>
                        <button
                            onClick={() => setFilterPeriod('proximo_mes')}
                            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterPeriod === 'proximo_mes' ? 'bg-crm-surface border border-crm-border shadow-sm text-crm-fg' : 'text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            Próximo Mes
                        </button>
                        <button
                            onClick={() => setFilterPeriod('todas')}
                            className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterPeriod === 'todas' ? 'bg-crm-surface border border-crm-border shadow-sm text-crm-fg' : 'text-crm-fg-muted hover:text-crm-fg'}`}
                        >
                            Todas
                        </button>
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                {filteredInstallments.length > 0 ? (
                    filteredInstallments.map((item) => {
                        const statusInfo = getStatusInfo(item);
                        const balance = Number(item.amount || 0) - Number(item.paidAmount || 0);
                        const isPayable = String(item.type || '').toLowerCase() === 'pagar'; // Asumiendo que pueden ser a cobrar o a pagar

                        return (
                            <article key={item._id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-crm-border bg-crm-surface p-4 transition hover:bg-crm-surface-raised">
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${statusInfo.tone === 'danger' ? 'border-red-500/20 bg-crm-red/10 text-crm-red' : statusInfo.tone === 'warning' ? 'border-amber-500/20 bg-amber-500/10 text-amber-500' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'}`}>
                                        <statusInfo.icon size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-crm-fg">{item.concept || 'Cuota'}</h4>
                                            <CrmBadge variant={statusInfo.tone}>{statusInfo.label}</CrmBadge>
                                            {item.type && (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-crm-fg-subtle border border-crm-border px-1.5 rounded bg-crm-bg">
                                                    A {item.type}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-crm-fg-muted">{item.clientName || item.notes || 'Sin detalles'}</p>
                                        <p className="text-xs text-crm-fg-subtle mt-1 flex items-center gap-1">
                                            <CalendarDays size={12} />
                                            Vence: {new Date(item.dueDate).toLocaleDateString('es-AR')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-6 border-t border-crm-border pt-4 md:border-t-0 md:pt-0">
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-crm-fg-subtle uppercase tracking-wider mb-1">Saldo Pendiente</p>
                                        <p className="text-lg font-black text-crm-fg">{formatMoney(balance, item.currency)}</p>
                                    </div>
                                    <button
                                        onClick={() => onPayInstallment(item)}
                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-crm-red px-4 text-sm font-bold text-white shadow-[0_0_15px_rgba(239,51,41,0.2)] transition hover:bg-crm-red-hover"
                                    >
                                        <HandCoins size={15} />
                                        Saldar
                                    </button>
                                </div>
                            </article>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-crm-border bg-crm-surface py-12 px-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-crm-bg flex items-center justify-center mb-2">
                            <CreditCard className="text-crm-fg-muted" size={24} />
                        </div>
                        <h4 className="font-bold text-crm-fg">No hay cuotas pendientes</h4>
                        <p className="text-sm text-crm-fg-muted max-w-sm">
                            No se encontraron cuotas activas para el período seleccionado que no estén ya pagadas o anuladas.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
