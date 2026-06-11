import React from 'react';
import Link from 'next/link';
import { Landmark, Calendar, User, Search, Handshake } from 'lucide-react';
import InstallmentStatusBadge from './InstallmentStatusBadge';

export default function InstallmentsTable({ installments, onEdit, onRegisterPayment, onDelete, currentUserRole }) {
    if (!installments || installments.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-neutral-900 border border-neutral-800 rounded-2xl opacity-80">
                <Landmark size={48} className="text-neutral-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No se encontraron cuotas</h3>
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
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Vencimiento</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Venta / Cliente</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Cuota</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Estado</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Importe</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Cobrado</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Saldo</th>
                            <th className="p-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                        {installments.map(inst => {
                            const isManual = inst.source === 'manual';
                            const clientName = isManual ? inst.customerName : (inst.clientId?.fullName || inst.clientId?.firstName || 'Sin cliente');
                            const vehicleName = isManual ? (inst.concept || 'Cuenta por cobrar') : (inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name}` : 'Sin vehículo');
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
                                <tr key={inst._id} className="hover:bg-black/20 transition-colors">
                                    {/* Fecha Vencimiento */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className={isOverdue ? "text-red-400" : "text-neutral-500"} />
                                            <span className={`text-sm ${isOverdue ? 'font-bold text-red-400' : 'text-neutral-300'}`}>
                                                {new Date(inst.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Venta / Cliente */}
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                            {isManual ? (
                                                <div className="text-sm font-bold text-purple-400 flex items-center gap-1.5 truncate max-w-[200px]">
                                                    <Landmark size={14} className="text-purple-500" />
                                                    Cuenta por Cobrar
                                                </div>
                                            ) : (
                                                <Link href={`/admin/ventas/${inst.saleId?._id || inst.saleId}`} className="text-sm font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5 truncate max-w-[200px]">
                                                    <Handshake size={14} className="text-neutral-500" />
                                                    Venta Asociada
                                                </Link>
                                            )}
                                            <span className="text-xs text-neutral-400 truncate max-w-[200px]">{clientName}</span>
                                            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">{vehicleName}</span>
                                        </div>
                                    </td>

                                    {/* Cuota Número */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-neutral-300">
                                                {isManual ? 'A cobrar' : `Cuota ${inst.installmentNumber}`}
                                            </span>
                                            {finStatus !== 'Sin cobro' && (
                                                <span className="text-[10px] text-green-400 font-bold">{finStatus}</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Estado */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <InstallmentStatusBadge status={inst.status} dueDate={inst.dueDate} />
                                            {hasWarning && (
                                                <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 w-max" title="La cuota figura pagada manualmente, pero no tiene cobro financiero activo suficiente.">
                                                    Falta cobro real
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Importe */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <span className={`text-sm font-bold ${inst.status === 'anulada' ? 'text-neutral-500 line-through' : 'text-white'}`}>
                                            {inst.currency} {(inst.amount || 0).toLocaleString('es-AR')}
                                        </span>
                                    </td>
                                    
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <span className={`text-sm ${balanceCuota > 0 ? 'text-green-400 font-bold' : 'text-neutral-500'}`}>
                                            {balanceCuota > 0 ? `${inst.currency} ${balanceCuota.toLocaleString('es-AR')}` : '-'}
                                        </span>
                                    </td>

                                    <td className="p-4 text-right whitespace-nowrap">
                                        <span className={`text-sm font-bold ${saldoCuota <= 0 ? 'text-neutral-500' : 'text-orange-400'}`}>
                                            {saldoCuota > 0 ? `${inst.currency} ${saldoCuota.toLocaleString('es-AR')}` : '0'}
                                        </span>
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-3">
                                            {inst.status !== 'anulada' && (
                                                <button 
                                                    onClick={() => onRegisterPayment && onRegisterPayment(inst)}
                                                    className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
                                                >
                                                    Cobrar
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => onEdit(inst)}
                                                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                Gestionar
                                            </button>
                                            {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
                                                <button 
                                                    onClick={() => onDelete && onDelete(inst)}
                                                    className="text-xs font-bold text-crm-red hover:text-red-400 transition-colors"
                                                    title="Eliminar definitivamente"
                                                >
                                                    Eliminar
                                                </button>
                                            )}
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
