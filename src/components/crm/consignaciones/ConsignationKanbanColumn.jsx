import React from 'react';
import ConsignationKanbanCard from './ConsignationKanbanCard';

export default function ConsignationKanbanColumn({ status, title, consignations, onChangeStatus }) {
    
    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-crm-border/30');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('bg-crm-border/30');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-crm-border/30');
        const consignationId = e.dataTransfer.getData('consignationId');
        if (consignationId && onChangeStatus) {
            onChangeStatus(consignationId, status);
        }
    };

    return (
        <div 
            className="flex-shrink-0 w-[280px] bg-crm-surface rounded-xl border border-crm-border flex flex-col max-h-[calc(100vh-200px)] transition-colors"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className="p-3 border-b border-crm-border flex items-center justify-between bg-crm-bg/50 rounded-t-xl">
                <h3 className="font-bold text-sm text-white">{title}</h3>
                <span className="text-xs font-semibold text-crm-fg-muted bg-crm-surface-raised px-2 py-0.5 rounded-full">
                    {consignations.length}
                </span>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {consignations.map(consignation => (
                    <ConsignationKanbanCard 
                        key={consignation._id} 
                        consignation={consignation} 
                    />
                ))}
            </div>
        </div>
    );
}
