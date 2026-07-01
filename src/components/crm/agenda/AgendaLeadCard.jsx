import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Car, CheckCircle, CheckSquare, Clock, MoreHorizontal, Phone, User } from 'lucide-react';
import LeadPriorityBadge from '../leads/LeadPriorityBadge';
import LeadStatusBadge from '../leads/LeadStatusBadge';

export default function AgendaLeadCard({ lead, onChangeStatus, onCompleteTask }) {
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

    const pendingTasks = lead.tasks ? lead.tasks.filter(t => t.status !== 'completada' && t.status !== 'cancelada') : [];
    const isNextActionOverdue = lead.nextActionDate && new Date(lead.nextActionDate) < new Date(new Date().setHours(0, 0, 0, 0));

    const formatSourceDetail = (detail) => {
        if (!detail || detail === 'unknown') return null;
        if (detail === 'contact_form') return 'Contacto Web';
        if (detail === 'vehicle_detail_whatsapp') return 'Ficha Auto';
        if (detail === 'financing_whatsapp') return 'Financiacion';
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
        <article className={`group relative flex flex-col gap-3 rounded-xl border bg-crm-bg p-4 transition-colors ${isNextActionOverdue ? 'border-crm-red/40' : 'border-crm-border hover:border-crm-border-strong'}`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1 pr-8">
                    <span className="line-clamp-1 text-base font-bold leading-tight text-crm-fg">
                        {lead.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-crm-fg-muted">
                        <Phone size={14} />
                        <span>{lead.phone}</span>
                    </div>
                </div>

                <div className="absolute right-3 top-3">
                    <button
                        type="button"
                        onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                        className="m-0 flex h-8 w-8 appearance-none items-center justify-center rounded-lg border border-transparent bg-transparent text-crm-fg-muted transition-colors hover:border-crm-border hover:bg-crm-surface hover:text-crm-fg"
                        title="Cambiar estado"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {isStatusMenuOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-crm-border bg-crm-surface shadow-2xl">
                            <div className="py-1">
                                {['contactado', 'seguimiento', 'perdido', 'convertido'].map(status => (
                                    <button
                                        type="button"
                                        key={status}
                                        onClick={() => handleStatusChange(status)}
                                        className={`m-0 w-full appearance-none border-0 px-4 py-2 text-left text-xs capitalize transition-colors hover:bg-crm-surface-raised ${
                                            lead.crmStatus === status ? 'bg-crm-red/10 font-bold text-crm-red' : 'bg-transparent text-crm-fg-muted'
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

            <div className="mt-1 flex flex-wrap items-center gap-2">
                <LeadStatusBadge status={lead.crmStatus} />
                <LeadPriorityBadge priority={lead.priority} />

                {formatSourceDetail(lead.sourceDetail) && (
                    <span className="rounded border border-crm-border bg-crm-surface px-2 py-0.5 text-[10px] font-bold text-crm-fg-muted">
                        {formatSourceDetail(lead.sourceDetail)}
                    </span>
                )}
            </div>

            <div className="h-px w-full bg-crm-border" />

            <div className="flex flex-col gap-2">
                {lead.vehicleId && (
                    <div className="flex items-center gap-2 text-xs text-crm-fg-muted">
                        <Car size={14} className="shrink-0 text-crm-red" />
                        <span className="line-clamp-1">{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
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
            </div>

            <div className="mt-1 flex flex-col gap-2 rounded-xl border border-crm-border bg-crm-surface p-3">
                {lead.nextActionDate && (
                    <div className={`flex items-center gap-2 text-xs font-bold ${isNextActionOverdue ? 'text-red-300' : 'text-blue-300'}`}>
                        {isNextActionOverdue ? <AlertCircle size={14} /> : <Clock size={14} />}
                        <span>Proxima accion: {new Date(lead.nextActionDate).toLocaleDateString()}</span>
                        {isNextActionOverdue && <span className="ml-auto rounded bg-crm-red px-1.5 text-[9px] uppercase text-white">Vencida</span>}
                    </div>
                )}

                {pendingTasks.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                        <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-amber-300">
                            <CheckSquare size={12} />
                            <span>{pendingTasks.length} tareas pendientes</span>
                        </div>
                        {pendingTasks.slice(0, 2).map(task => (
                            <div key={task._id} className="flex items-center justify-between gap-2 rounded border border-crm-border bg-crm-bg px-2 py-1.5 text-xs text-crm-fg-muted">
                                <span className="line-clamp-1 flex-1">{task.title}</span>
                                <button
                                    type="button"
                                    onClick={() => onCompleteTask(lead._id, task._id)}
                                    className="m-0 appearance-none border-0 bg-transparent p-0 text-crm-fg-muted transition-colors hover:text-emerald-300"
                                    title="Completar tarea"
                                >
                                    <CheckCircle size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {!lead.nextActionDate && pendingTasks.length === 0 && (
                    <span className="py-1 text-center text-xs italic text-crm-fg-muted">Sin acciones programadas</span>
                )}
            </div>

            <Link
                href={`/admin/leads/${lead._id}`}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-crm-border bg-crm-surface py-2.5 text-xs font-bold text-crm-fg no-underline transition-colors hover:bg-crm-surface-raised hover:text-crm-red"
            >
                Ver ficha completa
                <ArrowRight size={14} />
            </Link>
        </article>
    );
}
