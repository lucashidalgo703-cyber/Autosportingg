import React from 'react';
import Link from 'next/link';
import { User, CarFront, Lock, CheckCircle2, ChevronRight, XCircle, AlertCircle } from 'lucide-react';
import ReservationStatusBadge from './ReservationStatusBadge';

export default function ReservationsTable({ reservations, onLiberar, onConvertir, getIsOverdue }) {
    if (!reservations || reservations.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-crm-surface border border-crm-border rounded-2xl opacity-80">
                <Lock size={48} className="text-crm-fg-muted mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No se encontraron reservas</h3>
                <p className="text-crm-fg-muted text-center max-w-md">
                    No hay resultados que coincidan con los filtros actuales.
                </p>
            </div>
        );
    }

    return (
        <div className="hidden md:block bg-crm-surface border border-crm-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-crm-topbar">
                        <tr className="border-b border-crm-border">
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Fecha</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Cliente / Lead</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Vehículo</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Estado</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider text-right">Seña</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider text-right">Vencimiento</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
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
                                <tr key={res._id} className={`hover:bg-crm-surface-raised transition-colors group ${isOverdue && res.status === 'activa' ? 'bg-orange-500/5' : ''}`}>
                                    {/* Fecha */}
                                    <td className="p-4 whitespace-nowrap">
                                        <span className="text-sm text-crm-fg-muted block">{new Date(res.createdAt).toLocaleDateString()}</span>
                                        <span className="text-xs text-crm-fg-muted">{new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                                            {phone && <span className="text-xs text-crm-fg-muted">{phone}</span>}
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
                                                <span className="text-sm font-bold text-crm-fg-muted">N/A</span>
                                            )}
                                            {vehicleVin && <span className="text-[10px] bg-crm-bg text-crm-fg-muted px-1.5 py-0.5 rounded w-max mt-1 border border-crm-border font-mono uppercase">{vehicleVin}</span>}
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="p-4 whitespace-nowrap">
                                        <ReservationStatusBadge status={res.status} isOverdue={isOverdue} />
                                    </td>

                                    {/* Seña */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-sm font-bold ${res.status === 'activa' ? 'text-green-400' : 'text-crm-fg-muted'}`}>
                                                {res.depositCurrency} {(res.depositAmount || 0).toLocaleString('es-AR')}
                                            </span>
                                            <span className="text-[10px] text-crm-fg-muted">
                                                Acordado: {res.agreedCurrency} {(res.agreedPrice || 0).toLocaleString('es-AR')}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Vencimiento */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        {res.expiresAt ? (
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-medium ${isOverdue && res.status === 'activa' ? 'text-orange-400 font-bold flex items-center gap-1' : 'text-crm-fg-muted'}`}>
                                                    {isOverdue && res.status === 'activa' && <AlertCircle size={12} />}
                                                    {new Date(res.expiresAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-crm-fg-muted italic">Sin fecha</span>
                                        )}
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {res.status === 'activa' && (
                                                <>
                                                    <button 
                                                        onClick={() => onConvertir(res)}
                                                        className="h-8 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center transition-colors border border-blue-500/20"
                                                        title="Convertir a Venta"
                                                    >
                                                        Vender
                                                    </button>
                                                    <button 
                                                        onClick={() => onLiberar(res)}
                                                        className="w-8 h-8 rounded-lg bg-crm-surface-raised hover:bg-crm-red/20 text-crm-fg-muted hover:text-crm-red flex items-center justify-center transition-colors border border-crm-border hover:border-crm-red/30"
                                                        title="Liberar / Cancelar Reserva"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </>
                                            )}
                                            
                                            <Link 
                                                href={vehicleHref}
                                                className="w-8 h-8 rounded-lg bg-crm-surface-raised hover:bg-crm-border text-crm-fg-muted flex items-center justify-center transition-colors border border-crm-border"
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
