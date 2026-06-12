import React from 'react';
import Link from 'next/link';
import { ArrowRight, Car, Ghost } from 'lucide-react';
import CrmButton from '../ui/CrmButton';

export default function LeadVehiclePanel({ lead }) {
    if (!lead) return null;

    const hasVehicle = Boolean(lead.vehicleId);

    return (
        <div className="flex h-full flex-col rounded-xl border border-crm-border bg-crm-surface p-5">
            <h3 className="m-0 mb-5 flex items-center gap-2 text-lg font-bold text-crm-fg">
                <Car size={19} className="text-crm-red" />
                Vehiculo de interes
            </h3>

            {hasVehicle ? (
                <div className="flex flex-1 flex-col gap-4">
                    <div className="flex flex-col overflow-hidden rounded-xl border border-crm-red/20 bg-crm-bg">
                        <div className="relative h-20 bg-crm-surface-raised">
                            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                <Car size={40} className="text-crm-fg-muted" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 p-4">
                            <span className="text-xs font-bold uppercase tracking-[0.08em] text-crm-red">{lead.vehicleId.brand}</span>
                            <span className="line-clamp-1 text-lg font-bold leading-tight text-crm-fg">{lead.vehicleId.name}</span>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="rounded border border-crm-border bg-crm-surface px-2 py-0.5 text-[10px] font-semibold text-crm-fg-muted">
                                    {lead.vehicleId.year}
                                </span>
                                {lead.vehicleId.plateOrVin && (
                                    <span className="rounded border border-crm-border bg-crm-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-crm-fg-muted">
                                        Patente: {lead.vehicleId.plateOrVin}
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 flex items-center justify-between border-t border-crm-border pt-3">
                                <span className="text-sm text-crm-fg-muted">Precio lista</span>
                                <span className="font-bold text-crm-fg">
                                    {lead.vehicleId.currency} {lead.vehicleId.price?.toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-2">
                        <Link href={`/admin/stock/${lead.vehicleId._id}`} className="no-underline">
                            <CrmButton type="button" variant="secondary" className="w-full gap-2">
                                Ver en stock
                                <ArrowRight size={16} />
                            </CrmButton>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-bg p-6 text-center">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-crm-border bg-crm-surface text-crm-fg-muted">
                        <Ghost size={24} />
                    </div>
                    <h4 className="m-0 mb-2 font-bold text-crm-fg">Sin vehiculo</h4>
                    <p className="m-0 max-w-[220px] text-sm text-crm-fg-muted">
                        Este lead no esta asociada a un vehiculo especifico del stock.
                    </p>
                </div>
            )}
        </div>
    );
}
