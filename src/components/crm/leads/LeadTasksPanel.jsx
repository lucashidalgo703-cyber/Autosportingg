import React from 'react';
import { CheckCircle, Clock, Calendar, Check, X, FileText, AlertTriangle } from 'lucide-react';

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
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CheckCircle size={20} className="text-blue-500" />
                    Tareas y Seguimiento
                </h3>
                <button 
                    onClick={onOpenTaskModal}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-bold transition-colors border border-blue-500/20"
                >
                    + Agregar Tarea
                </button>
            </div>

            {tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-50 bg-black/20 rounded-xl border border-neutral-800/50 border-dashed">
                    <CheckCircle size={32} className="text-neutral-500 mb-4" />
                    <span className="text-white font-medium">No hay tareas de seguimiento todavía.</span>
                    <p className="text-sm text-neutral-400 max-w-xs mt-2">
                        Agregá tareas para no olvidar los próximos pasos comerciales con este prospecto.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 max-h-[600px]">
                    
                    {/* Pending Tasks */}
                    {pendingTasks.length > 0 && (
                        <div className="flex flex-col gap-3">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                <Clock size={14} /> Pendientes ({pendingTasks.length})
                            </h4>
                            {pendingTasks.map(task => {
                                const overdue = isOverdue(task.dueDate);
                                const dueToday = isToday(task.dueDate);
                                
                                return (
                                    <div key={task._id} className={`p-4 rounded-xl border ${overdue ? 'bg-red-500/5 border-red-500/20' : dueToday ? 'bg-orange-500/5 border-orange-500/20' : 'bg-black/30 border-neutral-800'}`}>
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-white">{task.title}</span>
                                                    {overdue && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase flex items-center gap-1"><AlertTriangle size={10} /> Vencida</span>}
                                                    {dueToday && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 uppercase">Hoy</span>}
                                                </div>
                                                
                                                {task.dueDate && (
                                                    <span className={`text-xs flex items-center gap-1 mt-1 ${overdue ? 'text-red-400' : 'text-neutral-400'}`}>
                                                        <Calendar size={12} />
                                                        Vence: {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                
                                                {task.note && (
                                                    <p className="text-sm text-neutral-400 mt-2 flex items-start gap-1.5">
                                                        <FileText size={14} className="shrink-0 mt-0.5 opacity-50" />
                                                        {task.note}
                                                    </p>
                                                )}

                                                <span className="text-[10px] text-neutral-500 mt-2 block">
                                                    Creada por {task.user || 'Sistema'} el {new Date(task.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-2 shrink-0">
                                                <button 
                                                    onClick={() => onUpdateTaskStatus(task._id, 'completada')}
                                                    className="w-8 h-8 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500 flex items-center justify-center border border-green-500/20 transition-colors"
                                                    title="Marcar Completada"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateTaskStatus(task._id, 'cancelada')}
                                                    className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Cancelar Tarea"
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

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                        <div className="flex flex-col gap-3 mt-4">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle size={14} /> Historial ({completedTasks.length})
                            </h4>
                            {completedTasks.map(task => (
                                <div key={task._id} className="p-3 rounded-xl border bg-black/10 border-neutral-800 opacity-70">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className={`font-medium text-sm ${task.status === 'cancelada' ? 'text-neutral-500 line-through' : 'text-neutral-300'}`}>
                                                {task.title}
                                            </span>
                                            <span className="text-[10px] text-neutral-500 mt-1 uppercase">
                                                {task.status} {task.completedAt && `- ${new Date(task.completedAt).toLocaleDateString()}`}
                                            </span>
                                        </div>
                                        {task.status === 'completada' ? (
                                            <CheckCircle size={16} className="text-green-500/50" />
                                        ) : (
                                            <X size={16} className="text-neutral-600" />
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
