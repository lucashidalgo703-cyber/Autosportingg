import React from 'react';
import { List, KanbanSquare } from 'lucide-react';

export default function LeadViewToggle({ view, setView }) {
    return (
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
            <button
                onClick={() => setView('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === 'list' 
                    ? 'bg-neutral-800 text-white' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Vista Lista"
            >
                <List size={16} />
                Lista
            </button>
            <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === 'kanban' 
                    ? 'bg-neutral-800 text-white' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Vista Kanban"
            >
                <KanbanSquare size={16} />
                Kanban
            </button>
        </div>
    );
}
