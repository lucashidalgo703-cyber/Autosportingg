import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, CheckCircle2, Edit, Lock, Phone, Target, UserCheck } from 'lucide-react';
import LeadStatusBadge from './LeadStatusBadge';
import LeadPriorityBadge from './LeadPriorityBadge';
import CrmButton from '../ui/CrmButton';

const formatSourceDetail = (detail) => {
    if (!detail || detail === 'unknown') return null;
    if (detail === 'contact_form') return 'Contacto Web';
    if (detail === 'vehicle_detail_whatsapp') return 'Ficha Auto';
    if (detail === 'financing_whatsapp') return 'Financiacion';
    if (detail === 'manual_crm') return 'Manual CRM';
    return detail;
};

export default function LeadDetailHeader({ lead, onEdit, onReserve, onCancelReserve, activeReservation, extraActions }) {
    if (!lead) return null;

    const canReserve = lead?.vehicleId
        && lead?.crmStatus !== 'perdido'
        && lead?.crmStatus !== 'convertido'
        && (typeof lead.vehicleId === 'string' || lead.vehicleId?.status !== 'Vendido')
        && !activeReservation?._id;

    return (
        <div className="rounded-xl border border-crm-border bg-crm-surface p-4 md:p-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-4 flex items-center gap-3">
                        <Link
                            href="/admin/leads"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-crm-border bg-crm-bg text-crm-fg-muted no-underline transition-colors hover:bg-crm-surface-raised hover:text-crm-fg"
                            title="Volver a leads"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-crm-red/20 bg-crm-red/10 text-crm-red">
                            <Target size={20} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h1 className="m-0 truncate text-2xl font-bold leading-tight text-crm-fg">{lead.name}</h1>
                                {lead.clientId && <UserCheck size={18} className="text-blue-300" title="Cliente asociado" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-full border border-crm-border bg-crm-bg px-3 py-1 text-sm text-crm-fg-muted">
                            <Phone size={14} />
                            {lead.phone}
                        </span>
                        <LeadStatusBadge status={lead.crmStatus} legacyStage={lead.pipelineStage} />
                        <LeadPriorityBadge priority={lead.priority} />
                        <span className="rounded border border-crm-border bg-crm-bg px-2 py-0.5 text-[10px] font-bold uppercase text-crm-fg-muted">
                            Origen: {lead.source || 'otro'}
                        </span>
                        {formatSourceDetail(lead.sourceDetail) && (
                            <span className="rounded border border-crm-border bg-crm-bg px-2 py-0.5 text-[10px] font-bold text-crm-fg-muted">
                                {formatSourceDetail(lead.sourceDetail)}
                            </span>
                        )}
                        {activeReservation?._id && (
                            <span className="flex items-center gap-1 rounded border border-crm-red/20 bg-crm-red/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-300">
                                <Lock size={12} />
                                Reserva activa
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 text-sm text-crm-fg-muted">
                            <Calendar size={14} />
                            Creado: {new Date(lead.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
                    {extraActions && extraActions}

                    {canReserve && (
                        <CrmButton type="button" onClick={onReserve} size="sm" className="flex-1 gap-2 lg:flex-none">
                            <CheckCircle2 size={15} />
                            Tomar reserva
                        </CrmButton>
                    )}

                    {activeReservation?._id && (
                        <CrmButton type="button" variant="secondary" size="sm" onClick={onCancelReserve} className="flex-1 gap-2 lg:flex-none">
                            <Lock size={15} className="text-crm-red" />
                            Liberar reserva
                        </CrmButton>
                    )}

                    <CrmButton type="button" variant="secondary" size="sm" onClick={onEdit} className="flex-1 gap-2 lg:flex-none">
                        <Edit size={15} />
                        Editar lead
                    </CrmButton>
                </div>
            </div>
        </div>
    );
}
