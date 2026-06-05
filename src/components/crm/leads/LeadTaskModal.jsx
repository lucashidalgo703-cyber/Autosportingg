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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-lg flex-col rounded-xl border border-crm-border bg-crm-surface shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-crm-border bg-crm-topbar p-5">
                    <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-crm-fg">
                        <CheckCircle size={19} className="text-blue-300" />
                        Agregar Tarea
                    </h2>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    {error && (
                        <div className="mb-4 rounded-lg border border-crm-red/20 bg-crm-red/10 p-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <form id="taskForm" onSubmit={handleSubmit} className="flex flex-col gap-5">
                        
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-crm-fg-muted">
                                Título de la tarea *
                            </label>
                            <input 
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Ej. Llamar para ofrecer financiación"
                                className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-crm-fg transition-colors focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-crm-fg-muted">
                                <Calendar size={14} />
                                Fecha de vencimiento (Opcional)
                            </label>
                            <input 
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                                min={new Date().toISOString().split('T')[0]} // no permitir fechas pasadas
                                className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-crm-fg transition-colors focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-crm-fg-muted">
                                <FileText size={14} />
                                Detalles adicionales (Opcional)
                            </label>
                            <textarea 
                                name="note"
                                value={formData.note}
                                onChange={handleChange}
                                placeholder="Anotaciones útiles para cuando toque hacer esta tarea..."
                                rows="3"
                                className="w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-crm-fg transition-colors focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red custom-scrollbar"
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-crm-border bg-crm-topbar p-5">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="rounded-lg px-5 py-2.5 font-semibold text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        form="taskForm"
                        disabled={isSaving}
                        className="flex items-center gap-2 rounded-lg bg-crm-red px-6 py-2.5 font-bold text-white transition-colors hover:bg-crm-red-hover disabled:opacity-50"
                    >
                        {isSaving ? 'Guardando...' : 'Agregar Tarea'}
                    </button>
                </div>

            </div>
        </div>
    );
}
