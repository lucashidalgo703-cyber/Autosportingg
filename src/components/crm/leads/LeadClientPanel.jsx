import React from 'react';
import Link from 'next/link';
import { ArrowRight, Link as LinkIcon, Mail, Phone, RefreshCw, User, UserX } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function LeadClientPanel({ lead, onOpenLinkModal }) {
    if (!lead) return null;

    const hasClient = Boolean(lead.clientId);

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-crm-fg">
                    <User size={19} className="text-blue-300" />
                    Cliente asociado
                </h3>
                {!hasClient && (
                    <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                        Sin vincular
                    </span>
                )}
            </div>

            {hasClient ? (
                <div className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
                                <User size={20} />
                            </div>
                            <div className="min-w-0">
                                <span className="block truncate text-lg font-bold text-crm-fg">{lead.clientId.fullName || lead.clientId.firstName}</span>
                                <span className="text-xs text-blue-300">Perfil principal CRM</span>
                            </div>
                        </div>

                        <div className="h-px w-full bg-crm-border" />

                        <div className="flex items-center gap-3 text-sm text-crm-fg-muted">
                            <Phone size={16} className="shrink-0" />
                            <span>{lead.clientId.phone || '--'}</span>
                        </div>

                        {lead.clientId.email && (
                            <div className="flex items-center gap-3 text-sm text-crm-fg-muted">
                                <Mail size={16} className="shrink-0" />
                                <span className="truncate">{lead.clientId.email}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-2">
                        <Link href={`/admin/clientes/${lead.clientId._id}`} className="no-underline">
                            <CrmButton type="button" variant="secondary" className="w-full gap-2">
                                Ver perfil del cliente
                                <ArrowRight size={16} />
                            </CrmButton>
                        </Link>

                        <CrmButton type="button" variant="ghost" onClick={onOpenLinkModal} className="w-full gap-2">
                            <RefreshCw size={14} />
                            Cambiar cliente vinculado
                        </CrmButton>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-bg p-6 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                        <UserX size={24} />
                    </div>
                    <h4 className="m-0 mb-2 font-bold text-crm-fg">Posible cliente relacionado</h4>
                    <p className="m-0 mb-4 max-w-[220px] text-sm text-crm-fg-muted">
                        Este lead todavia no esta vinculada a un perfil de cliente real.
                    </p>
                    <CrmButton type="button" variant="secondary" onClick={onOpenLinkModal} className="w-full gap-2">
                        <LinkIcon size={16} />
                        Vincular cliente
                    </CrmButton>
                </div>
            )}
        </div>
    );
}
