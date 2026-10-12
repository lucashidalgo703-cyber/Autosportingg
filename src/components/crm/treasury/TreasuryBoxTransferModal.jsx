"use client";

import React, { useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TreasuryBoxTransferModal({
    isOpen,
    onClose,
    boxes = [],
    treasuryToken,
    onTransferSuccess
}) {
    const [fromBoxKey, setFromBoxKey] = useState('operativa');
    const [toBoxKey, setToBoxKey] = useState('personal');
    const [currency, setCurrency] = useState('USD');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('Reasignación estratégica de fondos');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const fromBox = boxes.find(b => b.key === fromBoxKey);
    const toBox = boxes.find(b => b.key === toBoxKey);

    const fromBalance = fromBox ? (currency === 'USD' ? fromBox.balanceUSD : fromBox.balanceARS) || 0 : 0;

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
                    reason
                })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al transferir fondos entre cajas');
                return;
            }

            toast.success(data.message || 'Traspaso completado con éxito');
            if (onTransferSuccess) onTransferSuccess();
            onClose();
        } catch {
            toast.error('Error de conexión al transferir fondos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-crm-border">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                            <ArrowRightLeft size={18} />
                        </span>
                        <div>
                            <h3 className="text-base font-black text-white">Traspaso entre Cajas</h3>
                            <p className="text-[11px] text-crm-fg-muted">Reasignación interna sin afectar bancos ni efectivo</p>
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
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                            >
                                <option value="USD">USD (Dólares)</option>
                                <option value="ARS">ARS (Pesos)</option>
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
                                onChange={(e) => setAmount(e.target.value)}
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
                                onChange={(e) => setFromBoxKey(e.target.value)}
                                className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            >
                                {boxes.map(b => (
                                    <option key={b.key} value={b.key}>{b.name}</option>
                                ))}
                            </select>
                            <span className="text-[10px] text-crm-fg-muted mt-1 block">
                                Saldo disponible: {currency} {fromBalance.toLocaleString('es-AR')}
                            </span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                                Hacia Caja
                            </label>
                            <select
                                value={toBoxKey}
                                onChange={(e) => setToBoxKey(e.target.value)}
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
                            Motivo / Concepto del Traspaso
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej: Reserva para impuestos de fin de mes"
                            className="w-full rounded-xl border border-crm-border bg-crm-bg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-xs font-bold text-crm-fg-muted hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !amount}
                            className="flex-1 rounded-xl bg-purple-600 p-3 text-xs font-black text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Transfiriendo...' : 'Confirmar Traspaso'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
