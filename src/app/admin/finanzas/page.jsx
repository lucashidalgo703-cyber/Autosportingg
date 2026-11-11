"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ChevronDown,
    Plus,
    ReceiptText,
    Search,
    Wallet
} from 'lucide-react';
import { useAdminTransactions } from '../../../hooks/useAdminTransactions';
import { useAdminAccounts } from '../../../hooks/useAdminAccounts';
import TransactionModal from '../../../components/crm/finance/TransactionModal';
import TransferModal from '../../../components/crm/finance/TransferModal';
import MonthlyCloseModal from '../../../components/crm/finance/MonthlyCloseModal';
import ExpenseQuotaAssignmentModal from '../../../components/crm/finance/modals/ExpenseQuotaAssignmentModal';
import FinanceNavigation from '../../../components/crm/finance/FinanceNavigation';
import FinanceOverview from '../../../components/crm/finance/FinanceOverview';
import FinanceMovements from '../../../components/crm/finance/FinanceMovements';
import { financeDateInputValue, filterFinanceTransactions } from '../../../utils/financePresentation';
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
import SueldosTab from '../../../components/crm/finance/tabs/SueldosTab';
import TallerTab from '../../../components/crm/finance/tabs/TallerTab';
import ResumenGastosTab from '../../../components/crm/finance/tabs/ResumenGastosTab';


const FINANCE_TABS = [
    { id: 'resumen', icon: '📊', label: 'Resumen' },
    { id: 'movimientos', icon: '🧾', label: 'Movimientos' },
    { id: 'resumen-gastos', icon: '📉', label: 'Resumen Gastos' },
    { id: 'senas', icon: '🤝', label: 'Señas' },
    { id: 'gastos-personales', icon: '👤', label: 'Gastos Personales' },
    { id: 'sueldos', icon: '🧑‍💼', label: 'Sueldos' },
    { id: 'taller', icon: '🔧', label: 'Taller / Mecánico' },
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

const dateInputValue = financeDateInputValue;

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
    const [assignModalExpense, setAssignModalExpense] = useState(null);
    const [isMonthlyCloseOpen, setIsMonthlyCloseOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
    const [selectedInstallmentForPay, setSelectedInstallmentForPay] = useState(null);
    const [installmentFilter, setInstallmentFilter] = useState('Todos');

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
            if (tx.status === 'anulado' || tx.status === 'pendiente') return acc;
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

    const filteredTransactions = useMemo(() => filterFinanceTransactions(allTransactions, filters, movementMode), [allTransactions, filters, movementMode]);

    const senaItems = useMemo(() => {
        return (financeDeposits.items || []).filter((item) => {
            const text = `${item.vehicle || ''} ${item.client || ''} ${item.notes || ''} ${item.sourceLabel || ''}`.toLowerCase();
            if (senaSearch && !text.includes(senaSearch.toLowerCase())) return false;
            if (senaMode !== 'todos' && item.status !== senaMode) return false;
            return true;
        });
    }, [financeDeposits.items, senaMode, senaSearch]);

    const senaTotals = financeDeposits.summary || EMPTY_DEPOSIT_DATA.summary;

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
            let saved;
            if (selectedTx) {
                saved = await updateTransaction(selectedTx._id, data);
                toast.success('Movimiento actualizado correctamente');
            } else {
                saved = await createTransaction(data);
                toast.success('Movimiento registrado correctamente');
            }
            await loadData();
            closeModal();
            return saved;
        } catch (err) {
            console.error(err.message);
            toast.error(err.message || 'Error al registrar el movimiento');
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
            <div className="mx-auto w-full max-w-[1680px] min-w-0 space-y-4 p-3 pb-24 sm:p-4 xl:p-5 2xl:p-6">
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
                                onClick={() => openTransactionModal({ type: 'egreso', concept: 'Comisión', category: 'Comisiones', paymentMethod: 'transferencia', isCommission: true })}
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-crm-red-gradient px-4 text-sm font-black text-white shadow-crm-shadow-red transition hover:opacity-95"
                            >
                                <Plus size={16} />
                                Nueva Comisión
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

                <FinanceNavigation tabs={FINANCE_TABS} activeTab={activeTab} onTabChange={setActiveTab}/>

                {transactionsLoading && allTransactions.length === 0 ? (
                    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-crm-border bg-crm-surface">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-t-crm-red" />
                    </div>
                ) : (
                    <>
                        <div hidden={activeTab !== 'resumen'}>
                            <FinanceOverview
                                balances={balances}
                                metrics={metrics}
                                transactions={allTransactions}
                                installments={installments}
                                onOpenAccounts={() => setActiveTab('cuentas')}
                                onOpenMovements={() => setActiveTab('movimientos')}
                                onOpenInstallments={(filter = 'Todos') => { setInstallmentFilter(filter); setActiveTab('cuotas'); }}
                            />
                        </div>

                        {activeTab === 'movimientos' && (
                            <FinanceMovements
                                filteredTransactions={filteredTransactions}
                                totalCount={allTransactions.length}
                                filters={filters}
                                movementMode={movementMode}
                                onChangeFilters={setFilters}
                                onClearFilters={handleClearFilters}
                                onEdit={handleEditTransaction}
                                onDelete={handleDeleteTransaction}
                                onAssignQuota={(tx) => setAssignModalExpense(tx)}
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
                                filterState={installmentFilter}
                                onFilterChange={setInstallmentFilter}
                                loading={installmentsLoading} 
                                onNewInstallment={() => setIsInstallmentModalOpen(true)}
                                onGeneratePlan={() => toast('El plan automático requiere una venta seleccionada. Creá cuotas manuales desde Nueva cuota.')}
                                onPayInstallment={(item) => setSelectedInstallmentForPay(item)}
                            />
                        )}

                        {activeTab === 'pagos' && <PagosDisponiblesTab accounts={accounts} />}
                        {activeTab === 'tarjeta' && <TarjetaTab accounts={accounts} />}
                        {activeTab === 'retiros' && <RetirosTab accounts={accounts} />}
                        {activeTab === 'comisiones' && <ComisionesTab allTransactions={allTransactions} openTransactionModal={openTransactionModal} handleEditTransaction={handleEditTransaction} />}
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
                        {activeTab === 'sueldos' && (
                            <SueldosTab
                                allTransactions={allTransactions}
                                onNew={() => openTransactionModal({ type: 'egreso', category: 'Sueldos', concept: 'Sueldo' })}
                                onEdit={handleEditTransaction}
                                onDelete={handleDeleteTransaction}
                            />
                        )}
                        {activeTab === 'taller' && (
                            <TallerTab
                                allTransactions={allTransactions}
                                onNew={() => openTransactionModal({ type: 'egreso', category: 'Taller', concept: 'Gasto de Taller / Mecánico' })}
                                onEdit={handleEditTransaction}
                                onDelete={handleDeleteTransaction}
                            />
                        )}
                        {activeTab === 'resumen-gastos' && (
                            <ResumenGastosTab
                                allTransactions={allTransactions}
                                onNew={() => openTransactionModal({ type: 'egreso', concept: '', category: '', paymentMethod: 'efectivo' })}
                                onEdit={handleEditTransaction}
                                onDelete={handleDeleteTransaction}
                            />
                        )}
                        {activeTab === 'pago-empresas' && (
                            <PagoEmpresasTab 
                                allTransactions={allTransactions} 
                                accounts={accounts} 
                                onCreatePayment={async (payload) => {
                                    await createTransaction(payload);
                                    toast.success('Pago a empresa registrado con éxito');
                                    await loadData();
                                }} 
                                onEdit={handleEditTransaction}
                                onDelete={handleDeleteTransaction}
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

                <ExpenseQuotaAssignmentModal
                    isOpen={!!assignModalExpense}
                    onClose={() => setAssignModalExpense(null)}
                    expense={assignModalExpense}
                    onUpdated={loadData}
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
