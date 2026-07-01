import React from 'react';
import ConsignationKanbanColumn from './ConsignationKanbanColumn';

export default function ConsignationKanban({ consignations, onChangeStatus }) {
    
    const columns = [
        { id: 'ingreso', title: 'Ingreso' },
        { id: 'tasacion', title: 'Tasación' },
        { id: 'documentacion', title: 'Documentación' },
        { id: 'publicado', title: 'Publicado' },
        { id: 'reservado', title: 'Reservado' },
        { id: 'vendido', title: 'Vendido' },
        { id: 'cerrado', title: 'Cerrado' },
        { id: 'cancelado', title: 'Cancelado' }
    ];

    const getConsignationsByStatus = (status) => {
        return consignations.filter(c => c.consignmentStatus === status);
    };

    return (
        <div className="w-full overflow-x-auto custom-scrollbar pb-4 mt-4">
            <div className="flex gap-4 min-w-max">
                {columns.map(col => (
                    <ConsignationKanbanColumn 
                        key={col.id}
                        status={col.id}
                        title={col.title}
                        consignations={getConsignationsByStatus(col.id)}
                        onChangeStatus={onChangeStatus}
                    />
                ))}
            </div>
            
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
