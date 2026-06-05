import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, Clock, Handshake, Tag, Target, X } from 'lucide-react';

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
                setFormData({
                    title: task.title || '',
                    description: task.description || '',
                    type: task.type || 'general',
                    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                    dueTime: task.dueTime || '',
                    priority: task.priority || 'media'
                });
            } else if (defaultData) {
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
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditMode = !!task;
    const isCalendarMode = !isEditMode && defaultData?.source === 'agenda';
    const calendarColors = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];
    const inputClass = isCalendarMode
        ? "w-full rounded-lg border border-[#27272a] bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition-colors focus:border-zinc-700 focus:outline-none"
        : "w-full rounded-lg border border-crm-border bg-crm-bg px-4 py-2.5 text-sm text-crm-fg transition-colors focus:border-crm-red focus:outline-none focus:ring-1 focus:ring-crm-red";
    const labelClass = isCalendarMode
        ? "mb-1 block text-[10px] font-bold uppercase tracking-widest text-zinc-400"
        : "mb-2 block text-xs font-bold uppercase tracking-[0.08em] text-crm-fg-muted";
    const modalTitle = isCalendarMode ? 'Nuevo Evento' : (isEditMode ? 'Editar tarea' : 'Crear tarea');
    const modalSubtitle = isCalendarMode ? 'Planifica compromisos, entregas y seguimientos' : 'Agendar nueva accion o seguimiento';
    const titleLabel = isCalendarMode ? 'Titulo del compromiso *' : 'Titulo de la tarea';
    const titlePlaceholder = isCalendarMode ? 'Ej: Reunion con cliente, entrega Hilux' : 'Ej: Seguimiento de documentacion...';
    const notesLabel = isCalendarMode ? 'Descripcion / Notas' : 'Detalle / Notas';
    const notesPlaceholder = isCalendarMode ? 'Escribe comentarios, notas o la agenda del compromiso...' : 'Notas adicionales de la tarea...';
    const submitLabel = isCalendarMode ? 'Crear Evento' : 'Guardar tarea';

    return (
        <div className={`fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm ${isCalendarMode ? 'z-[60] bg-black/60' : 'z-50 bg-black/80'}`}>
            <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl shadow-2xl ${isCalendarMode ? 'max-w-3xl border border-[#27272a] bg-[#18181b]' : 'max-w-lg border border-crm-border bg-crm-surface'}`}>
                <div className={`flex shrink-0 items-center justify-between border-b ${isCalendarMode ? 'border-[#27272a] px-6 py-4' : 'border-crm-border bg-crm-topbar p-5'}`}>
                    {isCalendarMode ? (
                        <h3 className="m-0 text-sm font-bold uppercase tracking-wider text-white">{modalTitle}</h3>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-crm-red/20 bg-crm-red/10">
                                <Target size={20} className="text-crm-red" />
                            </div>
                            <div>
                                <h2 className="m-0 text-lg font-bold text-crm-fg">{modalTitle}</h2>
                                <p className="m-0 mt-1 text-xs text-crm-fg-muted">{modalSubtitle}</p>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className={`m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent transition-colors ${isCalendarMode ? 'text-zinc-500 hover:text-white' : 'text-crm-fg-muted hover:bg-crm-surface hover:text-crm-fg'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto ${isCalendarMode ? 'p-6' : 'p-5 custom-scrollbar'}`}>
                    <form id="crm-task-form" onSubmit={handleSubmit} className={isCalendarMode ? 'grid grid-cols-1 gap-6 md:grid-cols-2' : 'flex flex-col gap-5'}>
                        <div className="space-y-4">
                            {isCalendarMode && (
                                <span className="block border-b border-[#27272a] pb-1 text-[10px] font-bold uppercase tracking-wider text-[#dc2626]">
                                    Detalles del Compromiso
                                </span>
                            )}

                            <div>
                                <label className={labelClass}>{titleLabel}</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={titlePlaceholder}
                                    className={inputClass}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`${labelClass} flex items-center gap-1.5`}>
                                        <Tag size={14} /> Tipo
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className={`${inputClass} cursor-pointer appearance-none`}
                                    >
                                        <option value="general">General</option>
                                        <option value="venta">Venta</option>
                                        <option value="cobranza">Cobranza</option>
                                        <option value="documentacion">Documentacion</option>
                                        <option value="entrega">Entrega</option>
                                        <option value="postventa">Postventa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`${labelClass} flex items-center gap-1.5`}>
                                        <Calendar size={14} /> Fecha
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className={`${inputClass} [color-scheme:dark]`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`${labelClass} flex items-center gap-1.5`}>
                                        <Clock size={14} /> Hora
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.dueTime}
                                        onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                                        className={`${inputClass} [color-scheme:dark]`}
                                    />
                                </div>
                                {isCalendarMode ? (
                                    <div>
                                        <label className={labelClass}>Notificar a</label>
                                        <select
                                            value="Todos los sectores"
                                            disabled
                                            className={`${inputClass} cursor-not-allowed appearance-none text-zinc-500`}
                                        >
                                            <option>Todos los sectores</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className={`${labelClass} flex items-center gap-1.5`}>
                                            <AlertCircle size={14} /> Prioridad
                                        </label>
                                        <select
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            className={`${inputClass} cursor-pointer appearance-none`}
                                        >
                                            <option value="baja">Baja</option>
                                            <option value="media">Media</option>
                                            <option value="alta">Alta</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {isCalendarMode && (
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                        Color de Etiqueta
                                    </label>
                                    <div className="flex gap-2">
                                        {calendarColors.map((color, index) => (
                                            <span
                                                key={color}
                                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${index === 0 ? 'scale-105 border-white shadow-md' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            >
                                                {index === 0 && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!isCalendarMode && !isEditMode && defaultData?.saleId && (
                                <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                                    <Handshake size={20} className="shrink-0 text-blue-300" />
                                    <div>
                                        <p className="m-0 text-xs font-bold text-blue-300">Tarea vinculada a Venta</p>
                                        <p className="m-0 mt-0.5 text-[11px] text-crm-fg-muted">Se asociara automaticamente a la venta en curso.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {isCalendarMode && (
                                <span className="block border-b border-[#27272a] pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                                    Vinculacion y Notas
                                </span>
                            )}

                            {isCalendarMode && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Cliente</label>
                                            <select
                                                value="Sin cliente"
                                                disabled
                                                className={`${inputClass} cursor-not-allowed appearance-none text-zinc-500`}
                                            >
                                                <option>Sin cliente</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Telefono Cliente</label>
                                            <input
                                                type="text"
                                                disabled
                                                placeholder="Ingresa telefono"
                                                className={`${inputClass} cursor-not-allowed text-zinc-500 placeholder:text-zinc-600`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClass}>Vehiculo del Stock</label>
                                        <select
                                            value="Sin vehiculo"
                                            disabled
                                            className={`${inputClass} cursor-not-allowed appearance-none text-zinc-500`}
                                        >
                                            <option>Sin vehiculo</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {isCalendarMode && (
                                <div>
                                    <label className={labelClass}>Creador / Asignado</label>
                                    <input
                                        type="text"
                                        disabled
                                        value="Equipo AutoSporting"
                                        className="w-full cursor-not-allowed rounded-lg border border-[#27272a] bg-[#141416] px-3 py-2 text-xs font-semibold text-zinc-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>{notesLabel}</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={isCalendarMode ? 6 : 4}
                                    placeholder={notesPlaceholder}
                                    className={`${inputClass} resize-none py-3`}
                                />
                            </div>

                            {isCalendarMode && (
                                <div className="flex justify-end gap-3 pt-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isSubmitting}
                                        className="m-0 appearance-none rounded-lg border border-[#27272a] bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="m-0 appearance-none rounded-lg border-0 bg-[#dc2626] px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-colors hover:bg-red-500 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Guardando...' : submitLabel}
                                    </button>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {!isCalendarMode && (
                <div className="flex shrink-0 justify-end gap-3 border-t border-crm-border bg-crm-topbar p-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="m-0 appearance-none rounded-lg border border-crm-border bg-transparent px-5 py-2.5 text-sm font-bold text-crm-fg transition-colors hover:bg-crm-surface-raised disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="crm-task-form"
                        disabled={isSubmitting}
                        className="m-0 flex appearance-none items-center gap-2 rounded-lg border-0 bg-crm-red px-5 py-2.5 text-sm font-bold text-white shadow-crm-red transition-colors hover:bg-crm-red-hover disabled:opacity-50"
                    >
                        {isSubmitting ? 'Guardando...' : submitLabel}
                    </button>
                </div>
                )}
            </div>
        </div>
    );
}
