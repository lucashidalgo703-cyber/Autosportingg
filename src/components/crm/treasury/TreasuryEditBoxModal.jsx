"use client";

import React, { useState, useEffect } from 'react';
import { Edit3, X, DollarSign, Wallet, Percent, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
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
    const [amountUSD, setAmountUSD] = useState('');
    const [amountARS, setAmountARS] = useState('');
    const [targetPercent, setTargetPercent] = useState('');
    const [reason, setReason] = useState('Ajuste directo de saldo de caja');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (box) {
            setAmountUSD(box.balanceUSD !== undefined ? String(box.balanceUSD) : '0');
            setAmountARS(box.balanceARS !== undefined ? String(box.balanceARS) : '0');
            setTargetPercent(box.targetPercent !== undefined ? String(box.targetPercent) : '0');
            setReason('Ajuste directo de saldo de caja');
        }
    }, [box]);

    if (!isOpen || !box) return null;

    const handleAssignUnallocatedUSD = () => {
        const current = Number(box.balanceUSD) || 0;
        const available = Number(unallocatedUSD) || 0;
        const nextVal = Math.max(0, current + available);
        setAmountUSD(String(nextVal));
    };

    const handleAssignUnallocatedARS = () => {
        const current = Number(box.balanceARS) || 0;
        const available = Number(unallocatedARS) || 0;
        const nextVal = Math.max(0, current + available);
        setAmountARS(String(nextVal));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const numUSD = parseFloat(String(amountUSD).replace(/\./g, '').replace(',', '.'));
        const numARS = parseFloat(String(amountARS).replace(/\./g, '').replace(',', '.'));
        const numPercent = parseFloat(String(targetPercent).replace(/\./g, '').replace(',', '.'));

        if (isNaN(numUSD) || numUSD < 0) {
            toast.error('El monto en USD debe ser un número igual o mayor a cero.');
            return;
        }

        if (isNaN(numARS) || numARS < 0) {
            toast.error('El monto en ARS debe ser un número igual o mayor a cero.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                distributions: [
                    {
                        boxKey: box.key,
                        amountUSD: numUSD,
                        amountARS: numARS,
                        targetPercent: isNaN(numPercent) ? box.targetPercent || 0 : numPercent
                    }
                ],
                reason: reason.trim() || 'Ajuste directo de saldo de caja'
            };

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
                toast.error(data.message || 'Error al actualizar el saldo de la caja');
                return;
            }

            toast.success(`Monto de ${box.name} actualizado exitosamente`);
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de red al actualizar saldo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-crm-surface p-6 sm:p-7 shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between pb-3 border-b border-crm-border">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/15 text-purple-300">
                            <Edit3 size={18} />
                        </span>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                                Dirección de Finanzas
                            </span>
                            <h3 className="text-base font-black text-white">Editar Monto de {box.name}</h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-crm-fg-muted hover:text-white transition-colors"
                        aria-label="Cerrar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* Monto en USD */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-1.5">
                                <DollarSign size={14} className="text-emerald-400" />
                                Saldo Asignado USD
                            </label>
                            {unallocatedUSD > 0 && (
                                <button
                                    type="button"
                                    onClick={handleAssignUnallocatedUSD}
                                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 underline"
                                >
                                    + Asignar disponible (USD {formatNumber(unallocatedUSD)})
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                                USD
                            </span>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                value={amountUSD}
                                onChange={(e) => setAmountUSD(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg pl-12 pr-4 py-2.5 font-mono text-base font-bold text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Monto en ARS */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted flex items-center gap-1.5">
                                <Wallet size={14} className="text-blue-400" />
                                Saldo Asignado ARS
                            </label>
                            {unallocatedARS > 0 && (
                                <button
                                    type="button"
                                    onClick={handleAssignUnallocatedARS}
                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 underline"
                                >
                                    + Asignar disponible (ARS {formatNumber(unallocatedARS)})
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">
                                ARS
                            </span>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                placeholder="0.00"
                                value={amountARS}
                                onChange={(e) => setAmountARS(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg pl-12 pr-4 py-2.5 font-mono text-base font-bold text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    {/* Porcentaje Meta */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5 flex items-center gap-1.5">
                            <Percent size={14} className="text-purple-400" />
                            Meta de Asignación (% del capital)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="Ej: 20"
                            value={targetPercent}
                            onChange={(e) => setTargetPercent(e.target.value)}
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    {/* Motivo */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1.5">
                            Motivo / Observación del Ajuste
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Asignación inicial de utilidades"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg px-4 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3 pt-3 border-t border-crm-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-xs font-bold text-crm-fg-muted hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 p-3 text-xs font-black text-white hover:opacity-95 transition-opacity disabled:opacity-50 shadow-lg shadow-purple-600/20"
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar Monto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
