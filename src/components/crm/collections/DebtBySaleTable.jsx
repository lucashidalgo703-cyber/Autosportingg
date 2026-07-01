import React, { useMemo } from 'react';
import Link from 'next/link';
import { Handshake, Target } from 'lucide-react';
import CrmButton from '../../crm/ui/CrmButton';

export default function DebtBySaleTable({ installments }) {
    
    const aggregatedSales = useMemo(() => {
        const salesMap = {};
        
        installments.forEach(inst => {
            if (!inst.saleId) return;
            
            const saleIdStr = inst.saleId._id || inst.saleId;
            if (!salesMap[saleIdStr]) {
                salesMap[saleIdStr] = {
                    saleId: saleIdStr,
                    clientName: inst.clientId?.fullName || inst.clientId?.firstName || 'Sin cliente',
                    vehicleName: inst.vehicleId ? `${inst.vehicleId.brand} ${inst.vehicleId.name}` : 'Sin vehículo',
                    cuotasPendientes: 0,
                    cuotasVencidas: 0,
                    pendienteARS: 0,
                    pendienteUSD: 0,
                    vencidoARS: 0,
                    vencidoUSD: 0
                };
            }
            
            const group = salesMap[saleIdStr];
            
            if (inst.status === 'pendiente') {
                const fs = inst.financeSummary;
                let balanceCuota = 0;
                if (inst.currency === 'ARS') balanceCuota = (fs?.ingresosARS || 0) - (fs?.egresosARS || 0);
                if (inst.currency === 'USD') balanceCuota = (fs?.ingresosUSD || 0) - (fs?.egresosUSD || 0);
                
                const saldoCuota = inst.amount - balanceCuota;
                
                if (saldoCuota > 0) {
                    const isOverdue = new Date(inst.dueDate) < new Date();
                    group.cuotasPendientes += 1;
                    if (isOverdue) group.cuotasVencidas += 1;
                    
                    if (inst.currency === 'ARS') {
                        group.pendienteARS += saldoCuota;
                        if (isOverdue) group.vencidoARS += saldoCuota;
                    } else if (inst.currency === 'USD') {
                        group.pendienteUSD += saldoCuota;
                        if (isOverdue) group.vencidoUSD += saldoCuota;
                    }
                }
            }
        });
        
        // Filter out those with no debt
        return Object.values(salesMap).filter(g => g.cuotasPendientes > 0);
    }, [installments]);

    if (!aggregatedSales || aggregatedSales.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-crm-surface border border-crm-border rounded-2xl opacity-80">
                <Target size={48} className="text-crm-fg-muted mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No hay deuda por venta</h3>
                <p className="text-crm-fg-subtle text-center max-w-md">
                    No se encontró deuda activa agrupable con los filtros actuales.
                </p>
            </div>
        );
    }

    return (
        <div className="hidden md:block bg-crm-surface border border-crm-border rounded-2xl overflow-hidden mt-6">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-crm-border bg-crm-bg">
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider">Venta / Cliente</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-center">Cuotas (Pend / Venc)</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-right">Deuda ARS (Total / Vencida)</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-right">Deuda USD (Total / Vencida)</th>
                            <th className="p-4 text-xs font-bold text-crm-fg-muted uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {aggregatedSales.map(group => {
                            return (
                                <tr key={group.saleId} className="hover:bg-crm-surface-raised transition-colors">
                                    {/* Cliente / Venta */}
                                    <td className="p-4">
                                        <div className="flex flex-col gap-0.5">
                                            <Link href={`/admin/ventas/${group.saleId}`} className="text-sm font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5 truncate max-w-[250px]">
                                                <Handshake size={14} className="text-crm-fg-muted" />
                                                {group.clientName}
                                            </Link>
                                            <span className="text-xs text-crm-fg-subtle truncate max-w-[250px]">{group.vehicleName}</span>
                                        </div>
                                    </td>

                                    {/* Cuotas */}
                                    <td className="p-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col gap-1 items-center">
                                            <span className="text-sm font-bold text-crm-fg">
                                                {group.cuotasPendientes}
                                            </span>
                                            {group.cuotasVencidas > 0 && (
                                                <span className="text-[10px] text-red-400 font-bold bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20">
                                                    {group.cuotasVencidas} vencidas
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* ARS */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-sm font-bold text-blue-400">
                                                ARS {group.pendienteARS.toLocaleString('es-AR')}
                                            </span>
                                            {group.vencidoARS > 0 && (
                                                <span className="text-[10px] text-red-400 font-bold border-t border-crm-border pt-1 mt-0.5 w-full text-right">
                                                    Vencido: ARS {group.vencidoARS.toLocaleString('es-AR')}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* USD */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-sm font-bold text-green-400">
                                                USD {group.pendienteUSD.toLocaleString('es-AR')}
                                            </span>
                                            {group.vencidoUSD > 0 && (
                                                <span className="text-[10px] text-red-400 font-bold border-t border-crm-border pt-1 mt-0.5 w-full text-right">
                                                    Vencido: USD {group.vencidoUSD.toLocaleString('es-AR')}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center whitespace-nowrap">
                                        <Link href={`/admin/ventas/${group.saleId}`}>
                                            <CrmButton variant="secondary" className="w-full">
                                                Ver Venta
                                            </CrmButton>
                                        </Link>
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
