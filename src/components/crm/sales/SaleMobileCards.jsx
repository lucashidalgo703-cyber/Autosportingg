import React from 'react';
import Link from 'next/link';
import { User, ChevronRight, Handshake, Search } from 'lucide-react';
import SaleStatusBadge from './SaleStatusBadge';

export default function SaleMobileCards({ sales, onViewDetail }) {
    if (!sales || sales.length === 0) {
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
            {sales.map(sale => {
                const name = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
                const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehículo no asignado';
                const hasClientLink = sale.clientId?._id || sale.leadId?._id;
                const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');
                const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

                return (
                    <div key={sale._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden">

                        {/* Top row: Status & Date */}
                        <div className="flex justify-between items-start">
                            <SaleStatusBadge status={sale.status} />
                            <div className="flex flex-col items-end">
                                <span className="text-xs text-neutral-500">{new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</span>
                                <span className="text-[10px] text-neutral-600 uppercase">{sale.paymentMethod || 'contado'}</span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Vehículo</span>
                                {sale.vehicleId ? (
                                    <Link href={vehicleHref} className="text-sm font-bold text-white hover:text-red-400 transition-colors">
                                        {vehicleName}
                                    </Link>
                                ) : (
                                    <span className="text-sm font-bold text-neutral-500">N/A</span>
                                )}
                            </div>

                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Cliente / Lead</span>
                                {hasClientLink ? (
                                    <Link href={clientHref} className="text-sm text-neutral-300 hover:text-red-400 transition-colors flex items-center gap-1.5">
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

                            <div className="flex flex-col gap-3 bg-black/20 rounded-xl p-3 border border-neutral-800/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-neutral-500 uppercase">Precio Venta</span>
                                    <span className={`text-sm font-bold ${sale.status === 'cancelada' ? 'text-neutral-500 line-through' : 'text-green-400'}`}>
                                        {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                                    </span>
                                </div>
                                {sale.finance && (
                                    <div className="flex justify-between items-center border-t border-neutral-800/50 pt-2">
                                        <span className="text-[10px] text-neutral-500 uppercase">Cobranza</span>
                                        <div className="flex flex-col items-end">
                                            {sale.finance.collectionStatus === 'sin_cobro' && <span className="text-[10px] text-red-400 font-bold uppercase">Sin Cobro</span>}
                                            {sale.finance.collectionStatus === 'parcial' && <span className="text-[10px] text-yellow-400 font-bold uppercase">Saldo: {sale.saleCurrency} {sale.finance.pendingBalance.toLocaleString('es-AR')}</span>}
                                            {sale.finance.collectionStatus === 'cobrada' && <span className="text-[10px] text-green-400 font-bold uppercase">Cobrada</span>}
                                            {sale.finance.collectionStatus === 'sobrecobrada' && <span className="text-[10px] text-purple-400 font-bold uppercase">Sobrecobrada</span>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Doc & Delivery Status */}
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Documentación</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded w-max uppercase ${
                                        sale.documentationStatus === 'completo' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                        sale.documentationStatus === 'parcial' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                        'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                    }`}>
                                        {sale.documentationStatus || 'pendiente'}
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Entrega</span>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded w-max uppercase ${
                                            sale.deliveryStatus === 'entregado' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            sale.deliveryStatus === 'listo_para_entregar' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                            sale.deliveryStatus === 'preparando' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                            'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                        }`}>
                                            {(sale.deliveryStatus || 'pendiente').replace(/_/g, ' ')}
                                        </span>
                                        {sale.deliveryStatus === 'entregado' ? (
                                            <span className="text-[10px] text-green-500 font-bold mt-1 uppercase">
                                                {sale.actualDeliveryDate ? new Date(sale.actualDeliveryDate).toLocaleDateString() : ''}
                                            </span>
                                        ) : sale.estimatedDeliveryDate && (
                                            <span className={`text-[10px] font-bold mt-1 uppercase ${new Date(sale.estimatedDeliveryDate) < new Date(new Date().setHours(0,0,0,0)) ? 'text-red-400' : 'text-neutral-400'}`}>
                                                Est: {new Date(sale.estimatedDeliveryDate).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-neutral-800">
                            <button 
                                onClick={() => onViewDetail(sale)}
                                className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-bold transition-colors border border-blue-500/20 flex items-center justify-center gap-2"
                            >
                                <Search size={16} />
                                Ver Detalle
                            </button>
                            
                            <Link 
                                href={vehicleHref}
                                className="w-12 flex-none py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors border border-neutral-700 flex items-center justify-center"
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
