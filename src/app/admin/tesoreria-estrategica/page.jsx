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
    Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import TreasuryPinGate from '../../../components/crm/treasury/TreasuryPinGate';
import TreasuryChangePinModal from '../../../components/crm/treasury/TreasuryChangePinModal';
import TreasuryReconciliationModal from '../../../components/crm/treasury/TreasuryReconciliationModal';
import TreasuryBoxTransferModal from '../../../components/crm/treasury/TreasuryBoxTransferModal';
import TreasuryInstallmentRegularizeModal from '../../../components/crm/treasury/TreasuryInstallmentRegularizeModal';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

const BOX_ICONS = {
    operativa: Briefcase,
    personal: User,
    impuestos: Landmark,
    deudas: CreditCard,
    reserva: ShieldCheck
};

const BOX_COLORS = {
    emerald: {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        iconBg: 'bg-emerald-500/20 text-emerald-300',
        accent: 'text-emerald-400'
    },
    purple: {
        border: 'border-purple-500/30',
        bg: 'bg-purple-500/10',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        iconBg: 'bg-purple-500/20 text-purple-300',
        accent: 'text-purple-400'
    },
    amber: {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        iconBg: 'bg-amber-500/20 text-amber-300',
        accent: 'text-amber-400'
    },
    red: {
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
        badge: 'bg-red-500/20 text-red-300 border-red-500/30',
        iconBg: 'bg-red-500/20 text-red-300',
        accent: 'text-red-400'
    },
    blue: {
        border: 'border-blue-500/30',
        bg: 'bg-blue-500/10',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        iconBg: 'bg-blue-500/20 text-blue-300',
        accent: 'text-blue-400'
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
    const [activeTab, setActiveTab] = useState('cajas'); // 'cajas' | 'cuentas' | 'auditoria'

    // Modales
    const [isChangePinOpen, setIsChangePinOpen] = useState(false);
    const [isReconcileOpen, setIsReconcileOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isRegularizeOpen, setIsRegularizeOpen] = useState(false);

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
        } catch (err) {
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

        setSessionSecondsLeft(900); // 15 minutos
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
    const pendingInstallments = dashboardData?.pendingInstallments || [];
    const pendingCollections = dashboardData?.pendingCollections || {};
    const recentAdjustments = dashboardData?.recentAdjustments || [];
    const recentReconciliations = dashboardData?.recentReconciliations || [];

    // Equivalente USD Blue del total en pesos
    const totalArsInUsdBlue = dolarBlueRate && summary.totalCuentasARS > 0
        ? Math.round((summary.totalCuentasARS / dolarBlueRate) * 100) / 100
        : null;

    const totalPatrimonioEquivUSD = (summary.totalCuentasUSD || 0) + (totalArsInUsdBlue || 0);

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

            {/* Banner de Referencia Informativa (USD 5.000 y Tracker) */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-crm-surface to-emerald-950/30 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 text-xs">
                                💡
                            </span>
                            <h3 className="text-sm font-bold text-white">
                                Parámetro de Referencia: USD 5.000 de Liquidez
                            </h3>
                            <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                                Auditoría Inicial
                            </span>
                        </div>
                        <p className="text-xs text-crm-fg-muted max-w-2xl leading-relaxed">
                            Monto base para la configuración inicial. Confirmá su distribución exacta entre tus cuentas reales mediante el <strong>Asistente de Conciliación</strong> con fecha de corte. Las operaciones pendientes como la <strong>Chevrolet Tracker Premier</strong> no forman parte de la liquidez de caja hasta su cobro efectivo.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsReconcileOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-500 transition-colors shadow-lg shadow-purple-600/20"
                        >
                            <Scale size={16} /> Conciliar Saldos Reales
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsTransferOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-crm-border bg-crm-surface px-4 py-2.5 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        >
                            <ArrowRightLeft size={16} /> Traspaso entre Cajas
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
                            Liquidez Real en Cuentas (USD)
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
                            Liquidez Real en Cuentas (ARS)
                        </p>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                            <Wallet size={18} />
                        </span>
                    </div>
                    <p className="mt-3 font-mono text-2xl font-black text-white">
                        {formatMoney(summary.totalCuentasARS, 'ARS')}
                    </p>
                    <p className="mt-2 text-xs text-crm-fg-muted">
                        Físico: {formatMoney(summary.totalEfectivoARS, 'ARS')} · Bancos: {formatMoney(summary.totalBancosARS, 'ARS')}
                    </p>
                </div>

                {/* Equivalente Blue Total */}
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-5">
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                            Patrimonio Total Estimado (USD Blue)
                        </p>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                            <Sparkles size={18} />
                        </span>
                    </div>
                    <p className="mt-3 font-mono text-2xl font-black text-purple-200">
                        USD {formatNumber(Math.round(totalPatrimonioEquivUSD))}
                    </p>
                    <p className="mt-2 text-[11px] text-purple-300/80">
                        {dolarBlueRate ? `Blue Ámbito: ARS ${formatNumber(dolarBlueRate)}` : 'Dólar Blue hoy'}
                    </p>
                </div>

                {/* Estado de Asignación en Cajas */}
                <div className="rounded-2xl border border-crm-border bg-crm-surface p-5">
                    <div className="flex items-start justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">
                            Asignación en Cajas
                        </p>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                            <SlidersHorizontal size={18} />
                        </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <p className="font-mono text-xl font-black text-white">
                            USD {formatNumber(summary.totalCajasUSD)}
                        </p>
                        <span className="text-xs text-crm-fg-muted">asignados</span>
                    </div>
                    <p className="mt-2 text-xs text-crm-fg-muted">
                        Sin asignar: USD {formatNumber(summary.unallocatedUSD)} · ARS {formatNumber(summary.unallocatedARS)}
                    </p>
                </div>
            </div>

            {/* Pestañas de Vista */}
            <div className="flex items-center gap-2 border-b border-crm-border pb-2">
                {[
                    { id: 'cajas', label: 'Cajas Estratégicas de Capital', icon: Briefcase },
                    { id: 'cuentas', label: 'Cuentas Reales (Dónde está)', icon: Landmark },
                    { id: 'cuotas', label: 'Regularización de Cuotas', icon: FileCheck },
                    { id: 'auditoria', label: 'Historial y Conciliaciones', icon: History }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black transition-colors rounded-xl ${
                                isActive
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg'
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* PESTAÑA 1: CAJAS ESTRATÉGICAS */}
            {activeTab === 'cajas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">Cajas de Reserva y Destino de Fondos</h2>
                            <p className="text-xs text-crm-fg-muted">
                                Las cajas representan <strong>para qué está reservado</strong> el dinero, sin importar en qué cuenta física o bancaria se encuentre.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsTransferOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-colors"
                        >
                            <ArrowRightLeft size={14} /> Mover entre Cajas
                        </button>
                    </div>

                    {/* Grid de Cajas */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {boxes.map((box) => {
                            const Icon = BOX_ICONS[box.key] || Briefcase;
                            const colors = BOX_COLORS[box.color] || BOX_COLORS.emerald;

                            return (
                                <div
                                    key={box.key}
                                    className={`relative overflow-hidden rounded-2xl border ${colors.border} bg-crm-surface p-5 flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.iconBg}`}>
                                                    <Icon size={20} />
                                                </span>
                                                <div>
                                                    <h3 className="text-sm font-black text-white">{box.name}</h3>
                                                    <span className={`inline-block mt-0.5 rounded border px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${colors.badge}`}>
                                                        Meta: {box.targetPercent || 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="mt-3 text-xs leading-relaxed text-crm-fg-muted min-h-[36px]">
                                            {box.description}
                                        </p>

                                        <div className="mt-4 pt-4 border-t border-crm-border/60 space-y-2">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">Reserva USD</span>
                                                <span className={`font-mono text-lg font-black ${colors.accent}`}>
                                                    {formatMoney(box.balanceUSD, 'USD')}
                                                </span>
                                            </div>
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted">Reserva ARS</span>
                                                <span className="font-mono text-sm font-bold text-white">
                                                    {formatMoney(box.balanceARS, 'ARS')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-crm-border/40 flex items-center justify-between">
                                        <span className="text-[10px] text-crm-fg-muted">
                                            {box.history?.length || 0} movimientos
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsTransferOpen(true)}
                                            className="text-xs font-bold text-purple-300 hover:text-white transition-colors"
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

            {/* PESTAÑA 2: CUENTAS REALES */}
            {activeTab === 'cuentas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">Cuentas y Fondos Reales</h2>
                            <p className="text-xs text-crm-fg-muted">
                                Las cuentas representan <strong>dónde está el dinero físicamente o electrónicamente</strong> (efectivo, bancos o billeteras).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsReconcileOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors"
                        >
                            <Scale size={14} /> Asistente de Conciliación
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
                                <div className="mt-4 pt-3 border-t border-crm-border">
                                    <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">Saldo Real Conciliado</span>
                                    <p className="mt-1 font-mono text-xl font-black text-emerald-400">
                                        {formatMoney(acc.balance, acc.currency)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PESTAÑA 3: REGULARIZACIÓN DE CUOTAS */}
            {activeTab === 'cuotas' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-black text-white">Saneamiento y Regularización de Cuotas Históricas</h2>
                            <p className="text-xs text-crm-fg-muted">
                                Marcá como pagadas las cuotas que tus clientes abonaron en el pasado sin que el sistema duplique el saldo en caja.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsRegularizeOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-black text-white hover:bg-purple-500 transition-colors"
                        >
                            <FileCheck size={14} /> Regularizar Selección
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

            {/* PESTAÑA 4: AUDITORÍA Y CONCILIACIONES */}
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

                    {/* Ajustes patrimoniales */}
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
                pendingCollections={pendingCollections}
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
        </div>
    );
}
