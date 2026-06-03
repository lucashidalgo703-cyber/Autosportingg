import React from 'react';
import Link from 'next/link';
import { ArrowRight, Phone, Mail, Car, Clock, User } from 'lucide-react';
import LeadStatusBadge from './LeadStatusBadge';
import LeadPriorityBadge from './LeadPriorityBadge';

export default function LeadMobileCards({ leads }) {
    return (
        <div className="flex flex-col gap-4">
            {leads.map((lead) => (
                <div key={lead._id} className="bg-crm-surface border border-crm-border p-4 rounded-xl flex flex-col gap-4">
                    
                    {/* Header: Name and Badges */}
                    <div className="flex justify-between items-start gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-white font-bold text-lg">{lead.name}</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                <LeadStatusBadge status={lead.crmStatus} legacyStage={lead.pipelineStage} />
                                <LeadPriorityBadge priority={lead.priority} />
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded border capitalize bg-crm-bg text-crm-fg-muted border-crm-border">
                                    {lead.source || 'otro'}
                                </span>
                                {lead.sourceDetail && lead.sourceDetail !== 'unknown' && (
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded border bg-crm-surface text-crm-fg-muted border-crm-border">
                                        {lead.sourceDetail === 'contact_form' ? 'Contacto Web' :
                                         lead.sourceDetail === 'vehicle_detail_whatsapp' ? 'Ficha Auto' :
                                         lead.sourceDetail === 'financing_whatsapp' ? 'Financiación' :
                                         lead.sourceDetail === 'manual_crm' ? 'Manual CRM' : lead.sourceDetail}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="h-px w-full bg-crm-border"></div>

                    {/* Content: Info */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3 text-sm text-crm-fg-muted">
                            <Phone size={16} className="text-crm-fg-muted shrink-0" />
                            <span>{lead.phone}</span>
                        </div>
                        
                        {lead.email && (
                            <div className="flex items-center gap-3 text-sm text-crm-fg-muted">
                                <Mail size={16} className="text-crm-fg-muted shrink-0" />
                                <span className="truncate">{lead.email}</span>
                            </div>
                        )}

                        {lead.vehicleId && (
                            <div className="flex items-center gap-3 text-sm text-crm-fg-muted">
                                <Car size={16} className="text-crm-red shrink-0" />
                                <span>{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 text-sm text-crm-fg-muted">
                            <User size={16} className="text-crm-fg-muted shrink-0" />
                            {lead.clientId ? (
                                <Link href={`/admin/clientes/${lead.clientId._id}`} className="text-blue-400 hover:underline">
                                    Cliente Vinculado
                                </Link>
                            ) : (
                                <span className="text-orange-400 font-medium">Sin Vincular</span>
                            )}
                        </div>

                        {lead.nextActionDate && (
                            <div className="flex items-center gap-3 text-sm mt-1">
                                <Clock size={16} className={new Date(lead.nextActionDate) < new Date() ? 'text-red-500 shrink-0' : 'text-blue-500 shrink-0'} />
                                <span className={new Date(lead.nextActionDate) < new Date() ? 'text-red-400 font-bold' : 'text-blue-400 font-bold'}>
                                    Acción: {new Date(lead.nextActionDate).toLocaleDateString()}
                                </span>
                                {new Date(lead.nextActionDate) < new Date() && (
                                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold">Vencida</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-px w-full bg-crm-border"></div>

                    {/* Footer: Date and Action */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-xs text-crm-fg-muted">
                            <Clock size={14} />
                            <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </div>
                        <Link href={`/admin/leads/${lead._id}`} className="flex items-center justify-center gap-2 text-xs font-bold text-crm-red hover:text-crm-red bg-crm-red/10 hover:bg-crm-red/20 px-3 py-2 rounded-lg border border-crm-red/20 transition-colors">
                            Ver Ficha
                            <ArrowRight size={14} />
                        </Link>
                    </div>

                </div>
            ))}
        </div>
    );
}
