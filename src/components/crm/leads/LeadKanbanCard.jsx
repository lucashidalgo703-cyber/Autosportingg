import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Car, CheckSquare, Clock, MoreHorizontal, Phone, User } from 'lucide-react';
import LeadPriorityBadge from './LeadPriorityBadge';
import CrmButton from '../ui/CrmButton';

export default function LeadKanbanCard({ lead, onChangeStatus, readOnly }) {
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

    const pendingTasks = lead.tasks ? lead.tasks.filter(t => t.status !== 'completada' && t.status !== 'cancelada').length : 0;
    const isNextActionOverdue = lead.nextActionDate && new Date(lead.nextActionDate) < new Date();

    const formatSourceDetail = (detail) => {
        if (!detail || detail === 'unknown') return null;
        if (detail === 'contact_form') return 'Contacto Web';
        if (detail === 'vehicle_detail_whatsapp') return 'Ficha Auto';
        if (detail === 'financing_whatsapp') return 'Financiacion';
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
        <div className="group relative flex flex-col gap-3 rounded-xl border border-crm-border bg-crm-bg p-4 transition-colors hover:border-crm-red/50">
            <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 pr-6 text-sm font-bold leading-tight text-crm-fg">
                    {lead.name}
                </span>

                <div className="absolute right-3 top-3">
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                            className="m-0 flex h-7 w-7 appearance-none items-center justify-center rounded-md border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:bg-crm-surface hover:text-crm-fg"
                            title="Cambiar estado"
                        >
                            <MoreHorizontal size={16} />
                        </button>
                    )}

                    {isStatusMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-crm-border bg-crm-surface shadow-2xl">
                            <div className="py-1">
                                {statusOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleStatusChange(opt.value)}
                                        className={`m-0 w-full appearance-none border-0 px-4 py-2 text-left text-xs transition-colors hover:bg-crm-surface-raised ${
                                            lead.crmStatus === opt.value ? 'bg-crm-red/10 font-bold text-crm-red' : 'bg-transparent text-crm-fg-muted'
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

            <div className="flex flex-wrap gap-1.5">
                <LeadPriorityBadge priority={lead.priority} />
                {formatSourceDetail(lead.sourceDetail) && (
                    <span className="rounded border border-crm-border bg-crm-surface px-1.5 py-0.5 text-[9px] font-bold text-crm-fg-muted">
                        {formatSourceDetail(lead.sourceDetail)}
                    </span>
                )}
            </div>

            <div className="h-px w-full bg-crm-border" />

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-crm-fg">
                    <Phone size={14} className="shrink-0 text-crm-fg-muted" />
                    <span>{lead.phone || '--'}</span>
                </div>

                {lead.vehicleId && (
                    <div className="flex items-center gap-2 text-xs text-crm-fg">
                        <Car size={14} className="shrink-0 text-crm-red" />
                        <span className="line-clamp-1">{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                    </div>
                )}

                <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase">
                    {lead.clientId ? (
                        <Link href={`/admin/clientes/${lead.clientId._id}`} className="flex items-center gap-1 text-blue-300 no-underline transition-colors hover:text-blue-200">
                            <User size={12} />
                            Cliente asociado
                        </Link>
                    ) : (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
                            Sin vincular
                        </span>
                    )}
                </div>
            </div>

            {(pendingTasks > 0 || lead.nextActionDate) && (
                <div className="mt-1 flex items-center justify-between border-t border-crm-border pt-3">
                    <div className="flex gap-3">
                        {pendingTasks > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-300" title={`${pendingTasks} tareas pendientes`}>
                                <CheckSquare size={12} />
                                <span>{pendingTasks}</span>
                            </div>
                        )}

                        {lead.nextActionDate && (
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${isNextActionOverdue ? 'text-red-300' : 'text-blue-300'}`} title="Proxima accion">
                                {isNextActionOverdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                                <span>{new Date(lead.nextActionDate).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Link href={`/admin/leads/${lead._id}`} className="mt-2 block w-full no-underline">
                <CrmButton variant="secondary" className="w-full justify-center gap-2 hover:border-crm-red/50 hover:text-crm-red">
                    Ver ficha
                    <ArrowRight size={14} />
                </CrmButton>
            </Link>
        </div>
    );
}
