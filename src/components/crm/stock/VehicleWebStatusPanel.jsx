"use client";
import React, { useState } from 'react';
import { Globe, AlertTriangle, CheckCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import CrmCard from '../ui/CrmCard';

export default function VehicleWebStatusPanel({ vehicle, onSaveComplete }) {
    const [visibleEnWeb, setVisibleEnWeb] = useState(vehicle?.visibleEnWeb !== false);
    const [status, setStatus] = useState(vehicle?.status || 'Disponible');
    const [isSaving, setIsSaving] = useState(false);

    const isPublicado = visibleEnWeb && status.toLowerCase() === 'disponible';
    const imageCount = vehicle?.images?.length || 0;

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const payload = { visibleEnWeb, status };

            const API_URL = process.env.NEXT_PUBLIC_API_URL;
            const baseUrl = process.env.NODE_ENV === 'production' ? '' : (API_URL || 'http://localhost:3001');
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            toast.loading("Actualizando publicación...", { id: 'saveWeb' });

            const response = await fetch(`${baseUrl}/api/admin/cars/${vehicle.id || vehicle._id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Error al actualizar');
            }

            toast.success("Publicación actualizada", { id: 'saveWeb' });
            if (onSaveComplete) onSaveComplete();
        } catch (error) {
            toast.error(error.message, { id: 'saveWeb' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <CrmCard>
            <div className="flex justify-between items-center mb-4 border-b border-[#33333A] pb-3">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <Globe size={18} className={isPublicado ? "text-blue-400" : "text-gray-400"} />
                    Publicación Web
                </h3>
                {isPublicado ? (
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                        <CheckCircle size={10} /> Publicado en catálogo
                    </span>
                ) : (
                    <span className="text-[10px] bg-[#24242B] text-gray-400 border border-[#33333A] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                        Oculto del catálogo
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#A1A1AA]">Estado Operativo</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-[#09090B] border border-[#33333A] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#E63027]">
                        <option value="Disponible">Disponible</option>
                        <option value="Reservado">Reservado</option>
                        <option value="Vendido">Vendido</option>
                        <option value="Pausado">Pausado</option>
                    </select>
                </div>

                <label className="flex items-center justify-between cursor-pointer p-3 bg-[#09090B] border border-[#33333A] rounded-lg group hover:border-[#E63027]/50 transition-colors">
                    <div className="flex flex-col">
                        <span className="text-white font-medium text-sm">Mostrar en sitio web</span>
                        <span className="text-[10px] text-[#A1A1AA]">Visibilidad pública del vehículo</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${visibleEnWeb ? 'bg-[#E63027]' : 'bg-[#33333A]'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${visibleEnWeb ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                    {/* Hidden input strictly for React state sync if needed, though state is managed directly */}
                    <input type="checkbox" className="hidden" checked={visibleEnWeb} onChange={(e) => setVisibleEnWeb(e.target.checked)} />
                </label>

                {!isPublicado && (
                    <div className="flex items-start gap-2 p-3 bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-lg">
                        <AlertTriangle size={16} className="text-[#EAB308] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#EAB308] leading-relaxed">
                            {status.toLowerCase() === 'pausado' ? 'Este vehículo está pausado y no aparece en el catálogo.' : 
                             !visibleEnWeb ? 'Este vehículo está oculto del sitio web.' : 
                             'Para aparecer en el catálogo, el vehículo debe estar en estado Disponible y tener Mostrar en sitio web activado.'}
                        </p>
                    </div>
                )}

                {imageCount === 0 && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400 leading-relaxed">
                            Este vehículo no tiene imágenes cargadas. Se recomienda agregar fotos antes de publicarlo.
                        </p>
                    </div>
                )}

                <div className="flex justify-end mt-2">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || (visibleEnWeb === (vehicle?.visibleEnWeb !== false) && status === vehicle?.status)}
                        className="bg-[#161619] border border-[#33333A] hover:bg-[#24242B] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div> : <Save size={14} />}
                        Guardar Publicación
                    </button>
                </div>
            </div>
        </CrmCard>
    );
}
