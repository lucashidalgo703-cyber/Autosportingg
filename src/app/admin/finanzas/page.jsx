"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CalendarDays,
    ChevronDown,
    FileSpreadsheet,
    FileText,
    Plus,
    ReceiptText,
    RefreshCcw,
    Search,
    Wallet
} from 'lucide-react';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';
import TransactionModal from '../../../components/crm/finance/TransactionModal';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';

const FINANCE_TABS = [
    { id: 'resumen', icon: '📊', label: 'Resumen' },
    { id: 'movimientos', icon: '🧾', label: 'Movimientos' },
    { id: 'senas', icon: '🤝', label: 'Señas' },
    { id: 'cuotas', icon: '📆', label: 'Cuotas' },
    { id: 'pagos', icon: '💸', label: 'Pagos Disp.' },
    { id: 'tarjeta', icon: '💳', label: 'Tarjeta' },
    { id: 'retiros', icon: '🏧', label: 'Retiros' },
    { id: 'comisiones', icon: '🪙', label: 'Comisiones' },
    { id: 'rentabilidad', icon: '📈', label: 'Rentabilidad' },
    { id: 'cuentas', icon: '🏦', label: 'Cuentas' },
    { id: 'cobrar-pagar', icon: '🔁', label: 'x Cobrar/Pagar' },
    { id: 'prestamos', icon: '🤲', label: 'Préstamos' },
    { id: 'presupuesto', icon: '📋', label: 'Presupuesto' },
    { id: 'recurrencias', icon: '🔄', label: 'Recurrencias' },
    { id: 'arqueos', icon: '🔍', label: 'Arqueos' },
    { id: 'cierre', icon: '🧮', label: 'Cierre Caja' },
    { id: 'conciliacion', icon: '✅', label: 'Conciliación' },
    { id: 'afip', icon: '🏛️', label: 'AFIP/IVA' }
];

const BASE_FILTERS = {
    search: '',
    currency: 'todas',
    paymentMethod: 'todas',
    status: 'todos',
    linkedTo: 'todas',
    startDate: '',
    endDate: ''
};

const normalizeType = (tx) => String(tx?.type || '').toLowerCase();

const isIncome = (tx) => normalizeType(tx) === 'ingreso';

const isExpense = (tx) => normalizeType(tx) === 'egreso';

const getAmount = (tx) => Number(tx?.amount || 0);

const dateInputValue = (date) => date.toISOString().split('T')[0];

const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR');
};

const formatMoney = (amount, currency = 'ARS') => {
    const value = Number(amount || 0).toLocaleString('es-AR');
    return `${currency} ${value}`;
};

const isSenaTransaction = (tx) => {
    const text = `${tx?.concept || ''} ${tx?.description || ''} ${tx?.category || ''} ${tx?.notes || ''}`.toLowerCase();
    return text.includes('seña') || text.includes('sena') || text.includes('reserva') || Boolean(tx?.reservationId);
};

function FinanzasPage() {
    const { fetchTransactions, createTransaction, updateTransaction, loading, error } = useAdminTransactions();
    const [allTransactions, setAllTransactions] = useState([]);
    const [activeTab, setActiveTab] = useState('resumen');
    const [movementMode, setMovementMode] = useState('todos');
    const [senaMode, setSenaMode] = useState('todos');
    const [senaSearch, setSenaSearch] = useState('');
    const [filters, setFilters] = useState(BASE_FILTERS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [modalPreset, setModalPreset] = useState(null);

    const loadData = async () => {
        const data = await fetchTransactions();
        setAllTransactions(data || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const metrics = useMemo(() => {
        return allTransactions.reduce((acc, tx) => {
            if (tx.status === 'anulado') return acc;
            const currency = tx.currency === 'USD' ? 'USD' : 'ARS';
            const amount = getAmount(tx);

            if (isIncome(tx)) {
                acc[currency].income += amount;
            }
            if (isExpense(tx)) {
                acc[currency].expense += amount;
            }

            return acc;
        }, {
            ARS: { income: 0, expense: 0 },
            USD: { income: 0, expense: 0 }
        });
    }, [allTransactions]);

    const balances = useMemo(() => ({
        ARS: metrics.ARS.income - metrics.ARS.expense,
        USD: metrics.USD.income - metrics.USD.expense
    }), [metrics]);

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter((tx) => {
            const text = `${tx.concept || tx.description || ''} ${tx.category || ''} ${tx.notes || ''}`.toLowerCase();
            const mode = movementMode;

            if (mode === 'ingreso' && !isIncome(tx)) return false;
            if (mode === 'egreso' && !isExpense(tx)) return false;
            if (mode === 'transferencias' && !text.includes('transfer')) return false;

            if (filters.search && !text.includes(filters.search.toLowerCase())) return false;
            if (filters.currency !== 'todas' && tx.currency !== filters.currency) return false;
            if (filters.paymentMethod !== 'todas' && tx.paymentMethod !== filters.paymentMethod) return false;
            if (filters.status !== 'todos' && tx.status !== filters.status) return false;

            if (filters.linkedTo !== 'todas') {
                if (filters.linkedTo === 'unlinked' && (tx.saleId || tx.reservationId || tx.clientId || tx.vehicleId || tx.installmentId)) return false;
                if (filters.linkedTo === 'sale' && !tx.saleId) return false;
                if (filters.linkedTo === 'reservation' && !tx.reservationId) return false;
                if (filters.linkedTo === 'client' && !tx.clientId) return false;
                if (filters.linkedTo === 'vehicle' && !tx.vehicleId) return false;
                if (filters.linkedTo === 'installment' && !tx.installmentId) return false;
            }

            if (filters.startDate && filters.endDate) {
                const txDate = new Date(tx.date || tx.createdAt).setHours(0, 0, 0, 0);
                const start = new Date(filters.startDate).setHours(0, 0, 0, 0);
                const end = new Date(filters.endDate).setHours(0, 0, 0, 0);
                if (txDate < start || txDate > end) return false;
            }

            return true;
        });
    }, [allTransactions, filters, movementMode]);

    const senaTransactions = useMemo(() => {
        return allTransactions.filter((tx) => {
            if (!isSenaTransaction(tx)) return false;
            const text = `${tx.concept || tx.description || ''} ${tx.category || ''} ${tx.notes || ''}`.toLowerCase();
            if (senaSearch && !text.includes(senaSearch.toLowerCase())) return false;
            if (senaMode === 'recibida' && !isIncome(tx)) return false;
            if (senaMode === 'devuelta' && !isExpense(tx)) return false;
            if (senaMode === 'aplicada' && !text.includes('aplic')) return false;
            return true;
        });
    }, [allTransactions, senaMode, senaSearch]);

    const senaTotals = useMemo(() => {
        return allTransactions.filter(isSenaTransaction).reduce((acc, tx) => {
            if (tx.status === 'anulado') return acc;
            const bucket = tx.currency === 'USD' ? 'USD' : 'ARS';
            if (isIncome(tx)) acc.received[bucket] += getAmount(tx);
            if (isExpense(tx)) acc.returned[bucket] += getAmount(tx);
            if (`${tx.concept || ''} ${tx.category || ''} ${tx.notes || ''}`.toLowerCase().includes('aplic')) {
                acc.applied[bucket] += getAmount(tx);
            }
            return acc;
        }, {
            received: { ARS: 0, USD: 0 },
            applied: { ARS: 0, USD: 0 },
            returned: { ARS: 0, USD: 0 }
        });
    }, [allTransactions]);

    const monthlyFlow = useMemo(() => {
        const currentMonth = new Date().toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        return {
            label: currentMonth,
            income: metrics.USD.income,
            expense: metrics.USD.expense,
            max: Math.max(metrics.USD.income, metrics.USD.expense, 1)
        };
    }, [metrics]);

    const expenseCategories = useMemo(() => {
        const categories = allTransactions.reduce((acc, tx) => {
            if (tx.status === 'anulado' || !isExpense(tx) || tx.currency !== 'USD') return acc;
            const key = tx.category || 'Sin categoría';
            acc[key] = (acc[key] || 0) + getAmount(tx);
            return acc;
        }, {});

        return Object.entries(categories)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 4);
    }, [allTransactions]);

    const handleQuickRange = (range) => {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (range === 'semana') {
            start.setDate(now.getDate() - now.getDay());
        }
        if (range === 'mes') {
            start.setDate(1);
        }
        if (range === 'trimestre') {
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            start.setMonth(quarterStartMonth, 1);
        }
        if (range === 'anio') {
            start.setMonth(0, 1);
        }

        setFilters((current) => ({
            ...current,
            startDate: dateInputValue(start),
            endDate: dateInputValue(end)
        }));
    };

    const handleClearFilters = () => {
        setMovementMode('todos');
        setFilters(BASE_FILTERS);
    };

    const openTransactionModal = (preset = null) => {
        setSelectedTx(null);
        setModalPreset(preset);
        setIsModalOpen(true);
    };

    const handleEditTransaction = (tx) => {
        setSelectedTx(tx);
        setModalPreset(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalPreset(null);
        setSelectedTx(null);
    };

    const handleSaveTransaction = async (data) => {
        try {
            if (selectedTx) {
                await updateTransaction(selectedTx._id, data);
            } else {
                await createTransaction(data);
            }
            await loadData();
            closeModal();
        } catch (err) {
            console.error(err.message);
        }
    };

    const handleAnnulTransaction = async (id) => {
        try {
            await updateTransaction(id, { status: 'anulado' });
            await loadData();
            closeModal();
        } catch (err) {
            console.error(err.message);
        }
    };

    return (
        <PermissionGuard permission={PERMISSIONS.FINANZAS_READ}>
            <div className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-6">
                <header className="mb-5 flex flex-col gap-4 border-b border-crm-border pb-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-crm-fg">Administración Financiera</h1>
                        <p className="mt-1 text-sm font-medium text-crm-fg-muted">
                            Movimientos, saldos por caja, comisiones, presupuestos y cierres.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => openTransactionModal({ type: 'ingreso', concept: 'Nuevo recibo', category: 'Recibo', paymentMethod: 'efectivo' })}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 text-sm font-bold text-crm-fg transition hover:bg-crm-surface-raised"
                        >
                            <ReceiptText size={16} />
                            Nuevo Recibo
                        </button>
                        <button
                            type="button"
                            onClick={() => openTransactionModal({ type: 'ingreso', concept: 'Nuevo boleto', category: 'Boleto', paymentMethod: 'transferencia' })}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95"
                        >
                            <Plus size={16} />
                            Nuevo Boleto
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-crm-warning/20 bg-crm-warning/10 p-4 text-sm font-bold text-crm-warning">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                <nav aria-label="Pestañas de Finanzas" className="mb-6 flex gap-2 overflow-x-auto border-b border-crm-border pb-3">
                    {FINANCE_TABS.map((tab) => {
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-black transition ${
                                    active
                                        ? 'border-crm-red bg-crm-red/15 text-crm-red'
                                        : 'border-crm-border bg-crm-surface text-crm-fg-muted hover:border-crm-border-strong hover:text-crm-fg'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                {loading && allTransactions.length === 0 ? (
                    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'resumen' && (
                            <ResumenFinanciero
                                balances={balances}
                                metrics={metrics}
                                monthlyFlow={monthlyFlow}
                                expenseCategories={expenseCategories}
                                onOpenAccounts={() => setActiveTab('cuentas')}
                            />
                        )}

                        {activeTab === 'movimientos' && (
                            <MovimientosFinancieros
                                filteredTransactions={filteredTransactions}
                                filters={filters}
                                movementMode={movementMode}
                                metrics={metrics}
                                onChangeFilters={setFilters}
                                onClearFilters={handleClearFilters}
                                onEdit={handleEditTransaction}
                                onNew={() => openTransactionModal({ type: 'ingreso', concept: '', category: '', paymentMethod: 'efectivo' })}
                                onQuickRange={handleQuickRange}
                                setMovementMode={setMovementMode}
                            />
                        )}

                        {activeTab === 'senas' && (
                            <SenasFinancieras
                                senaMode={senaMode}
                                senaSearch={senaSearch}
                                senaTotals={senaTotals}
                                senaTransactions={senaTransactions}
                                onChangeMode={setSenaMode}
                                onChangeSearch={setSenaSearch}
                                onEdit={handleEditTransaction}
                                onNew={() => openTransactionModal({ type: 'ingreso', currency: 'USD', concept: 'Seña recibida', category: 'Seña', paymentMethod: 'efectivo' })}
                            />
                        )}

                        {activeTab !== 'resumen' && activeTab !== 'movimientos' && activeTab !== 'senas' && (
                            <FinanceTabPlaceholder
                                tab={FINANCE_TABS.find((item) => item.id === activeTab)}
                                balances={balances}
                                metrics={metrics}
                                onNew={() => openTransactionModal({ type: 'ingreso', concept: '', category: '', paymentMethod: 'efectivo' })}
                            />
                        )}
                    </>
                )}

                <TransactionModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    transaction={selectedTx}
                    initialData={modalPreset}
                    onSave={handleSaveTransaction}
                    onAnnul={handleAnnulTransaction}
                />
            </div>
        </PermissionGuard>
    );
}

function ResumenFinanciero({ balances, metrics, monthlyFlow, expenseCategories, onOpenAccounts }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-crm-fg">💰 Saldo en cuentas — Dinero disponible</h2>
                            <span className="mt-1 inline-flex rounded-md bg-crm-bg px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                Sincronizado con movimientos
                            </span>
                        </div>
                        <Wallet className="text-crm-success" size={20} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <MetricBlock label="Total en ARS" value={formatMoney(balances.ARS, 'ARS')} />
                        <MetricBlock label="Total en USD" value={formatMoney(balances.USD, 'USD')} />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <AccountButton name="Caja ARS" detail="Efectivo · ARS" value={formatMoney(balances.ARS, 'ARS')} onClick={onOpenAccounts} />
                        <AccountButton name="Caja USD" detail="Banco · USD" value={formatMoney(balances.USD, 'USD')} onClick={onOpenAccounts} />
                    </div>
                </section>

                <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <h2 className="mb-5 text-base font-black text-crm-fg">📊 Actividad — Movimientos acumulados</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <MetricBlock label="Ingresos Totales" value={formatMoney(metrics.USD.income, 'USD')} subValue={formatMoney(metrics.ARS.income, 'ARS')} />
                        <MetricBlock label="Egresos Totales" value={formatMoney(metrics.USD.expense, 'USD')} subValue={formatMoney(metrics.ARS.expense, 'ARS')} tone="danger" />
                        <MetricBlock label="Balance Neto (cuentas)" value={formatMoney(balances.USD, 'USD')} subValue={formatMoney(balances.ARS, 'ARS')} tone="success" />
                    </div>
                    <p className="mt-4 text-xs font-medium text-crm-fg-subtle">Suma de saldos reales</p>
                </section>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                <h2 className="mb-5 text-base font-black text-crm-fg">📅 Cuotas — Estado de cobro</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <DebtStatus title="Vencidas" value="0" copy="— sin atrasos" caption="Pendientes con fecha pasada" tone="danger" />
                    <DebtStatus title="Por vencer" value="0" copy="— sin atrasos" caption="Próximos 7 días" tone="warning" />
                    <DebtStatus title="En fecha" value="0" copy="— sin atrasos" caption="A más de 7 días — tranquilo" tone="success" />
                </div>
            </section>

            <div className="flex items-center justify-end gap-2 text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                Gráficos en:
                <button type="button" className="rounded-lg border border-crm-red bg-crm-red/10 px-3 py-1 text-crm-red">ARS</button>
                <button type="button" className="rounded-lg border border-crm-border bg-crm-surface px-3 py-1 text-crm-fg-muted">USD</button>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <h3 className="mb-5 text-base font-black text-crm-fg">Flujo de Caja Mensual (USD)</h3>
                    <div className="space-y-4">
                        <ChartBar label={`${monthlyFlow.label} — Ingresos ${formatMoney(monthlyFlow.income, 'USD')} · Egresos ${formatMoney(monthlyFlow.expense, 'USD')}`} value={monthlyFlow.income} max={monthlyFlow.max} color="bg-crm-success" />
                        <ChartBar label="Ingresos" value={monthlyFlow.income} max={monthlyFlow.max} color="bg-crm-success" />
                        <ChartBar label="Egresos" value={monthlyFlow.expense} max={monthlyFlow.max} color="bg-crm-red" />
                    </div>
                </section>

                <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <h3 className="mb-5 text-base font-black text-crm-fg">Egresos por Categoría (USD)</h3>
                    {expenseCategories.length > 0 ? (
                        <div className="space-y-3">
                            {expenseCategories.map((item) => (
                                <div key={item.category} className="flex items-center justify-between rounded-xl border border-crm-border bg-crm-bg p-3">
                                    <span className="text-sm font-bold text-crm-fg">{item.category}</span>
                                    <span className="text-sm font-black text-crm-red">{formatMoney(item.amount, 'USD')}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyPanel icon={<FileSpreadsheet size={30} />} title="Sin egresos" copy="Todavía no hay egresos en USD para graficar." />
                    )}
                </section>
            </div>
        </div>
    );
}

function MovimientosFinancieros({
    filteredTransactions,
    filters,
    movementMode,
    metrics,
    onChangeFilters,
    onClearFilters,
    onEdit,
    onNew,
    onQuickRange,
    setMovementMode
}) {
    const summary = filteredTransactions.reduce((acc, tx) => {
        const currency = tx.currency === 'USD' ? 'USD' : 'ARS';
        if (tx.status === 'anulado') return acc;
        if (isIncome(tx)) acc[currency].income += getAmount(tx);
        if (isExpense(tx)) acc[currency].expense += getAmount(tx);
        return acc;
    }, {
        USD: { income: 0, expense: 0 },
        ARS: { income: 0, expense: 0 }
    });

    const modeButton = (id, label) => (
        <button
            key={id}
            type="button"
            aria-pressed={movementMode === id}
            onClick={() => setMovementMode(id)}
            className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${
                movementMode === id
                    ? 'border-crm-red text-crm-red'
                    : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                {[
                    ['todos', 'Todos'],
                    ['ingreso', 'Ingreso'],
                    ['egreso', 'Egreso'],
                    ['transferencias', '⇄ Transferencias']
                ].map(([id, label]) => modeButton(id, label))}
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.85fr_0.8fr_0.8fr_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                        <input
                            value={filters.search}
                            onChange={(event) => onChangeFilters({ ...filters, search: event.target.value })}
                            placeholder="Buscar (descripción, vehículo, vendedor)"
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        />
                    </div>

                    <SelectLike value={filters.paymentMethod} onChange={(value) => onChangeFilters({ ...filters, paymentMethod: value })}>
                        <option value="todas">Todos los métodos</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="cheque">Cheque</option>
                        <option value="otro">Otro</option>
                    </SelectLike>

                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(event) => onChangeFilters({ ...filters, startDate: event.target.value })}
                        className="h-10 rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-bold text-crm-fg outline-none focus:border-crm-red"
                        aria-label="Desde"
                    />

                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(event) => onChangeFilters({ ...filters, endDate: event.target.value })}
                        className="h-10 rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-bold text-crm-fg outline-none focus:border-crm-red"
                        aria-label="Hasta"
                    />

                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-bold text-crm-fg-muted transition hover:text-crm-fg"
                    >
                        <RefreshCcw size={15} />
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-crm-fg-muted">
                    <span className="font-black">📅 Rango:</span>
                    {[
                        ['hoy', 'Hoy'],
                        ['semana', 'Esta semana'],
                        ['mes', 'Este mes'],
                        ['trimestre', 'Este trimestre'],
                        ['anio', 'Este año']
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onQuickRange(id)}
                            className="rounded-lg border border-crm-border bg-crm-bg px-3 py-1.5 text-xs font-bold text-crm-fg-muted transition hover:border-crm-red hover:text-crm-red"
                        >
                            {label}
                        </button>
                    ))}
                    <span className="ml-auto rounded-lg bg-crm-bg px-3 py-1.5 text-xs font-black text-crm-fg-muted">
                        {filteredTransactions.length} movimientos
                    </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-crm-fg-muted">💼 Caja:</span>
                    <SelectLike value={filters.currency} onChange={(value) => onChangeFilters({ ...filters, currency: value })}>
                        <option value="todas">Todas las cajas</option>
                        <option value="ARS">Caja ARS — {formatMoney(metrics.ARS.income - metrics.ARS.expense, 'ARS')}</option>
                        <option value="USD">Caja USD — {formatMoney(metrics.USD.income - metrics.USD.expense, 'USD')}</option>
                    </SelectLike>
                    <button
                        type="button"
                        onClick={onNew}
                        className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red"
                    >
                        Registrar
                    </button>
                </div>
            </section>

            <section className="space-y-3">
                {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((tx) => (
                        <MovementRow key={tx._id} tx={tx} onEdit={onEdit} />
                    ))
                ) : (
                    <EmptyPanel icon={<FileText size={34} />} title="Sin resultados" copy="Todavía no hay movimientos cargados. Podés crear uno desde el botón Registrar." />
                )}
            </section>

            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-crm-border bg-crm-surface p-4 md:grid-cols-3 xl:grid-cols-6">
                <MetricBlock label="Ingresos USD" value={formatMoney(summary.USD.income, 'USD')} tone="success" compact />
                <MetricBlock label="Egresos USD" value={formatMoney(summary.USD.expense, 'USD')} tone="danger" compact />
                <MetricBlock label="Neto USD" value={formatMoney(summary.USD.income - summary.USD.expense, 'USD')} compact />
                <MetricBlock label="Ingresos ARS" value={formatMoney(summary.ARS.income, 'ARS')} tone="success" compact />
                <MetricBlock label="Egresos ARS" value={formatMoney(summary.ARS.expense, 'ARS')} tone="danger" compact />
                <MetricBlock label="Neto ARS" value={formatMoney(summary.ARS.income - summary.ARS.expense, 'ARS')} compact />
            </div>

            <p className="text-xs font-medium text-crm-fg-subtle">
                {filteredTransactions.length} de {filteredTransactions.length} movimientos. Click en Editar para abrir el formulario.
            </p>
        </div>
    );
}

function SenasFinancieras({ senaMode, senaSearch, senaTotals, senaTransactions, onChangeMode, onChangeSearch, onEdit, onNew }) {
    const modeButton = (id, label) => (
        <button
            type="button"
            key={id}
            onClick={() => onChangeMode(id)}
            className={`h-9 rounded-none border-b-2 px-2 text-sm font-black transition ${
                senaMode === id
                    ? 'border-crm-red text-crm-red'
                    : 'border-transparent text-crm-fg-muted hover:text-crm-fg'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SenaTotalCard label="Total Recibido" usd={senaTotals.received.USD} ars={senaTotals.received.ARS} />
                <SenaTotalCard label="Total Aplicado" usd={senaTotals.applied.USD} ars={senaTotals.applied.ARS} />
                <SenaTotalCard label="Señas Activas" value={senaTransactions.length} />
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="mb-4 flex flex-wrap items-center gap-4">
                    {[
                        ['todos', 'Todos'],
                        ['recibida', 'Recibida'],
                        ['aplicada', 'Aplicada'],
                        ['devuelta', 'Devuelta']
                    ].map(([id, label]) => modeButton(id, label))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                        <input
                            value={senaSearch}
                            onChange={(event) => onChangeSearch(event.target.value)}
                            placeholder="Buscar vehículo, cliente, notas…"
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onNew}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red"
                    >
                        <Plus size={15} />
                        Nueva seña
                    </button>
                </div>
            </section>

            <section className="space-y-3">
                {senaTransactions.length > 0 ? (
                    senaTransactions.map((tx) => (
                        <MovementRow key={tx._id} tx={tx} onEdit={onEdit} />
                    ))
                ) : (
                    <EmptyPanel icon={<Wallet size={34} />} title="Aún no hay señas" copy="Cargá la primera seña con el botón Nueva seña." />
                )}
            </section>

            <p className="text-xs font-medium text-crm-fg-subtle">
                {senaTransactions.length} de {senaTransactions.length} señas. Click en Editar para abrir el formulario. Recibida/Devuelta crean un movimiento en Finanzas; Aplicada no toca caja.
            </p>
        </div>
    );
}

function FinanceTabPlaceholder({ tab, balances, metrics, onNew }) {
    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                <h2 className="text-lg font-black text-crm-fg">{tab?.icon} {tab?.label}</h2>
                <p className="mt-2 text-sm font-medium text-crm-fg-muted">
                    Vista financiera preparada con el mismo patrón de Sote. Usa los movimientos actuales de AutoSporting sin modificar la lógica de caja.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <MetricBlock label="Caja ARS" value={formatMoney(balances.ARS, 'ARS')} compact />
                    <MetricBlock label="Caja USD" value={formatMoney(balances.USD, 'USD')} compact />
                    <MetricBlock label="Ingresos USD" value={formatMoney(metrics.USD.income, 'USD')} tone="success" compact />
                    <MetricBlock label="Egresos USD" value={formatMoney(metrics.USD.expense, 'USD')} tone="danger" compact />
                </div>
            </section>

            <section className="rounded-2xl border border-dashed border-crm-border bg-crm-surface p-8">
                <EmptyPanel
                    icon={<CalendarDays size={34} />}
                    title="Sin registros específicos"
                    copy="Esta subvista queda lista visualmente; los datos se cargarán cuando exista información vinculada a este módulo."
                />
                <div className="mt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={onNew}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red"
                    >
                        <Plus size={15} />
                        Registrar movimiento
                    </button>
                </div>
            </section>
        </div>
    );
}

function MovementRow({ tx, onEdit }) {
    const income = isIncome(tx);
    const sign = income ? '+' : '−';
    const color = tx.status === 'anulado' ? 'text-crm-fg-subtle line-through' : income ? 'text-crm-success' : 'text-crm-red';

    return (
        <article className="grid grid-cols-1 gap-3 rounded-xl border border-crm-border bg-crm-surface p-4 transition hover:bg-crm-surface-raised md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
                <h3 className="text-sm font-black text-crm-fg">{tx.concept || tx.description || 'Movimiento sin concepto'}</h3>
                <p className="mt-1 text-xs font-medium text-crm-fg-muted">
                    {(tx.category || 'Sin categoría')} · {(tx.paymentMethod || 'Sin método')} · {formatDate(tx.date || tx.createdAt)}
                </p>
            </div>
            <div className="md:text-right">
                <p className={`text-sm font-black ${color}`}>{sign}{formatMoney(tx.amount, tx.currency)}</p>
                <span className="text-xs font-bold uppercase tracking-wider text-crm-fg-subtle">{tx.status || 'activo'}</span>
            </div>
            <button
                type="button"
                onClick={() => onEdit(tx)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs font-black text-crm-fg transition hover:border-crm-red hover:text-crm-red"
            >
                Editar
                <ChevronDown size={14} />
            </button>
        </article>
    );
}

function MetricBlock({ label, value, subValue, tone = 'default', compact = false }) {
    const toneClass = tone === 'success' ? 'text-crm-success' : tone === 'danger' ? 'text-crm-red' : 'text-crm-fg';

    return (
        <div className={`rounded-xl border border-crm-border bg-crm-bg ${compact ? 'p-3' : 'p-4'}`}>
            <p className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">{label}</p>
            <p className={`mt-2 text-xl font-black ${toneClass}`}>{value}</p>
            {subValue && <p className="mt-1 text-xs font-bold text-crm-fg-muted">{subValue}</p>}
        </div>
    );
}

function AccountButton({ name, detail, value, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center justify-between gap-3 rounded-xl border border-crm-border bg-crm-bg p-4 text-left transition hover:border-crm-red hover:bg-crm-surface-raised"
        >
            <span>
                <span className="block text-sm font-black text-crm-fg">{name}</span>
                <span className="mt-1 block text-xs font-bold text-crm-fg-muted">{detail}</span>
            </span>
            <span className="text-right">
                <span className="block text-sm font-black text-crm-fg">{value}</span>
                <span className="text-crm-red">→</span>
            </span>
        </button>
    );
}

function DebtStatus({ title, value, copy, caption, tone }) {
    const toneClass = tone === 'danger' ? 'text-crm-red' : tone === 'warning' ? 'text-crm-warning' : 'text-crm-success';

    return (
        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
            <p className="text-sm font-black text-crm-fg-muted">{title}</p>
            <div className="mt-3 flex items-end gap-2">
                <span className={`text-3xl font-black ${toneClass}`}>{value}</span>
                <span className="pb-1 text-sm font-bold text-crm-fg-muted">{copy}</span>
            </div>
            <p className="mt-2 text-xs font-medium text-crm-fg-subtle">{caption}</p>
        </div>
    );
}

function ChartBar({ label, value, max, color }) {
    const width = Math.max(4, Math.min(100, (Number(value || 0) / max) * 100));

    return (
        <div>
            <div className="mb-2 flex justify-between gap-3 text-xs font-bold text-crm-fg-muted">
                <span>{label}</span>
                <span>{formatMoney(value, 'USD')}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-crm-bg">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
        </div>
    );
}

function SelectLike({ value, onChange, children }) {
    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 rounded-xl border border-crm-border bg-crm-bg px-3 text-sm font-bold text-crm-fg outline-none transition focus:border-crm-red"
        >
            {children}
        </select>
    );
}

function SenaTotalCard({ label, usd, ars, value }) {
    return (
        <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
            <p className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">{label}</p>
            {value !== undefined ? (
                <p className="mt-3 text-3xl font-black text-crm-fg">{value}</p>
            ) : (
                <>
                    <p className="mt-3 text-xl font-black text-crm-fg">{formatMoney(usd, 'USD')}</p>
                    <p className="mt-1 text-sm font-bold text-crm-fg-muted">{formatMoney(ars, 'ARS')}</p>
                </>
            )}
        </div>
    );
}

function EmptyPanel({ icon, title, copy }) {
    return (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-crm-border bg-crm-surface p-8 text-center">
            <div className="mb-3 text-crm-fg-subtle">{icon}</div>
            <h3 className="text-base font-black text-crm-fg">{title}</h3>
            <p className="mt-2 max-w-md text-sm font-medium text-crm-fg-muted">{copy}</p>
        </div>
    );
}

export default FinanzasPage;
