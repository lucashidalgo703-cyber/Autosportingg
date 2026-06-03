import React from 'react';
import Link from 'next/link';
import { Calendar, User, ChevronRight, AlertCircle, XCircle } from 'lucide-react';
import ReservationStatusBadge from './ReservationStatusBadge';

export default function ReservationMobileCards({ reservations, onLiberar, onConvertir, getIsOverdue }) {
    if (!reservations || reservations.length === 0) {
        return (
            <div className="md:hidden flex flex-col items-center justify-center p-8 bg-crm-surface border border-crm-border rounded-2xl opacity-80 mt-4">
                <p className="text-crm-fg-muted text-center text-sm">
                    No hay resultados que coincidan con los filtros actuales.
                </p>
            </div>
        );
    }

    return (
        <div className="md:hidden flex flex-col gap-4">
            {reservations.map(res => {
                const isOverdue = getIsOverdue(res);
                const name = res.clientId?.fullName || res.clientId?.firstName || res.leadId?.name || 'Sin Nombre';
                const vehicleName = res.vehicleId ? `${res.vehicleId.brand} ${res.vehicleId.name}` : 'Vehículo no asignado';
                const hasLink = res.clientId?._id || res.leadId?._id;
                const linkHref = res.clientId?._id ? `/admin/clientes/${res.clientId._id}` : (res.leadId?._id ? `/admin/leads/${res.leadId._id}` : '#');
                const vehicleHref = res.vehicleId?._id ? `/admin/stock/${res.vehicleId._id}` : '#';

                return (
                    <div key={res._id} className={`bg-crm-surface border border-crm-border rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden ${isOverdue && res.status === 'activa' ? 'border-orange-500/30' : ''}`}>
                        {isOverdue && res.status === 'activa' && (
                            <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                                <div className="absolute top-4 -right-5 bg-orange-500 text-white text-[8px] font-bold py-0.5 px-6 rotate-45 uppercase tracking-wider shadow-lg">
                                    Vencida
                                </div>
                            </div>
                        )}

                        {/* Top row: Status & Date */}
                        <div className="flex justify-between items-start">
                            <ReservationStatusBadge status={res.status} isOverdue={isOverdue} />
                            <span className="text-xs text-crm-fg-muted">{new Date(res.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Details */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">Vehículo</span>
                                {res.vehicleId ? (
                                    <Link href={vehicleHref} className="text-sm font-bold text-white hover:text-red-400 transition-colors">
                                        {vehicleName}
                                    </Link>
                                ) : (
                                    <span className="text-sm font-bold text-crm-fg-muted">N/A</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider mb-1">Cliente / Lead</span>
                                {hasLink ? (
                                    <Link href={linkHref} className="text-sm text-crm-fg-muted hover:text-red-400 transition-colors flex items-center gap-1.5">
                                        <User size={14} className="text-crm-fg-muted" />
                                        {name}
                                    </Link>
                                ) : (
                                    <span className="text-sm text-crm-fg-muted flex items-center gap-1.5">
                                        <User size={14} className="text-crm-fg-muted" />
                                        {name}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-crm-bg rounded-xl p-3 border border-crm-border">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-crm-fg-muted uppercase">Seña Cargada</span>
                                    <span className={`text-sm font-bold ${res.status === 'activa' ? 'text-green-400' : 'text-crm-fg-muted'}`}>
                                        {res.depositCurrency} {(res.depositAmount || 0).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-crm-fg-muted uppercase">Vencimiento</span>
                                    <span className={`text-sm flex items-center gap-1 ${isOverdue && res.status === 'activa' ? 'text-orange-400 font-bold' : 'text-crm-fg-muted'}`}>
                                        {res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : 'N/A'}
                                        {isOverdue && res.status === 'activa' && <AlertCircle size={12} />}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 border-t border-crm-border">
                            {res.status === 'activa' && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onConvertir(res)}
                                        className="flex-1 py-2.5 rounded-xl bg-crm-red hover:bg-[#C42620] text-white text-sm font-bold transition-colors flex items-center justify-center"
                                    >
                                        Convertir a Venta
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                {res.status === 'activa' && (
                                    <button 
                                        onClick={() => onLiberar(res)}
                                        className="flex-1 py-2.5 rounded-xl bg-crm-red/10 hover:bg-crm-red/20 text-crm-red text-sm font-bold transition-colors border border-crm-red/20 flex items-center justify-center gap-2"
                                    >
                                        <XCircle size={16} />
                                        Liberar Reserva
                                    </button>
                                )}
                                
                                <Link 
                                    href={vehicleHref}
                                    className={`${res.status === 'activa' ? 'flex-none w-12' : 'flex-1'} py-2.5 rounded-xl bg-crm-surface-raised hover:bg-crm-border text-crm-fg-muted text-sm font-bold transition-colors border border-crm-border flex items-center justify-center`}
                                >
                                    <ChevronRight size={18} />
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
