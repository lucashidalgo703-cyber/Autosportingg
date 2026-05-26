import React from 'react';
import Link from 'next/link';
import { ArrowRight, User, Phone, Mail, Car, Clock } from 'lucide-react';
import LeadStatusBadge from './LeadStatusBadge';
import LeadPriorityBadge from './LeadPriorityBadge';

export default function LeadsTable({ leads }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-neutral-800 text-xs uppercase tracking-wider text-neutral-500">
                        <th className="pb-3 font-medium px-4">Oportunidad</th>
                        <th className="pb-3 font-medium px-4">Contacto</th>
                        <th className="pb-3 font-medium px-4">Vehículo</th>
                        <th className="pb-3 font-medium px-4">Estado</th>
                        <th className="pb-3 font-medium px-4">Prioridad</th>
                        <th className="pb-3 font-medium px-4">Origen</th>
                        <th className="pb-3 font-medium px-4">Asociado</th>
                        <th className="pb-3 font-medium px-4">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                    {leads.map((lead) => (
                        <tr key={lead._id} className="hover:bg-white/[0.02] transition-colors group">
                            
                            {/* Oportunidad */}
                            <td className="py-4 px-4">
                                <div className="flex flex-col">
                                    <span className="text-white font-medium">{lead.name}</span>
                                    <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                                        <Clock size={12} />
                                        {new Date(lead.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </td>

                            {/* Contacto */}
                            <td className="py-4 px-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                                        <Phone size={14} className="text-neutral-500" />
                                        {lead.phone}
                                    </div>
                                    {lead.email && (
                                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                                            <Mail size={12} className="text-neutral-600" />
                                            {lead.email}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* Vehículo */}
                            <td className="py-4 px-4">
                                {lead.vehicleId ? (
                                    <div className="flex items-center gap-2 text-sm text-neutral-300">
                                        <Car size={16} className="text-red-500" />
                                        <span className="line-clamp-1">{lead.vehicleId.marca} {lead.vehicleId.modelo}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-neutral-600">-</span>
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

                            {/* Origen */}
                            <td className="py-4 px-4">
                                <span className="text-xs text-neutral-400 capitalize bg-neutral-800 px-2 py-1 rounded">
                                    {lead.source || 'otro'}
                                </span>
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
                            <td className="py-4 px-4">
                                <Link href={`/admin/leads/${lead._id}`} className="flex items-center justify-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors w-max">
                                    Ver Ficha
                                    <ArrowRight size={14} />
                                </Link>
                            </td>

                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
