import React from 'react';
import Link from 'next/link';
import { User, CarFront, Lock, CheckCircle2, ChevronRight, Handshake, Search } from 'lucide-react';
import SaleStatusBadge from './SaleStatusBadge';
import CrmButton, { CrmIconButton } from '../ui/CrmButton';

export default function SalesTable({ sales, onViewDetail }) {
    if (!sales || sales.length === 0) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center p-12 bg-crm-surface border border-crm-border rounded-2xl opacity-80">
                <Handshake size={48} className="text-crm-fg-muted mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No se encontraron ventas</h3>
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
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider text-right">Cobranza</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Doc.</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider">Logística</th>
                            <th className="p-4 text-[10px] font-bold text-crm-fg-muted uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-crm-border">
                        {sales.map(sale => {
                            const name = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
                            const phone = sale.clientId?.phone || sale.leadId?.phone || '';
                            const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehículo no asignado';
                            const vehicleVin = sale.vehicleId?.plateOrVin || '';
                            
                            const hasClientLink = sale.clientId?._id || sale.leadId?._id;
                            const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');
                            const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

                            return (
                                <tr key={sale._id} className="hover:bg-crm-surface-raised transition-colors group">
                                    {/* Fecha */}
                                    <td className="p-4 whitespace-nowrap">
                                        <span className="text-sm text-crm-fg-muted block">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                                        <span className="text-[10px] text-crm-fg-muted uppercase">{sale.paymentMethod || 'contado'}</span>
                                    </td>

                                    {/* Cliente / Lead */}
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            {hasClientLink ? (
                                                <Link href={clientHref} className="text-sm font-bold text-white hover:text-red-400 transition-colors truncate max-w-[180px]">
                                                    {name}
                                                </Link>
                                            ) : (
                                                <span className="text-sm font-bold text-white truncate max-w-[180px]">{name}</span>
                                            )}
                                            {phone && <span className="text-xs text-crm-fg-muted">{phone}</span>}
                                        </div>
                                    </td>

                                    {/* Vehículo */}
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            {sale.vehicleId ? (
                                                <Link href={vehicleHref} className="text-sm font-bold text-white hover:text-red-400 transition-colors truncate max-w-[180px]">
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
                                        <SaleStatusBadge status={sale.status} />
                                    </td>

                                    {/* Cobranza */}
                                    <td className="p-4 text-right whitespace-nowrap">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-sm font-bold ${sale.status === 'cancelada' ? 'text-neutral-500 line-through' : 'text-green-400'}`}>
                                                {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                                            </span>
                                            {sale.finance && (
                                                <div className="flex flex-col items-end mt-1">
                                                    {sale.finance.collectionStatus === 'sin_cobro' && <span className="text-[10px] text-red-400 font-bold uppercase">Sin Cobro</span>}
                                                    {sale.finance.collectionStatus === 'parcial' && <span className="text-[10px] text-yellow-400 font-bold uppercase">Saldo: {sale.saleCurrency} {sale.finance.pendingBalance.toLocaleString('es-AR')}</span>}
                                                    {sale.finance.collectionStatus === 'cobrada' && <span className="text-[10px] text-green-400 font-bold uppercase">Cobrada</span>}
                                                    {sale.finance.collectionStatus === 'sobrecobrada' && <span className="text-[10px] text-purple-400 font-bold uppercase">Sobrecobrada</span>}
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Doc */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-max uppercase ${
                                                sale.documentationStatus === 'completo' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                                sale.documentationStatus === 'parcial' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                                'bg-crm-bg text-crm-fg-muted border border-crm-border'
                                            }`}>
                                                Doc: {sale.documentationStatus || 'pendiente'}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-max uppercase ${
                                                sale.deliveryStatus === 'entregado' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                sale.deliveryStatus === 'listo_para_entregar' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                sale.deliveryStatus === 'preparando' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                                'bg-crm-bg text-crm-fg-muted border border-crm-border'
                                            }`}>
                                                Ent: {(sale.deliveryStatus || 'pendiente').replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Logística */}
                                    <td className="p-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            {sale.deliveryStatus === 'entregado' ? (
                                                <>
                                                    <span className="text-[10px] text-green-500 uppercase font-bold">Entregado</span>
                                                    <span className="text-xs text-white">{sale.actualDeliveryDate ? new Date(sale.actualDeliveryDate).toLocaleDateString() : 'N/A'}</span>
                                                </>
                                            ) : sale.estimatedDeliveryDate ? (
                                                <>
                                                    <span className="text-[10px] text-crm-fg-muted uppercase font-bold">Estimada</span>
                                                    <span className={`text-xs font-bold ${
                                                        new Date(sale.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0)) 
                                                            ? 'text-red-400' 
                                                            : 'text-white'
                                                    }`}>
                                                        {new Date(sale.estimatedDeliveryDate).toLocaleDateString()}
                                                    </span>
                                                    {new Date(sale.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0)) && (
                                                        <span className="text-[10px] text-red-500 font-bold uppercase mt-0.5">Demorada</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-xs text-crm-fg-muted">Sin programar</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Acciones */}
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <CrmButton 
                                                variant="secondary"
                                                onClick={() => onViewDetail(sale)}
                                                className="h-8 px-3 text-xs gap-1"
                                                title="Ver Detalle de Venta"
                                            >
                                                <Search size={14} />
                                                Detalle
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
