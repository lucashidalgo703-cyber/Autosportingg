"use client";
import React, { useState, useEffect } from 'react';
import CrmCard from '../ui/CrmCard';
import { 
    Edit, DollarSign, CheckCircle2, Clock, AlertTriangle, X, 
    RefreshCw, History, Calendar, FileText, Link2, Eye, 
    AlertCircle, Info, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { hasPermission, PERMISSIONS } from '../../../utils/adminPermissions';
import { getCarPurchasePaymentSummary, LOADED_COMPANIES } from '../../../utils/carPurchasePayment';

export default function VehicleFinancialSummary({ vehicle, onEdit, onPaymentSaved }) {
    const { user } = useAuth();
    const canRegisterPayment = hasPermission(user, PERMISSIONS.STOCK_WRITE) || hasPermission(user, PERMISSIONS.CAJA_WRITE);

    // Modales
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);
    const [isLinkExpenseModalOpen, setIsLinkExpenseModalOpen] = useState(false);

    // Datos y listas
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [companies, setCompanies] = useState(LOADED_COMPANIES);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Egresos para vinculación
    const [linkableExpenses, setLinkableExpenses] = useState([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [expenseSearch, setExpenseSearch] = useState('');
    const [selectedExpenseId, setSelectedExpenseId] = useState('');
    const [linkReason, setLinkReason] = useState('');
    const [linkNotes, setLinkNotes] = useState('');

    // Tabs del modal de historial
    const [historyTab, setHistoryTab] = useState('pagos'); // 'pagos' | 'compromiso'

    // Resumen robusto y cálculo unificado del pago de compra
    const paymentSummary = getCarPurchasePaymentSummary(vehicle) || {};
    const {
        isAgencyOwned,
        isHistorical,
        isSharedInvestment,
        partnerCompany,
        partnerPercentage = 50,
        agencyPercentage = 50,
        agencyCost = 0,
        partnerContribution = 0,
        status: paymentStatus,
        totalCost = 0,
        amountPaid = 0,
        pendingDebt = 0,
        currency = 'USD',
        expectedDate,
        expectedFundsNote,
        commitNotes,
        commitAuditLog = [],
        payments = []
    } = paymentSummary;

    // Formulario de Pago de Compra
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        accountId: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Transferencia bancaria',
        reference: '',
        receiptUrl: '',
        concept: '',
        deductFromStrategicBox: true,
        strategicBoxKey: 'stock',
        notes: '',
        payeeCompany: '',
        isSharedInvestment: false,
        partnerCompany: 'LHIVER',
        partnerPercentage: 50
    });

    const [strategicFundsSummary, setStrategicFundsSummary] = useState({
        boxes: [],
        unallocatedARS: 0,
        unallocatedUSD: 0
    });
    const [loadingStrategicFunds, setLoadingStrategicFunds] = useState(false);

    // Formulario de Edición de Compromiso
    const [commitmentForm, setCommitmentForm] = useState({
        expectedDate: '',
        expectedFundsNote: '',
        commitNotes: '',
        reason: '',
        isSharedInvestment: false,
        partnerCompany: 'LHIVER',
        partnerPercentage: 50
    });

    // Cargar cuentas físicas cuando se abre el modal de pago
    useEffect(() => {
        if (isPaymentModalOpen && accounts.length === 0 && !loadingAccounts) {
            setLoadingAccounts(true);
            const token = localStorage.getItem('token');
            fetch('/api/admin/accounts', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    const list = Array.isArray(data) ? data : (data.accounts || []);
                    const filtered = list.filter(a => a.isActive !== false);
                    setAccounts(filtered);
                    if (filtered.length > 0) {
                        setPaymentForm(prev => ({ ...prev, accountId: filtered[0]._id }));
                    }
                })
                .catch(err => console.error('Error cargando cuentas:', err))
                .finally(() => setLoadingAccounts(false));
        }
    }, [isPaymentModalOpen, accounts.length, loadingAccounts]);

    // Cargar cajas estratégicas y dinero sin asignar cuando se abre el modal de pago
    useEffect(() => {
        if (isPaymentModalOpen) {
            setLoadingStrategicFunds(true);
            const token = localStorage.getItem('token');
            fetch('/api/admin/treasury/boxes-summary', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data && data.ok) {
                        setStrategicFundsSummary({
                            boxes: data.boxes || [],
                            unallocatedARS: data.unallocatedARS || 0,
                            unallocatedUSD: data.unallocatedUSD || 0
                        });
                    }
                })
                .catch(err => console.error('Error cargando cajas estratégicas:', err))
                .finally(() => setLoadingStrategicFunds(false));
        }
    }, [isPaymentModalOpen]);

    // Cargar egresos cuando se abre el modal de vincular egreso
    useEffect(() => {
        if (isLinkExpenseModalOpen) {
            setLoadingExpenses(true);
            const token = localStorage.getItem('token');
            const url = `/api/admin/cars/${vehicle.id}/linkable-expenses${expenseSearch ? `?search=${encodeURIComponent(expenseSearch)}` : ''}`;
            fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.ok ? res.json() : { transactions: [] })
                .then(data => {
                    setLinkableExpenses(data.transactions || []);
                })
                .catch(err => console.error('Error cargando egresos:', err))
                .finally(() => setLoadingExpenses(false));
        }
    }, [isLinkExpenseModalOpen, expenseSearch, vehicle?.id]);

    // Cargar empresas cargadas en el sistema
    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/admin/companies', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
            .then(res => res.ok ? res.json() : { companies: LOADED_COMPANIES })
            .then(data => {
                if (Array.isArray(data.companies) && data.companies.length > 0) {
                    setCompanies(data.companies);
                }
            })
            .catch(() => setCompanies(LOADED_COMPANIES));
    }, []);

    // Apertura modal Registrar Pago
    const handleOpenPaymentModal = () => {
        if (!canRegisterPayment) {
            toast.error('No tenés permisos para registrar pagos de compra.');
            return;
        }

        const initialIsShared = Boolean(isSharedInvestment || (vehicle?.investor && Number(vehicle.investor.percentage) > 0) || vehicle?.origen === 'compartido');
        const initialPartnerCompany = partnerCompany || vehicle?.investor?.name || 'LHIVER';
        const initialPartnerPct = partnerPercentage || vehicle?.investor?.percentage || 50;
        const initialAgencyPct = initialIsShared ? Math.max(0, 100 - initialPartnerPct) : 100;
        const initialAgencyCost = initialIsShared ? Math.round(totalCost * (initialAgencyPct / 100)) : totalCost;
        const initialPending = Math.max(0, initialAgencyCost - amountPaid);

        setPaymentForm({
            amount: String(initialPending > 0 ? initialPending : (pendingDebt > 0 ? pendingDebt : (isHistorical && totalCost > 0 ? totalCost : ''))),
            accountId: accounts[0]?._id || '',
            effectiveDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'Transferencia bancaria',
            reference: '',
            receiptUrl: '',
            concept: `Pago compra vehículo: ${vehicle.marca} ${vehicle.modelo} (${vehicle.dominio})`,
            deductFromStrategicBox: true,
            strategicBoxKey: 'stock',
            notes: '',
            payeeCompany: initialPartnerCompany && LOADED_COMPANIES.includes(initialPartnerCompany) ? initialPartnerCompany : '',
            isSharedInvestment: initialIsShared,
            partnerCompany: initialPartnerCompany,
            partnerPercentage: initialPartnerPct
        });
        setIsPaymentModalOpen(true);
    };

    // Apertura modal Editar Compromiso
    const handleOpenCommitmentModal = () => {
        if (!canRegisterPayment) {
            toast.error('No tenés permisos para modificar compromisos de compra.');
            return;
        }
        setCommitmentForm({
            expectedDate: expectedDate ? new Date(expectedDate).toISOString().split('T')[0] : '',
            expectedFundsNote: expectedFundsNote || '',
            commitNotes: commitNotes || '',
            reason: '',
            isSharedInvestment: Boolean(isSharedInvestment || (vehicle?.investor && Number(vehicle.investor.percentage) > 0)),
            partnerCompany: partnerCompany || vehicle?.investor?.name || 'LHIVER',
            partnerPercentage: partnerPercentage || vehicle?.investor?.percentage || 50
        });
        setIsCommitmentModalOpen(true);
    };

    // Apertura modal Vincular Egreso Existente
    const handleOpenLinkExpenseModal = () => {
        if (!canRegisterPayment) {
            toast.error('No tenés permisos para vincular egresos contables.');
            return;
        }
        setSelectedExpenseId('');
        setLinkReason('');
        setLinkNotes('');
        setIsLinkExpenseModalOpen(true);
    };

    // Cálculos dinámicos del formulario de pago si es inversión compartida / a medias
    const formPartnerPct = paymentForm.isSharedInvestment ? Math.min(99, Math.max(1, Number(paymentForm.partnerPercentage || 50))) : 0;
    const formAgencyPct = paymentForm.isSharedInvestment ? Math.max(0, 100 - formPartnerPct) : 100;
    const formAgencyCost = paymentForm.isSharedInvestment ? Math.round(totalCost * (formAgencyPct / 100)) : totalCost;
    const formPartnerContribution = paymentForm.isSharedInvestment ? (totalCost - formAgencyCost) : 0;
    const formAgencyPending = Math.max(0, formAgencyCost - amountPaid);

    // Cuenta seleccionada actualmente y cálculo de saldos en tiempo real
    const selectedAccount = accounts.find(a => a._id === paymentForm.accountId);
    const parsedAmount = Number(paymentForm.amount) || 0;
    const accountBalance = selectedAccount ? Number(selectedAccount.balance || 0) : 0;
    const resultingBalance = accountBalance - parsedAmount;
    const hasInsufficientFunds = selectedAccount && parsedAmount > accountBalance;

    // Asignación estratégica seleccionada y cálculo de saldos en tiempo real
    const isUnallocated = paymentForm.strategicBoxKey === 'unallocated';
    const selectedBox = !isUnallocated ? (strategicFundsSummary.boxes || []).find(b => b.key === paymentForm.strategicBoxKey) : null;
    const strategicFundBalance = isUnallocated
        ? (currency === 'USD' ? (strategicFundsSummary.unallocatedUSD || 0) : (strategicFundsSummary.unallocatedARS || 0))
        : (currency === 'USD' ? (selectedBox?.balanceUSD || 0) : (selectedBox?.balanceARS || 0));
    const resultingStrategicFundBalance = strategicFundBalance - parsedAmount;
    const hasInsufficientStrategicFunds = Boolean(paymentForm.strategicBoxKey && parsedAmount > strategicFundBalance);

    // Confirmar Registro de Pago Directo
    const handleConfirmPayment = async (e) => {
        e.preventDefault();
        const numAmount = Number(paymentForm.amount);
        if (!numAmount || numAmount <= 0) {
            toast.error('Ingresá un importe válido mayor a 0');
            return;
        }
        if (!paymentForm.accountId) {
            toast.error('Seleccioná la cuenta física de origen');
            return;
        }
        if (hasInsufficientFunds) {
            toast.error(`Fondos insuficientes en la cuenta "${selectedAccount.name}". Saldo disponible: ${selectedAccount.currency} ${accountBalance.toLocaleString('es-AR')}`);
            return;
        }
        if (hasInsufficientStrategicFunds) {
            toast.error(`Fondos insuficientes en la asignación estratégica "${isUnallocated ? 'Dinero sin asignar' : (selectedBox?.name || 'Stock')}". Saldo disponible: ${currency} ${Number(strategicFundBalance).toLocaleString('es-AR')}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/cars/${vehicle.id}/purchase-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: numAmount,
                    accountId: paymentForm.accountId,
                    effectiveDate: paymentForm.effectiveDate,
                    paymentMethod: paymentForm.paymentMethod,
                    reference: paymentForm.reference,
                    receiptUrl: paymentForm.receiptUrl,
                    concept: paymentForm.concept,
                    deductFromStrategicBox: paymentForm.strategicBoxKey !== 'unallocated',
                    strategicBoxKey: paymentForm.strategicBoxKey,
                    notes: paymentForm.notes,
                    payeeCompany: paymentForm.payeeCompany || undefined,
                    isSharedInvestment: paymentForm.isSharedInvestment,
                    partnerCompany: paymentForm.partnerCompany,
                    partnerPercentage: paymentForm.partnerPercentage
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al registrar el pago de compra');
                return;
            }

            toast.success('Pago de compra registrado exitosamente');
            setIsPaymentModalOpen(false);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('treasury-updated'));
                window.dispatchEvent(new CustomEvent('vehicle-updated'));
                window.dispatchEvent(new CustomEvent('account-balance-updated'));
            }
            if (onPaymentSaved) onPaymentSaved();
        } catch (err) {
            console.error('Error confirmando pago:', err);
            toast.error('Error de conexión al registrar pago');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Confirmar Modificación de Compromiso
    const handleConfirmCommitment = async (e) => {
        e.preventDefault();
        if (!commitmentForm.reason || !commitmentForm.reason.trim()) {
            toast.error('El motivo de la modificación es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/cars/${vehicle.id}/purchase-commitment`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    expectedDate: commitmentForm.expectedDate || null,
                    expectedFundsNote: commitmentForm.expectedFundsNote,
                    commitNotes: commitmentForm.commitNotes,
                    reason: commitmentForm.reason,
                    isSharedInvestment: commitmentForm.isSharedInvestment,
                    partnerCompany: commitmentForm.partnerCompany,
                    partnerPercentage: commitmentForm.partnerPercentage
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al actualizar compromiso');
                return;
            }

            toast.success('Compromiso actualizado con auditoría');
            setIsCommitmentModalOpen(false);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('treasury-updated'));
                window.dispatchEvent(new CustomEvent('vehicle-updated'));
            }
            if (onPaymentSaved) onPaymentSaved();
        } catch (err) {
            console.error('Error actualizando compromiso:', err);
            toast.error('Error al guardar cambios del compromiso');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Sincronización rápida con InfoAuto
    const [isSyncingInfoAuto, setIsSyncingInfoAuto] = useState(false);

    const handleSyncInfoAutoQuick = async () => {
        try {
            setIsSyncingInfoAuto(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`/api/admin/cars/${vehicle.id}/sync-infoauto`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = await res.json();
            if (data.ok) {
                toast.success(data.message || 'InfoAuto sincronizado');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('vehicle-updated'));
                }
                if (onPaymentSaved) onPaymentSaved();
            } else {
                toast.error(data.message || 'No se pudo sincronizar InfoAuto');
            }
        } catch (err) {
            toast.error('Error al sincronizar con InfoAuto: ' + err.message);
        } finally {
            setIsSyncingInfoAuto(false);
        }
    };

    // Confirmar Vinculación de Egreso Existente
    const handleConfirmLinkExpense = async (e) => {
        e.preventDefault();
        if (!selectedExpenseId) {
            toast.error('Seleccioná un egreso existente');
            return;
        }
        if (!linkReason || !linkReason.trim()) {
            toast.error('El motivo de la vinculación es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/cars/${vehicle.id}/link-purchase-expense`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    transactionId: selectedExpenseId,
                    reason: linkReason,
                    notes: linkNotes
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al vincular egreso');
                return;
            }

            toast.success('Egreso vinculado exitosamente sin duplicar movimientos');
            setIsLinkExpenseModalOpen(false);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('treasury-updated'));
                window.dispatchEvent(new CustomEvent('vehicle-updated'));
                window.dispatchEvent(new CustomEvent('account-balance-updated'));
            }
            if (onPaymentSaved) onPaymentSaved();
        } catch (err) {
            console.error('Error vinculando egreso:', err);
            toast.error('Error al vincular egreso');
        } finally {
            setIsSubmitting(false);
        }
    };

    const infoAuto = vehicle.infoAuto || vehicle._original?.infoAuto || null;
    const comisionEstimada = (vehicle.precioPublicado || 0) * 0.013;
    const margenNeto = (vehicle.margenEstimado || 0) - comisionEstimada;
    const margenNetoPorcentual = vehicle.costoTotal > 0 
        ? ((margenNeto / vehicle.costoTotal) * 100).toFixed(1)
        : 0;

    return (
        <CrmCard>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">Resumen Financiero</h3>
                {onEdit && (
                    <button 
                        onClick={onEdit} 
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-crm-fg-muted bg-crm-surface-raised border border-crm-border rounded hover:text-white hover:border-crm-fg transition-colors"
                        title="Modificar precio o costo del vehículo sin generar egresos de dinero"
                    >
                        <Edit size={14} />
                        Editar Valores
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Costo de Compra</span>
                    <span className="text-white font-medium">
                        {vehicle.precioCompra > 0 ? `${currency} ${Number(vehicle.precioCompra).toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>
                
                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Gastos Operativos</span>
                    <span className="text-white font-medium">
                        {vehicle.gastos > 0 ? `${vehicle.moneda} ${vehicle.gastos.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-border">
                    <span className="text-xs text-crm-fg-muted">Costo Total</span>
                    <span className="text-white font-bold">
                        {vehicle.costoTotal > 0 ? `${vehicle.moneda} ${vehicle.costoTotal.toLocaleString('es-AR')}` : 'N/A'}
                    </span>
                </div>

                <div className="flex flex-col gap-1 p-3 bg-crm-bg rounded-lg border border-crm-red/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-[#E63027]/10 to-transparent"></div>
                    <span className="text-xs text-crm-fg-muted">Margen Estimado</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[#22C55E] font-bold">
                            {margenNeto > 0 ? `${vehicle.moneda} ${margenNeto.toLocaleString('es-AR', { maximumFractionDigits: 2 })}` : 'N/A'}
                        </span>
                        {margenNetoPorcentual > 0 && (
                            <span className="text-xs text-crm-fg-muted">({margenNetoPorcentual}%)</span>
                        )}
                    </div>
                </div>
            </div>

            {/* SECCIÓN INFOAUTO / VALUACIÓN OFICIAL DE MERCADO */}
            <div className="mt-4 p-4 rounded-xl border border-blue-500/25 bg-blue-500/5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs">
                            ℹ️
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-white">
                                    Referencia Oficial InfoAuto
                                </span>
                                {Number(infoAuto?.valor) > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                        <CheckCircle2 size={11} /> Vinculado
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-crm-fg-muted bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                        No vinculado
                                    </span>
                                )}
                                {infoAuto?.autoSync && (
                                    <span className="hidden sm:inline-flex text-[10px] font-medium text-blue-300/80 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                        Auto-sync mensual activo
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] text-crm-fg-muted">
                                {infoAuto?.edicion ? `Guía oficial ${infoAuto.edicion}` : 'Guía de precios oficial de mercado (Cámara del Comercio Automotor / InfoAuto)'}
                                {infoAuto?.lastSyncAt ? ` • Actualizado: ${new Date(infoAuto.lastSyncAt).toLocaleDateString('es-AR')}` : ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {Number(infoAuto?.valor) > 0 && (
                            <button
                                type="button"
                                onClick={handleSyncInfoAutoQuick}
                                disabled={isSyncingInfoAuto}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                                title="Actualizar cotización según la guía vigente"
                            >
                                <RefreshCw size={12} className={isSyncingInfoAuto ? 'animate-spin' : ''} />
                                {isSyncingInfoAuto ? 'Sincronizando...' : 'Actualizar'}
                            </button>
                        )}
                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-crm-fg-muted hover:text-white bg-crm-surface-raised border border-crm-border rounded-lg transition-colors cursor-pointer"
                            >
                                <Edit size={12} />
                                {Number(infoAuto?.valor) > 0 ? 'Editar CODIA / Valor' : 'Vincular InfoAuto'}
                            </button>
                        )}
                    </div>
                </div>

                {Number(infoAuto?.valor) > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="flex flex-col gap-0.5 p-2.5 bg-crm-bg/80 rounded-lg border border-crm-border">
                            <span className="text-[10px] uppercase font-semibold text-crm-fg-muted">
                                Valor Guía InfoAuto {infoAuto.codia ? `(CODIA ${infoAuto.codia})` : ''}
                            </span>
                            <span className="text-white font-mono font-bold text-sm">
                                {infoAuto.currency || 'ARS'} {Number(infoAuto.valor).toLocaleString('es-AR')}
                            </span>
                        </div>

                        <div className="flex flex-col gap-0.5 p-2.5 bg-crm-bg/80 rounded-lg border border-crm-border">
                            <span className="text-[10px] uppercase font-semibold text-crm-fg-muted">
                                Brecha vs. Costo Compra
                            </span>
                            {vehicle.precioCompra > 0 ? (
                                <div className="flex items-baseline justify-between">
                                    <span className="text-white font-mono text-xs font-semibold">
                                        {currency} {Number(vehicle.precioCompra).toLocaleString('es-AR')}
                                    </span>
                                    {(() => {
                                        const diff = Number(vehicle.precioCompra) - Number(infoAuto.valor);
                                        const pct = ((diff / Number(infoAuto.valor)) * 100).toFixed(1);
                                        return (
                                            <span className={`text-xs font-bold ${diff <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {diff <= 0 ? `-${Math.abs(pct)}% (Ahorro)` : `+${pct}% (Sobre lista)`}
                                            </span>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <span className="text-xs text-crm-fg-muted">Sin costo cargado</span>
                            )}
                        </div>

                        <div className="flex flex-col gap-0.5 p-2.5 bg-crm-bg/80 rounded-lg border border-crm-border">
                            <span className="text-[10px] uppercase font-semibold text-crm-fg-muted">
                                Brecha vs. Precio Publicado
                            </span>
                            {vehicle.precioPublicado > 0 ? (
                                <div className="flex items-baseline justify-between">
                                    <span className="text-white font-mono text-xs font-semibold">
                                        {vehicle.moneda} {Number(vehicle.precioPublicado).toLocaleString('es-AR')}
                                    </span>
                                    {(() => {
                                        const diff = Number(vehicle.precioPublicado) - Number(infoAuto.valor);
                                        const pct = ((diff / Number(infoAuto.valor)) * 100).toFixed(1);
                                        return (
                                            <span className={`text-xs font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                {diff >= 0 ? `+${pct}% (Margen)` : `-${Math.abs(pct)}% (Competitivo)`}
                                            </span>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <span className="text-xs text-crm-fg-muted">Sin precio de venta</span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-2.5 bg-crm-bg/50 rounded-lg border border-dashed border-crm-border text-xs text-crm-fg-muted">
                        <span>Este vehículo aún no tiene asignado código CODIA ni valor de referencia oficial de InfoAuto.</span>
                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 ml-2 cursor-pointer"
                            >
                                Asignar ahora
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* SECCIÓN PAGO DE COMPRA DE LA UNIDAD */}
            {isAgencyOwned && (
                <div className="mt-4 p-4 rounded-xl border border-crm-border bg-crm-bg/70 space-y-3">
                    {/* Encabezado del Bloque con Estados y Acciones */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-crm-fg-muted">
                                Pago de Compra de la Unidad
                            </span>

                            {paymentStatus === 'pagado' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 size={12} /> {isSharedInvestment ? (partnerCompany ? `Pagado (Co-inversión con ${partnerCompany})` : `Pagado (Inversión a medias)`) : 'Pagado / Liquidado'}
                                </span>
                            ) : paymentStatus === 'parcial' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                                    <Clock size={12} /> Pago Parcial
                                </span>
                            ) : paymentStatus === 'conciliacion_pendiente' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-300 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20" title="Vehículo histórico sin registro de deuda ni egreso explícito">
                                    <AlertCircle size={12} /> Pago pendiente de conciliación
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                    <AlertTriangle size={12} /> Pendiente de Pago
                                </span>
                            )}

                            {isSharedInvestment && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-300 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                                    🏢 Co-inversión: {partnerPercentage}% {partnerCompany || 'Socio'} / {agencyPercentage}% Agencia
                                </span>
                            )}
                        </div>

                        {/* Botones de acción principales */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Botón Destacado: Registrar pago de compra */}
                            {(pendingDebt > 0 || isHistorical) && (
                                <button
                                    type="button"
                                    onClick={handleOpenPaymentModal}
                                    disabled={!canRegisterPayment}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow transition-all ${
                                        canRegisterPayment 
                                            ? 'text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95' 
                                            : 'text-zinc-400 bg-zinc-800 border border-zinc-700 cursor-not-allowed opacity-60'
                                    }`}
                                    title={canRegisterPayment ? 'Registrar salida física de dinero y abonar obligación' : 'Requiere permisos de Stock o Tesorería'}
                                >
                                    {canRegisterPayment ? <DollarSign size={13} /> : <Lock size={12} />}
                                    Registrar pago de compra
                                </button>
                            )}

                            {/* Botón: Vincular egreso existente */}
                            {(paymentStatus !== 'pagado') && (
                                <button
                                    type="button"
                                    onClick={handleOpenLinkExpenseModal}
                                    disabled={!canRegisterPayment}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-crm-fg-muted hover:text-white bg-crm-surface-raised border border-crm-border rounded-lg hover:border-crm-fg transition-colors"
                                    title="Conciliar con un egreso ya registrado en Finanzas sin volver a debitar fondos"
                                >
                                    <Link2 size={13} />
                                    Vincular egreso existente
                                </button>
                            )}

                            {/* Botón: Editar datos del compromiso */}
                            <button
                                type="button"
                                onClick={handleOpenCommitmentModal}
                                disabled={!canRegisterPayment}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-crm-fg-muted hover:text-white bg-crm-surface-raised border border-crm-border rounded-lg hover:border-crm-fg transition-colors"
                                title="Editar fecha prevista, origen de fondos y notas del compromiso"
                            >
                                <FileText size={13} />
                                Editar compromiso
                            </button>

                            {/* Acceso: Ver pagos e historial */}
                            <button
                                type="button"
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-crm-fg-muted hover:text-white bg-crm-surface-raised border border-crm-border rounded-lg hover:border-crm-fg transition-colors"
                                title="Ver comprobantes, pagos registrados y auditoría del compromiso"
                            >
                                <History size={13} />
                                Ver pagos e historial ({payments.length})
                            </button>
                        </div>
                    </div>

                    {/* Fila de Métricas del Pago */}
                    {isSharedInvestment ? (
                        <div className="space-y-2 pt-1">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                                    <span className="text-gray-400 block text-[11px]">Costo total compra:</span>
                                    <span className="font-bold text-white text-sm">
                                        {currency} {totalCost.toLocaleString('es-AR')}
                                    </span>
                                    <span className="text-[10px] text-blue-300 block mt-0.5">
                                        Aporte {partnerCompany || 'Socio'} ({partnerPercentage}%): {currency} {partnerContribution.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="p-2.5 bg-black/40 rounded-lg border border-blue-500/20">
                                    <span className="text-blue-300 block text-[11px]">Compromiso Agencia ({agencyPercentage}%):</span>
                                    <span className="font-bold text-white text-sm">
                                        {currency} {agencyCost.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                                    <span className="text-gray-400 block text-[11px]">Abonado por Agencia:</span>
                                    <span className="font-bold text-emerald-400 text-sm">
                                        {currency} {amountPaid.toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                                    <span className="text-gray-400 block text-[11px]">Saldo pendiente Agencia:</span>
                                    <span className={`font-bold text-sm ${pendingDebt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {pendingDebt === 0 ? '$0 (Liquidado)' : `${currency} ${pendingDebt.toLocaleString('es-AR')}`}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-blue-300 bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                                <Info size={13} className="shrink-0 text-blue-400" />
                                <span>
                                    Inversión a medias con <strong>{partnerCompany || 'Empresa socia'}</strong>: La empresa aportó el {partnerPercentage}% ({currency} {partnerContribution.toLocaleString('es-AR')}). La agencia asume el {agencyPercentage}% ({currency} {agencyCost.toLocaleString('es-AR')}). {pendingDebt === 0 && '¡Obligación completamente cancelada sin saldo pendiente!'}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                            <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400 block text-[11px]">Costo de adquisición:</span>
                                <span className="font-bold text-white text-sm">
                                    {currency} {totalCost.toLocaleString('es-AR')}
                                </span>
                            </div>
                            <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400 block text-[11px]">Total abonado:</span>
                                <span className="font-bold text-emerald-400 text-sm">
                                    {currency} {amountPaid.toLocaleString('es-AR')}
                                </span>
                            </div>
                            <div className="p-2.5 bg-black/40 rounded-lg border border-white/5">
                                <span className="text-gray-400 block text-[11px]">Saldo pendiente de pago:</span>
                                <span className={`font-bold text-sm ${pendingDebt > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                                    {isHistorical && pendingDebt === 0 && amountPaid === 0 ? (
                                        <span className="text-purple-300 font-normal text-xs">Pendiente de conciliación</span>
                                    ) : (
                                        `${currency} ${pendingDebt.toLocaleString('es-AR')}`
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Advertencia para unidades históricas */}
                    {isHistorical && (
                        <div className="flex items-start gap-2 text-[11px] text-purple-300 bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
                            <Info size={14} className="mt-0.5 shrink-0 text-purple-400" />
                            <div>
                                <span className="font-bold">Unidad sin registro contable previo:</span> No se registran egresos ni deudas vinculadas. Podés <button onClick={handleOpenLinkExpenseModal} className="underline font-bold hover:text-white">vincular un egreso existente</button> si ya fue abonada antes del CRM, o <button onClick={handleOpenPaymentModal} className="underline font-bold hover:text-white">registrar el pago ahora</button> si está impaga.
                            </div>
                        </div>
                    )}

                    {/* Previsión de Fondos y Fecha Prevista */}
                    {(expectedFundsNote || expectedDate || commitNotes) && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                            <div className="space-y-0.5">
                                {expectedFundsNote && (
                                    <div>
                                        <span className="font-bold text-amber-200">Previsión de fondos:</span> {expectedFundsNote}
                                    </div>
                                )}
                                {commitNotes && (
                                    <div className="text-zinc-300">
                                        <span className="font-bold text-zinc-400">Observaciones:</span> {commitNotes}
                                    </div>
                                )}
                            </div>
                            {expectedDate && (
                                <div className="flex items-center gap-1 text-amber-400 font-mono shrink-0">
                                    <Calendar size={12} />
                                    <span>Vence: {new Date(expectedDate).toLocaleDateString('es-AR')}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {!canRegisterPayment && (
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
                            <Lock size={12} className="text-zinc-500" />
                            <span>La registración y conciliación de pagos de compra está reservada para roles autorizados de Stock y Tesorería.</span>
                        </div>
                    )}
                </div>
            )}

            {/* PRECIO PUBLICADO Y COMISIÓN */}
            <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between p-4 bg-crm-surface-raised rounded-lg border border-crm-border gap-4 md:gap-0">
                <div>
                    <span className="block text-sm text-crm-fg-muted">Precio Publicado</span>
                    <span className="block text-2xl font-bold text-white mt-1">
                        {vehicle.moneda} {vehicle.precioPublicado.toLocaleString('es-AR')}
                    </span>
                </div>
                <div className="md:text-center">
                    <span className="block text-sm text-crm-fg-muted">Comisión Estimada (1.3%)</span>
                    <span className="block text-lg font-medium text-[#22C55E] mt-1 opacity-90">
                        {vehicle.moneda} {comisionEstimada.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="md:text-right">
                    <span className="block text-sm text-crm-fg-muted">Precio Mínimo (Reserva)</span>
                    <span className="block text-lg font-medium text-white mt-1 opacity-80">
                        {vehicle.precioMinimo > 0 ? `${vehicle.moneda} ${vehicle.precioMinimo.toLocaleString('es-AR')}` : 'No definido'}
                    </span>
                </div>
            </div>

            {/* ======================================================== */}
            {/* MODAL 1: REGISTRAR PAGO DE COMPRA                       */}
            {/* ======================================================== */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                                    <DollarSign size={18} />
                                </span>
                                <div>
                                    <h4 className="text-sm font-black text-white">Registrar Pago de Compra</h4>
                                    <p className="text-[11px] text-crm-fg-muted">{vehicle.marca} {vehicle.modelo} ({vehicle.dominio})</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Indicadores Clave en la Cabecera del Modal */}
                        {paymentForm.isSharedInvestment ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 p-3 rounded-xl border border-blue-500/20 text-center text-xs">
                                <div>
                                    <span className="text-[10px] text-gray-400 block">Costo total</span>
                                    <span className="font-bold text-white font-mono">{currency} {totalCost.toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-blue-300 block">Aporte {paymentForm.partnerCompany} ({formPartnerPct}%)</span>
                                    <span className="font-bold text-blue-400 font-mono">{currency} {formPartnerContribution.toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-300 block">Compromiso Agencia ({formAgencyPct}%)</span>
                                    <span className="font-bold text-white font-mono">{currency} {formAgencyCost.toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-amber-300 block">Saldo pendiente Agencia</span>
                                    <span className={`font-bold font-mono ${formAgencyPending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {currency} {formAgencyPending.toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-2 bg-black/40 p-3 rounded-xl border border-white/5 text-center text-xs">
                                <div>
                                    <span className="text-[10px] text-gray-400 block">Costo adquisición</span>
                                    <span className="font-bold text-white font-mono">{currency} {totalCost.toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block">Total pagado</span>
                                    <span className="font-bold text-emerald-400 font-mono">{currency} {amountPaid.toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 block">Saldo pendiente</span>
                                    <span className="font-bold text-amber-400 font-mono">
                                        {currency} {(pendingDebt > 0 ? pendingDebt : (isHistorical ? totalCost : 0)).toLocaleString('es-AR')}
                                    </span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleConfirmPayment} className="space-y-4 text-xs">
                            {/* SECCIÓN CO-INVERSIÓN / INVERSIÓN A MEDIAS */}
                            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={paymentForm.isSharedInvestment}
                                        onChange={(e) => {
                                            const isChecked = e.target.checked;
                                            const partnerPct = isChecked ? 50 : 0;
                                            const agCost = isChecked ? Math.round(totalCost * 0.5) : totalCost;
                                            const pend = Math.max(0, agCost - amountPaid);
                                            setPaymentForm(prev => ({
                                                ...prev,
                                                isSharedInvestment: isChecked,
                                                partnerPercentage: 50,
                                                amount: String(pend > 0 ? pend : '')
                                            }));
                                        }}
                                        className="w-4 h-4 mt-0.5 rounded border-crm-border text-blue-500 focus:ring-blue-500 bg-crm-bg"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-white block">
                                            ¿Fue una inversión a medias (Co-inversión)?
                                        </span>
                                        <span className="text-[10px] text-gray-400 block">
                                            Asociá una empresa socia cargada. El aporte del socio queda cubierto y la agencia solo responde por su parte propia, garantizando que no quede saldo pendiente.
                                        </span>
                                    </div>
                                </label>

                                {paymentForm.isSharedInvestment && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-blue-500/20 animate-in fade-in duration-150">
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                                Empresa socia / co-inversora *
                                            </label>
                                            <select
                                                value={paymentForm.partnerCompany}
                                                onChange={(e) => setPaymentForm(prev => ({ ...prev, partnerCompany: e.target.value }))}
                                                required={paymentForm.isSharedInvestment}
                                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-xs font-medium"
                                            >
                                                {companies.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                                Participación socio (%)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={paymentForm.partnerPercentage}
                                                onChange={(e) => {
                                                    const pct = Math.min(99, Math.max(1, Number(e.target.value) || 50));
                                                    const agCost = Math.round(totalCost * ((100 - pct) / 100));
                                                    const pend = Math.max(0, agCost - amountPaid);
                                                    setPaymentForm(prev => ({
                                                        ...prev,
                                                        partnerPercentage: pct,
                                                        amount: String(pend > 0 ? pend : '')
                                                    }));
                                                }}
                                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:border-blue-500 focus:outline-none text-xs font-medium"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 text-[11px] text-blue-300 bg-black/40 p-2.5 rounded-lg border border-blue-500/20 flex flex-wrap justify-between gap-1">
                                            <span>Aporte {paymentForm.partnerCompany} ({formPartnerPct}%): <strong>{currency} {formPartnerContribution.toLocaleString('es-AR')}</strong> (Cubierto)</span>
                                            <span>Compromiso propio Agencia ({formAgencyPct}%): <strong>{currency} {formAgencyCost.toLocaleString('es-AR')}</strong></span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Empresa destinataria del pago */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    Empresa destinataria / receptora del pago (Opcional)
                                </label>
                                <select
                                    value={paymentForm.payeeCompany}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payeeCompany: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none text-xs"
                                >
                                    <option value="">— Sin empresa específica / Particular —</option>
                                    {companies.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Importe a pagar */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-bold text-gray-300">
                                        Importe a pagar ahora ({currency}) *
                                    </label>
                                    {((paymentForm.isSharedInvestment ? formAgencyPending : pendingDebt) > 0) ? (
                                        <button
                                            type="button"
                                            onClick={() => setPaymentForm(prev => ({ 
                                                ...prev, 
                                                amount: String(paymentForm.isSharedInvestment ? formAgencyPending : pendingDebt) 
                                            }))}
                                            className="text-[10px] text-emerald-400 hover:underline font-bold"
                                        >
                                            {paymentForm.isSharedInvestment 
                                                ? `Pagar saldo propio (${currency} {formAgencyPending.toLocaleString('es-AR')})` 
                                                : `Pagar saldo total (${currency} {pendingDebt.toLocaleString('es-AR')})`}
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-emerald-400 font-bold">
                                            Compromiso propio saldado (No queda saldo pendiente)
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max={paymentForm.isSharedInvestment ? (formAgencyPending > 0 ? formAgencyPending : undefined) : (pendingDebt > 0 ? pendingDebt : undefined)}
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                                    required
                                    placeholder="0"
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none font-bold text-sm"
                                />
                                {paymentForm.isSharedInvestment && (
                                    <span className="text-[10px] text-gray-400 block mt-1">
                                        Al abonar el compromiso propio, la unidad queda totalmente liquidada con la empresa socia y no queda saldo pendiente.
                                    </span>
                                )}
                            </div>

                            {/* Selector de cuenta de salida */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    Selector de caja / cuenta física de salida *
                                </label>
                                <select
                                    value={paymentForm.accountId}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, accountId: e.target.value }))}
                                    required
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">— Seleccionar cuenta física —</option>
                                    {accounts.map(acc => (
                                        <option key={acc._id} value={acc._id}>
                                            {acc.name} ({acc.currency} {Number(acc.balance || 0).toLocaleString('es-AR')})
                                        </option>
                                    ))}
                                </select>

                                {/* Saldo disponible y Saldo Resultante en tiempo real */}
                                {selectedAccount && (
                                    <div className={`mt-2 p-2.5 rounded-xl border text-xs ${
                                        hasInsufficientFunds 
                                            ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                                            : 'bg-black/30 border-white/5 text-zinc-300'
                                    }`}>
                                        <div className="flex justify-between">
                                            <span className="text-[11px] text-gray-400">Saldo disponible actual:</span>
                                            <span className="font-mono font-bold text-white">
                                                {selectedAccount.currency} {accountBalance.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between mt-1 pt-1 border-t border-white/5">
                                            <span className="text-[11px] text-gray-400">Saldo resultante estimado:</span>
                                            <span className={`font-mono font-bold ${hasInsufficientFunds ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {selectedAccount.currency} {resultingBalance.toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                        {hasInsufficientFunds && (
                                            <p className="text-[10px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                                                <AlertTriangle size={12} /> Fondos insuficientes en la cuenta seleccionada.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Fecha efectiva y Medio de pago */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                        Fecha efectiva *
                                    </label>
                                    <input
                                        type="date"
                                        value={paymentForm.effectiveDate}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                                        required
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                        Medio de pago *
                                    </label>
                                    <select
                                        value={paymentForm.paymentMethod}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                    >
                                        <option value="Transferencia bancaria">Transferencia bancaria</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Cheque">Cheque</option>
                                        <option value="Tarjeta">Tarjeta</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                            </div>

                            {/* Comprobante opcional y Referencia */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                        Comprobante / URL opcional
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: FAC-0012 o link..."
                                        value={paymentForm.receiptUrl}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, receiptUrl: e.target.value }))}
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                        Referencia bancaria
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Transf #84910"
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                                        className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Concepto o motivo */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    Concepto o motivo del pago
                                </label>
                                <input
                                    type="text"
                                    value={paymentForm.concept}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, concept: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
                                />
                            </div>

                            {/* Selector de Asignación Estratégica o Fondos sin Asignar */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    Asignación estratégica o fondos sin asignar *
                                </label>
                                <select
                                    value={paymentForm.strategicBoxKey}
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, strategicBoxKey: e.target.value }))}
                                    required
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none text-xs"
                                >
                                    <option value="stock">Reposición de Stock (Caja Estratégica) — Recomendado</option>
                                    <option value="unallocated">Dinero sin asignar (Liquidez libre en cuentas)</option>
                                    {(strategicFundsSummary.boxes || []).filter(b => b.key !== 'stock').map(b => (
                                        <option key={b.key} value={b.key}>
                                            {b.name} (Caja Estratégica)
                                        </option>
                                    ))}
                                </select>

                                {/* Panel en tiempo real de saldos antes y después de la asignación estratégica */}
                                <div className={`mt-2 p-2.5 rounded-xl border text-xs ${
                                    hasInsufficientStrategicFunds 
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                                        : 'bg-black/30 border-white/5 text-zinc-300'
                                }`}>
                                    <div className="flex justify-between">
                                        <span className="text-[11px] text-gray-400">
                                            Asignación actual ({isUnallocated ? 'Sin asignar' : (selectedBox?.name || 'Stock')}):
                                        </span>
                                        <span className="font-mono font-bold text-white">
                                            {currency} {Number(strategicFundBalance || 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between mt-1 pt-1 border-t border-white/5">
                                        <span className="text-[11px] text-gray-400">Asignación resultante estimada:</span>
                                        <span className={`font-mono font-bold ${hasInsufficientStrategicFunds ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {currency} {Number(resultingStrategicFundBalance || 0).toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    {hasInsufficientStrategicFunds && (
                                        <p className="text-[10px] text-amber-400 font-bold mt-1.5 flex items-center gap-1">
                                            <AlertTriangle size={12} /> Saldo insuficiente en la asignación estratégica elegida ({currency} {Number(strategicFundBalance || 0).toLocaleString('es-AR')}).
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3 border-t border-crm-border">
                                <button
                                    type="button"
                                    onClick={() => setIsPaymentModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-crm-border text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || hasInsufficientFunds || hasInsufficientStrategicFunds}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                                    Confirmar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 2: VINCULAR EGRESO EXISTENTE (CONCILIACIÓN)        */}
            {/* ======================================================== */}
            {isLinkExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-xl rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                                    <Link2 size={18} />
                                </span>
                                <div>
                                    <h4 className="text-sm font-black text-white">Vincular Egreso Contable Existente</h4>
                                    <p className="text-[11px] text-crm-fg-muted">Conciliar compra sin duplicar salidas de dinero</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLinkExpenseModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                            <p className="font-bold">Conciliación contable:</p>
                            <p className="text-[11px] text-blue-200/90 mt-0.5">
                                Permite imputar un egreso ya registrado en Finanzas a la compra de esta unidad. 
                                <strong> No descontará fondos de la cuenta nuevamente</strong> ni creará movimientos dobles.
                            </p>
                        </div>

                        {/* Buscador de egresos */}
                        <div>
                            <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                Buscar en egresos registrados:
                            </label>
                            <input
                                type="text"
                                placeholder="Buscar por concepto, referencia o monto..."
                                value={expenseSearch}
                                onChange={(e) => setExpenseSearch(e.target.value)}
                                className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                            />
                        </div>

                        {/* Lista de egresos disponibles */}
                        <div className="border border-crm-border rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-black/40">
                            {loadingExpenses ? (
                                <div className="p-4 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                                    <RefreshCw size={14} className="animate-spin" /> Cargando egresos...
                                </div>
                            ) : linkableExpenses.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-xs">
                                    No se encontraron egresos coincidentes. Podés ingresar el ID manualmente abajo.
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {linkableExpenses.map((tx) => (
                                        <label 
                                            key={tx._id} 
                                            className={`flex items-start gap-3 p-2.5 text-xs cursor-pointer hover:bg-white/5 transition-colors ${
                                                selectedExpenseId === tx._id ? 'bg-blue-500/15 border-l-2 border-blue-400' : ''
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="linkTxRadio"
                                                value={tx._id}
                                                checked={selectedExpenseId === tx._id}
                                                onChange={() => setSelectedExpenseId(tx._id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-white">{tx.concept}</span>
                                                    <span className="font-mono font-bold text-emerald-400">
                                                        {tx.currency} {Number(tx.amount || 0).toLocaleString('es-AR')}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 flex items-center gap-3 mt-0.5">
                                                    <span>Fecha: {new Date(tx.date).toLocaleDateString('es-AR')}</span>
                                                    {tx.accountId?.name && <span>Cuenta: {tx.accountId.name}</span>}
                                                    {tx.reference && <span>Ref: {tx.reference}</span>}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleConfirmLinkExpense} className="space-y-3 text-xs">
                            {/* Opcional: ID directo si no está en la lista rápida */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    ID de la transacción seleccionada:
                                </label>
                                <input
                                    type="text"
                                    value={selectedExpenseId}
                                    onChange={(e) => setSelectedExpenseId(e.target.value)}
                                    placeholder="Seleccioná de la lista arriba o pegá el ID aquí"
                                    required
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none"
                                />
                            </div>

                            {/* Motivo obligatorio */}
                            <div>
                                <label className="block text-[11px] font-bold text-amber-300 mb-1">
                                    Motivo obligatorio de la conciliación *
                                </label>
                                <textarea
                                    rows="2"
                                    required
                                    value={linkReason}
                                    onChange={(e) => setLinkReason(e.target.value)}
                                    placeholder="Ej: Pago realizado previamente mediante transferencia bancaria antes de la digitalización de la unidad..."
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none text-xs"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-crm-border">
                                <button
                                    type="button"
                                    onClick={() => setIsLinkExpenseModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-crm-border text-crm-fg-muted hover:text-white font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !selectedExpenseId || !linkReason.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                                    Confirmar Vinculación
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 3: EDITAR DATOS DEL COMPROMISO                     */}
            {/* ======================================================== */}
            {isCommitmentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                                    <FileText size={18} />
                                </span>
                                <div>
                                    <h4 className="text-sm font-black text-white">Editar Datos del Compromiso</h4>
                                    <p className="text-[11px] text-crm-fg-muted">Fecha prevista, previsión y observaciones</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCommitmentModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmCommitment} className="space-y-4 text-xs">
                            {/* Inversión a medias (Co-inversión) */}
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2.5">
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={commitmentForm.isSharedInvestment}
                                        onChange={(e) => setCommitmentForm(prev => ({ ...prev, isSharedInvestment: e.target.checked }))}
                                        className="w-4 h-4 mt-0.5 rounded border-crm-border text-blue-500 bg-crm-bg"
                                    />
                                    <div>
                                        <span className="text-xs font-bold text-white block">Inversión a medias (Co-inversión)</span>
                                        <span className="text-[10px] text-gray-400">Si se financió a medias con una empresa asociada, la agencia solo asume su cuota y el resto no queda pendiente.</span>
                                    </div>
                                </label>

                                {commitmentForm.isSharedInvestment && (
                                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-blue-500/20 animate-in fade-in duration-150">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-300 mb-1">Empresa socia *</label>
                                            <select
                                                value={commitmentForm.partnerCompany}
                                                onChange={(e) => setCommitmentForm(prev => ({ ...prev, partnerCompany: e.target.value }))}
                                                className="w-full bg-crm-bg border border-crm-border rounded-lg px-2.5 py-1.5 text-white text-xs"
                                            >
                                                {companies.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-300 mb-1">Porcentaje socio (%)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={commitmentForm.partnerPercentage}
                                                onChange={(e) => setCommitmentForm(prev => ({ ...prev, partnerPercentage: Number(e.target.value) }))}
                                                className="w-full bg-crm-bg border border-crm-border rounded-lg px-2.5 py-1.5 text-white text-xs"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    Fecha prevista de pago
                                </label>
                                <input
                                    type="date"
                                    value={commitmentForm.expectedDate}
                                    onChange={(e) => setCommitmentForm(prev => ({ ...prev, expectedDate: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    Origen de fondos esperado
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Cobro de cuotas venta Toyota Hilux..."
                                    value={commitmentForm.expectedFundsNote}
                                    onChange={(e) => setCommitmentForm(prev => ({ ...prev, expectedFundsNote: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl px-3 py-2 text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                                    Observaciones del compromiso
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Notas internas sobre el acuerdo de pago con el titular/vendedor..."
                                    value={commitmentForm.commitNotes}
                                    onChange={(e) => setCommitmentForm(prev => ({ ...prev, commitNotes: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl p-2.5 text-white focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-amber-300 mb-1">
                                    Motivo obligatorio del cambio *
                                </label>
                                <textarea
                                    rows="2"
                                    required
                                    placeholder="Detallá por qué se modifican las condiciones o fechas del compromiso..."
                                    value={commitmentForm.reason}
                                    onChange={(e) => setCommitmentForm(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full bg-crm-bg border border-crm-border rounded-xl p-2.5 text-white focus:border-amber-400 focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-crm-border">
                                <button
                                    type="button"
                                    onClick={() => setIsCommitmentModalOpen(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-crm-border text-crm-fg-muted hover:text-white font-bold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !commitmentForm.reason.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 4: VER PAGOS E HISTORIAL                           */}
            {/* ======================================================== */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl rounded-2xl border border-crm-border bg-crm-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-crm-border pb-3">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-white">
                                    <History size={18} />
                                </span>
                                <div>
                                    <h4 className="text-sm font-black text-white">Historial de Pagos y Compromiso</h4>
                                    <p className="text-[11px] text-crm-fg-muted">{vehicle.marca} {vehicle.modelo} ({vehicle.dominio})</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Pestañas del Modal */}
                        <div className="flex border-b border-crm-border">
                            <button
                                onClick={() => setHistoryTab('pagos')}
                                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                                    historyTab === 'pagos' ? 'border-emerald-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                Pagos Registrados ({payments.length})
                            </button>
                            <button
                                onClick={() => setHistoryTab('compromiso')}
                                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
                                    historyTab === 'compromiso' ? 'border-amber-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                            >
                                Cambios del Compromiso ({commitAuditLog.length})
                            </button>
                        </div>

                        {/* Contenido Pestaña 1: Pagos Registrados */}
                        {historyTab === 'pagos' && (
                            <div className="space-y-3">
                                {payments.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-xs">
                                        No hay pagos registrados para este vehículo todavía.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5 border border-crm-border rounded-xl overflow-hidden bg-black/40">
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="p-3 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-white">
                                                            {p.currency || currency} {Number(p.amount || 0).toLocaleString('es-AR')}
                                                        </span>
                                                        {p.linkedExistingTx ? (
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                                                                Egreso Vinculado
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                                                                Pago Directo
                                                            </span>
                                                        )}
                                                        {p.deductedFromBox && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                                                                Caja Stock
                                                            </span>
                                                        )}
                                                        {(p.partnerCompany || p.payeeCompany) && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 font-medium border border-blue-500/25">
                                                                🏢 {p.partnerCompany || p.payeeCompany}
                                                            </span>
                                                        )}
                                                        {p.isSharedInvestment && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 font-medium">
                                                                A medias ({p.partnerPercentage || 50}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-gray-400 font-mono">
                                                        {new Date(p.date).toLocaleDateString('es-AR')}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 pt-1">
                                                    <div>
                                                        <span className="text-gray-500">Cuenta: </span>
                                                        {p.accountName || 'N/A'}
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Medio: </span>
                                                        {p.paymentMethod || 'N/A'}
                                                    </div>
                                                </div>

                                                {(p.reference || p.receiptUrl) && (
                                                    <div className="text-[11px] text-gray-400 flex flex-wrap gap-3 pt-0.5">
                                                        {p.reference && <span>Ref: <strong className="text-white">{p.reference}</strong></span>}
                                                        {p.receiptUrl && <span>Comprobante: <strong className="text-white">{p.receiptUrl}</strong></span>}
                                                    </div>
                                                )}

                                                {p.notes && (
                                                    <div className="text-[11px] text-zinc-400 italic pt-0.5">
                                                        {p.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contenido Pestaña 2: Cambios del Compromiso */}
                        {historyTab === 'compromiso' && (
                            <div className="space-y-3">
                                {commitAuditLog.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-xs">
                                        No se han registrado modificaciones al compromiso todavía.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5 border border-crm-border rounded-xl overflow-hidden bg-black/40">
                                        {commitAuditLog.map((log, idx) => (
                                            <div key={idx} className="p-3 text-xs space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-amber-300">
                                                        Modificación #{commitAuditLog.length - idx}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 font-mono">
                                                        {new Date(log.date).toLocaleString('es-AR')}
                                                    </span>
                                                </div>

                                                <div className="text-[11px] text-white">
                                                    <span className="text-gray-400 font-bold">Motivo obligatorio: </span>
                                                    {log.reason}
                                                </div>

                                                <div className="text-[10px] text-gray-400 pt-0.5">
                                                    <span>Registrado por: <strong>{log.user || 'Usuario'}</strong></span>
                                                    {log.changes?.next?.expectedDate && (
                                                        <span className="ml-3">Nueva fecha: {new Date(log.changes.next.expectedDate).toLocaleDateString('es-AR')}</span>
                                                    )}
                                                    {log.changes?.next?.expectedFundsNote && (
                                                        <span className="ml-3">Previsión: {log.changes.next.expectedFundsNote}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-2 border-t border-crm-border flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-crm-surface-raised border border-crm-border text-white text-xs font-bold hover:bg-white/10"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </CrmCard>
    );
}
