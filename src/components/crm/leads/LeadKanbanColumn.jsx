import React from 'react';
import LeadKanbanCard from './LeadKanbanCard';

export default function LeadKanbanColumn({ title, status, leads, onChangeStatus }) {
    const getHeaderColors = (value) => {
        switch (value) {
            case 'nuevo': return 'border-blue-500/30 bg-blue-500/10';
            case 'contactado': return 'border-purple-500/30 bg-purple-500/10';
            case 'interesado': return 'border-amber-500/30 bg-amber-500/10';
            case 'seguimiento': return 'border-orange-500/30 bg-orange-500/10';
            case 'reservado': return 'border-cyan-500/30 bg-cyan-500/10';
            case 'convertido': return 'border-emerald-500/30 bg-emerald-500/10';
            case 'perdido': return 'border-crm-border bg-crm-bg';
            default: return 'border-crm-border bg-crm-bg';
        }
    };

    return (
        <div className="flex h-[calc(100dvh-280px)] min-h-[560px] w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
            <div className="flex items-center justify-between border-b border-crm-border bg-crm-surface-raised p-3">
                <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full border ${getHeaderColors(status)}`} />
                    <h3 className="m-0 text-sm font-bold tracking-wide text-crm-fg">{title}</h3>
                </div>
                <span className="rounded-md border border-crm-border bg-crm-bg px-2 py-1 text-xs font-bold text-crm-fg-muted">
                    {leads.length}
                </span>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar">
                {leads.map(lead => (
                    <LeadKanbanCard
                        key={lead._id}
                        lead={lead}
                        onChangeStatus={onChangeStatus}
                    />
                ))}

                {leads.length === 0 && (
                    <div className="m-2 flex flex-1 items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-bg">
                        <span className="text-xs font-semibold text-crm-fg-muted">Sin cotizaciones</span>
                    </div>
                )}
            </div>
        </div>
    );
}
