import React from 'react';
import Link from 'next/link';
import { Link2, CarFront, User, CalendarClock, ChevronRight } from 'lucide-react';

export default function SaleLinkedEntitiesPanel({ sale }) {
    if (!sale) return null;

    const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehículo no asignado';
    const vehicleVin = sale.vehicleId?.plateOrVin || '';
    const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

    const clientName = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
    const clientPhone = sale.clientId?.phone || sale.leadId?.phone || 'Sin teléfono';
    const clientEmail = sale.clientId?.email || sale.leadId?.email || '';
    const hasClientLink = sale.clientId?._id || sale.leadId?._id;
    const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-neutral-800 flex items-center gap-2 bg-[#1E1E24]">
                <Link2 size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Entidades Vinculadas</h3>
            </div>
            
            <div className="p-5 space-y-4 flex-1">
                
                {/* Vehicle */}
                <div className="bg-black/30 border border-neutral-800/50 rounded-xl p-4 flex justify-between items-center group hover:bg-neutral-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                            <CarFront size={18} className="text-neutral-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Vehículo</span>
                            <span className="text-sm font-bold text-white">{vehicleName}</span>
                            {vehicleVin && <span className="text-[10px] text-neutral-500 font-mono mt-1">{vehicleVin}</span>}
                        </div>
                    </div>
                    {sale.vehicleId && (
                        <Link href={vehicleHref} className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors shadow-sm">
                            <ChevronRight size={18} />
                        </Link>
                    )}
                </div>

                {/* Client / Lead */}
                <div className="bg-black/30 border border-neutral-800/50 rounded-xl p-4 flex justify-between items-center group hover:bg-neutral-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                            <User size={18} className="text-neutral-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">
                                {sale.clientId ? 'Cliente Oficial' : 'Lead (Prospecto)'}
                            </span>
                            <span className="text-sm font-bold text-white">{clientName}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-neutral-400">{clientPhone}</span>
                                {clientEmail && (
                                    <>
                                        <span className="w-1 h-1 bg-neutral-700 rounded-full"></span>
                                        <span className="text-[10px] text-neutral-400 truncate max-w-[150px]">{clientEmail}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {hasClientLink && (
                        <Link href={clientHref} className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors shadow-sm">
                            <ChevronRight size={18} />
                        </Link>
                    )}
                </div>

                {/* Reservation */}
                {sale.reservationId && (
                    <div className="bg-black/30 border border-neutral-800/50 rounded-xl p-4 flex justify-between items-center group hover:bg-neutral-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center border border-neutral-700">
                                <CalendarClock size={18} className="text-neutral-400" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mb-0.5">Reserva Previa</span>
                                <span className="text-sm font-bold text-white">Convertida Exitosamente</span>
                            </div>
                        </div>
                        <Link href="/admin/reservas" className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors shadow-sm">
                            <ChevronRight size={18} />
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}
