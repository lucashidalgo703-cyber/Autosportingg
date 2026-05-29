import React from 'react';
import Link from 'next/link';
import { Calendar, User, Handshake } from 'lucide-react';
import InstallmentStatusBadge from './InstallmentStatusBadge';

export default function InstallmentMobileCards({ installments, onEdit, onRegisterPayment, onDelete, currentUserRole }) {
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

                // Financial Status Calculation
                const fs = inst.financeSummary;
                let balanceCuota = 0;
                if (inst.currency === 'ARS') balanceCuota = (fs?.ingresosARS || 0) - (fs?.egresosARS || 0);
                if (inst.currency === 'USD') balanceCuota = (fs?.ingresosUSD || 0) - (fs?.egresosUSD || 0);
                
                const saldoCuota = inst.amount - balanceCuota;
                let finStatus = 'Sin cobro';
                if (balanceCuota > 0 && balanceCuota < inst.amount) finStatus = 'Parcialmente cobrada';
                if (balanceCuota >= inst.amount && balanceCuota <= inst.amount) finStatus = 'Cobrada financieramente';
                if (balanceCuota > inst.amount) finStatus = 'Sobrecobrada';

                const isPaidVisual = inst.status === 'pagada_manual';
                const hasWarning = isPaidVisual && saldoCuota > 0;

                return (
                    <div key={inst._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden">
                        
                        {/* Top row */}
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <InstallmentStatusBadge status={inst.status} dueDate={inst.dueDate} />
                                {finStatus !== 'Sin cobro' && (
                                    <span className="text-[10px] text-green-400 font-bold">{finStatus}</span>
                                )}
                                {hasWarning && (
                                    <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 w-max mt-1" title="La cuota figura pagada manualmente, pero no tiene cobro financiero activo suficiente.">
                                        Falta cobro real
                                    </span>
                                )}
                            </div>
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

                            <div className="flex flex-col gap-2 bg-black/20 rounded-xl p-3 border border-neutral-800/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-neutral-500 uppercase">Importe</span>
                                    <span className={`text-sm font-bold ${inst.status === 'anulada' ? 'text-neutral-500 line-through' : 'text-white'}`}>
                                        {inst.currency} {(inst.amount || 0).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-neutral-500 uppercase">Cobrado</span>
                                    <span className={`text-sm ${balanceCuota > 0 ? 'text-green-400 font-bold' : 'text-neutral-500'}`}>
                                        {balanceCuota > 0 ? `${inst.currency} ${balanceCuota.toLocaleString('es-AR')}` : '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center border-t border-neutral-800/50 pt-2 mt-1">
                                    <span className="text-[10px] text-neutral-500 uppercase">Saldo</span>
                                    <span className={`text-sm font-bold ${saldoCuota <= 0 ? 'text-neutral-500' : 'text-orange-400'}`}>
                                        {saldoCuota > 0 ? `${inst.currency} ${saldoCuota.toLocaleString('es-AR')}` : '0'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-neutral-800/50 flex justify-end gap-3">
                            {inst.status !== 'anulada' && (
                                <button 
                                    onClick={() => onRegisterPayment && onRegisterPayment(inst)}
                                    className="h-8 px-4 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-bold transition-colors"
                                >
                                    Cobrar
                                </button>
                            )}
                            <button 
                                onClick={() => onEdit(inst)}
                                className="h-8 px-4 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-bold transition-colors"
                            >
                                Gestionar
                            </button>
                            {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                                <button 
                                    onClick={() => onDelete && onDelete(inst)}
                                    className="h-8 px-4 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-bold transition-colors"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
