import React, { useState } from 'react';
import Link from 'next/link';
import { User, Phone, Car, Clock, ArrowRight, AlertCircle, CheckSquare, MoreHorizontal, CheckCircle } from 'lucide-react';
import LeadPriorityBadge from '../leads/LeadPriorityBadge';
import LeadStatusBadge from '../leads/LeadStatusBadge';

export default function AgendaLeadCard({ lead, onChangeStatus, onCompleteTask }) {
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    
    const pendingTasks = lead.tasks ? lead.tasks.filter(t => t.status !== 'completada' && t.status !== 'cancelada') : [];
    
    const isNextActionOverdue = lead.nextActionDate && new Date(lead.nextActionDate) < new Date(new Date().setHours(0,0,0,0));

    const formatSourceDetail = (detail) => {
        if (!detail || detail === 'unknown') return null;
        if (detail === 'contact_form') return 'Contacto Web';
        if (detail === 'vehicle_detail_whatsapp') return 'Ficha Auto';
        if (detail === 'financing_whatsapp') return 'Financiación';
        if (detail === 'manual_crm') return 'Manual CRM';
        return detail;
    };

    const handleStatusChange = (newStatus) => {
        setIsStatusMenuOpen(false);
        if (newStatus !== lead.crmStatus) {
            onChangeStatus(lead._id, newStatus);
        }
    };

    return (
        <div className={`bg-neutral-900 border ${isNextActionOverdue ? 'border-red-500/50' : 'border-neutral-800'} p-4 rounded-xl flex flex-col gap-3 relative group shadow-lg hover:border-neutral-700 transition-colors`}>
            
            {/* Header: Name and Status Dropdown */}
            <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col gap-1 pr-6">
                    <span className="text-white font-bold text-base leading-tight line-clamp-1">
                        {lead.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <Phone size={14} />
                        <span>{lead.phone}</span>
                    </div>
                </div>
                
                {/* Status Dropdown Trigger */}
                <div className="absolute top-3 right-3">
                    <button 
                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                        className="text-neutral-500 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition-colors"
                        title="Cambiar estado"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {/* Dropdown Menu */}
                    {isStatusMenuOpen && (
                        <div className="absolute top-full right-0 mt-1 w-40 bg-black border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden">
                            <div className="py-1">
                                {['contactado', 'seguimiento', 'perdido', 'convertido'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-neutral-900 transition-colors ${
                                            lead.crmStatus === status ? 'text-red-500 font-bold bg-red-500/10' : 'text-neutral-300 capitalize'
                                        }`}
                                    >
                                        Mover a {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
                <LeadStatusBadge status={lead.crmStatus} />
                <LeadPriorityBadge priority={lead.priority} />
                
                {formatSourceDetail(lead.sourceDetail) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-neutral-900 text-neutral-500 border-neutral-800">
                        {formatSourceDetail(lead.sourceDetail)}
                    </span>
                )}
            </div>

            <div className="h-px w-full bg-neutral-800/50 my-1"></div>

            {/* Info Grid */}
            <div className="flex flex-col gap-2">
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

            {/* Action Summary */}
            <div className="bg-black/30 rounded-lg p-3 mt-1 flex flex-col gap-2 border border-neutral-800/50">
                {lead.nextActionDate && (
                    <div className={`flex items-center gap-2 text-xs font-bold ${isNextActionOverdue ? 'text-red-400' : 'text-blue-400'}`}>
                        {isNextActionOverdue ? <AlertCircle size={14} /> : <Clock size={14} />}
                        <span>Próxima Acción: {new Date(lead.nextActionDate).toLocaleDateString()}</span>
                        {isNextActionOverdue && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded uppercase ml-auto">Vencida</span>}
                    </div>
                )}
                
                {pendingTasks.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex items-center gap-1 text-[11px] text-yellow-500 font-bold mb-1">
                            <CheckSquare size={12} />
                            <span>{pendingTasks.length} Tareas Pendientes</span>
                        </div>
                        {pendingTasks.slice(0, 2).map(task => (
                            <div key={task._id} className="flex items-center justify-between gap-2 text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-1.5 rounded">
                                <span className="line-clamp-1 flex-1">{task.title}</span>
                                <button 
                                    onClick={() => onCompleteTask(lead._id, task._id)}
                                    className="text-neutral-500 hover:text-green-500 transition-colors"
                                    title="Completar Tarea"
                                >
                                    <CheckCircle size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                {!lead.nextActionDate && pendingTasks.length === 0 && (
                    <span className="text-neutral-500 text-xs italic text-center py-1">Sin acciones programadas</span>
                )}
            </div>

            {/* CTA */}
            <Link 
                href={`/admin/leads/${lead._id}`} 
                className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white hover:text-red-400 bg-neutral-800 hover:bg-neutral-700 py-2.5 rounded-lg border border-neutral-700 transition-colors mt-2"
            >
                Ver Ficha Completa
                <ArrowRight size={14} />
            </Link>

        </div>
    );
}
