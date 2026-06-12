import React from 'react';
import LeadKanbanColumn from './LeadKanbanColumn';

export default function LeadKanbanBoard({ leads, onChangeStatus, readOnly }) {
    
    const columns = [
        { id: 'nuevo', title: 'Nuevo' },
        { id: 'contactado', title: 'Contactado' },
        { id: 'interesado', title: 'Interesado' },
        { id: 'seguimiento', title: 'Seguimiento' },
        { id: 'reservado', title: 'Reservado' },
        { id: 'perdido', title: 'Perdido' },
        { id: 'convertido', title: 'Convertido' }
    ];

    const getLeadsByStatus = (status) => {
        return leads.filter(lead => lead.crmStatus === status);
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar pb-4">
            <div className="flex gap-4 min-w-max">
                {columns.map(col => (
                    <LeadKanbanColumn 
                        key={col.id}
                        status={col.id}
                        title={col.title}
                        leads={getLeadsByStatus(col.id)}
                        onChangeStatus={onChangeStatus}
                        readOnly={readOnly}
                    />
                ))}
            </div>
            
            {/* Custom Scrollbar Styles for Kanban */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
