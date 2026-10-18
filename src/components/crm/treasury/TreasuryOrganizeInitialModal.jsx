"use client";

import React, { useState, useEffect } from 'react';
import {
    SlidersHorizontal,
    Briefcase,
    User,
    Landmark,
    CreditCard,
    Wrench,
    ShieldCheck,
    Car,
    TrendingUp,
    CheckCircle2,
    X,
    Sparkles,
    AlertCircle,
    AlertTriangle,
    Info,
    ChevronDown,
    ChevronUp,
    DollarSign,
    Wallet,
    Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

const BOX_METADATA = [
    { key: 'operativa', name: 'Caja Operativa', icon: Briefcase, color: 'text-emerald-400', desc: 'Gastos de funcionamiento, sueldos del equipo, comisiones, proveedores y servicios corrientes.' },
    { key: 'impuestos', name: 'Impuestos y Obligaciones', icon: Landmark, color: 'text-amber-400', desc: 'AFIP, Ingresos Brutos, tasas, patentes y provisiones fiscales con vencimiento.' },
    { key: 'deudas', name: 'Deudas y Financiaciones', icon: CreditCard, color: 'text-red-400', desc: 'Cuotas de préstamos, cheques emitidos a pagar y pasivos comerciales.' },
    { key: 'personal', name: 'Caja Personal', icon: User, color: 'text-purple-400', desc: 'Presupuesto exclusivo de retiros y gastos del propietario (sueldos de empleados van a Operativa).' },
    { key: 'postventa', name: 'Postventa y Garantías', icon: Wrench, color: 'text-orange-400', desc: 'Provisión preventiva por unidad entregada para garantías y mecánica post-entrega.' },
    { key: 'reserva', name: 'Reserva de Liquidez', icon: ShieldCheck, color: 'text-blue-400', desc: 'Respaldo intocable para sostener gastos fijos operativos durante meses lentos.' },
    { key: 'stock', name: 'Fondo de Stock / Compras', icon: Car, color: 'text-cyan-400', desc: 'Capital de compras de oportunidades y reposición de inventario automotor.' },
    { key: 'crecimiento', name: 'Fondo de Crecimiento', icon: TrendingUp, color: 'text-emerald-400', desc: 'Inversiones estratégicas, expansión comercial y desarrollo patrimonial.' }
];

export default function TreasuryOrganizeInitialModal({
    isOpen,
    onClose,
    boxes = [],
    summary = {},
    config = {},
    treasuryToken,
    onSuccess
}) {
    const totalCuentasARS = summary.totalCuentasARS || 0;
    const totalCuentasUSD = summary.totalCuentasUSD || 0;

    // Inicializar montos asignados por caja con los balances actuales o 0
    const [allocations, setAllocations] = useState({});
    const [reason, setReason] = useState('Organización de saldos entre cajas');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [suggestedData, setSuggestedData] = useState(null);
    const [expandedDetails, setExpandedDetails] = useState({});

    useEffect(() => {
        if (isOpen) {
            const initialMap = {};
            BOX_METADATA.forEach(meta => {
                const existing = boxes.find(b => b.key === meta.key);
                initialMap[meta.key] = {
                    balanceARS: existing?.balanceARS || 0,
                    balanceUSD: existing?.balanceUSD || 0
                };
            });
            setAllocations(initialMap);
            setSuggestedData(null);
            setExpandedDetails({});
        }
    }, [isOpen, boxes]);

    if (!isOpen) return null;

    const toggleDetails = (key) => {
        setExpandedDetails(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAmountChange = (key, currency, val) => {
        const num = parseFloat(val) || 0;
        setAllocations(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [currency === 'USD' ? 'balanceUSD' : 'balanceARS']: num
            }
        }));
    };

    // Calcular totales asignados
    let totalAsignadoARS = 0;
    let totalAsignadoUSD = 0;
    Object.values(allocations).forEach(item => {
        totalAsignadoARS += Number(item.balanceARS || 0);
        totalAsignadoUSD += Number(item.balanceUSD || 0);
    });

    const unallocatedARS = totalCuentasARS - totalAsignadoARS;
    const unallocatedUSD = totalCuentasUSD - totalAsignadoUSD;

    // Obtener y aplicar sugerencia determinística desde el backend (SOLO VISTA PREVIA)
    const handleApplySuggestedDistribution = async () => {
        setIsLoadingSuggestion(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/suggested-allocation', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                }
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al calcular el reparto sugerido');
                return;
            }

            // Aplicar como vista previa editable en el formulario
            const nextAllocations = { ...allocations };
            (data.boxes || []).forEach(boxRes => {
                nextAllocations[boxRes.key] = {
                    balanceARS: Number(boxRes.suggestedAmountARS || 0),
                    balanceUSD: allocations[boxRes.key]?.balanceUSD || 0
                };
            });

            setAllocations(nextAllocations);
            setSuggestedData(data);
            toast.success('Reparto sugerido cargado para vista previa. Podés ajustar los importes antes de confirmar.');
        } catch (err) {
            console.error('Error fetching suggested allocation:', err);
            toast.error('Error de red al consultar el reparto sugerido');
        } finally {
            setIsLoadingSuggestion(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const allocationsPayload = Object.entries(allocations).map(([boxKey, amounts]) => ({
                boxKey,
                amountARS: Number(amounts.balanceARS || 0),
                balanceARS: Number(amounts.balanceARS || 0),
                amountUSD: Number(amounts.balanceUSD || 0),
                balanceUSD: Number(amounts.balanceUSD || 0),
                mode: 'set'
            }));

            const res = await fetch('/api/admin/tesoreria-estrategica/organize-initial-balance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    allocations: allocationsPayload,
                    reason
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al organizar saldo inicial');
                return;
            }

            toast.success(data.message || 'Saldo inicial asignado a cajas exitosamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de red al organizar saldos');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
            <div className="flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-purple-500/30 bg-crm-surface shadow-2xl overflow-hidden">
                {/* Cabecera */}
                <div className="flex items-center justify-between p-5 border-b border-crm-border shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                            <SlidersHorizontal size={20} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white">Organizar Saldo en Cajas Estratégicas</h3>
                                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                                    Asignación Interna
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Distribuye la liquidez de tus cuentas entre las 8 cajas sin crear transacciones bancarias ni duplicar asientos.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Barra de Balance y Ecuación Fundamental */}
                <div className="p-4 bg-crm-bg/70 border-b border-crm-border shrink-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-crm-fg-muted">
                                Liquidez Real en Cuentas (Confirmada)
                            </span>
                            <div className="font-mono text-lg font-black text-white flex items-center gap-3">
                                <span>{formatMoney(totalCuentasARS, 'ARS')}</span>
                                {totalCuentasUSD > 0 && <span className="text-emerald-400">/ {formatMoney(totalCuentasUSD, 'USD')}</span>}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleApplySuggestedDistribution}
                            disabled={isLoadingSuggestion}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600/30 border border-purple-500/40 px-3.5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-600/50 transition-colors shrink-0 disabled:opacity-50"
                        >
                            <Sparkles size={14} className="text-purple-300" />
                            {isLoadingSuggestion ? 'Calculando propuesta...' : 'Aplicar Reparto Sugerido'}
                        </button>
                    </div>

                    {/* Alertas de Déficit o Excedente */}
                    {suggestedData?.summary?.hasDeficit && (
                        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 flex items-start gap-2.5">
                            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-red-200">
                                <strong className="font-bold text-white block">Fondos insuficientes para cubrir todas las metas</strong>
                                <span>
                                    El disponible no alcanza para cubrir la totalidad de compromisos y previsiones. Se priorizaron las cajas críticas y restan <strong className="text-red-300 font-mono">{formatMoney(suggestedData.summary.totalDeficitARS, 'ARS')}</strong> de déficit sin cubrir.
                                </span>
                            </div>
                        </div>
                    )}

                    {suggestedData && !suggestedData.summary?.surplusRuleConfigured && (suggestedData.summary?.unassignedRemainderARS > 0) && (
                        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 flex items-start gap-2.5">
                            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-xs text-blue-200">
                                <strong className="font-bold text-white block">Remanente sin asignar: {formatMoney(suggestedData.summary.unassignedRemainderARS, 'ARS')}</strong>
                                <span>
                                    Al no tener configurada una regla de excedente para Stock y Crecimiento, este saldo permanece protegido en cuentas sin repartir.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Resumen de Ecuación: Total = Asignado + Sin Asignar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-crm-border/40 text-xs">
                        <div className="rounded-xl border border-crm-border bg-crm-surface p-2.5">
                            <span className="text-[10px] font-bold text-crm-fg-muted uppercase">Total en Cuentas</span>
                            <p className="font-mono font-black text-white mt-0.5">
                                {formatMoney(totalCuentasARS, 'ARS')}
                            </p>
                        </div>

                        <div className="rounded-xl border border-crm-border bg-crm-surface p-2.5">
                            <span className="text-[10px] font-bold text-purple-300 uppercase">Fondos Asignados a Cajas</span>
                            <p className="font-mono font-black text-purple-300 mt-0.5">
                                {formatMoney(totalAsignadoARS, 'ARS')}
                            </p>
                        </div>

                        <div className={`rounded-xl border p-2.5 ${unallocatedARS < 0 ? 'border-red-500/40 bg-red-500/10' : 'border-crm-border bg-crm-surface'}`}>
                            <span className="text-[10px] font-bold text-crm-fg-muted uppercase">Fondos Sin Asignar (Remanente)</span>
                            <p className={`font-mono font-black mt-0.5 ${unallocatedARS < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatMoney(unallocatedARS, 'ARS')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Formulario de Cajas */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {BOX_METADATA.map((meta) => {
                            const Icon = meta.icon;
                            const existingBox = boxes.find(b => b.key === meta.key);
                            const currentBalanceARS = existingBox?.balanceARS || 0;
                            const currentARS = allocations[meta.key]?.balanceARS || 0;
                            const currentUSD = allocations[meta.key]?.balanceUSD || 0;

                            const suggestedInfo = suggestedData?.boxes?.find(b => b.key === meta.key);
                            const targetARS = suggestedInfo?.targetARS ?? 0;
                            const shortfallARS = suggestedInfo?.shortfallARS ?? Math.max(0, targetARS - currentBalanceARS);
                            const uncoveredARS = Math.max(0, shortfallARS - currentARS);

                            const hasDetails = suggestedInfo?.originDetails && suggestedInfo.originDetails.length > 0;
                            const isExpanded = Boolean(expandedDetails[meta.key]);

                            return (
                                <div
                                    key={meta.key}
                                    className="rounded-2xl border border-crm-border bg-crm-surface p-3.5 space-y-2.5 hover:border-purple-500/40 transition-colors"
                                >
                                    {/* Cabecera de la Caja */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-bg text-purple-300 shrink-0">
                                                <Icon size={16} />
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-black text-white">{meta.name}</h4>
                                                <span className="text-[10px] text-crm-fg-muted block leading-tight">{meta.desc}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Badge de Configuración Incompleta */}
                                    {suggestedInfo?.isConfigIncomplete && (
                                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[10px] text-amber-200 flex items-start gap-1.5">
                                            <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="font-bold text-amber-300">Configuración incompleta:</strong>{' '}
                                                {suggestedInfo.missingDataNote}
                                            </div>
                                        </div>
                                    )}

                                    {/* Métricas Requeridas: Meta, Origen, Saldo Asignado, Faltante */}
                                    <div className="rounded-xl border border-crm-border/60 bg-crm-bg/60 p-2.5 space-y-1.5 text-[11px]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-crm-fg-muted font-bold text-[10px] uppercase">Meta Calculada:</span>
                                            <span className="font-mono font-bold text-white">
                                                {suggestedInfo ? formatMoney(targetARS, 'ARS') : 'A consultar'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-crm-fg-muted font-bold text-[10px] uppercase">Saldo Asignado Actual:</span>
                                            <span className="font-mono font-semibold text-purple-300">
                                                {formatMoney(currentBalanceARS, 'ARS')}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-crm-fg-muted font-bold text-[10px] uppercase">Faltante p/ Meta:</span>
                                            <span className={`font-mono font-bold ${shortfallARS > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {formatMoney(shortfallARS, 'ARS')}
                                            </span>
                                        </div>

                                        {/* Origen de la meta */}
                                        {suggestedInfo?.originDescription && (
                                            <div className="pt-1 border-t border-crm-border/40 text-[10px] text-crm-fg-muted">
                                                <span className="font-bold text-purple-300">Origen: </span>
                                                {suggestedInfo.originDescription}
                                            </div>
                                        )}

                                        {/* Detalle desplegable de gastos si existen */}
                                        {hasDetails && (
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDetails(meta.key)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200"
                                                >
                                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                    {isExpanded ? 'Ocultar detalle de gastos' : `Ver detalle (${suggestedInfo.originDetails.length} items)`}
                                                </button>

                                                {isExpanded && (
                                                    <div className="mt-1.5 max-h-32 overflow-y-auto space-y-1 pr-1 border-t border-crm-border/30 pt-1 text-[10px]">
                                                        {suggestedInfo.originDetails.map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between text-crm-fg-muted py-0.5">
                                                                <span className="truncate pr-2">{item.description || item.concept || item.category}</span>
                                                                <span className="font-mono font-bold text-white shrink-0">
                                                                    {formatMoney(item.amount, 'ARS')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Input de Asignación / Importe Sugerido */}
                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-crm-border/30">
                                        <div>
                                            <label className="block text-[9px] font-bold uppercase text-crm-fg-muted mb-0.5">
                                                Importe a Asignar (ARS)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={currentARS}
                                                    onChange={(e) => handleAmountChange(meta.key, 'ARS', e.target.value)}
                                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-2.5 py-1.5 font-mono text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[9px] font-bold uppercase text-crm-fg-muted mb-0.5">
                                                Monto en USD
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={currentUSD}
                                                    onChange={(e) => handleAmountChange(meta.key, 'USD', e.target.value)}
                                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-2.5 py-1.5 font-mono text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Necesidad que quedaría sin cubrir */}
                                    {suggestedInfo && (
                                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-crm-border/20 font-bold">
                                            <span className="text-crm-fg-muted uppercase">Necesidad sin cubrir:</span>
                                            {uncoveredARS > 0 ? (
                                                <span className="font-mono text-red-400">
                                                    Déficit: {formatMoney(uncoveredARS, 'ARS')}
                                                </span>
                                            ) : (
                                                <span className="font-mono text-emerald-400">
                                                    Cubierta al 100%
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="pt-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Motivo de la Asignación Inicial
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            placeholder="Motivo del reparto inicial"
                            required
                        />
                    </div>
                </form>

                {/* Pie del Modal */}
                <div className="p-4 border-t border-crm-border bg-crm-surface/90 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs">
                        <span className="text-crm-fg-muted">Asignando a 8 cajas: </span>
                        <strong className="text-purple-300 font-mono font-bold">{formatMoney(totalAsignadoARS, 'ARS')}</strong>
                        <span className="text-crm-fg-muted"> · Sin asignar: </span>
                        <strong className={`font-mono font-bold ${unallocatedARS < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatMoney(unallocatedARS, 'ARS')}
                        </strong>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-crm-border px-4 py-2 text-xs font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-50 transition-colors shadow-lg shadow-purple-600/20"
                        >
                            <CheckCircle2 size={16} />
                            {isSubmitting ? 'Guardando...' : 'Confirmar Asignación a Cajas'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
