import React from 'react';
import { Calendar, Clock, User, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import CommunicationChannelBadge from './CommunicationChannelBadge';
import CommunicationOutcomeBadge from './CommunicationOutcomeBadge';

export default function CommunicationLogItem({ log }) {
    const contactDate = new Date(log.contactDate);
    
    return (
        <div className={`bg-[#1E1E24] border ${log.isImportant ? 'border-red-900/50' : 'border-crm-border'} rounded-xl p-4 transition-colors hover:bg-[#24242B]`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <CommunicationChannelBadge channel={log.channel} />
                    <CommunicationOutcomeBadge outcome={log.outcome} />
                    {log.isImportant && (
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-red-900/20 text-red-400 px-2 py-0.5 rounded border border-red-900/50">
                            <AlertTriangle size={10} /> Crítica
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-xs text-crm-fg-muted font-bold flex items-center justify-end gap-1">
                        <Calendar size={12} /> {contactDate.toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-crm-fg-muted flex items-center justify-end gap-1 mt-0.5">
                        <Clock size={10} /> {contactDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>

            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                {log.direction === 'outbound' && <ArrowRight size={14} className="text-blue-400" />}
                {log.direction === 'inbound' && <ArrowLeft size={14} className="text-green-400" />}
                {log.direction === 'internal' && <RefreshCw size={14} className="text-crm-fg-muted" />}
                {log.title}
            </h4>
            
            {log.notes && (
                <div className="text-xs text-crm-fg-muted bg-[#161619] p-3 rounded-lg border border-crm-border whitespace-pre-wrap mb-3">
                    <FileText size={12} className="inline mr-1 text-crm-fg-muted" />
                    {log.notes}
                </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-crm-fg-muted mt-2 border-t border-crm-border pt-2">
                <div className="flex items-center gap-1">
                    <User size={12} />
                    <span>Registrado por <span className="text-crm-fg-muted font-semibold">{log.createdBy?.name || 'Usuario'}</span></span>
                </div>
                {log.nextActionDate && (
                    <div className="flex items-center gap-1">
                        <span className="text-indigo-400 font-bold">Seguimiento:</span> 
                        {new Date(log.nextActionDate).toLocaleDateString()}
                    </div>
                )}
            </div>
        </div>
    );
}
