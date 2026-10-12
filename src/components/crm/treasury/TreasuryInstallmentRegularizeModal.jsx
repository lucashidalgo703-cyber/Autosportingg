"use client";

import React, { useState } from 'react';
import { FileCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';

function formatNumber(val) {
    return new Intl.NumberFormat('es-AR').format(val || 0);
}

function formatMoney(amount, currency = 'ARS') {
    return `${currency === 'USD' ? 'USD' : 'ARS'} ${formatNumber(Math.round(amount || 0))}`;
}

export default function TreasuryInstallmentRegularizeModal({
    isOpen,
    onClose,
    installments = [],
    treasuryToken,
    onSuccess
}) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedIds, setSelectedIds] = useState([]);
    const [cutoffDate, setCutoffDate] = useState(todayStr);
    const [reason, setReason] = useState('Cuota cobrada pre-conciliación (incluida en saldo real)');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleToggle = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === installments.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(installments.map(i => i.id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedIds.length === 0) {
            toast.error('Seleccioná al menos una cuota');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/installments/regularize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    installmentIds: selectedIds,
                    reason,
                    cutoffDate
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al regularizar cuotas');
                return;
            }

            toast.success(data.message || 'Cuotas regularizadas exitosamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de red al regularizar cuotas.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-2xl rounded-3xl border border-purple-500/30 bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-start justify-between pb-3 border-b border-crm-border">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                            <FileCheck size={18} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-white">Regularización de Cuotas Históricas</h3>
                            <p className="text-[11px] text-crm-fg-muted">
                                Actualizar estado comercial a pagadas sin volver a sumar dinero a caja
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
                    <p className="font-semibold">
                        ℹ️ Esta herramienta permite sanear las cuotas que tus clientes ya pagaron en el pasado pero que figuraban pendientes en el sistema. Al regularizarlas, el CRM no suma dinero duplicado a caja porque ese dinero ya forma parte del saldo real conciliado en tus cuentas.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Fecha de Regularización
                            </label>
                            <input
                                type="date"
                                value={cutoffDate}
                                onChange={(e) => setCutoffDate(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Motivo / Observaciones
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Motivo de la regularización"
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                                Cuotas Pendientes ({installments.length})
                            </span>
                            {installments.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-xs font-bold text-purple-300 hover:underline"
                                >
                                    {selectedIds.length === installments.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                                </button>
                            )}
                        </div>

                        {installments.length === 0 ? (
                            <p className="text-xs text-crm-fg-muted p-4 text-center border border-crm-border rounded-xl">
                                No hay cuotas pendientes para regularizar.
                            </p>
                        ) : (
                            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                                {installments.map((inst) => {
                                    const isSelected = selectedIds.includes(inst.id);
                                    return (
                                        <label
                                            key={inst.id}
                                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                                                isSelected
                                                    ? 'border-purple-500/50 bg-purple-500/10'
                                                    : 'border-crm-border bg-crm-bg/70 hover:bg-crm-surface'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggle(inst.id)}
                                                    className="h-4 w-4 rounded border-crm-border text-purple-600 focus:ring-0"
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-white block">
                                                        {inst.customerName} · {inst.vehicleName}
                                                    </span>
                                                    <span className="text-[11px] text-crm-fg-muted">
                                                        {inst.concept} · Vence: {new Date(inst.dueDate).toLocaleDateString('es-AR')}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-emerald-400">
                                                {formatMoney(inst.amount, inst.currency)}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-crm-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-xs font-bold text-crm-fg-muted hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || selectedIds.length === 0}
                            className="flex-1 rounded-xl bg-purple-600 p-3 text-xs font-black text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Regularizando...' : `Regularizar ${selectedIds.length} Cuota(s)`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
