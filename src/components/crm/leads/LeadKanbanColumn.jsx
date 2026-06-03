import React from 'react';
import LeadKanbanCard from './LeadKanbanCard';

export default function LeadKanbanColumn({ title, status, leads, onChangeStatus }) {
    
    const getHeaderColors = (status) => {
        switch(status) {
            case 'nuevo': return 'border-blue-500 text-blue-400 bg-blue-500/10';
            case 'contactado': return 'border-purple-500 text-purple-400 bg-purple-500/10';
            case 'interesado': return 'border-yellow-500 text-yellow-400 bg-yellow-500/10';
            case 'seguimiento': return 'border-orange-500 text-orange-400 bg-orange-500/10';
            case 'reservado': return 'border-pink-500 text-pink-400 bg-pink-500/10';
            case 'convertido': return 'border-green-500 text-green-400 bg-green-500/10';
            case 'perdido': return 'border-neutral-500 text-neutral-400 bg-neutral-500/10';
            default: return 'border-neutral-500 text-neutral-400 bg-neutral-500/10';
        }
    };

    const headerStyle = getHeaderColors(status);

    return (
        <div className="flex flex-col bg-[#161619] border border-[#33333A] rounded-2xl w-[320px] shrink-0 h-[calc(100vh-280px)] min-h-[600px] overflow-hidden">
            {/* Column Header */}
            <div className={`p-4 border-b border-[#33333A] flex justify-between items-center bg-[#1E1E24]`}>
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border ${headerStyle.split(' ')[0]} ${headerStyle.split(' ')[2]}`}></div>
                    <h3 className="text-white font-bold text-sm tracking-wide">{title}</h3>
                </div>
                <span className="text-xs font-bold text-[#A1A1AA] bg-[#161619] px-2 py-1 rounded-md border border-[#33333A]">
                    {leads.length}
                </span>
            </div>

            {/* Column Body */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                {leads.map(lead => (
                    <LeadKanbanCard 
                        key={lead._id} 
                        lead={lead} 
                        onChangeStatus={onChangeStatus} 
                    />
                ))}
                
                {leads.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#33333A] rounded-xl m-2">
                        <span className="text-[#A1A1AA] text-xs font-medium">Sin leads</span>
                    </div>
                )}
            </div>
        </div>
    );
}
