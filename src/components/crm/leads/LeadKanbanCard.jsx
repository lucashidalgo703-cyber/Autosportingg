import React, { useState } from 'react';
import Link from 'next/link';
import { User, Phone, Car, Clock, ArrowRight, MoreHorizontal, AlertCircle, CheckSquare } from 'lucide-react';
import LeadPriorityBadge from './LeadPriorityBadge';

export default function LeadKanbanCard({ lead, onChangeStatus }) {
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    
    const pendingTasks = lead.tasks ? lead.tasks.filter(t => t.status !== 'completada' && t.status !== 'cancelada').length : 0;
    
    const isNextActionOverdue = lead.nextActionDate && new Date(lead.nextActionDate) < new Date();

    const formatSourceDetail = (detail) => {
        if (!detail || detail === 'unknown') return null;
        if (detail === 'contact_form') return 'Contacto Web';
        if (detail === 'vehicle_detail_whatsapp') return 'Ficha Auto';
        if (detail === 'financing_whatsapp') return 'Financiación';
        if (detail === 'manual_crm') return 'Manual CRM';
        return detail;
    };

    const statusOptions = [
        { value: 'nuevo', label: 'Nuevo' },
        { value: 'contactado', label: 'Contactado' },
        { value: 'interesado', label: 'Interesado' },
        { value: 'seguimiento', label: 'Seguimiento' },
        { value: 'reservado', label: 'Reservado' },
        { value: 'convertido', label: 'Convertido' },
        { value: 'perdido', label: 'Perdido' }
    ];

    const handleStatusChange = (newStatus) => {
        setIsStatusMenuOpen(false);
        if (newStatus !== lead.crmStatus) {
            onChangeStatus(lead._id, newStatus);
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col gap-3 relative group shadow-lg hover:border-neutral-700 transition-colors">
            
            {/* Header: Name and Status Dropdown */}
            <div className="flex justify-between items-start gap-2">
                <span className="text-white font-bold text-sm leading-tight line-clamp-2 pr-6">
                    {lead.name}
                </span>
                
                {/* Status Dropdown Trigger */}
                <div className="absolute top-3 right-3">
                    <button 
                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                        className="text-neutral-500 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition-colors"
                        title="Cambiar estado"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {/* Dropdown Menu */}
                    {isStatusMenuOpen && (
                        <div className="absolute top-full right-0 mt-1 w-40 bg-black border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                            <div className="py-1">
                                {statusOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleStatusChange(opt.value)}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-neutral-900 transition-colors ${
                                            lead.crmStatus === opt.value ? 'text-red-500 font-bold bg-red-500/10' : 'text-neutral-300'
                                        }`}
                                    >
                                        Mover a {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-0.5">
                <LeadPriorityBadge priority={lead.priority} />
                
                {formatSourceDetail(lead.sourceDetail) && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize bg-neutral-900 text-neutral-500 border-neutral-800">
                        {formatSourceDetail(lead.sourceDetail)}
                    </span>
                )}
            </div>

            <div className="h-px w-full bg-neutral-800/50 my-1"></div>

            {/* Info Grid */}
            <div className="flex flex-col gap-2">
                {/* Phone */}
                <div className="flex items-center gap-2 text-xs text-neutral-300">
                    <Phone size={14} className="text-neutral-500 shrink-0" />
                    <span>{lead.phone}</span>
                </div>

                {/* Vehicle */}
                {lead.vehicleId && (
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                        <Car size={14} className="text-red-500 shrink-0" />
                        <span className="line-clamp-1">{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                    </div>
                )}

                {/* Client Link */}
                <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-2 text-[10px] uppercase font-bold">
                        {lead.clientId ? (
                            <Link href={`/admin/clientes/${lead.clientId._id}`} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                <User size={12} />
                                Cliente Asociado
                            </Link>
                        ) : (
                            <span className="text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                Sin Vincular
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tasks and Action */}
            {(pendingTasks > 0 || lead.nextActionDate) && (
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-neutral-800/50">
                    <div className="flex gap-3">
                        {pendingTasks > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold" title={`${pendingTasks} Tareas Pendientes`}>
                                <CheckSquare size={12} />
                                <span>{pendingTasks}</span>
                            </div>
                        )}
                        
                        {lead.nextActionDate && (
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${isNextActionOverdue ? 'text-red-400' : 'text-blue-400'}`} title="Próxima Acción">
                                {isNextActionOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                                <span>{new Date(lead.nextActionDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CTA */}
            <Link 
                href={`/admin/leads/${lead._id}`} 
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 py-2 rounded-lg border border-red-500/20 transition-colors mt-2"
            >
                Ver Ficha
                <ArrowRight size={14} />
            </Link>

        </div>
    );
}
