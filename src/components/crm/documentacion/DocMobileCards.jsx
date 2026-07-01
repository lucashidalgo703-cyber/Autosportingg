import React from 'react';
import Link from 'next/link';
import { FileText, Clock, AlertCircle, Truck, Eye } from 'lucide-react';

export default function DocMobileCards({ sales, getSaleTaskStatus, onCreateTask }) {
    if (!sales || sales.length === 0) {
        return (
            <div className="md:hidden flex flex-col items-center justify-center p-8 bg-crm-bg border border-crm-border rounded-2xl text-center">
                <FileText size={48} className="text-crm-border mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">No hay ventas operativas</h3>
                <p className="text-crm-fg-muted">Ajustá los filtros o generá una nueva venta.</p>
            </div>
        );
    }

    const getDocStatusBadge = (status) => {
        switch (status) {
            case 'completo':
                return <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase">Completa</span>;
            case 'parcial':
                return <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold uppercase">Parcial</span>;
            default:
                return <span className="px-2 py-1 rounded-md bg-crm-red/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase">Pendiente</span>;
        }
    };

    const getDeliveryStatusBadge = (status) => {
        switch (status) {
            case 'entregado':
                return <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase">Entregado</span>;
            case 'listo_para_entregar':
                return <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase">Lista</span>;
            case 'preparando':
                return <span className="px-2 py-1 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold uppercase">Preparando</span>;
            default:
                return <span className="px-2 py-1 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold uppercase">Pendiente</span>;
        }
    };

    return (
        <div className="md:hidden flex flex-col gap-4">
            {sales.map(sale => {
                const pendingTasks = getSaleTaskStatus(sale._id);
                const hasPendingTasks = pendingTasks && pendingTasks.length > 0;

                return (
                    <div key={sale._id} className="bg-crm-bg border border-crm-border rounded-2xl p-4 flex flex-col gap-4">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm font-bold text-white mb-1">
                                    {sale.clientId?.fullName || sale.clientId?.firstName || 'Sin Cliente'}
                                </div>
                                <div className="text-xs text-crm-fg-muted">
                                    {sale.vehicleId?.brand} {sale.vehicleId?.name}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-crm-fg-muted mb-1">
                                    {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
                                </div>
                                <span className="text-[10px] text-crm-fg-muted font-mono bg-black/20 px-1.5 py-0.5 rounded">
                                    {sale._id.slice(-6).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Status Grid */}
                        <div className="grid grid-cols-2 gap-3 bg-crm-bg p-3 rounded-xl border border-crm-border">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase">Documentación</span>
                                <div>{getDocStatusBadge(sale.documentationStatus)}</div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-crm-fg-muted uppercase">Entrega</span>
                                <div>{getDeliveryStatusBadge(sale.deliveryStatus)}</div>
                            </div>
                        </div>

                        {/* Seguimiento */}
                        <div className="flex items-center justify-between border-t border-crm-border pt-3">
                            <div>
                                {hasPendingTasks ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
                                            <AlertCircle size={10} /> Tarea Pendiente
                                        </span>
                                        <span className="text-xs text-neutral-300">
                                            {pendingTasks[0].title}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-neutral-500">Sin seguimiento activo</span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onCreateTask(sale, 'documentacion')}
                                    className="w-8 h-8 rounded-lg bg-crm-surface-raised flex items-center justify-center text-neutral-400 border border-neutral-700"
                                >
                                    <FileText size={14} />
                                </button>
                                <button 
                                    onClick={() => onCreateTask(sale, 'entrega')}
                                    className="w-8 h-8 rounded-lg bg-crm-surface-raised flex items-center justify-center text-neutral-400 border border-neutral-700"
                                >
                                    <Truck size={14} />
                                </button>
                                <Link 
                                    href={`/admin/ventas/${sale._id}`}
                                    className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20"
                                >
                                    <Eye size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
