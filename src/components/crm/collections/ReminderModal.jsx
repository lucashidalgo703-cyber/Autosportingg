import React, { useState, useEffect } from 'react';
import { Bell, X, Calendar, Clock, AlertCircle } from 'lucide-react';

export default function ReminderModal({ isOpen, onClose, installment, onSave }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        priority: 'media'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && installment) {
            const clientName = installment.clientId?.fullName || installment.clientId?.firstName || 'Sin cliente';
            const vehicleName = installment.vehicleId ? `${installment.vehicleId.brand} ${installment.vehicleId.name}` : 'Sin vehículo';
            
            const fs = installment.financeSummary;
            let balanceCuota = 0;
            if (installment.currency === 'ARS') balanceCuota = (fs?.ingresosARS || 0) - (fs?.egresosARS || 0);
            if (installment.currency === 'USD') balanceCuota = (fs?.ingresosUSD || 0) - (fs?.egresosUSD || 0);
            const saldoCuota = installment.amount - balanceCuota;

            // Default due date = tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            setFormData({
                title: `Cobrar cuota N° ${installment.installmentNumber}`,
                description: `Cliente: ${clientName}\nVehículo: ${vehicleName}\nVencimiento Cuota: ${new Date(installment.dueDate).toLocaleDateString('es-AR')}\nImporte Total: ${installment.currency} ${installment.amount.toLocaleString('es-AR')}\nSaldo Pendiente: ${installment.currency} ${saldoCuota.toLocaleString('es-AR')}`,
                dueDate: tomorrow.toISOString().split('T')[0],
                dueTime: '10:00',
                priority: 'media'
            });
            setIsSubmitting(false);
        }
    }, [isOpen, installment]);

    if (!isOpen || !installment) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const getMongoId = (value) => {
            if (!value) return undefined;
            if (typeof value === "string" && value.trim() !== "") return value;
            if (typeof value === "object" && value._id) return value._id;
            return undefined;
        };

        const taskData = {
            ...formData,
            type: 'cobranza',
            source: 'cobranzas',
            status: 'pendiente',
            installmentId: getMongoId(installment._id),
            saleId: getMongoId(installment.saleId),
            clientId: getMongoId(installment.clientId),
            vehicleId: getMongoId(installment.vehicleId)
        };

        try {
            await onSave(taskData);
            onClose();
        } catch (error) {
            console.error('Error saving reminder:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#161619] border border-[#33333A] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-[#33333A] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <Bell size={20} className="text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Crear Recordatorio</h2>
                            <p className="text-xs text-[#A1A1AA]">Agendar tarea de seguimiento de cobranza</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#24242B] rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                    <form id="reminder-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Título de la tarea</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                            />
                        </div>

                        {/* Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Calendar size={14} /> Fecha
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Clock size={14} /> Hora
                                </label>
                                <input
                                    type="time"
                                    value={formData.dueTime}
                                    onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                                    className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertCircle size={14} /> Prioridad
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {['baja', 'media', 'alta'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, priority: p })}
                                        className={`py-2 rounded-xl text-sm font-bold capitalize transition-colors border ${
                                            formData.priority === p 
                                                ? p === 'alta' ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                                : p === 'media' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                                                : 'bg-green-500/20 text-green-400 border-green-500/50'
                                            : 'bg-black/40 text-neutral-400 border-[#33333A] hover:bg-[#24242B]'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Detalle / Notas</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={5}
                                className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[#33333A] flex justify-end gap-3 shrink-0 bg-[#161619] rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:bg-[#33333A] transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="reminder-form"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Recordatorio'}
                    </button>
                </div>

            </div>
        </div>
    );
}
