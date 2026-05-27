import React, { useEffect } from 'react';
import { Target, AlertCircle, ArrowRight, Clock, Car } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';
import Link from 'next/link';

export default function ClientRelatedLeadsPanel({ client }) {
    const { leads, loading, error, fetchLeads } = useAdminLeads();

    useEffect(() => {
        if (client?._id) {
            fetchLeads({ clientId: client._id });
        }
    }, [client]);

    if (!client) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Target size={20} className="text-red-500" />
                Oportunidades Asociadas
            </h3>

            {loading ? (
                <div className="flex-1 flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                    {error}
                </div>
            ) : leads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-neutral-800 rounded-xl bg-neutral-900/50">
                    <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
                        <AlertCircle size={32} className="text-neutral-500" />
                    </div>
                    <h4 className="text-white font-bold mb-2">Sin Oportunidades</h4>
                    <p className="text-sm text-neutral-400">
                        Este cliente no tiene leads ni oportunidades vinculadas.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[300px]">
                    {leads.map(lead => (
                        <div key={lead._id} className="bg-black/30 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:border-neutral-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border mb-2 inline-block ${
                                        lead.crmStatus === 'nuevo' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        lead.crmStatus === 'convertido' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                        lead.crmStatus === 'perdido' ? 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20' :
                                        'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    }`}>
                                        {lead.crmStatus || 'S/E'}
                                    </span>
                                    <p className="text-white font-medium text-sm line-clamp-1">{lead.name}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    lead.priority === 'alta' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                    lead.priority === 'media' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                    'bg-neutral-800 text-neutral-400 border-neutral-700'
                                }`}>
                                    {lead.priority || 'media'}
                                </span>
                            </div>

                            {lead.vehicleId && (
                                <div className="flex items-center gap-2 text-xs text-neutral-400">
                                    <Car size={14} className="text-neutral-500" />
                                    <span>{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-2 pt-3 border-t border-neutral-800/50">
                                <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                    <Clock size={12} />
                                    <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                </div>
                                <Link 
                                    href={`/admin/leads/${lead._id}`}
                                    className="text-xs text-red-500 hover:text-red-400 font-medium flex items-center gap-1 transition-colors"
                                >
                                    Ver Lead
                                    <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
