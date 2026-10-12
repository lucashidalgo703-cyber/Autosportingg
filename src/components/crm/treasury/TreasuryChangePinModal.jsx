"use client";

import React, { useState } from 'react';
import { KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TreasuryChangePinModal({ isOpen, onClose, onPinChanged }) {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!/^\d{4}$/.test(currentPin)) {
            toast.error('El PIN actual debe tener 4 dígitos.');
            return;
        }
        if (!/^\d{4}$/.test(newPin)) {
            toast.error('El nuevo PIN debe tener exactamente 4 dígitos.');
            return;
        }
        if (newPin !== confirmNewPin) {
            toast.error('La confirmación del nuevo PIN no coincide.');
            return;
        }
        if (newPin === currentPin) {
            toast.error('El nuevo PIN no puede ser idéntico al actual.');
            return;
        }

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/tesoreria-estrategica/pin/change', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPin, newPin, confirmNewPin })
            });

            const data = await res.json();
            if (!res.ok || !data.ok) {
                toast.error(data.message || 'Error al cambiar PIN');
                return;
            }

            toast.success('PIN de Tesorería Estratégica modificado con éxito');
            if (onPinChanged) onPinChanged(data.treasuryToken);
            onClose();
        } catch {
            toast.error('Error de red al cambiar el PIN.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl border border-purple-500/30 bg-crm-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-crm-border">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                            <KeyRound size={18} />
                        </span>
                        <h3 className="text-base font-black text-white">Cambiar PIN Privado</h3>
                    </div>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            PIN Actual (4 dígitos)
                        </label>
                        <input
                            type="password"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="••••"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full text-center font-mono tracking-widest text-xl font-bold rounded-xl border border-crm-border bg-crm-bg p-3 text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Nuevo PIN (4 dígitos)
                        </label>
                        <input
                            type="password"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="••••"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full text-center font-mono tracking-widest text-xl font-bold rounded-xl border border-crm-border bg-crm-bg p-3 text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-crm-fg-muted mb-1">
                            Confirmar Nuevo PIN
                        </label>
                        <input
                            type="password"
                            maxLength={4}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="••••"
                            value={confirmNewPin}
                            onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full text-center font-mono tracking-widest text-xl font-bold rounded-xl border border-crm-border bg-crm-bg p-3 text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-xl border border-crm-border bg-crm-surface-raised p-3 text-xs font-bold text-crm-fg-muted hover:text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || currentPin.length !== 4 || newPin.length !== 4}
                            className="flex-1 rounded-xl bg-purple-600 p-3 text-xs font-black text-white hover:bg-purple-500 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Guardando...' : 'Actualizar PIN'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
