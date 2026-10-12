"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
    Lock,
    Unlock,
    ShieldCheck,
    KeyRound,
    Scale,
    ArrowRightLeft,
    FileCheck,
    Briefcase,
    User,
    Landmark,
    CreditCard,
    DollarSign,
    RefreshCw,
    Wallet,
    Info,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    SlidersHorizontal,
    Plus,
    History,
    Sparkles,
    Edit3,
    ArrowDownRight,
    Wrench,
    Car,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import TreasuryPinGate from '../../../components/crm/treasury/TreasuryPinGate';
import TreasuryChangePinModal from '../../../components/crm/treasury/TreasuryChangePinModal';
import TreasuryReconciliationModal from '../../../components/crm/treasury/TreasuryReconciliationModal';
import TreasuryBoxTransferModal from '../../../components/crm/treasury/TreasuryBoxTransferModal';
import TreasuryInstallmentRegularizeModal from '../../../components/crm/treasury/TreasuryInstallmentRegularizeModal';
import TreasuryBatchRegularizeModal from '../../../components/crm/treasury/TreasuryBatchRegularizeModal';
import TreasuryOrganizeInitialModal from '../../../components/crm/treasury/TreasuryOrganizeInitialModal';
import TreasuryCollectAndDistributeModal from '../../../components/crm/treasury/TreasuryCollectAndDistributeModal';
import TreasurySetupWizardModal from '../../../components/crm/treasury/TreasurySetupWizardModal';
import TreasuryEditBoxModal from '../../../components/crm/treasury/TreasuryEditBoxModal';
import TreasuryDistributeIncomeModal from '../../../components/crm/treasury/TreasuryDistributeIncomeModal';
import TreasuryCategoryRulesTab from '../../../components/crm/treasury/TreasuryCategoryRulesTab';
import TreasuryPlanningTab from '../../../components/crm/treasury/TreasuryPlanningTab';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    const isNegative = (amount || 0) < 0;
    const formatted = new Intl.NumberFormat('es-AR').format(Math.abs(Math.round(amount || 0)));
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD' : 'ARS'} ${formatted}`;
}

const BOX_ICONS = {
    operativa: Briefcase,
    impuestos: Landmark,
    deudas: CreditCard,
    personal: User,
    postventa: Wrench,
    reserva: ShieldCheck,
    stock: Car,
    crecimiento: TrendingUp
};

const BOX_COLORS = {
    operativa: {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        iconBg: 'bg-emerald-500/20 text-emerald-300',
        accent: 'text-emerald-400'
    },
    impuestos: {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        iconBg: 'bg-amber-500/20 text-amber-300',
        accent: 'text-amber-400'
    },
    deudas: {
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
        badge: 'bg-red-500/20 text-red-300 border-red-500/30',
        iconBg: 'bg-red-500/20 text-red-300',
        accent: 'text-red-400'
    },
    personal: {
        border: 'border-purple-500/30',
        bg: 'bg-purple-500/10',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        iconBg: 'bg-purple-500/20 text-purple-300',
        accent: 'text-purple-400'
    },
    postventa: {
        border: 'border-orange-500/30',
        bg: 'bg-orange-500/10',
        badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        iconBg: 'bg-orange-500/20 text-orange-300',
        accent: 'text-orange-400'
    },
    reserva: {
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/10',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        iconBg: 'bg-blue-500/20 text-blue-300',
        accent: 'text-blue-400'
    },
    stock: {
        border: 'border-cyan-500/30',
        bg: 'bg-cyan-500/10',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        iconBg: 'bg-cyan-500/20 text-cyan-300',
        accent: 'text-cyan-400'
    },
    crecimiento: {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        iconBg: 'bg-emerald-500/20 text-emerald-300',
        accent: 'text-emerald-400'
    }
};

export default function TesoreriaEstrategicaPage() {
    const { user, token } = useAuth();

    // Estado de Autorización de Tesorería por PIN
    const [treasuryToken, setTreasuryToken] = useState(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('as_treasury_token') || null;
        }
        return null;
    });

    const [securityStatus, setSecurityStatus] = useState(null);
    const [loadingSecurity, setLoadingSecurity] = useState(true);
    const [dashboardData, setDashboardData] = useState(null);
    const [loadingData, setLoadingData] = useState(false);

    // Temporizador de Sesión de 15 minutos
    const [sessionSecondsLeft, setSessionSecondsLeft] = useState(900);

    // Cotización Dólar Blue para equivalente
    const [dolarBlueRate, setDolarBlueRate] = useState(null);

    // Navegación por pestañas
    const [activeTab, setActiveTab] = useState('cajas'); // 'cajas' | 'cobros' | 'planificacion' | 'reglas' | 'cuentas' | 'cuotas' | 'auditoria'

    // Modales
    const [isChangePinOpen, setIsChangePinOpen] = useState(false);
    const [isReconcileOpen, setIsReconcileOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isRegularizeOpen, setIsRegularizeOpen] = useState(false);
    const [isBatchRegularizeOpen, setIsBatchRegularizeOpen] = useState(false);
    const [isOrganizeInitialOpen, setIsOrganizeInitialOpen] = useState(false);
    const [isCollectAndDistributeOpen, setIsCollectAndDistributeOpen] = useState(false);
    const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
    const [isConfirmingCutoff, setIsConfirmingCutoff] = useState(false);
    const [editingBox, setEditingBox] = useState(null);
    const [distributingIncome, setDistributingIncome] = useState(null);

    // 1. Cargar estado de seguridad y cotización blue
    const fetchSecurityStatus = useCallback(async () => {
        if (!token) return;
        try {
            setLoadingSecurity(true);
            const res = await fetch('/api/admin/tesoreria-estrategica/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.ok) {
                setSecurityStatus(json.status);
            }
        } catch {
            // Silencioso
        } finally {
            setLoadingSecurity(false);
        }
    }, [token]);

    const fetchDolarRate = useCallback(async () => {
        try {
            const res = await fetch('/api/dolar-blue');
            if (res.ok) {
                const json = await res.json();
                if (json?.ok && json.data?.rate) {
                    setDolarBlueRate(Number(json.data.rate));
                }
            }
        } catch {
            // Silencioso
        }
    }, []);

    useEffect(() => {
        fetchSecurityStatus();
        fetchDolarRate();
    }, [fetchSecurityStatus, fetchDolarRate]);

    // 2. Cargar datos del dashboard cuando se dispone de treasuryToken
    const loadDashboardData = useCallback(async () => {
        if (!token || !treasuryToken) return;
        try {
            setLoadingData(true);
            const res = await fetch('/api/admin/tesoreria-estrategica/data', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                }
            });

            if (res.status === 401 || res.status === 403) {
                const errData = await res.json().catch(() => ({}));
                if (errData.requirePin) {
                    sessionStorage.removeItem('as_treasury_token');
                    setTreasuryToken(null);
                    toast.error(errData.message || 'La sesión temporal de PIN ha expirado.');
                    fetchSecurityStatus();
                    return;
                }
            }

            const json = await res.json();
            if (json.ok) {
                setDashboardData(json.data);
            }
        } catch {
            toast.error('Error al cargar datos de tesorería');
        } finally {
            setLoadingData(false);
        }
    }, [token, treasuryToken, fetchSecurityStatus]);

    useEffect(() => {
        if (treasuryToken) {
            loadDashboardData();
        }
    }, [treasuryToken, loadDashboardData]);

    // 3. Temporizador de 15 minutos en el cliente
    useEffect(() => {
        if (!treasuryToken) return;

        setSessionSecondsLeft(900);
        const timer = setInterval(() => {
            setSessionSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    sessionStorage.removeItem('as_treasury_token');
                    setTreasuryToken(null);
                    toast.error('Sesión de 15 minutos finalizada por seguridad.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [treasuryToken]);

    const handleAuthorized = (newTreasuryToken) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('as_treasury_token', newTreasuryToken);
        }
        setTreasuryToken(newTreasuryToken);
    };

    const handleLockSession = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('as_treasury_token');
        }
        setTreasuryToken(null);
        toast.success('Sesión privada bloqueada.');
    };

    const formatSessionTimer = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleConfirmInitialCutoff = async () => {
        if (!token || !treasuryToken) return;
        try {
            setIsConfirmingCutoff(true);
            const res = await fetch('/api/admin/tesoreria-estrategica/confirm-initial-cutoff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    reason: 'Confirmación de corte inicial sobre saldo real actual'
                })
            });
            const data = await res.json();
            if (data.ok) {
                toast.success(data.message || 'Corte inicial confirmado exitosamente.');
                loadDashboardData();
            } else {
                toast.error(data.message || 'Error al confirmar corte.');
            }
        } catch {
            toast.error('Error de red al confirmar corte inicial.');
        } finally {
            setIsConfirmingCutoff(false);
        }
    };

    // Renderizar puerta de acceso por PIN si no está autenticado
    if (!treasuryToken) {
        return (
            <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-24">
                <TreasuryPinGate
                    securityStatus={securityStatus}
                    onAuthorized={handleAuthorized}
                    onRefreshStatus={fetchSecurityStatus}
                />
            </div>
        );
    }

    const summary = dashboardData?.summary || {};
    const boxes = dashboardData?.boxes || [];
    const accounts = dashboardData?.accounts || [];
    const auditInfo = dashboardData?.auditInfo || {};
    const config = dashboardData?.config || {};
    const batchLogs = dashboardData?.batchLogs || [];
    const verification = dashboardData?.verification || {
        status: auditInfo.isReconciliationConfirmed ? 'confirmado' : 'pendiente_verificar',
        hasPhysicalCashInconsistency: auditInfo.hasPhysicalCashInconsistency
    };
    const trackerAudit = dashboardData?.trackerAudit || {};
    const unassignedIncomeCards = dashboardData?.unassignedIncomeCards || [];
    const planning = dashboardData?.planning || {};
    const categoryRules = dashboardData?.categoryRules || [];
    const pendingInstallments = dashboardData?.pendingInstallments || [];
    const recentAdjustments = dashboardData?.recentAdjustments || [];
    const recentReconciliations = dashboardData?.recentReconciliations || [];

    // Cálculo riguroso de Liquidez Neta Equivalente (incluye saldos negativos)
    const totalArsInUsdBlue = dolarBlueRate && summary.totalCuentasARS !== undefined
        ? (summary.totalCuentasARS / dolarBlueRate)
        : 0;

    const liquidezNetaEquivalenteUSD = (summary.totalCuentasUSD || 0) + totalArsInUsdBlue;

    return (
        <div className="mx-auto w-full max-w-7xl p-4 md:p-6 pb-24 space-y-6">
            {/* Header Superior y Barra de Sesión Segura */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-crm-border pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/15 text-purple-300">
                            <Lock size={18} />
                        </span>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight text-white">
                                Tesorería Estratégica
                            </h1>
                            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
                                Dirección Privada
                            </span>
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-crm-fg-muted">
                        Control patrimonial de liquidez real, conciliación de cuentas y asignación por cajas de capital.
                    </p>
                </div>

                {/* Acciones de Seguridad y Temporizador */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
                        <ShieldCheck size={16} />
                        <span>Sesión Activa:</span>
                        <span className="font-mono font-black text-white">{formatSessionTimer(sessionSecondsLeft)}</span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsChangePinOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3 py-1.5 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        title="Cambiar PIN"
                    >
                        <KeyRound size={14} /> Cambiar PIN
                    </button>

                    <button
                        type="button"
                        onClick={handleLockSession}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-crm-red/10 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-crm-red/20 transition-colors"
                        title="Bloquear sesión privada"
                    >
                        <Lock size={14} /> Bloquear
                    </button>
                </div>
            </div>

            {/* Alerta de Verificación de Saldos (si hay inconsistencias o falta conciliación) */}
            {verification.status === 'pendiente_verificar' && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-amber-200">
                                        Saldos pendientes de verificar
                                    </h3>
                                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-300 uppercase">
                                        Requiere Conciliación
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-amber-100/90 leading-relaxed">
                                    {verification.hasPhysicalCashInconsistency
                                        ? 'Se detectó saldo negativo en efectivo físico en mano. En la realidad física no es posible tener billetes negativos; requiere arqueo y conciliación formal con fecha de corte.'
                                        : 'Aún no se ha completado una conciliación formal de saldos reales con fecha de corte. Las proyecciones y recomendaciones de compra son preliminares.'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsReconcileOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-500 transition-colors shrink-0 shadow-lg shadow-amber-600/20"
                        >
                            <Scale size={15} /> Iniciar Conciliación Formal
                        </button>
                    </div>
                </div>
            )}

            {/* Barra de Estado de Conciliación, Saldos y Acciones Rápidas */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-crm-surface to-emerald-950/30 p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold">
                                🛡️
                            </span>
                            <h3 className="text-sm font-bold text-white">
                                {auditInfo.statusLabel || (auditInfo.isReconciliationConfirmed ? 'Corte Inicial Confirmado' : 'Pendiente de Corte Inicial')}
                            </h3>
                            {auditInfo.isReconciliationConfirmed ? (
                                <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                    Corte Confirmado
                                </span>
                            ) : (
                                <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                                    Pendiente de Corte
                                </span>
                            )}
                        </div>
                        <p className="text-crm-fg-muted max-w-3xl leading-relaxed">
                            Total en cuentas: <strong className="text-white font-mono">{formatMoney(summary.totalCuentasARS, 'ARS')}</strong>
                            {summary.totalCuentasUSD > 0 && <span> / <strong className="text-emerald-400 font-mono">{formatMoney(summary.totalCuentasUSD, 'USD')}</strong></span>}
                            {' '}= Asignado a cajas: <strong className="text-purple-300 font-mono">{formatMoney(summary.totalCajasARS, 'ARS')}</strong> + Sin asignar: <strong className="text-crm-fg font-mono">{formatMoney(summary.unallocatedARS, 'ARS')}</strong>.
                        </p>
                        {!auditInfo.isReconciliationConfirmed && (
                            <div className="pt-1 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    disabled={isConfirmingCutoff}
                                    onClick={handleConfirmInitialCutoff}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
                                >
                                    <CheckCircle2 size={13} />
                                    {isConfirmingCutoff ? 'Confirmando...' : 'Confirmar corte inicial sobre este saldo'}
                                </button>
                                <span className="text-[11px] text-crm-fg-muted">
                                    (Fija el saldo actual de tus cuentas sin generar ingresos duplicados)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 4 Botones de Acción Clave */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsOrganizeInitialOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/15 px-3.5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/25 transition-colors"
                            title="Repartir saldo confirmado entre las 8 cajas"
                        >
                            <SlidersHorizontal size={14} /> Organizar Saldo Inicial
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsCollectAndDistributeOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                            title="Cobrar en cuenta y distribuir a cajas en un solo paso"
                        >
                            <ArrowDownRight size={14} /> Cobrar y Distribuir
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsBatchRegularizeOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3.5 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                            title="Regularizar cuotas cobradas antes del corte"
                        >
                            <FileCheck size={14} /> Regularizar Cuotas en Lote
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsSetupWizardOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3.5 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                            title="Asistente de configuración guiada"
                        >
                            <Sparkles size={14} className="text-purple-300" /> Configuración Guiada
                        </button>
                    </div>
                </div>
            </div>

            {/* Tarjetas KPI de Liquidez Real y Asignación */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Saldo Real USD */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Liquidez en Cuentas (USD)
                        </p>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                            <DollarSign size={18} />
                        </span>
                    </div>
                    <p className="mt-3 font-mono text-2xl font-black text-white">
                        {formatMoney(summary.totalCuentasUSD, 'USD')}
                    </p>
                    <p className="mt-2 text-xs text-crm-fg-muted">
                        Físico: {formatMoney(summary.totalEfectivoUSD, 'USD')} · Bancos: {formatMoney(summary.totalBancosUSD, 'USD')}
                    </p>
                </div>

                {/* Saldo Real ARS */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Liquidez en Cuentas (ARS)
                        </p>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                            <Wallet size={18} />
                        </span>
                    </div>
                    <p className={`mt-3 font-mono text-2xl font-black ${(summary.totalCuentasARS || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                        {formatMoney(summary.totalCuentasARS, 'ARS')}
                    </p>
                    <p className="mt-2 text-xs text-crm-fg-muted">
                        Físico: {formatMoney(summary.totalEfectivoARS, 'ARS')} · Bancos: {formatMoney(summary.totalBancosARS, 'ARS')}
                    </p>
                </div>

                {/* Liquidez Neta Equivalente (Renombrado según especificación) */}
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                                Liquidez Neta Equivalente
                            </p>
                            <span className="text-[9px] text-purple-300/70 block">
                                Solo dinero en cuentas · No incluye stock
                            </span>
                        </div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                            <Sparkles size={18} />
                        </span>
                    </div>
                    <p className={`mt-3 font-mono text-2xl font-black ${liquidezNetaEquivalenteUSD < 0 ? 'text-red-400' : 'text-purple-200'}`}>
                        {formatMoney(liquidezNetaEquivalenteUSD, 'USD')}
                    </p>
                    <p className="mt-2 text-xs text-purple-300/80">
                        {dolarBlueRate ? `Blue: ARS ${formatNumber(dolarBlueRate)} · ARS: ${formatMoney(totalArsInUsdBlue, 'USD')}` : 'Cotización no disponible'}
                    </p>
                </div>

                {/* Asignación en Cajas */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Asignación en Cajas (8 Cajas)
                        </p>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                            <SlidersHorizontal size={18} />
                        </span>
                    </div>
                    <p className="mt-3 font-mono text-lg font-black text-white">
                        {formatMoney(summary.totalCajasUSD, 'USD')} <span className="text-xs text-crm-fg-muted font-normal">/ {formatMoney(summary.totalCajasARS, 'ARS')}</span>
                    </p>
                    <p className="mt-2 text-xs text-crm-fg-muted">
                        No asignado: <span className="font-mono font-bold text-purple-300">USD {formatNumber(summary.unallocatedUSD || 0)}</span> / <span className="font-mono font-bold text-crm-fg">ARS {formatNumber(summary.unallocatedARS || 0)}</span>
                    </p>
                </div>
            </div>

            {/* Pestañas de Navegación del Módulo */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-crm-border pb-2 text-xs font-bold">
                <button
                    type="button"
                    onClick={() => setActiveTab('cajas')}
                    className={`rounded-xl px-4 py-2 transition-colors whitespace-nowrap ${activeTab === 'cajas' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-white'}`}
                >
                    1. Cajas y Metas (8)
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('cobros')}
                    className={`rounded-xl px-4 py-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'cobros' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-white'}`}
                >
                    <ArrowDownRight size={13} /> 2. Distribuir Cobro {unassignedIncomeCards.length > 0 && <span className="rounded-full bg-purple-400/30 px-1.5 py-0.2 text-[10px] text-purple-200">{unassignedIncomeCards.length}</span>}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('planificacion')}
                    className={`rounded-xl px-4 py-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'planificacion' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-white'}`}
                >
                    <TrendingUp size={13} /> 3. Planificación y Compras
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('reglas')}
                    className={`rounded-xl px-4 py-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'reglas' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-white'}`}
                >
                    <SlidersHorizontal size={13} /> 4. Reglas y Presupuesto
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('cuentas')}
                    className={`rounded-xl px-4 py-2 transition-colors whitespace-nowrap ${activeTab === 'cuentas' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-white'}`}
                >
                    5. Cuentas y Fondos Reales
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('cuotas')}
                    className={`rounded-xl px-4 py-2 transition-colors whitespace-nowrap ${activeTab === 'cuotas' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-white'}`}
                >
                    6. Cuotas Históricas
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('auditoria')}
                    className={`rounded-xl px-4 py-2 transition-colors whitespace-nowrap ${activeTab === 'auditoria' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-white'}`}
                >
                    7. Historial y Auditoría
                </button>
            </div>

            {/* PESTAÑA 1: CAJAS Y METAS (8 CAJAS COMPLETAS) */}
            {activeTab === 'cajas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">Cajas Estratégicas y Metas por Gasto</h2>
                            <p className="text-xs text-crm-fg-muted">
                                Las cajas determinan para qué está reservado cada fondo. Las metas se basan en compromisos reales y previsiones configurables.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsTransferOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-crm-border bg-crm-surface px-3.5 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        >
                            <ArrowRightLeft size={14} /> Traspaso entre Cajas
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {boxes.map((box) => {
                            const Icon = BOX_ICONS[box.key] || Briefcase;
                            const colors = BOX_COLORS[box.key] || BOX_COLORS.operativa;

                            return (
                                <div
                                    key={box._id || box.key}
                                    className={`flex flex-col justify-between rounded-2xl border ${colors.border} bg-crm-surface p-5 transition-all hover:border-purple-500/50`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.iconBg}`}>
                                                    <Icon size={20} />
                                                </span>
                                                <div>
                                                    <h3 className="text-sm font-black text-white">{box.name}</h3>
                                                    {box.targetPercent > 0 && (
                                                        <span className={`inline-block mt-0.5 rounded border px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${colors.badge}`}>
                                                            Meta: {box.targetPercent}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditingBox(box)}
                                                title={`Asignar fondos o configurar meta de ${box.name}`}
                                                className="rounded-lg p-1.5 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white transition-colors"
                                            >
                                                <Edit3 size={15} />
                                            </button>
                                        </div>

                                        <p className="mt-3 text-xs leading-relaxed text-crm-fg-muted min-h-[36px]">
                                            {box.description}
                                        </p>

                                        {/* Detalle Financiero de la Caja */}
                                        <div className="mt-4 pt-3 border-t border-crm-border/60 space-y-2 text-xs">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Saldo Asignado</span>
                                                <div className="text-right">
                                                    <span className={`font-mono font-black ${colors.accent}`}>
                                                        {formatMoney(box.balanceUSD, 'USD')}
                                                    </span>
                                                    <span className="font-mono font-bold text-white block text-[11px]">
                                                        {formatMoney(box.balanceARS, 'ARS')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Compromisos Pendientes */}
                                            {(box.commitmentsARS > 0 || box.commitmentsUSD > 0) && (
                                                <div className="flex items-baseline justify-between pt-1 border-t border-crm-border/40 text-red-400">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Compromisos</span>
                                                    <span className="font-mono font-bold text-[11px]">
                                                        -{box.commitmentsUSD > 0 ? formatMoney(box.commitmentsUSD, 'USD') : formatMoney(box.commitmentsARS, 'ARS')}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Disponible Neto */}
                                            <div className="flex items-baseline justify-between pt-1 border-t border-crm-border/40 text-white">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">Disponible Neto</span>
                                                <span className="font-mono font-black text-xs text-emerald-400">
                                                    {box.availableUSD > 0 ? formatMoney(box.availableUSD, 'USD') : formatMoney(box.availableARS || 0, 'ARS')}
                                                </span>
                                            </div>
                                            {box.uncoveredCommitmentsARS > 0 && (
                                                <div className="flex items-baseline justify-between text-[10px] text-amber-300">
                                                    <span>Compromisos por fondear:</span>
                                                    <span className="font-mono font-bold">ARS {formatNumber(box.uncoveredCommitmentsARS)}</span>
                                                </div>
                                            )}

                                            {/* Meta y Cobertura */}
                                            {(box.targetMoneyARS > 0 || box.targetMoneyUSD > 0) && (
                                                <div className="pt-2 border-t border-crm-border/40">
                                                    <div className="flex items-baseline justify-between text-[10px]">
                                                        <span className="text-crm-fg-muted">Meta Requerida:</span>
                                                        <span className="font-mono font-bold text-purple-300">
                                                            {box.targetMoneyUSD > 0 ? formatMoney(box.targetMoneyUSD, 'USD') : formatMoney(box.targetMoneyARS, 'ARS')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline justify-between text-[10px] mt-0.5">
                                                        <span className="text-crm-fg-muted">Cobertura:</span>
                                                        <span className="font-bold text-white">
                                                            {box.targetMoneyUSD > 0 ? `${box.coveragePercentUSD}%` : `${box.coveragePercentARS}%`}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Nota de información faltante si corresponde */}
                                            {box.missingDataNote && (
                                                <p className="text-[10px] text-amber-300/80 italic pt-1 border-t border-crm-border/30">
                                                    ℹ️ {box.missingDataNote}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-crm-border/40 flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setEditingBox(box)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors"
                                        >
                                            <Edit3 size={13} /> Editar saldo / monto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsTransferOpen(true)}
                                            className="text-xs font-bold text-purple-300/80 hover:text-white transition-colors"
                                        >
                                            Traspasar →
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* PESTAÑA 2: BANDEJA DE COBROS ("DISTRIBUIR COBRO") */}
            {activeTab === 'cobros' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">Bandeja de Cobros Reales Sin Distribuir</h2>
                            <p className="text-xs text-crm-fg-muted">
                                Cobros reales ingresados en cuentas posteriores al corte. Distribuí los fondos propios a cada caja según sus prioridades y faltantes.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsCollectAndDistributeOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20 shrink-0"
                        >
                            <ArrowDownRight size={14} /> Registrar Nuevo Cobro y Distribuir
                        </button>
                    </div>

                    <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                        <div className="p-4 border-b border-crm-border bg-crm-bg flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-crm-fg">Cobros Pendientes de Asignar</h3>
                            <span className="text-xs font-bold text-purple-300">
                                {unassignedIncomeCards.length} cobros disponibles
                            </span>
                        </div>

                        <div className="divide-y divide-crm-border">
                            {unassignedIncomeCards.length === 0 ? (
                                <p className="p-8 text-center text-xs text-crm-fg-muted italic">
                                    Todos los cobros e ingresos reales posteriores a la conciliación han sido distribuidos a cajas.
                                </p>
                            ) : (
                                unassignedIncomeCards.map((inc) => (
                                    <div key={inc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:bg-crm-surface-raised transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-white text-sm">{inc.description}</span>
                                                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                                    {inc.category}
                                                </span>
                                            </div>
                                            <p className="text-crm-fg-muted">
                                                Fecha: {new Date(inc.date).toLocaleDateString('es-AR')} · Cuenta: {inc.accountName}
                                            </p>
                                            {inc.thirdPartyNote && (
                                                <p className="text-[11px] text-amber-300 font-medium">
                                                    ⚠️ {inc.thirdPartyNote}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-right">
                                                <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">Capital Propio</span>
                                                <span className="font-mono text-base font-black text-emerald-400">
                                                    {formatMoney(inc.propioAmount, inc.currency)}
                                                </span>
                                                {inc.tercerosAmount > 0 && (
                                                    <span className="text-[10px] text-crm-fg-muted block">
                                                        (Terceros: {formatMoney(inc.tercerosAmount, inc.currency)})
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setDistributingIncome(inc)}
                                                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                                            >
                                                <ArrowDownRight size={14} /> Distribuir a Cajas
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* PESTAÑA 3: PLANIFICACIÓN Y COMPRAS */}
            {activeTab === 'planificacion' && (
                <TreasuryPlanningTab
                    planning={planning}
                    summary={summary}
                    boxes={boxes}
                    verificationStatus={verification.status}
                />
            )}

            {/* PESTAÑA 4: REGLAS Y PRESUPUESTO */}
            {activeTab === 'reglas' && (
                <TreasuryCategoryRulesTab
                    categoryRules={categoryRules}
                    treasuryToken={treasuryToken}
                    onSuccess={loadDashboardData}
                />
            )}

            {/* PESTAÑA 5: CUENTAS Y FONDOS REALES */}
            {activeTab === 'cuentas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">Cuentas y Fondos Reales (Dónde está el Dinero)</h2>
                            <p className="text-xs text-crm-fg-muted">
                                Las cuentas representan dónde está el dinero físicamente o electrónicamente (efectivo, bancos o billeteras).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsReconcileOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                        >
                            <Scale size={14} /> Asistente de Conciliación Formal
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {accounts.map((acc) => (
                            <div key={acc._id} className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-white">{acc.name}</h3>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                            {acc.type} · {acc.currency}
                                        </span>
                                    </div>
                                    <span className="rounded-lg bg-crm-surface-raised px-2 py-1 text-xs font-bold text-crm-fg">
                                        {acc.currency}
                                    </span>
                                </div>

                                {acc.issue && (
                                    <div className={`mt-3 rounded-xl border p-2.5 text-xs ${acc.issue.severity === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
                                        <p className="font-bold flex items-center gap-1.5">
                                            <AlertTriangle size={13} /> {acc.issue.label}
                                        </p>
                                        <p className="text-[10px] mt-0.5 leading-relaxed">{acc.issue.description}</p>
                                    </div>
                                )}

                                <div className="mt-4 pt-3 border-t border-crm-border">
                                    <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">Saldo en Cuenta</span>
                                    <p className={`mt-1 font-mono text-xl font-black ${acc.balance < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {formatMoney(acc.balance, acc.currency)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PESTAÑA 6: SANEAMIENTO DE CUOTAS HISTÓRICAS */}
            {activeTab === 'cuotas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">Saneamiento y Regularización de Cuotas Históricas</h2>
                            <p className="text-xs text-crm-fg-muted">
                                Marcá como pagadas las cuotas que tus clientes abonaron en el pasado agrupadas por venta sin duplicar saldo en caja.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsBatchRegularizeOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                        >
                            <FileCheck size={14} /> Regularizar Cuotas en Lote
                        </button>
                    </div>

                    <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-crm-border bg-crm-bg text-crm-fg-muted font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3">Vehículo</th>
                                    <th className="p-3">Concepto</th>
                                    <th className="p-3 text-right">Vencimiento</th>
                                    <th className="p-3 text-right">Importe</th>
                                    <th className="p-3 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-border">
                                {pendingInstallments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-crm-fg-muted italic">
                                            No hay cuotas pendientes para regularizar.
                                        </td>
                                    </tr>
                                ) : (
                                    pendingInstallments.map((inst) => (
                                        <tr key={inst.id} className="hover:bg-crm-surface-raised transition-colors">
                                            <td className="p-3 font-bold text-white">{inst.customerName}</td>
                                            <td className="p-3 text-crm-fg-muted">{inst.vehicleName}</td>
                                            <td className="p-3 text-crm-fg-muted">{inst.concept}</td>
                                            <td className="p-3 text-right text-crm-fg-muted">
                                                {new Date(inst.dueDate).toLocaleDateString('es-AR')}
                                            </td>
                                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                                                {formatMoney(inst.amount, inst.currency)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                                                    {inst.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PESTAÑA 7: AUDITORÍA Y CONCILIACIONES */}
            {activeTab === 'auditoria' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-base font-black text-white">Historial de Conciliaciones y Ajustes</h2>
                        <p className="text-xs text-crm-fg-muted">
                            Registro inmutable de cortes de conciliación y ajustes patrimoniales con fecha, usuario y motivo.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                        <div className="p-4 border-b border-crm-border bg-crm-bg">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-crm-fg">Sesiones de Conciliación Realizadas</h3>
                        </div>
                        <div className="divide-y divide-crm-border">
                            {recentReconciliations.length === 0 ? (
                                <p className="p-6 text-center text-xs text-crm-fg-muted italic">
                                    No se registraron sesiones de conciliación todavía.
                                </p>
                            ) : (
                                recentReconciliations.map((rec) => (
                                    <div key={rec._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">
                                                    Fecha de Corte: {new Date(rec.cutoffDate).toLocaleDateString('es-AR')}
                                                </span>
                                                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                                    {rec.status}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-crm-fg-muted">{rec.reason} · Por: {rec.confirmedBy}</p>
                                        </div>
                                        <div className="text-right font-mono">
                                            <p className="font-bold text-white">
                                                Dif. USD: <span className={rec.totalDiffUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}>{rec.totalDiffUSD > 0 ? '+' : ''}{formatMoney(rec.totalDiffUSD, 'USD')}</span>
                                            </p>
                                            <p className="text-crm-fg-muted">
                                                Dif. ARS: <span className={rec.totalDiffARS >= 0 ? 'text-emerald-400' : 'text-red-400'}>{rec.totalDiffARS > 0 ? '+' : ''}{formatMoney(rec.totalDiffARS, 'ARS')}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-crm-border bg-crm-surface overflow-hidden">
                        <div className="p-4 border-b border-crm-border bg-crm-bg">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-crm-fg">Últimos Asientos de Ajuste Patrimonial</h3>
                        </div>
                        <div className="divide-y divide-crm-border">
                            {recentAdjustments.length === 0 ? (
                                <p className="p-6 text-center text-xs text-crm-fg-muted italic">Sin ajustes recientes.</p>
                            ) : (
                                recentAdjustments.map((tx) => (
                                    <div key={tx._id} className="p-3.5 flex items-center justify-between text-xs hover:bg-crm-surface-raised transition-colors">
                                        <div>
                                            <span className="font-bold text-white">{tx.description}</span>
                                            <span className="text-crm-fg-muted ml-2">{new Date(tx.date).toLocaleDateString('es-AR')}</span>
                                            <p className="text-[11px] text-crm-fg-muted mt-0.5">{tx.notes}</p>
                                        </div>
                                        <span className={`font-mono font-bold ${tx.type === 'Ingreso' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {tx.type === 'Ingreso' ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALES */}
            <TreasuryChangePinModal
                isOpen={isChangePinOpen}
                onClose={() => setIsChangePinOpen(false)}
                onPinChanged={handleAuthorized}
            />

            <TreasuryReconciliationModal
                isOpen={isReconcileOpen}
                onClose={() => setIsReconcileOpen(false)}
                accounts={accounts}
                pendingInstallments={pendingInstallments}
                pendingCollections={trackerAudit}
                treasuryToken={treasuryToken}
                onReconciliationSuccess={loadDashboardData}
            />

            <TreasuryBoxTransferModal
                isOpen={isTransferOpen}
                onClose={() => setIsTransferOpen(false)}
                boxes={boxes}
                treasuryToken={treasuryToken}
                onTransferSuccess={loadDashboardData}
            />

            <TreasuryInstallmentRegularizeModal
                isOpen={isRegularizeOpen}
                onClose={() => setIsRegularizeOpen(false)}
                installments={pendingInstallments}
                treasuryToken={treasuryToken}
                onSuccess={loadDashboardData}
            />

            <TreasuryBatchRegularizeModal
                isOpen={isBatchRegularizeOpen}
                onClose={() => setIsBatchRegularizeOpen(false)}
                treasuryToken={treasuryToken}
                batchLogs={batchLogs}
                onSuccess={loadDashboardData}
            />

            <TreasuryOrganizeInitialModal
                isOpen={isOrganizeInitialOpen}
                onClose={() => setIsOrganizeInitialOpen(false)}
                boxes={boxes}
                summary={summary}
                config={config}
                treasuryToken={treasuryToken}
                onSuccess={loadDashboardData}
            />

            <TreasuryCollectAndDistributeModal
                isOpen={isCollectAndDistributeOpen}
                onClose={() => setIsCollectAndDistributeOpen(false)}
                accounts={accounts}
                boxes={boxes}
                pendingInstallments={pendingInstallments}
                treasuryToken={treasuryToken}
                onSuccess={loadDashboardData}
            />

            <TreasurySetupWizardModal
                isOpen={isSetupWizardOpen}
                onClose={() => setIsSetupWizardOpen(false)}
                summary={summary}
                accounts={accounts}
                config={config}
                categoryRules={categoryRules}
                treasuryToken={treasuryToken}
                onSuccess={loadDashboardData}
            />

            <TreasuryEditBoxModal
                isOpen={Boolean(editingBox)}
                onClose={() => setEditingBox(null)}
                box={editingBox}
                unallocatedUSD={summary.unallocatedUSD}
                unallocatedARS={summary.unallocatedARS}
                treasuryToken={treasuryToken}
                onSuccess={loadDashboardData}
            />

            <TreasuryDistributeIncomeModal
                isOpen={Boolean(distributingIncome)}
                onClose={() => setDistributingIncome(null)}
                income={distributingIncome}
                boxes={boxes}
                treasuryToken={treasuryToken}
                onSuccess={loadDashboardData}
            />
        </div>
    );
}
