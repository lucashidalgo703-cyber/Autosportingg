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
    DollarSign,
    Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

const BOX_METADATA = [
    { key: 'operativa', name: 'Caja Operativa', icon: Briefcase, color: 'text-emerald-400', desc: 'Gastos inmediatos, proveedores, mantenimiento y servicios de 30 días.' },
    { key: 'personal', name: 'Caja de Personal', icon: User, color: 'text-purple-400', desc: 'Sueldos fijos, comisiones del equipo y cargas de personal.' },
    { key: 'impuestos', name: 'Impuestos y Obligaciones', icon: Landmark, color: 'text-amber-400', desc: 'IVA, Ingresos Brutos, tasas y provisiones fiscales vencimiento.' },
    { key: 'deudas', name: 'Deudas y Financiaciones', icon: CreditCard, color: 'text-red-400', desc: 'Cuotas de préstamos, cheques emitidos a pagar y compromisos financieros.' },
    { key: 'postventa', name: 'Postventa y Garantías', icon: Wrench, color: 'text-orange-400', desc: 'Provisión preventiva para contingencias mecánicas de autos vendidos.' },
    { key: 'reserva', name: 'Reserva de Liquidez', icon: ShieldCheck, color: 'text-blue-400', desc: 'Colchón intocable para sostener gastos de la agencia en meses lentos.' },
    { key: 'stock', name: 'Fondo de Stock / Compras', icon: Car, color: 'text-cyan-400', desc: 'Capital destinado a adquisición de nuevos vehículos para la agencia.' },
    { key: 'crecimiento', name: 'Fondo de Crecimiento', icon: TrendingUp, color: 'text-emerald-400', desc: 'Inversiones de expansión, infraestructura y proyectos de largo plazo.' }
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
        }
    }, [isOpen, boxes]);

    if (!isOpen) return null;

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

    // Sugerencia automática de reparto basada en metas y remanente
    const handleApplySuggestedDistribution = () => {
        const suggested = {};

        // 1. Operativa: cubrir compromisos pendientes o 10%
        const opBox = boxes.find(b => b.key === 'operativa');
        const opNeeds = Math.max(opBox?.commitmentsARS || 0, Math.round(totalCuentasARS * 0.10));

        // 2. Personal: presupuesto mensual
        const persBox = boxes.find(b => b.key === 'personal');
        const persNeeds = persBox?.monthlyBudgetARS || config.monthlyPersonalBudgetARS || Math.round(totalCuentasARS * 0.15);

        // 3. Impuestos: compromisos o 5%
        const impBox = boxes.find(b => b.key === 'impuestos');
        const impNeeds = Math.max(impBox?.commitmentsARS || 0, Math.round(totalCuentasARS * 0.05));

        // 4. Deudas: compromisos
        const deudasBox = boxes.find(b => b.key === 'deudas');
        const deudasNeeds = Math.max(deudasBox?.commitmentsARS || 0, 0);

        // 5. Postventa: previsión
        const pvNeeds = Math.round(totalCuentasARS * 0.04);

        // 6. Reserva: meta meses lentos
        const resBox = boxes.find(b => b.key === 'reserva');
        const resNeeds = Math.round(totalCuentasARS * 0.15);

        const protectedSumARS = opNeeds + persNeeds + impNeeds + deudasNeeds + pvNeeds + resNeeds;
        const remainderARS = Math.max(0, totalCuentasARS - protectedSumARS);

        // 7. Stock: 80% del remanente
        const stockARS = Math.round(remainderARS * 0.85);

        // 8. Crecimiento: 15% del remanente
        const crecimientoARS = remainderARS - stockARS;

        suggested.operativa = { balanceARS: opNeeds, balanceUSD: 0 };
        suggested.personal = { balanceARS: persNeeds, balanceUSD: 0 };
        suggested.impuestos = { balanceARS: impNeeds, balanceUSD: 0 };
        suggested.deudas = { balanceARS: deudasNeeds, balanceUSD: 0 };
        suggested.postventa = { balanceARS: pvNeeds, balanceUSD: 0 };
        suggested.reserva = { balanceARS: resNeeds, balanceUSD: Math.round(totalCuentasUSD * 0.3) };
        suggested.stock = { balanceARS: stockARS, balanceUSD: Math.round(totalCuentasUSD * 0.5) };
        suggested.crecimiento = { balanceARS: crecimientoARS, balanceUSD: totalCuentasUSD - Math.round(totalCuentasUSD * 0.3) - Math.round(totalCuentasUSD * 0.5) };

        setAllocations(suggested);
        toast.success('Reparto inicial sugerido aplicado a las cajas');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const allocationsPayload = Object.entries(allocations).map(([boxKey, amounts]) => ({
                boxKey,
                balanceARS: Number(amounts.balanceARS || 0),
                balanceUSD: Number(amounts.balanceUSD || 0)
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

            toast.success(data.message || 'Saldo inicial organizado entre cajas exitosamente');
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
            <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-3xl border border-purple-500/30 bg-crm-surface shadow-2xl overflow-hidden">
                {/* Cabecera del Modal */}
                <div className="flex items-center justify-between p-5 border-b border-crm-border shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300">
                            <SlidersHorizontal size={20} />
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-white">Organización del Saldo Inicial entre Cajas</h3>
                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                    Sin Movimientos Bancarios
                                </span>
                            </div>
                            <p className="text-xs text-crm-fg-muted">
                                Distribuye la liquidez confirmada en tus cuentas entre las 8 cajas sin crear transacciones bancarias duplicadas.
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
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600/30 border border-purple-500/40 px-3.5 py-2 text-xs font-bold text-purple-200 hover:bg-purple-600/50 transition-colors shrink-0"
                        >
                            <Sparkles size={14} className="text-purple-300" />
                            Aplicar Reparto Sugerido
                        </button>
                    </div>

                    {/* Resumen de Ecuación: Total = Asignado + Sin Asignar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-crm-border/40 text-xs">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {BOX_METADATA.map((meta) => {
                            const Icon = meta.icon;
                            const currentARS = allocations[meta.key]?.balanceARS || 0;
                            const currentUSD = allocations[meta.key]?.balanceUSD || 0;

                            return (
                                <div
                                    key={meta.key}
                                    className="rounded-2xl border border-crm-border bg-crm-surface p-3.5 space-y-2 hover:border-purple-500/40 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-crm-bg text-purple-300">
                                                <Icon size={16} />
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-black text-white">{meta.name}</h4>
                                                <span className="text-[10px] text-crm-fg-muted block">{meta.desc}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-crm-border/30">
                                        <div>
                                            <label className="block text-[9px] font-bold uppercase text-crm-fg-muted mb-0.5">
                                                Monto en ARS
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
                            {isSubmitting ? 'Guardando...' : 'Confirmar Reparto Inicial'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
