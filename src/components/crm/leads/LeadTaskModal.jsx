import React, { useState } from 'react';
import { X, Calendar, FileText, CheckCircle } from 'lucide-react';

export default function LeadTaskModal({ isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        title: '',
        dueDate: '',
        note: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim()) {
            setError('El título de la tarea es obligatorio.');
            return;
        }

        setIsSaving(true);
        setError(null);
        
        try {
            const payload = {
                newTask: {
                    title: formData.title.trim(),
                    status: 'pendiente'
                }
            };
            
            if (formData.dueDate) {
                // Agregar la hora de fin de día para que no venza apenas empieza el día
                payload.newTask.dueDate = new Date(`${formData.dueDate}T23:59:59`);
            }
            if (formData.note.trim()) {
                payload.newTask.note = formData.note.trim();
            }

            await onSave(payload);
            
            // Limpiar formulario y cerrar
            setFormData({ title: '', dueDate: '', note: '' });
            onClose();
        } catch (err) {
            setError(err.message || 'Error al guardar la tarea');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#161619] border border-neutral-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle size={20} className="text-blue-500" />
                        Agregar Tarea
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    <form id="taskForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                                Título de la tarea *
                            </label>
                            <input 
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Ej. Llamar para ofrecer financiación"
                                className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                                <Calendar size={14} />
                                Fecha de vencimiento (Opcional)
                            </label>
                            <input 
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                                min={new Date().toISOString().split('T')[0]} // no permitir fechas pasadas
                                className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-neutral-400 flex items-center gap-2">
                                <FileText size={14} />
                                Detalles adicionales (Opcional)
                            </label>
                            <textarea 
                                name="note"
                                value={formData.note}
                                onChange={handleChange}
                                placeholder="Anotaciones útiles para cuando toque hacer esta tarea..."
                                rows="3"
                                className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar"
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-800 flex justify-end gap-3 bg-neutral-900/50 rounded-b-2xl">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-lg font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        form="taskForm"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50"
                    >
                        {isSaving ? 'Guardando...' : 'Agregar Tarea'}
                    </button>
                </div>

            </div>
        </div>
    );
}
