import React from 'react';
import Link from 'next/link';
import { Calendar, User, ChevronRight, AlertCircle, XCircle } from 'lucide-react';
import ReservationStatusBadge from './ReservationStatusBadge';

export default function ReservationMobileCards({ reservations, onLiberar, getIsOverdue }) {
    if (!reservations || reservations.length === 0) {
        return (
            <div className="md:hidden flex flex-col items-center justify-center p-8 bg-neutral-900 border border-neutral-800 rounded-2xl opacity-80 mt-4">
                <p className="text-neutral-400 text-center text-sm">
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
                    <div key={res._id} className={`bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden ${isOverdue && res.status === 'activa' ? 'border-orange-500/30' : ''}`}>
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
                            <span className="text-xs text-neutral-500">{new Date(res.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Details */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Vehículo</span>
                                {res.vehicleId ? (
                                    <Link href={vehicleHref} className="text-sm font-bold text-white hover:text-red-400 transition-colors">
                                        {vehicleName}
                                    </Link>
                                ) : (
                                    <span className="text-sm font-bold text-neutral-500">N/A</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Cliente / Lead</span>
                                {hasLink ? (
                                    <Link href={linkHref} className="text-sm text-neutral-300 hover:text-red-400 transition-colors flex items-center gap-1.5">
                                        <User size={14} className="text-neutral-500" />
                                        {name}
                                    </Link>
                                ) : (
                                    <span className="text-sm text-neutral-400 flex items-center gap-1.5">
                                        <User size={14} className="text-neutral-500" />
                                        {name}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-black/20 rounded-xl p-3 border border-neutral-800/50">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-neutral-500 uppercase">Seña Cargada</span>
                                    <span className={`text-sm font-bold ${res.status === 'activa' ? 'text-green-400' : 'text-neutral-300'}`}>
                                        {res.depositCurrency} {(res.depositAmount || 0).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-neutral-500 uppercase">Vencimiento</span>
                                    <span className={`text-sm flex items-center gap-1 ${isOverdue && res.status === 'activa' ? 'text-orange-400 font-bold' : 'text-neutral-300'}`}>
                                        {res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : 'N/A'}
                                        {isOverdue && res.status === 'activa' && <AlertCircle size={12} />}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                            {res.status === 'activa' && (
                                <button 
                                    onClick={() => onLiberar(res)}
                                    className="flex-1 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold transition-colors border border-red-500/20 flex items-center justify-center gap-2"
                                >
                                    <XCircle size={16} />
                                    Liberar Reserva
                                </button>
                            )}
                            
                            <Link 
                                href={vehicleHref}
                                className={`${res.status === 'activa' ? 'flex-none w-10' : 'flex-1'} py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold transition-colors border border-neutral-700 flex items-center justify-center`}
                            >
                                <ChevronRight size={18} />
                            </Link>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
