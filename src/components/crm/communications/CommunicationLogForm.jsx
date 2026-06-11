import React, { useState } from 'react';
import { X, Save, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';

export default function CommunicationLogForm({ 
    isOpen, 
    onClose, 
    onSave, 
    entityType, 
    entityId, 
    clientId, 
    leadId, 
    saleId, 
    reservationId, 
    vehicleId,
    assignedTo 
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        channel: 'whatsapp',
        direction: 'outbound',
        outcome: 'contacted',
        title: '',
        notes: '',
        contactDate: new Date().toISOString().slice(0, 16),
        isImportant: false,
        shouldCreateTask: false,
        nextActionDate: ''
    });

    if (!isOpen) return null;

    const channels = [
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'phone', label: 'Llamada Telefónica' },
        { value: 'email', label: 'Email' },
        { value: 'in_person', label: 'Presencial' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'web', label: 'Web' },
        { value: 'internal_note', label: 'Nota Interna' },
        { value: 'other', label: 'Otro' }
    ];

    const outcomes = [
        { value: 'contacted', label: 'Contactado' },
        { value: 'no_response', label: 'Sin Respuesta' },
        { value: 'interested', label: 'Interesado' },
        { value: 'not_interested', label: 'No Interesado' },
        { value: 'pending_reply', label: 'Espera Respuesta' },
        { value: 'requested_financing', label: 'Pidió Financiación' },
        { value: 'requested_visit', label: 'Pidió Visita' },
        { value: 'requested_documentation', label: 'Pidió Docs' },
        { value: 'documentation_sent', label: 'Docs Enviados' },
        { value: 'reservation_followup', label: 'Seguimiento de Reserva' },
        { value: 'sale_followup', label: 'Seguimiento de Venta' },
        { value: 'post_sale_followup', label: 'Seguimiento Postventa' },
        { value: 'review_requested', label: 'Pidió Reseña' },
        { value: 'complaint', label: 'Reclamo' },
        { value: 'resolved', label: 'Resuelto' },
        { value: 'other', label: 'Otro' }
    ];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.title.trim()) {
            setError("El título/asunto es obligatorio.");
            return;
        }

        if (formData.shouldCreateTask && !formData.nextActionDate) {
            setError("Debe especificar una fecha para la tarea de seguimiento.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                entityType,
                entityId,
                clientId,
                leadId,
                saleId,
                reservationId,
                vehicleId,
                assignedTo,
                sourceModule: entityType === 'client' ? 'clientes' :
                              entityType === 'lead' ? 'leads' :
                              entityType === 'sale' ? 'ventas' :
                              entityType === 'reservation' ? 'reservas' : 'manual'
            };

            const res = await fetch('/api/admin/communication-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al guardar la comunicación');
            }

            const newLog = await res.json();
            onSave(newLog);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#161619] border border-crm-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-crm-border bg-[#1E1E24] rounded-t-xl shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageCircle size={20} className="text-[#E63027]" />
                        Registrar Interacción
                    </h3>
                    <button onClick={onClose} className="text-crm-fg-muted hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {error && (
                        <div className="bg-red-900/20 text-red-400 p-3 rounded-lg border border-red-900/50 mb-4 flex items-center gap-2 text-sm">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    <form id="comm-form" onSubmit={handleSubmit} className="space-y-5">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Canal de Contacto *</label>
                                <select 
                                    name="channel" 
                                    value={formData.channel} 
                                    onChange={handleChange}
                                    className="w-full bg-[#1E1E24] border border-crm-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-[#EF3329]"
                                >
                                    {channels.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Dirección *</label>
                                <select 
                                    name="direction" 
                                    value={formData.direction} 
                                    onChange={handleChange}
                                    className="w-full bg-[#1E1E24] border border-crm-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-[#EF3329]"
                                >
                                    <option value="outbound">Saliente (Nosotros contactamos)</option>
                                    <option value="inbound">Entrante (Ellos nos contactan)</option>
                                    <option value="internal">Interno (Nota de equipo)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Fecha y Hora del Contacto</label>
                                <input 
                                    type="datetime-local" 
                                    name="contactDate" 
                                    value={formData.contactDate} 
                                    onChange={handleChange}
                                    className="w-full bg-[#1E1E24] border border-crm-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-[#EF3329]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Resultado de la Interacción *</label>
                                <select 
                                    name="outcome" 
                                    value={formData.outcome} 
                                    onChange={handleChange}
                                    className="w-full bg-[#1E1E24] border border-crm-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-[#EF3329]"
                                >
                                    {outcomes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Asunto / Resumen *</label>
                            <input 
                                type="text" 
                                name="title" 
                                value={formData.title} 
                                onChange={handleChange}
                                placeholder="Ej: Llamada de seguimiento por financiación"
                                className="w-full bg-[#1E1E24] border border-crm-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-[#EF3329]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Notas detalladas</label>
                            <textarea 
                                name="notes" 
                                value={formData.notes} 
                                onChange={handleChange}
                                rows="3"
                                placeholder="Detalles de la conversación, acuerdos, objeciones..."
                                className="w-full bg-[#1E1E24] border border-crm-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-[#EF3329] resize-none"
                            ></textarea>
                        </div>

                        <div className="bg-[#1E1E24] border border-crm-border p-4 rounded-lg">
                            <label className="flex items-center gap-3 cursor-pointer mb-3">
                                <input 
                                    type="checkbox" 
                                    name="shouldCreateTask" 
                                    checked={formData.shouldCreateTask} 
                                    onChange={handleChange}
                                    className="w-4 h-4 rounded border-crm-border bg-[#24242B] text-[#E63027] focus:ring-[#EF3329]"
                                />
                                <span className="text-sm font-bold text-white flex items-center gap-2">
                                    <CalendarIcon size={16} className="text-[#E63027]" />
                                    Crear tarea de seguimiento en agenda
                                </span>
                            </label>

                            {formData.shouldCreateTask && (
                                <div className="pl-7 mt-2">
                                    <label className="block text-xs font-bold text-crm-fg-muted uppercase mb-1">Fecha para el seguimiento *</label>
                                    <input 
                                        type="datetime-local" 
                                        name="nextActionDate" 
                                        value={formData.nextActionDate} 
                                        onChange={handleChange}
                                        className="w-full bg-[#24242B] border border-crm-border text-white text-sm rounded-lg p-2.5 focus:outline-none focus:border-[#EF3329]"
                                        required={formData.shouldCreateTask}
                                    />
                                    <p className="text-xs text-crm-fg-muted mt-1">Se creará una tarea asociada a esta entidad y responsable actual.</p>
                                </div>
                            )}
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                name="isImportant" 
                                checked={formData.isImportant} 
                                onChange={handleChange}
                                className="w-4 h-4 rounded border-crm-border bg-[#24242B] text-crm-red focus:ring-red-500"
                            />
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-400" />
                                Marcar como interacción crítica / importante
                            </span>
                        </label>
                        
                    </form>
                </div>

                <div className="p-4 border-t border-crm-border bg-[#1E1E24] rounded-b-xl flex justify-end gap-3 shrink-0">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-bold text-crm-fg-muted bg-[#24242B] hover:bg-crm-surface-raised rounded-lg transition-colors border border-crm-border"
                    >
                        Cancelar
                    </button>
                    <button 
                        type="submit" 
                        form="comm-form"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-bold text-white bg-[#E63027] hover:bg-[#C42620] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : <><Save size={16} /> Guardar Interacción</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { MessageCircle } from 'lucide-react';
