import React, { useState } from 'react';
import AgendaLeadCard from './AgendaLeadCard';
import AgendaCrmTaskCard from './AgendaCrmTaskCard';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function AgendaSection({ title, icon: Icon, colorClass, leads, onChangeStatus, onCompleteTask, onCompleteCrmTask, onCancelCrmTask, onPostponeCrmTask, onEditCrmTask, defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`m-0 flex w-full appearance-none items-center justify-between border-0 bg-crm-topbar p-4 text-left transition-colors hover:bg-crm-surface-raised ${isOpen ? 'border-b border-crm-border' : ''}`}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${colorClass.bg} ${colorClass.border}`}>
                        <Icon size={18} className={colorClass.text} />
                    </div>
                    <h2 className="m-0 truncate text-base font-bold tracking-wide text-crm-fg">{title}</h2>
                    <span className="rounded-md border border-crm-border bg-crm-bg px-2 py-1 text-xs font-bold text-crm-fg-muted">
                        {leads.length}
                    </span>
                </div>
                <div className="shrink-0 text-crm-fg-muted">
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </button>

            {isOpen && (
                <div className="p-3 md:p-4">
                    {leads.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-crm-border bg-crm-bg py-8 text-center text-sm text-crm-fg-muted">
                            No hay tareas ni cotizaciones en esta seccion.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {leads.map(item => {
                                if (item.isCrmTask) {
                                    return (
                                        <AgendaCrmTaskCard
                                            key={`crmtask-${item._id}`}
                                            task={item.taskData}
                                            onComplete={onCompleteCrmTask}
                                            onCancel={onCancelCrmTask}
                                            onPostpone={onPostponeCrmTask}
                                            onEdit={onEditCrmTask}
                                        />
                                    );
                                }

                                return (
                                    <AgendaLeadCard
                                        key={`lead-${item._id}`}
                                        lead={item}
                                        onChangeStatus={onChangeStatus}
                                        onCompleteTask={onCompleteTask}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
