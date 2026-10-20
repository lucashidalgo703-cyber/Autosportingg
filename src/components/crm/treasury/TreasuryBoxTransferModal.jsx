"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, X, AlertTriangle, Eye, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

function formatMoney(amount, currency = 'ARS') {
    const isNegative = (amount || 0) < 0;
    const formatted = new Intl.NumberFormat('es-AR').format(Math.abs(Math.round(amount || 0)));
    return `${isNegative ? '-' : ''}${currency === 'USD' ? 'USD' : 'ARS'} ${formatted}`;
}

export default function TreasuryBoxTransferModal({
    isOpen,
    onClose,
    boxes = [],
    initialFromBoxKey = null,
    treasuryToken,
    onTransferSuccess
}) {
    const [fromBoxKey, setFromBoxKey] = useState('operativa');
    const [toBoxKey, setToBoxKey] = useState('personal');
    const [currency, setCurrency] = useState('ARS');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [previewData, setPreviewData] = useState(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialFromBoxKey) {
                setFromBoxKey(initialFromBoxKey);
                if (initialFromBoxKey === 'personal') {
                    setToBoxKey('operativa');
                }
            }
            setPreviewData(null);
        }
    }, [isOpen, initialFromBoxKey]);

    if (!isOpen) return null;

    const fromBox = boxes.find(b => b.key === fromBoxKey);
    const fromBalance = fromBox ? (currency === 'USD' ? fromBox.balanceUSD : fromBox.balanceARS) || 0 : 0;

    const handlePreview = async () => {
        const num = parseFloat(String(amount).replace(/\./g, '').replace(',', '.'));
        if (!num || num <= 0) {
            toast.error('Ingresá un importe válido mayor a cero');
            return;
        }
        if (fromBoxKey === toBoxKey) {
            toast.error('Seleccioná cajas de origen y destino distintas');
            return;
        }
        if (!reason || !reason.trim()) {
            toast.error('El motivo de la transferencia es obligatorio');
            return;
        }

        setIsLoadingPreview(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/boxes/transfer/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    fromBoxKey,
                    toBoxKey,
                    currency,
                    amount: num,
                    reason: reason.trim()
                })
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
        const num = parseFloat(String(amount).replace(/\./g, '').replace(',', '.'));
        if (!num || num <= 0) {
            toast.error('Ingresá un importe válido mayor a cero');
            return;
        }
        if (fromBoxKey === toBoxKey) {
            toast.error('Seleccioná cajas de origen y destino distintas');
            return;
        }
        if (!reason || !reason.trim()) {
            toast.error('El motivo de la transferencia es obligatorio');
            return;
        }
        if (!previewData) {
            await handlePreview();
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/boxes/transfer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-treasury-token': treasuryToken
                },
                body: JSON.stringify({
                    fromBoxKey,
                    toBoxKey,
                    currency,
                    amount: num,
                    reason: reason.trim()
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al transferir fondos entre cajas');
                return;
            }

            toast.success(data.message || 'Traspaso completado con éxito');
            setPreviewData(null);
            setAmount('');
            setReason('');
            if (onTransferSuccess) onTransferSuccess();
            onClose();
        } catch {
            toast.error('Error de conexión al transferir fondos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md overflow-y-auto">
            <div className="my-8 w-full max-w-lg rounded-3xl border border-purple-500/30 bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-crm-border">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                            <ArrowRightLeft size={18} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-white">Traspaso entre Cajas con Vista Previa</h3>
                            <p className="text-[11px] text-crm-fg-muted">Reasignación interna con motivo obligatorio (no altera el saldo bancario)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Moneda
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => { setCurrency(e.target.value); setPreviewData(null); }}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                            >
                                <option value="ARS">ARS (Pesos)</option>
                                <option value="USD">USD (Dólares)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Importe
                            </label>
                            <input
                                type="number"
                                step="any"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => { setAmount(e.target.value); setPreviewData(null); }}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 font-mono text-sm font-bold text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Desde Caja
                            </label>
                            <select
                                value={fromBoxKey}
                                onChange={(e) => { setFromBoxKey(e.target.value); setPreviewData(null); }}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            >
                                {boxes.map(b => (
                                    <option key={b.key} value={b.key}>{b.name}</option>
                                ))}
                            </select>
                            <span className="text-[10px] text-crm-fg-muted mt-1 block">
                                Saldo asignado: {formatMoney(fromBalance, currency)}
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Hacia Caja
                            </label>
                            <select
                                value={toBoxKey}
                                onChange={(e) => { setToBoxKey(e.target.value); setPreviewData(null); }}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            >
                                {boxes.map(b => (
                                    <option key={b.key} value={b.key} disabled={b.key === fromBoxKey}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Motivo Obligatorio del Traspaso *
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => { setReason(e.target.value); setPreviewData(null); }}
                            placeholder="Ej: Cobertura explícita de gasto operativo puntual"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    {/* Advertencia automática si la caja origen es Stock */}
                    {fromBoxKey === 'stock' && (
                        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-1">
                            <p className="font-black flex items-center gap-1.5 text-amber-300">
                                <AlertTriangle size={15} /> Atención: Consumo de Capital de Stock
                            </p>
                            <p className="leading-relaxed">
                                Estás reasignando capital de <strong>Stock / Vehículos</strong> hacia otra caja. Esto reduce directamente el capital disponible para reponer unidades sin hacerse nunca de forma automática.
                            </p>
                        </div>
                    )}

                    {/* Vista Previa del Impacto */}
                    {previewData && (
                        <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4 text-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="font-black text-purple-200 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                    <Eye size={13} /> Vista Previa antes de Confirmar
                                </span>
                                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                    Saldo bancario sin cambios
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                    <span className="text-[10px] text-crm-fg-muted block">Origen: {previewData.fromBox?.name}</span>
                                    <p className="font-mono text-xs text-crm-fg-muted line-through">
                                        Antes: {formatMoney(previewData.fromBox?.before, currency)}
                                    </p>
                                    <p className="font-mono text-sm font-black text-amber-300">
                                        Después: {formatMoney(previewData.fromBox?.after, currency)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-crm-border bg-crm-bg p-2.5">
                                    <span className="text-[10px] text-crm-fg-muted block">Destino: {previewData.toBox?.name}</span>
                                    <p className="font-mono text-xs text-crm-fg-muted line-through">
                                        Antes: {formatMoney(previewData.toBox?.before, currency)}
                                    </p>
                                    <p className="font-mono text-sm font-black text-emerald-400">
                                        Después: {formatMoney(previewData.toBox?.after, currency)}
                                    </p>
                                </div>
                            </div>
                            {previewData.stockConsumptionWarning && (
                                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 text-[11px] text-red-200">
                                    <strong>Consecuencia sobre Stock:</strong> {previewData.stockConsumptionWarning.consequence}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-xs font-bold text-crm-fg-muted hover:text-white"
                        >
                            Cancelar
                        </button>
                        {!previewData ? (
                            <button
                                type="button"
                                disabled={isLoadingPreview || !amount || !reason.trim()}
                                onClick={handlePreview}
                                className="flex-1 rounded-xl border border-purple-500/40 bg-purple-600/20 p-3 text-xs font-black text-purple-200 hover:bg-purple-600/30 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                                <Eye size={14} /> {isLoadingPreview ? 'Calculando...' : 'Ver Vista Previa'}
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 rounded-xl bg-emerald-600 p-3 text-xs font-black text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                            >
                                <CheckCircle2 size={14} /> {isSubmitting ? 'Transfiriendo...' : 'Confirmar Traspaso'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
