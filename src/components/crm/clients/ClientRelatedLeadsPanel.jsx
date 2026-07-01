import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Car, Clock, Target } from 'lucide-react';
import { useAdminLeads } from '../../../hooks/useAdminLeads';

export default function ClientRelatedLeadsPanel({ client }) {
    const { leads, loading, error, fetchLeads } = useAdminLeads();

    useEffect(() => {
        if (client?._id) {
            fetchLeads({ clientId: client._id });
        }
    }, [client]);

    if (!client) return null;

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <h3 className="m-0 mb-5 flex items-center gap-2 text-lg font-bold text-crm-fg">
                <Target size={19} className="text-crm-red" />
                Cotizaciones asociadas
            </h3>

            {loading ? (
                <div className="flex h-32 flex-1 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-crm-border border-b-crm-red" />
                </div>
            ) : error ? (
                <div className="rounded-xl border border-crm-red/30 bg-crm-red/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            ) : leads.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-bg p-6 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                        <AlertCircle size={24} />
                    </div>
                    <h4 className="m-0 mb-2 font-bold text-crm-fg">Sin cotizaciones</h4>
                    <p className="m-0 text-sm text-crm-fg-muted">
                        Este cliente no tiene cotizaciones vinculadas.
                    </p>
                </div>
            ) : (
                <div className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                    {leads.map(lead => (
                        <div key={lead._id} className="flex flex-col gap-3 rounded-xl border border-crm-border bg-crm-bg p-4 transition-colors hover:border-crm-border-strong">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <span className={`mb-2 inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        lead.crmStatus === 'nuevo' ? 'border-blue-500/20 bg-blue-500/10 text-blue-300' :
                                        lead.crmStatus === 'convertido' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' :
                                        lead.crmStatus === 'perdido' ? 'border-crm-border bg-crm-surface text-crm-fg-muted' :
                                        'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                    }`}>
                                        {lead.crmStatus || 'S/E'}
                                    </span>
                                    <p className="m-0 truncate text-sm font-semibold text-crm-fg">{lead.name}</p>
                                </div>
                                <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    lead.priority === 'alta' ? 'border-crm-red/20 bg-crm-red/10 text-red-300' :
                                    lead.priority === 'media' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' :
                                    'border-crm-border bg-crm-surface text-crm-fg-muted'
                                }`}>
                                    {lead.priority || 'media'}
                                </span>
                            </div>

                            {lead.vehicleId && (
                                <div className="flex items-center gap-2 text-xs text-crm-fg-muted">
                                    <Car size={14} />
                                    <span>{lead.vehicleId.brand} {lead.vehicleId.name}</span>
                                </div>
                            )}

                            <div className="mt-1 flex items-center justify-between border-t border-crm-border pt-3">
                                <div className="flex items-center gap-1.5 text-xs text-crm-fg-muted">
                                    <Clock size={12} />
                                    <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                                </div>
                                <Link
                                    href={`/admin/leads/${lead._id}`}
                                    className="flex items-center gap-1 text-xs font-semibold text-crm-red no-underline transition-colors hover:text-red-300"
                                >
                                    Ver cotizacion
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
