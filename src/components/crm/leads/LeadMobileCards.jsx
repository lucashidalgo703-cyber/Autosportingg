import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Car, ChevronDown, Clock, Mail, Phone, User } from 'lucide-react';
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

export default function LeadMobileCards({ leads }) {
    const [expandedId, setExpandedId] = useState(leads?.[0]?._id || null);

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-crm-border bg-crm-surface p-3 text-sm font-semibold text-crm-fg">
                {leads.length} {leads.length === 1 ? 'cotizacion' : 'cotizaciones'} en lista
                <span className="mx-1 text-crm-fg-muted">·</span>
                <span className="text-crm-fg-muted">Seguimiento comercial</span>
            </div>

            <div className="flex flex-col gap-3">
                {leads.map((lead) => {
                    const isExpanded = expandedId === lead._id;
                    const overdue = lead.nextActionDate && new Date(lead.nextActionDate) < new Date();

                    return (
                        <article key={lead._id} className="overflow-hidden rounded-xl border border-crm-border bg-crm-surface">
                            <button
                                type="button"
                                onClick={() => setExpandedId(isExpanded ? null : lead._id)}
                                className="m-0 flex w-full appearance-none items-center justify-between gap-3 border-0 bg-transparent px-3 py-3 text-left text-crm-fg"
                            >
                                <div className="min-w-0">
                                    <h3 className="m-0 truncate text-sm font-semibold leading-5 text-crm-fg">{lead.name}</h3>
                                    <p className="m-0 mt-1 truncate text-xs text-crm-fg-muted">
                                        {lead.source || 'otro'} · {formatDate(lead.createdAt)}
                                    </p>
                                </div>
                                <ChevronDown
                                    size={18}
                                    className={`shrink-0 text-crm-fg-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {isExpanded && (
                                <div className="border-t border-crm-border bg-crm-bg/40 px-3 py-3">
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        <LeadStatusBadge status={lead.crmStatus} legacyStage={lead.pipelineStage} />
                                        <LeadPriorityBadge priority={lead.priority} />
                                        {formatSourceDetail(lead.sourceDetail) && (
                                            <span className="rounded border border-crm-border bg-crm-surface px-2 py-0.5 text-[10px] font-semibold text-crm-fg-muted">
                                                {formatSourceDetail(lead.sourceDetail)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-xs">
                                        <InfoItem icon={Phone} label="Tel" value={lead.phone || '--'} />
                                        <InfoItem icon={Mail} label="Email" value={lead.email || '--'} />
                                        {lead.vehicleId && (
                                            <InfoItem icon={Car} label="Vehiculo" value={`${lead.vehicleId.brand} ${lead.vehicleId.name}`} />
                                        )}
                                        <div className="flex min-w-0 items-center gap-2 text-crm-fg-muted">
                                            <User size={12} className="shrink-0" />
                                            <span className="font-semibold text-crm-fg-muted">Cliente: </span>
                                            {lead.clientId ? (
                                                <Link href={`/admin/clientes/${lead.clientId._id}`} className="truncate text-blue-300 no-underline">
                                                    Vinculado
                                                </Link>
                                            ) : (
                                                <span className="text-amber-300">Sin vincular</span>
                                            )}
                                        </div>
                                        {lead.nextActionDate && (
                                            <div className="flex min-w-0 items-center gap-2 text-crm-fg-muted">
                                                <Clock size={12} className="shrink-0" />
                                                <span className="font-semibold text-crm-fg-muted">Accion: </span>
                                                <span className={overdue ? 'font-semibold text-red-300' : 'font-semibold text-blue-300'}>
                                                    {formatDate(lead.nextActionDate)}
                                                </span>
                                                {overdue && <span className="rounded bg-crm-red/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-300">Vencida</span>}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center gap-2 border-t border-crm-border pt-3">
                                        <Link
                                            href={`/admin/leads/${lead._id}`}
                                            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-crm-red/10 px-3 text-xs font-semibold text-red-300 no-underline transition-colors hover:bg-crm-red/15"
                                        >
                                            Ver ficha
                                            <ArrowRight size={12} />
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

function InfoItem({ icon: Icon, label, value }) {
    return (
        <div className="flex min-w-0 items-center gap-2 text-crm-fg-muted">
            <Icon size={12} className="shrink-0" />
            <span className="font-semibold text-crm-fg-muted">{label}: </span>
            <span className="truncate text-crm-fg">{value}</span>
        </div>
    );
}
