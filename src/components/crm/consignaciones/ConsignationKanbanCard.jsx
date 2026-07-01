import React from 'react';
import Link from 'next/link';
import { User, DollarSign } from 'lucide-react';

export default function ConsignationKanbanCard({ consignation }) {
    
    const handleDragStart = (e) => {
        e.dataTransfer.setData('consignationId', consignation._id);
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e) => {
        e.currentTarget.classList.remove('opacity-50');
    };

    return (
        <div 
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className="bg-crm-bg border border-crm-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-crm-red/50 transition-colors shadow-sm group"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-white text-sm leading-tight">
                    {consignation.brand} {consignation.name}
                </h4>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-3">
                <span className="text-[10px] font-bold text-crm-fg-muted bg-crm-surface px-1.5 py-0.5 rounded border border-crm-border">
                    {consignation.year}
                </span>
                <span className="text-[10px] font-bold text-crm-fg-muted bg-crm-surface px-1.5 py-0.5 rounded border border-crm-border">
                    {consignation.plateOrVin || 'Sin Patente'}
                </span>
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-crm-fg-muted">
                    <User size={12} className="opacity-70" />
                    <span className="truncate">{consignation.ownerName || 'Sin asignar'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-crm-fg-muted">
                    <DollarSign size={12} className="opacity-70" />
                    <span className="font-semibold text-crm-fg">{consignation.currency} {consignation.price?.toLocaleString('es-AR') || '0'}</span>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-crm-border flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={`/admin/stock/${consignation._id}`} className="text-[10px] font-bold uppercase tracking-wider text-crm-red hover:text-red-400">
                    Ver Ficha
                </Link>
            </div>
        </div>
    );
}
