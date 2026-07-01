import React from 'react';
import Link from 'next/link';
import { Calendar, Handshake, Target, Bell } from 'lucide-react';
import InstallmentStatusBadge from '../installments/InstallmentStatusBadge';
import CrmButton from '../../crm/ui/CrmButton';

export default function CollectionsTable({ installments, onEdit, onRegisterPayment, onCreateReminder }) {
    if (!installments || installments.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-crm-surface border border-crm-border rounded-2xl opacity-80">
                <Target size={48} className="text-crm-fg-muted mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No se encontraron cuotas</h3>
                <p className="text-crm-fg-subtle text-center max-w-md">
                    No hay resultados que coincidan con los filtros actuales.
                </p>
            </div>
        );
    }

    return (
        <div className="hidden md:block bg-crm-surface border border-crm-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-crm-border bg-crm-bg">
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Vencimiento</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Cliente / Venta</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Cuota</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Estado</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-right">Importe</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-right">Cobrado</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-right">Saldo</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {installments.map(inst => {
                            const clientName = inst.clientId?.fullName || inst.clientId?.firstName || 'Sin cliente';
                            const clientPhone = inst.clientId?.phone || '';
                            const vehicleName = inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name}` : 'Sin vehículo';
                            const vehiclePlate = inst.vehicleId?.plate || '';
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
                            const hasOverdueNoCobroWarning = isOverdue && balanceCuota === 0;

                            return (
                                <tr key={inst._id} className="hover:bg-crm-surface-raised transition-colors">
                                    {/* Fecha Vencimiento */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className={isOverdue ? "text-red-400" : "text-crm-fg-muted"} />
                                            <span className={`text-sm ${isOverdue ? 'font-bold text-red-400' : 'text-crm-fg'}`}>
                                                {new Date(inst.dueDate).toLocaleDateString('es-AR')}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Cliente / Venta */}
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                            <Link href={`/admin/ventas/${inst.saleId?._id || inst.saleId}`} className="text-sm font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5 truncate max-w-[220px]">
                                                <Handshake size={14} className="text-crm-fg-muted" />
                                                {clientName}
                                            </Link>
                                            {clientPhone && <span className="text-[10px] text-crm-fg-subtle">{clientPhone}</span>}
                                            <span className="text-xs text-crm-fg-subtle truncate max-w-[220px]">{vehicleName} {vehiclePlate && `(${vehiclePlate})`}</span>
                                        </div>
                                    </td>

                                    {/* Cuota Número */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-bold text-crm-fg">
                                                Nº {inst.installmentNumber}
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
                                            {inst.reminderInfo?.status === 'pendiente' && (
                                                <span className="text-[9px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded border border-orange-400/20 w-max flex items-center gap-1">
                                                    <Bell size={8} /> Recordatorio
                                                </span>
                                            )}
                                            {inst.reminderInfo?.status === 'vencido' && (
                                                <span className="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20 w-max flex items-center gap-1 font-bold">
                                                    <Bell size={8} /> Recordatorio vencido
                                                </span>
                                            )}
                                            {inst.reminderInfo?.status === 'completado' && (
                                                <span className="text-[9px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20 w-max flex items-center gap-1">
                                                    <Bell size={8} /> Recordatorio completado
                                                </span>
                                            )}
                                            {inst.reminderInfo?.status === 'cancelado' && (
                                                <span className="text-[9px] text-neutral-400 bg-neutral-400/10 px-1.5 py-0.5 rounded border border-neutral-400/20 w-max flex items-center gap-1">
                                                    <Bell size={8} /> Recordatorio cancelado
                                                </span>
                                            )}
                                            {hasWarning && (
                                                <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 w-max" title="La cuota figura pagada manualmente, pero no tiene cobro financiero activo suficiente.">
                                                    Falta cobro real
                                                </span>
                                            )}
                                            {hasOverdueNoCobroWarning && (
                                                <span className="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20 w-max">
                                                    Vencida sin cobro
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
                                    
                                    {/* Cobrado */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <span className={`text-sm ${balanceCuota > 0 ? 'text-green-400 font-bold' : 'text-neutral-500'}`}>
                                            {balanceCuota > 0 ? `${inst.currency} ${balanceCuota.toLocaleString('es-AR')}` : '-'}
                                        </span>
                                    </td>

                                    {/* Saldo */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <span className={`text-sm font-bold ${saldoCuota <= 0 ? 'text-neutral-500' : 'text-orange-400'}`}>
                                            {saldoCuota > 0 ? `${inst.currency} ${saldoCuota.toLocaleString('es-AR')}` : '0'}
                                        </span>
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            {inst.status !== 'anulada' && (
                                                <button 
                                                    onClick={() => onRegisterPayment && onRegisterPayment(inst)}
                                                    className="w-full py-1.5 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500/20 text-xs font-bold transition-colors border border-green-500/20"
                                                >
                                                    Cobrar
                                                </button>
                                            )}
                                            {(!inst.reminderInfo || inst.reminderInfo.status === 'none' || inst.reminderInfo.status === 'completado' || inst.reminderInfo.status === 'cancelado') && inst.status !== 'anulada' && (
                                                <button 
                                                    onClick={() => onCreateReminder && onCreateReminder(inst)}
                                                    className="w-full py-1.5 rounded-md bg-crm-red/10 text-crm-red hover:bg-crm-red/20 text-xs font-bold transition-colors border border-crm-red/20"
                                                >
                                                    Agendar
                                                </button>
                                            )}
                                            <CrmButton 
                                                variant="secondary"
                                                onClick={() => onEdit(inst)}
                                                className="w-full py-1.5"
                                            >
                                                Gestionar
                                            </CrmButton>
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
