import React from 'react';
import Link from 'next/link';
import { AlertCircle, CarFront, ChevronRight, Lock, User, XCircle } from 'lucide-react';
import ReservationStatusBadge from './ReservationStatusBadge';

export default function ReservationMobileCards({ reservations, onLiberar, onConvertir, getIsOverdue }) {
    if (!reservations || reservations.length === 0) {
        return (
            <div className="flex min-h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-crm-border bg-crm-surface p-8 text-center md:hidden">
                <Lock size={36} className="mb-3 text-crm-fg-subtle" />
                <h3 className="m-0 text-base font-bold text-crm-fg">Sin resultados</h3>
                <p className="m-0 mt-2 text-sm text-crm-fg-muted">Todavia no hay reservas cargadas.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 md:hidden">
            {reservations.map((res) => {
                const isOverdue = getIsOverdue(res);
                const name = res.clientId?.fullName || res.clientId?.firstName || res.leadId?.name || 'Sin nombre';
                const vehicleName = res.vehicleId ? `${res.vehicleId.brand} ${res.vehicleId.name}` : 'Vehiculo no asignado';
                const hasLink = res.clientId?._id || res.leadId?._id;
                const linkHref = res.clientId?._id ? `/admin/clientes/${res.clientId._id}` : (res.leadId?._id ? `/admin/leads/${res.leadId._id}` : '#');
                const vehicleHref = res.vehicleId?._id ? `/admin/stock/${res.vehicleId._id}` : '#';

                return (
                    <article key={res._id} className={`overflow-hidden rounded-xl border bg-crm-surface ${isOverdue && res.status === 'activa' ? 'border-amber-500/30' : 'border-crm-border'}`}>
                        <div className="flex items-start justify-between gap-3 border-b border-crm-border bg-crm-surface-raised/60 px-3 py-3">
                            <ReservationStatusBadge status={res.status} isOverdue={isOverdue} />
                            <span className="text-xs text-crm-fg-muted">{new Date(res.createdAt).toLocaleDateString('es-AR')}</span>
                        </div>

                        <div className="flex flex-col gap-3 px-3 py-3">
                            <div className="flex flex-col">
                                <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Vehiculo</span>
                                {res.vehicleId ? (
                                    <Link href={vehicleHref} className="flex items-center gap-2 text-sm font-bold text-crm-fg no-underline transition-colors hover:text-crm-red">
                                        <CarFront size={14} className="text-crm-red" />
                                        {vehicleName}
                                    </Link>
                                ) : (
                                    <span className="text-sm font-bold text-crm-fg-muted">N/A</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-crm-fg-muted">Cliente / Lead</span>
                                {hasLink ? (
                                    <Link href={linkHref} className="flex items-center gap-1.5 text-sm text-crm-fg-muted no-underline transition-colors hover:text-crm-red">
                                        <User size={14} className="text-crm-fg-muted" />
                                        {name}
                                    </Link>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-sm text-crm-fg-muted">
                                        <User size={14} className="text-crm-fg-muted" />
                                        {name}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 rounded-xl border border-crm-border bg-crm-bg p-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase text-crm-fg-muted">Sena cargada</span>
                                    <span className={`text-sm font-bold ${res.status === 'activa' ? 'text-emerald-300' : 'text-crm-fg-muted'}`}>
                                        {res.depositCurrency} {(res.depositAmount || 0).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase text-crm-fg-muted">Vencimiento</span>
                                    <span className={`flex items-center gap-1 text-sm ${isOverdue && res.status === 'activa' ? 'font-bold text-amber-300' : 'text-crm-fg-muted'}`}>
                                        {res.expiresAt ? new Date(res.expiresAt).toLocaleDateString('es-AR') : 'N/A'}
                                        {isOverdue && res.status === 'activa' && <AlertCircle size={12} />}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 border-t border-crm-border px-3 py-3">
                            {res.status === 'activa' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onConvertir(res)}
                                        className="m-0 flex flex-1 appearance-none items-center justify-center rounded-lg bg-crm-red px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-crm-red-hover"
                                    >
                                        Convertir a venta
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onLiberar(res)}
                                        className="m-0 flex h-11 w-11 appearance-none items-center justify-center rounded-lg border border-crm-red/20 bg-crm-red/10 text-crm-red transition-colors hover:bg-crm-red/20"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                </>
                            )}

                            <Link
                                href={vehicleHref}
                                className={`${res.status === 'activa' ? 'w-11 flex-none' : 'flex-1'} flex h-11 items-center justify-center rounded-lg border border-crm-border bg-crm-surface-raised text-crm-fg-muted no-underline transition-colors hover:bg-crm-border`}
                            >
                                <ChevronRight size={18} />
                            </Link>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
