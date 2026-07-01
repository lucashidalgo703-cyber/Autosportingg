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
import { useAdminAccounts } from '../../../hooks/useAdminAccounts';
import TransactionModal from '../../../components/crm/finance/TransactionModal';
import TransferModal from '../../../components/crm/finance/TransferModal';
import MonthlyCloseModal from '../../../components/crm/finance/MonthlyCloseModal';
import ConfirmModal from '../../../components/crm/ui/ConfirmModal';
import PersonalFinanceTab from '../../../components/crm/finance/PersonalFinanceTab';
import CuotasFinancieras from '../../../components/crm/finance/CuotasFinancieras';
import PermissionGuard from '../../../components/crm/layout/PermissionGuard';
import { PERMISSIONS } from '../../../utils/adminPermissions';
import { useAdminInstallments } from '../../../hooks/useAdminInstallments';
import CrmPageHeader from '../../../components/crm/ui/CrmPageHeader';
import InstallmentModal from '../../../components/crm/installments/InstallmentModal';
import PayInstallmentModal from '../../../components/crm/installments/PayInstallmentModal';
import toast from 'react-hot-toast';
import PagosDisponiblesTab from '../../../components/crm/finance/tabs/PagosDisponiblesTab';
import TarjetaTab from '../../../components/crm/finance/tabs/TarjetaTab';
import RetirosTab from '../../../components/crm/finance/tabs/RetirosTab';
import ComisionesTab from '../../../components/crm/finance/tabs/ComisionesTab';
import RentabilidadTab from '../../../components/crm/finance/tabs/RentabilidadTab';
import CuentasTab from '../../../components/crm/finance/tabs/CuentasTab';
import XCobrarPagarTab from '../../../components/crm/finance/tabs/XCobrarPagarTab';
import ChequesTab from '../../../components/crm/finance/tabs/ChequesTab';
import PrestamosTab from '../../../components/crm/finance/tabs/PrestamosTab';
import PresupuestoTab from '../../../components/crm/finance/tabs/PresupuestoTab';
import RecurrenciasTab from '../../../components/crm/finance/tabs/RecurrenciasTab';
import ArqueosTab from '../../../components/crm/finance/tabs/ArqueosTab';
import CierreCajaTab from '../../../components/crm/finance/tabs/CierreCajaTab';
import ConciliacionTab from '../../../components/crm/finance/tabs/ConciliacionTab';
import AfipIvaTab from '../../../components/crm/finance/tabs/AfipIvaTab';
import PagoEmpresasTab from '../../../components/crm/finance/tabs/PagoEmpresasTab';


const FINANCE_TABS = [
    { id: 'resumen', icon: '📊', label: 'Resumen' },
    { id: 'movimientos', icon: '🧾', label: 'Movimientos' },
    { id: 'senas', icon: '🤝', label: 'Señas' },
    { id: 'gastos-personales', icon: '👤', label: 'Gastos Personales' },
    { id: 'cuotas', icon: '📆', label: 'Cuotas' },
    { id: 'pagos', icon: '💸', label: 'Pagos Disp.' },
    { id: 'pago-empresas', icon: '🏢', label: 'Pago Empresas' },
    { id: 'tarjeta', icon: '💳', label: 'Tarjeta' },
    { id: 'retiros', icon: '🏧', label: 'Retiros' },
    { id: 'comisiones', icon: '🪙', label: 'Comisiones' },
    { id: 'rentabilidad', icon: '📈', label: 'Rentabilidad' },
    { id: 'cuentas', icon: '🏦', label: 'Cuentas' },
    { id: 'cobrar-pagar', icon: '🔁', label: 'x Cobrar/Pagar' },
    { id: 'cheques', icon: '📄', label: 'Cheques' },
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

const EMPTY_DEPOSIT_DATA = {
    items: [],
    summary: {
        received: { ARS: 0, USD: 0 },
        applied: { ARS: 0, USD: 0 },
        returned: { ARS: 0, USD: 0 },
        activeCount: 0
    }
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
    const { fetchTransactions, createTransaction, updateTransaction, annulTransaction, bulkAnnulTransactions, transferFunds, exportTransactions, fetchMonthlyClose, loading: transactionsLoading, error: transactionsError } = useAdminTransactions();
    const { fetchInstallments, createInstallment, loading: installmentsLoading, payInstallment } = useAdminInstallments();
    const { fetchAccounts, createAccount, updateAccount, deleteAccount, recalculateBalances, loading: accountsLoading } = useAdminAccounts();
    const [allTransactions, setAllTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [installments, setInstallments] = useState([]);
    const [activeTab, setActiveTab] = useState('resumen');
    const [movementMode, setMovementMode] = useState('todos');
    const [senaMode, setSenaMode] = useState('todos');
    const [senaSearch, setSenaSearch] = useState('');
    const [financeDeposits, setFinanceDeposits] = useState(EMPTY_DEPOSIT_DATA);
    const [depositsLoading, setDepositsLoading] = useState(false);
    const [filters, setFilters] = useState(BASE_FILTERS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);
    const [modalPreset, setModalPreset] = useState(null);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isMonthlyCloseOpen, setIsMonthlyCloseOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [selectedInstallmentForPay, setSelectedInstallmentForPay] = useState(null);

    const fetchFinanceDeposits = async () => {
        const token = localStorage.getItem('token');
        if (!token) return EMPTY_DEPOSIT_DATA;

        setDepositsLoading(true);
        try {
            const response = await fetch('/api/admin/finance/deposits', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) return EMPTY_DEPOSIT_DATA;
            const data = await response.json();
            return {
                items: Array.isArray(data.items) ? data.items : [],
                summary: data.summary || EMPTY_DEPOSIT_DATA.summary
            };
        } catch (err) {
            console.error('Error loading finance deposits:', err);
            return EMPTY_DEPOSIT_DATA;
        } finally {
            setDepositsLoading(false);
        }
    };

    const handleDeleteTransaction = (tx) => {
        setConfirmAction({
            title: 'Anular Movimiento',
            message: `¿Estás seguro de anular el movimiento "${tx.concept || tx.description}" por ${tx.currency} ${tx.amount}? El saldo de la cuenta será revertido.`,
            action: async () => {
                try {
                    await annulTransaction(tx._id);
                    toast.success('Movimiento anulado exitosamente');
                    loadData();
                } catch (err) {
                    toast.error(err.message || 'Error al anular movimiento');
                }
            }
        });
        setIsConfirmOpen(true);
    };

    const handleBulkAnnul = () => {
        if (filteredTransactions.length === 0) return toast.error('No hay movimientos visibles para anular');
        const ids = filteredTransactions.map(tx => tx._id);
        setConfirmAction({
            title: 'Anular Todos los Movimientos Visibles',
            message: `ATENCIÓN: Estás a punto de anular ${ids.length} movimientos. Esta acción revertirá los saldos y no se puede deshacer. Para continuar, escribe "ANULAR MOVIMIENTOS" en la confirmación.`,
            action: async () => {
                try {
                    await bulkAnnulTransactions(ids, 'ANULAR MOVIMIENTOS');
                    toast.success('Movimientos anulados masivamente');
                    loadData();
                } catch (err) {
                    toast.error(err.message || 'Error en anulación masiva');
                }
            }
        });
        setIsConfirmOpen(true);
    };

    const handleTransferSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            await transferFunds(data);
            toast.success('Transferencia exitosa');
            setIsTransferOpen(false);
            loadData();
        } catch (err) {
            toast.error(err.message || 'Error al transferir');
        } finally {
            setIsSubmitting(false);
        }
    };

    const loadData = async () => {
        const [transactionsData, depositsData, installmentsData, accountsData] = await Promise.all([
            fetchTransactions(),
            fetchFinanceDeposits(),
            fetchInstallments(),
            fetchAccounts()
        ]);
        setAllTransactions(transactionsData || []);
        setFinanceDeposits(depositsData || EMPTY_DEPOSIT_DATA);
        setInstallments(installmentsData || []);
        setAccounts(accountsData || []);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && FINANCE_TABS.some(t => t.id === tab)) {
            setActiveTab(tab);
        }
    }, []);

    useEffect(() => {
        const url = new URL(window.location);
        if (url.searchParams.get('tab') !== activeTab) {
            url.searchParams.set('tab', activeTab);
            window.history.replaceState({}, '', url);
        }
    }, [activeTab]);

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

    const balances = useMemo(() => {
        const arsAccs = accounts.filter(a => a.currency === 'ARS' && a.isActive !== false);
        const usdAccs = accounts.filter(a => a.currency === 'USD' && a.isActive !== false);
        return {
            ARS: arsAccs.reduce((sum, a) => sum + (a.balance || 0), 0),
            USD: usdAccs.reduce((sum, a) => sum + (a.balance || 0), 0)
        };
    }, [accounts]);

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

    const senaItems = useMemo(() => {
        return (financeDeposits.items || []).filter((item) => {
            const text = `${item.vehicle || ''} ${item.client || ''} ${item.notes || ''} ${item.sourceLabel || ''}`.toLowerCase();
            if (senaSearch && !text.includes(senaSearch.toLowerCase())) return false;
            if (senaMode !== 'todos' && item.status !== senaMode) return false;
            return true;
        });
    }, [financeDeposits.items, senaMode, senaSearch]);

    const senaTotals = financeDeposits.summary || EMPTY_DEPOSIT_DATA.summary;

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

    const handleEditDeposit = (item) => {
        if (item.transactionId) {
            const tx = allTransactions.find((transaction) => String(transaction._id) === String(item.transactionId));
            if (tx) {
                handleEditTransaction(tx);
                return;
            }
        }

        if (item.saleId) {
            window.location.href = `/admin/ventas/${item.saleId}`;
            return;
        }

        if (item.reservationId) {
            setActiveTab('movimientos');
            setMovementMode('todos');
            setFilters({ ...BASE_FILTERS, linkedTo: 'reservation' });
        }
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
            <div className="mx-auto w-full max-w-7xl p-4 pb-24 md:p-8">
                <CrmPageHeader
                    title="Administración Financiera"
                    subtitle="Movimientos, saldos por caja, comisiones, presupuestos y cierres."
                    actions={
                        <>
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
                        </>
                    }
                />

                {transactionsError && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-crm-warning/20 bg-crm-warning/10 p-4 text-sm font-bold text-crm-warning">
                        <AlertTriangle size={18} />
                        {transactionsError}
                    </div>
                )}

                <div className="mb-6 overflow-x-auto border-b border-crm-border custom-scrollbar">
                    <nav aria-label="Pestañas de Finanzas" className="flex w-max min-w-full gap-1 pb-2">
                        {FINANCE_TABS.map((tab) => {
                            const active = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                                        active
                                            ? 'bg-crm-red text-white shadow-sm'
                                            : 'bg-transparent text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {transactionsLoading && allTransactions.length === 0 ? (
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
                                installments={installments}
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
                                onDelete={handleDeleteTransaction}
                                onExport={exportTransactions}
                                onMonthlyClose={() => setIsMonthlyCloseOpen(true)}
                                onTransfer={() => setIsTransferOpen(true)}
                                onBulkAnnul={handleBulkAnnul}
                                onNew={() => openTransactionModal({ type: 'ingreso', concept: '', category: '', paymentMethod: 'efectivo' })}
                                onQuickRange={handleQuickRange}
                                setMovementMode={setMovementMode}
                            />
                        )}

                        {activeTab === 'senas' && (
                            <SenasFinancieras
                                depositsLoading={depositsLoading}
                                senaItems={senaItems}
                                senaMode={senaMode}
                                senaSearch={senaSearch}
                                senaTotals={senaTotals}
                                onChangeMode={setSenaMode}
                                onChangeSearch={setSenaSearch}
                                onEdit={handleEditDeposit}
                                onNew={() => openTransactionModal({ type: 'ingreso', currency: 'USD', concept: 'Seña recibida', category: 'Seña', paymentMethod: 'efectivo', notes: '[SENA_FINANZAS]' })}
                            />
                        )}

                        {activeTab === 'gastos-personales' && (
                            <PersonalFinanceTab />
                        )}

                        {activeTab === 'cuotas' && (
                            <CuotasFinancieras 
                                installments={installments} 
                                loading={installmentsLoading} 
                                onNewInstallment={() => setIsInstallmentModalOpen(true)}
                                onGeneratePlan={() => toast('El plan automático requiere una venta seleccionada. Creá cuotas manuales desde Nueva cuota.')}
                                onPayInstallment={(item) => setSelectedInstallmentForPay(item)}
                            />
                        )}

                        {activeTab === 'pagos' && <PagosDisponiblesTab accounts={accounts} />}
                        {activeTab === 'tarjeta' && <TarjetaTab accounts={accounts} />}
                        {activeTab === 'retiros' && <RetirosTab accounts={accounts} />}
                        {activeTab === 'comisiones' && <ComisionesTab />}
                        {activeTab === 'rentabilidad' && <RentabilidadTab metrics={metrics} />}
                        {activeTab === 'cuentas' && <CuentasTab balances={balances} accounts={accounts} fetchAccounts={fetchAccounts} createAccount={createAccount} updateAccount={updateAccount} deleteAccount={deleteAccount} recalculateBalances={recalculateBalances} />}
                        {activeTab === 'cobrar-pagar' && <XCobrarPagarTab installments={installments} />}
                        {activeTab === 'cheques' && <ChequesTab accounts={accounts} />}
                        {activeTab === 'prestamos' && <PrestamosTab accounts={accounts} />}
                        {activeTab === 'presupuesto' && <PresupuestoTab />}
                        {activeTab === 'recurrencias' && <RecurrenciasTab accounts={accounts} />}
                        {activeTab === 'arqueos' && <ArqueosTab accounts={accounts} />}
                        {activeTab === 'cierre' && <CierreCajaTab />}
                        {activeTab === 'conciliacion' && <ConciliacionTab accounts={accounts} />}
                        {activeTab === 'afip' && <AfipIvaTab />}
                        {activeTab === 'pago-empresas' && (
                            <PagoEmpresasTab 
                                allTransactions={allTransactions} 
                                accounts={accounts} 
                                onCreatePayment={async (payload) => {
                                    await createTransaction(payload);
                                    toast.success('Pago a empresa registrado con éxito');
                                    await loadData();
                                }} 
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

                <TransferModal
                    isOpen={isTransferOpen}
                    onClose={() => setIsTransferOpen(false)}
                    accounts={accounts}
                    onSubmit={handleTransferSubmit}
                    isSubmitting={isSubmitting}
                />

                <MonthlyCloseModal
                    isOpen={isMonthlyCloseOpen}
                    onClose={() => setIsMonthlyCloseOpen(false)}
                    fetchMonthlyClose={fetchMonthlyClose}
                />

                <ConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    title={confirmAction?.title}
                    message={confirmAction?.message}
                    onConfirm={() => {
                        setIsConfirmOpen(false);
                        if (confirmAction?.action) confirmAction.action();
                    }}
                />

                <InstallmentModal
                    isOpen={isInstallmentModalOpen}
                    onClose={() => setIsInstallmentModalOpen(false)}
                    onSave={async (data) => {
                        try {
                            await createInstallment(data);
                            toast.success("Cuota creada");
                            setIsInstallmentModalOpen(false);
                            await loadData();
                        } catch (err) {
                            toast.error(err.message || 'Error al crear cuota');
                        }
                    }}
                    mode="create"
                    installment={{ source: 'manual' }}
                />

                <PayInstallmentModal
                    isOpen={!!selectedInstallmentForPay}
                    onClose={() => setSelectedInstallmentForPay(null)}
                    installment={selectedInstallmentForPay}
                    accounts={accounts}
                    isSubmitting={isSubmitting}
                    onPay={async (id, data) => {
                        setIsSubmitting(true);
                        try {
                            await payInstallment(id, data);
                            toast.success('Cobro registrado correctamente');
                            setSelectedInstallmentForPay(null);
                            await loadData();
                        } catch (err) {
                            toast.error(err.message || 'Error al saldar la cuota');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                />
            </div>
        </PermissionGuard>
    );
}

function ResumenFinanciero({ balances, metrics, monthlyFlow, expenseCategories, onOpenAccounts, installments = [] }) {
    const installmentStats = useMemo(() => {
        let vencidas = 0;
        let porVencer = 0;
        let enFecha = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        installments.forEach(item => {
            const status = String(item.status || '').toLowerCase();
            if (status === 'pagada' || status === 'anulada') return;

            const dueDate = new Date(item.dueDate);
            if (dueDate < today) {
                vencidas++;
            } else {
                const diffTime = Math.abs(dueDate - today);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 7) porVencer++;
                else enFecha++;
            }
        });

        return { vencidas, porVencer, enFecha };
    }, [installments]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-crm-fg">SALDO EN CUENTAS — DINERO DISPONIBLE</h2>
                            <span className="mt-1 inline-flex rounded-md bg-crm-bg px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                Sincronizado con movimientos
                            </span>
                        </div>
                        <Wallet className="text-crm-success" size={20} />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <MetricBlock label="TOTAL EN ARS" value={formatMoney(balances.ARS, 'ARS')} />
                        <MetricBlock label="TOTAL EN USD" value={formatMoney(balances.USD, 'USD')} />
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <AccountButton name="Caja ARS" detail="Efectivo · ARS" value={formatMoney(balances.ARS, 'ARS')} onClick={onOpenAccounts} />
                        <AccountButton name="Caja USD" detail="Banco · USD" value={formatMoney(balances.USD, 'USD')} onClick={onOpenAccounts} />
                    </div>
                </section>

                <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <h2 className="mb-5 text-base font-black text-crm-fg">ACTIVIDAD — MOVIMIENTOS ACUMULADOS</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <MetricBlock label="Ingresos totales" value={formatMoney(metrics.USD.income, 'USD')} subValue={formatMoney(metrics.ARS.income, 'ARS')} />
                        <MetricBlock label="Egresos totales" value={formatMoney(metrics.USD.expense, 'USD')} subValue={formatMoney(metrics.ARS.expense, 'ARS')} tone="danger" />
                        <MetricBlock label="Balance neto" value={formatMoney(balances.USD, 'USD')} subValue={formatMoney(balances.ARS, 'ARS')} tone="success" />
                    </div>
                    <p className="mt-4 text-xs font-medium text-crm-fg-subtle">Suma de saldos reales</p>
                </section>
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                <h2 className="mb-5 text-base font-black text-crm-fg">CUOTAS — ESTADO DE COBRO</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <DebtStatus title="Vencidas" value={installmentStats.vencidas} copy={installmentStats.vencidas === 0 ? "— sin atrasos" : "— revisar"} caption="Pendientes con fecha pasada" tone="danger" />
                    <DebtStatus title="Por vencer" value={installmentStats.porVencer} copy={installmentStats.porVencer === 0 ? "— tranquilo" : "— próximas"} caption="Próximos 7 días" tone="warning" />
                    <DebtStatus title="En fecha" value={installmentStats.enFecha} copy="— sin atrasos" caption="A más de 7 días — tranquilo" tone="success" />
                </div>
            </section>

            <div className="flex items-center justify-end gap-2 text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                GRÁFICOS EN:
                <button type="button" className="rounded-lg border border-crm-red bg-crm-red/10 px-3 py-1 text-crm-red">ARS</button>
                <span className="text-crm-fg-subtle">/</span>
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

function ColoredCard({ label, amount, currency, tone }) {
    const mappedClass = {
        success: 'border-crm-success/30 bg-crm-success/10',
        danger: 'border-crm-red/30 bg-crm-red/10',
        info: 'border-crm-info/30 bg-crm-info/10'
    }[tone];

    const textColor = {
        success: 'text-crm-success',
        danger: 'text-crm-red',
        info: 'text-crm-info'
    }[tone];

    return (
        <div className={`rounded-xl border p-4 ${mappedClass}`}>
            <p className="text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">{label}</p>
            <p className={`mt-2 text-lg font-black ${textColor}`}>{formatMoney(amount, currency)}</p>
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
    onDelete,
    onExport,
    onMonthlyClose,
    onTransfer,
    onBulkAnnul,
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
            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4 space-y-4">
                {/* FILA 1 */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {modeButton('todos', 'Todos')}
                        {modeButton('ingreso', 'Ingreso')}
                        {modeButton('egreso', 'Egreso')}
                        {modeButton('transferencias', '⇄ Transferencias')}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                        <input
                            value={filters.search}
                            onChange={(event) => onChangeFilters({ ...filters, search: event.target.value })}
                            placeholder="Buscar (descripción, vehículo, vendedor)"
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        />
                    </div>
                </div>

                {/* FILA 2 */}
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4">
                    <button type="button" onClick={onBulkAnnul} className="inline-flex h-9 items-center px-3 rounded-lg border border-crm-red text-crm-red text-xs font-bold hover:bg-crm-red/10 transition">Borrar todos ({filteredTransactions.length})</button>
                    <button type="button" onClick={onMonthlyClose} className="inline-flex h-9 items-center px-3 rounded-lg border border-crm-border bg-crm-bg text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition">Cierres mensuales</button>
                    <button type="button" onClick={onTransfer} className="inline-flex h-9 items-center px-3 rounded-lg border border-crm-border bg-crm-bg text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition">Transferencia</button>
                    <button type="button" onClick={onExport} className="inline-flex h-9 items-center px-3 rounded-lg border border-crm-border bg-crm-bg text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition">Exportar CSV</button>
                    <button type="button" onClick={onNew} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-crm-red text-white px-4 text-xs font-black shadow-crm-shadow-red hover:opacity-95 transition ml-auto">
                        <Plus size={14} /> Registrar
                    </button>
                </div>

                {/* FILA 3 */}
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4">
                    <span className="text-xs font-black text-crm-fg-muted mr-2">📅 RANGO:</span>
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
                            className="rounded-lg bg-crm-bg px-3 py-1.5 text-xs font-bold text-crm-fg-muted transition hover:text-crm-fg"
                        >
                            {label}
                        </button>
                    ))}
                    
                    <div className="flex items-center gap-2 ml-2">
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(event) => onChangeFilters({ ...filters, startDate: event.target.value })}
                            className="h-8 rounded-lg border border-crm-border bg-crm-bg px-2 text-xs font-bold text-crm-fg outline-none focus:border-crm-red"
                        />
                        <span className="text-crm-fg-subtle">-</span>
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(event) => onChangeFilters({ ...filters, endDate: event.target.value })}
                            className="h-8 rounded-lg border border-crm-border bg-crm-bg px-2 text-xs font-bold text-crm-fg outline-none focus:border-crm-red"
                        />
                    </div>
                    
                    <span className="ml-auto text-xs font-black text-crm-fg-muted">
                        {filteredTransactions.length} movimientos
                    </span>
                </div>

                {/* FILA 4 */}
                <div className="flex flex-wrap items-center gap-3 border-t border-crm-border pt-4">
                    <span className="text-xs font-black text-crm-fg-muted">💼 CAJA:</span>
                    <SelectLike value={filters.currency} onChange={(value) => onChangeFilters({ ...filters, currency: value })}>
                        <option value="todas">Todas las cajas</option>
                        <option value="ARS">Caja ARS — {formatMoney(metrics.ARS.income - metrics.ARS.expense, 'ARS')}</option>
                        <option value="USD">Caja USD — {formatMoney(metrics.USD.income - metrics.USD.expense, 'USD')}</option>
                    </SelectLike>
                </div>
            </section>

            {/* TABLA HTML CLASICA */}
            <section className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead className="bg-crm-surface-raised border-b border-crm-border">
                            <tr>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Fecha</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Descripción</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Categoría</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Caja</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted">Tipo</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-right">Monto</th>
                                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-crm-fg-muted text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-crm-border">
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => {
                                    const income = isIncome(tx);
                                    const isVoid = tx.status === 'anulado';
                                    const sign = income ? '+' : '−';
                                    
                                    return (
                                        <tr key={tx._id} className="hover:bg-crm-surface-raised transition">
                                            <td className="px-4 py-3 text-xs font-medium text-crm-fg-muted">{formatDate(tx.date || tx.createdAt)}</td>
                                            <td className={`px-4 py-3 text-xs font-black ${isVoid ? 'text-crm-fg-subtle line-through' : 'text-white'}`}>
                                                {tx.concept || tx.description || 'Sin descripción'}
                                                {tx.notes && <span className="block text-[10px] font-medium text-crm-fg-subtle mt-0.5">{tx.notes}</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-crm-fg-muted">{tx.category || '-'}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-crm-fg-muted">{tx.currency || 'ARS'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                                    income ? 'border-crm-success/20 bg-crm-success/10 text-crm-success' : 'border-crm-red/20 bg-crm-red/10 text-crm-red'
                                                }`}>
                                                    {income ? 'Ingreso' : 'Egreso'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-xs font-black text-right ${isVoid ? 'text-crm-fg-subtle line-through' : income ? 'text-crm-success' : 'text-crm-red'}`}>
                                                {sign} {formatMoney(tx.amount, tx.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => onEdit(tx)} className="text-[11px] font-bold text-crm-fg-muted hover:text-crm-red transition">Editar</button>
                                                    {!isVoid && (
                                                        <button onClick={() => onDelete(tx)} className="text-[11px] font-bold text-crm-fg-muted hover:text-crm-red transition">Anular</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center">
                                        <EmptyPanel icon={<FileText size={34} />} title="Sin movimientos" copy="No hay resultados para los filtros seleccionados." />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* CARDS INFERIORES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <ColoredCard label="Ingresos USD" amount={summary.USD.income} currency="USD" tone="success" />
                <ColoredCard label="Egresos USD" amount={summary.USD.expense} currency="USD" tone="danger" />
                <ColoredCard label="Neto USD" amount={summary.USD.income - summary.USD.expense} currency="USD" tone="info" />
                
                <ColoredCard label="Ingresos ARS" amount={summary.ARS.income} currency="ARS" tone="success" />
                <ColoredCard label="Egresos ARS" amount={summary.ARS.expense} currency="ARS" tone="danger" />
                <ColoredCard label="Neto ARS" amount={summary.ARS.income - summary.ARS.expense} currency="ARS" tone="info" />
            </div>

            <p className="text-xs font-medium text-crm-fg-subtle text-center md:text-left mt-2">
                {filteredTransactions.length} de {filteredTransactions.length} movimientos. Click en Editar para abrir el formulario.
            </p>
        </div>
    );
}

function SenasFinancieras({ depositsLoading, senaItems, senaMode, senaSearch, senaTotals, onChangeMode, onChangeSearch, onEdit, onNew }) {
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SenaTotalCard label="Total Recibido" usd={senaTotals.received.USD} ars={senaTotals.received.ARS} />
                <SenaTotalCard label="Total Aplicado" usd={senaTotals.applied.USD} ars={senaTotals.applied.ARS} />
                <SenaTotalCard label="Señas Activas" value={senaTotals.activeCount || 0} />
            </div>

            <section className="rounded-2xl border border-crm-border bg-crm-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-1">
                        {['todos', 'recibida', 'aplicada', 'devuelta'].map(id => modeButton(id, id === 'todos' ? 'Todos' : id.charAt(0).toUpperCase() + id.slice(1)))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-crm-fg-subtle" size={16} />
                        <input
                            value={senaSearch}
                            onChange={(event) => onChangeSearch(event.target.value)}
                            placeholder="Buscar vehículo, cliente, notas…"
                            className="h-10 w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-3 text-sm font-medium text-crm-fg outline-none transition focus:border-crm-red"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-crm-border pt-4 mt-4">
                    <button
                        type="button"
                        onClick={onNew}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-crm-red-gradient px-4 text-xs font-black text-white shadow-crm-shadow-red ml-auto transition hover:opacity-95"
                    >
                        <Plus size={14} />
                        Nueva seña
                    </button>
                </div>
            </section>

            <section className="space-y-3">
                {depositsLoading ? (
                    <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
                    </div>
                ) : senaItems.length > 0 ? (
                    senaItems.map((item) => (
                        <SenaRow key={item.id} item={item} onEdit={onEdit} />
                    ))
                ) : (
                    <EmptyPanel icon={<Wallet size={34} />} title="Aún no hay señas" copy="Cargá la primera seña con el botón Nueva seña." />
                )}
            </section>

            <p className="text-xs font-medium text-crm-fg-subtle">
                {senaItems.length} de {senaItems.length} señas. Click en Editar para abrir el formulario. Recibida/Devuelta crean un movimiento en Finanzas; Aplicada no toca caja.
            </p>
        </div>
    );
}

function SenaRow({ item, onEdit }) {
    const statusConfig = {
        recibida: 'border-crm-success/20 bg-crm-success/10 text-crm-success',
        aplicada: 'border-crm-info/20 bg-crm-info/10 text-crm-info',
        devuelta: 'border-crm-red/20 bg-crm-red/10 text-crm-red'
    };
    const statusLabel = {
        recibida: 'Recibida',
        aplicada: 'Aplicada',
        devuelta: 'Devuelta'
    };

    return (
        <article className="grid grid-cols-1 gap-3 rounded-xl border border-crm-border bg-crm-surface p-4 transition hover:bg-crm-surface-raised md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg border px-2 py-1 text-[11px] font-black uppercase tracking-wider ${statusConfig[item.status] || statusConfig.recibida}`}>
                        {statusLabel[item.status] || item.status}
                    </span>
                    <span className="rounded-lg bg-crm-bg px-2 py-1 text-[11px] font-black uppercase tracking-wider text-crm-fg-muted">
                        {item.sourceLabel || 'Origen'}
                    </span>
                </div>
                <h3 className="text-sm font-black text-crm-fg">{item.vehicle || 'Sin vehículo'}</h3>
                <p className="mt-1 text-xs font-medium text-crm-fg-muted">
                    {item.client || 'Sin cliente'} · {item.method || 'sin método'} · {formatDate(item.date)}
                </p>
                {item.notes && <p className="mt-2 line-clamp-2 text-xs text-crm-fg-subtle">{item.notes}</p>}
            </div>
            <div className="md:text-right">
                <p className="text-base font-black text-crm-fg">{formatMoney(item.amount, item.currency)}</p>
                <span className="text-xs font-bold uppercase tracking-wider text-crm-fg-subtle">{item.currency}</span>
            </div>
            <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-crm-border bg-crm-bg px-3 text-xs font-black text-crm-fg transition hover:border-crm-red hover:text-crm-red"
            >
                {item.transactionId ? 'Editar' : 'Ver origen'}
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
        <div className="rounded-xl border border-crm-border bg-crm-bg p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-crm-fg-subtle">{label}</p>
            {value !== undefined ? (
                <p className="mt-2 text-xl font-black text-crm-fg">{value}</p>
            ) : (
                <>
                    <p className="mt-2 text-xl font-black text-crm-fg">{formatMoney(usd, 'USD')}</p>
                    <p className="mt-1 text-xs font-bold text-crm-fg-muted">{formatMoney(ars, 'ARS')}</p>
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
