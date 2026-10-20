"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RescheduleInstallmentModal({
    isOpen,
    onClose,
    installment,
    onSuccess
}) {
    const [newDate, setNewDate] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && installment) {
            const currentDue = installment.rescheduledDate || installment.dueDate;
            if (currentDue) {
                // Sugerir por defecto 7 días después
                const d = new Date(currentDue);
                d.setDate(d.getDate() + 7);
                setNewDate(d.toISOString().split('T')[0]);
            } else {
                setNewDate('');
            }
            setReason('');
            setNotes('');
        }
    }, [isOpen, installment]);

    if (!isOpen || !installment) return null;

    const curr = installment.currency === 'USD' ? 'USD' : '$';
    const clientName = installment.client?.fullName || installment.clientId?.fullName || installment.clientName || 'Cliente';
    const vehicleText = installment.vehicle
        ? `${installment.vehicle.brand || ''} ${installment.vehicle.name || ''} ${installment.vehicle.plateOrVin ? `(${installment.vehicle.plateOrVin})` : ''}`
        : 'Vehículo';

    const originalDueStr = installment.originalDueDate
        ? new Date(installment.originalDueDate).toLocaleDateString('es-AR')
        : (installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('es-AR') : '-');

    const currentDueStr = installment.rescheduledDate
        ? new Date(installment.rescheduledDate).toLocaleDateString('es-AR')
        : (installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('es-AR') : '-');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newDate) {
            toast.error('Debés ingresar la nueva fecha acordada.');
            return;
        }
        if (!reason || !reason.trim()) {
            toast.error('El motivo de la reprogramación es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/installments/${installment._id}/reschedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    newDate: new Date(`${newDate}T12:00:00Z`).toISOString(),
                    reason: reason.trim(),
                    notes: notes.trim()
                })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al reprogramar cuota');
                return;
            }
            toast.success('Cuota reprogramada exitosamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de conexión al reprogramar cuota');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-crm-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Reprogramar Cuota</h3>
                            <p className="text-xs text-neutral-400">Acordar una nueva fecha de pago con el cliente</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Resumen de la cuota */}
                    <div className="bg-black/40 border border-neutral-800/60 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-neutral-300">
                            <span className="text-neutral-500">Cliente:</span>
                            <span className="font-semibold text-white">{clientName}</span>
                        </div>
                        <div className="flex justify-between items-center text-neutral-300">
                            <span className="text-neutral-500">Vehículo:</span>
                            <span className="font-semibold text-white">{vehicleText}</span>
                        </div>
                        <div className="flex justify-between items-center text-neutral-300">
                            <span className="text-neutral-500">Cuota:</span>
                            <span className="font-semibold text-white">
                                #{installment.installmentNumber || 1} de {installment.totalInstallments || 1} — {curr} {Number(installment.amount || 0).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className="pt-2 border-t border-neutral-800/60 grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-neutral-500 block text-[10px] uppercase font-bold tracking-wider">Vencimiento Original</span>
                                <span className="text-neutral-300 font-mono text-xs">{originalDueStr}</span>
                            </div>
                            <div>
                                <span className="text-neutral-500 block text-[10px] uppercase font-bold tracking-wider">Vencimiento Actual</span>
                                <span className="text-amber-400 font-mono text-xs font-bold">{currentDueStr}</span>
                            </div>
                        </div>
                    </div>

                    {/* Nueva fecha acordada */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                            Nueva fecha acordada <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
                            <input
                                type="date"
                                required
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full bg-black/50 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Motivo obligatorio */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                            Motivo de la reprogramación <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Ej.: Cliente solicitó extender el plazo hasta el día 28 por cobro de aguinaldo..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                        />
                        <span className="text-[11px] text-neutral-500 mt-1 block">
                            El motivo quedará asentado en el historial de cobranzas y auditoría de la cuota.
                        </span>
                    </div>

                    {/* Observaciones opcionales */}
                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                            Notas u observaciones adicionales (opcional)
                        </label>
                        <input
                            type="text"
                            placeholder="Contacto telefónico, condiciones acordadas, etc."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl py-2 px-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700 transition-colors"
                        />
                    </div>

                    {/* Botones */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !reason.trim() || !newDate}
                            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/10"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} />
                                    Confirmar Reprogramación
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
