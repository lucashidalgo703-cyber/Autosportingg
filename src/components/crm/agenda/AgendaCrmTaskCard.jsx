import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Car, CheckCircle2, ChevronDown, Clock, Clock4, Edit3, FileText, Handshake, Tag, Target, Wrench, XCircle } from 'lucide-react';

export default function AgendaCrmTaskCard({ task, onComplete, onCancel, onPostpone, onEdit }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isPostponing, setIsPostponing] = useState(false);
    const [newDate, setNewDate] = useState('');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.dueDate);
    const isOverdue = dueDate < today;
    const isToday = dueDate.getTime() === today.getTime();

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'alta': return 'text-red-300 bg-crm-red/10 border-crm-red/20';
            case 'media': return 'text-amber-300 bg-amber-500/10 border-amber-500/20';
            case 'baja': return 'text-blue-300 bg-blue-500/10 border-blue-500/20';
            default: return 'text-crm-fg-muted bg-crm-bg border-crm-border';
        }
    };

    const handlePostponeSubmit = () => {
        if (!newDate) return;
        onPostpone(task._id, newDate);
        setIsPostponing(false);
    };

    const getTypeStyling = (type) => {
        switch (type) {
            case 'cobranza': return { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/20', icon: Target, label: 'Cobranza' };
            case 'venta': return { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20', icon: Handshake, label: 'Venta' };
            case 'documentacion': return { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20', icon: FileText, label: 'Documentacion' };
            case 'entrega': return { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20', icon: Car, label: 'Entrega' };
            case 'postventa': return { bg: 'bg-yellow-500/10', text: 'text-yellow-300', border: 'border-yellow-500/20', icon: Wrench, label: 'Postventa' };
            default: return { bg: 'bg-crm-bg', text: 'text-crm-fg-muted', border: 'border-crm-border', icon: Tag, label: type === 'general' ? 'General' : type };
        }
    };

    const typeStyle = getTypeStyling(task.type);
    const TypeIcon = typeStyle.icon;

    return (
        <article className={`flex flex-col gap-3 overflow-hidden rounded-xl border bg-crm-bg p-4 transition-colors ${isOverdue ? 'border-crm-red/40' : isToday ? 'border-blue-500/30' : 'border-crm-border hover:border-crm-border-strong'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                        <TypeIcon size={12} /> {typeStyle.label}
                    </span>
                    <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                    </span>
                    {onEdit && (
                        <button
                            type="button"
                            onClick={() => onEdit(task)}
                            className="m-0 flex h-7 w-7 appearance-none items-center justify-center rounded-lg border border-crm-border bg-crm-surface text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                            title="Editar tarea"
                        >
                            <Edit3 size={12} />
                        </button>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-crm-fg-muted">
                    <Calendar size={12} className={isOverdue ? 'text-red-300' : ''} />
                    <span className={isOverdue ? 'font-bold text-red-300' : ''}>
                        {dueDate.toLocaleDateString('es-AR')}
                    </span>
                    {task.dueTime && (
                        <span className="ml-1 flex items-center gap-1">
                            <Clock size={12} />
                            {task.dueTime}
                        </span>
                    )}
                </div>
            </div>

            <div>
                <h3 className="m-0 text-base font-bold leading-tight text-crm-fg">{task.title}</h3>

                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="m-0 mt-2 flex appearance-none items-center gap-1 border-0 bg-transparent p-0 text-xs text-blue-300 transition-colors hover:text-blue-200"
                >
                    {isExpanded ? 'Ocultar notas' : 'Ver detalle de la nota'}
                    <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && task.description && (
                    <div className="mt-3 whitespace-pre-line rounded-xl border border-crm-border bg-crm-surface p-3 text-sm leading-relaxed text-crm-fg-muted">
                        {task.description}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-crm-border bg-crm-surface p-3">
                {task.clientId && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold uppercase text-crm-fg-muted">Cliente</span>
                        <span className="truncate font-bold text-crm-fg">{task.clientId.fullName || task.clientId.firstName || 'Sin cliente'}</span>
                    </div>
                )}
                {task.vehicleId && (
                    <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold uppercase text-crm-fg-muted">Vehiculo</span>
                        <span className="max-w-[150px] truncate text-crm-fg-muted">{task.vehicleId.brand} {task.vehicleId.name}</span>
                    </div>
                )}

                <div className="mt-2 flex gap-3 border-t border-crm-border pt-2">
                    {task.saleId && (
                        <Link href={`/admin/ventas/${task.saleId._id || task.saleId}`} className="flex items-center gap-1 text-xs font-bold text-blue-300 no-underline transition-colors hover:text-blue-200">
                            <Handshake size={12} /> Ver Venta
                        </Link>
                    )}
                    {task.type === 'cobranza' && (
                        <Link href="/admin/cobranzas" className="flex items-center gap-1 text-xs font-bold text-orange-300 no-underline transition-colors hover:text-orange-200">
                            <Target size={12} /> Ir a Cobranzas
                        </Link>
                    )}
                </div>
            </div>

            <div className="mt-auto flex gap-2">
                <button
                    type="button"
                    onClick={() => onComplete(task._id)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                >
                    <CheckCircle2 size={14} /> Completar
                </button>

                <button
                    type="button"
                    onClick={() => setIsPostponing(!isPostponing)}
                    className="rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                    title="Posponer"
                >
                    <Clock4 size={14} />
                </button>

                <button
                    type="button"
                    onClick={() => onCancel(task._id)}
                    className="rounded-lg border border-crm-border bg-crm-surface px-3 py-2 text-xs font-bold text-crm-fg-muted transition-colors hover:border-crm-red/30 hover:bg-crm-red/10 hover:text-red-300"
                    title="Cancelar"
                >
                    <XCircle size={14} />
                </button>
            </div>

            {isPostponing && (
                <div className="flex gap-2 rounded-xl border border-crm-border bg-crm-surface p-3">
                    <input
                        type="date"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="flex-1 rounded-lg border border-crm-border bg-crm-bg px-2 text-xs text-crm-fg [color-scheme:dark]"
                    />
                    <button
                        type="button"
                        onClick={handlePostponeSubmit}
                        className="rounded-lg bg-crm-red px-3 text-xs font-bold text-white"
                    >
                        Ok
                    </button>
                </div>
            )}
        </article>
    );
}
