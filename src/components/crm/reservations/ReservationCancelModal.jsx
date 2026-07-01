"use client";
import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAdminReservations } from '../../../hooks/useAdminReservations';

export default function ReservationCancelModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    reservation 
}) {
    const { updateReservation } = useAdminReservations();
    
    const [status, setStatus] = useState('cancelada');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen || !reservation?._id) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!reason.trim()) {
            setError('Debes ingresar un motivo obligatorio para esta acción.');
            return;
        }

        setLoading(true);
        try {
            // Append reason to notes
            const updatedNotes = reservation?.notes 
                ? `${reservation.notes}\n\n[${new Date().toLocaleDateString()}] Motivo de cambio a ${status}: ${reason}` 
                : `Motivo de cambio a ${status}: ${reason}`;

            const payload = {
                status,
                notes: updatedNotes
            };

            await updateReservation(reservation._id, payload);
            setLoading(false);
            onSuccess();
        } catch (err) {
            setError(err.message || 'Error al procesar el cambio de estado de la reserva.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-crm-surface border border-crm-border rounded-2xl w-full max-w-lg shadow-2xl relative my-8">
                
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-crm-border bg-crm-surface rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-crm-red/10 text-crm-red p-2 rounded-lg">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Cancelar / Liberar Reserva</h2>
                            <p className="text-xs text-crm-fg-muted">Esta acción liberará el vehículo para nuevas reservas.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised p-2 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                    
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                            <AlertTriangle size={16} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="bg-crm-bg border border-crm-border p-4 rounded-xl text-sm text-crm-fg-muted">
                        Se liberará el vehículo <strong className="text-white">
                            {typeof reservation?.vehicleId === 'object' ? `${reservation.vehicleId?.brand || ''} ${reservation.vehicleId?.name || ''} ${reservation.vehicleId?.plateOrVin || ''}` : 'asociado a la reserva'}
                        </strong>. 
                        Asegúrate de haber gestionado la seña antes o de hacerlo a la brevedad.
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1">Nuevo Estado *</label>
                        <select
                            required
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-crm-red focus:border-crm-red outline-none"
                        >
                            <option value="cancelada">Cancelada (Desistió o no se concretó)</option>
                            <option value="vencida">Vencida (Expiró el plazo de reserva)</option>
                            <option value="devuelta">Seña Devuelta (El dinero fue restituido)</option>
                            <option value="retenida">Seña Retenida (Penalidad aplicada)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-crm-fg-muted uppercase tracking-wider mb-1">Motivo / Explicación *</label>
                        <textarea
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="w-full bg-crm-bg border border-crm-border text-crm-fg rounded-lg px-3 py-2 focus:ring-1 focus:ring-crm-red focus:border-crm-red outline-none resize-none"
                            placeholder="Ej: El cliente no consiguió la plata, o se le devolvió la seña por X motivo..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-crm-border bg-crm-surface flex justify-end gap-3 mt-2 rounded-b-2xl">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised rounded-lg transition-colors font-medium"
                            disabled={loading}
                        >
                            No, mantener reserva
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-crm-red hover:bg-crm-red-hover text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-crm-red/20"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <CheckCircle2 size={18} />
                                    Confirmar y Liberar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
