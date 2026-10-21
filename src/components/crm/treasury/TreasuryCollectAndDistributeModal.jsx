"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    ArrowDownRight,
    Search,
    Car,
    User,
    Calendar,
    Wallet,
    CreditCard,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertTriangle,
    X,
    ChevronRight,
    ChevronLeft,
    SlidersHorizontal,
    Plus,
    Trash2,
    ShieldCheck,
    FileText,
    Receipt,
    RefreshCw,
    Info,
    RotateCcw,
    Lock
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(Math.round(val || 0));
}

function formatMoney(amount, currency = 'ARS') {
    const isNegative = (amount || 0) < 0;
    const formatted = new Intl.NumberFormat('es-AR').format(Math.abs(Math.round(amount || 0)));
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD' : 'ARS'} ${formatted}`;
}

const SCHEME_DETAILS = {
    caja_ajustada: {
        title: 'Caja ajustada',
        description: 'Prioridad máxima a la operación y reserva de liquidez.',
        badges: '70% Op. / 20% Res. / 10% Post.'
    },
    estabilizacion: {
        title: 'Estabilización',
        description: 'Equilibrio operativo con inicio de reinversión para crecimiento.',
        badges: '60% Op. / 20% Res. / 10% Post. / 10% Crec.'
    },
    caja_solida: {
        title: 'Caja sólida',
        description: 'Empresa consolidada: reparte a crecimiento y utilidad del titular.',
        badges: '50% Op. / 15% Res. / 10% Post. / 20% Crec. / 5% Util.'
    }
};

export default function TreasuryCollectAndDistributeModal({
    isOpen,
    onClose,
    accounts = [],
    boxes = [],
    pendingInstallments = [],
    treasuryToken,
    activeDistributionScheme = null,
    initialSale = null,
    initialSaleId = null,
    initialInstallmentId = null,
    onSuccess
}) {
    const todayStr = new Date().toISOString().split('T')[0];

    // Paso del flujo (1: Seleccionar venta, 2: Cargar pago, 3: Revisar distribución, 4: Resumen completado)
    const [step, setStep] = useState(1);

    // --- PASO 1: Búsqueda y Selección de Venta ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [saleSummary, setSaleSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // --- PASO 2: Carga de Pago ---
    const [concept, setConcept] = useState('entrega_inicial'); // 'entrega_inicial' | 'saldo' | 'cuota' | 'otro'
    const [date, setDate] = useState(todayStr);
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('ARS');
    const [paymentMethod, setPaymentMethod] = useState('Transferencia bancaria');
    const [selectedInstallmentId, setSelectedInstallmentId] = useState('');
    const [receiptReference, setReceiptReference] = useState('');
    const [notes, setNotes] = useState('');

    // Splits de Cuentas / Destinos
    const [isSplitPayment, setIsSplitPayment] = useState(false);
    const [paymentSplits, setPaymentSplits] = useState([]);
    const [singleAccountId, setSingleAccountId] = useState('');

    // --- PASO 3: Esquema y Propuesta de Distribución ---
    const [selectedScheme, setSelectedScheme] = useState(activeDistributionScheme || 'estabilizacion');
    const [distributionProposal, setDistributionProposal] = useState(null);
    const [loadingProposal, setLoadingProposal] = useState(false);
    const [proposalError, setProposalError] = useState(null);

    // --- PASO 4 / Confirmación ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [idempotencyKey, setIdempotencyKey] = useState('');
    const [completedResult, setCompletedResult] = useState(null);

    // --- CUENTAS Y AUTORIZACIÓN PIN ---
    const [internalAccounts, setInternalAccounts] = useState([]);
    const effectiveAccounts = useMemo(() => (Array.isArray(accounts) && accounts.length > 0 ? accounts : internalAccounts), [accounts, internalAccounts]);
    const isVerifyingPinRef = useRef(false);
    const prevIsOpenRef = useRef(false);

    // --- AUTORIZACIÓN Y DESBLOQUEO DE PIN ---
    const [localTreasuryToken, setLocalTreasuryToken] = useState(() => {
        return treasuryToken || (typeof window !== 'undefined' ? sessionStorage.getItem('as_treasury_token') : null);
    });
    const [requiresPin, setRequiresPin] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState(null);
    const [isVerifyingPin, setIsVerifyingPin] = useState(false);

    useEffect(() => {
        if (treasuryToken) {
            setLocalTreasuryToken(treasuryToken);
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('as_treasury_token', treasuryToken);
            }
        }
    }, [treasuryToken]);

    const handleVerifyPin = async (e, pinToVerify = pinInput) => {
        if (e) e.preventDefault();
        if (isVerifyingPinRef.current) return;

        const cleanPin = String(pinToVerify || '').trim();
        if (!/^\d{4}$/.test(cleanPin)) {
            setPinError('El PIN debe contener exactamente 4 dígitos numéricos.');
            return;
        }

        isVerifyingPinRef.current = true;
        setIsVerifyingPin(true);
        setPinError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/pin/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ pin: cleanPin })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setPinError(data.message || 'PIN incorrecto.');
                return;
            }
            const newToken = data.treasuryToken;
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('as_treasury_token', newToken);
            }
            setLocalTreasuryToken(newToken);
            setRequiresPin(false);
            setPinInput('');
            setPinError(null);
            toast.success('Tesorería desbloqueada con éxito');

            // Reanudar la carga de la venta preseleccionada y preview con el token desbloqueado
            if (initialSale) {
                await handleSelectSale(initialSale, newToken);
            } else if (initialSaleId) {
                await loadSaleById(initialSaleId, initialInstallmentId, newToken);
            } else if (selectedSale) {
                await handleSelectSale(selectedSale, newToken);
            }
            if (step === 3) {
                await fetchDistributionPreview(selectedScheme, newToken);
            }
        } catch {
            setPinError('Error de conexión al verificar el PIN.');
        } finally {
            isVerifyingPinRef.current = false;
            setIsVerifyingPin(false);
        }
    };

    // Al abrir el modal, inicializar estado
    useEffect(() => {
        const justOpened = isOpen && !prevIsOpenRef.current;
        prevIsOpenRef.current = isOpen;

        if (justOpened) {
            setStep(1);
            setCompletedResult(null);
            setIsSubmitting(false);
            setIdempotencyKey(`col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

            const storedToken = treasuryToken || (typeof window !== 'undefined' ? sessionStorage.getItem('as_treasury_token') : null);
            if (storedToken) {
                setLocalTreasuryToken(storedToken);
            }

            if (activeDistributionScheme) {
                setSelectedScheme(activeDistributionScheme);
            }

            // Si viene una venta preseleccionada
            if (initialSale) {
                handleSelectSale(initialSale, storedToken);
                if (initialInstallmentId) {
                    setConcept('cuota');
                    setSelectedInstallmentId(initialInstallmentId);
                }
            } else if (initialSaleId) {
                loadSaleById(initialSaleId, initialInstallmentId, storedToken);
            } else {
                setSelectedSale(null);
                setSaleSummary(null);
                setSearchQuery('');
                setSearchResults([]);
            }
        }
    }, [isOpen, initialSale, initialSaleId, initialInstallmentId, activeDistributionScheme, treasuryToken]);

    // Establecer cuenta predeterminada para el monto único
    useEffect(() => {
        if (effectiveAccounts.length > 0 && !singleAccountId) {
            const acc = effectiveAccounts.find(a => a.currency === currency) || effectiveAccounts[0];
            if (acc) setSingleAccountId(acc._id);
        }
    }, [effectiveAccounts, currency, singleAccountId]);

    // Buscar ventas en el servidor
    const searchSales = useCallback(async (query, customToken = null) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        const tokenToSend = customToken || localTreasuryToken || (typeof window !== 'undefined' ? sessionStorage.getItem('as_treasury_token') : '') || '';
        try {
            setIsSearching(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/tesoreria-estrategica/sales-search?q=${encodeURIComponent(query.trim())}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': tokenToSend
                }
            });
            const data = await res.json();
            if (data.requirePin || res.status === 403) {
                setRequiresPin(true);
                return;
            }
            if (data.ok && Array.isArray(data.sales)) {
                setSearchResults(data.sales);
            }
        } catch (err) {
            console.error('Error buscando ventas:', err);
        } finally {
            setIsSearching(false);
        }
    }, [localTreasuryToken]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                searchSales(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, searchSales]);

    // Cargar venta por ID
    const loadSaleById = async (saleId, installmentIdToSelect = null, customToken = null) => {
        const tokenToSend = customToken || localTreasuryToken || (typeof window !== 'undefined' ? sessionStorage.getItem('as_treasury_token') : '') || '';
        try {
            setLoadingSummary(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/tesoreria-estrategica/sales-search?saleId=${saleId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': tokenToSend
                }
            });
            const data = await res.json();
            if (data.requirePin || res.status === 403) {
                setRequiresPin(true);
                return;
            }
            if (data.ok && data.sales && data.sales[0]) {
                await handleSelectSale(data.sales[0], tokenToSend);
                if (installmentIdToSelect) {
                    setConcept('cuota');
                    setSelectedInstallmentId(installmentIdToSelect);
                }
            }
        } catch (err) {
            console.error('Error cargando venta:', err);
        } finally {
            setLoadingSummary(false);
        }
    };

    // Al seleccionar una venta
    const handleSelectSale = async (sale, customToken = null) => {
        setSelectedSale(sale);
        setCurrency(sale.currency || sale.saleCurrency || 'ARS');
        setSearchResults([]);
        setSearchQuery('');

        const tokenToSend = customToken || localTreasuryToken || (typeof window !== 'undefined' ? sessionStorage.getItem('as_treasury_token') : '') || '';
        if (!tokenToSend) {
            setRequiresPin(true);
            return;
        }

        // Cargar resumen financiero de Tesorería para la venta
        try {
            setLoadingSummary(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/tesoreria-estrategica/sales/${sale._id}/summary`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': tokenToSend
                }
            });
            const data = await res.json();
            if (data.requirePin || res.status === 403) {
                setRequiresPin(true);
                return;
            }
            const summaryData = data.summary || data.saleState;
            if (data.ok && summaryData) {
                setSaleSummary(summaryData);
                if (summaryData.pendingSaleBalance > 0 && !amount) {
                    setAmount(String(Math.round(summaryData.pendingSaleBalance)));
                }
            }
            if (data.ok && Array.isArray(data.accounts) && data.accounts.length > 0) {
                setInternalAccounts(data.accounts);
            }
        } catch (err) {
            console.error('Error cargando resumen de venta:', err);
        } finally {
            setLoadingSummary(false);
        }
    };

    // Cuotas disponibles de la venta seleccionada
    const saleInstallments = useMemo(() => {
        if (!selectedSale || !Array.isArray(selectedSale.installments)) return [];
        return selectedSale.installments.filter(i => i.status !== 'anulada');
    }, [selectedSale]);

    // Al seleccionar una cuota, actualizar monto sugerido
    const handleInstallmentChange = (instId) => {
        setSelectedInstallmentId(instId);
        if (!instId) return;
        const inst = saleInstallments.find(i => (i._id || i.id) === instId);
        if (inst) {
            const pendingInstAmount = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
            setAmount(String(Math.round(pendingInstAmount || inst.amount || 0)));
            if (inst.currency) setCurrency(inst.currency);
            setNotes(`Cobro Cuota ${inst.installmentNumber} - ${selectedSale.clientName || ''}`);
        }
    };

    // Manejo de splits
    const handleToggleSplit = (checked) => {
        setIsSplitPayment(checked);
        if (checked && paymentSplits.length === 0) {
            const numAmount = parseFloat(amount) || 0;
            const defaultAcc = effectiveAccounts.find(a => a.currency === currency) || effectiveAccounts[0];
            setPaymentSplits([
                {
                    accountId: defaultAcc?._id || '',
                    paymentMethod: 'Transferencia bancaria',
                    amount: numAmount > 0 ? numAmount : 0,
                    reference: ''
                }
            ]);
        }
    };

    const handleAddSplit = () => {
        const defaultAcc = effectiveAccounts.find(a => a.currency === currency) || effectiveAccounts[0];
        setPaymentSplits(prev => [
            ...prev,
            {
                accountId: defaultAcc?._id || '',
                paymentMethod: 'Efectivo',
                amount: 0,
                reference: ''
            }
        ]);
    };

    const handleRemoveSplit = (index) => {
        setPaymentSplits(prev => prev.filter((_, i) => i !== index));
    };

    const handleSplitChange = (index, field, value) => {
        setPaymentSplits(prev => {
            const copy = [...prev];
            copy[index] = { ...copy[index], [field]: value };
            return copy;
        });
    };

    const totalSplitAmount = useMemo(() => {
        if (!isSplitPayment) return parseFloat(amount) || 0;
        return paymentSplits.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    }, [isSplitPayment, amount, paymentSplits]);

    const enteredAmount = parseFloat(amount) || 0;
    const splitDifference = Math.round(Math.abs(enteredAmount - totalSplitAmount) * 100) / 100;
    const isSplitValid = !isSplitPayment || (splitDifference === 0 && paymentSplits.length > 0 && paymentSplits.every(s => s.accountId && parseFloat(s.amount) > 0));

    // Consultar propuesta de distribución (Paso 3)
    const fetchDistributionPreview = async (schemeToUse = selectedScheme, customToken = null) => {
        if (!selectedSale || enteredAmount <= 0) return;
        const tokenToSend = customToken || localTreasuryToken || treasuryToken || (typeof window !== 'undefined' ? sessionStorage.getItem('as_treasury_token') : '') || '';
        if (!tokenToSend) {
            setRequiresPin(true);
            return;
        }
        try {
            setLoadingProposal(true);
            setProposalError(null);
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/incomes/preview-distribution', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': tokenToSend
                },
                body: JSON.stringify({
                    saleId: selectedSale._id,
                    amount: enteredAmount,
                    currency,
                    concept,
                    installmentId: concept === 'cuota' ? selectedInstallmentId : null,
                    schemeKey: schemeToUse
                })
            });

            const data = await res.json();
            if (data.requirePin || res.status === 403) {
                setRequiresPin(true);
                return;
            }
            if (res.ok && data.ok) {
                setDistributionProposal(data);
            } else {
                setProposalError(data.message || 'No se pudo generar la propuesta de distribución.');
            }
        } catch (err) {
            setProposalError('Error de red al consultar la distribución de tesorería.');
        } finally {
            setLoadingProposal(false);
        }
    };

    // Navegación entre pasos
    const handleNextToPayment = () => {
        if (!selectedSale) {
            toast.error('Seleccioná una venta para continuar');
            return;
        }
        setStep(2);
    };

    const handleNextToReview = () => {
        if (enteredAmount <= 0) {
            toast.error('Ingresá un importe válido mayor a 0');
            return;
        }
        if (concept === 'cuota' && !selectedInstallmentId) {
            toast.error('Seleccioná la cuota que se está cobrando');
            return;
        }
        if (!isSplitPayment && !singleAccountId) {
            toast.error('Seleccioná la cuenta bancaria o caja física de destino');
            return;
        }
        if (isSplitPayment && !isSplitValid) {
            toast.error('La suma de los destinos debe coincidir exactamente con el importe total');
            return;
        }

        setStep(3);
        fetchDistributionPreview(selectedScheme);
    };

    const handleSchemeChange = (schemeKey) => {
        setSelectedScheme(schemeKey);
        fetchDistributionPreview(schemeKey);
    };

    // Confirmar Cobro y Distribución (Paso 4)
    const handleConfirm = async (markPendingIfMissing = false, customToken = null) => {
        if (isSubmitting) return;

        const tokenToSend = customToken || localTreasuryToken || treasuryToken || (typeof window !== 'undefined' ? sessionStorage.getItem('as_treasury_token') : '') || '';
        if (!tokenToSend) {
            setRequiresPin(true);
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const splitsPayload = isSplitPayment
                ? paymentSplits.map(s => ({
                    accountId: s.accountId,
                    paymentMethod: s.paymentMethod,
                    amount: parseFloat(s.amount) || 0,
                    reference: s.reference || ''
                }))
                : [
                    {
                        accountId: singleAccountId,
                        paymentMethod: paymentMethod,
                        amount: enteredAmount,
                        reference: receiptReference || ''
                    }
                ];

            const payload = {
                idempotencyKey,
                saleId: selectedSale._id,
                installmentId: concept === 'cuota' ? selectedInstallmentId : null,
                concept,
                date,
                amount: enteredAmount,
                currency,
                paymentMethod: isSplitPayment ? 'Mixto / Dividido' : paymentMethod,
                accountId: isSplitPayment ? null : singleAccountId,
                paymentSplits: splitsPayload,
                schemeKey: selectedScheme,
                receiptReference: receiptReference || null,
                notes: notes || `Cobro de ${concept.replace('_', ' ')} - ${selectedSale.clientName || ''}`,
                allowPendingDistribution: markPendingIfMissing
            };

            const res = await fetch('/api/admin/tesoreria-estrategica/incomes/collect-and-distribute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': tokenToSend
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.requirePin || res.status === 403) {
                setRequiresPin(true);
                setIsSubmitting(false);
                return;
            }
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al procesar el cobro.');
                setIsSubmitting(false);
                return;
            }

            toast.success(data.message || 'Cobro registrado y distribuido con éxito.');
            setCompletedResult(data);
            setStep(4);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('treasury-updated'));
                window.dispatchEvent(new CustomEvent('sale-updated', { detail: { saleId: selectedSale?._id } }));
                window.dispatchEvent(new CustomEvent('account-balance-updated'));
            }
            if (onSuccess) onSuccess();
        } catch (err) {
            toast.error('Error de red al registrar el cobro.');
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="relative flex flex-col w-full max-w-3xl max-h-[92vh] rounded-3xl border border-purple-500/30 bg-crm-surface shadow-2xl overflow-hidden">
                
                {/* Overlay de Desbloqueo de PIN si no está autenticado */}
                {requiresPin && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-crm-bg/95 p-6 backdrop-blur-md">
                        <form onSubmit={handleVerifyPin} className="w-full max-w-sm rounded-2xl border border-purple-500/40 bg-crm-surface p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-white">Desbloquear Tesorería Estratégica</h4>
                                <p className="text-xs text-crm-fg-muted mt-1">
                                    Ingresá tu PIN de 4 dígitos para acceder a la distribución y registrar cobros.
                                </p>
                            </div>
                            <div>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={pinInput}
                                    disabled={isVerifyingPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                        setPinInput(val);
                                        setPinError(null);
                                        if (val.length === 4 && !isVerifyingPinRef.current) {
                                            handleVerifyPin(null, val);
                                        }
                                    }}
                                    placeholder="••••"
                                    className="w-36 text-center tracking-[0.5em] text-2xl font-black rounded-xl border border-purple-500/40 bg-crm-bg py-2.5 text-white placeholder-crm-fg-muted focus:border-purple-400 focus:outline-none disabled:opacity-50"
                                    autoFocus
                                />
                                {pinError && (
                                    <p className="text-xs text-rose-400 font-semibold mt-2">{pinError}</p>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRequiresPin(false);
                                        onClose();
                                    }}
                                    className="flex-1 rounded-xl border border-crm-border py-2 text-xs font-bold text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={pinInput.length !== 4 || isVerifyingPin}
                                    className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 py-2 text-xs font-bold text-white disabled:opacity-50 transition-colors"
                                >
                                    {isVerifyingPin ? 'Verificando...' : 'Desbloquear'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                
                {/* Cabecera con Pasos */}
                <div className="p-5 border-b border-crm-border shrink-0 bg-crm-surface/90">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                                <ArrowDownRight size={22} />
                            </span>
                            <div>
                                <h3 className="text-base font-black text-white">
                                    Registrar Cobro y Distribuir
                                </h3>
                                <p className="text-xs text-crm-fg-muted">
                                    Circuito unificado de tesorería: imputa cobro, actualiza venta y distribuye margen por cajas.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-1.5 text-crm-fg-muted hover:text-white hover:bg-crm-surface-raised transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Barra de progreso de 4 pasos */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-crm-border/40">
                        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-purple-300' : 'text-crm-fg-muted'}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step >= 1 ? 'bg-purple-600 text-white' : 'bg-crm-bg text-crm-fg-muted'}`}>1</span>
                            <span className="hidden sm:inline">Venta</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-purple-300' : 'text-crm-fg-muted'}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-crm-bg text-crm-fg-muted'}`}>2</span>
                            <span className="hidden sm:inline">Pago</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-purple-300' : 'text-crm-fg-muted'}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step >= 3 ? 'bg-purple-600 text-white' : 'bg-crm-bg text-crm-fg-muted'}`}>3</span>
                            <span className="hidden sm:inline">Distribución</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs font-bold ${step === 4 ? 'text-emerald-400' : 'text-crm-fg-muted'}`}>
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step === 4 ? 'bg-emerald-600 text-white' : 'bg-crm-bg text-crm-fg-muted'}`}>4</span>
                            <span className="hidden sm:inline">Confirmado</span>
                        </div>
                    </div>
                </div>

                {/* Contenido Dinámico por Paso */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* ==================== PASO 1: SELECCIONAR VENTA ==================== */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {!selectedSale ? (
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-white">
                                        Buscar operación por cliente, patente, marca/modelo o número:
                                    </label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3.5 top-3 text-crm-fg-muted" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Ej: Pérez, AF123CD, Hilux, o 1045..."
                                            className="w-full rounded-xl border border-crm-border bg-crm-bg pl-10 pr-4 py-2.5 text-xs text-white placeholder-crm-fg-muted focus:border-purple-500 focus:outline-none"
                                            autoFocus
                                        />
                                        {isSearching && (
                                            <RefreshCw size={14} className="absolute right-3.5 top-3 text-purple-300 animate-spin" />
                                        )}
                                    </div>

                                    {/* Resultados de búsqueda */}
                                    <div className="divide-y divide-crm-border rounded-2xl border border-crm-border bg-crm-bg/60 overflow-hidden max-h-72 overflow-y-auto">
                                        {searchResults.length === 0 ? (
                                            <p className="p-6 text-center text-xs text-crm-fg-muted italic">
                                                {searchQuery.trim().length >= 2
                                                    ? 'No se encontraron operaciones de venta con ese criterio.'
                                                    : 'Ingresá al menos 2 caracteres para buscar en ventas activas.'}
                                            </p>
                                        ) : (
                                            searchResults.map(s => (
                                                <button
                                                    key={s._id}
                                                    type="button"
                                                    onClick={() => handleSelectSale(s)}
                                                    className="w-full p-3.5 text-left flex items-center justify-between hover:bg-crm-surface-raised transition-colors"
                                                >
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-white text-xs">{s.vehicleName || 'Vehículo'}</span>
                                                            {s.plate && (
                                                                <span className="rounded bg-crm-surface border border-crm-border px-1.5 py-0.2 font-mono text-[10px] text-purple-300">
                                                                    {s.plate}
                                                                </span>
                                                            )}
                                                            <span className="rounded bg-emerald-500/15 text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold uppercase">
                                                                Op. #{s.saleNumber || String(s._id).substring(18)}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-crm-fg-muted">
                                                            Cliente: <strong className="text-white">{s.clientName}</strong> · Precio: {formatMoney(s.salePrice, s.currency)}
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-crm-fg-muted shrink-0" />
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Venta Seleccionada y Tarjetas de Estado Financiero */
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                                                <Car size={20} />
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-white text-sm">
                                                        {selectedSale.vehicleName || 'Vehículo'}
                                                    </h4>
                                                    {selectedSale.plate && (
                                                        <span className="rounded bg-crm-surface border border-crm-border px-2 py-0.5 font-mono text-xs font-bold text-purple-300">
                                                            {selectedSale.plate}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-crm-fg-muted mt-0.5">
                                                    Cliente: <strong className="text-white">{selectedSale.clientName}</strong> · Operación #{selectedSale.saleNumber || String(selectedSale._id).substring(18)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedSale(null); setSaleSummary(null); }}
                                            className="rounded-xl border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-bold text-crm-fg-muted hover:text-white transition-colors"
                                        >
                                            Cambiar venta
                                        </button>
                                    </div>

                                    {/* Métricas Requeridas de la Venta (Sección 3) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted block">Precio de Venta</span>
                                            <strong className="font-mono text-sm text-white">
                                                {formatMoney(selectedSale.salePrice, selectedSale.currency || selectedSale.saleCurrency)}
                                            </strong>
                                        </div>

                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted block">Efectivamente Cobrado</span>
                                            <strong className="font-mono text-sm text-emerald-400">
                                                {formatMoney(saleSummary?.effectivelyCollectedCash ?? selectedSale.effectivelyCollectedCash ?? 0, selectedSale.currency || selectedSale.saleCurrency)}
                                            </strong>
                                        </div>

                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted block">Saldo Pendiente</span>
                                            <strong className="font-mono text-sm text-amber-300">
                                                {formatMoney(saleSummary?.pendingSaleBalance ?? selectedSale.pendingSaleBalance ?? 0, selectedSale.currency || selectedSale.saleCurrency)}
                                            </strong>
                                        </div>

                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted block">Capital Pend. Recuperar</span>
                                            <strong className="font-mono text-sm text-cyan-300">
                                                {formatMoney(saleSummary?.remainingCapitalToRecover ?? 0, selectedSale.currency || selectedSale.saleCurrency)}
                                            </strong>
                                        </div>

                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted block">Margen ya Distribuido</span>
                                            <strong className="font-mono text-sm text-purple-300">
                                                {formatMoney(saleSummary?.alreadyDistributedMargin ?? 0, selectedSale.currency || selectedSale.saleCurrency)}
                                            </strong>
                                        </div>

                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-3">
                                            <span className="text-[10px] font-bold uppercase text-crm-fg-muted block">Dinero Pend. Distribuir</span>
                                            <strong className="font-mono text-sm text-white">
                                                {formatMoney(saleSummary?.pendingDistributionAmount ?? 0, selectedSale.currency || selectedSale.saleCurrency)}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* Alerta de Permuta o Cuotas si existen */}
                                    {saleSummary?.tradeInCapitalInVehicles > 0 && (
                                        <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs flex items-center gap-2">
                                            <Info size={16} className="text-purple-300 shrink-0" />
                                            <span>
                                                Esta venta incluye vehículo en permuta por <strong className="font-mono">{formatMoney(saleSummary.tradeInCapitalInVehicles, selectedSale.currency)}</strong>. Se conserva en Stock y no se cuenta como efectivo cobrado.
                                            </span>
                                        </div>
                                    )}

                                    {saleSummary?.pendingOperationCostsTotal > 0 && (
                                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                                            <span>
                                                Obligaciones operativas pendientes de pago registradas: <strong className="font-mono">{formatMoney(saleSummary.pendingOperationCostsTotal, selectedSale.currency)}</strong>. Se separan prioritariamente antes de liberar margen.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== PASO 2: CARGAR PAGO ==================== */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Concepto y Cuota */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                        Concepto del Cobro
                                    </label>
                                    <select
                                        value={concept}
                                        onChange={(e) => setConcept(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                                    >
                                        <option value="entrega_inicial">Entrega inicial / Anticipo</option>
                                        <option value="saldo">Saldo de venta contado</option>
                                        <option value="cuota">Cuota de financiación</option>
                                        <option value="otro">Otro cobro de la venta</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                        Fecha del Cobro
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Selector de Cuota si concept === 'cuota' */}
                            {concept === 'cuota' && (
                                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3.5 space-y-2">
                                    <label className="block text-xs font-bold text-white">
                                        Seleccionar Cuota a Imputar:
                                    </label>
                                    {saleInstallments.length === 0 ? (
                                        <p className="text-xs text-amber-300">
                                            Esta venta no tiene un plan de cuotas registrado. Podés registrar el cobro como entrega inicial o saldo.
                                        </p>
                                    ) : (
                                        <select
                                            value={selectedInstallmentId}
                                            onChange={(e) => handleInstallmentChange(e.target.value)}
                                            className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="">-- Seleccionar cuota --</option>
                                            {saleInstallments.map(inst => {
                                                const pend = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));
                                                return (
                                                    <option key={inst._id || inst.id} value={inst._id || inst.id}>
                                                        Cuota {inst.installmentNumber} · Monto: {formatMoney(inst.amount, inst.currency)} · Pendiente: {formatMoney(pend, inst.currency)} · Vence: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('es-AR') : 'S/D'} ({inst.status})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    )}
                                </div>
                            )}

                            {/* Importe y Moneda */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                        Moneda
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={currency === 'USD' ? 'Dólares (USD)' : 'Pesos (ARS)'}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg/70 p-2.5 font-bold text-xs text-white focus:outline-none cursor-not-allowed"
                                        title="Respeta la moneda de la venta y cuota para evitar conversiones silenciosas"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                        Importe Total Cobrado ({currency})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Destinos del Dinero: Cuenta Única vs División de Destinos (Splits) */}
                            <div className="rounded-2xl border border-crm-border bg-crm-bg/60 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-xs font-bold text-white block">
                                            Destino del dinero en cuentas y cajas
                                        </span>
                                        <span className="text-[11px] text-crm-fg-muted">
                                            Diferencia dónde ingresa el dinero físico o bancario de su finalidad de reserva.
                                        </span>
                                    </div>
                                    <label className="inline-flex items-center gap-2 text-xs font-bold text-purple-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isSplitPayment}
                                            onChange={(e) => handleToggleSplit(e.target.checked)}
                                            className="rounded border-crm-border bg-crm-surface text-purple-600 focus:ring-purple-500 cursor-pointer h-4 w-4"
                                        />
                                        Dividir entre varios destinos
                                    </label>
                                </div>

                                {!isSplitPayment ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-crm-fg-muted mb-1">
                                                Medio de Pago
                                            </label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-full rounded-xl border border-crm-border bg-crm-surface p-2 text-xs text-white focus:outline-none"
                                            >
                                                <option value="Transferencia bancaria">Transferencia bancaria</option>
                                                <option value="Efectivo">Efectivo</option>
                                                <option value="Cheque">Cheque</option>
                                                <option value="Depósito">Depósito</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-crm-fg-muted mb-1">
                                                Caja física o Cuenta bancaria receptora
                                            </label>
                                            <select
                                                value={singleAccountId}
                                                onChange={(e) => setSingleAccountId(e.target.value)}
                                                className="w-full rounded-xl border border-crm-border bg-crm-surface p-2 text-xs text-white focus:outline-none"
                                            >
                                                <option value="">-- Seleccionar cuenta receptora --</option>
                                                {effectiveAccounts.filter(a => a.currency === currency).map(acc => (
                                                    <option key={acc._id} value={acc._id}>
                                                        {acc.name} ({acc.type} - {acc.currency})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    /* Lista de Splits */
                                    <div className="space-y-2 pt-2 border-t border-crm-border/40">
                                        {paymentSplits.map((split, idx) => (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-center rounded-xl bg-crm-surface p-2.5 border border-crm-border">
                                                <div className="col-span-12 sm:col-span-4">
                                                    <select
                                                        value={split.accountId}
                                                        onChange={(e) => handleSplitChange(idx, 'accountId', e.target.value)}
                                                        className="w-full rounded-lg border border-crm-border bg-crm-bg p-1.5 text-xs text-white"
                                                    >
                                                        <option value="">-- Cuenta receptora --</option>
                                                        {effectiveAccounts.filter(a => a.currency === currency).map(acc => (
                                                            <option key={acc._id} value={acc._id}>
                                                                {acc.name} ({acc.type})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-span-6 sm:col-span-3">
                                                    <select
                                                        value={split.paymentMethod}
                                                        onChange={(e) => handleSplitChange(idx, 'paymentMethod', e.target.value)}
                                                        className="w-full rounded-lg border border-crm-border bg-crm-bg p-1.5 text-xs text-white"
                                                    >
                                                        <option value="Efectivo">Efectivo</option>
                                                        <option value="Transferencia bancaria">Transferencia</option>
                                                        <option value="Cheque">Cheque</option>
                                                    </select>
                                                </div>

                                                <div className="col-span-5 sm:col-span-4">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        value={split.amount}
                                                        onChange={(e) => handleSplitChange(idx, 'amount', e.target.value)}
                                                        placeholder="Monto"
                                                        className="w-full rounded-lg border border-crm-border bg-crm-bg p-1.5 font-mono text-xs font-bold text-white text-right"
                                                    />
                                                </div>

                                                <div className="col-span-1 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSplit(idx)}
                                                        disabled={paymentSplits.length <= 1}
                                                        className="text-crm-fg-muted hover:text-red-400 disabled:opacity-30"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={handleAddSplit}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-300 hover:text-white"
                                            >
                                                <Plus size={14} /> Agregar otra cuenta o medio
                                            </button>

                                            <div className="text-right text-xs font-mono">
                                                <span className="text-crm-fg-muted">Suma destinos: </span>
                                                <strong className={splitDifference === 0 ? 'text-emerald-400' : 'text-amber-300'}>
                                                    {formatMoney(totalSplitAmount, currency)}
                                                </strong>
                                                {' '}/ {formatMoney(enteredAmount, currency)}
                                                {splitDifference > 0 && (
                                                    <span className="block text-[10px] text-amber-300 font-bold">
                                                        Diferencia: {formatMoney(splitDifference, currency)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Comprobante y Observación Opcionales */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                        N° Comprobante / Recibo (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={receiptReference}
                                        onChange={(e) => setReceiptReference(e.target.value)}
                                        placeholder="Ej: REC-00042 o Transf. 9841"
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                        Observación interna (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Nota visible en tesorería y en la venta"
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ==================== PASO 3: REVISAR DISTRIBUCIÓN ==================== */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {/* Selector de Esquema de Reparto */}
                            <div>
                                <label className="block text-xs font-bold text-white mb-2">
                                    Esquema de distribución sobre el margen disponible:
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {Object.entries(SCHEME_DETAILS).map(([key, info]) => {
                                        const isSelected = selectedScheme === key;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => handleSchemeChange(key)}
                                                className={`rounded-2xl border p-3 text-left transition-all ${
                                                    isSelected
                                                        ? 'border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/10'
                                                        : 'border-crm-border bg-crm-bg/80 hover:bg-crm-surface'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-crm-fg'}`}>
                                                        {info.title}
                                                    </span>
                                                    {isSelected && <CheckCircle2 size={14} className="text-purple-300" />}
                                                </div>
                                                <p className="text-[10px] text-crm-fg-muted mt-1 leading-snug">
                                                    {info.description}
                                                </p>
                                                <span className="mt-2 block font-mono text-[9px] font-bold text-purple-300">
                                                    {info.badges}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Estado de carga de la propuesta */}
                            {loadingProposal && (
                                <div className="py-8 text-center text-xs text-purple-300 flex items-center justify-center gap-2">
                                    <RefreshCw size={16} className="animate-spin" />
                                    <span>Calculando propuesta según prioridades y recupero de capital...</span>
                                </div>
                            )}

                            {proposalError && !loadingProposal && (
                                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
                                    <div className="flex items-center gap-2 font-bold mb-1">
                                        <AlertTriangle size={16} className="text-red-400" />
                                        <span>No se pudo calcular la distribución</span>
                                    </div>
                                    <p>{proposalError}</p>
                                </div>
                            )}

                            {/* Desglose de Cascada y Asignación Concreta */}
                            {distributionProposal && !loadingProposal && (
                                <div className="space-y-4">
                                    {/* Resumen de Cascada: Capital -> Obligaciones -> Margen */}
                                    <div className="rounded-2xl border border-crm-border bg-crm-bg p-4 space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-crm-fg">
                                            Propuesta de Aplicación del Cobro ({formatMoney(enteredAmount, currency)})
                                        </h4>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                                            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3">
                                                <span className="text-[10px] font-bold uppercase text-cyan-300 block">
                                                    1. Recuperar Capital (Stock)
                                                </span>
                                                <p className="font-mono text-base font-black text-white mt-1">
                                                    {formatMoney(distributionProposal.proposal?.capitalRecoveredToStock || 0, currency)}
                                                </p>
                                                <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                                    Queda pendiente: {formatMoney(distributionProposal.proposal?.remainingCapitalAfterThis || 0, currency)}
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                                                <span className="text-[10px] font-bold uppercase text-amber-300 block">
                                                    2. Separar Obligaciones / Imp.
                                                </span>
                                                <p className="font-mono text-base font-black text-white mt-1">
                                                    {formatMoney(distributionProposal.proposal?.obligationsSeparated || 0, currency)}
                                                </p>
                                                <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                                    Solo registradas en la venta
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                                                <span className="text-[10px] font-bold uppercase text-emerald-300 block">
                                                    3. Extra Reinversión (Stock)
                                                </span>
                                                <p className="font-mono text-base font-black text-white mt-1">
                                                    {formatMoney(distributionProposal.proposal?.extraReinvestmentToStock || 0, currency)}
                                                </p>
                                                <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                                    {distributionProposal.proposal?.reinvestmentTarget > 0
                                                        ? `Obj: ${formatMoney(distributionProposal.proposal.reinvestmentTarget, currency)} (${distributionProposal.proposal.reinvestmentExtraPct}%)`
                                                        : 'Sin extra configurado'}
                                                </span>
                                            </div>

                                            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                                                <span className="text-[10px] font-bold uppercase text-purple-300 block">
                                                    4. Margen Distribuible
                                                </span>
                                                <p className="font-mono text-base font-black text-white mt-1">
                                                    {formatMoney(distributionProposal.proposal?.distributableMargin || 0, currency)}
                                                </p>
                                                <span className="text-[10px] text-crm-fg-muted block mt-0.5">
                                                    Efectivamente respaldado en caja
                                                </span>
                                            </div>
                                        </div>

                                        {/* Aclaración explicativa */}
                                        <p className="text-[11px] text-crm-fg-muted border-t border-crm-border/40 pt-2">
                                            {distributionProposal.proposal?.explanation || 'El capital recuperado queda separado en la caja de Stock para reposición sin obligar a comprar de inmediato.'}
                                        </p>
                                    </div>

                                    {/* Tabla de Importes Concretos por Destino según el Esquema */}
                                    {distributionProposal.proposal?.distributableMargin > 0 ? (
                                        <div className="rounded-2xl border border-purple-500/30 bg-crm-surface overflow-hidden">
                                            <div className="p-3 border-b border-crm-border bg-crm-bg flex items-center justify-between text-xs">
                                                <span className="font-bold text-white uppercase text-[11px]">
                                                    Destinos del Margen según &ldquo;{distributionProposal.proposal?.schemeTitle || selectedScheme}&rdquo;
                                                </span>
                                                <span className="text-crm-fg-muted">
                                                    Suma exacta: <strong className="font-mono text-emerald-400">{formatMoney(distributionProposal.proposal?.distributableMargin, currency)}</strong>
                                                </span>
                                            </div>

                                            <div className="divide-y divide-crm-border text-xs">
                                                {(distributionProposal.proposal?.destinationBreakdown || []).map((dest, idx) => (
                                                    <div key={idx} className="p-3 flex items-center justify-between hover:bg-crm-surface-raised transition-colors">
                                                        <div>
                                                            <span className="font-bold text-white block">{dest.label}</span>
                                                            <span className="text-[10px] text-crm-fg-muted">{dest.percentage}% del margen disponible</span>
                                                        </div>
                                                        <span className="font-mono font-black text-sm text-purple-300">
                                                            {formatMoney(dest.amount, currency)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Mensaje si no hay margen distribuible en este cobro */
                                        <div className="rounded-2xl border border-crm-border bg-crm-bg p-4 text-xs text-center space-y-1">
                                            <span className="font-bold text-white block">
                                                Sin margen distribuible en este cobro
                                            </span>
                                            <p className="text-crm-fg-muted">
                                                El importe total cobrado se imputa a recuperar la inversión en el vehículo y cubrir obligaciones operativas. No se generan asignaciones negativas ni distribución simulada.
                                            </p>
                                        </div>
                                    )}

                                    {/* Alerta de Pendiente de Distribución si faltan datos */}
                                    {distributionProposal.missingData && (
                                        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs space-y-2">
                                            <div className="flex items-center gap-2 font-bold text-amber-300">
                                                <AlertTriangle size={16} />
                                                <span>Falta información indispensable para calcular el reparto exacto</span>
                                            </div>
                                            <p className="text-amber-100/90 leading-relaxed">
                                                {distributionProposal.missingReason || 'Se requiere completar el costo de compra o gastos de la operación.'} Podés confirmar el ingreso en cuenta y dejar la asignación como &ldquo;Pendiente de distribución&rdquo; para repartirla luego sin registrar nuevamente el dinero.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== PASO 4: RESULTADO Y RESUMEN ==================== */}
                    {step === 4 && completedResult && (
                        <div className="space-y-4 text-center py-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mx-auto">
                                <CheckCircle2 size={36} />
                            </div>

                            <div>
                                <h4 className="text-lg font-black text-white">
                                    ¡Cobro registrado y distribuido con éxito!
                                </h4>
                                <p className="text-xs text-crm-fg-muted mt-1 max-w-md mx-auto">
                                    El movimiento impactó en cuentas, actualizó los saldos de la venta y reservó los fondos en las cajas estratégicas sin duplicaciones.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-crm-border bg-crm-bg p-4 text-left max-w-lg mx-auto text-xs space-y-2.5">
                                <div className="flex justify-between border-b border-crm-border/60 pb-2">
                                    <span className="text-crm-fg-muted">Operación / Vehículo:</span>
                                    <span className="font-bold text-white">{selectedSale.vehicleName} ({selectedSale.clientName})</span>
                                </div>
                                <div className="flex justify-between border-b border-crm-border/60 pb-2">
                                    <span className="text-crm-fg-muted">Importe total cobrado:</span>
                                    <span className="font-mono font-black text-emerald-400">{formatMoney(enteredAmount, currency)}</span>
                                </div>
                                <div className="flex justify-between border-b border-crm-border/60 pb-2">
                                    <span className="text-crm-fg-muted">Capital recuperado a Stock:</span>
                                    <span className="font-mono font-bold text-cyan-300">
                                        {formatMoney(completedResult.summary?.capitalRecoveredToStock || 0, currency)}
                                    </span>
                                </div>
                                {completedResult.summary?.extraReinvestmentToStock > 0 && (
                                    <div className="flex justify-between border-b border-crm-border/60 pb-2">
                                        <span className="text-crm-fg-muted">Extra reinversión a Stock:</span>
                                        <span className="font-mono font-bold text-emerald-400">
                                            {formatMoney(completedResult.summary.extraReinvestmentToStock, currency)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between border-b border-crm-border/60 pb-2">
                                    <span className="text-crm-fg-muted">Margen distribuido a cajas:</span>
                                    <span className="font-mono font-bold text-purple-300">
                                        {formatMoney(completedResult.summary?.marginDistributed || 0, currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-crm-fg-muted">Esquema aplicado:</span>
                                    <span className="font-bold text-white uppercase">{completedResult.schemeUsed || selectedScheme}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pie de Acciones */}
                <div className="p-4 border-t border-crm-border bg-crm-surface/90 shrink-0 flex items-center justify-between gap-3">
                    {step === 1 && (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-crm-border px-4 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!selectedSale}
                                onClick={handleNextToPayment}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-40 transition-colors shadow-lg shadow-purple-600/20"
                            >
                                Cargar Pago <ChevronRight size={15} />
                            </button>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border px-4 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                            >
                                <ChevronLeft size={15} /> Volver a Venta
                            </button>
                            <button
                                type="button"
                                disabled={enteredAmount <= 0 || (isSplitPayment && !isSplitValid)}
                                onClick={handleNextToReview}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-40 transition-colors shadow-lg shadow-purple-600/20"
                            >
                                Revisar Distribución <ChevronRight size={15} />
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setStep(2)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border px-4 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                            >
                                <ChevronLeft size={15} /> Volver a Pago
                            </button>

                            <div className="flex flex-wrap items-center gap-2">
                                {distributionProposal?.missingData && (
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={() => handleConfirm(true)}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/25 disabled:opacity-40 transition-colors"
                                        title="Registra el ingreso en cuenta y deja la asignación pendiente para distribuir cuando se carguen los datos"
                                    >
                                        <Clock size={15} /> Registrar como Pendiente de Distribución
                                    </button>
                                )}

                                <button
                                    type="button"
                                    disabled={isSubmitting || loadingProposal}
                                    onClick={() => handleConfirm(false)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-600/20"
                                >
                                    <CheckCircle2 size={16} />
                                    {isSubmitting ? 'Confirmando y distribuyendo...' : 'Confirmar Cobro y Distribución'}
                                </button>
                            </div>
                        </>
                    )}

                    {step === 4 && (
                        <div className="w-full flex justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl bg-purple-600 px-6 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors"
                            >
                                Finalizar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
