import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, Filter, Search, CreditCard, AlertCircle, CheckCircle2, ChevronRight, HandCoins } from 'lucide-react';
import CrmBadge from '../ui/CrmBadge';

export default function CuotasFinancieras({ installments, loading, onPayInstallment, onNewInstallment, onGeneratePlan }) {
    const [filterState, setFilterState] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInstallments = useMemo(() => {
        if (!installments) return [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        return installments.filter(item => {
            // Ocultar pagadas y anuladas siempre
            const status = String(item.status || '').toLowerCase();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(item.dueDate);
            if (status === 'anulada') return false;
            const isAbonada = status === 'pagada' || status === 'pagada_manual';
            // Solo ocultamos pagadas si el filtro NO es 'Abonadas' o 'Todos'
            if (isAbonada && filterState !== 'Abonadas' && filterState !== 'Todos') return false;

            // Filtro de búsqueda
            const text = `${item.concept || ''} ${item.clientName || ''} ${item.notes || ''}`.toLowerCase();
            if (searchTerm && !text.includes(searchTerm.toLowerCase())) return false;

            if (filterState === 'Pendientes') {
                return !isAbonada && status !== 'anulada';
            } else if (filterState === 'Por vencer') {
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays <= 7 && !isAbonada && status !== 'anulada';
            } else if (filterState === 'Abonadas') {
                return isAbonada; 
            } else if (filterState === 'Vencidas') {
                return dueDate < today && !isAbonada && status !== 'anulada';
            }
            
            return true; // 'Todos'
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [installments, filterState, searchTerm]);

    const formatMoney = (amount, currency = 'ARS') => {
        return `${currency === 'USD' ? 'USD' : '$'} ${Number(amount || 0).toLocaleString('es-AR')}`;
    };

    const getStatusInfo = (item) => {
        const status = String(item.status || '').toLowerCase();
        
        if (status === 'pagada' || status === 'pagada_manual') {
            return { label: 'Abonada', tone: 'success', icon: CheckCircle2 };
        }
        if (status === 'parcial') {
            return { label: 'Parcial', tone: 'warning', icon: HandCoins };
        }

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

    
    const stats = useMemo(() => {
        let pendiente = 0;
        let abonado = 0;
        let cuotasPendientes = 0;
        let vencidas = 0;
        let prox7dias = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (installments) {
            installments.forEach(item => {
                if (String(item.status || '').toLowerCase() === 'anulada') return;
                
                const amount = Number(item.amount || 0);
                const paid = Number(item.paidAmount || 0);
                const bal = amount - paid;

                abonado += paid;
                pendiente += bal;

                if (String(item.status || '').toLowerCase() !== 'pagada' && String(item.status || '').toLowerCase() !== 'pagada_manual') {
                    cuotasPendientes++;
                    const dueDate = new Date(item.dueDate);
                    if (dueDate < today) vencidas++;
                    else {
                        const diffTime = dueDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays >= 0 && diffDays <= 7) prox7dias++;
                    }
                }
            });
        }
        return { pendiente, abonado, cuotasPendientes, vencidas, prox7dias };
    }, [installments]);

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
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                    <h3 className="text-[10px] font-bold text-crm-fg-muted mb-1 uppercase tracking-wider">PENDIENTE</h3>
                    <p className="text-xl font-black text-crm-fg">{formatMoney(stats.pendiente, 'USD')}</p>
                </div>
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                    <h3 className="text-[10px] font-bold text-crm-fg-muted mb-1 uppercase tracking-wider">ABONADO</h3>
                    <p className="text-xl font-black text-crm-fg">{formatMoney(stats.abonado, 'USD')}</p>
                </div>
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                    <h3 className="text-[10px] font-bold text-crm-fg-muted mb-1 uppercase tracking-wider">CUOTAS PENDIENTES</h3>
                    <p className="text-xl font-black text-crm-fg">{stats.cuotasPendientes}</p>
                </div>
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                    <h3 className="text-[10px] font-bold text-crm-fg-muted mb-1 uppercase tracking-wider">VENCIDAS</h3>
                    <p className="text-xl font-black text-crm-red">{stats.vencidas}</p>
                </div>
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                    <h3 className="text-[10px] font-bold text-crm-fg-muted mb-1 uppercase tracking-wider">PRÓX. 7 DÍAS</h3>
                    <p className="text-xl font-black text-amber-500">{stats.prox7dias}</p>
                </div>
            </div>


            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {['Todos', 'Pendientes', 'Por vencer', 'Abonadas', 'Vencidas'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterState(f)}
                                className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${filterState === f ? 'border-crm-red text-crm-red' : 'border-transparent text-crm-fg-muted hover:text-crm-fg'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar cuotas por concepto, cliente..."
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4 mt-4">
                    <button onClick={onGeneratePlan} className="inline-flex h-9 items-center px-3 rounded-lg border border-crm-border bg-crm-bg text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition">Plan automático</button>
                    <button onClick={onNewInstallment} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red text-white px-4 text-xs font-black shadow-crm-shadow-red hover:opacity-95 transition ml-auto">
                        <Plus size={14} /> Nueva cuota
                    </button>
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
                                    {statusInfo.label !== 'Abonada' && (
                                        <button
                                            onClick={() => onPayInstallment(item)}
                                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-crm-red px-4 text-sm font-bold text-white shadow-[0_0_15px_rgba(239,51,41,0.2)] transition hover:bg-crm-red-hover"
                                        >
                                            <HandCoins size={15} />
                                            Saldar
                                        </button>
                                    )}
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
