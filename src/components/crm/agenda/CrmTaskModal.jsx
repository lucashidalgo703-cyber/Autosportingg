import React, { useEffect, useState } from 'react';
import { AlertCircle, Calendar, Clock, Handshake, Tag, Target, User, X } from 'lucide-react';

const CALENDAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const CALENDAR_TYPE_OPTIONS = [
    { label: 'Reuni\u00f3n', value: 'general' },
    { label: 'Entrega', value: 'entrega' },
    { label: 'Vencimiento', value: 'documentacion' },
    { label: 'Seguimiento', value: 'postventa' },
    { label: 'Pago', value: 'cobranza' },
    { label: 'Llamada', value: 'lead' },
    { label: 'Otro', value: 'venta' }
];
const NOTIFY_OPTIONS = [
    '\u{1F310} Todos los sectores',
    '\u{1F4BC} Ventas',
    '\u{1F3DB} Gestor\u00eda',
    '\u{1F4B5} Finanzas',
    '\u{1F454} Administraci\u00f3n',
    '\u{1F4DE} Recepci\u00f3n'
];

const toInputDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
};

const calendarFieldClass = 'w-full rounded-lg border border-crm-border bg-crm-surface px-3 text-sm font-medium text-white outline-none transition-colors placeholder:text-crm-fg-muted focus:border-crm-red focus:ring-1 focus:ring-crm-red';
const calendarLabelClass = 'mb-1.5 block text-xs font-semibold leading-4 text-zinc-400';

function CalendarLabel({ children }) {
    return <label className={calendarLabelClass}>{children}</label>;
}

export default function CrmTaskModal({ isOpen, onClose, task, onSave, defaultData }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'general',
        dueDate: '',
        dueTime: '',
        priority: 'media',
        notifyTo: NOTIFY_OPTIONS[0],
        clientName: '',
        clientPhone: '',
        vehicleDescription: '',
        creatorLabel: 'Equipo AutoSporting'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedColor, setSelectedColor] = useState(CALENDAR_COLORS[0]);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (task) {
                setFormData({
                    title: task.title || '',
                    description: task.description || '',
                    type: task.type || 'general',
                    dueDate: toInputDate(task.dueDate),
                    dueTime: task.dueTime || '',
                    priority: task.priority || 'media',
                    notifyTo: NOTIFY_OPTIONS[0],
                    clientName: '',
                    clientPhone: '',
                    vehicleDescription: '',
                    creatorLabel: task.user || 'Equipo AutoSporting'
                });
            } else if (defaultData) {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                setFormData({
                    title: defaultData.title || '',
                    description: defaultData.description || '',
                    type: defaultData.type || 'general',
                    dueDate: defaultData.dueDate || toInputDate(tomorrow),
                    dueTime: defaultData.dueTime || '10:00',
                    priority: defaultData.priority || 'media',
                    notifyTo: NOTIFY_OPTIONS[0],
                    clientName: '',
                    clientPhone: '',
                    vehicleDescription: '',
                    creatorLabel: 'Equipo AutoSporting'
                });
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);

                setFormData({
                    title: '',
                    description: '',
                    type: 'general',
                    dueDate: toInputDate(tomorrow),
                    dueTime: '10:00',
                    priority: 'media',
                    notifyTo: NOTIFY_OPTIONS[0],
                    clientName: '',
                    clientPhone: '',
                    vehicleDescription: '',
                    creatorLabel: 'Equipo AutoSporting'
                });
            }
            setIsSubmitting(false);
            setSelectedColor(CALENDAR_COLORS[0]);
            setFormError('');
        }
    }, [isOpen, task, defaultData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError('');

        if (!formData.title.trim() || !formData.dueDate || !formData.type) {
            setFormError('Completa titulo, fecha y tipo para crear el evento.');
            setIsSubmitting(false);
            return;
        }

        const contextLines = defaultData?.source === 'agenda'
            ? [
                formData.clientName ? `Cliente: ${formData.clientName}` : '',
                formData.clientPhone ? `Telefono: ${formData.clientPhone}` : '',
                formData.vehicleDescription ? `Vehiculo: ${formData.vehicleDescription}` : ''
            ].filter(Boolean)
            : [];

        let taskData = {
            title: formData.title.trim(),
            description: [formData.description?.trim(), ...contextLines].filter(Boolean).join('\n'),
            type: formData.type || 'general',
            dueDate: formData.dueDate,
            dueTime: formData.dueTime || '',
            priority: formData.priority || 'media'
        };

        if (!task) {
            taskData = {
                ...taskData,
                status: 'pendiente',
                source: defaultData?.source || 'agenda'
            };

            if (defaultData?.saleId) taskData.saleId = defaultData.saleId;
            if (defaultData?.clientId) taskData.clientId = defaultData.clientId;
            if (defaultData?.vehicleId) taskData.vehicleId = defaultData.vehicleId;
            if (defaultData?.installmentId) taskData.installmentId = defaultData.installmentId;
            if (defaultData?.leadId) taskData.leadId = defaultData.leadId;
        }

        try {
            await onSave(taskData);
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
            setFormError(error?.message || 'No se pudo crear el evento. Revisa los datos e intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isEditMode = !!task;
    const isCalendarMode = !isEditMode && defaultData?.source === 'agenda';
    const calendarColors = ['#dc2626', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6b7280'];
    const inputClass = isCalendarMode
        ? "w-full rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-semibold text-white transition-colors focus:border-crm-border focus:outline-none"
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

    if (isCalendarMode) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                <div className="flex max-h-[calc(100vh-48px)] w-full max-w-[896px] flex-col overflow-hidden rounded-2xl border border-crm-border bg-crm-surface text-white shadow-2xl">
                    <div className="flex shrink-0 items-start justify-between border-b border-crm-border px-5 py-4 md:px-7">
                        <div>
                            <h2 className="m-0 text-lg font-bold leading-6 text-white">Nuevo evento</h2>
                            <p className="m-0 mt-0.5 text-sm leading-5 text-zinc-400">
                                {'Complet\u00e1 t\u00edtulo, fecha y tipo. El resto es opcional.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="m-0 inline-flex h-8 w-8 appearance-none items-center justify-center rounded-lg border-0 bg-transparent p-0 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                            aria-label="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form id="crm-task-form" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 md:px-7">
                            {formError && (
                                <div className="rounded-lg border border-crm-red/40 bg-crm-red/10 px-4 py-3 text-sm font-medium text-red-200">
                                    {formError}
                                </div>
                            )}

                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
                                    <Tag size={16} />
                                    Detalles
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="md:col-span-2">
                                        <CalendarLabel>{'T\u00edtulo'} <span className="text-crm-red">*</span></CalendarLabel>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Ej. Reunion con cliente, entrega Hilux"
                                            className={`${calendarFieldClass} h-9 ${!formData.title.trim() ? 'border-crm-red' : ''}`}
                                        />
                                    </div>

                                    <div>
                                        <CalendarLabel>Tipo <span className="text-crm-red">*</span></CalendarLabel>
                                        <select
                                            required
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className={`${calendarFieldClass} h-9 cursor-pointer appearance-none pr-8`}
                                        >
                                            {CALENDAR_TYPE_OPTIONS.map((option) => (
                                                <option key={option.label} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <CalendarLabel>Fecha <span className="text-crm-red">*</span></CalendarLabel>
                                        <input
                                            type="date"
                                            required
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                            className={`${calendarFieldClass} h-10 [color-scheme:dark]`}
                                        />
                                    </div>

                                    <div>
                                        <CalendarLabel>Hora (opcional)</CalendarLabel>
                                        <input
                                            type="time"
                                            value={formData.dueTime}
                                            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                                            className={`${calendarFieldClass} h-10 [color-scheme:dark]`}
                                        />
                                        <p className="m-0 mt-1.5 text-xs text-zinc-500">
                                            {'Dej\u00e1 vac\u00edo para eventos de d\u00eda entero'}
                                        </p>
                                    </div>

                                    <div>
                                        <CalendarLabel>Notificar a</CalendarLabel>
                                        <select
                                            value={formData.notifyTo}
                                            onChange={(e) => setFormData({ ...formData, notifyTo: e.target.value })}
                                            className={`${calendarFieldClass} h-9 cursor-pointer appearance-none pr-8`}
                                        >
                                            {NOTIFY_OPTIONS.map((option) => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <CalendarLabel>Color</CalendarLabel>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {CALENDAR_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedColor(color);
                                                    setFormData({
                                                        ...formData,
                                                        priority: color === '#ef4444' ? 'alta' : color === '#3b82f6' ? 'baja' : 'media'
                                                    });
                                                }}
                                                className={`m-0 flex h-9 w-9 appearance-none items-center justify-center rounded-full border-2 p-0 transition-all ${
                                                    selectedColor === color ? 'scale-105 border-white shadow-md' : 'border-transparent'
                                                }`}
                                                style={{ backgroundColor: color }}
                                                aria-label={`Color ${color}`}
                                            >
                                                {selectedColor === color && <span className="h-2 w-2 rounded-full bg-white" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
                                    <User size={16} />
                                    {'Vinculaci\u00f3n'}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div>
                                        <CalendarLabel>Cliente</CalendarLabel>
                                        <select className={`${calendarFieldClass} h-9 cursor-pointer appearance-none pr-8`} defaultValue="Sin cliente">
                                            <option>Sin cliente</option>
                                        </select>
                                        <p className="m-0 mt-1.5 text-xs text-zinc-500 md:hidden">
                                            {'Autorellena nombre y tel\u00e9fono'}
                                        </p>
                                    </div>

                                    <div>
                                        <CalendarLabel>Nombre cliente</CalendarLabel>
                                        <input
                                            type="text"
                                            value={formData.clientName}
                                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                            placeholder="Se autocompleta al elegir cliente"
                                            className={`${calendarFieldClass} h-9`}
                                        />
                                    </div>

                                    <div>
                                        <CalendarLabel>{'Tel\u00e9fono cliente'}</CalendarLabel>
                                        <input
                                            type="text"
                                            value={formData.clientPhone}
                                            onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                            placeholder="+54 11 5555 5555"
                                            className={`${calendarFieldClass} h-9`}
                                        />
                                    </div>

                                    <p className="m-0 hidden text-xs text-zinc-500 md:col-span-3 md:block">
                                        {'Autorellena nombre y tel\u00e9fono'}
                                    </p>

                                    <div>
                                        <CalendarLabel>{'Veh\u00edculo del stock'}</CalendarLabel>
                                        <select className={`${calendarFieldClass} h-9 cursor-pointer appearance-none pr-8`} defaultValue="Sin vehiculo">
                                            <option>Sin vehiculo</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2">
                                        <CalendarLabel>{'Descripci\u00f3n del veh\u00edculo'}</CalendarLabel>
                                        <input
                                            type="text"
                                            value={formData.vehicleDescription}
                                            onChange={(e) => setFormData({ ...formData, vehicleDescription: e.target.value })}
                                            className={`${calendarFieldClass} h-9`}
                                        />
                                        <p className="m-0 mt-1.5 text-xs text-zinc-500">
                                            {'Autocompleta al elegir del stock; editable'}
                                        </p>
                                    </div>

                                    <div className="md:col-span-3">
                                        <CalendarLabel>Creador / asignado</CalendarLabel>
                                        <input
                                            type="text"
                                            disabled
                                            value={formData.creatorLabel}
                                            className={`${calendarFieldClass} h-9 cursor-not-allowed text-zinc-300 disabled:opacity-100`}
                                        />
                                    </div>

                                    <div className="md:col-span-3">
                                        <CalendarLabel>{'Descripci\u00f3n / notas'}</CalendarLabel>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                            placeholder="Detalles del evento, agenda, contexto..."
                                            className={`${calendarFieldClass} min-h-20 resize-y py-2`}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="flex shrink-0 justify-end gap-3 border-t border-crm-border px-5 py-4 md:px-7">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="m-0 inline-flex h-9 appearance-none items-center justify-center rounded-lg border border-crm-border bg-transparent px-4 text-sm font-bold text-white transition-colors hover:bg-white/5 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="m-0 inline-flex h-9 appearance-none items-center justify-center gap-2 rounded-lg border-0 bg-crm-red px-4 text-sm font-bold text-white shadow-[0_12px_40px_rgba(239,51,41,0.45)] transition-colors hover:bg-crm-red disabled:opacity-50"
                            >
                                <Calendar size={16} />
                                {isSubmitting ? 'Guardando...' : 'Crear evento'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={`fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm ${isCalendarMode ? 'z-[60] bg-black/60' : 'z-50 bg-black/80'}`}>
            <div className={`flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl shadow-2xl ${isCalendarMode ? 'max-w-3xl border border-crm-border bg-crm-surface' : 'max-w-lg border border-crm-border bg-crm-surface'}`}>
                <div className={`flex shrink-0 items-center justify-between border-b ${isCalendarMode ? 'border-crm-border px-6 py-4' : 'border-crm-border bg-crm-topbar p-5'}`}>
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
                                <span className="block border-b border-crm-border pb-1 text-[10px] font-bold uppercase tracking-wider text-crm-red">
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
                                <span className="block border-b border-crm-border pb-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
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
                                        className="w-full cursor-not-allowed rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-semibold text-crm-fg-muted"
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
                                        className="m-0 appearance-none rounded-lg border border-crm-border bg-crm-surface px-4 py-2 text-xs font-bold text-crm-fg-muted transition-colors hover:bg-crm-surface-raised disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="m-0 appearance-none rounded-lg border-0 bg-crm-red px-5 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(220,38,38,0.2)] transition-colors hover:bg-crm-red disabled:opacity-50"
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
