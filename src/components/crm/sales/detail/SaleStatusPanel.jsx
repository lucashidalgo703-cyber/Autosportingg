import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Truck, Save } from 'lucide-react';

export default function SaleStatusPanel({ sale, onSave }) {
    const [docStatus, setDocStatus] = useState('pendiente');
    const [delStatus, setDelStatus] = useState('pendiente');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (sale) {
            setDocStatus(sale.documentationStatus || 'pendiente');
            setDelStatus(sale.deliveryStatus || 'pendiente');
            setHasChanges(false);
        }
    }, [sale]);

    const handleDocChange = (e) => {
        setDocStatus(e.target.value);
        setHasChanges(true);
    };

    const handleDelChange = (e) => {
        setDelStatus(e.target.value);
        setHasChanges(true);
    };

    const handleSaveClick = async () => {
        setIsSaving(true);
        try {
            await onSave({
                documentationStatus: docStatus,
                deliveryStatus: delStatus
            });
            setHasChanges(false);
        } catch (error) {
            console.error('Error saving statuses', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!sale) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#1E1E24]">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-orange-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Estados Operativos</h3>
                </div>
                {hasChanges && (
                    <button 
                        onClick={handleSaveClick}
                        disabled={isSaving}
                        className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center transition-colors shadow-lg disabled:opacity-50 flex-none gap-2"
                    >
                        {isSaving ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={14} />
                        )}
                        Guardar
                    </button>
                )}
            </div>

            <div className="p-5 flex-1 flex flex-col gap-6">
                
                {/* Documentation Status */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck size={14} />
                        Estado de Documentación
                    </label>
                    <select 
                        value={docStatus}
                        onChange={handleDocChange}
                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer font-medium"
                    >
                        <option value="pendiente">Pendiente (Incompleto)</option>
                        <option value="parcial">Parcial (En proceso)</option>
                        <option value="completo">Completo (Cerrado)</option>
                    </select>
                </div>

                {/* Delivery Status */}
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Truck size={14} />
                        Estado de Entrega
                    </label>
                    <select 
                        value={delStatus}
                        onChange={handleDelChange}
                        className="w-full bg-black/40 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-neutral-600 transition-colors appearance-none cursor-pointer font-medium"
                    >
                        <option value="pendiente">Pendiente</option>
                        <option value="preparando">Preparando Vehículo</option>
                        <option value="listo_para_entregar">Listo para Entregar</option>
                        <option value="entregado">Entregado (Finalizado)</option>
                    </select>
                </div>

                {/* Actual Delivery Date if delivered */}
                {sale.actualDeliveryDate && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex flex-col items-center mt-auto">
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-1">Fecha de Entrega Real</span>
                        <span className="text-sm font-bold text-white">
                            {new Date(sale.actualDeliveryDate).toLocaleDateString()}
                        </span>
                    </div>
                )}

            </div>
        </div>
    );
}
