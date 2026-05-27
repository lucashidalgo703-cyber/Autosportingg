import React from 'react';
import Link from 'next/link';
import { User, CarFront, Lock, CheckCircle2, ChevronRight, XCircle, AlertCircle } from 'lucide-react';
import ReservationStatusBadge from './ReservationStatusBadge';

export default function ReservationsTable({ reservations, onLiberar, getIsOverdue }) {
    if (!reservations || reservations.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-neutral-900 border border-neutral-800 rounded-2xl opacity-80">
                <Lock size={48} className="text-neutral-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No se encontraron reservas</h3>
                <p className="text-neutral-400 text-center max-w-md">
                    No hay resultados que coincidan con los filtros actuales.
                </p>
            </div>
        );
    }

    return (
        <div className="hidden md:block bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-neutral-800 bg-[#161619]">
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Fecha</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Cliente / Lead</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Vehículo</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Estado</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Seña</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Vencimiento</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                        {reservations.map(res => {
                            const isOverdue = getIsOverdue(res);
                            const name = res.clientId?.fullName || res.clientId?.firstName || res.leadId?.name || 'Sin Nombre';
                            const phone = res.clientId?.phone || res.leadId?.phone || '';
                            const vehicleName = res.vehicleId ? `${res.vehicleId.brand} ${res.vehicleId.name}` : 'Vehículo no asignado';
                            const vehicleVin = res.vehicleId?.plateOrVin || '';
                            const hasLink = res.clientId?._id || res.leadId?._id;
                            const linkHref = res.clientId?._id ? `/admin/clientes/${res.clientId._id}` : (res.leadId?._id ? `/admin/leads/${res.leadId._id}` : '#');
                            const vehicleHref = res.vehicleId?._id ? `/admin/stock/${res.vehicleId._id}` : '#';

                            return (
                                <tr key={res._id} className={`hover:bg-black/20 transition-colors ${isOverdue && res.status === 'activa' ? 'bg-orange-500/5' : ''}`}>
                                    {/* Fecha */}
                                    <td className="p-4 whitespace-nowrap">
                                        <span className="text-sm text-neutral-300 block">{new Date(res.createdAt).toLocaleDateString()}</span>
                                        <span className="text-xs text-neutral-500">{new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>

                                    {/* Cliente / Lead */}
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            {hasLink ? (
                                                <Link href={linkHref} className="text-sm font-bold text-white hover:text-red-400 transition-colors truncate max-w-[200px]">
                                                    {name}
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-bold text-white truncate max-w-[200px]">{name}</span>
                                            )}
                                            {phone && <span className="text-xs text-neutral-500">{phone}</span>}
                                        </div>
                                    </td>

                                    {/* Vehículo */}
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            {res.vehicleId ? (
                                                <Link href={vehicleHref} className="text-sm font-bold text-white hover:text-red-400 transition-colors truncate max-w-[200px]">
                                                    {vehicleName}
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-bold text-neutral-500">N/A</span>
                                            )}
                                            {vehicleVin && <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded w-max mt-1 border border-neutral-700 font-mono uppercase">{vehicleVin}</span>}
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="p-4 whitespace-nowrap">
                                        <ReservationStatusBadge status={res.status} isOverdue={isOverdue} />
                                    </td>

                                    {/* Seña */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-bold ${res.status === 'activa' ? 'text-green-400' : 'text-neutral-400'}`}>
                                                {res.depositCurrency} {(res.depositAmount || 0).toLocaleString('es-AR')}
                                            </span>
                                            <span className="text-[10px] text-neutral-500">
                                                Acordado: {res.agreedCurrency} {(res.agreedPrice || 0).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Vencimiento */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {res.expiresAt ? (
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-medium ${isOverdue && res.status === 'activa' ? 'text-orange-400 font-bold flex items-center gap-1' : 'text-neutral-300'}`}>
                                                    {isOverdue && res.status === 'activa' && <AlertCircle size={12} />}
                                                    {new Date(res.expiresAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-neutral-600 italic">Sin fecha</span>
                                        )}
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            {res.status === 'activa' && (
                                                <button 
                                                    onClick={() => onLiberar(res)}
                                                    className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 flex items-center justify-center transition-colors border border-neutral-700 hover:border-red-500/30"
                                                    title="Liberar / Cancelar Reserva"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            )}
                                            
                                            <Link 
                                                href={vehicleHref}
                                                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 flex items-center justify-center transition-colors border border-neutral-700"
                                                title="Ver Vehículo"
                                            >
                                                <ChevronRight size={16} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
