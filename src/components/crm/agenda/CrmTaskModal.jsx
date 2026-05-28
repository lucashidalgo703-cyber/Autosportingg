import React, { useState, useEffect } from 'react';
import { Target, X, Calendar, Clock, AlertCircle, Tag, Handshake } from 'lucide-react';

export default function CrmTaskModal({ isOpen, onClose, task, onSave, defaultData }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'general',
        dueDate: '',
        dueTime: '',
        priority: 'media'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (task) {
                // Edit mode
                setFormData({
                    title: task.title || '',
                    description: task.description || '',
                    type: task.type || 'general',
                    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                    dueTime: task.dueTime || '',
                    priority: task.priority || 'media'
                });
            } else if (defaultData) {
                // Create mode with pre-filled data (e.g. from Sales)
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                setFormData({
                    title: defaultData.title || '',
                    description: defaultData.description || '',
                    type: defaultData.type || 'general',
                    dueDate: defaultData.dueDate || tomorrow.toISOString().split('T')[0],
                    dueTime: defaultData.dueTime || '10:00',
                    priority: defaultData.priority || 'media'
                });
            } else {
                // Create mode empty
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                setFormData({
                    title: '',
                    description: '',
                    type: 'general',
                    dueDate: tomorrow.toISOString().split('T')[0],
                    dueTime: '10:00',
                    priority: 'media'
                });
            }
            setIsSubmitting(false);
        }
    }, [isOpen, task, defaultData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        let taskData = { ...formData };

        if (!task) {
            // Creation mode: append defaultData links if available
            taskData = {
                ...taskData,
                status: 'pendiente',
                source: defaultData?.source || 'agenda',
                saleId: defaultData?.saleId,
                clientId: defaultData?.clientId,
                vehicleId: defaultData?.vehicleId,
                installmentId: defaultData?.installmentId,
                leadId: defaultData?.leadId
            };
        }

        try {
            await onSave(taskData);
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
            // Wait, we don't handle alert here, onSave should throw and we alert there or handle it.
            // Actually, we can alert here if it fails, but let the parent handle the error.
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditMode = !!task;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#161619] border border-[#33333A] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-[#33333A] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <Target size={20} className="text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{isEditMode ? 'Editar Tarea' : 'Crear Tarea'}</h2>
                            <p className="text-xs text-[#A1A1AA]">Agendar nueva acción o seguimiento</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#A1A1AA] hover:text-white hover:bg-[#24242B] rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                    <form id="crm-task-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        
                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Título de la tarea</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ej: Seguimiento de documentación..."
                                className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Type & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Tag size={14} /> Tipo
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="general">General</option>
                                    <option value="venta">Venta</option>
                                    <option value="cobranza">Cobranza</option>
                                    <option value="documentacion">Documentación</option>
                                    <option value="entrega">Entrega</option>
                                    <option value="postventa">Postventa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <AlertCircle size={14} /> Prioridad
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="baja">Baja</option>
                                    <option value="media">Media</option>
                                    <option value="alta">Alta</option>
                                </select>
                            </div>
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
                                    className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
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
                                    className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Detalle / Notas</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                placeholder="Notas adicionales de la tarea..."
                                className="w-full bg-black/40 border border-[#33333A] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                            />
                        </div>

                        {/* Linked Entity Info (Read-only for now if present) */}
                        {!isEditMode && defaultData?.saleId && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-3 items-center">
                                <Handshake size={20} className="text-blue-400 shrink-0" />
                                <div>
                                    <p className="text-xs text-blue-400 font-bold">Tarea vinculada a Venta</p>
                                    <p className="text-[11px] text-neutral-400 mt-0.5">Se asociará automáticamente a la venta en curso.</p>
                                </div>
                            </div>
                        )}

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
                        form="crm-task-form"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar Tarea'}
                    </button>
                </div>

            </div>
        </div>
    );
}
