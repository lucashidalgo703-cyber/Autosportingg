"use client";

import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CancelRescheduleModal({
    isOpen,
    onClose,
    installment,
    onSuccess
}) {
    const [cancelReason, setCancelReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !installment) return null;

    const originalDueStr = installment.originalDueDate
        ? new Date(installment.originalDueDate).toLocaleDateString('es-AR')
        : (installment.dueDate ? new Date(installment.dueDate).toLocaleDateString('es-AR') : '-');

    const currentDueStr = installment.rescheduledDate
        ? new Date(installment.rescheduledDate).toLocaleDateString('es-AR')
        : '-';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!cancelReason || !cancelReason.trim()) {
            toast.error('El motivo para cancelar la reprogramación es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/installments/${installment._id}/cancel-reschedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    cancelReason: cancelReason.trim()
                })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al cancelar la reprogramación');
                return;
            }
            toast.success('Reprogramación cancelada y vencimiento original restaurado');
            if (onSuccess) onSuccess();
            onClose();
        } catch {
            toast.error('Error de conexión al cancelar reprogramación');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-crm-surface">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                            <RotateCcw size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Cancelar Reprogramación</h3>
                            <p className="text-xs text-neutral-400">Restaurar la fecha de vencimiento original</p>
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start">
                        <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                        <div className="text-xs text-neutral-300 space-y-1">
                            <p className="font-semibold text-white">Se desestimará la fecha acordada.</p>
                            <p>
                                La cuota volverá a su vencimiento original del <strong className="text-white">{originalDueStr}</strong> (actualmente fijada en {currentDueStr}).
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                            Motivo de la cancelación <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Ej.: El cliente canceló el acuerdo / El acuerdo quedó sin efecto porque no se cumplió la entrega..."
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            className="w-full bg-black/50 border border-neutral-800 rounded-xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                        >
                            Volver
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !cancelReason.trim()}
                            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Procesando...' : 'Confirmar Cancelación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
