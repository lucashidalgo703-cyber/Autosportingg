"use client";

import React, { useState, useEffect } from 'react';
import {
    SlidersHorizontal,
    X,
    DollarSign,
    Wallet,
    Percent,
    ShieldCheck,
    Briefcase,
    Calendar,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

export default function TreasuryEditBoxModal({
    isOpen,
    onClose,
    box,
    unallocatedUSD = 0,
    unallocatedARS = 0,
    treasuryToken,
    onSuccess
}) {
    const [actionType, setActionType] = useState('asignar'); // 'asignar' | 'meta' | 'ajuste'
    
    // Asignación de fondos
    const [addAmountUSD, setAddAmountUSD] = useState('');
    const [addAmountARS, setAddAmountARS] = useState('');
    
    // Configuración de Meta
    const [targetPercent, setTargetPercent] = useState('');
    const [monthlyBudgetARS, setMonthlyBudgetARS] = useState('');
    const [monthlyBudgetUSD, setMonthlyBudgetUSD] = useState('');
    const [reserveMonths, setReserveMonths] = useState(1);
    
    // Ajuste directo
    const [directBalanceUSD, setDirectBalanceUSD] = useState('');
    const [directBalanceARS, setDirectBalanceARS] = useState('');
    const [reason, setReason] = useState('Asignación de capital a caja estratégica');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (box) {
            setDirectBalanceUSD(box.balanceUSD !== undefined ? String(box.balanceUSD) : '0');
            setDirectBalanceARS(box.balanceARS !== undefined ? String(box.balanceARS) : '0');
            setTargetPercent(box.targetPercent !== undefined ? String(box.targetPercent) : '0');
            setMonthlyBudgetARS(box.monthlyBudgetARS !== undefined ? String(box.monthlyBudgetARS) : '0');
            setMonthlyBudgetUSD(box.monthlyBudgetUSD !== undefined ? String(box.monthlyBudgetUSD) : '0');
            setReserveMonths(box.reserveMonths || 1);
            setAddAmountUSD('');
            setAddAmountARS('');
            setReason('Asignación de capital a caja estratégica');
        }
    }, [box]);

    if (!isOpen || !box) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            let payload = {};

            if (actionType === 'asignar') {
                const addUSD = parseFloat(String(addAmountUSD).replace(/\./g, '').replace(',', '.')) || 0;
                const addARS = parseFloat(String(addAmountARS).replace(/\./g, '').replace(',', '.')) || 0;

                if (addUSD <= 0 && addARS <= 0) {
                    toast.error('Ingresá un importe en USD o ARS para asignar.');
                    setIsSubmitting(false);
                    return;
                }

                payload = {
                    distributions: [{
                        boxKey: box.key,
                        amountUSD: (box.balanceUSD || 0) + addUSD,
                        amountARS: (box.balanceARS || 0) + addARS
                    }],
                    reason: `Asignación desde liquidez no asignada: +USD ${addUSD} / +ARS ${addARS}. Motivo: ${reason}`
                };
            } else if (actionType === 'meta') {
                const numPercent = parseFloat(String(targetPercent).replace(/\./g, '').replace(',', '.')) || 0;
                const budgetARS = parseFloat(String(monthlyBudgetARS).replace(/\./g, '').replace(',', '.')) || 0;
                const budgetUSD = parseFloat(String(monthlyBudgetUSD).replace(/\./g, '').replace(',', '.')) || 0;

                payload = {
                    distributions: [{
                        boxKey: box.key,
                        targetPercent: numPercent,
                        monthlyBudgetARS: budgetARS,
                        monthlyBudgetUSD: budgetUSD,
                        reserveMonths: Number(reserveMonths) || 1
                    }],
                    reason: `Configuración de metas presupuestarias de ${box.name}`
                };
            } else {
                // Ajuste directo
                const numUSD = parseFloat(String(directBalanceUSD).replace(/\./g, '').replace(',', '.'));
                const numARS = parseFloat(String(directBalanceARS).replace(/\./g, '').replace(',', '.'));

                if (isNaN(numUSD) || isNaN(numARS)) {
                    toast.error('Los montos deben ser valores numéricos válidos.');
                    setIsSubmitting(false);
                    return;
                }

                payload = {
                    distributions: [{
                        boxKey: box.key,
                        amountUSD: numUSD,
                        amountARS: numARS
                    }],
                    reason: `Ajuste administrativo de saldo: ${reason}`
                };
            }

            const res = await fetch('/api/admin/tesoreria-estrategica/boxes/distribute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al actualizar la caja');
                return;
            }

            toast.success(`Caja ${box.name} actualizada exitosamente`);
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de red al actualizar saldo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
            <div className="my-8 w-full max-w-lg rounded-3xl border border-purple-500/30 bg-crm-surface p-6 sm:p-7 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-crm-border">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                            Dirección de Finanzas · Cajas de Capital
                        </span>
                        <h3 className="text-base font-black text-white">{box.name}</h3>
                        <p className="text-xs text-crm-fg-muted mt-0.5">{box.description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-crm-fg-muted hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Saldo Actual de la Caja y Liquidez no asignada */}
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-crm-border bg-crm-bg p-3.5">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">Saldo Actual Asignado</span>
                        <p className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                            {formatMoney(box.balanceUSD, 'USD')}
                        </p>
                        <p className="font-mono text-xs font-bold text-white">
                            {formatMoney(box.balanceARS, 'ARS')}
                        </p>
                    </div>

                    <div>
                        <span className="text-[10px] uppercase font-bold text-purple-300 block">Disponible No Asignado en Cuentas</span>
                        <p className="font-mono text-sm font-black text-purple-200 mt-0.5">
                            {formatMoney(unallocatedUSD, 'USD')}
                        </p>
                        <p className="font-mono text-xs font-bold text-crm-fg-muted">
                            {formatMoney(unallocatedARS, 'ARS')}
                        </p>
                    </div>
                </div>

                {/* Selector de Acción */}
                <div className="mt-4 flex rounded-xl border border-crm-border bg-crm-surface-raised p-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActionType('asignar')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'asignar' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Asignar Fondos
                    </button>
                    <button
                        type="button"
                        onClick={() => setActionType('meta')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'meta' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Configurar Metas
                    </button>
                    <button
                        type="button"
                        onClick={() => setActionType('ajuste')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'ajuste' ? 'bg-purple-600 text-white' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Ajuste de Saldo
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* MODO 1: ASIGNAR FONDOS DESDE LIQUIDEZ NO ASIGNADA */}
                    {actionType === 'asignar' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1 flex items-center justify-between">
                                    <span>Monto USD a Sumar</span>
                                    {unallocatedUSD > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setAddAmountUSD(String(Math.max(0, unallocatedUSD)))}
                                            className="text-[10px] font-bold text-emerald-400 hover:underline"
                                        >
                                            + Asignar todo el disponible (USD {formatNumber(unallocatedUSD)})
                                        </button>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={addAmountUSD}
                                    onChange={(e) => setAddAmountUSD(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1 flex items-center justify-between">
                                    <span>Monto ARS a Sumar</span>
                                    {unallocatedARS > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setAddAmountARS(String(Math.max(0, unallocatedARS)))}
                                            className="text-[10px] font-bold text-blue-400 hover:underline"
                                        >
                                            + Asignar todo el disponible (ARS {formatNumber(unallocatedARS)})
                                        </button>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={addAmountARS}
                                    onChange={(e) => setAddAmountARS(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* MODO 2: CONFIGURAR METAS Y PRESUPUESTO */}
                    {actionType === 'meta' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Meta Presupuestaria Mensual (ARS)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={monthlyBudgetARS}
                                    onChange={(e) => setMonthlyBudgetARS(e.target.value)}
                                    placeholder="0"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                                <span className="text-[10px] text-crm-fg-muted block mt-1">
                                    Define la necesidad mensual de la caja (ej: presupuesto de retiros personales o provisión de postventa).
                                </span>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Meta Presupuestaria Mensual (USD)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={monthlyBudgetUSD}
                                    onChange={(e) => setMonthlyBudgetUSD(e.target.value)}
                                    placeholder="0"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            {box.key === 'reserva' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                        Meses de Cobertura de Gastos Fijos
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={reserveMonths}
                                        onChange={(e) => setReserveMonths(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Meta de Asignación (% del capital total)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={targetPercent}
                                    onChange={(e) => setTargetPercent(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* MODO 3: AJUSTE DIRECTO DE SALDO */}
                    {actionType === 'ajuste' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Saldo Total USD de la Caja
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={directBalanceUSD}
                                    onChange={(e) => setDirectBalanceUSD(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Saldo Total ARS de la Caja
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={directBalanceARS}
                                    onChange={(e) => setDirectBalanceARS(e.target.value)}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Motivo de Auditoría */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Motivo / Observación del Movimiento
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Motivo del ajuste..."
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3 pt-3 border-t border-crm-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-2.5 text-xs font-bold text-crm-fg-muted hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl bg-purple-600 p-2.5 text-xs font-black text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : 'Confirmar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
