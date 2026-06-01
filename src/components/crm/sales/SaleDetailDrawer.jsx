import React from 'react';
import Link from 'next/link';
import { X, User, CarFront, Calendar, DollarSign, Receipt, AlertTriangle, ShieldCheck, ChevronRight, ExternalLink } from 'lucide-react';
import SaleStatusBadge from './SaleStatusBadge';

export default function SaleDetailDrawer({ sale, isOpen, onClose }) {
    if (!isOpen || !sale) return null;

    const vehicleName = sale.vehicleId ? `${sale.vehicleId.brand} ${sale.vehicleId.name}` : 'Vehículo no asignado';
    const vehicleVin = sale.vehicleId?.plateOrVin || '';
    const clientName = sale.clientId?.fullName || sale.clientId?.firstName || sale.leadId?.name || 'Sin Nombre';
    const clientPhone = sale.clientId?.phone || sale.leadId?.phone || 'Sin teléfono';
    
    const hasClientLink = sale.clientId?._id || sale.leadId?._id;
    const clientHref = sale.clientId?._id ? `/admin/clientes/${sale.clientId._id}` : (sale.leadId?._id ? `/admin/leads/${sale.leadId._id}` : '#');
    const vehicleHref = sale.vehicleId?._id ? `/admin/stock/${sale.vehicleId._id}` : '#';

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-[#161619] border-l border-[#33333A] shadow-2xl flex flex-col h-full overflow-hidden animate-slide-in-right">
                
                {/* Header */}
                <div className="p-6 border-b border-[#33333A] bg-[#1E1E24] flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-xl font-bold text-white tracking-tight">Detalle de Venta</h2>
                            <SaleStatusBadge status={sale.status} />
                        </div>
                        <p className="text-xs text-neutral-400 font-mono">
                            ID: {sale._id}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 -mr-2 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-neutral-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                    
                    {/* Alerta de sólo lectura */}
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-3">
                        <ShieldCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-200">
                            <span className="font-bold block mb-0.5">Vista de solo lectura</span>
                            Para garantizar la integridad comercial, la edición y cancelación de ventas en esta fase están deshabilitadas.
                        </div>
                    </div>

                    {/* Resumen Comercial */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <DollarSign size={14} />
                            Resumen Comercial
                        </h3>
                        <div className="bg-black/30 border border-neutral-800 rounded-2xl p-4 space-y-4">
                            <div className="flex justify-between items-center pb-4 border-b border-neutral-800/50">
                                <span className="text-sm text-neutral-400">Precio Final</span>
                                <span className={`text-lg font-black ${sale.status === 'cancelada' ? 'text-neutral-500 line-through' : 'text-green-400'}`}>
                                    {sale.saleCurrency} {(sale.salePrice || 0).toLocaleString('es-AR')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-neutral-400">Método de Pago</span>
                                <span className="text-sm font-bold text-white uppercase">{sale.paymentMethod}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-neutral-400">Seña Aplicada</span>
                                <span className="text-sm font-bold text-neutral-300">
                                    {sale.depositAppliedAmount > 0 
                                        ? `${sale.depositAppliedCurrency} ${sale.depositAppliedAmount.toLocaleString('es-AR')}`
                                        : 'No aplicada'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Entidades Relacionadas */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Receipt size={14} />
                            Entidades Relacionadas
                        </h3>
                        <div className="space-y-3">
                            
                            {/* Vehículo */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                                        <CarFront size={14} className="text-neutral-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-neutral-500 uppercase font-bold">Vehículo</span>
                                        <span className="text-sm font-bold text-white">{vehicleName}</span>
                                        {vehicleVin && <span className="text-[10px] text-neutral-500 font-mono mt-0.5">{vehicleVin}</span>}
                                    </div>
                                </div>
                                {sale.vehicleId && (
                                    <Link href={vehicleHref} className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors">
                                        <ChevronRight size={16} />
                                    </Link>
                                )}
                            </div>

                            {/* Cliente */}
                            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
                                        <User size={14} className="text-neutral-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-neutral-500 uppercase font-bold">Cliente / Lead</span>
                                        <span className="text-sm font-bold text-white">{clientName}</span>
                                        <span className="text-[10px] text-neutral-500 mt-0.5">{clientPhone}</span>
                                    </div>
                                </div>
                                {hasClientLink && (
                                    <Link href={clientHref} className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors">
                                        <ChevronRight size={16} />
                                    </Link>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Notas y Auditoría */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Calendar size={14} />
                            Registro y Auditoría
                        </h3>
                        <div className="bg-black/30 border border-neutral-800 rounded-2xl p-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-neutral-400">Fecha de Venta</span>
                                <span className="text-sm font-bold text-white">
                                    {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-neutral-400">Vendedor Asignado</span>
                                <span className="text-sm font-bold text-white">{sale.salesperson || 'N/A'}</span>
                            </div>
                            
                            {sale.notes && (
                                <div className="pt-4 border-t border-neutral-800/50">
                                    <span className="text-xs text-neutral-400 block mb-2">Notas:</span>
                                    <p className="text-sm text-neutral-300 whitespace-pre-wrap bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                                        {sale.notes}
                                    </p>
                                </div>
                            )}

                            {sale.saleAuditLog && sale.saleAuditLog.length > 0 && (
                                <div className="pt-4 border-t border-neutral-800/50">
                                    <span className="text-xs text-neutral-400 block mb-2">Historial de Auditoría:</span>
                                    <div className="space-y-2">
                                        {sale.saleAuditLog.map((log, idx) => (
                                            <div key={idx} className="flex gap-2 text-xs">
                                                <div className="flex flex-col items-center mt-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-[#E63027]"></div>
                                                    {idx !== sale.saleAuditLog.length - 1 && <div className="w-px h-full bg-neutral-800 my-1"></div>}
                                                </div>
                                                <div className="flex-1 pb-2">
                                                    <span className="text-neutral-300 block">{log.action}</span>
                                                    <span className="text-[10px] text-neutral-500">
                                                        {new Date(log.date).toLocaleString()} por {log.user}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer / Actions */}
                <div className="p-6 border-t border-[#33333A] bg-[#1E1E24]">
                    <Link 
                        href={`/admin/ventas/${sale._id}`}
                        className="w-full py-3 rounded-xl bg-[#E63027] hover:bg-[#C42620] text-white font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <ExternalLink size={18} />
                        Abrir Ficha Completa
                    </Link>
                </div>

            </div>
        </div>
    );
}


