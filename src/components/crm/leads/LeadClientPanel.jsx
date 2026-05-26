import React from 'react';
import { User, Mail, Phone, ArrowRight, UserX, Link as LinkIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function LeadClientPanel({ lead, onOpenLinkModal }) {
    if (!lead) return null;

    const hasClient = Boolean(lead.clientId);

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <User size={20} className="text-blue-500" />
                    Cliente Asociado
                </h3>
                {!hasClient && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-orange-500/20 bg-orange-500/10 text-orange-400">
                        SIN VINCULAR
                    </span>
                )}
            </div>

            {hasClient ? (
                <div className="flex flex-col gap-4 flex-1">
                    <div className="bg-black/30 border border-blue-500/20 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                                <User size={20} className="text-blue-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-lg">{lead.clientId.fullName || lead.clientId.firstName}</span>
                                <span className="text-xs text-blue-400">Perfil Principal CRM</span>
                            </div>
                        </div>

                        <div className="h-px w-full bg-neutral-800/50 my-1"></div>

                        <div className="flex items-center gap-3 text-sm text-neutral-300">
                            <Phone size={16} className="text-neutral-500 shrink-0" />
                            <span>{lead.clientId.phone}</span>
                        </div>

                        {lead.clientId.email && (
                            <div className="flex items-center gap-3 text-sm text-neutral-300">
                                <Mail size={16} className="text-neutral-500 shrink-0" />
                                <span className="truncate">{lead.clientId.email}</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4 flex flex-col gap-2">
                        <Link 
                            href={`/admin/clientes/${lead.clientId._id}`}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors border border-blue-500"
                        >
                            Ver Perfil del Cliente
                            <ArrowRight size={16} />
                        </Link>
                        
                        <button 
                            onClick={onOpenLinkModal}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors border border-neutral-800 text-sm"
                        >
                            <RefreshCw size={14} />
                            Cambiar Cliente Vinculado
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                    <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                        <UserX size={32} className="text-neutral-500" />
                    </div>
                    <h4 className="text-white font-bold mb-2">Posible cliente relacionado</h4>
                    <p className="text-sm text-neutral-400 max-w-[200px] mb-4">
                        Este lead todavía no está vinculado a un perfil de cliente real. Buscá o sugerimos coincidencias.
                    </p>
                    <button 
                        onClick={onOpenLinkModal}
                        className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2.5 rounded-lg border border-blue-500/20 transition-colors w-full font-bold"
                    >
                        <LinkIcon size={16} />
                        Vincular Cliente
                    </button>
                </div>
            )}
        </div>
    );
}
