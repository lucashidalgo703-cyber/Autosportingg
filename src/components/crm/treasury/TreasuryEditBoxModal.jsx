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
    ArrowRight,
    Edit3,
    RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    const isNegative = (amount || 0) < 0;
    const formatted = new Intl.NumberFormat('es-AR').format(Math.abs(Math.round(amount || 0)));
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD' : 'ARS'} ${formatted}`;
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
    // Por defecto abre en 'editar' para permitir cambiar o corregir el saldo directamente
    const [actionType, setActionType] = useState('editar'); // 'editar' | 'asignar' | 'meta'
    
    // Edición directa de saldo
    const [directBalanceUSD, setDirectBalanceUSD] = useState('');
    const [directBalanceARS, setDirectBalanceARS] = useState('');
    
    // Asignación de fondos
    const [addAmountUSD, setAddAmountUSD] = useState('');
    const [addAmountARS, setAddAmountARS] = useState('');
    
    // Configuración de Meta
    const [targetPercent, setTargetPercent] = useState('');
    const [monthlyBudgetARS, setMonthlyBudgetARS] = useState('');
    const [monthlyBudgetUSD, setMonthlyBudgetUSD] = useState('');
    const [reserveMonths, setReserveMonths] = useState(1);
    
    const [reason, setReason] = useState('Corrección y ajuste de saldo de caja');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (box) {
            setActionType('editar');
            setDirectBalanceUSD(box.balanceUSD !== undefined ? String(box.balanceUSD) : '0');
            setDirectBalanceARS(box.balanceARS !== undefined ? String(box.balanceARS) : '0');
            setTargetPercent(box.targetPercent !== undefined ? String(box.targetPercent) : '0');
            setMonthlyBudgetARS(box.monthlyBudgetARS !== undefined ? String(box.monthlyBudgetARS) : '0');
            setMonthlyBudgetUSD(box.monthlyBudgetUSD !== undefined ? String(box.monthlyBudgetUSD) : '0');
            setReserveMonths(box.reserveMonths || 1);
            setAddAmountUSD('');
            setAddAmountARS('');
            setReason('Corrección y ajuste de saldo de caja');
        }
    }, [box]);

    if (!isOpen || !box) return null;

    const handleSetZeroUSD = () => {
        setDirectBalanceUSD('0');
    };

    const handleSetZeroARS = () => {
        setDirectBalanceARS('0');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('token');
            let payload = {};

            if (actionType === 'editar') {
                // Edición directa de saldo
                const numUSD = parseFloat(String(directBalanceUSD).replace(/\./g, '').replace(',', '.'));
                const numARS = parseFloat(String(directBalanceARS).replace(/\./g, '').replace(',', '.'));

                if (isNaN(numUSD) || isNaN(numARS)) {
                    toast.error('Los montos deben ser números válidos.');
                    setIsSubmitting(false);
                    return;
                }

                payload = {
                    distributions: [{
                        boxKey: box.key,
                        amountUSD: numUSD,
                        amountARS: numARS
                    }],
                    reason: reason.trim() || 'Corrección manual de saldo de caja'
                };
            } else if (actionType === 'asignar') {
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
                    reason: `Asignación desde fondos no asignados: +USD ${addUSD} / +ARS ${addARS}. Motivo: ${reason}`
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

            toast.success(`Saldo de ${box.name} actualizado exitosamente`);
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
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/15 text-purple-300">
                            <Edit3 size={18} />
                        </span>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                                Dirección de Finanzas · Cajas de Capital
                            </span>
                            <h3 className="text-base font-black text-white">Editar Saldo de {box.name}</h3>
                        </div>
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
                        <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">Saldo Actual Registrado</span>
                        <p className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                            {formatMoney(box.balanceUSD, 'USD')}
                        </p>
                        <p className={`font-mono text-xs font-bold ${(box.balanceARS || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
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

                {/* Selector de Modo */}
                <div className="mt-4 flex rounded-xl border border-crm-border bg-crm-surface-raised p-1 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActionType('editar')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'editar' ? 'bg-purple-600 text-white shadow' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Editar Saldo Directo
                    </button>
                    <button
                        type="button"
                        onClick={() => setActionType('asignar')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'asignar' ? 'bg-purple-600 text-white shadow' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Asignar Disponible
                    </button>
                    <button
                        type="button"
                        onClick={() => setActionType('meta')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'meta' ? 'bg-purple-600 text-white shadow' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Configurar Metas
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* MODO 1: EDITAR SALDO DIRECTO (MODO PRINCIPAL) */}
                    {actionType === 'editar' && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-1.5">
                                        <DollarSign size={14} className="text-emerald-400" />
                                        Saldo Asignado USD
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleSetZeroUSD}
                                        className="text-[10px] font-bold text-crm-fg-muted hover:text-white underline flex items-center gap-1"
                                    >
                                        <RotateCcw size={10} /> Poner en USD 0
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                                        USD
                                    </span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={directBalanceUSD}
                                        onChange={(e) => setDirectBalanceUSD(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg pl-12 pr-4 py-2.5 font-mono text-base font-bold text-white focus:border-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-1.5">
                                        <Wallet size={14} className="text-blue-400" />
                                        Saldo Asignado ARS
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleSetZeroARS}
                                        className="text-[10px] font-bold text-crm-fg-muted hover:text-white underline flex items-center gap-1"
                                    >
                                        <RotateCcw size={10} /> Poner en ARS 0
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">
                                        ARS
                                    </span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={directBalanceARS}
                                        onChange={(e) => setDirectBalanceARS(e.target.value)}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg pl-12 pr-4 py-2.5 font-mono text-base font-bold text-white focus:border-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                                <span className="text-[11px] text-crm-fg-muted mt-1 block">
                                    Podés escribir el monto exacto que debe tener la caja o presionar "Poner en ARS 0" para limpiarlo.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* MODO 2: ASIGNAR DESDE DISPONIBLE EN CUENTAS */}
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
                                    step="any"
                                    value={addAmountARS}
                                    onChange={(e) => setAddAmountARS(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* MODO 3: CONFIGURAR METAS Y PRESUPUESTO */}
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

                    {/* Motivo de Auditoría */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Motivo / Observación del Ajuste
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
                            {isSubmitting ? 'Guardando...' : 'Guardar Saldo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
