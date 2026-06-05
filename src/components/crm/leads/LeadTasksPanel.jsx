import React from 'react';
import { AlertTriangle, Calendar, Check, CheckCircle, Clock, FileText, X } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function LeadTasksPanel({ lead, onOpenTaskModal, onUpdateTaskStatus }) {
    if (!lead) return null;

    const tasks = Array.isArray(lead.tasks) ? lead.tasks : [];

    const pendingTasks = tasks.filter(t => t.status === 'pendiente').sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    const completedTasks = tasks.filter(t => t.status === 'completada' || t.status === 'cancelada').sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt) : new Date(a.createdAt);
        const dateB = b.completedAt ? new Date(b.completedAt) : new Date(b.createdAt);
        return dateB - dateA;
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isOverdue = (dateString) => {
        if (!dateString) return false;
        const dueDate = new Date(dateString);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
    };

    const isToday = (dateString) => {
        if (!dateString) return false;
        const dueDate = new Date(dateString);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
    };

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-crm-fg">
                    <CheckCircle size={19} className="text-blue-300" />
                    Tareas y seguimiento
                </h3>
                <CrmButton type="button" variant="secondary" size="sm" onClick={onOpenTaskModal}>
                    + Agregar tarea
                </CrmButton>
            </div>

            {tasks.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-bg px-6 py-10 text-center">
                    <CheckCircle size={28} className="mb-4 text-crm-fg-muted" />
                    <span className="font-semibold text-crm-fg">No hay tareas de seguimiento todavia.</span>
                    <p className="m-0 mt-2 max-w-xs text-sm text-crm-fg-muted">
                        Agrega tareas para no olvidar los proximos pasos comerciales con este prospecto.
                    </p>
                </div>
            ) : (
                <div className="flex max-h-[600px] flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    {pendingTasks.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h4 className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                                <Clock size={14} />
                                Pendientes ({pendingTasks.length})
                            </h4>
                            {pendingTasks.map(task => {
                                const overdue = isOverdue(task.dueDate);
                                const dueToday = isToday(task.dueDate);

                                return (
                                    <div key={task._id} className={`rounded-xl border p-4 ${
                                        overdue ? 'border-crm-red/20 bg-crm-red/10' :
                                        dueToday ? 'border-amber-500/20 bg-amber-500/10' :
                                        'border-crm-border bg-crm-bg'
                                    }`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-bold text-crm-fg">{task.title}</span>
                                                    {overdue && (
                                                        <span className="flex items-center gap-1 rounded bg-crm-red/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-300">
                                                            <AlertTriangle size={10} />
                                                            Vencida
                                                        </span>
                                                    )}
                                                    {dueToday && (
                                                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">Hoy</span>
                                                    )}
                                                </div>

                                                {task.dueDate && (
                                                    <span className={`mt-1 flex items-center gap-1 text-xs ${overdue ? 'text-red-300' : 'text-crm-fg-muted'}`}>
                                                        <Calendar size={12} />
                                                        Vence: {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}

                                                {task.note && (
                                                    <p className="m-0 mt-2 flex items-start gap-1.5 text-sm text-crm-fg-muted">
                                                        <FileText size={14} className="mt-0.5 shrink-0 opacity-70" />
                                                        {task.note}
                                                    </p>
                                                )}

                                                <span className="mt-2 block text-[10px] text-crm-fg-subtle">
                                                    Creada por {task.user || 'Sistema'} el {new Date(task.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="flex shrink-0 flex-col gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateTaskStatus(task._id, 'completada')}
                                                    className="m-0 flex h-8 w-8 appearance-none items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20"
                                                    title="Marcar completada"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateTaskStatus(task._id, 'cancelada')}
                                                    className="m-0 flex h-8 w-8 appearance-none items-center justify-center rounded-full border border-crm-border bg-crm-surface text-crm-fg-muted transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                                                    title="Cancelar tarea"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {completedTasks.length > 0 && (
                        <div className="mt-2 flex flex-col gap-3">
                            <h4 className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-crm-fg-muted">
                                <CheckCircle size={14} />
                                Historial ({completedTasks.length})
                            </h4>
                            {completedTasks.map(task => (
                                <div key={task._id} className="rounded-xl border border-crm-border bg-crm-bg p-3 opacity-75">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <span className={`block truncate text-sm font-semibold ${task.status === 'cancelada' ? 'text-crm-fg-muted line-through' : 'text-crm-fg'}`}>
                                                {task.title}
                                            </span>
                                            <span className="mt-1 block text-[10px] uppercase text-crm-fg-muted">
                                                {task.status} {task.completedAt && `- ${new Date(task.completedAt).toLocaleDateString()}`}
                                            </span>
                                        </div>
                                        {task.status === 'completada' ? (
                                            <CheckCircle size={16} className="text-emerald-300/70" />
                                        ) : (
                                            <X size={16} className="text-crm-fg-muted" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
