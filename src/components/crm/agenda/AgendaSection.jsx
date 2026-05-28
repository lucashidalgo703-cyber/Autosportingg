import React, { useState } from 'react';
import AgendaLeadCard from './AgendaLeadCard';
import AgendaCrmTaskCard from './AgendaCrmTaskCard';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function AgendaSection({ title, icon: Icon, colorClass, leads, onChangeStatus, onCompleteTask, onCompleteCrmTask, onCancelCrmTask, onPostponeCrmTask, defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-black/20 border border-neutral-800 rounded-2xl overflow-hidden">
            {/* Header / Accordion Toggle */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 bg-black/40 hover:bg-black/60 transition-colors border-b ${isOpen ? 'border-neutral-800' : 'border-transparent'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClass.bg} ${colorClass.border} border`}>
                        <Icon size={18} className={colorClass.text} />
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide">{title}</h2>
                    <span className="bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs font-bold px-2 py-1 rounded-md">
                        {leads.length}
                    </span>
                </div>
                <div className="text-neutral-500">
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </button>

            {/* Content */}
            {isOpen && (
                <div className="p-4 md:p-6">
                    {leads.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500 text-sm">
                            No hay leads en esta sección
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {leads.map(item => {
                                if (item.isCrmTask) {
                                    return (
                                        <AgendaCrmTaskCard
                                            key={`crmtask-${item._id}`}
                                            task={item.taskData}
                                            onComplete={onCompleteCrmTask}
                                            onCancel={onCancelCrmTask}
                                            onPostpone={onPostponeCrmTask}
                                        />
                                    );
                                } else {
                                    return (
                                        <AgendaLeadCard 
                                            key={`lead-${item._id}`} 
                                            lead={item} 
                                            onChangeStatus={onChangeStatus}
                                            onCompleteTask={onCompleteTask}
                                        />
                                    );
                                }
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
