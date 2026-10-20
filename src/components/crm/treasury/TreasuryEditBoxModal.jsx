"use client";

import React, { useState, useEffect } from 'react';
import {
    X,
    DollarSign,
    Wallet,
    CheckCircle2,
    Edit3,
    RotateCcw,
    Eye,
    SlidersHorizontal,
    FileText
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
    const [actionType, setActionType] = useState('editar'); // 'editar' | 'asignar' | 'meta'

    const [directBalanceUSD, setDirectBalanceUSD] = useState('');
    const [directBalanceARS, setDirectBalanceARS] = useState('');

    const [addAmountUSD, setAddAmountUSD] = useState('');
    const [addAmountARS, setAddAmountARS] = useState('');

    const [boxName, setBoxName] = useState('');
    const [targetPercent, setTargetPercent] = useState('');
    const [monthlyBudgetARS, setMonthlyBudgetARS] = useState('');
    const [monthlyBudgetUSD, setMonthlyBudgetUSD] = useState('');
    const [reserveMonths, setReserveMonths] = useState(1);

    const [reason, setReason] = useState('');
    const [previewData, setPreviewData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (box) {
            setActionType('editar');
            setDirectBalanceUSD(box.balanceUSD !== undefined ? String(box.balanceUSD) : '0');
            setDirectBalanceARS(box.balanceARS !== undefined ? String(box.balanceARS) : '0');
            setBoxName(box.name || '');
            setTargetPercent(box.targetPercent !== undefined ? String(box.targetPercent) : '0');
            setMonthlyBudgetARS(box.monthlyBudgetARS !== undefined ? String(box.monthlyBudgetARS) : '0');
            setMonthlyBudgetUSD(box.monthlyBudgetUSD !== undefined ? String(box.monthlyBudgetUSD) : '0');
            setReserveMonths(box.reserveMonths || 1);
            setAddAmountUSD('');
            setAddAmountARS('');
            setReason('');
            setPreviewData(null);
        }
    }, [box]);

    if (!isOpen || !box) return null;

    const buildPayload = () => {
        if (!reason || !reason.trim()) {
            toast.error('El motivo del ajuste o edición es obligatorio.');
            return null;
        }

        if (actionType === 'editar') {
            const numUSD = parseFloat(String(directBalanceUSD).replace(/\./g, '').replace(',', '.'));
            const numARS = parseFloat(String(directBalanceARS).replace(/\./g, '').replace(',', '.'));

            if (isNaN(numUSD) || isNaN(numARS)) {
                toast.error('Los montos deben ser números válidos.');
                return null;
            }

            if (numUSD < 0 || numARS < 0) {
                toast.error('Los saldos asignados no pueden quedar negativos.');
                return null;
            }

            return {
                distributions: [{
                    boxKey: box.key,
                    amountUSD: numUSD,
                    amountARS: numARS
                }],
                reason: reason.trim()
            };
        } else if (actionType === 'asignar') {
            const addUSD = parseFloat(String(addAmountUSD).replace(/\./g, '').replace(',', '.')) || 0;
            const addARS = parseFloat(String(addAmountARS).replace(/\./g, '').replace(',', '.')) || 0;

            if (addUSD <= 0 && addARS <= 0) {
                toast.error('Ingresá un importe en USD o ARS para asignar.');
                return null;
            }

            return {
                distributions: [{
                    boxKey: box.key,
                    amountUSD: (box.balanceUSD || 0) + addUSD,
                    amountARS: (box.balanceARS || 0) + addARS
                }],
                reason: `${reason.trim()} (Asignación desde disponible: +USD ${addUSD} / +ARS ${addARS})`
            };
        } else {
            const numPercent = parseFloat(String(targetPercent).replace(/\./g, '').replace(',', '.')) || 0;
            const budgetARS = parseFloat(String(monthlyBudgetARS).replace(/\./g, '').replace(',', '.')) || 0;
            const budgetUSD = parseFloat(String(monthlyBudgetUSD).replace(/\./g, '').replace(',', '.')) || 0;

            if (!boxName.trim()) {
                toast.error('El nombre de la caja no puede estar vacío.');
                return null;
            }

            return {
                boxKey: box.key,
                name: boxName.trim(),
                targetPercent: numPercent,
                monthlyBudgetARS: budgetARS,
                monthlyBudgetUSD: budgetUSD,
                reserveMonths: Number(reserveMonths) || 1,
                reason: reason.trim()
            };
        }
    };

    const handlePreview = async () => {
        const payload = buildPayload();
        if (!payload) return;

        if (actionType === 'meta') {
            // Preview local de configuración con resumen de antes y después
            setPreviewData({
                isConfig: true,
                boxName: box.name,
                newName: boxName.trim(),
                reason: reason.trim(),
                changes: [
                    { label: 'Nombre de la Caja', before: box.name, after: boxName.trim() },
                    { label: 'Meta de Asignación (%)', before: `${box.targetPercent || 0}%`, after: `${payload.targetPercent}%` },
                    { label: 'Presupuesto Mensual ARS', before: formatMoney(box.monthlyBudgetARS, 'ARS'), after: formatMoney(payload.monthlyBudgetARS, 'ARS') },
                    { label: 'Presupuesto Mensual USD', before: formatMoney(box.monthlyBudgetUSD, 'USD'), after: formatMoney(payload.monthlyBudgetUSD, 'USD') },
                    ...(box.key === 'reserva' ? [{ label: 'Meses de Cobertura', before: box.reserveMonths || 1, after: payload.reserveMonths }] : [])
                ]
            });
            return;
        }

        setIsLoadingPreview(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/boxes/distribute/preview', {
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
                toast.error(data.message || 'No se pudo generar la vista previa');
                return;
            }
            setPreviewData(data);
        } catch {
            toast.error('Error de conexión al generar vista previa');
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = buildPayload();
        if (!payload) return;

        if (!previewData) {
            await handlePreview();
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            let res;

            if (actionType === 'meta') {
                res = await fetch('/api/admin/tesoreria-estrategica/boxes/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-treasury-token': treasuryToken
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/admin/tesoreria-estrategica/boxes/distribute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'x-treasury-token': treasuryToken
                    },
                    body: JSON.stringify(payload)
                });
            }

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al actualizar la caja');
                return;
            }

            toast.success(data.message || `Caja ${box.name} actualizada con éxito`);
            setPreviewData(null);
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
                                Edición Auditada con Vista Previa
                            </span>
                            <h3 className="text-base font-black text-white">Editar {box.name}</h3>
                            <p className="text-[11px] text-crm-fg-muted">Asignación interna · Motivo obligatorio · No altera bancos</p>
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
                        <span className="text-[10px] uppercase font-bold text-crm-fg-muted block">Saldo Actual Asignado</span>
                        <p className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                            {formatMoney(box.balanceUSD, 'USD')}
                        </p>
                        <p className={`font-mono text-xs font-bold ${(box.balanceARS || 0) < 0 ? 'text-red-400' : 'text-white'}`}>
                            {formatMoney(box.balanceARS, 'ARS')}
                        </p>
                    </div>

                    <div>
                        <span className="text-[10px] uppercase font-bold text-purple-300 block">Fondos Propios Sin Asignar</span>
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
                        onClick={() => { setActionType('editar'); setPreviewData(null); }}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'editar' ? 'bg-purple-600 text-white shadow' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Editar Saldo Directo
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActionType('asignar'); setPreviewData(null); }}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'asignar' ? 'bg-purple-600 text-white shadow' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Asignar Disponible
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActionType('meta'); setPreviewData(null); }}
                        className={`flex-1 py-1.5 rounded-lg transition-colors ${actionType === 'meta' ? 'bg-purple-600 text-white shadow' : 'text-crm-fg-muted hover:text-white'}`}
                    >
                        Configurar Metas y Nombre
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                                        onClick={() => { setDirectBalanceUSD('0'); setPreviewData(null); }}
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
                                        min="0"
                                        value={directBalanceUSD}
                                        onChange={(e) => { setDirectBalanceUSD(e.target.value); setPreviewData(null); }}
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
                                        onClick={() => { setDirectBalanceARS('0'); setPreviewData(null); }}
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
                                        min="0"
                                        value={directBalanceARS}
                                        onChange={(e) => { setDirectBalanceARS(e.target.value); setPreviewData(null); }}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg pl-12 pr-4 py-2.5 font-mono text-base font-bold text-white focus:border-purple-500 focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {actionType === 'asignar' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1 flex items-center justify-between">
                                    <span>Monto USD a Sumar</span>
                                    {unallocatedUSD > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => { setAddAmountUSD(String(Math.max(0, unallocatedUSD))); setPreviewData(null); }}
                                            className="text-[10px] font-bold text-emerald-400 hover:underline"
                                        >
                                            + Asignar todo el disponible (USD {formatNumber(unallocatedUSD)})
                                        </button>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={addAmountUSD}
                                    onChange={(e) => { setAddAmountUSD(e.target.value); setPreviewData(null); }}
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
                                            onClick={() => { setAddAmountARS(String(Math.max(0, unallocatedARS))); setPreviewData(null); }}
                                            className="text-[10px] font-bold text-blue-400 hover:underline"
                                        >
                                            + Asignar todo el disponible (ARS {formatNumber(unallocatedARS)})
                                        </button>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={addAmountARS}
                                    onChange={(e) => { setAddAmountARS(e.target.value); setPreviewData(null); }}
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {actionType === 'meta' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Nombre de la Caja
                                </label>
                                <input
                                    type="text"
                                    value={boxName}
                                    onChange={(e) => { setBoxName(e.target.value); setPreviewData(null); }}
                                    placeholder="Ej: Caja Operativa"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Meta de Asignación (% del capital total)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    value={targetPercent}
                                    onChange={(e) => { setTargetPercent(e.target.value); setPreviewData(null); }}
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Presupuesto Mensual ARS
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={monthlyBudgetARS}
                                    onChange={(e) => { setMonthlyBudgetARS(e.target.value); setPreviewData(null); }}
                                    placeholder="0"
                                    className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                    Presupuesto Mensual USD
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={monthlyBudgetUSD}
                                    onChange={(e) => { setMonthlyBudgetUSD(e.target.value); setPreviewData(null); }}
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
                                        onChange={(e) => { setReserveMonths(e.target.value); setPreviewData(null); }}
                                        className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Motivo Obligatorio de Auditoría */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Motivo Obligatorio del Cambio *
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setPreviewData(null); }}
                            placeholder="Ej: Reajuste operativo por variación de costos fijos"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    {/* Resumen Pre-Confirmación Claro */}
                    {previewData && (
                        <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4 text-xs space-y-2.5">
                            <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5">
                                <span className="font-black text-purple-200 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                    <Eye size={13} /> Resumen de Modificación antes de Confirmar
                                </span>
                                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                    Saldo bancario sin cambios
                                </span>
                            </div>

                            <div className="space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-crm-fg-muted">Caja a modificar:</span>
                                    <strong className="text-white">{box.name}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-crm-fg-muted">Motivo ingresado:</span>
                                    <span className="text-purple-200 font-medium italic">"{reason.trim()}"</span>
                                </div>
                            </div>

                            {previewData.isConfig ? (
                                <div className="space-y-1 pt-1.5 border-t border-purple-500/20">
                                    {previewData.changes.map((ch, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px]">
                                            <span className="text-crm-fg-muted">{ch.label}:</span>
                                            <span className="font-mono text-crm-fg">
                                                {String(ch.before)} → <strong className="text-white">{String(ch.after)}</strong>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : previewData.changes?.length > 0 ? (
                                previewData.changes.map((c) => (
                                    <div key={c.boxKey} className="grid grid-cols-2 gap-3 pt-1">
                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                            <span className="text-[10px] text-crm-fg-muted block">Saldo ARS</span>
                                            <p className="font-mono text-xs text-crm-fg-muted line-through">
                                                Antes: {formatMoney(c.balanceARSBefore ?? c.beforeARS, 'ARS')}
                                            </p>
                                            <p className="font-mono text-xs text-purple-300">
                                                Variación: {((c.balanceARSAfter ?? c.afterARS) - (c.balanceARSBefore ?? c.beforeARS)) >= 0 ? '+' : ''}{formatMoney((c.balanceARSAfter ?? c.afterARS) - (c.balanceARSBefore ?? c.beforeARS), 'ARS')}
                                            </p>
                                            <p className="font-mono text-sm font-black text-white mt-0.5">
                                                Resultante: {formatMoney(c.balanceARSAfter ?? c.afterARS, 'ARS')}
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                            <span className="text-[10px] text-crm-fg-muted block">Saldo USD</span>
                                            <p className="font-mono text-xs text-crm-fg-muted line-through">
                                                Antes: {formatMoney(c.balanceUSDBefore ?? c.beforeUSD, 'USD')}
                                            </p>
                                            <p className="font-mono text-xs text-purple-300">
                                                Variación: {((c.balanceUSDAfter ?? c.afterUSD) - (c.balanceUSDBefore ?? c.beforeUSD)) >= 0 ? '+' : ''}{formatMoney((c.balanceUSDAfter ?? c.afterUSD) - (c.balanceUSDBefore ?? c.beforeUSD), 'USD')}
                                            </p>
                                            <p className="font-mono text-sm font-black text-emerald-400 mt-0.5">
                                                Resultante: {formatMoney(c.balanceUSDAfter ?? c.afterUSD, 'USD')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : null}
                        </div>
                    )}

                    {/* Botones de acción */}
                    <div className="flex gap-3 pt-3 border-t border-crm-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-2.5 text-xs font-bold text-crm-fg-muted hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        {!previewData ? (
                            <button
                                type="button"
                                disabled={isLoadingPreview || !reason.trim()}
                                onClick={handlePreview}
                                className="flex-1 rounded-xl border border-purple-500/40 bg-purple-600/20 p-2.5 text-xs font-black text-purple-200 hover:bg-purple-600/30 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                                <Eye size={14} /> {isLoadingPreview ? 'Calculando...' : 'Ver Vista Previa'}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 rounded-xl bg-emerald-600 p-2.5 text-xs font-black text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                                <CheckCircle2 size={14} /> {isSubmitting ? 'Guardando...' : 'Confirmar y Guardar'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
