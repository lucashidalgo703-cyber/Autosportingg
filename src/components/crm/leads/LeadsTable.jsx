import React from 'react';
import Link from 'next/link';
import { ArrowRight, User, Phone, Mail, Car, Clock } from 'lucide-react';
import LeadStatusBadge from './LeadStatusBadge';
import LeadPriorityBadge from './LeadPriorityBadge';
import CrmButton from '../ui/CrmButton';

export default function LeadsTable({ leads }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-crm-topbar">
                    <tr className="border-b border-crm-border text-[10px] uppercase tracking-wider text-crm-fg-muted font-bold">
                        <th className="py-3 px-4">Oportunidad</th>
                        <th className="py-3 px-4">Contacto</th>
                        <th className="py-3 px-4">Vehículo</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4">Prioridad</th>
                        <th className="py-3 px-4">Próxima Acción</th>
                        <th className="py-3 px-4">Origen</th>
                        <th className="py-3 px-4">Asociado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-crm-border">
                    {leads.map((lead) => (
                        <tr key={lead._id} className="hover:bg-crm-surface-raised transition-colors group">
                            
                            {/* Oportunidad */}
                            <td className="py-4 px-4">
                                <div className="flex flex-col">
                                    <span className="text-white font-medium">{lead.name}</span>
                                    <div className="flex items-center gap-1 text-xs text-crm-fg-muted mt-1">
                                        <Clock size={12} />
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </td>

                            {/* Contacto */}
                            <td className="py-4 px-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm text-[#FAFAFA]">
                                        <Phone size={14} className="text-crm-fg-muted" />
                                        {lead.phone}
                                    </div>
                                    {lead.email && (
                                        <div className="flex items-center gap-2 text-xs text-crm-fg-muted">
                                            <Mail size={12} className="text-crm-fg-muted" />
                                            {lead.email}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* Vehículo */}
                            <td className="py-4 px-4">
                                {lead.vehicleId ? (
                                    <div className="flex items-center gap-2 text-sm text-[#FAFAFA]">
                                        <Car size={16} className="text-[#EF3329]" />
                                        <span className="line-clamp-1">{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-crm-fg-muted">-</span>
                                )}
                            </td>

                            {/* Estado */}
                            <td className="py-4 px-4">
                                <LeadStatusBadge status={lead.crmStatus} legacyStage={lead.pipelineStage} />
                            </td>

                            {/* Prioridad */}
                            <td className="py-4 px-4">
                                <LeadPriorityBadge priority={lead.priority} />
                            </td>

                            {/* Próxima Acción */}
                            <td className="py-4 px-4">
                                {lead.nextActionDate ? (
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-xs font-bold ${new Date(lead.nextActionDate) < new Date() ? 'text-red-400' : 'text-blue-400'}`}>
                                            {new Date(lead.nextActionDate).toLocaleDateString()}
                                        </span>
                                        {new Date(lead.nextActionDate) < new Date() && (
                                            <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded w-max">VENCIDA</span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-xs text-neutral-600">-</span>
                                )}
                            </td>

                            {/* Origen */}
                            <td className="py-4 px-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-crm-fg-muted capitalize bg-crm-bg border border-crm-border px-2 py-0.5 rounded w-max">
                                        {lead.source || 'otro'}
                                    </span>
                                    {lead.sourceDetail && lead.sourceDetail !== 'unknown' && (
                                        <span className="text-[10px] font-medium text-crm-fg-muted bg-crm-surface border border-crm-border px-2 py-0.5 rounded w-max">
                                            {lead.sourceDetail === 'contact_form' ? 'Contacto Web' :
                                             lead.sourceDetail === 'vehicle_detail_whatsapp' ? 'Ficha Auto' :
                                             lead.sourceDetail === 'financing_whatsapp' ? 'Financiación' :
                                             lead.sourceDetail === 'manual_crm' ? 'Manual CRM' : lead.sourceDetail}
                                        </span>
                                    )}
                                </div>
                            </td>

                            {/* Cliente Asociado */}
                            <td className="py-4 px-4">
                                {lead.clientId ? (
                                    <Link href={`/admin/clientes/${lead.clientId._id}`} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                        <User size={14} />
                                        <span className="underline decoration-blue-500/30 underline-offset-2">Cliente Real</span>
                                    </Link>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/20 bg-orange-500/10 text-orange-400">
                                        SIN VINCULAR
                                    </span>
                                )}
                            </td>

                            {/* Acciones */}
                            <td className="py-4 px-4 text-right">
                                <Link href={`/admin/leads/${lead._id}`}>
                                    <CrmButton variant="secondary" className="gap-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity float-right">
                                        Ver Ficha
                                        <ArrowRight size={14} />
                                    </CrmButton>
                                </Link>
                            </td>

                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
