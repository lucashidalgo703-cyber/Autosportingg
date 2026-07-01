"use client";
import React, { useState } from 'react';
import { X, AlertOctagon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VehicleDeleteModal({ isOpen, onClose, vehicle, onSuccess }) {
    const [reason, setReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen || !vehicle) return null;

    const isVisibleEnWeb = vehicle.visibleEnWeb !== false;
    const hasReservations = false; // Evaluated server-side or passed down if known

    const handleDelete = async () => {
        if (!reason.trim()) {
            toast.error('Debes ingresar un motivo para eliminar el vehículo.');
            return;
        }

        try {
            setIsDeleting(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            toast.loading("Eliminando vehículo...", { id: 'deleteCar' });

            const res = await fetch(`${baseUrl}/api/cars/${vehicle.id || vehicle._id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Error al eliminar');
            }

            toast.success("Vehículo eliminado correctamente", { id: 'deleteCar' });
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error(error.message, { id: 'deleteCar' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-crm-bg border border-red-500/30 rounded-xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl shadow-red-900/20">
                <div className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-crm-red/10 rounded-full flex items-center justify-center mb-4">
                        <AlertOctagon size={32} className="text-crm-red" />
                    </div>
                    
                    <h2 className="text-xl font-bold text-white mb-2">Eliminar Vehículo</h2>
                    <p className="text-crm-fg-muted text-sm mb-6">
                        Estás a punto de eliminar el vehículo <strong className="text-white">{vehicle.marca} {vehicle.modelo} {vehicle.año}</strong> (Dominio: {vehicle.dominio}). Esta acción es permanente y quedará registrada en auditoría.
                    </p>

                    {isVisibleEnWeb && (
                        <div className="w-full bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-lg p-3 mb-4 text-left">
                            <p className="text-xs text-[#EAB308] font-medium">⚠️ El vehículo debe ocultarse de la web antes de eliminarlo.</p>
                        </div>
                    )}

                    <div className="w-full text-left mb-6">
                        <label className="block text-sm font-medium text-crm-fg-muted mb-2">Motivo de eliminación *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ej. Vehículo creado por prueba de permuta..."
                            className="w-full bg-crm-bg border border-crm-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-red-500 resize-none h-24"
                            disabled={isDeleting}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-crm-border bg-crm-bg flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-transparent text-crm-fg-muted hover:text-white transition-colors text-sm font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting || !reason.trim() || isVisibleEnWeb}
                        className="px-4 py-2 bg-crm-red hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Trash2 size={16} />}
                        Confirmar Eliminación
                    </button>
                </div>
            </div>
        </div>
    );
}
