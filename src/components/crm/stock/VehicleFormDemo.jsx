"use client";
import { useState } from 'react';
import { X } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function VehicleFormDemo({ isOpen, onClose, onSubmit }) {
    const [loading, setLoading] = useState(false);
    
    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulación de guardado
        setTimeout(() => {
            onSubmit(); // Llama la funcion padre para actualizar UI
            setLoading(false);
            onClose();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1E1E24] border border-[#33333A] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
                
                <div className="flex justify-between items-center p-4 border-b border-[#33333A]">
                    <div>
                        <h2 className="text-lg font-bold text-white">Nuevo Vehículo (Demo)</h2>
                        <p className="text-xs text-[#A1A1AA]">Solo previsualización. No guarda en base de datos.</p>
                    </div>
                    <button onClick={onClose} className="text-[#A1A1AA] hover:text-white transition-colors p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    <form id="vehicle-demo-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm text-[#A1A1AA]">Marca</label>
                                <input required type="text" className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]" placeholder="Ej: Toyota" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm text-[#A1A1AA]">Modelo</label>
                                <input required type="text" className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]" placeholder="Ej: Corolla" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm text-[#A1A1AA]">Versión</label>
                                <input required type="text" className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]" placeholder="Ej: 2.0 XEI CVT" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm text-[#A1A1AA]">Año</label>
                                <input required type="number" className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]" placeholder="Ej: 2022" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm text-[#A1A1AA]">Kilometraje</label>
                                <input required type="number" className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]" placeholder="Ej: 35000" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm text-[#A1A1AA]">Dominio</label>
                                <input type="text" className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027] font-mono uppercase" placeholder="AE123XX" />
                            </div>
                        </div>

                        <div className="border-t border-[#33333A] pt-4 mt-2">
                            <h3 className="text-sm font-semibold text-white mb-3">Valores y Origen</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm text-[#A1A1AA]">Origen</label>
                                    <select className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]">
                                        <option value="propio">Propio</option>
                                        <option value="consignación">Consignación</option>
                                        <option value="tercero">Tercero</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm text-[#A1A1AA]">Moneda</label>
                                    <select className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]">
                                        <option value="USD">USD - Dólares</option>
                                        <option value="ARS">ARS - Pesos</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm text-[#A1A1AA]">Estado Inicial</label>
                                    <select className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]">
                                        <option value="disponible">Disponible</option>
                                        <option value="preparación">En preparación</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm text-[#A1A1AA]">Costo de Compra</label>
                                    <input type="number" required className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]" placeholder="0" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm text-[#A1A1AA]">Precio Publicado</label>
                                    <input type="number" required className="bg-[#161619] border border-[#33333A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E63027]" placeholder="0" />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-[#33333A] flex justify-end gap-3 bg-[#161619] rounded-b-xl">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-[#A1A1AA] hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <CrmButton form="vehicle-demo-form" type="submit" disabled={loading}>
                        {loading ? 'Guardando...' : 'Crear Vehículo'}
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}
