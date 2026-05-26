import React from 'react';
import { Target, ArrowLeft, Calendar, Phone, Edit, User, UserCheck } from 'lucide-react';
import Link from 'next/link';
import LeadStatusBadge from './LeadStatusBadge';
import LeadPriorityBadge from './LeadPriorityBadge';

export default function LeadDetailHeader({ lead, onEdit }) {
    if (!lead) return null;

    return (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Link 
                        href="/admin/leads" 
                        className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
                        title="Volver a Oportunidades"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Target size={20} className="text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            {lead.name}
                            {lead.clientId && (
                                <UserCheck size={20} className="text-blue-500" title="Cliente Asociado" />
                            )}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2 ml-14">
                    <div className="flex items-center gap-1.5 text-sm text-neutral-400 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                        <Phone size={14} className="text-neutral-500" />
                        {lead.phone}
                    </div>

                    <div className="h-4 w-px bg-neutral-800 hidden md:block"></div>
                    
                    <div className="flex items-center gap-2">
                        <LeadStatusBadge status={lead.crmStatus} legacyStage={lead.pipelineStage} />
                        <LeadPriorityBadge priority={lead.priority} />
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-neutral-900 text-neutral-400 border-neutral-800">
                            Origen: {lead.source || 'otro'}
                        </span>
                    </div>

                    <div className="h-4 w-px bg-neutral-800 hidden md:block"></div>

                    <div className="flex items-center gap-1.5 text-sm text-neutral-500">
                        <Calendar size={14} />
                        Creado: {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 ml-14 lg:ml-0 mt-2 lg:mt-0">
                <button 
                    onClick={onEdit}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors border border-red-500"
                >
                    <Edit size={16} />
                    Editar Lead
                </button>
            </div>
        </div>
    );
}
