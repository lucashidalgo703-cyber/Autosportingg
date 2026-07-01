import React from 'react';
import { KanbanSquare, List } from 'lucide-react';

export default function LeadViewToggle({ view, setView }) {
    const items = [
        { id: 'list', label: 'Lista', icon: List },
        { id: 'kanban', label: 'Kanban', icon: KanbanSquare }
    ];

    return (
        <div className="inline-flex h-9 rounded-lg border border-crm-border bg-crm-surface p-1">
            {items.map(item => {
                const Icon = item.icon;
                const active = view === item.id;

                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => setView(item.id)}
                        className={`m-0 inline-flex appearance-none items-center gap-2 rounded-md border-0 px-3 text-xs font-semibold transition-colors ${
                            active
                                ? 'bg-crm-red/10 text-crm-red'
                                : 'bg-transparent text-crm-fg-muted hover:bg-crm-surface-raised hover:text-crm-fg'
                        }`}
                        title={`Vista ${item.label}`}
                    >
                        <Icon size={15} />
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}
