import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

export default function LeadEditModal({ isOpen, onClose, onSave, lead }) {
    const [formData, setFormData] = useState({
        crmStatus: '',
        priority: '',
        source: '',
        assignedTo: '',
        nextActionDate: '',
        newNote: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (lead && isOpen) {
            setFormData({
                crmStatus: lead.crmStatus || 'nuevo',
                priority: lead.priority || 'media',
                source: lead.source || 'otro',
                assignedTo: lead.assignedTo || '',
                nextActionDate: lead.nextActionDate ? new Date(lead.nextActionDate).toISOString().split('T')[0] : '',
                newNote: ''
            });
            setError(null);
        }
    }, [lead, isOpen]);

    if (!isOpen || !lead) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        
        try {
            // Build payload with only changed fields or new notes
            const payload = {};
            if (formData.crmStatus !== lead.crmStatus) payload.crmStatus = formData.crmStatus;
            if (formData.priority !== lead.priority) payload.priority = formData.priority;
            if (formData.source !== lead.source) payload.source = formData.source;
            if (formData.assignedTo !== lead.assignedTo) payload.assignedTo = formData.assignedTo;
            
            // Only send nextActionDate if changed
            const existingDate = lead.nextActionDate ? new Date(lead.nextActionDate).toISOString().split('T')[0] : '';
            if (formData.nextActionDate !== existingDate) {
                payload.nextActionDate = formData.nextActionDate || null;
            }

            if (formData.newNote.trim()) {
                payload.newNote = formData.newNote.trim();
            }

            if (Object.keys(payload).length > 0) {
                await onSave(payload);
            }
            onClose();
        } catch (err) {
            setError(err.message || 'Error al guardar los cambios');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
            <div className="bg-[#161619] border border-neutral-800 rounded-2xl w-full max-w-2xl flex flex-col my-auto max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-neutral-800 shrink-0">
                    <h2 className="text-xl font-bold text-white">Editar Oportunidad (Lead)</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-start gap-3">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form id="editLeadForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-neutral-400">Estado CRM *</label>
                                <select 
                                    name="crmStatus"
                                    value={formData.crmStatus}
                                    onChange={handleChange}
                                    className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                                    required
                                >
                                    <option value="nuevo">Nuevo</option>
                                    <option value="contactado">Contactado</option>
                                    <option value="interesado">Interesado</option>
                                    <option value="seguimiento">Seguimiento</option>
                                    <option value="reservado">Reservado</option>
                                    <option value="convertido">Convertido</option>
                                    <option value="perdido">Perdido</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-neutral-400">Prioridad *</label>
                                <select 
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                                    required
                                >
                                    <option value="alta">Alta</option>
                                    <option value="media">Media</option>
                                    <option value="baja">Baja</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-neutral-400">Origen *</label>
                                <select 
                                    name="source"
                                    value={formData.source}
                                    onChange={handleChange}
                                    className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                                    required
                                >
                                    <option value="web">Web</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="local">Local</option>
                                    <option value="referido">Referido</option>
                                    <option value="mercadolibre">Mercado Libre</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-neutral-400">Próxima Acción (Fecha)</label>
                                <input 
                                    type="date"
                                    name="nextActionDate"
                                    value={formData.nextActionDate}
                                    onChange={handleChange}
                                    className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                                />
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-sm font-medium text-neutral-400">Asignado a (Vendedor)</label>
                                <input 
                                    type="text"
                                    name="assignedTo"
                                    value={formData.assignedTo}
                                    onChange={handleChange}
                                    placeholder="Ej. Juan Pérez"
                                    className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                                />
                            </div>

                        </div>

                        <div className="h-px w-full bg-neutral-800/50"></div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-neutral-400">Agregar nueva nota (Opcional)</label>
                            <textarea 
                                name="newNote"
                                value={formData.newNote}
                                onChange={handleChange}
                                placeholder="Escribe aquí los detalles de la interacción o seguimiento..."
                                rows="3"
                                className="w-full bg-black/50 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors custom-scrollbar"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-800 flex justify-end gap-3 shrink-0">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-lg font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        form="editLeadForm"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <Save size={18} />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
