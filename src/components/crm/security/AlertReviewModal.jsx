"use client";
import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function AlertReviewModal({ alert, onClose, onReviewSuccess }) {
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!alert) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/security/alerts/${alert.alertId}/review`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ notes })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Error al revisar alerta');
            }

            if (onReviewSuccess) {
                onReviewSuccess(data.alert);
            }
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-2xl border border-crm-border bg-crm-surface text-crm-fg shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">
                                Marcar Alerta como Revisada
                            </h3>
                            <p className="text-xs text-crm-fg-muted font-mono">
                                ID: {alert.alertId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-crm-fg-muted hover:bg-crm-surface-raised hover:text-white transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3.5 rounded-xl border border-crm-border bg-crm-surface-raised space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-crm-fg-muted">
                            Alerta Seleccionada
                        </span>
                        <p className="text-sm font-bold text-white">{alert.title}</p>
                        <p className="text-xs text-crm-fg-muted">{alert.description}</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-2">
                            Notas de la Verificación (Opcional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Revisado por el propietario: IP reconocida, se corroboró autenticidad con el operador..."
                            rows={3}
                            className="w-full rounded-xl border border-crm-border bg-crm-surface px-4 py-3 text-sm text-crm-fg placeholder:text-crm-fg-muted/60 focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red transition-colors custom-scrollbar"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-crm-border bg-crm-surface text-sm font-bold text-crm-fg hover:bg-crm-surface-raised transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
                        >
                            <CheckCircle2 size={16} />
                            <span>{submitting ? 'Guardando...' : 'Confirmar Revisión'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
