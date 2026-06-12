import React from 'react';
import Link from 'next/link';
import { ArrowRight, Car, Clock, Mail, Phone, User } from 'lucide-react';
import LeadStatusBadge from './LeadStatusBadge';
import LeadPriorityBadge from './LeadPriorityBadge';

const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toISOString().slice(0, 10);
};

const formatSourceDetail = (detail) => {
    if (!detail || detail === 'unknown') return null;
    if (detail === 'contact_form') return 'Contacto Web';
    if (detail === 'vehicle_detail_whatsapp') return 'Ficha Auto';
    if (detail === 'financing_whatsapp') return 'Financiacion';
    if (detail === 'manual_crm') return 'Manual CRM';
    return detail;
};

export default function LeadsTable({ leads }) {
    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-sm font-semibold text-crm-fg">
                {leads.length} {leads.length === 1 ? 'lead' : 'leades'} en lista
                <span className="mx-1 text-crm-fg-muted">·</span>
                <span className="text-crm-fg-muted">Seguimiento comercial</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-crm-border bg-crm-surface">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                    <thead className="bg-crm-surface-raised text-xs uppercase text-crm-fg-muted">
                        <tr>
                            <th className="px-3 py-2 font-semibold">lead</th>
                            <th className="px-3 py-2 font-semibold">Contacto</th>
                            <th className="px-3 py-2 font-semibold">Vehiculo</th>
                            <th className="px-3 py-2 font-semibold">Estado</th>
                            <th className="px-3 py-2 font-semibold">Prioridad</th>
                            <th className="px-3 py-2 font-semibold">Proxima accion</th>
                            <th className="px-3 py-2 font-semibold">Origen</th>
                            <th className="px-3 py-2 font-semibold">Cliente</th>
                            <th className="px-3 py-2 font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {leads.map((lead) => {
                            const overdue = lead.nextActionDate && new Date(lead.nextActionDate) < new Date();

                            return (
                                <tr key={lead._id} className="h-[78px] text-sm text-crm-fg transition-colors hover:bg-crm-surface-raised/70">
                                    <td className="px-3 py-2 align-middle">
                                        <div className="font-semibold leading-5 text-crm-fg">{lead.name}</div>
                                        <div className="mt-0.5 flex items-center gap-1 text-xs text-crm-fg-muted">
                                            <Clock size={12} />
                                            {formatDate(lead.createdAt)}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <div className="flex flex-col gap-1 text-xs text-crm-fg-muted">
                                            <span className="flex items-center gap-2">
                                                <Phone size={12} />
                                                <span className="truncate">{lead.phone || '--'}</span>
                                            </span>
                                            <span className="flex items-center gap-2">
                                                <Mail size={12} />
                                                <span className="max-w-[180px] truncate">{lead.email || '--'}</span>
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        {lead.vehicleId ? (
                                            <div className="flex max-w-[190px] items-center gap-2 text-xs text-crm-fg">
                                                <Car size={14} className="shrink-0 text-crm-red" />
                                                <span className="truncate">{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-crm-fg-muted">--</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <LeadStatusBadge status={lead.crmStatus} legacyStage={lead.pipelineStage} />
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <LeadPriorityBadge priority={lead.priority} />
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        {lead.nextActionDate ? (
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-xs font-bold ${overdue ? 'text-red-300' : 'text-blue-300'}`}>
                                                    {formatDate(lead.nextActionDate)}
                                                </span>
                                                {overdue && (
                                                    <span className="w-max rounded bg-crm-red/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-300">Vencida</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-crm-fg-muted">--</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <div className="flex flex-col gap-1">
                                            <span className="w-max rounded border border-crm-border bg-crm-bg px-2 py-0.5 text-xs capitalize text-crm-fg-muted">
                                                {lead.source || 'otro'}
                                            </span>
                                            {formatSourceDetail(lead.sourceDetail) && (
                                                <span className="w-max rounded border border-crm-border bg-crm-surface px-2 py-0.5 text-[10px] font-semibold text-crm-fg-muted">
                                                    {formatSourceDetail(lead.sourceDetail)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        {lead.clientId ? (
                                            <Link href={`/admin/clientes/${lead.clientId._id}`} className="flex items-center gap-2 text-xs font-semibold text-blue-300 no-underline transition-colors hover:text-blue-200">
                                                <User size={13} />
                                                Cliente real
                                            </Link>
                                        ) : (
                                            <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                                                Sin vincular
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                        <Link
                                            href={`/admin/leads/${lead._id}`}
                                            className="inline-flex h-8 items-center gap-2 rounded-lg border border-transparent bg-transparent px-2 text-xs font-semibold text-crm-fg no-underline transition-colors hover:bg-crm-surface-raised"
                                        >
                                            Ver ficha
                                            <ArrowRight size={13} />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
