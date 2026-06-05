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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
            <div className="my-auto flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-crm-border bg-crm-surface">
                
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-crm-border bg-crm-topbar p-5">
                    <h2 className="m-0 text-lg font-bold text-crm-fg">Editar cotizacion</h2>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                    >
                        <X size={19} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {error && (
                        <div className="mb-6 flex items-start gap-3 rounded-xl border border-crm-red/20 bg-crm-red/10 p-4 text-sm text-red-300">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form id="editLeadForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Estado CRM *</label>
                                <select 
                                    name="crmStatus"
                                    value={formData.crmStatus}
                                    onChange={handleChange}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
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
                                <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Prioridad *</label>
                                <select 
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
                                    required
                                >
                                    <option value="alta">Alta</option>
                                    <option value="media">Media</option>
                                    <option value="baja">Baja</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Origen *</label>
                                <select 
                                    name="source"
                                    value={formData.source}
                                    onChange={handleChange}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
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
                                <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Próxima Acción (Fecha)</label>
                                <input 
                                    type="date"
                                    name="nextActionDate"
                                    value={formData.nextActionDate}
                                    onChange={handleChange}
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
                                />
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Asignado a (Vendedor)</label>
                                <input 
                                    type="text"
                                    name="assignedTo"
                                    value={formData.assignedTo}
                                    onChange={handleChange}
                                    placeholder="Ej. Juan Pérez"
                                    className="w-full bg-crm-bg border border-crm-border rounded-lg px-4 py-2.5 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors"
                                />
                            </div>

                        </div>

                        <div className="h-px w-full bg-crm-border"></div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-crm-fg-muted uppercase tracking-wider">Agregar nueva nota (Opcional)</label>
                            <textarea 
                                name="newNote"
                                value={formData.newNote}
                                onChange={handleChange}
                                placeholder="Escribe aquí los detalles de la interacción o seguimiento..."
                                rows="3"
                                className="w-full bg-crm-bg border border-crm-border rounded-lg px-4 py-3 text-crm-fg focus:outline-none focus:border-crm-red focus:ring-1 focus:ring-crm-red transition-colors custom-scrollbar"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 justify-end gap-3 border-t border-crm-border bg-crm-topbar p-5">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-6 py-2.5 rounded-lg font-medium text-crm-fg-muted hover:text-crm-fg hover:bg-crm-surface-raised transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit"
                        form="editLeadForm"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-crm-red hover:bg-crm-red-hover text-white font-bold transition-colors disabled:opacity-50"
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
