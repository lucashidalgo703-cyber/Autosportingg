import React from 'react';
import Link from 'next/link';
import { Calendar, User, Handshake } from 'lucide-react';
import InstallmentStatusBadge from './InstallmentStatusBadge';

export default function InstallmentMobileCards({ installments, onEdit }) {
    if (!installments || installments.length === 0) {
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
            {installments.map(inst => {
                const clientName = inst.clientId?.fullName || inst.clientId?.firstName || 'Sin cliente';
                const vehicleName = inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name}` : 'Sin vehículo';
                const isOverdue = inst.status === 'pendiente' && new Date(inst.dueDate) < new Date();

                return (
                    <div key={inst._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden">
                        
                        {/* Top row */}
                        <div className="flex justify-between items-start">
                            <InstallmentStatusBadge status={inst.status} dueDate={inst.dueDate} />
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Cuota {inst.installmentNumber}</span>
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={12} className={isOverdue ? "text-red-400" : "text-neutral-500"} />
                                    <span className={`text-xs ${isOverdue ? 'font-bold text-red-400' : 'text-neutral-300'}`}>
                                        {new Date(inst.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                                <Link href={`/admin/ventas/${inst.saleId?._id || inst.saleId}`} className="text-sm font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5">
                                    <Handshake size={14} className="text-neutral-500" />
                                    Venta Asociada
                                </Link>
                                <span className="text-xs text-neutral-400 mt-1">{clientName}</span>
                                <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{vehicleName}</span>
                            </div>

                            <div className="flex justify-between items-center bg-black/20 rounded-xl p-3 border border-neutral-800/50">
                                <span className="text-[10px] text-neutral-500 uppercase">Importe</span>
                                <span className={`text-sm font-bold ${inst.status === 'anulada' ? 'text-neutral-500 line-through' : 'text-white'}`}>
                                    {inst.currency} {(inst.amount || 0).toLocaleString('es-AR')}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-neutral-800/50 flex justify-end">
                            <button 
                                onClick={() => onEdit(inst)}
                                className="h-8 px-4 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-colors"
                            >
                                Gestionar
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
